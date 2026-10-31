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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Monitor,
  RefreshCw,
  Search,
  Copy,
  Edit2,
  Trash2,
  Tv,
  Check,
  HardDrive,
  Wifi,
  WifiOff,
} from 'lucide-react';

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

  // Edit Modal State
  const [editingDevice, setEditingDevice] = React.useState<DeviceItem | null>(null);
  const [editLabel, setEditLabel] = React.useState('');
  const [editSeatNumber, setEditSeatNumber] = React.useState(1);
  const [editRoomId, setEditRoomId] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Delete Modal State
  const [deletingDevice, setDeletingDevice] = React.useState<DeviceItem | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      const [devRes, roomsRes] = await Promise.all([
        fetch('/api/iwan/devices'),
        fetch('/api/iwan/rooms'),
      ]);
      const devJson = await devRes.json();
      const roomsJson = await roomsRes.json();

      if (devJson.ok && Array.isArray(devJson.data)) {
        setDevices(devJson.data);
      }
      if (roomsJson.ok && Array.isArray(roomsJson.data)) {
        setRooms(roomsJson.data);
      }
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

  // Handle Edit Submit
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDevice) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/iwan/devices/${editingDevice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: editLabel.trim(),
          seatNumber: Number(editSeatNumber),
          roomId: editRoomId,
        }),
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
      toast.error('Terjadi kesalahan saat memperbarui');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Delete Submit
  async function handleDeleteSubmit() {
    if (!deletingDevice) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/iwan/devices/${deletingDevice.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(`Kuncian hardware ${deletingDevice.label} berhasil dihapus`);
        setDeletingDevice(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Gagal menghapus kuncian perangkat');
      }
    } catch {
      toast.error('Terjadi kesalahan saat menghapus');
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

  // Filtering
  const filteredDevices = devices.filter((d) => {
    if (selectedRoomFilter !== 'ALL' && d.roomId !== selectedRoomFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchLabel = d.label.toLowerCase().includes(q);
      const matchMac = d.macAddress.toLowerCase().includes(q);
      const matchIp = d.localIp.toLowerCase().includes(q);
      const matchHost = (d.hostnameRaw || '').toLowerCase().includes(q);
      const matchRoom = d.roomName.toLowerCase().includes(q);
      return matchLabel || matchMac || matchIp || matchHost || matchRoom;
    }
    return true;
  });

  const totalCount = devices.length;
  const onlineCount = devices.filter((d) => d.computedStatus !== 'offline').length;
  const offlineCount = totalCount - onlineCount;

  return (
    <div className="container mx-auto max-w-7xl py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HardDrive className="h-6 w-6 text-primary" />
            Daftar PC Lab & Pemetaan Hardware
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Data pemetaan permanen antara nomor meja fisik dan MAC Address PC praktikan.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Segarkan Data
        </Button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total PC Terdaftar</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono">{totalCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Wifi className="h-3.5 w-3.5" />
              Perangkat Online (Aktif)
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {onlineCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1.5 text-zinc-500">
              <WifiOff className="h-3.5 w-3.5" />
              Perangkat Offline
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-zinc-500">
              {offlineCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari label, nomor kursi, MAC address, IP, atau hostname..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={selectedRoomFilter} onValueChange={setSelectedRoomFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Pilih Ruangan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Ruangan</SelectItem>
            {rooms.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table Card */}
      <Card className="border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-24">Nomor</TableHead>
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
                  <TableRow key={dev.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-mono font-bold text-xs">
                      #{dev.seatNumber}
                    </TableCell>
                    <TableCell className="font-semibold text-sm">
                      {dev.label}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {dev.roomName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-mono text-xs text-foreground bg-muted/60 px-2 py-0.5 rounded border max-w-fit">
                        <span>{dev.macAddress}</span>
                        <button
                          onClick={() => handleCopy(dev.macAddress)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Salin MAC Address"
                        >
                          {copiedMac === dev.macAddress ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {dev.localIp}:{dev.port}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {dev.hostnameRaw || '-'}
                    </TableCell>
                    <TableCell>
                      {isStreaming ? (
                        <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[11px] gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          Streaming
                        </Badge>
                      ) : isOnline ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[11px] gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Online
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[11px] text-zinc-500 gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                          Offline
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatRelativeTime(dev.lastSeen)}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditingDevice(dev);
                          setEditLabel(dev.label);
                          setEditSeatNumber(dev.seatNumber);
                          setEditRoomId(dev.roomId);
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => setDeletingDevice(dev)}
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

      {/* Edit Device Modal */}
      <Dialog open={Boolean(editingDevice)} onOpenChange={(open) => !open && setEditingDevice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Informasi Perangkat</DialogTitle>
            <DialogDescription>
              Ubah label meja atau pindahkan nomor kursi fisik PC lab ini.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-label">Label Meja</Label>
              <Input
                id="edit-label"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                required
              />
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
                <SelectTrigger id="edit-room">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-2 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded border font-mono">
              MAC Address terikat: {editingDevice?.macAddress}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingDevice(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete / Unbind Confirmation Dialog */}
      <Dialog open={Boolean(deletingDevice)} onOpenChange={(open) => !open && setDeletingDevice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Pemetaan Hardware PC?</DialogTitle>
            <DialogDescription>
              Tindakan ini akan melepaskan kuncian MAC address <strong>{deletingDevice?.macAddress}</strong> dari <strong>{deletingDevice?.label}</strong>. Gunakan ini jika PC telah dipindahkan atau diganti secara permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeletingDevice(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteSubmit} disabled={isSubmitting}>
              Hapus Pemetaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

