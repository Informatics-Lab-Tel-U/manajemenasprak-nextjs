import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAllowedEmailDomain, AUTH_CONFIG } from '@/config/auth';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no-code`);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      console.error('[OAuth Callback] exchangeCodeForSession failed:', {
        message: error?.message,
        name: error?.name,
        status: (error as any)?.status,
        code: (error as any)?.code,
      });

      const isBanned =
        error?.message?.toLowerCase().includes('banned') ||
        (error as any)?.code === 'user_banned' ||
        (error as any)?.status === 403;

      if (isBanned) {
        return NextResponse.redirect(`${origin}/login?error=account-banned`);
      }

      return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
    }

    const user = data.user;
    const email = user.email?.toLowerCase() || '';

    // 🛡️ SECURITY LAYER: Enforce allowed email domain
    if (!isAllowedEmailDomain(email)) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        `${origin}${AUTH_CONFIG.paths.login}?error=invalid-domain`
      );
    }

    let userStatus = 'ACTIVE';

    // Ensure user profile exists in 'pengguna' table
    try {
      const admin = createAdminClient();
      const { data: existingProfile } = await admin
        .from('pengguna')
        .select('id, status, role, deleted_at')
        .eq('id', user.id)
        .maybeSingle();

      if (existingProfile?.deleted_at) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=account-banned`);
      }

      if (!existingProfile) {
        const rawName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'Civitas Telkom University';

        await admin.from('pengguna').insert({
          id: user.id,
          nama_lengkap: rawName,
          status: 'PENDING',
        });
        userStatus = 'PENDING';
      } else {
        userStatus = existingProfile.status || 'ACTIVE';
      }
    } catch (err) {
      console.error('[OAuth Callback] Failed to ensure pengguna row:', err);
    }

    // Industry-standard host validation to prevent Host Header Poisoning
    function resolveSafeBaseOrigin(req: Request, reqOrigin: string): string {
      const forwardedHost = req.headers.get('x-forwarded-host')?.trim();
      const isLocal = process.env.NODE_ENV === 'development';

      if (isLocal) {
        return reqOrigin;
      }

      if (forwardedHost) {
        // Validate against trusted host patterns
        const isAllowedHost =
          /^([a-z0-9-]+\.)*iflab\.web\.id$/i.test(forwardedHost) ||
          /^([a-z0-9-]+\.)*iflabdev\.(org|pages\.dev|workers\.dev)$/i.test(forwardedHost) ||
          /^([a-z0-9-]+\.)*telkomuniversity\.ac\.id$/i.test(forwardedHost) ||
          /^([a-z0-9-]+\.)*vercel\.app$/i.test(forwardedHost) ||
          /^(localhost|127\.0\.0\.1)(:[0-9]+)?$/i.test(forwardedHost);

        if (isAllowedHost) {
          const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
          return `${forwardedProto}://${forwardedHost}`;
        }
      }

      return reqOrigin;
    }

    // OWASP ASVS: Strictly resolve target redirect to same-origin path
    function getSafeRedirectPath(nextParam: string | null, baseOrigin: string): string {
      if (!nextParam) return '/';
      try {
        const parsed = new URL(nextParam, baseOrigin);
        if (parsed.origin === new URL(baseOrigin).origin) {
          return `${parsed.pathname}${parsed.search}${parsed.hash}`;
        }
      } catch {
        // Malformed URL
      }
      return '/';
    }

    const safeBaseOrigin = resolveSafeBaseOrigin(request, origin);

    if (userStatus === 'PENDING') {
      return NextResponse.redirect(`${safeBaseOrigin}${AUTH_CONFIG.paths.pendingApproval}`);
    }

    if (userStatus === 'REJECTED') {
      return NextResponse.redirect(`${safeBaseOrigin}${AUTH_CONFIG.paths.rejected}`);
    }

    const safeRedirectPath = getSafeRedirectPath(next, safeBaseOrigin);

    return NextResponse.redirect(`${safeBaseOrigin}${safeRedirectPath}`);
  } catch (err) {
    console.error('[OAuth Callback] Unexpected error:', err);
    return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
  }
}
