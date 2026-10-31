'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { RefreshCw, Search, Copy, Edit2, Trash2, Check, HardDrive } from 'lucide-react';

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
  const [copiedMac, setCopiedMac] = React.useState<string | null>(null);

  const [editingDevice, setEditingDevice] = React.useState<DeviceItem | null>(null);
  const [editLabel, setEditLabel] = React.useState('');
  const [editSeatNumber, setEditSeatNumber] = React.useState(1);
  const [editRoomId, setEditRoomId] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [deletingDevice, setDeletingDevice] = React.useState<DeviceItem | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      const [devRes, roomsRes] = await Promise.all([
        fetch('/api/iwan/devices'),
        fetch('/api/iwan/rooms'),
      ]);
      const devJson = await devRes.json();
      const roomsJson = await roomsRes.json();
      if (devJson.ok && Array.isArray(devJson.data)) setDevices(devJson.data);
      if (roomsJson.ok && Array.isArray(roomsJson.data)) setRooms(roomsJson.data);
    } catch {
      toast.error('Gagal memuat data perangkat');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

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
    const diffSeconds = Math.round((Date.now() - new Date(dateStr).getTime()) / 1000);
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
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">Pemetaan MAC &amp; PC Lab</h1>
          <p className="text-sm 2xl:text-base text-muted-foreground mt-1">
            Pemetaan permanen antara nomor meja fisik dan MAC Address PC praktikan.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Segarkan
        </Button>
      </div>

      {/* Stat Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total PC Terdaftar', value: totalCount, color: '' },
          { label: 'Online', value: onlineCount, color: 'text-emerald-500' },
          { label: 'Offline', value: totalCount - onlineCount, color: 'text-muted-foreground' },
        ].map((s) => (
          <div key={s.label} className="card glass p-4 border border-border/50">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari label, MAC address, IP, hostname..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedRoomFilter} onValueChange={setSelectedRoomFilter}>
          <SelectTrigger className="w-full sm:w-52">
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

      {/* Table */}
      <div className="card glass border border-border/50 overflow-hidden">
        <div className="rounded-md border overflow-hidden">
          <Table className="2xl:text-base">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Label PC</TableHead>
                <TableHead>Ruangan</TableHead>
                <TableHead>MAC Address</TableHead>
                <TableHead>IP LAN Terkini</TableHead>
                <TableHead>Hostname Windows</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detak Terakhir</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDevices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground py-12">
                    {isLoading ? 'Memuat data perangkat...' : 'Tidak ada perangkat yang sesuai.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDevices.map((dev) => {
                  const isOnline = dev.computedStatus !== 'offline';
                  const isStreaming = dev.computedStatus === 'streaming';
                  return (
                    <TableRow key={dev.id}>
                      <TableCell className="font-mono font-bold text-xs">#{dev.seatNumber}</TableCell>
                      <TableCell className="font-semibold">{dev.label}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{dev.roomName}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono text-xs bg-muted/60 px-2 py-0.5 rounded border max-w-fit">
                          {dev.macAddress}
                          <button
                            onClick={() => handleCopy(dev.macAddress)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copiedMac === dev.macAddress
                              ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                              : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{dev.localIp}:{dev.port}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {dev.hostnameRaw || '-'}
                      </TableCell>
                      <TableCell>
                        {isStreaming ? (
                          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[11px] gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />Streaming
                          </Badge>
                        ) : isOnline ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Online
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[11px] text-muted-foreground gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />Offline
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatRelativeTime(dev.lastSeen)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
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
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingDevice(dev)}
                            className="text-destructive hover:text-destructive"
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
      </div>

      {/* Edit Dialog */}
      <Dialog open={Boolean(editingDevice)} onOpenChange={(open) => !open && setEditingDevice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Informasi Perangkat</DialogTitle>
            <DialogDescription>
              Ubah label atau nomor kursi fisik PC lab ini.
            </DialogDescription>
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
                <SelectTrigger id="edit-room"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded border font-mono">
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
