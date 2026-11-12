'use client';

import React, { useState } from 'react';
import {
  Maximize2,
  Minimize2,
  Tv,
  Search,
  Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CaslabRoomAllocation } from '@/types/caslab';

interface CaslabProjectorModalProps {
  allocations: CaslabRoomAllocation[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRoomIndex?: number;
}

export function CaslabProjectorModal({
  allocations,
  open,
  onOpenChange,
  defaultRoomIndex = 0,
}: CaslabProjectorModalProps) {
  const [selectedRoomIdx, setSelectedRoomIdx] = useState<number>(defaultRoomIndex);
  const [search, setSearch] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (allocations.length === 0) return null;

  const currentAlloc = allocations[selectedRoomIdx] || allocations[0];

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const cleanSearch = search.trim().toLowerCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[96vh] h-[96vh] p-0 flex flex-col bg-background text-foreground border border-border">
        <DialogHeader className="sr-only">
          <DialogTitle>Denah Proyektor</DialogTitle>
        </DialogHeader>

        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Tv className="w-5 h-5 text-muted-foreground" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Denah Proyektor
              </h2>
              <p className="text-xs text-muted-foreground">
                {currentAlloc.room.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Room Switcher */}
            {allocations.length > 1 && (
              <div className="flex items-center bg-muted rounded-md p-0.5 border border-border">
                {allocations.map((alloc, idx) => (
                  <button
                    key={alloc.room.id}
                    onClick={() => setSelectedRoomIdx(idx)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-all ${
                      selectedRoomIdx === idx
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {alloc.room.name}
                  </button>
                ))}
              </div>
            )}

            {/* Quick Search */}
            <div className="relative w-44">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari meja, NIM, kode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleFullscreen}
              className="h-8 w-8"
              title="Layar Penuh"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Presentation Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Front of Room */}
          <div className="w-full py-2 bg-muted/60 border border-border rounded-md text-center text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center justify-center gap-2">
            <Monitor className="w-4 h-4" />
            DEPAN — {currentAlloc.room.name}
          </div>

          {/* Seat Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-2.5">
            {currentAlloc.seats.map((seat) => {
              if (seat.isDisabled) {
                return (
                  <div
                    key={seat.seatNumber}
                    className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 min-h-[96px] flex flex-col justify-between opacity-60"
                  >
                    <span className="font-mono text-[11px] font-semibold text-destructive">
                      #{String(seat.seatNumber).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-destructive text-center">
                      PC Rusak
                    </span>
                  </div>
                );
              }

              if (seat.isSpacedEmpty && !seat.candidate) {
                return (
                  <div
                    key={seat.seatNumber}
                    className="rounded-md border border-dashed border-border p-2.5 min-h-[96px] flex flex-col justify-between opacity-40"
                  >
                    <span className="font-mono text-[11px] text-muted-foreground">
                      #{String(seat.seatNumber).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-muted-foreground text-center italic">
                      Jeda
                    </span>
                  </div>
                );
              }

              if (!seat.candidate) {
                return (
                  <div
                    key={seat.seatNumber}
                    className="rounded-md border border-border/50 p-2.5 min-h-[96px] flex flex-col justify-between opacity-40"
                  >
                    <span className="font-mono text-[11px] text-muted-foreground">
                      #{String(seat.seatNumber).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-muted-foreground text-center">
                      Kosong
                    </span>
                  </div>
                );
              }

              const c = seat.candidate;
              const matchesSearch =
                cleanSearch &&
                (c.nama_lengkap.toLowerCase().includes(cleanSearch) ||
                  c.nim.toLowerCase().includes(cleanSearch) ||
                  c.kode.toLowerCase().includes(cleanSearch) ||
                  String(seat.seatNumber) === cleanSearch);

              return (
                <div
                  key={seat.seatNumber}
                  className={`rounded-md p-2.5 min-h-[96px] flex flex-col justify-between transition-all border ${
                    matchesSearch
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                      #{String(seat.seatNumber).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="text-center my-1">
                    <Badge
                      variant="secondary"
                      className="font-mono font-bold text-xs px-2 py-0.5"
                    >
                      {c.kode}
                    </Badge>
                  </div>

                  <div className="space-y-0.5 text-center">
                    <p
                      className="text-xs font-medium text-foreground truncate leading-tight"
                      title={c.nama_lengkap}
                    >
                      {c.nama_lengkap}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {c.nim}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
