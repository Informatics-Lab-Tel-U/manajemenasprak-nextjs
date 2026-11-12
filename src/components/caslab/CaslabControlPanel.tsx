'use client';

import React from 'react';
import {
  Shuffle,
  RefreshCw,
  SlidersHorizontal,
  Building2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { CaslabRoomConfig, SeatingMode } from '@/types/caslab';

interface CaslabControlPanelProps {
  candidateCount: number;
  numRooms: 1 | 2;
  onNumRoomsChange: (n: 1 | 2) => void;
  seatingMode: SeatingMode;
  onSeatingModeChange: (m: SeatingMode) => void;
  rooms: [CaslabRoomConfig, CaslabRoomConfig];
  onRoomChange: (index: 0 | 1, updated: Partial<CaslabRoomConfig>) => void;
  onShuffle: () => void;
  onReShuffle: () => void;
  onResetPlotting: () => void;
  isShuffled: boolean;
  historyVersion: number;
}

export function CaslabControlPanel({
  candidateCount,
  numRooms,
  onNumRoomsChange,
  seatingMode,
  onSeatingModeChange,
  rooms,
  onRoomChange,
  onShuffle,
  onReShuffle,
  onResetPlotting,
  isShuffled,
  historyVersion,
}: CaslabControlPanelProps) {
  // Compute capacities
  const activeRooms = rooms.slice(0, numRooms);
  const totalPhysicalCapacity = activeRooms.reduce((acc, r) => acc + (r.capacity - r.disabledSeats.length), 0);
  
  // In spaced mode, usable capacity is approximately half of active physical capacity
  const totalSpacedCapacity = activeRooms.reduce((acc, r) => {
    const activeSeats = r.capacity - r.disabledSeats.length;
    return acc + Math.ceil(activeSeats / 2);
  }, 0);

  const isOverDenseCapacity = candidateCount > totalPhysicalCapacity;
  const isOverSpacedCapacity = seatingMode === 'spaced' && candidateCount > totalSpacedCapacity;

  return (
    <Card className="border border-border/80 shadow-sm bg-card/60 backdrop-blur-xs">
      <CardContent className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
          <div>
            <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-primary" />
              2. Konfigurasi Ruangan & Pola Kursi
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pilih jumlah ruangan lab dan pola penempatan kursi (Berselang / Sebelahan).
            </p>
          </div>

          {/* Quick status badge */}
          <div className="flex items-center gap-2">
            {candidateCount === 0 ? (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Menunggu Upload Peserta
              </Badge>
            ) : isOverDenseCapacity ? (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Kapasitas Kurang ({candidateCount} / {totalPhysicalCapacity})
              </Badge>
            ) : isOverSpacedCapacity ? (
              <Badge variant="secondary" className="text-xs gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <AlertTriangle className="w-3.5 h-3.5" />
                Spaced Padat ({candidateCount} Peserta &gt; {totalSpacedCapacity} Kursi Berselang)
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Kapasitas Siap ({candidateCount} Peserta)
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pilihan Jumlah Ruangan */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Jumlah Ruangan Lab
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onNumRoomsChange(1)}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all ${
                  numRooms === 1
                    ? 'border-primary bg-primary/10 shadow-xs text-primary font-semibold'
                    : 'border-border/80 hover:border-primary/40 text-muted-foreground'
                }`}
              >
                <Building2 className="w-5 h-5 mb-1.5" />
                <span className="text-sm">1 Ruangan</span>
                <span className="text-[11px] font-normal text-muted-foreground mt-0.5">
                  Semua peserta di 1 Lab
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNumRoomsChange(2)}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all ${
                  numRooms === 2
                    ? 'border-primary bg-primary/10 shadow-xs text-primary font-semibold'
                    : 'border-border/80 hover:border-primary/40 text-muted-foreground'
                }`}
              >
                <Building2 className="w-5 h-5 mb-1.5" />
                <span className="text-sm">2 Ruangan</span>
                <span className="text-[11px] font-normal text-muted-foreground mt-0.5">
                  Dibagi seimbang ke 2 Lab
                </span>
              </button>
            </div>
          </div>

          {/* Pilihan Pola Penempatan Kursi */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Pola Penempatan Kursi
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onSeatingModeChange('spaced')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all ${
                  seatingMode === 'spaced'
                    ? 'border-primary bg-primary/10 shadow-xs text-primary font-semibold'
                    : 'border-border/80 hover:border-primary/40 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-1 mb-1.5 font-mono text-xs">
                  <span className="px-1.5 py-0.5 bg-primary/20 rounded">●</span>
                  <span className="text-muted-foreground">○</span>
                  <span className="px-1.5 py-0.5 bg-primary/20 rounded">●</span>
                </div>
                <span className="text-sm">Mode Berselang</span>
                <span className="text-[11px] font-normal text-muted-foreground mt-0.5">
                  Ada jeda 1 PC (Anti-Contek)
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSeatingModeChange('dense')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all ${
                  seatingMode === 'dense'
                    ? 'border-primary bg-primary/10 shadow-xs text-primary font-semibold'
                    : 'border-border/80 hover:border-primary/40 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-1 mb-1.5 font-mono text-xs">
                  <span className="px-1.5 py-0.5 bg-primary/20 rounded">●</span>
                  <span className="px-1.5 py-0.5 bg-primary/20 rounded">●</span>
                  <span className="px-1.5 py-0.5 bg-primary/20 rounded">●</span>
                </div>
                <span className="text-sm">Mode Sebelahan</span>
                <span className="text-[11px] font-normal text-muted-foreground mt-0.5">
                  Rapat berurutan (Kapasitas Maks)
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Input Nama Ruangan & Kapasitas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Room 1 */}
          <div className="p-4 rounded-xl border border-border/70 bg-background/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Ruangan 1
              </span>
              <span className="text-xs text-muted-foreground">
                Tersedia: {rooms[0].capacity - rooms[0].disabledSeats.length} Kursi Aktif
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-[11px] text-muted-foreground">Nama Ruangan</Label>
                <Input
                  value={rooms[0].name}
                  onChange={(e) => onRoomChange(0, { name: e.target.value })}
                  placeholder="e.g. TULT 0617 (Lab Multimedia)"
                  className="h-8 text-xs font-medium"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Kapasitas PC</Label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={rooms[0].capacity}
                  onChange={(e) => onRoomChange(0, { capacity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="h-8 text-xs text-center font-mono"
                />
              </div>
            </div>
          </div>

          {/* Room 2 (Conditional) */}
          {numRooms === 2 && (
            <div className="p-4 rounded-xl border border-border/70 bg-background/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Ruangan 2
                </span>
                <span className="text-xs text-muted-foreground">
                  Tersedia: {rooms[1].capacity - rooms[1].disabledSeats.length} Kursi Aktif
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Nama Ruangan</Label>
                  <Input
                    value={rooms[1].name}
                    onChange={(e) => onRoomChange(1, { name: e.target.value })}
                    placeholder="e.g. TULT 0618 (Lab Riset)"
                    className="h-8 text-xs font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Kapasitas PC</Label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={rooms[1].capacity}
                    onChange={(e) => onRoomChange(1, { capacity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="h-8 text-xs text-center font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            {isShuffled && (
              <span className="flex items-center gap-1 font-mono text-[11px] bg-muted px-2 py-1 rounded">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Versi Kocokan: #{historyVersion}
              </span>
            )}
            <span>
              {numRooms === 2
                ? 'Semua peserta dikocok acak dan didistribusikan lintas Ruang 1 & Ruang 2.'
                : 'Semua peserta dialokasikan ke Ruang 1.'}
            </span>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {isShuffled && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onResetPlotting}
                  className="text-xs h-9 gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Kursi
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onReShuffle}
                  className="text-xs h-9 gap-1.5 font-semibold text-foreground bg-secondary/80 hover:bg-secondary"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-primary" />
                  Kocok Ulang (Re-Randomize)
                </Button>
              </>
            )}

            <Button
              size="sm"
              disabled={candidateCount === 0}
              onClick={onShuffle}
              className="text-xs h-9 gap-2 px-5 font-semibold shadow-sm flex-1 sm:flex-initial"
            >
              <Shuffle className="w-4 h-4" />
              {isShuffled ? 'Acak Ulang Plotting' : 'Acak Plotting Kursi'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
