'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, SlidersHorizontal, Check } from 'lucide-react';
import type { CaslabRoomConfig, SeatingMode } from '@/types/caslab';

interface CaslabSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numRooms: 1 | 2;
  seatingMode: SeatingMode;
  rooms: [CaslabRoomConfig, CaslabRoomConfig];
  candidateCount: number;
  onSave: (
    numRooms: 1 | 2,
    seatingMode: SeatingMode,
    rooms: [CaslabRoomConfig, CaslabRoomConfig]
  ) => void;
}

export function CaslabSettingsModal({
  open,
  onOpenChange,
  numRooms: initialNumRooms,
  seatingMode: initialSeatingMode,
  rooms: initialRooms,
  candidateCount,
  onSave,
}: CaslabSettingsModalProps) {
  const [numRooms, setNumRooms] = useState<1 | 2>(initialNumRooms);
  const [seatingMode, setSeatingMode] = useState<SeatingMode>(initialSeatingMode);
  const [room1, setRoom1] = useState<CaslabRoomConfig>(initialRooms[0]);
  const [room2, setRoom2] = useState<CaslabRoomConfig>(initialRooms[1]);

  useEffect(() => {
    if (open) {
      setNumRooms(initialNumRooms);
      setSeatingMode(initialSeatingMode);
      setRoom1({ ...initialRooms[0] });
      setRoom2({ ...initialRooms[1] });
    }
  }, [open, initialNumRooms, initialSeatingMode, initialRooms]);

  const activeRooms = numRooms === 1 ? [room1] : [room1, room2];
  const totalPhysical = activeRooms.reduce((acc, r) => acc + (r.capacity - r.disabledSeats.length), 0);
  const totalSpaced = activeRooms.reduce((acc, r) => {
    const active = r.capacity - r.disabledSeats.length;
    return acc + Math.ceil(active / 2);
  }, 0);

  const isOverDense = candidateCount > totalPhysical;
  const isOverSpaced = seatingMode === 'spaced' && candidateCount > totalSpaced;

  const handleSave = () => {
    onSave(numRooms, seatingMode, [room1, room2]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Pengaturan Ruangan & Pola Kursi
          </DialogTitle>
          <DialogDescription>
            Konfigurasikan jumlah laboratorium ujian, daya tampung PC, dan pola penempatan kursi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Jumlah Ruangan */}
          <div className="space-y-1.5">
            <Label htmlFor="num-rooms">Jumlah Ruangan</Label>
            <Select
              value={String(numRooms)}
              onValueChange={(val) => setNumRooms(Number(val) as 1 | 2)}
            >
              <SelectTrigger id="num-rooms" className="w-full">
                <SelectValue placeholder="Pilih jumlah ruangan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Ruangan (Satu Lab)</SelectItem>
                <SelectItem value="2">2 Ruangan (Dua Lab - Rotasi Seimbang)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pola Penempatan Kursi */}
          <div className="space-y-1.5">
            <Label htmlFor="seating-mode">Pola Penempatan Kursi</Label>
            <Select
              value={seatingMode}
              onValueChange={(val) => setSeatingMode(val as SeatingMode)}
            >
              <SelectTrigger id="seating-mode" className="w-full">
                <SelectValue placeholder="Pilih pola kursi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spaced">
                  Mode Berselang (Jeda 1 Kursi / Anti-Contek)
                </SelectItem>
                <SelectItem value="dense">
                  Mode Sebelahan (Rapat Berurutan / Kapasitas Penuh)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Konfigurasi Ruang 1 */}
          <div className="rounded-md border p-3 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Ruangan 1</span>
              <Badge variant="outline" className="text-[10px]">
                {room1.capacity - room1.disabledSeats.length} Kursi Aktif
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="r1-name" className="text-xs text-muted-foreground">
                  Nama Ruangan
                </Label>
                <Input
                  id="r1-name"
                  value={room1.name}
                  onChange={(e) => setRoom1({ ...room1, name: e.target.value })}
                  placeholder="e.g. TULT 0617"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="r1-cap" className="text-xs text-muted-foreground">
                  Kapasitas
                </Label>
                <Input
                  id="r1-cap"
                  type="number"
                  min={1}
                  max={120}
                  value={room1.capacity}
                  onChange={(e) =>
                    setRoom1({ ...room1, capacity: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Konfigurasi Ruang 2 (Jika 2 Ruangan) */}
          {numRooms === 2 && (
            <div className="rounded-md border p-3 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Ruangan 2</span>
                <Badge variant="outline" className="text-[10px]">
                  {room2.capacity - room2.disabledSeats.length} Kursi Aktif
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="r2-name" className="text-xs text-muted-foreground">
                    Nama Ruangan
                  </Label>
                  <Input
                    id="r2-name"
                    value={room2.name}
                    onChange={(e) => setRoom2({ ...room2, name: e.target.value })}
                    placeholder="e.g. TULT 0618"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="r2-cap" className="text-xs text-muted-foreground">
                    Kapasitas
                  </Label>
                  <Input
                    id="r2-cap"
                    type="number"
                    min={1}
                    max={120}
                    value={room2.capacity}
                    onChange={(e) =>
                      setRoom2({ ...room2, capacity: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Kapasitas Feedback */}
          {candidateCount > 0 && (
            <div className="space-y-2 pt-1">
              {isOverDense ? (
                <Alert variant="destructive" className="py-2 text-xs">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Total peserta ({candidateCount}) melebihi daya tampung fisik ({totalPhysical} PC). Tambahkan ruangan atau tambah kapasitas.
                  </AlertDescription>
                </Alert>
              ) : isOverSpaced ? (
                <Alert className="py-2 text-xs border-amber-500/50 text-amber-800 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Mode Berselang hanya menyediakan {totalSpaced} kursi untuk {candidateCount} peserta. Sebagian peserta akan dialokasikan ke kursi berdekatan.
                  </AlertDescription>
                </Alert>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Daya tampung: {totalPhysical} kursi fisik ({totalSpaced} kursi berselang) untuk {candidateCount} peserta.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave}>
            Simpan & Terapkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
