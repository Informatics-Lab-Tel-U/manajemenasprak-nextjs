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
  LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CaslabRoomAllocation, CaslabSeat } from '@/types/caslab';

const STORAGE_KEY = 'caslab_plotting_state_v1';
const CASLAB_PROJECTOR_CHANNEL = 'caslab-projector-sync';

const COLOR_VARIANTS = [
  'blue',
  'green',
  'amber',
  'purple',
  'rose',
  'cyan',
  'indigo',
  'teal',
] as const;

const ASPRAK_VARIANTS: Record<string, string> = {};

function getAsprakVariant(asprak: string): string {
  if (!ASPRAK_VARIANTS[asprak]) {
    let hash = 0;
    for (let i = 0; i < asprak.length; i++) {
      hash = (hash << 5) - hash + asprak.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % COLOR_VARIANTS.length;
    ASPRAK_VARIANTS[asprak] = COLOR_VARIANTS[idx];
  }
  return ASPRAK_VARIANTS[asprak];
}

export function CaslabProjectorStandalone() {
  const [allocations, setAllocations] = useState<CaslabRoomAllocation[]>([]);
  const [selectedRoomIdx, setSelectedRoomIdx] = useState<number>(0);
  const [search, setSearch] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const loadDataFromDb = async () => {
    try {
      const response = await fetch('/api/caslab', { cache: 'no-store' });
      if (response.ok) {
        const result = await response.json();
        if (result.ok && result.data && Array.isArray(result.data.allocations)) {
          setAllocations(result.data.allocations);
        }
      }
    } catch (e) {
      console.warn('Could not load Caslab state from DB in projector:', e);
    }
  };

  const requestSync = () => {
    loadDataFromStorage();
    loadDataFromDb();
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
    loadDataFromDb();

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

  // Partition seats into columns (10 seats per column, exactly matching generator-kursi)
  const seatsPerCol = 10;
  const columns: CaslabSeat[][] = [];
  if (currentAlloc && Array.isArray(currentAlloc.seats)) {
    const totalCols = Math.ceil(currentAlloc.seats.length / seatsPerCol);
    for (let c = 0; c < totalCols; c++) {
      const col = currentAlloc.seats.slice(c * seatsPerCol, (c + 1) * seatsPerCol);
      if (col.length > 0) columns.push(col);
    }
  }

  if (!currentAlloc || columns.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--background)',
          color: 'var(--muted-foreground)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>
            <Monitor className="size-12 mx-auto opacity-50" />
          </div>
          <h2 style={{ margin: 0, fontWeight: 600, fontSize: '18px', color: 'var(--foreground)' }}>
            Mode Proyektor Menunggu...
          </h2>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginTop: '4px' }}>
            Lakukan plotting kursi dari panel utama
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Link href="/generator/caslab">
              <Button size="sm" variant="outline">
                Panel Utama
              </Button>
            </Link>
            <Button size="sm" onClick={requestSync} className="gap-1.5">
              <RefreshCw className="size-3.5" />
              Sinkronkan Data
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        padding: '16px 16px',
        boxSizing: 'border-box',
        background: 'var(--background)',
        position: 'relative',
      }}
    >
      {/* Top Bar — Exact generator-kursi layout */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40px',
          marginBottom: '12px',
          flexShrink: 0,
        }}
      >
        {/* Sisi Kiri: Back button & Search Box */}
        <div
          style={{
            position: 'absolute',
            left: '4px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 20,
          }}
        >
          <Link href="/generator/caslab">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              title="Kembali ke Panel Utama"
            >
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="relative w-48 sm:w-60">
            <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari meja, NIM, nama..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-sm bg-card border-border"
            />
          </div>
        </div>

        {/* Tengah: Room Tabs jika ada multi room, atau Judul Lab */}
        {allocations.length > 1 ? (
          <Tabs
            value={String(selectedRoomIdx)}
            onValueChange={(val) => setSelectedRoomIdx(Number(val))}
          >
            <TabsList className="bg-card/90 border border-border/70 shadow-xs backdrop-blur-md">
              {allocations.map((alloc, idx) => (
                <TabsTrigger key={alloc.room.id} value={String(idx)} className="text-sm font-medium">
                  {alloc.room.name} ({alloc.assignedCandidates.length})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : (
          <div className="text-sm font-semibold tracking-wider text-muted-foreground flex items-center gap-2">
            <Monitor className="size-4 text-primary" />
            <span>{currentAlloc.room.name}</span>
          </div>
        )}

        {/* Sisi Kanan: Action Buttons */}
        <div
          style={{
            position: 'absolute',
            right: '4px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            zIndex: 20,
          }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={requestSync}
            title="Sinkronkan Data"
          >
            <RefreshCw className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>
        </div>
      </div>

      {/* Main Seat Grid Container — Exact generator-kursi SeatsTab dimensions */}
      <div
        className="seats-natural"
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <div
            className="seat-grid"
            style={{
              gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
            }}
          >
            {columns.map((column, colIdx) => (
              <div key={colIdx} className="seat-column">
                {/* Column Header: 36px 1fr 84px */}
                <div className="seat-column-header">
                  <span className="col-no">NO</span>
                  <span className="col-nim">NAMA</span>
                  <span className="col-asprak">KODE</span>
                </div>

                {/* Rows: 36px 1fr 84px, min-height 56px */}
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
                      className={[
                        'seat-row',
                        seat.isDisabled && 'disabled',
                        c ? 'occupied' : 'empty',
                        isSearchMatch && 'highlighted',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {/* Cell No: 36px, font-bold 14px */}
                      <span className="cell-no">{seat.seatNumber}</span>

                      {/* Cell NIM / Nama: 14px font-medium */}
                      <span className="cell-nim">
                        {seat.isDisabled ? (
                          <span className="text-xs text-destructive font-medium">PC Rusak</span>
                        ) : seat.isSpacedEmpty && !c ? (
                          <span className="text-xs text-muted-foreground italic">[ Jeda ]</span>
                        ) : !c ? (
                          <span className="text-xs text-muted-foreground">Kosong</span>
                        ) : (
                          <>
                            <span className="name-default font-medium leading-tight block">
                              {c.nama_lengkap}
                            </span>
                            <span className="text-[11px] font-mono text-muted-foreground block leading-none mt-0.5">
                              {c.nim}
                            </span>
                          </>
                        )}
                      </span>

                      {/* Cell Asprak: 84px, badge pill */}
                      <span className="cell-asprak">
                        {c ? (
                          <span className={`asprak-badge asprak-badge-${getAsprakVariant(c.kode)}`}>
                            {c.kode}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
