'use client';

import * as React from 'react';
import { useIwanPolling } from '@/hooks/useIwanPolling';
import { fetchIwanData } from '@/lib/iwanPolling';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, RefreshCw, Copy, Trash2, Check, Laptop } from 'lucide-react';

// Lebih lega dari px-2 default di sisi tepi tabel, supaya kolom pertama dan terakhir tidak menempel ke border.
const TABLE_EDGE_PADDING =
  '[&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4';

interface AdminToken {
  id: string;
  pair_code: string;
  auth_token: string | null;
  label: string;
  scope_all: boolean;
  allowed_room_ids: string[];
  is_paired: boolean;
  paired_at: string | null;
  last_used_at: string | null;
  created_at: string;
  status?: 'pending' | 'active' | 'revoked';
  bound_mac?: string | null;
  installation_id?: string | null;
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

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [newLabel, setNewLabel] = React.useState('');
  const [scopeAll, setScopeAll] = React.useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [generatedCodeResult, setGeneratedCodeResult] = React.useState<{ code: string; label: string } | null>(null);
  const [deletingToken, setDeletingToken] = React.useState<AdminToken | null>(null);
  const [reissuingToken, setReissuingToken] = React.useState<AdminToken | null>(null);

  const loadData = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const [tokenData, roomData] = await Promise.all([
        fetchIwanData<AdminToken[]>('/api/iwan/admin-tokens', signal),
        fetchIwanData<RoomOption[]>('/api/iwan/rooms?view=options', signal),
      ]);
      if (!signal?.aborted) {
        setTokens(tokenData);
        setRooms(roomData);
      }
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);
  const fetchData = React.useCallback(async () => {
    try {
      await loadData();
    } catch {
      toast.error('Gagal memuat token admin');
    }
  }, [loadData]);

  useIwanPolling(loadData, 0, 'Gagal memuat token admin');

  async function handleCreateToken(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return toast.error('Label konsol admin wajib diisi');
    if (!scopeAll && selectedRoomIds.length === 0) {
      return toast.error('Pilih minimal satu ruangan atau centang Semua Ruangan');
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/iwan/admin-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim(), scopeAll, allowedRoomIds: scopeAll ? [] : selectedRoomIds }),
      });
      const json = await res.json();
      if (json.ok && json.data) {
        setIsCreateOpen(false);
        setGeneratedCodeResult({ code: json.data.pair_code, label: json.data.label });
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

  async function handleDeleteSubmit() {
    if (!deletingToken) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/iwan/admin-tokens/${deletingToken.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.ok) {
        toast.success(`Akses admin ${deletingToken.label} berhasil dicabut`);
        setDeletingToken(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Gagal mencabut akses');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReissueSubmit() {
    if (!reissuingToken) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/iwan/admin-tokens/${reissuingToken.id}/reissue`, { method: 'POST' });
      const json = await res.json();
      if (json.ok && json.data) {
        const label = reissuingToken.label;
        setReissuingToken(null);
        setGeneratedCodeResult({ code: json.data.pair_code, label });
        await fetchData();
      } else {
        toast.error(json.error || 'Gagal menerbitkan ulang kode');
      }
    } catch {
      toast.error('Terjadi kesalahan');
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
    <div className="container mx-auto max-w-[2000px] 2xl:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">Akses Admin Console</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Segarkan
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Generate Kode Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Buat Kode Pairing IWAN Admin</DialogTitle>
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
                <div className="space-y-2">
                  <Label>Scope Ruangan</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="scope-all"
                      checked={scopeAll}
                      onCheckedChange={(checked) => setScopeAll(Boolean(checked))}
                    />
                    <label htmlFor="scope-all" className="text-sm cursor-pointer">Akses Semua Ruangan</label>
                  </div>
                  {!scopeAll && (
                    <div className="border rounded-md p-3 space-y-2 bg-muted/30 max-h-40 overflow-y-auto">
                      {rooms.map((r) => {
                        const checked = selectedRoomIds.includes(r.id);
                        return (
                          <div key={r.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`room-${r.id}`}
                              checked={checked}
                              onCheckedChange={(c) =>
                                setSelectedRoomIds(c
                                  ? [...selectedRoomIds, r.id]
                                  : selectedRoomIds.filter((id) => id !== r.id))
                              }
                            />
                            <label htmlFor={`room-${r.id}`} className="text-sm cursor-pointer">{r.name}</label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Batal</Button>
                  <Button type="submit" disabled={isSubmitting}>Generate Kode</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Generated Code Result Dialog */}
      <Dialog open={Boolean(generatedCodeResult)} onOpenChange={(open) => !open && setGeneratedCodeResult(null)}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <DialogTitle>Kode Pairing Admin Berhasil Dibuat</DialogTitle>
          </DialogHeader>
          {generatedCodeResult && (
            <div className="py-4">
              <div className="bg-muted/40 border border-dashed rounded-lg p-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {generatedCodeResult.label}
                </p>
                <div className="font-mono text-5xl font-black tracking-[0.25em] text-primary select-all">
                  {generatedCodeResult.code}
                </div>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => handleCopy(generatedCodeResult.code)}>
                  <Copy className="h-4 w-4 mr-1.5" />Salin Kode
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setGeneratedCodeResult(null)} className="w-full">Selesai</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="overflow-hidden rounded-md border">
        <Table className={`2xl:text-base ${TABLE_EDGE_PADDING}`}>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Label Konsol</TableHead>
              <TableHead>Kode Aktivasi</TableHead>
              <TableHead>Scope Ruangan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Perangkat Terikat</TableHead>
              <TableHead>Terakhir Digunakan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {isLoading ? 'Memuat token admin...' : 'Belum ada kode aktivasi admin.'}
                </TableCell>
              </TableRow>
            ) : (
              tokens.map((tok) => {
                const scopeDisplay = tok.scope_all
                  ? 'Semua Ruangan'
                  : tok.allowed_room_ids.map((id) => roomMap.get(id) ?? 'Ruangan').join(', ') || '-';

                return (
                  <TableRow key={tok.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Laptop className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium">{tok.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1.5 px-1.5">
                        {tok.pair_code}
                        <button
                          type="button"
                          onClick={() => handleCopy(tok.pair_code)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={`Salin kode ${tok.pair_code}`}
                        >
                          {copiedCode === tok.pair_code
                            ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                            : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="px-1.5 text-muted-foreground">{scopeDisplay}</Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const status = tok.status ?? (tok.is_paired ? 'active' : 'pending');
                        if (status === 'active') {
                          return (
                            <Badge variant="outline" className="gap-1.5 px-1.5 text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Terhubung
                            </Badge>
                          );
                        }
                        if (status === 'revoked') {
                          return (
                            <Badge variant="outline" className="gap-1.5 px-1.5 text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />Dicabut
                            </Badge>
                          );
                        }
                        return (
                          <Badge variant="outline" className="gap-1.5 px-1.5 text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Menunggu Aktivasi
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tok.bound_mac ? (
                        <span className="font-mono text-xs">{tok.bound_mac}</span>
                      ) : (
                        <span className="text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tok.last_used_at
                        ? new Date(tok.last_used_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                        : 'Belum pernah'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          className="border-muted-foreground/40 dark:border-muted-foreground/40"
                          onClick={() => setReissuingToken(tok)}
                          aria-label="Terbitkan ulang kode"
                          title="Terbitkan ulang kode"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          className="border-muted-foreground/40 text-destructive hover:bg-destructive/10 hover:text-destructive dark:border-muted-foreground/40 dark:hover:bg-destructive/20"
                          onClick={() => setDeletingToken(tok)}
                          aria-label="Cabut akses"
                          title="Cabut akses"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Reissue AlertDialog */}
      <AlertDialog open={Boolean(reissuingToken)} onOpenChange={(open) => !open && setReissuingToken(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terbitkan Ulang Kode Aktivasi?</AlertDialogTitle>
            <AlertDialogDescription>
              Kode baru akan dibuat untuk konsol <strong>{reissuingToken?.label}</strong> dan token lamanya langsung dicabut. Gunakan ini untuk memindahkan konsol ke PC lain. Konsol harus aktivasi ulang dengan kode baru.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleReissueSubmit} disabled={isSubmitting}>
              Terbitkan Ulang
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke AlertDialog */}
      <AlertDialog open={Boolean(deletingToken)} onOpenChange={(open) => !open && setDeletingToken(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cabut Akses IWAN Admin?</AlertDialogTitle>
            <AlertDialogDescription>
              Token akses untuk konsol <strong>{deletingToken?.label}</strong> akan dicabut. Laptop aslab tidak dapat lagi mengambil daftar PC atau mengakses stream setelahnya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubmit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cabut Akses
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
