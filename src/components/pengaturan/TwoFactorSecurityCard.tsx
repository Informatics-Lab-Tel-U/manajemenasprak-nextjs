'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getMfaStatus, unenrollTotp } from '@/app/actions/mfa';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { AUTH_CONFIG } from '@/config/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function TwoFactorSecurityCard() {
  const router = useRouter();
  const [hasVerifiedFactor, setHasVerifiedFactor] = React.useState(false);
  const [factorId, setFactorId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUnenrolling, setIsUnenrolling] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const fetchStatus = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getMfaStatus();
      if (res.data) {
        setHasVerifiedFactor(res.data.hasVerifiedFactor);
        const verified = res.data.enrolledFactors.find((f) => f.status === 'verified');
        setFactorId(verified?.id || null);
      }
    } catch (err: any) {
      console.error('Failed to get 2FA status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleUnenroll = async () => {
    if (!factorId) return;
    setIsUnenrolling(true);
    try {
      const res = await unenrollTotp(factorId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Two-Factor Authentication berhasil dinonaktifkan');
        setIsModalOpen(false);
        await fetchStatus();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menonaktifkan 2FA');
    } finally {
      setIsUnenrolling(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Autentikasi Dua Langkah (2FA)</CardTitle>
          {!isLoading && (
            <CardAction>
              <Badge variant={hasVerifiedFactor ? 'default' : 'secondary'}>
                {hasVerifiedFactor ? 'Aktif' : 'Belum Aktif'}
              </Badge>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {hasVerifiedFactor
              ? 'Akun Anda terlindungi dengan kode verifikasi 6 digit dari aplikasi authenticator.'
              : 'Gunakan aplikasi seperti Google Authenticator atau Microsoft Authenticator untuk menghasilkan kode masuk sekali pakai.'}
          </p>
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t pt-4">
          {hasVerifiedFactor ? (
            <p className="text-xs text-muted-foreground">Aplikasi authenticator terhubung</p>
          ) : (
            <span />
          )}
          <div>
            {isLoading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : hasVerifiedFactor ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="text-destructive hover:bg-destructive/10"
              >
                Hapus 2FA
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => router.push(AUTH_CONFIG.paths.setup2fa)}
              >
                Konfigurasi 2FA
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Confirmation Dialog to Unenroll */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nonaktifkan Two-Factor Authentication?</DialogTitle>
            <DialogDescription>
              Tindakan ini akan menghapus koneksi aplikasi authenticator saat ini. Anda harus mendaftarkan ulang QR Code untuk mengaktifkannya kembali.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isUnenrolling}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnenroll}
              disabled={isUnenrolling}
            >
              {isUnenrolling ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Nonaktifkan 2FA'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
