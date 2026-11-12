'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Maximize2,
  Minimize2,
  Tv,
  ArrowLeft,
  Search,
  Monitor,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { CaslabRoomAllocation } from '@/types/caslab';

const STORAGE_KEY = 'caslab_plotting_state_v1';

export function CaslabProjectorStandalone() {
  const [allocations, setAllocations] = useState<CaslabRoomAllocation[]>([]);
  const [selectedRoomIdx, setSelectedRoomIdx] = useState<number>(0);
  const [search, setSearch] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const loadData = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.allocations)) {
          setAllocations(parsed.allocations);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) loadData();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const currentAlloc = allocations[selectedRoomIdx] || allocations[0];
  const cleanSearch = search.trim().toLowerCase();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-4 md:p-6 select-none font-sans">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border mb-6">
        <div className="flex items-center gap-3">
          <Link href="/generator/caslab">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <Tv className="w-5 h-5 text-muted-foreground" />
          <div>
            <h1 className="text-base font-semibold text-foreground">
              Denah Proyektor Caslab
            </h1>
            <p className="text-xs text-muted-foreground">
              {currentAlloc?.room?.name || 'Ruangan'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Room Selector */}
          {allocations.length > 1 && (
            <div className="flex items-center bg-muted rounded-md p-0.5 border border-border">
              {allocations.map((alloc, idx) => (
                <button
                  key={alloc.room.id}
                  onClick={() => setSelectedRoomIdx(idx)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all ${
                    selectedRoomIdx === idx
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {alloc.room.name} ({alloc.assignedCandidates.length})
                </button>
              ))}
            </div>
          )}

          {/* Search box */}
          <div className="relative w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari meja, NIM, kode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-xs"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={loadData}
            className="h-9 w-9"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            className="h-9 w-9"
            title="Layar Penuh"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Main Grid or Empty State */}
      {!currentAlloc || currentAlloc.seats.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border rounded-md bg-card">
          <Monitor className="w-10 h-10 text-muted-foreground mb-3" />
          <h2 className="text-sm font-medium text-foreground">Belum ada data plotting</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Silakan import data peserta dan acak kursi di halaman generator.
          </p>
          <Link href="/generator/caslab" className="mt-4">
            <Button size="sm" variant="outline" className="text-xs">
              Buka Generator
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex-1 space-y-4">
          {/* Front Banner */}
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
      )}
    </div>
  );
}
