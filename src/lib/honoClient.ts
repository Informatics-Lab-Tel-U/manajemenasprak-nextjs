import 'server-only';
import { logger } from '@/lib/logger';
import { headers as nextHeaders } from 'next/headers';

const BACKEND_URL = process.env.HONO_BACKEND_URL || 'https://manajemenasprak-backend.iflabdev.workers.dev';

export interface HonoFetchOptions extends RequestInit {
  authHeader?: string;
  useServiceRole?: boolean;
}

export async function honoFetch<T = any>(
  path: string,
  options: HonoFetchOptions = {}
): Promise<{ ok: boolean; data?: T; error?: string }> {
  let { authHeader, useServiceRole, headers: customHeaders, ...restOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (!authHeader && !useServiceRole) {
    // Read x-auth-user set by middleware — avoids a redundant /api/auth/me fetch
    try {
      const reqHeaders = await nextHeaders();
      const xAuthUser = reqHeaders.get('x-auth-user');
      if (xAuthUser) {
        const decoded = JSON.parse(Buffer.from(xAuthUser, 'base64').toString('utf-8'));
        if (decoded?.token) {
          authHeader = `Bearer ${decoded.token}`;
        }
      }
    } catch {
      // Not in a request context (e.g. build time) — fall through
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
  }

  if (authHeader) {
    headers['authorization'] = authHeader;
  }

  if (useServiceRole && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    headers['x-service-role-key'] = process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  const targetUrl = path.startsWith('http') ? path : `${BACKEND_URL}${path.startsWith('/') ? path : `/${path}`}`;

  try {
    const res = await fetch(targetUrl, {
      headers,
      cache: 'no-store',
      ...restOptions,
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || json.ok === false) {
      return {
        ok: false,
        error: json.error || `Hono Backend error: HTTP ${res.status}`,
      };
    }

    return {
      ok: true,
      data: json.data !== undefined ? json.data : json,
    };
  } catch (error: any) {
    logger.error(`[honoFetch Error] ${targetUrl}:`, error);
    return {
      ok: false,
      error: error.message || 'Network / Proxy Error',
    };
  }
}
