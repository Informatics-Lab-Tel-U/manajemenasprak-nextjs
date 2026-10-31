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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Plus,
  RefreshCw,
  KeyRound,
  Lock,
  Radio,
  Tv,
  CheckCircle2,
  Clock,
  Trash2,
  Copy,
} from 'lucide-react';

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

  // Modal State
  const [isCreateRoomOpen, setIsCreateRoomOpen] = React.useState(false);
  const [newRoomName, setNewRoomName] = React.useState('');
  const [newRoomCapacity, setNewRoomCapacity] = React.useState(40);
  const [newRoomDescription, setNewRoomDescription] = React.useState('');

  const [isNewSessionOpen, setIsNewSessionOpen] = React.useState(false);
  const [sessionDuration, setSessionDuration] = React.useState('120');

  // Load Rooms
  const fetchRooms = React.useCallback(async () => {
    try {
      const res = await fetch('/api/iwan/rooms');
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setRooms(json.data);
        if (!selectedRoomId && json.data.length > 0) {
          setSelectedRoomId(json.data[0].id);
        }
      }
    } catch {
      toast.error('Gagal memuat daftar ruangan');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRoomId]);

  // Load Room Details: Session & Devices
  const fetchRoomDetails = React.useCallback(async (roomId: string) => {
    if (!roomId) return;
    try {
      const [sessRes, devRes] = await Promise.all([
        fetch(`/api/iwan/rooms/${roomId}/session`),
        fetch(`/api/iwan/devices?roomId=${roomId}`),
      ]);
      const sessJson = await sessRes.json();
      const devJson = await devRes.json();

      setActiveSession(sessJson.ok && sessJson.data ? sessJson.data : null);
      setDevices(devJson.ok && Array.isArray(devJson.data) ? devJson.data : []);
    } catch {
      toast.error('Gagal memperbarui status ruangan');
    }
  }, []);

  React.useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  React.useEffect(() => {
    if (selectedRoomId) {
      fetchRoomDetails(selectedRoomId);
      const timer = setInterval(() => {
        fetchRoomDetails(selectedRoomId);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [selectedRoomId, fetchRoomDetails]);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  // Handle Room Creation
  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoomName.trim()) {
      toast.error('Nama ruangan tidak boleh kosong');
      return;
    }
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

  // Handle Start Pairing Session
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

  // Handle Close Session
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

  // Copy code helper
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Kode pairing disalin ke clipboard');
  }

  const capacity = selectedRoom?.capacity || 40;
  const claimedDeviceMap = new Map<number, RoomDevice>();
  devices.forEach((d) => {
    claimedDeviceMap.set(d.seatNumber, d);
  });

  return (
    <div className="container mx-auto max-w-7xl py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Tv className="h-6 w-6 text-primary" />
            Manajemen Ruangan & Sesi Pairing
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Buka sesi pairing untuk PC praktikan dan pantau ketersediaan kursi secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchRooms();
              if (selectedRoomId) fetchRoomDetails(selectedRoomId);
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
                <DialogTitle>Tambah Ruangan Lab Baru</DialogTitle>
                <DialogDescription>
                  Daftarkan ruangan laboratorium komputer baru untuk monitoring IWAN.
                </DialogDescription>
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
                  <Button type="submit">Simpan Ruangan</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Room Selector Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-4">
        <span className="text-sm font-medium text-muted-foreground mr-1">Pilih Lab:</span>
        {rooms.map((room) => (
          <Button
            key={room.id}
            variant={selectedRoomId === room.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedRoomId(room.id)}
            className="rounded-full"
          >
            {room.name}
            <span
              className={`ml-2 text-xs px-1.5 py-0.2 rounded-full ${
                selectedRoomId === room.id
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {room.onlineDevices}/{room.totalDevices}
            </span>
          </Button>
        ))}
      </div>

      {/* Main Content Grid */}
      {selectedRoom ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sesi Pairing Card */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    Sesi Pairing Aktif
                  </CardTitle>
                  <Badge variant={activeSession ? 'default' : 'secondary'}>
                    {activeSession ? 'Sesi Terbuka' : 'Sesi Terkunci'}
                  </Badge>
                </div>
                <CardDescription>
                  Kode verifikasi 6-digit untuk aslab yang sedang menginstall IWAN User di PC meja praktikan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeSession ? (
                  <div className="space-y-4">
                    <div className="bg-primary/5 border-2 border-dashed border-primary/40 rounded-xl p-5 text-center relative group">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Kode Pairing 6 Digit
                      </p>
                      <div className="font-mono text-4xl font-black tracking-[0.3em] text-primary select-all">
                        {activeSession.code}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3" />
                        Kadaluarsa: {new Date(activeSession.expires_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => copyToClipboard(activeSession.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border">
                      <p className="font-semibold text-foreground">Petunjuk Lapangan:</p>
                      <ol className="list-decimal pl-4 space-y-1">
                        <li>Buka aplikasi <strong>IWAN User</strong> di setiap PC praktikan.</li>
                        <li>Masukkan 6 digit kode di atas: <code className="font-mono font-bold text-foreground">{activeSession.code}</code></li>
                        <li>Pilih nomor kursi PC tersebut di layar. Identitas hardware (MAC) akan terkunci otomatis.</li>
                      </ol>
                    </div>

                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={handleCloseSession}
                    >
                      <Lock className="h-4 w-4 mr-1.5" />
                      Kunci & Selesaikan Sesi Sekarang
                    </Button>
                  </div>
                ) : (
                  <div className="py-6 text-center space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <Lock className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">Tidak Ada Sesi Pairing Aktif</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                        PC praktikan baru tidak dapat melakukan registrasi kursi hingga Anda membuka sesi pairing.
                      </p>
                    </div>

                    <Dialog open={isNewSessionOpen} onOpenChange={setIsNewSessionOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="w-full">
                          <Radio className="h-4 w-4 mr-1.5" />
                          Buka Sesi Pairing Baru
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Buka Sesi Pairing: {selectedRoom.name}</DialogTitle>
                          <DialogDescription>
                            Sistem akan membuat kode acak 6-digit baru yang dapat digunakan aslab untuk mengonfigurasi PC praktikan.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="session-ttl">Durasi Sesi</Label>
                            <Select value={sessionDuration} onValueChange={setSessionDuration}>
                              <SelectTrigger id="session-ttl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="60">1 Jam (Persiapan Cepat)</SelectItem>
                                <SelectItem value="120">2 Jam (Standar Setup Lab)</SelectItem>
                                <SelectItem value="240">4 Jam (Setup Paralel Banyak Aslab)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsNewSessionOpen(false)}>
                            Batal
                          </Button>
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

            {/* Room Info Card */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Statistik Ruangan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Nama Lab:</span>
                  <span className="font-semibold">{selectedRoom.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Kapasitas Fisik:</span>
                  <span className="font-semibold">{selectedRoom.capacity} Meja</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">PC Terdaftar:</span>
                  <span className="font-semibold">{devices.length} Perangkat</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">PC Online Saat Ini:</span>
                  <span className="font-semibold text-emerald-500 font-mono">
                    {devices.filter((d) => d.computedStatus !== 'offline').length} Perangkat
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Seat Grid Card */}
          <div className="lg:col-span-2">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Denah Kursi & Status Meja ({selectedRoom.name})
                    </CardTitle>
                    <CardDescription>
                      Pemantauan langsung status pendaftaran setiap nomor kursi (1 - {capacity}).
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Online
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
                      Offline
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full border border-dashed border-zinc-400" />
                      Kosong
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-2.5 pt-2">
                  {Array.from({ length: capacity }, (_, i) => i + 1).map((seatNum) => {
                    const dev = claimedDeviceMap.get(seatNum);
                    const isClaimed = Boolean(dev);
                    const isOnline = dev && dev.computedStatus !== 'offline';
                    const isStreaming = dev && dev.computedStatus === 'streaming';

                    return (
                      <div
                        key={seatNum}
                        className={`relative rounded-lg p-2.5 text-center flex flex-col items-center justify-center transition-all ${
                          !isClaimed
                            ? 'border border-dashed border-zinc-300 dark:border-zinc-800 bg-background/50 text-muted-foreground'
                            : isStreaming
                            ? 'border-2 border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold shadow-sm'
                            : isOnline
                            ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold shadow-sm'
                            : 'border border-zinc-300 dark:border-zinc-800 bg-muted/30 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        <span className="text-xs font-mono font-bold">
                          {seatNum < 10 ? `0${seatNum}` : seatNum}
                        </span>
                        <span className="text-[10px] truncate max-w-full mt-0.5 font-medium">
                          {dev ? dev.label : 'Kosong'}
                        </span>
                        {isClaimed && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full mt-1 ${
                              isStreaming
                                ? 'bg-blue-500 animate-pulse'
                                : isOnline
                                ? 'bg-emerald-500'
                                : 'bg-zinc-400'
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
        <div className="p-12 text-center text-muted-foreground">
          {isLoading ? 'Memuat data ruangan...' : 'Belum ada ruangan lab yang terdaftar.'}
        </div>
      )}
    </div>
  );
}

