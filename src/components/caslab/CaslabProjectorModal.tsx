'use client';

import React, { useState } from 'react';
import {
  Maximize2,
  Minimize2,
  Tv,
  X,
  Search,
  Monitor,
  Sparkles,
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
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[96vh] h-[96vh] p-0 flex flex-col bg-slate-950 text-slate-100 border-slate-800">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                MODE PROYEKTOR — DENAH KURSI CASLAB
              </h2>
              <p className="text-xs text-slate-400">
                Informatics Laboratory Telkom University
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Room Switcher */}
            {allocations.length > 1 && (
              <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
                {allocations.map((alloc, idx) => (
                  <button
                    key={alloc.room.id}
                    onClick={() => setSelectedRoomIdx(idx)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      selectedRoomIdx === idx
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {alloc.room.name}
                  </button>
                ))}
              </div>
            )}

            {/* Quick Search */}
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari Meja / NIM..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleFullscreen}
              className="h-8 w-8 bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Presentation Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Front of Room */}
          <div className="w-full py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs font-bold tracking-widest uppercase text-slate-400 flex items-center justify-center gap-2">
            <Monitor className="w-4 h-4 text-primary" />
            DEPAN / PAPAN TULIS ({currentAlloc.room.name})
          </div>

          {/* Seat Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-3">
            {currentAlloc.seats.map((seat) => {
              if (seat.isDisabled) {
                return (
                  <div
                    key={seat.seatNumber}
                    className="rounded-xl border border-rose-950 bg-rose-950/20 p-3 min-h-[110px] flex flex-col justify-between opacity-40"
                  >
                    <span className="font-mono text-xs font-bold text-rose-400">
                      #{String(seat.seatNumber).padStart(2, '0')}
                    </span>
                    <span className="text-[11px] font-medium text-rose-400 text-center">
                      PC Rusak
                    </span>
                  </div>
                );
              }

              if (seat.isSpacedEmpty && !seat.candidate) {
                return (
                  <div
                    key={seat.seatNumber}
                    className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-3 min-h-[110px] flex flex-col justify-between opacity-30"
                  >
                    <span className="font-mono text-xs text-slate-600">
                      #{String(seat.seatNumber).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-slate-600 text-center italic">
                      [ Jeda ]
                    </span>
                  </div>
                );
              }

              if (!seat.candidate) {
                return (
                  <div
                    key={seat.seatNumber}
                    className="rounded-xl border border-slate-800/60 bg-slate-900/20 p-3 min-h-[110px] flex flex-col justify-between opacity-30"
                  >
                    <span className="font-mono text-xs text-slate-600">
                      #{String(seat.seatNumber).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-slate-600 text-center">
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
                  className={`rounded-xl p-3 min-h-[110px] flex flex-col justify-between transition-all duration-300 ${
                    matchesSearch
                      ? 'border-2 border-amber-400 bg-amber-500/20 ring-4 ring-amber-400/30 scale-105 z-10'
                      : 'border border-slate-800 bg-slate-900/90 shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      Meja #{String(seat.seatNumber).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Kode Aslab Huge Badge */}
                  <div className="text-center my-1">
                    <span className="inline-block font-mono font-black text-sm tracking-widest px-2.5 py-1 rounded bg-blue-600 text-white shadow-md">
                      {c.kode}
                    </span>
                  </div>

                  <div className="space-y-0.5 text-center">
                    <p
                      className="text-xs font-semibold text-white truncate leading-tight"
                      title={c.nama_lengkap}
                    >
                      {c.nama_lengkap}
                    </p>
                    <p className="text-[11px] font-mono text-slate-400">
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

