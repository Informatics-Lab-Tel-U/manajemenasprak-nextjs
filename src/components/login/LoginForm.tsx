'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/app/actions/auth';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { TurnstileWidget } from './TurnstileWidget';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { createClient } from '@/lib/supabase/client';
import { Microsoft } from '@thesvg/react';

const URL_ERROR_MESSAGES: Record<string, string> = {
  'no-profile': 'Akun Anda belum terdaftar dalam sistem. Hubungi pengelola sistem.',
  'invalid-domain': 'Hanya akun resmi civitas akademika Telkom University (@student.telkomuniversity.ac.id / @telkomuniversity.ac.id) yang diizinkan.',
  'auth-code-error': 'Gagal melakukan verifikasi akun Microsoft. Silakan coba lagi.',
  'no-code': 'Kode autentikasi tidak valid atau sudah kedaluwarsa.',
  'account-banned': 'Akun Anda telah dinonaktifkan oleh administrator. Silakan hubungi admin laboratorium jika membutuhkan akses kembali.',
};


export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);
  const turnstileToken = React.useRef<string | null>(null);
  const isTurnstileUnsupported = React.useRef(false);
  const turnstileRef = React.useRef<TurnstileInstance>(null);

  React.useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError && URL_ERROR_MESSAGES[urlError]) {
      setError(URL_ERROR_MESSAGES[urlError]);
    }
  }, [searchParams]);

  async function handleMicrosoftLogin() {
    setError(null);
    setIsOAuthLoading(true);

    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'email profile openid',
          queryParams: {
            // Force Microsoft to always show the account picker, even if a session exists.
            // Without this, users who just logged out would be silently re-logged in.
            prompt: 'select_account',
          },
        },
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (err: any) {
      console.error('Microsoft OAuth login error:', err);
      setError(err.message || 'Gagal memulai login dengan Microsoft.');
      setIsOAuthLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const hasSiteKey = !!process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;

    if (hasSiteKey && !turnstileToken.current && !isTurnstileUnsupported.current) {
      setError('Harap selesaikan verifikasi keamanan.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await login(email, password, turnstileToken.current);

      if (res.error) {
        const isCaptchaError =
          res.error.toLowerCase().includes('captcha') ||
          res.error.toLowerCase().includes('verification');

        setError(
          isCaptchaError
            ? 'Verifikasi keamanan gagal. Silakan coba lagi.'
            : 'Email atau kata sandi salah. Silakan coba lagi.'
        );

        turnstileToken.current = null;
        turnstileRef.current?.reset();

        setIsLoading(false);
        return;
      }

      // Hard navigate to eliminate client router/bfcache stale states
      window.location.href = res.redirectTo || '/';
      return;
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError('Terjadi kesalahan koneksi. Silakan coba lagi.');
      turnstileToken.current = null;
      turnstileRef.current?.reset();
      setIsLoading(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Selamat Datang</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Masuk untuk mengakses sistem manajemen asisten praktikum
        </p>
      </div>

      <Card className="glass border-border/60 shadow-xl">
        <CardContent className="flex flex-col gap-5">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs leading-relaxed">{error}</AlertDescription>
            </Alert>
          )}

          {/* Microsoft Single Sign-On Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleMicrosoftLogin}
            disabled={isLoading || isOAuthLoading}
            className="w-full h-11 border-border/80 hover:bg-muted/50 font-medium flex items-center justify-center gap-3 transition-colors"
          >
            {isOAuthLoading ? (
              <>
                <Spinner className="h-4 w-4" />
                <span>Menghubungkan ke Microsoft...</span>
              </>
            ) : (
              <>
                <Microsoft className="h-5 w-5" />
                <span>Masuk dengan Akun Microsoft</span>
              </>
            )}
          </Button>

          {/* Elegant Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-border/60 w-full" />
            <span className="bg-card px-3 text-xs text-muted-foreground uppercase tracking-wider shrink-0">
              atau masuk dengan
            </span>
            <div className="border-t border-border/60 w-full" />
          </div>

          <form onSubmit={handleSubmit} method="POST" className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@contoh.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || isOAuthLoading}
                name="email"
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading || isOAuthLoading}
                  name="password"
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(!!checked)}
              />
              <Label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Tetap masuk
              </Label>
            </div>

            {!!process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY && (
              <TurnstileWidget
                ref={turnstileRef}
                onVerify={(val) => {
                  turnstileToken.current = val;
                }}
                onUnsupported={() => {
                  isTurnstileUnsupported.current = true;
                }}
              />
            )}

            <Button type="submit" disabled={isLoading || isOAuthLoading} className="w-full mt-2">
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Memproses...
                </>
              ) : (
                'Masuk'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
