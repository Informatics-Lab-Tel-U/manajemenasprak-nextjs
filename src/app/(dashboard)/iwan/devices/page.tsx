'use client';

import * as React from 'react';
import { useIwanPolling } from '@/hooks/useIwanPolling';
import { fetchIwanData } from '@/lib/iwanPolling';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { RefreshCw, Search, Copy, Edit2, Trash2, Check } from 'lucide-react';

// Lebih lega dari px-2 default di sisi tepi tabel, supaya kolom pertama dan terakhir tidak menempel ke border.
const TABLE_EDGE_PADDING =
  '[&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4';

interface DeviceItem {
  id: string;
  roomId: string;
  roomName: string;
  label: string;
  seatNumber: number;
  macAddress: string;
  localIp: string;
  port: number;
  hostnameRaw: string | null;
  status: string;
  computedStatus: 'online' | 'offline' | 'streaming';
  activeViewer: string | null;
  lastSeen: string;
}

interface RoomOption {
  id: string;
  name: string;
}

export default function IwanDevicesPage() {
  const [devices, setDevices] = React.useState<DeviceItem[]>([]);
  const [rooms, setRooms] = React.useState<RoomOption[]>([]);
  const [selectedRoomFilter, setSelectedRoomFilter] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [autoRefresh, setAutoRefresh] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState(0);
  const [copiedMac, setCopiedMac] = React.useState<string | null>(null);

  const [editingDevice, setEditingDevice] = React.useState<DeviceItem | null>(null);
  const [editLabel, setEditLabel] = React.useState('');
  const [editSeatNumber, setEditSeatNumber] = React.useState(1);
  const [editRoomId, setEditRoomId] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [deletingDevice, setDeletingDevice] = React.useState<DeviceItem | null>(null);

  const deviceRequest = React.useRef<AbortController | null>(null);
  const loadDevices = React.useCallback(async (signal?: AbortSignal) => {
    deviceRequest.current?.abort();
    const controller = new AbortController();
    deviceRequest.current = controller;
    const requestSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
    const query = selectedRoomFilter === 'ALL' ? '' : `?roomId=${encodeURIComponent(selectedRoomFilter)}`;
    try {
      const data = await fetchIwanData<DeviceItem[]>(`/api/iwan/devices${query}`, requestSignal);
      if (!requestSignal.aborted) {
        setDevices(data);
        setLastUpdated(Date.now());
      }
    } catch (error) {
      if (!requestSignal.aborted) throw error;
    } finally {
      if (deviceRequest.current === controller) deviceRequest.current = null;
      if (!requestSignal.aborted) setIsLoading(false);
    }
  }, [selectedRoomFilter]);

  const loadRoomOptions = React.useCallback(async (signal?: AbortSignal) => {
    const data = await fetchIwanData<RoomOption[]>('/api/iwan/rooms?view=options', signal);
    if (!signal?.aborted) setRooms(data);
  }, []);

  const fetchData = React.useCallback(async () => {
    try {
      await Promise.all([loadDevices(), loadRoomOptions()]);
    } catch {
      toast.error('Gagal memuat data perangkat');
    }
  }, [loadDevices, loadRoomOptions]);

  const pollDevices = React.useCallback((signal: AbortSignal) => loadDevices(signal), [loadDevices]);
  const pollDevicesIfIdle = React.useCallback(
    (signal: AbortSignal) => deviceRequest.current ? Promise.resolve() : loadDevices(signal),
    [loadDevices],
  );
  useIwanPolling(pollDevices, 0, 'Gagal memuat data perangkat');
  useIwanPolling(pollDevicesIfIdle, 8000, 'Gagal memuat data perangkat', autoRefresh, false);
  useIwanPolling(loadRoomOptions, 0, 'Gagal memuat daftar ruangan');
  React.useEffect(() => () => deviceRequest.current?.abort(), []);

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDevice) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/iwan/devices/${editingDevice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editLabel.trim(), seatNumber: Number(editSeatNumber), roomId: editRoomId }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(`Perangkat ${editLabel} berhasil diperbarui`);
        setEditingDevice(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Gagal memperbarui perangkat');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteSubmit() {
    if (!deletingDevice) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/iwan/devices/${deletingDevice.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.ok) {
        toast.success(`Kuncian hardware ${deletingDevice.label} berhasil dihapus`);
        setDeletingDevice(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Gagal menghapus');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCopy(mac: string) {
    navigator.clipboard.writeText(mac);
    setCopiedMac(mac);
    toast.success(`MAC Address ${mac} disalin`);
    setTimeout(() => setCopiedMac(null), 2000);
  }

  function formatRelativeTime(dateStr: string) {
    const diffSeconds = Math.round((lastUpdated - new Date(dateStr).getTime()) / 1000);
    if (diffSeconds < 15) return 'Baru saja';
    if (diffSeconds < 60) return `${diffSeconds} detik lalu`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    return `${Math.floor(diffHours / 24)} hari lalu`;
  }

  const filteredDevices = devices.filter((d) => {
    if (selectedRoomFilter !== 'ALL' && d.roomId !== selectedRoomFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.label.toLowerCase().includes(q) ||
        d.macAddress.toLowerCase().includes(q) ||
        d.localIp.toLowerCase().includes(q) ||
        (d.hostnameRaw || '').toLowerCase().includes(q) ||
        d.roomName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalCount = devices.length;
  const onlineCount = devices.filter((d) => d.computedStatus !== 'offline').length;

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">Pemetaan PC</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={autoRefresh ? 'secondary' : 'outline'}
            size="sm"
            aria-label="Pembaruan otomatis daftar perangkat"
            aria-pressed={autoRefresh}
            onClick={() => setAutoRefresh((current) => !current)}
          >
            Otomatis: {autoRefresh ? 'ON (8 dtk)' : 'OFF'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw data-icon="inline-start" />
            Segarkan
          </Button>
        </div>
      </div>

      {/* Stat Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total PC Terdaftar', value: totalCount, color: '' },
          { label: 'Online', value: onlineCount, color: 'text-emerald-500' },
          { label: 'Offline', value: totalCount - onlineCount, color: 'text-muted-foreground' },
        ].map((s) => (
          <Card key={s.label} className="gap-1 py-4">
            <CardContent className="px-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-semibold mt-1 tabular-nums ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari label, MAC address, IP, hostname..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="sm:ml-auto">
          <Select value={selectedRoomFilter} onValueChange={setSelectedRoomFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Pilih Ruangan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Ruangan</SelectItem>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border">
        <Table className={`2xl:text-base ${TABLE_EDGE_PADDING}`}>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>No.</TableHead>
              <TableHead>Label PC</TableHead>
              <TableHead>Ruangan</TableHead>
              <TableHead>MAC Address</TableHead>
              <TableHead>IP LAN Terkini</TableHead>
              <TableHead>Hostname Windows</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Detak Terakhir</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDevices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  {isLoading ? 'Memuat data perangkat...' : 'Tidak ada perangkat yang sesuai.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredDevices.map((dev) => {
                const isOnline = dev.computedStatus !== 'offline';
                const isStreaming = dev.computedStatus === 'streaming';
                return (
                  <TableRow key={dev.id}>
                    <TableCell className="font-medium tabular-nums">#{dev.seatNumber}</TableCell>
                    <TableCell className="font-medium">{dev.label}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="px-1.5 text-muted-foreground">{dev.roomName}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1.5 px-1.5 font-mono">
                        {dev.macAddress}
                        <button
                          type="button"
                          onClick={() => handleCopy(dev.macAddress)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={`Salin MAC ${dev.macAddress}`}
                        >
                          {copiedMac === dev.macAddress
                            ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                            : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{dev.localIp}:{dev.port}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {dev.hostnameRaw || '-'}
                    </TableCell>
                    <TableCell>
                      {isStreaming ? (
                        <Badge variant="outline" className="gap-1.5 px-1.5 text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 motion-safe:animate-pulse" />Streaming
                        </Badge>
                      ) : isOnline ? (
                        <Badge variant="outline" className="gap-1.5 px-1.5 text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Online
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1.5 px-1.5 text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />Offline
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeTime(dev.lastSeen)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          className="border-muted-foreground/40 dark:border-muted-foreground/40"
                          aria-label={`Edit ${dev.label}`}
                          onClick={() => {
                            setEditingDevice(dev);
                            setEditLabel(dev.label);
                            setEditSeatNumber(dev.seatNumber);
                            setEditRoomId(dev.roomId);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Hapus ${dev.label}`}
                          onClick={() => setDeletingDevice(dev)}
                          className="border-muted-foreground/40 text-destructive hover:bg-destructive/10 hover:text-destructive dark:border-muted-foreground/40 dark:hover:bg-destructive/20"
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

      {/* Edit Dialog */}
      <Dialog open={Boolean(editingDevice)} onOpenChange={(open) => !open && setEditingDevice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Informasi Perangkat</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-label">Label Meja</Label>
              <Input id="edit-label" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-seat">Nomor Kursi Fisik</Label>
              <Input
                id="edit-seat"
                type="number"
                min={1}
                max={100}
                value={editSeatNumber}
                onChange={(e) => setEditSeatNumber(Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-room">Ruangan Lab</Label>
              <Select value={editRoomId} onValueChange={setEditRoomId}>
                <SelectTrigger id="edit-room" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border bg-muted/40 p-2.5 font-mono text-xs text-muted-foreground">
              MAC terikat: {editingDevice?.macAddress}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingDevice(null)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting}>Simpan Perubahan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={Boolean(deletingDevice)} onOpenChange={(open) => !open && setDeletingDevice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pemetaan Hardware?</AlertDialogTitle>
            <AlertDialogDescription>
              Ini akan melepas kuncian MAC address <strong>{deletingDevice?.macAddress}</strong> dari{' '}
              <strong>{deletingDevice?.label}</strong>. Gunakan ini jika PC telah dipindahkan atau diganti secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubmit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus Pemetaan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
