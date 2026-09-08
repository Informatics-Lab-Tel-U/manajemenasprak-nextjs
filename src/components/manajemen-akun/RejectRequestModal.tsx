'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
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
import type { Pengguna } from '@/types/database';

type AccessRequestUser = Pengguna & { email: string };

interface RejectRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AccessRequestUser | null;
  onSuccess: () => void;
}

export function RejectRequestModal({
  open,
  onOpenChange,
  user,
  onSuccess,
}: RejectRequestModalProps) {
  const [reason, setReason] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setReason('');
    }
  }, [open]);

  async function handleReject() {
    if (!user) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const json = await res.json();
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || 'Gagal menolak permintaan akses.');
      }

      toast.success(`Permintaan akses untuk "${user.nama_lengkap}" telah ditolak.`);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  }

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive text-xl">
            Tolak Permintaan Akses
          </DialogTitle>
          <DialogDescription>
            Akun <strong>{user.nama_lengkap}</strong> ({user.email}) tidak akan diberikan hak akses ke dalam sistem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label htmlFor="reject-reason" className="text-sm font-medium">
            Alasan Penolakan (Opsional)
          </Label>
          <Textarea
            id="reject-reason"
            placeholder="Contoh: Bukan asisten laboratorium aktif semester ini."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isLoading}
            rows={3}
            className="resize-none text-sm"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading && <Spinner className="h-4 w-4" />}
            Tolak Permintaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
