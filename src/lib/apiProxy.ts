import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.HONO_BACKEND_URL || 'https://manajemenasprak-backend.iflabdev.workers.dev';

const CONTROL_CHARS_RE = /[\x00-\x1f\x7f]/;
const SCHEME_PREFIX_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const ENCODED_SLASH_RE = /%(?:2f|5c)/i;
const ALLOWED_INBOUND_HEADERS = ['accept', 'accept-language'] as const;
const SAFE_RESPONSE_HEADERS = [
  'content-type',
  'content-disposition',
  'cache-control',
  'etag',
  'last-modified',
] as const;

export class ProxyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProxyValidationError';
  }
}

export interface ForwardProxyOptions {
  allowedPrefix?: string;
  allowPraktikanApiKey?: boolean;
  customSearch?: string;
}

export interface BuildForwardHeadersOptions {
  authHeader?: string;
  hasBody?: boolean;
  allowPraktikanApiKey?: boolean;
}

function collectDecodedVariants(rawPath: string): string[] {
  const variants = [rawPath];
  let current = rawPath;

  for (let pass = 0; pass < 3; pass++) {
    if (!current.includes('%')) break;
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      throw new ProxyValidationError('Malformed URL encoding in proxy path');
    }
    if (decoded === current) break;
    variants.push(decoded);
    current = decoded;
  }

  if (current.includes('%')) {
    try {
      if (decodeURIComponent(current) !== current) {
        throw new ProxyValidationError('Excessive URL encoding layers in proxy path');
      }
    } catch (err) {
      if (err instanceof ProxyValidationError) throw err;
      throw new ProxyValidationError('Malformed URL encoding in proxy path');
    }
  }

  return variants;
}

function assertSafePathVariant(variant: string): void {
  if (CONTROL_CHARS_RE.test(variant)) {
    throw new ProxyValidationError('Control characters are not allowed in proxy path');
  }
  if (ENCODED_SLASH_RE.test(variant)) {
    throw new ProxyValidationError('Encoded path separators are not allowed');
  }
  if (variant.includes('\\')) {
    throw new ProxyValidationError('Backslashes are not allowed in proxy path');
  }
  if (variant.includes('?') || variant.includes('#')) {
    throw new ProxyValidationError('Query or fragment delimiters are not allowed in proxy path');
  }
  if (
    variant.includes('@') ||
    variant.includes('://') ||
    SCHEME_PREFIX_RE.test(variant.replace(/^\/+/, ''))
  ) {
    throw new ProxyValidationError('Authority or scheme overrides are not allowed in proxy path');
  }
  if (variant.startsWith('//') || variant.includes('//')) {
    throw new ProxyValidationError('Protocol-relative or empty path segments are not allowed');
  }
  const segments = variant.split('/');
  if (segments.some((seg) => seg === '.' || seg === '..' || seg.includes('..'))) {
    throw new ProxyValidationError('Path traversal segments are not allowed');
  }
}

/**
 * Canonicalizes a proxy path and locks it strictly under `prefix` (`/api`, `/api/iwan`, or `/api/util`),
 * blocking traversal (`..`, `%2e%2e`, `%252e%252e`), backslashes, control chars, and host/authority overrides.
 */
export function sanitizeProxyPath(prefix: string, rawPath: string): string {
  if (typeof rawPath !== 'string' || rawPath.length === 0) {
    throw new ProxyValidationError('Proxy path is required');
  }
  if (rawPath.trim() !== rawPath || rawPath.trim().length === 0) {
    throw new ProxyValidationError('Proxy path cannot contain leading or trailing whitespace');
  }

  const normPrefix = prefix === '/' ? '/' : `/${prefix.replace(/^\/+|\/+$/g, '')}`;
  const variants = collectDecodedVariants(rawPath);
  for (const variant of variants) {
    assertSafePathVariant(variant);
  }

  const stripped = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
  const relPrefix = normPrefix === '/' ? '' : normPrefix.slice(1);

  let candidate: string;
  if (rawPath.startsWith('/api/') || stripped.startsWith('api/')) {
    if (relPrefix && stripped !== relPrefix && !stripped.startsWith(`${relPrefix}/`)) {
      throw new ProxyValidationError('Proxy path escapes allowed prefix');
    }
    candidate = `/${stripped}`;
  } else {
    candidate = normPrefix === '/' ? `/${stripped}` : `${normPrefix}/${stripped}`;
  }

  if (candidate === normPrefix || candidate === `${normPrefix}/`) {
    throw new ProxyValidationError('Proxy endpoint sub-path is required');
  }

  const parsed = new URL(candidate, 'https://proxy.invalid');
  if (
    parsed.origin !== 'https://proxy.invalid' ||
    parsed.pathname !== candidate ||
    parsed.search ||
    parsed.hash
  ) {
    throw new ProxyValidationError('Canonicalized proxy path mismatch');
  }

  return candidate;
}

/**
 * Validates a single dynamic route parameter (`id`) so query delimiters (`?`, `#`),
 * path separators (`/`, `\`, `%2f`, `%5c`), and traversal segments are rejected cleanly.
 */
export function sanitizePathSegment(rawSegment: string): string {
  if (typeof rawSegment !== 'string' || rawSegment.length === 0) {
    throw new ProxyValidationError('Path segment is required');
  }
  if (rawSegment.trim() !== rawSegment || rawSegment.trim().length === 0) {
    throw new ProxyValidationError('Path segment cannot contain leading or trailing whitespace');
  }

  const variants = collectDecodedVariants(rawSegment);
  for (const variant of variants) {
    assertSafePathVariant(variant);
    if (variant.includes('/')) {
      throw new ProxyValidationError('Path separators are not allowed inside a route segment');
    }
  }

  return rawSegment;
}

/**
 * Constructs outbound Hono headers strictly from an allowlist, dropping spoofable
 * client trust headers (`x-service-role-key`, `x-api-key`, `x-auth-user`, `x-intern-user-role`,
 * `x-http-method-override`, forwarding headers, cookies, etc.).
 */
export function buildSafeForwardHeaders(
  request: Pick<Request, 'headers' | 'method'>,
  options: BuildForwardHeadersOptions = {},
): Headers {
  const headers = new Headers();

  for (const name of ALLOWED_INBOUND_HEADERS) {
    const val = request.headers.get(name);
    if (val) headers.set(name, val);
  }

  if (options.authHeader) {
    headers.set('authorization', options.authHeader);
  }

  const method = request.method.toUpperCase();
  if (options.allowPraktikanApiKey && method === 'GET') {
    const praktikanApiKey = request.headers.get('x-praktikan-api-key');
    if (praktikanApiKey) headers.set('x-praktikan-api-key', praktikanApiKey);
  }

  if (options.hasBody) {
    const contentType = request.headers.get('content-type');
    if (contentType) headers.set('content-type', contentType);
  }

  return headers;
}

export async function forwardToHono(
  request: NextRequest,
  customPath?: string,
  options?: ForwardProxyOptions,
) {
  try {
    const rawTarget = customPath || request.nextUrl.pathname;

    const expectedPrefix =
      options?.allowedPrefix ??
      (request.nextUrl?.pathname?.startsWith('/api/iwan/')
        ? '/api/iwan'
        : request.nextUrl?.pathname?.startsWith('/api/util/')
          ? '/api/util'
          : '/api');

    let safePath: string;
    try {
      safePath = sanitizeProxyPath(expectedPrefix, rawTarget);
    } catch (err) {
      const message = err instanceof ProxyValidationError ? err.message : 'Invalid proxy path';
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }

    const backendUrl = process.env.HONO_BACKEND_URL || BACKEND_URL;
    let baseUrl: URL;
    try {
      baseUrl = new URL(backendUrl);
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid backend configuration' }, { status: 500 });
    }

    if (
      (baseUrl.protocol !== 'https:' && baseUrl.protocol !== 'http:') ||
      baseUrl.username ||
      baseUrl.password
    ) {
      return NextResponse.json({ ok: false, error: 'Invalid backend configuration' }, { status: 500 });
    }

    const targetUrl = new URL(safePath, baseUrl.origin);
    const prefixSlash = expectedPrefix.endsWith('/') ? expectedPrefix : `${expectedPrefix}/`;
    if (targetUrl.origin !== baseUrl.origin || !targetUrl.pathname.startsWith(prefixSlash)) {
      return NextResponse.json({ ok: false, error: 'Invalid proxy target' }, { status: 400 });
    }

    request.nextUrl.searchParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value);
    });

    if (options?.customSearch) {
      const searchStr = options.customSearch.startsWith('?')
        ? options.customSearch.slice(1)
        : options.customSearch;
      new URLSearchParams(searchStr).forEach((value, key) => {
        targetUrl.searchParams.set(key, value);
      });
    }

    let authHeader: string | undefined;
    // Read x-auth-user set by middleware first (middleware scrubs any client-supplied value)
    const xAuthUser = request.headers.get('x-auth-user');
    if (xAuthUser) {
      try {
        const decoded = JSON.parse(Buffer.from(xAuthUser, 'base64').toString('utf-8'));
        if (decoded?.token) {
          authHeader = `Bearer ${decoded.token}`;
        }
      } catch {
      }
    }

    if (!authHeader) {
      authHeader = request.headers.get('authorization') || undefined;
    }

    if (!authHeader) {
      try {
        const { getCurrentUser } = await import('@/lib/auth');
        const authUser = await getCurrentUser();
        if (authUser?.token) {
          authHeader = `Bearer ${authUser.token}`;
        }
      } catch {
      }
    }

    const method = request.method.toUpperCase();
    const hasBody = method !== 'GET' && method !== 'HEAD';
    const headers = buildSafeForwardHeaders(request, {
      authHeader,
      hasBody,
      allowPraktikanApiKey: options?.allowPraktikanApiKey,
    });

    // Stream request body directly — hindari buffering formData/text di Worker
    const init: RequestInit & { duplex?: 'half' } = {
      method,
      headers,
      body: hasBody ? (request.body ?? undefined) : undefined,
      ...(hasBody && request.body ? { duplex: 'half' as const } : {}),
      redirect: 'manual',
    };

    const res = await fetch(targetUrl.toString(), init);

    if (res.status >= 300 && res.status < 400 && res.status !== 304) {
      void res.body?.cancel().catch(() => {});
      return NextResponse.json(
        { ok: false, error: 'Upstream redirect is not allowed' },
        { status: 502 },
      );
    }

    const forwardHeaders = new Headers();
    for (const name of SAFE_RESPONSE_HEADERS) {
      const value = res.headers.get(name);
      if (value) forwardHeaders.set(name, value);
    }

    // Stream upstream body directly — avoid JSON.parse and JSON.stringify CPU overhead in Worker
    return new Response(res.body, {
      status: res.status,
      headers: forwardHeaders,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || 'Proxy Error' }, { status: 500 });
  }
}
