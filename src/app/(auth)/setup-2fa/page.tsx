'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Check, Loader2, AlertCircle, RotateCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AuthBrandingPanel } from '@/components/auth/AuthBrandingPanel';
import { logout } from '@/app/actions/auth';
import { enrollTotp, verifyTotp } from '@/app/actions/mfa';
import { createClient } from '@/lib/supabase/client';
import { AUTH_CONFIG } from '@/config/auth';
import { toast } from 'sonner';
import packageInfo from '../../../../package.json';

export default function Setup2FAPage() {
  const router = useRouter();
  const [qrCodeSvg, setQrCodeSvg] = React.useState<string | null>(null);
  const [secret, setSecret] = React.useState<string | null>(null);
  const [factorId, setFactorId] = React.useState<string | null>(null);
  const [code, setCode] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isInitializing, setIsInitializing] = React.useState(true);

  const initEnroll = React.useCallback(async () => {
    setIsInitializing(true);
    setError(null);
    try {
      const res = await enrollTotp();
      if (res.alreadyEnrolled) {
        router.replace(AUTH_CONFIG.paths.verify2fa);
        return;
      }
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setQrCodeSvg(res.data.qrCode);
        setSecret(res.data.secret);
        setFactorId(res.data.id);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memulai inisialisasi 2FA');
    } finally {
      setIsInitializing(false);
    }
  }, [router]);

  React.useEffect(() => {
    initEnroll();
  }, [initEnroll]);

  const handleCopySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success('Kunci rahasia disalin ke clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCodeChange = (val: string) => {
    setCode(val);
    if (error) setError(null);
  };

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;

    const cleanCode = code.trim().replace(/\s+/g, '');
    if (cleanCode.length !== 6) {
      setError('Masukkan 6 digit kode dari aplikasi authenticator');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await verifyTotp(factorId, cleanCode);
      if (res.error) {
        setError(res.error);
      } else {
        toast.success('Two-Factor Authentication berhasil diaktifkan!');
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memverifikasi kode');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      window.location.href = AUTH_CONFIG.paths.login;
    }
  }

  return (
    <div className="relative flex flex-col md:flex-row min-h-svh w-full">
      <AuthBrandingPanel />

      {/* Right panel (Form) */}
      <div className="w-full md:w-[48%] lg:w-[40%] shrink-0 bg-background flex flex-col justify-center items-center py-8 z-10 rounded-t-3xl md:rounded-none md:h-dvh shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-none overflow-y-auto">
        <div className="p-6 w-full max-w-md lg:w-[80%]">
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Aktifkan 2FA</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Hubungkan akun Anda dengan aplikasi authenticator
              </p>
            </div>

            <Card className="glass border-border/60 shadow-xl">
              <CardContent className="flex flex-col gap-5">
                {isInitializing ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Menyiapkan pendaftaran 2FA...</p>
                  </div>
                ) : (
                  <>
                    {error && (
                      <Alert variant="destructive" className="flex flex-col gap-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <AlertDescription className="text-xs leading-relaxed">{error}</AlertDescription>
                        </div>
                        {!qrCodeSvg && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => initEnroll()}
                            className="self-end text-xs h-7 gap-1.5 border-destructive/40 hover:bg-destructive/10"
                          >
                            <RotateCw className="size-3" />
                            Inisialisasi Ulang
                          </Button>
                        )}
                      </Alert>
                    )}

                    {/* Step 1: Scan QR */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-foreground">
                        1. Pindai QR Code dengan Aplikasi Authenticator
                      </p>
                      <div className="flex justify-center">
                        {qrCodeSvg ? (
                          <div
                            className="bg-white p-3 rounded-lg border shadow-sm inline-block"
                            dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                          />
                        ) : (
                          <div className="size-48 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                            Memuat QR...
                          </div>
                        )}
                      </div>

                      {secret && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] text-muted-foreground block">
                            Atau masukkan kunci rahasia secara manual:
                          </span>
                          <div className="flex items-center gap-2">
                            <code className="px-2.5 py-1 text-xs bg-muted border rounded font-mono font-bold flex-1 select-all break-all">
                              {secret}
                            </code>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleCopySecret}
                              className="h-8 shrink-0 text-xs gap-1"
                            >
                              {copied ? (
                                <Check className="size-3.5 text-green-500" />
                              ) : (
                                <Copy className="size-3.5" />
                              )}
                              {copied ? 'Tersalin' : 'Salin'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Step 2: Confirmation code */}
                    <form onSubmit={handleVerify} className="flex flex-col gap-5">
                      <div className="flex flex-col gap-3 items-center">
                        <Label htmlFor="setupOtp" className="self-start text-sm font-medium">
                          2. Masukkan 6 Digit Kode dari Aplikasi
                        </Label>
                        <InputOTP
                          id="setupOtp"
                          maxLength={6}
                          value={code}
                          onChange={handleCodeChange}
                          disabled={isLoading}
                          containerClassName="justify-center"
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                          </InputOTPGroup>
                          <InputOTPSeparator />
                          <InputOTPGroup>
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>

                      <div className="flex flex-col gap-2.5 mt-2">
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={isLoading || code.length !== 6 || !factorId}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Mengaktifkan 2FA...
                            </>
                          ) : (
                            'Konfirmasi & Aktifkan 2FA'
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="destructive-outline"
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                          className="w-full"
                        >
                          {isLoggingOut ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Keluar...
                            </>
                          ) : (
                            'Keluar'
                          )}
                        </Button>
                      </div>
                    </form>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 md:bottom-6 md:left-8 md:right-auto z-50 text-[10px] md:text-xs font-mono font-semibold text-muted-foreground/50 pointer-events-none">
        v{packageInfo.version}
      </div>
    </div>
  );
}
