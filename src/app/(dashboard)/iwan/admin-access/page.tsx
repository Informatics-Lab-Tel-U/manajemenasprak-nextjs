'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Copy,
  Trash2,
  Check,
  Laptop,
  KeyRound,
  Radio,
} from 'lucide-react';

interface AdminToken {
  id: string;
  pair_code: string;
  auth_token: string;
  label: string;
  scope_all: boolean;
  allowed_room_ids: string[];
  is_paired: boolean;
  paired_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

interface RoomOption {
  id: string;
  name: string;
}

export default function IwanAdminAccessPage() {
  const [tokens, setTokens] = React.useState<AdminToken[]>([]);
  const [rooms, setRooms] = React.useState<RoomOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [newLabel, setNewLabel] = React.useState('');
  const [scopeAll, setScopeAll] = React.useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Result Modal State (shows newly generated 6-digit code)
  const [generatedCodeResult, setGeneratedCodeResult] = React.useState<{
    code: string;
    label: string;
  } | null>(null);

  // Delete State
  const [deletingToken, setDeletingToken] = React.useState<AdminToken | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      const [tokRes, roomsRes] = await Promise.all([
        fetch('/api/iwan/admin-tokens'),
        fetch('/api/iwan/rooms'),
      ]);
      const tokJson = await tokRes.json();
      const roomsJson = await roomsRes.json();

      if (tokJson.ok && Array.isArray(tokJson.data)) {
        setTokens(tokJson.data);
      }
      if (roomsJson.ok && Array.isArray(roomsJson.data)) {
        setRooms(roomsJson.data);
      }
    } catch {
      toast.error('Gagal memuat token admin');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Form Submit
  async function handleCreateToken(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) {
      toast.error('Label konsol admin wajib diisi');
      return;
    }
    if (!scopeAll && selectedRoomIds.length === 0) {
      toast.error('Pilih minimal satu ruangan atau centang Semua Ruangan');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/iwan/admin-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newLabel.trim(),
          scopeAll,
          allowedRoomIds: scopeAll ? [] : selectedRoomIds,
        }),
      });
      const json = await res.json();
      if (json.ok && json.data) {
        setIsCreateOpen(false);
        setGeneratedCodeResult({
          code: json.data.pair_code,
          label: json.data.label,
        });
        setNewLabel('');
        setScopeAll(false);
        setSelectedRoomIds([]);
        await fetchData();
      } else {
        toast.error(json.error || 'Gagal membuat kode admin');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Delete Submit
  async function handleDeleteSubmit() {
    if (!deletingToken) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/iwan/admin-tokens/${deletingToken.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(`Akses admin ${deletingToken.label} berhasil dicabut`);
        setDeletingToken(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Gagal mencabut akses admin');
      }
    } catch {
      toast.error('Terjadi kesalahan saat menghapus');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Kode pairing admin disalin');
    setTimeout(() => setCopiedCode(null), 2000);
  }

  const roomMap = new Map<string, string>();
  rooms.forEach((r) => roomMap.set(r.id, r.name));

  return (
    <div className="container mx-auto max-w-7xl py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Akses Konsol IWAN Admin
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Buat kode pairing 6-digit untuk laptop aslab jaga dengan pembatasan (*scope*) ruangan lab tertentu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Segarkan
          </Button>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Generate Kode Admin Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Buat Kode Pairing IWAN Admin</DialogTitle>
                <DialogDescription>
                  Kode 6-digit acak akan dibuat untuk dimasukkan pada konsol IWAN Admin di laptop aslab.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateToken} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="admin-label">Label Laptop / Aslab</Label>
                  <Input
                    id="admin-label"
                    placeholder="Contoh: Laptop Aslab Shift 1"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <Label>Scope Ruangan Lab</Label>
                  <div className="flex items-center space-x-2 py-1">
                    <Checkbox
                      id="scope-all"
                      checked={scopeAll}
                      onCheckedChange={(checked) => setScopeAll(Boolean(checked))}
                    />
                    <label
                      htmlFor="scope-all"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Akses Semua Ruangan Lab
                    </label>
                  </div>

                  {!scopeAll && (
                    <div className="border rounded-lg p-3 space-y-2 bg-muted/30 max-h-48 overflow-y-auto">
                      <p className="text-xs text-muted-foreground mb-1">
                        Pilih satu atau lebih ruangan yang diizinkan untuk dipantau:
                      </p>
                      {rooms.map((r) => {
                        const isChecked = selectedRoomIds.includes(r.id);
                        return (
                          <div key={r.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`room-${r.id}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRoomIds([...selectedRoomIds, r.id]);
                                } else {
                                  setSelectedRoomIds(selectedRoomIds.filter((id) => id !== r.id));
                                }
                              }}
                            />
                            <label
                              htmlFor={`room-${r.id}`}
                              className="text-sm cursor-pointer"
                            >
                              {r.name}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    Generate Kode 6 Digit
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Generated Code Result Modal */}
      <Dialog
        open={Boolean(generatedCodeResult)}
        onOpenChange={(open) => !open && setGeneratedCodeResult(null)}
      >
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <DialogTitle>Kode Pairing Admin Berhasil Dibuat</DialogTitle>
            <DialogDescription>
              Berikan kode 6 digit ini kepada aslab untuk dimasukkan pada aplikasi IWAN Admin.
            </DialogDescription>
          </DialogHeader>

          {generatedCodeResult && (
            <div className="py-4 space-y-4">
              <div className="bg-primary/5 border-2 border-dashed border-primary/40 rounded-xl p-6 relative">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {generatedCodeResult.label}
                </p>
                <div className="font-mono text-5xl font-black tracking-[0.25em] text-primary select-all">
                  {generatedCodeResult.code}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => handleCopy(generatedCodeResult.code)}
                >
                  <Copy className="h-4 w-4 mr-1.5" />
                  Salin Kode Pairing
                </Button>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border text-left space-y-1">
                <p className="font-semibold text-foreground">Cara Menggunakan di Laptop Aslab:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Buka aplikasi <strong>IWAN Admin</strong> di laptop.</li>
                  <li>Masukkan 6 digit kode pairing di atas.</li>
                  <li>Daftar PC praktikan sesuai scope ruangan akan otomatis termuat secara dinamis.</li>
                </ol>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setGeneratedCodeResult(null)} className="w-full">
              Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Card */}
      <Card className="border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Label Konsol</TableHead>
              <TableHead>Kode Aktivasi</TableHead>
              <TableHead>Scope Ruangan</TableHead>
              <TableHead>Status Pairing</TableHead>
              <TableHead>Terakhir Digunakan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  {isLoading ? 'Memuat token admin...' : 'Belum ada kode aktivasi admin yang dibuat.'}
                </TableCell>
              </TableRow>
            ) : (
              tokens.map((tok) => {
                const scopeDisplay = tok.scope_all
                  ? 'Semua Ruangan'
                  : tok.allowed_room_ids
                      .map((id) => roomMap.get(id) ?? 'Ruangan')
                      .join(', ') || 'Belum dipilih';

                return (
                  <TableRow key={tok.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-semibold text-sm flex items-center gap-2">
                      <Laptop className="h-4 w-4 text-muted-foreground" />
                      {tok.label}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded border max-w-fit">
                        <span>{tok.pair_code}</span>
                        <button
                          onClick={() => handleCopy(tok.pair_code)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Salin Kode"
                        >
                          {copiedCode === tok.pair_code ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {scopeDisplay}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tok.is_paired ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[11px] gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Terhubung
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[11px] text-amber-600 dark:text-amber-400 gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Menunggu Aktivasi
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {tok.last_used_at
                        ? new Date(tok.last_used_at).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : 'Belum pernah'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => setDeletingToken(tok)}
                        title="Cabut Akses Token"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Delete / Revoke Confirmation Dialog */}
      <Dialog open={Boolean(deletingToken)} onOpenChange={(open) => !open && setDeletingToken(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cabut Akses IWAN Admin?</DialogTitle>
            <DialogDescription>
              Tindakan ini akan mencabut token akses untuk konsol <strong>{deletingToken?.label}</strong>. Laptop aslab tidak akan dapat lagi mengambil daftar PC atau mengakses stream setelah akses dicabut.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeletingToken(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteSubmit} disabled={isSubmitting}>
              Cabut Akses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

