import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { hasAccess, isPublicPath, ROLE_DEFAULT_REDIRECT, type Role } from '@/config/rbac';
import { AUTH_CONFIG, isMfaRequiredForRole } from '@/config/auth';

let cachedMaintenance: { active: boolean; timestamp: number } | null = null;
const MAINTENANCE_TTL_MS = 15000; // 15 seconds

async function getMaintenanceStatus(backendUrl?: string): Promise<boolean> {
  if (!backendUrl) return false;
  const now = Date.now();
  if (cachedMaintenance && now - cachedMaintenance.timestamp < MAINTENANCE_TTL_MS) {
    return cachedMaintenance.active;
  }
  try {
    const res = await fetch(`${backendUrl}/api/system/maintenance`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      const data = await res.json();
      const active = !!data.active;
      cachedMaintenance = { active, timestamp: now };
      return active;
    }
  } catch (e) {
    console.error('[Middleware] Maintenance check failed:', e);
  }
  return cachedMaintenance?.active ?? false;
}

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-auth-user');

  const supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const { pathname } = request.nextUrl;

  if (
    request.method === 'OPTIONS' ||
    (pathname === '/api/monitoring/heartbeat' && request.method === 'POST') ||
    (pathname === '/api/monitoring/status' && request.method === 'GET') ||
    ((pathname === '/api/praktikan' || pathname.startsWith('/api/praktikan/')) &&
      request.method === 'GET')
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const [
    { data: { user } },
    { data: { session } },
    isMaintenanceMode,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
    getMaintenanceStatus(process.env.HONO_BACKEND_URL),
  ]);

  const token = session?.access_token;


  // Single pengguna query to Hono backend
  let pengguna: any = null;
  let penggunaError: any = null;

  if (token) {
    try {
      const meRes = await fetch(
        `${process.env.HONO_BACKEND_URL}/api/auth/me?app=manajemenasprak`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        }
      );
      if (meRes.ok) {
        const meData = await meRes.json();
        pengguna = meData.data?.pengguna;
        // Gunakan effectiveRole (role per-app) jika tersedia, fallback ke global role
        if (pengguna && meData.data?.effectiveRole) {
          pengguna.role = meData.data.effectiveRole;
        }
      } else {
        penggunaError = new Error(`Hono returned ${meRes.status}`);
      }
    } catch (error) {
      penggunaError = error;
    }
  }

  if (!isMaintenanceMode && pathname === '/maintenance') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  if (isMaintenanceMode && !pathname.startsWith('/api/auth')) {
    const isAdmin = pengguna?.role === 'ADMIN';

    if (!isAdmin && pathname !== '/maintenance' && pathname !== '/login') {
      const url = request.nextUrl.clone();
      url.pathname = '/maintenance';
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith('/api/')) {
    if (!user || !pengguna) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return supabaseResponse;
  }

  if (isPublicPath(pathname)) {
    if (user && pengguna && (pathname === AUTH_CONFIG.paths.login || pathname === AUTH_CONFIG.paths.maintenance)) {
    } else {
      return supabaseResponse;
    }
  }

  if (!user || !pengguna) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = AUTH_CONFIG.paths.login;
    return NextResponse.redirect(loginUrl);
  }

  if (penggunaError) {
    console.error('[Middleware] Pengguna query failed:', penggunaError);
  }

  const role = pengguna?.role as Role | undefined;
  const status = (pengguna?.status || 'ACTIVE') as 'PENDING' | 'ACTIVE' | 'REJECTED';

  if (status === 'PENDING') {
    if (pathname !== AUTH_CONFIG.paths.pendingApproval) {
      const pendingUrl = request.nextUrl.clone();
      pendingUrl.pathname = AUTH_CONFIG.paths.pendingApproval;
      return NextResponse.redirect(pendingUrl);
    }
    return supabaseResponse;
  }

  if (status === 'REJECTED') {
    if (pathname !== AUTH_CONFIG.paths.rejected) {
      const rejectedUrl = request.nextUrl.clone();
      rejectedUrl.pathname = AUTH_CONFIG.paths.rejected;
      return NextResponse.redirect(rejectedUrl);
    }
    return supabaseResponse;
  }

  if (status === 'ACTIVE') {
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aalData?.currentLevel === 'aal1' && aalData?.nextLevel === 'aal2') {
      if (pathname !== AUTH_CONFIG.paths.verify2fa) {
        const verifyUrl = request.nextUrl.clone();
        verifyUrl.pathname = AUTH_CONFIG.paths.verify2fa;
        return NextResponse.redirect(verifyUrl);
      }
      return supabaseResponse;
    }

    if (isMfaRequiredForRole(role) && aalData?.nextLevel !== 'aal2') {
      if (pathname !== AUTH_CONFIG.paths.setup2fa) {
        const setupUrl = request.nextUrl.clone();
        setupUrl.pathname = AUTH_CONFIG.paths.setup2fa;
        return NextResponse.redirect(setupUrl);
      }
      return supabaseResponse;
    }
    if (
      (pathname === AUTH_CONFIG.paths.verify2fa || pathname === AUTH_CONFIG.paths.setup2fa) &&
      aalData?.currentLevel === 'aal2'
    ) {
      const destination = role ? ROLE_DEFAULT_REDIRECT[role] : '/';
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = destination;
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (status === 'ACTIVE' && (pathname === AUTH_CONFIG.paths.pendingApproval || pathname === AUTH_CONFIG.paths.rejected)) {
    const destination = role ? ROLE_DEFAULT_REDIRECT[role] : '/';
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = destination;
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname === AUTH_CONFIG.paths.login) {
    const destination = role ? ROLE_DEFAULT_REDIRECT[role] : '/';
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = destination;
    return NextResponse.redirect(redirectUrl);
  }

  if (!role || pengguna?.deleted_at) {
    await supabase.auth.signOut();
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = AUTH_CONFIG.paths.login;
    loginUrl.searchParams.set('error', 'no-profile');
    return NextResponse.redirect(loginUrl);
  }

  if (!hasAccess(role, pathname)) {
    const fallback = ROLE_DEFAULT_REDIRECT[role];
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = fallback;
    return NextResponse.redirect(redirectUrl);
  }

  const authUser = {
    id: user.id,
    email: user.email ?? '',
    token: token ?? '',
    pengguna,
  };
  requestHeaders.set('x-auth-user', Buffer.from(JSON.stringify(authUser)).toString('base64'));

  const finalResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  supabaseResponse.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie.name, cookie.value);
  });

  return finalResponse;
}
