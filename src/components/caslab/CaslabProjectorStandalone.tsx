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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 md:p-6 select-none font-sans">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800 bg-slate-900/90 rounded-2xl p-4 shadow-xl mb-6">
        <div className="flex items-center gap-3">
          <Link href="/generator/caslab">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-wide">
              DENAH KURSI SELEKSI CASLAB
            </h1>
            <p className="text-xs text-slate-400">
              Informatics Laboratory Telkom University
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Room Selector */}
          {allocations.length > 1 && (
            <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
              {allocations.map((alloc, idx) => (
                <button
                  key={alloc.room.id}
                  onClick={() => setSelectedRoomIdx(idx)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    selectedRoomIdx === idx
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {alloc.room.name} ({alloc.assignedCandidates.length})
                </button>
              ))}
            </div>
          )}

          {/* Search box */}
          <div className="relative w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Cari Meja / NIM / Kode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 rounded-xl"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={loadData}
            className="h-9 w-9 bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            className="h-9 w-9 bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Main Grid or Empty State */}
      {!currentAlloc || currentAlloc.seats.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
          <Monitor className="w-12 h-12 text-slate-600 mb-3" />
          <h2 className="text-lg font-bold text-slate-300">Belum Ada Data Plotting Aktif</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            Silakan buka halaman generator di dashboard panitia, upload data peserta Caslab, dan tekan tombol "Acak Plotting Kursi".
          </p>
          <Link href="/generator/caslab" className="mt-4">
            <Button size="sm" className="bg-blue-600 text-white text-xs">
              Buka Pengaturan Plotting
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex-1 space-y-4">
          {/* Front Banner */}
          <div className="w-full py-3 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs font-bold tracking-widest uppercase text-slate-400 flex items-center justify-center gap-2 shadow-md">
            <Monitor className="w-4 h-4 text-blue-400" />
            DEPAN / PAPAN TULIS ({currentAlloc.room.name})
          </div>

          {/* Seat Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-3">
            {currentAlloc.seats.map((seat) => {
              if (seat.isDisabled) {
                return (
                  <div
                    key={seat.seatNumber}
                    className="rounded-xl border border-rose-950 bg-rose-950/20 p-3 min-h-[115px] flex flex-col justify-between opacity-40"
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
                    className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-3 min-h-[115px] flex flex-col justify-between opacity-30"
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
                    className="rounded-xl border border-slate-800/60 bg-slate-900/20 p-3 min-h-[115px] flex flex-col justify-between opacity-30"
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
                  className={`rounded-xl p-3 min-h-[115px] flex flex-col justify-between transition-all duration-300 ${
                    matchesSearch
                      ? 'border-2 border-amber-400 bg-amber-500/25 ring-4 ring-amber-400/40 scale-105 z-10'
                      : 'border border-slate-800 bg-slate-900/90 shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      Meja #{String(seat.seatNumber).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Kode Aslab Huge Badge */}
                  <div className="text-center my-1.5">
                    <span className="inline-block font-mono font-black text-sm tracking-widest px-3 py-1 rounded-md bg-blue-600 text-white shadow-md">
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
      )}
    </div>
  );
}
