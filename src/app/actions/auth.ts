'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AUTH_CONFIG, isMfaRequiredForRole, isMfaRequiredForUser } from '@/config/auth';
import type { Role } from '@/config/rbac';

export async function logout() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) {
    throw error;
  }
}

export async function login(email: string, password: string, turnstileToken: string | null) {
  // VULN-07 FIX: Was reading TURNSTILE_SECRET but env file defines TURNSTILE_SECRET_KEY.
  // Mismatch caused turnstileSecret to always be undefined, silently skipping CAPTCHA.
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;

  if (!turnstileSecret) {
    // Fail-closed: if secret is not configured, refuse to proceed rather than skip verification.
    // In development, set TURNSTILE_SECRET_KEY to the test key: 1x0000000000000000000000000000000AA
    console.error('[auth] TURNSTILE_SECRET_KEY is not set. Refusing login to prevent CAPTCHA bypass.');
    return { error: 'Server misconfiguration: bot protection unavailable.' };
  }

  if (!turnstileToken) {
    return { error: 'Verifikasi Turnstile diperlukan.' };
  }

  try {
    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: turnstileSecret,
        response: turnstileToken,
      }),
    });

    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      return { error: 'Verifikasi Turnstile gagal. Silakan coba lagi.' };
    }
  } catch (err) {
    console.error('Turnstile siteverify error:', err);
    return { error: 'Gagal melakukan verifikasi keamananan.' };
  }

  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  let redirectTo = '/';

  if (authData.user) {
    try {
      // Check MFA Assurance Level
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      const meRes = await fetch(`${process.env.HONO_BACKEND_URL}/api/auth/me?app=manajemenasprak`, {
        headers: { Authorization: `Bearer ${authData.session?.access_token}` },
        cache: 'no-store',
      });

      let role: Role | undefined;
      if (meRes.ok) {
        const meData = await meRes.json();
        role = meData.data?.effectiveRole || meData.data?.pengguna?.role;
      }

      if (aalData?.currentLevel === 'aal1' && aalData?.nextLevel === 'aal2') {
        redirectTo = AUTH_CONFIG.paths.verify2fa;
      } else if (isMfaRequiredForUser(authData.user, role) && aalData?.nextLevel !== 'aal2') {
        redirectTo = AUTH_CONFIG.paths.setup2fa;
      }
    } catch (err) {
      console.error('[Login Action] Error checking MFA state:', err);
    }
  }

  return { success: true, redirectTo };
}

export async function reapplyAccess(notes?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Sesi login Anda telah kedaluwarsa. Silakan masuk kembali.' };
  }

  try {
    const admin = createAdminClient();
    const { data: pengguna, error: fetchError } = await admin
      .from('pengguna')
      .select('id, status, deleted_at')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchError || !pengguna) {
      return { error: 'Profil pengguna tidak ditemukan.' };
    }

    if (pengguna.deleted_at) {
      return { error: 'Akun Anda telah dinonaktifkan oleh administrator.' };
    }

    if (pengguna.status !== 'REJECTED') {
      return { error: 'Permintaan akses hanya dapat diajukan ulang jika status akun ditolak.' };
    }

    const updatePayload: Record<string, any> = {
      status: 'PENDING',
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    };

    if (notes && notes.trim().length > 0) {
      updatePayload.catatan_request = notes.trim();
    }

    const { error: updateError } = await admin
      .from('pengguna')
      .update(updatePayload)
      .eq('id', user.id);

    if (updateError) {
      return { error: updateError.message || 'Gagal memperbarui status permintaan.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[reapplyAccess] Unexpected error:', err);
    return { error: err.message || 'Terjadi kesalahan sistem saat mengajukan ulang.' };
  }
}
