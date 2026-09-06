import { cache } from 'react';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { Role } from '@/config/rbac';
import { AUTH_CONFIG, isMfaRequiredForRole } from '@/config/auth';
import type { Pengguna } from '@/types/database';

export type AuthUser = {
  id: string;
  email: string;
  token: string;
  pengguna: Pengguna;
};

export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  try {
    const headersList = await headers();
    const authUserHeader = headersList.get('x-auth-user');

    if (authUserHeader) {
      const decodedStr = Buffer.from(authUserHeader, 'base64').toString('utf-8');
      const authUser = JSON.parse(decodedStr) as AuthUser;
      if (authUser?.id && authUser?.pengguna) {
        return authUser;
      }
    }
  } catch (error) {
    logger.warn('Failed to parse x-auth-user header, falling back to DB query', { error });
  }

  const supabase = await createClient();

  const {
    data: { session },
    error: authError,
  } = await supabase.auth.getSession();

  if (authError || !session?.user) {
    return null;
  }

  try {
    const meRes = await fetch(`${process.env.HONO_BACKEND_URL}/api/auth/me?app=manajemenasprak`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!meRes.ok) {
      return null;
    }

    const meData = await meRes.json();
    const pengguna = meData.data?.pengguna;

    if (!pengguna || pengguna.deleted_at) {
      return null;
    }

    if (meData.data?.effectiveRole) {
      pengguna.role = meData.data.effectiveRole;
    }

    return {
      id: session.user.id,
      email: session.user.email ?? '',
      token: session.access_token,
      pengguna: pengguna as Pengguna,
    };
  } catch (error) {
    logger.error('Failed to fetch profile from Hono in auth.ts', { error });
    return null;
  }
});

export async function requireAuth(redirectTo = AUTH_CONFIG.paths.login): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect(redirectTo);

  return user;
}

export async function requireRole(allowedRoles: Role[], redirectTo = '/'): Promise<AuthUser> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.pengguna.role)) {
    logger.warn('Access denied', { userRole: user.pengguna.role, allowedRoles });
    redirect(redirectTo);
  }
  return user;
}

export type RoleGuardResult = { ok: true; user: AuthUser } | { ok: false; response: NextResponse };

export async function requireRoleApi(
  allowedRoles: Role[],
  forbiddenMessage = 'Anda tidak memiliki akses untuk aksi ini'
): Promise<RoleGuardResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (!allowedRoles.includes(user.pengguna.role)) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: forbiddenMessage }, { status: 403 }),
    };
  }

  if (isMfaRequiredForRole(user.pengguna.role)) {
    const supabase = await createClient();
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.currentLevel !== 'aal2') {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: 'Two-Factor Authentication (AAL2) diperlukan untuk aksi ini.' },
          { status: 403 }
        ),
      };
    }
  }

  return { ok: true, user };
}
