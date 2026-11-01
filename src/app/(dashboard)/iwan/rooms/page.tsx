'use client';

import * as React from 'react';
import { useIwanPolling } from '@/hooks/useIwanPolling';
import { fetchIwanData } from '@/lib/iwanPolling';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, RefreshCw, KeyRound, Lock, Radio, Clock, Copy, Trash2, Pencil } from 'lucide-react';

interface Room {
  id: string;
  name: string;
  capacity: number;
  description: string | null;
  totalDevices: number;
  onlineDevices: number;
}

interface PairSession {
  code: string;
  room_id: string;
  expires_at: string;
  created_at: string;
}

interface RoomDevice {
  id: string;
  label: string;
  seatNumber: number;
  macAddress: string;
  localIp: string;
  computedStatus: 'online' | 'offline' | 'streaming';
  lastSeen: string;
}

export default function IwanRoomsPage() {
  const [rooms, setRooms] = React.useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = React.useState<string>('');
  const [activeSession, setActiveSession] = React.useState<PairSession | null>(null);
  const [devices, setDevices] = React.useState<RoomDevice[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSessionLoading, setIsSessionLoading] = React.useState(false);
  const [autoRefresh, setAutoRefresh] = React.useState(false);

  const [isCreateRoomOpen, setIsCreateRoomOpen] = React.useState(false);
  const [newRoomName, setNewRoomName] = React.useState('');
  const [newRoomCapacity, setNewRoomCapacity] = React.useState(40);
  const [newRoomDescription, setNewRoomDescription] = React.useState('');

  const [isNewSessionOpen, setIsNewSessionOpen] = React.useState(false);
  const [sessionDuration, setSessionDuration] = React.useState('120');

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isDeletingRoom, setIsDeletingRoom] = React.useState(false);

  const [isEditRoomOpen, setIsEditRoomOpen] = React.useState(false);
  const [editRoomName, setEditRoomName] = React.useState('');
  const [editRoomCapacity, setEditRoomCapacity] = React.useState(40);
  const [editRoomDescription, setEditRoomDescription] = React.useState('');
  const [isSavingRoom, setIsSavingRoom] = React.useState(false);

  const fetchRooms = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await fetchIwanData<Room[]>('/api/iwan/rooms', signal);
      if (signal?.aborted) return;
      setRooms(data);
      setSelectedRoomId((current) => data.some((room) => room.id === current) ? current : data[0]?.id || '');
    } catch {
      if (!signal?.aborted) toast.error('Gagal memuat daftar ruangan');
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  const detailsRequest = React.useRef<AbortController | null>(null);
  const fetchRoomDetails = React.useCallback(async (roomId: string, signal?: AbortSignal) => {
    if (!roomId) return;
    detailsRequest.current?.abort();
    const controller = new AbortController();
    detailsRequest.current = controller;
    const requestSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
    try {
      const data = await fetchIwanData<{ session: PairSession | null; devices: RoomDevice[] }>(
        `/api/iwan/rooms/${roomId}/snapshot`, requestSignal,
      );
      if (!requestSignal.aborted) {
        setActiveSession(data.session);
        setDevices(data.devices);
      }
    } catch (error) {
      if (!requestSignal.aborted) throw error;
    } finally {
      if (detailsRequest.current === controller) detailsRequest.current = null;
    }
  }, []);

  useIwanPolling(fetchRooms, 0, 'Gagal memuat daftar ruangan');

  const pollRoom = React.useCallback(
    (signal: AbortSignal) => fetchRoomDetails(selectedRoomId, signal),
    [selectedRoomId, fetchRoomDetails],
  );
  const pollRoomIfIdle = React.useCallback(
    (signal: AbortSignal) => detailsRequest.current ? Promise.resolve() : pollRoom(signal),
    [pollRoom],
  );
  useIwanPolling(pollRoom, 0, 'Gagal memperbarui status ruangan', Boolean(selectedRoomId));
  useIwanPolling(pollRoomIfIdle, 5000, 'Gagal memperbarui status ruangan', Boolean(selectedRoomId) && autoRefresh, false);
  React.useEffect(() => () => detailsRequest.current?.abort(), []);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoomName.trim()) return toast.error('Nama ruangan tidak boleh kosong');
    try {
      const res = await fetch('/api/iwan/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoomName.trim(),
          capacity: Number(newRoomCapacity),
          description: newRoomDescription.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(`Ruangan ${newRoomName} berhasil dibuat`);
        setIsCreateRoomOpen(false);
        setNewRoomName('');
        setNewRoomDescription('');
        await fetchRooms();
        if (json.data?.id) setSelectedRoomId(json.data.id);
      } else {
        toast.error(json.error || 'Gagal membuat ruangan');
      }
    } catch {
      toast.error('Terjadi kesalahan saat membuat ruangan');
    }
  }

  async function handleStartSession() {
    if (!selectedRoomId) return;
    setIsSessionLoading(true);
    try {
      const res = await fetch(`/api/iwan/rooms/${selectedRoomId}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes: Number(sessionDuration) }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(`Sesi pairing dibuka dengan kode: ${json.data.code}`);
        setIsNewSessionOpen(false);
        await fetchRoomDetails(selectedRoomId);
      } else {
        toast.error(json.error || 'Gagal membuka sesi pairing');
      }
    } catch {
      toast.error('Gagal membuka sesi pairing');
    } finally {
      setIsSessionLoading(false);
    }
  }

  async function handleCloseSession() {
    if (!activeSession) return;
    try {
      const res = await fetch('/api/iwan/session/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: activeSession.code }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success('Sesi pairing berhasil ditutup');
        setActiveSession(null);
        await fetchRoomDetails(selectedRoomId);
      } else {
        toast.error(json.error || 'Gagal menutup sesi');
      }
    } catch {
      toast.error('Gagal menutup sesi pairing');
    }
  }

  function openEditDialog() {
    if (!selectedRoom) return;
    setEditRoomName(selectedRoom.name);
    setEditRoomCapacity(selectedRoom.capacity);
    setEditRoomDescription(selectedRoom.description || '');
    setIsEditRoomOpen(true);
  }

  async function handleUpdateRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRoom) return;
    if (!editRoomName.trim()) return toast.error('Nama ruangan tidak boleh kosong');
    if (!editRoomCapacity || editRoomCapacity < 1) return toast.error('Kapasitas kursi minimal 1');

    setIsSavingRoom(true);
    try {
      const res = await fetch(`/api/iwan/rooms/${selectedRoom.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editRoomName.trim(),
          capacity: Number(editRoomCapacity),
          description: editRoomDescription.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(`Ruangan ${editRoomName} berhasil diperbarui`);
        setIsEditRoomOpen(false);
        await fetchRooms();
        await fetchRoomDetails(selectedRoom.id);
      } else {
        toast.error(json.error || 'Gagal memperbarui ruangan');
      }
    } catch {
      toast.error('Terjadi kesalahan saat memperbarui ruangan');
    } finally {
      setIsSavingRoom(false);
    }
  }

  async function handleDeleteRoom() {
    if (!selectedRoom) return;
    setIsDeletingRoom(true);
    try {
      const res = await fetch(`/api/iwan/rooms/${selectedRoom.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(`Ruangan ${selectedRoom.name} berhasil dihapus`);
        setIsDeleteDialogOpen(false);
        const remaining = rooms.filter((r) => r.id !== selectedRoom.id);
        setSelectedRoomId(remaining.length > 0 ? remaining[0].id : '');
        await fetchRooms();
      } else {
        toast.error(json.error || 'Gagal menghapus ruangan');
      }
    } catch {
      toast.error('Terjadi kesalahan saat menghapus ruangan');
    } finally {
      setIsDeletingRoom(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Kode pairing disalin');
  }

  const capacity = selectedRoom?.capacity || 40;
  const claimedDeviceMap = new Map<number, RoomDevice>();
  devices.forEach((d) => claimedDeviceMap.set(d.seatNumber, d));

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">Ruangan &amp; Sesi Pairing</h1>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={autoRefresh ? 'secondary' : 'outline'}
            size="sm"
            aria-label="Pembaruan otomatis status ruangan"
            aria-pressed={autoRefresh}
            onClick={() => setAutoRefresh((current) => !current)}
          >
            Otomatis: {autoRefresh ? 'ON (5 dtk)' : 'OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void fetchRooms();
              if (selectedRoomId) void fetchRoomDetails(selectedRoomId).catch(() => toast.error('Gagal memperbarui status ruangan'));
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Segarkan
          </Button>

          <Dialog open={isCreateRoomOpen} onOpenChange={setIsCreateRoomOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Tambah Ruangan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Ruangan Lab</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateRoom} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="room-name">Nama Ruangan</Label>
                  <Input
                    id="room-name"
                    placeholder="Contoh: TULT 0618"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="room-cap">Kapasitas Kursi Fisik</Label>
                  <Input
                    id="room-cap"
                    type="number"
                    min={1}
                    max={100}
                    value={newRoomCapacity}
                    onChange={(e) => setNewRoomCapacity(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="room-desc">Keterangan (Opsional)</Label>
                  <Input
                    id="room-desc"
                    placeholder="Contoh: Lab Komputer Gedung TULT Lt. 6"
                    value={newRoomDescription}
                    onChange={(e) => setNewRoomDescription(e.target.value)}
                  />
                </div>
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateRoomOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit">Simpan</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pemilih ruangan */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6 border-b pb-4">
        {isLoading ? (
          <span className="text-sm text-muted-foreground">Memuat...</span>
        ) : rooms.length === 0 ? (
          <span className="text-sm text-muted-foreground">Belum ada ruangan.</span>
        ) : (
          <Tabs value={selectedRoomId} onValueChange={setSelectedRoomId} className="min-w-0">
            <TabsList className="h-auto flex-wrap justify-start">
              {rooms.map((room) => (
                <TabsTrigger key={room.id} value={room.id} className="gap-2">
                  {room.name}
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-semibold tabular-nums">
                    {room.onlineDevices}/{room.totalDevices}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {selectedRoom && (
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={openEditDialog}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5 h-8"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus
            </Button>
          </div>
        )}
      </div>

      {selectedRoom ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sesi Pairing */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="gap-4 py-5">
              <CardHeader className="px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    Sesi Pairing Aktif
                  </CardTitle>
                  <Badge variant={activeSession ? 'default' : 'secondary'}>
                    {activeSession ? 'Sesi Terbuka' : 'Terkunci'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-5">
              {activeSession ? (
                <div className="space-y-4">
                  <div className="bg-muted/40 border border-dashed rounded-lg p-5 text-center relative">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Kode Pairing
                    </p>
                    <div className="font-mono text-4xl font-black tracking-[0.3em] text-primary select-all">
                      {activeSession.code}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      Kadaluarsa pukul {new Date(activeSession.expires_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 text-muted-foreground"
                      onClick={() => copyToClipboard(activeSession.code)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <Button variant="destructive" size="sm" className="w-full" onClick={handleCloseSession}>
                    <Lock className="h-4 w-4 mr-1.5" />
                    Kunci &amp; Selesaikan Sesi
                  </Button>
                </div>
              ) : (
                <div className="py-4 text-center space-y-3">
                  <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Lock className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium">Tidak ada sesi aktif</p>

                  <Dialog open={isNewSessionOpen} onOpenChange={setIsNewSessionOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="w-full gap-2">
                        <Radio className="h-4 w-4" />
                        Buka Sesi Pairing Baru
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Buka Sesi Pairing: {selectedRoom.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="session-ttl">Durasi Sesi</Label>
                          <Select value={sessionDuration} onValueChange={setSessionDuration}>
                            <SelectTrigger id="session-ttl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="60">1 Jam</SelectItem>
                              <SelectItem value="120">2 Jam (Standar)</SelectItem>
                              <SelectItem value="240">4 Jam</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewSessionOpen(false)}>Batal</Button>
                        <Button onClick={handleStartSession} disabled={isSessionLoading}>
                          Generate Kode 6 Digit
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
              </CardContent>
            </Card>

            {/* Statistik Ruangan */}
            <Card className="gap-3 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-sm">Statistik Ruangan</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Nama Lab', value: selectedRoom.name },
                  { label: 'Kapasitas Fisik', value: `${selectedRoom.capacity} meja` },
                  { label: 'PC Terdaftar', value: `${devices.length} perangkat` },
                  {
                    label: 'PC Online',
                    value: `${devices.filter((d) => d.computedStatus !== 'offline').length} perangkat`,
                    highlight: true,
                  },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between py-1 border-b last:border-0">
                    <span className="text-muted-foreground text-xs">{row.label}</span>
                    <span className={`text-xs font-semibold font-mono ${row.highlight ? 'text-emerald-500' : ''}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
              </CardContent>
            </Card>
          </div>

          {/* Denah Kursi */}
          <div className="lg:col-span-2">
            <Card className="gap-4 py-5">
              <CardHeader className="px-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <CardTitle>Denah Kursi {selectedRoom.name}</CardTitle>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Online</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-zinc-400" />Offline</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full border border-dashed border-zinc-400" />Kosong</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5">
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10 gap-2">
                {Array.from({ length: capacity }, (_, i) => i + 1).map((seatNum) => {
                  const dev = claimedDeviceMap.get(seatNum);
                  const isClaimed = Boolean(dev);
                  const isOnline = dev && dev.computedStatus !== 'offline';
                  const isStreaming = dev && dev.computedStatus === 'streaming';

                  return (
                    <div
                      key={seatNum}
                      className={`rounded-md p-2 text-center flex flex-col items-center justify-center transition-colors ${
                        !isClaimed
                          ? 'border border-dashed border-zinc-300 dark:border-zinc-800 text-muted-foreground'
                          : isStreaming
                          ? 'border border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : isOnline
                          ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border border-zinc-300 dark:border-zinc-700 bg-muted/30 text-zinc-500'
                      }`}
                    >
                      <span className="text-[11px] font-mono font-bold">
                        {seatNum < 10 ? `0${seatNum}` : seatNum}
                      </span>
                      <span className="text-[9px] truncate max-w-full mt-0.5">
                        {dev ? dev.label : 'Kosong'}
                      </span>
                      {isClaimed && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                            isStreaming ? 'bg-blue-500 animate-pulse' : isOnline ? 'bg-emerald-500' : 'bg-zinc-400'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        !isLoading && (
          <p className="text-muted-foreground text-sm text-center py-16">
            Belum ada ruangan lab yang terdaftar.
          </p>
        )
      )}

      {/* Dialog Hapus Ruangan */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Ruangan {selectedRoom?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Menghapus ruangan ini akan menghapus seluruh data pemetaan PC fisik ({devices.length} perangkat terdaftar) serta riwayat sesi pairing di ruangan ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingRoom}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRoom}
              disabled={isDeletingRoom}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingRoom ? 'Menghapus...' : 'Ya, Hapus Ruangan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Edit Ruangan & Kapasitas */}
      <Dialog open={isEditRoomOpen} onOpenChange={setIsEditRoomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ruangan &amp; Kapasitas Kursi</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateRoom} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-room-name">Nama Ruangan</Label>
              <Input
                id="edit-room-name"
                value={editRoomName}
                onChange={(e) => setEditRoomName(e.target.value)}
                placeholder="Contoh: TULT 0618"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-room-cap">Kapasitas Jumlah Kursi Fisik</Label>
              <Input
                id="edit-room-cap"
                type="number"
                min={1}
                max={100}
                value={editRoomCapacity}
                onChange={(e) => setEditRoomCapacity(Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-room-desc">Keterangan (Opsional)</Label>
              <Input
                id="edit-room-desc"
                value={editRoomDescription}
                onChange={(e) => setEditRoomDescription(e.target.value)}
                placeholder="Contoh: Lab Komputer Gedung TULT Lt. 6"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditRoomOpen(false)} disabled={isSavingRoom}>
                Batal
              </Button>
              <Button type="submit" disabled={isSavingRoom}>
                {isSavingRoom ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
