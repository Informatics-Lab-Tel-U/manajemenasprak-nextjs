'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Maximize2,
  Minimize2,
  ArrowLeft,
  Search,
  Monitor,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CaslabRoomAllocation, CaslabSeat } from '@/types/caslab';

const STORAGE_KEY = 'caslab_plotting_state_v1';
const CASLAB_PROJECTOR_CHANNEL = 'caslab-projector-sync';

export function CaslabProjectorStandalone() {
  const [allocations, setAllocations] = useState<CaslabRoomAllocation[]>([]);
  const [selectedRoomIdx, setSelectedRoomIdx] = useState<number>(0);
  const [search, setSearch] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'columns' | 'grid'>('columns');

  const loadDataFromStorage = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.allocations)) {
          setAllocations(parsed.allocations);
        }
      }
    } catch (e) {
      console.error('Failed to load Caslab state from localStorage:', e);
    }
  };

  const requestSync = () => {
    loadDataFromStorage();
    if (typeof window !== 'undefined') {
      try {
        const channel = new BroadcastChannel(CASLAB_PROJECTOR_CHANNEL);
        channel.postMessage({ type: 'REQUEST_SYNC' });
        setTimeout(() => channel.close(), 500);
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    loadDataFromStorage();

    if (typeof window === 'undefined') return;
    const channel = new BroadcastChannel(CASLAB_PROJECTOR_CHANNEL);

    channel.onmessage = (event) => {
      if (event.data?.type === 'SYNC_STATE') {
        const { allocations: newAllocs } = event.data;
        if (Array.isArray(newAllocs)) {
          setAllocations(newAllocs);
        }
      }
    };

    // Request immediate sync from main window
    channel.postMessage({ type: 'REQUEST_SYNC' });

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) loadDataFromStorage();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      channel.close();
      window.removeEventListener('storage', handleStorage);
    };
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

  // Partition seats into columns (10 seats per bench column, matching generator-kursi)
  const seatsPerCol = 10;
  const columns: CaslabSeat[][] = [];
  if (currentAlloc && currentAlloc.seats) {
    const totalCols = Math.ceil(currentAlloc.seats.length / seatsPerCol);
    for (let c = 0; c < totalCols; c++) {
      const col = currentAlloc.seats.slice(c * seatsPerCol, (c + 1) * seatsPerCol);
      if (col.length > 0) columns.push(col);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-3 md:p-5 select-none font-sans">
      {/* Top Bar — Sesuai Generator Kursi */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border mb-4">
        <div className="flex items-center gap-3">
          <Link href="/generator/caslab">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              title="Kembali ke Panel Utama"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-muted-foreground" />
            <h1 className="text-sm font-semibold text-foreground">
              Proyektor Caslab
            </h1>
          </div>

          {/* Room Selector Tabs if multi-room */}
          {allocations.length > 1 && (
            <Tabs
              value={String(selectedRoomIdx)}
              onValueChange={(val) => setSelectedRoomIdx(Number(val))}
              className="ml-2"
            >
              <TabsList className="h-8">
                {allocations.map((alloc, idx) => (
                  <TabsTrigger
                    key={alloc.room.id}
                    value={String(idx)}
                    className="text-xs px-2.5 h-7"
                  >
                    {alloc.room.name} ({alloc.assignedCandidates.length})
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle: Kolom vs Grid */}
          <div className="flex items-center bg-muted rounded-md p-0.5 border border-border">
            <button
              type="button"
              onClick={() => setViewMode('columns')}
              className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-all ${
                viewMode === 'columns'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Kolom Meja
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-all ${
                viewMode === 'grid'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Grid Denah
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-44 sm:w-52">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari meja, NIM, nama..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={requestSync}
            className="h-8 w-8"
            title="Sinkronkan Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            className="h-8 w-8"
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Main Grid or Empty State */}
      {!currentAlloc || currentAlloc.seats.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border rounded-md bg-card">
          <Monitor className="w-12 h-12 text-muted-foreground opacity-50 mb-3" />
          <h2 className="text-base font-semibold text-foreground">Mode Proyektor Menunggu...</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Lakukan plotting kursi calon aslab dari panel utama.
          </p>
          <div className="flex items-center gap-2 mt-4">
            <Link href="/generator/caslab">
              <Button size="sm" variant="outline" className="text-xs">
                Buka Panel Utama
              </Button>
            </Link>
            <Button size="sm" onClick={requestSync} className="text-xs gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Sinkronkan Data
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 space-y-3">
          {/* Front Banner */}
          <div className="w-full py-2 bg-muted/60 border border-border rounded-md text-center text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center justify-center gap-2">
            <Monitor className="w-4 h-4" />
            DEPAN / PAPAN TULIS — {currentAlloc.room.name}
          </div>

          {/* VIEW 1: Columns (Matching generator-kursi SeatsTab layout) */}
          {viewMode === 'columns' ? (
            <div
              className="grid gap-3 flex-1 overflow-auto items-start"
              style={{
                gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
              }}
            >
              {columns.map((column, colIdx) => (
                <div
                  key={colIdx}
                  className="border border-border rounded-md overflow-hidden bg-card flex flex-col shadow-xs"
                >
                  {/* Column Header */}
                  <div className="grid grid-cols-[38px_1fr_64px] bg-muted px-2.5 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border items-center">
                    <span className="text-center font-mono">NO</span>
                    <span className="pl-1">NAMA & NIM</span>
                    <span className="text-center font-mono">KODE</span>
                  </div>

                  {/* Seat Rows in Column */}
                  <div className="divide-y divide-border/60">
                    {column.map((seat) => {
                      const c = seat.candidate;
                      const isSearchMatch = Boolean(
                        cleanSearch &&
                          (c?.nama_lengkap.toLowerCase().includes(cleanSearch) ||
                            c?.nim.toLowerCase().includes(cleanSearch) ||
                            c?.kode.toLowerCase().includes(cleanSearch) ||
                            String(seat.seatNumber) === cleanSearch)
                      );

                      return (
                        <div
                          key={seat.seatNumber}
                          className={`grid grid-cols-[38px_1fr_64px] items-center px-2.5 py-2 min-h-[46px] transition-colors ${
                            isSearchMatch
                              ? 'bg-primary/15 font-semibold ring-1 ring-primary'
                              : seat.isDisabled
                              ? 'bg-destructive/5 opacity-50'
                              : seat.isSpacedEmpty && !c
                              ? 'bg-muted/10 opacity-35'
                              : !c
                              ? 'opacity-40'
                              : 'hover:bg-muted/30'
                          }`}
                        >
                          {/* Seat No */}
                          <span
                            className={`text-center font-mono text-xs font-bold ${
                              seat.isDisabled ? 'text-destructive' : 'text-primary'
                            }`}
                          >
                            {String(seat.seatNumber).padStart(2, '0')}
                          </span>

                          {/* Candidate Name & NIM */}
                          <div className="pl-1 min-w-0 pr-1">
                            {seat.isDisabled ? (
                              <span className="text-xs text-destructive font-medium">
                                PC Rusak
                              </span>
                            ) : seat.isSpacedEmpty && !c ? (
                              <span className="text-xs text-muted-foreground italic">
                                [ Jeda ]
                              </span>
                            ) : !c ? (
                              <span className="text-xs text-muted-foreground">
                                Kosong
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                <p
                                  className="text-xs font-medium text-foreground truncate leading-tight"
                                  title={c.nama_lengkap}
                                >
                                  {c.nama_lengkap}
                                </p>
                                <p className="text-[10px] font-mono text-muted-foreground leading-none">
                                  {c.nim}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Kode Aslab Badge */}
                          <div className="flex justify-center">
                            {c ? (
                              <Badge
                                variant="secondary"
                                className="font-mono font-bold text-xs px-2 py-0.5"
                              >
                                {c.kode}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* VIEW 2: Spatial Grid (8x5 desks) */
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-2.5 flex-1 overflow-auto items-start">
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
          )}

          {/* Footer Status Bar */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2.5 border-t border-border">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Terisi: {currentAlloc.assignedCandidates.length}
              </span>
              {currentAlloc.seats.some((s) => s.isSpacedEmpty) && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                  Mode Berselang
                </span>
              )}
              {currentAlloc.room.disabledSeats.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  PC Rusak: {currentAlloc.room.disabledSeats.length}
                </span>
              )}
            </div>
            <span>Kapasitas: {currentAlloc.room.capacity} Kursi</span>
          </div>
        </div>
      )}
    </div>
  );
}
