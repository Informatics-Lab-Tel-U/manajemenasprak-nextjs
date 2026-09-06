'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, LogOut, Mail, RotateCcw, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AuthBrandingPanel } from '@/components/auth/AuthBrandingPanel';
import { logout, reapplyAccess } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/ui/spinner';
import { AUTH_CONFIG } from '@/config/auth';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import packageInfo from '../../../../package.json';

export default function RejectedPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [notes, setNotes] = React.useState('');
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [userName, setUserName] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadUserData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || null);
        setUserName(
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'Pengguna'
        );
      }
    }
    loadUserData();
  }, []);

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

  async function handleReapply() {
    setIsSubmitting(true);
    try {
      const res = await reapplyAccess(notes);
      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success('Permintaan akses berhasil diajukan ulang!');
      setIsDialogOpen(false);
      window.location.href = AUTH_CONFIG.paths.pendingApproval;
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat mengajukan ulang.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex flex-col md:flex-row min-h-svh w-full">
      <AuthBrandingPanel />

      {/* Right panel */}
      <div className="w-full md:w-[48%] lg:w-[40%] shrink-0 bg-background flex flex-col justify-center items-center py-8 z-10 rounded-t-3xl md:rounded-none md:h-dvh shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-none">
        <div className="p-6 w-full max-w-md lg:w-[80%]">
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                  <ShieldAlert className="size-3.5" />
                  Akses Ditolak
                </span>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">Permintaan Tidak Disetujui</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Akun Anda saat ini belum diberikan hak akses oleh administrator
              </p>
            </div>

            <Card className="glass border-border/60 shadow-xl">
              <CardContent className="flex flex-col gap-5 pt-6">
                {/* User info box matching pending-approval */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Akun yang masuk</p>
                  <div className="p-3 rounded-lg border border-border/50 bg-muted/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground truncate">
                        {userName || (
                          <span className="text-muted-foreground">Memuat...</span>
                        )}
                      </span>
                      <span className="text-[10px] font-mono text-destructive flex items-center gap-1 shrink-0 ml-2">
                        <ShieldAlert className="size-3" />
                        Ditolak
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {userEmail || '—'}
                    </p>
                  </div>
                </div>

                {/* Explanation banner */}
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-muted-foreground leading-relaxed">
                  <ShieldAlert className="size-4 shrink-0 text-destructive mt-0.5" />
                  <span>
                    Jika Anda merasa ini adalah kekeliruan atau Anda merupakan asisten aktif semester ini, silakan ajukan ulang permintaan akses atau hubungi Koordinator Asisten / Laboran Informatika.
                  </span>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex flex-col gap-2.5">
                  <Button
                    onClick={() => setIsDialogOpen(true)}
                    disabled={isLoggingOut || isSubmitting}
                    className="w-full gap-2 shadow-sm"
                  >
                    <RotateCcw className="size-4" />
                    Ajukan Ulang Permintaan Akses
                  </Button>

                  <Button
                    type="button"
                    variant="destructive-outline"
                    onClick={handleLogout}
                    disabled={isLoggingOut || isSubmitting}
                    className="w-full gap-2"
                  >
                    {isLoggingOut ? (
                      <>
                        <Spinner className="size-4" />
                        Keluar...
                      </>
                    ) : (
                      <>
                        <LogOut className="size-4" />
                        Keluar / Ganti Akun
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 md:bottom-6 md:left-8 md:right-auto z-50 text-[10px] md:text-xs font-mono font-semibold text-muted-foreground/50 pointer-events-none">
        v{packageInfo.version}
      </div>

      {/* Dialog Ajukan Ulang */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <RotateCcw className="size-5 text-primary" />
              Ajukan Ulang Permintaan Akses
            </DialogTitle>
            <DialogDescription>
              Status akun Anda akan dikembalikan ke antrean peninjauan administrator untuk diverifikasi ulang.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="reapply-notes" className="text-sm font-medium">
              Catatan Tambahan (Opsional)
            </Label>
            <Textarea
              id="reapply-notes"
              placeholder="Contoh: Saya merupakan asisten aktif praktikum AP semester ini, mohon persetujuannya."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              onClick={handleReapply}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? <Spinner className="size-4" /> : <Send className="size-4" />}
              Kirim Pengajuan Ulang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
