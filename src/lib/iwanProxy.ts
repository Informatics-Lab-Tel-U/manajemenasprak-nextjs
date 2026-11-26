import { ProxyValidationError, sanitizeProxyPath } from '@/lib/apiProxy';

function extractRawPathname(rawUrl: string): string {
  const withoutOrigin = rawUrl.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/?#]*/, '');
  const endIdx = withoutOrigin.search(/[?#]/);
  return endIdx === -1 ? withoutOrigin : withoutOrigin.slice(0, endIdx);
}

export async function proxyIwanRequest(
  request: Request,
  accessToken: string,
  backendUrl: string,
): Promise<Response> {
  const rawPathname = extractRawPathname(request.url);
  let source: URL;
  try {
    source = new URL(request.url);
  } catch {
    return Response.json({ ok: false, error: 'Bad Request' }, { status: 400 });
  }

  const rawTargetsIwan = rawPathname.startsWith('/api/iwan/');
  const parsedTargetsIwan = source.pathname.startsWith('/api/iwan/');
  if (!rawTargetsIwan && !parsedTargetsIwan) {
    return Response.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  const headers = new Headers({ Authorization: `Bearer ${accessToken}` });
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);

  const rayId = request.headers.get('cf-ray');
  const startedAt = Date.now();
  const failure = (code: string, status: number, error: string, details: Record<string, unknown>) => {
    console.error('[IWAN proxy]', {
      event: 'iwan_proxy_failure', code, rayId, method: request.method,
      path: source.pathname, elapsedWallMs: Date.now() - startedAt, ...details,
    });
    return Response.json(
      { ok: false, error, code },
      { status, headers: {
        'Cache-Control': 'private, no-store', Vary: 'Cookie',
        'X-Iwan-Error-Source': 'proxy', 'X-Iwan-Error-Code': code,
      } },
    );
  };

  let safePath: string;
  try {
    if (rawTargetsIwan) {
      sanitizeProxyPath('/api/iwan', rawPathname);
    }
    safePath = sanitizeProxyPath('/api/iwan', source.pathname);
  } catch (err) {
    return failure('IWAN_INVALID_PATH', 400, 'Path IWAN tidak valid', {
      reason: err instanceof ProxyValidationError ? err.message : 'Invalid path',
    });
  }

  let backendBase: URL;
  try {
    backendBase = new URL(backendUrl);
  } catch {
    return failure('IWAN_PROXY_FAILURE', 500, 'Konfigurasi backend IWAN tidak valid', {});
  }
  if (
    (backendBase.protocol !== 'https:' && backendBase.protocol !== 'http:') ||
    backendBase.username ||
    backendBase.password
  ) {
    return failure('IWAN_PROXY_FAILURE', 500, 'Konfigurasi backend IWAN tidak valid', {});
  }

  const targetUrl = new URL(safePath + source.search, backendBase.origin);
  if (targetUrl.origin !== backendBase.origin || !targetUrl.pathname.startsWith('/api/iwan/')) {
    return failure('IWAN_INVALID_PATH', 400, 'Path IWAN tidak valid', {});
  }

  try {
    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      ...(hasBody && request.body ? { duplex: 'half' as const } : {}),
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(24000),
    });
    if (upstream.status >= 300 && upstream.status < 400 && upstream.status !== 304) {
      void upstream.body?.cancel().catch(() => {});
      return failure('IWAN_UPSTREAM_REDIRECT', 502, 'Backend IWAN mengembalikan redirect yang tidak diizinkan', {
        upstreamStatus: upstream.status,
      });
    }

    const responseHeaders = new Headers({ 'Cache-Control': 'private, no-store', Vary: 'Cookie' });
    if (upstream.status >= 500) {
      responseHeaders.set('X-Iwan-Error-Source', 'upstream');
      console.error('[IWAN proxy]', {
        event: 'iwan_upstream_error', rayId, method: request.method,
        path: safePath, upstreamStatus: upstream.status,
        upstreamRayId: upstream.headers.get('cf-ray'), elapsedWallMs: Date.now() - startedAt,
      });
    }
    const responseType = upstream.headers.get('content-type');
    if (responseType) responseHeaders.set('Content-Type', responseType);

    // IWAN responses are not transformed; keep JSON parsing and serialization in the backend.
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : 'UnknownError';
    const message = error instanceof Error ? error.message : 'Unknown proxy failure';
    // Never log credentials or URLs, which may contain sensitive query parameters.
    const safeMessage = (accessToken ? message.replaceAll(accessToken, '[redacted]') : message)
      .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [redacted]')
      .replace(/https?:\/\/[^\s"')]+/gi, '[url]')
      .slice(0, 500);
    const timedOut = name === 'TimeoutError';
    return failure(
      timedOut ? 'IWAN_BACKEND_TIMEOUT' : 'IWAN_PROXY_FAILURE',
      timedOut ? 504 : 502,
      timedOut ? 'Backend IWAN tidak merespons tepat waktu' : 'Backend IWAN tidak dapat dihubungi',
      { errorName: name, errorMessage: safeMessage },
    );
  }
}
