'use client';

import * as React from 'react';
import { useIwanPolling } from '@/hooks/useIwanPolling';
import { fetchIwanData } from '@/lib/iwanPolling';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Clock, Copy, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';

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

const DEVICE_STATUS_LABEL: Record<RoomDevice['computedStatus'], string> = {
  online: 'Online',
  offline: 'Offline',
  streaming: 'Streaming',
};

function seatTone(dev: RoomDevice | undefined) {
  if (!dev) return 'border-dashed text-muted-foreground';
  if (dev.computedStatus === 'streaming') {
    return 'border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400';
  }
  if (dev.computedStatus === 'online') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  }
  return 'text-muted-foreground';
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
  const onlineDeviceCount = devices.filter((d) => d.computedStatus !== 'offline').length;

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight 2xl:text-3xl">Ruangan &amp; Sesi</h1>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <Label htmlFor="auto-refresh" className="text-sm font-normal">
              Otomatis{autoRefresh ? ' (5 dtk)' : ''}
            </Label>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void fetchRooms();
              if (selectedRoomId) void fetchRoomDetails(selectedRoomId).catch(() => toast.error('Gagal memperbarui status ruangan'));
            }}
          >
            <RefreshCw />
            Segarkan
          </Button>

          <Dialog open={isCreateRoomOpen} onOpenChange={setIsCreateRoomOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus />
                Tambah Ruangan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Ruangan</DialogTitle>
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
                  <Label htmlFor="room-cap">Jumlah Kursi</Label>
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

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
          <div className="space-y-4">
            <Skeleton className="h-52 rounded-md" />
            <Skeleton className="h-36 rounded-md" />
          </div>
          <Skeleton className="h-96 rounded-md" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">Belum ada ruangan lab yang terdaftar.</p>
          <Button size="sm" onClick={() => setIsCreateRoomOpen(true)}>
            <Plus />
            Tambah Ruangan
          </Button>
        </div>
      ) : (
        <>
          {/* Pemilih ruangan */}
          <div className="mb-6 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
            <ToggleGroup
              type="single"
              value={selectedRoomId}
              onValueChange={(value) => {
                if (value) setSelectedRoomId(value);
              }}
              variant="outline"
              aria-label="Pilih ruangan"
              className="max-w-full flex-wrap justify-start *:data-[slot=toggle-group-item]:px-4!"
            >
              {rooms.map((room) => (
                <ToggleGroupItem key={room.id} value={room.id} className="gap-2">
                  {room.name}
                  <Badge variant="outline" className="px-1.5 text-muted-foreground tabular-nums">
                    {room.onlineDevices}/{room.totalDevices}
                  </Badge>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            {selectedRoom && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon-sm" aria-label={`Aksi untuk ${selectedRoom.name}`}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onSelect={() => openEditDialog()}>
                    <Pencil />
                    Edit ruangan
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => setIsDeleteDialogOpen(true)}>
                    <Trash2 />
                    Hapus ruangan
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {selectedRoom && (
            <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
              <div className="space-y-4">
                {/* Sesi pairing */}
                <Card className="gap-4 rounded-md bg-transparent py-4 shadow-none">
                  <CardHeader className="px-4">
                    <CardTitle className="text-base">Sesi pairing</CardTitle>
                    <CardAction>
                      {activeSession ? (
                        <Badge variant="outline" className="gap-1.5 px-1.5 text-muted-foreground">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          Terbuka
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1.5 px-1.5 text-muted-foreground">
                          <span className="size-1.5 rounded-full bg-zinc-400" />
                          Tertutup
                        </Badge>
                      )}
                    </CardAction>
                  </CardHeader>
                  <CardContent className="px-4">
                    {activeSession ? (
                      <div className="space-y-4">
                        <div className="rounded-md border p-4 text-center">
                          <p className="text-xs text-muted-foreground">Kode pairing</p>
                          <p className="mt-1 select-all font-mono text-3xl font-semibold tracking-[0.3em]">
                            {activeSession.code}
                          </p>
                          <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3" />
                            Berakhir pukul{' '}
                            {new Date(activeSession.expires_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" size="sm" onClick={() => copyToClipboard(activeSession.code)}>
                            <Copy />
                            Salin kode
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleCloseSession}>
                            Tutup sesi
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 py-2 text-center">
                        <p className="text-sm text-muted-foreground">Belum ada sesi aktif.</p>
                        <Dialog open={isNewSessionOpen} onOpenChange={setIsNewSessionOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm">Buka sesi</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Buka sesi pairing</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                              <div className="space-y-1.5">
                                <Label htmlFor="session-ttl">Durasi</Label>
                                <Select value={sessionDuration} onValueChange={setSessionDuration}>
                                  <SelectTrigger id="session-ttl" className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="60">1 jam</SelectItem>
                                    <SelectItem value="120">2 jam (standar)</SelectItem>
                                    <SelectItem value="240">4 jam</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsNewSessionOpen(false)}>Batal</Button>
                              <Button onClick={handleStartSession} disabled={isSessionLoading}>
                                Buat kode
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Statistik */}
                <Card className="gap-4 rounded-md bg-transparent py-4 shadow-none">
                  <CardHeader className="px-4">
                    <CardTitle className="text-base">Statistik</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4">
                    <dl className="divide-y text-sm">
                      <div className="flex items-center justify-between py-2">
                        <dt className="text-muted-foreground">Kursi</dt>
                        <dd className="font-medium tabular-nums">{selectedRoom.capacity}</dd>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <dt className="text-muted-foreground">PC terdaftar</dt>
                        <dd className="font-medium tabular-nums">{devices.length}</dd>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <dt className="text-muted-foreground">PC online</dt>
                        <dd className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                          {onlineDeviceCount}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              </div>

              {/* Denah kursi */}
              <Card className="gap-4 rounded-md bg-transparent py-4 shadow-none">
                <CardHeader className="px-4">
                  <CardTitle className="text-base">Denah kursi</CardTitle>
                  <CardDescription>
                    {selectedRoom.name} · {capacity} kursi
                  </CardDescription>
                  <CardAction>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-emerald-500" />
                        Online
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-zinc-400" />
                        Offline
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full border border-dashed border-muted-foreground" />
                        Kosong
                      </span>
                    </div>
                  </CardAction>
                </CardHeader>
                <CardContent className="px-4">
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10">
                    {Array.from({ length: capacity }, (_, i) => i + 1).map((seatNum) => {
                      const dev = claimedDeviceMap.get(seatNum);
                      const tile = (
                        <div
                          className={`flex min-w-0 flex-col items-center gap-0.5 rounded-md border px-1.5 py-2 text-center ${seatTone(dev)}`}
                        >
                          <span className="text-xs font-medium tabular-nums">
                            {String(seatNum).padStart(2, '0')}
                          </span>
                          <span className="w-full truncate text-[11px]">{dev ? dev.label : 'Kosong'}</span>
                        </div>
                      );

                      if (!dev) return <div key={seatNum}>{tile}</div>;

                      return (
                        <Tooltip key={seatNum}>
                          <TooltipTrigger asChild>{tile}</TooltipTrigger>
                          <TooltipContent>
                            {dev.label} · {DEVICE_STATUS_LABEL[dev.computedStatus]} · {dev.macAddress} · {dev.localIp}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Dialog Hapus Ruangan */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus ruangan {selectedRoom?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Seluruh pemetaan PC ({devices.length} perangkat) dan riwayat sesi pairing di ruangan ini ikut dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingRoom}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRoom}
              disabled={isDeletingRoom}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingRoom ? 'Menghapus...' : 'Ya, hapus ruangan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Edit Ruangan */}
      <Dialog open={isEditRoomOpen} onOpenChange={setIsEditRoomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit ruangan</DialogTitle>
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
              <Label htmlFor="edit-room-cap">Jumlah Kursi</Label>
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
                {isSavingRoom ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
