'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  Printer,
  FileText,
  DoorOpen,
  Tv,
  Download,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { exportSpreadsheet } from '@/lib/spreadsheet';
import { CaslabUploadDropzone } from './CaslabUploadDropzone';
import { CaslabCandidateTable } from './CaslabCandidateTable';
import { CaslabControlPanel } from './CaslabControlPanel';
import { CaslabRoomSeatGrid } from './CaslabRoomSeatGrid';
import { CaslabPrintViews } from './CaslabPrintViews';
import { CaslabProjectorModal } from './CaslabProjectorModal';
import {
  performUnifiedShuffle,
  swapCaslabSeats,
} from '@/utils/caslabShuffle';
import type {
  CaslabCandidate,
  CaslabRoomConfig,
  CaslabRoomAllocation,
  SeatingMode,
} from '@/types/caslab';

const STORAGE_KEY = 'caslab_plotting_state_v1';

const DEFAULT_ROOMS: [CaslabRoomConfig, CaslabRoomConfig] = [
  {
    id: 'room-1',
    name: 'TULT 0617 (Lab Multimedia)',
    capacity: 40,
    disabledSeats: [],
  },
  {
    id: 'room-2',
    name: 'TULT 0618 (Lab Riset)',
    capacity: 40,
    disabledSeats: [],
  },
];

export function CaslabPlottingClient() {
  const [candidates, setCandidates] = useState<CaslabCandidate[]>([]);
  const [numRooms, setNumRooms] = useState<1 | 2>(2);
  const [seatingMode, setSeatingMode] = useState<SeatingMode>('spaced');
  const [rooms, setRooms] = useState<[CaslabRoomConfig, CaslabRoomConfig]>(DEFAULT_ROOMS);
  const [allocations, setAllocations] = useState<CaslabRoomAllocation[]>([]);
  const [historyVersion, setHistoryVersion] = useState<number>(0);

  // Dialogs
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printType, setPrintType] = useState<'door' | 'attendance'>('door');
  const [projectorModalOpen, setProjectorModalOpen] = useState(false);

  // 1. Load state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.candidates)) setCandidates(parsed.candidates);
        if (parsed.numRooms === 1 || parsed.numRooms === 2) setNumRooms(parsed.numRooms);
        if (parsed.seatingMode === 'spaced' || parsed.seatingMode === 'dense') setSeatingMode(parsed.seatingMode);
        if (Array.isArray(parsed.rooms) && parsed.rooms.length === 2) setRooms(parsed.rooms);
        if (Array.isArray(parsed.allocations)) setAllocations(parsed.allocations);
        if (typeof parsed.historyVersion === 'number') setHistoryVersion(parsed.historyVersion);
      }
    } catch (e) {
      console.error('Failed to load Caslab state from localStorage:', e);
    }
  }, []);

  // 2. Persist state to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          candidates,
          numRooms,
          seatingMode,
          rooms,
          allocations,
          historyVersion,
        })
      );
    } catch (e) {
      console.error('Failed to save Caslab state to localStorage:', e);
    }
  }, [candidates, numRooms, seatingMode, rooms, allocations, historyVersion]);

  // Handle Candidates Loaded
  const handleCandidatesLoaded = useCallback(
    (newCandidates: CaslabCandidate[]) => {
      setCandidates(newCandidates);
      // Auto run initial shuffle
      const newAllocations = performUnifiedShuffle(newCandidates, numRooms, rooms, seatingMode);
      setAllocations(newAllocations);
      setHistoryVersion((v) => v + 1);
    },
    [numRooms, rooms, seatingMode]
  );

  // Handle Shuffle
  const handleShuffle = useCallback(() => {
    if (candidates.length === 0) {
      toast.error('Belum ada data calon aslab. Silakan upload file terlebih dahulu.');
      return;
    }
    const newAllocations = performUnifiedShuffle(candidates, numRooms, rooms, seatingMode);
    setAllocations(newAllocations);
    setHistoryVersion((v) => v + 1);
    toast.success(`Plotting kursi berhasil diacak! (Versi #${historyVersion + 1})`);
  }, [candidates, numRooms, rooms, seatingMode, historyVersion]);

  // Handle Re-Shuffle (Kocok Ulang)
  const handleReShuffle = useCallback(() => {
    if (candidates.length === 0) return;
    const newAllocations = performUnifiedShuffle(candidates, numRooms, rooms, seatingMode);
    setAllocations(newAllocations);
    setHistoryVersion((v) => v + 1);
    toast.success(
      `Kocok Ulang Selesai! Peserta telah diacak dan berotasi antar ruangan. (Versi #${historyVersion + 1})`
    );
  }, [candidates, numRooms, rooms, seatingMode, historyVersion]);

  // Handle Update Candidate (e.g. edit Kode)
  const handleUpdateCandidate = useCallback((id: string, updated: Partial<CaslabCandidate>) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
    );
    // Also update allocations if candidate is seated
    setAllocations((prev) =>
      prev.map((alloc) => ({
        ...alloc,
        seats: alloc.seats.map((s) =>
          s.candidate?.id === id
            ? { ...s, candidate: { ...s.candidate, ...updated } }
            : s
        ),
        assignedCandidates: alloc.assignedCandidates.map((c) =>
          c.id === id ? { ...c, ...updated } : c
        ),
      }))
    );
  }, []);

  // Handle Remove Candidate
  const handleRemoveCandidate = useCallback((id: string) => {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
    // Remove from allocations
    setAllocations((prev) =>
      prev.map((alloc) => ({
        ...alloc,
        seats: alloc.seats.map((s) =>
          s.candidate?.id === id ? { ...s, candidate: null } : s
        ),
        assignedCandidates: alloc.assignedCandidates.filter((c) => c.id !== id),
      }))
    );
    toast.success('Peserta dihapus dari daftar.');
  }, []);

  // Handle Clear All
  const handleClearAll = useCallback(() => {
    if (confirm('Apakah Anda yakin ingin menghapus seluruh data peserta Caslab?')) {
      setCandidates([]);
      setAllocations([]);
      setHistoryVersion(0);
      localStorage.removeItem(STORAGE_KEY);
      toast.success('Seluruh data berhasil dibersihkan.');
    }
  }, []);

  // Handle Room Config Change
  const handleRoomChange = useCallback(
    (index: 0 | 1, updated: Partial<CaslabRoomConfig>) => {
      setRooms((prev) => {
        const next: [CaslabRoomConfig, CaslabRoomConfig] = [{ ...prev[0] }, { ...prev[1] }];
        next[index] = { ...next[index], ...updated };
        return next;
      });
    },
    []
  );

  // Handle Toggle Disabled Seat (PC Rusak)
  const handleToggleDisabledSeat = useCallback(
    (roomId: string, seatNumber: number) => {
      setRooms((prev) => {
        const next: [CaslabRoomConfig, CaslabRoomConfig] = [{ ...prev[0] }, { ...prev[1] }];
        const rIdx = next.findIndex((r) => r.id === roomId);
        if (rIdx === -1) return prev;

        const currentDisabled = new Set(next[rIdx].disabledSeats);
        if (currentDisabled.has(seatNumber)) {
          currentDisabled.delete(seatNumber);
          toast.success(`Meja #${seatNumber} diaktifkan kembali.`);
        } else {
          currentDisabled.add(seatNumber);
          toast.warning(`Meja #${seatNumber} ditandai sebagai PC Rusak / Nonaktif.`);
        }
        next[rIdx].disabledSeats = Array.from(currentDisabled);
        return next;
      });

      // Update in active allocations
      setAllocations((prev) =>
        prev.map((alloc) => {
          if (alloc.room.id !== roomId) return alloc;
          return {
            ...alloc,
            room: {
              ...alloc.room,
              disabledSeats: alloc.room.disabledSeats.includes(seatNumber)
                ? alloc.room.disabledSeats.filter((s) => s !== seatNumber)
                : [...alloc.room.disabledSeats, seatNumber],
            },
            seats: alloc.seats.map((seat) => {
              if (seat.seatNumber !== seatNumber) return seat;
              const willBeDisabled = !seat.isDisabled;
              return {
                ...seat,
                isDisabled: willBeDisabled,
                // if disabled, remove candidate
                candidate: willBeDisabled ? null : seat.candidate,
              };
            }),
          };
        })
      );
    },
    []
  );

  // Handle Swap Seats
  const handleSwapSeats = useCallback(
    (
      sourceRoomId: string,
      sourceSeatNum: number,
      targetRoomId: string,
      targetSeatNum: number
    ) => {
      setAllocations((prev) =>
        swapCaslabSeats(prev, sourceRoomId, sourceSeatNum, targetRoomId, targetSeatNum)
      );
    },
    []
  );

  // Reset Plotting
  const handleResetPlotting = useCallback(() => {
    if (confirm('Reset seluruh kursi ujian? Peserta akan dikembalikan ke status belum di-plot.')) {
      setAllocations([]);
      toast.info('Layout kursi di-reset.');
    }
  }, []);

  // Export to Excel
  const handleExportExcel = async () => {
    if (allocations.length === 0) {
      toast.error('Belum ada data alokasi kursi untuk diekspor.');
      return;
    }

    try {
      const exportRows: any[] = [];
      allocations.forEach((alloc) => {
        alloc.seats.forEach((seat) => {
          if (seat.candidate) {
            exportRows.push({
              'Ruangan': alloc.room.name,
              'No Meja': seat.seatNumber,
              'Kode Aslab': seat.candidate.kode,
              'NIM': seat.candidate.nim,
              'Nama Lengkap': seat.candidate.nama_lengkap,
            });
          }
        });
      });

      if (exportRows.length === 0) {
        toast.error('Tidak ada peserta yang terplot.');
        return;
      }

      await exportSpreadsheet(
        exportRows,
        `Plotting_Kursi_Caslab_${new Date().toISOString().slice(0, 10)}.xlsx`,
        'Plotting Caslab',
        'xlsx'
      );
      toast.success('File hasil plotting Excel berhasil diunduh!');
    } catch {
      toast.error('Gagal mengekspor file Excel.');
    }
  };

  const isShuffled = allocations.length > 0 && allocations.some((a) => a.assignedCandidates.length > 0);

  return (
    <div className="w-full space-y-6">
      {/* Top Action Bar */}
      {isShuffled && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/40 border border-border/80 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-foreground">
              Plotting Aktif: {candidates.length} Calon Aslab terbagi dalam {numRooms} Ruangan
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="text-xs h-8 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Ekspor Excel
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPrintType('door');
                setPrintModalOpen(true);
              }}
              className="text-xs h-8 gap-1.5"
            >
              <DoorOpen className="w-3.5 h-3.5" />
              Cetak Lembar Pintu
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPrintType('attendance');
                setPrintModalOpen(true);
              }}
              className="text-xs h-8 gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              Cetak Presensi Pengawas
            </Button>

            <Button
              size="sm"
              onClick={() => setProjectorModalOpen(true)}
              className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground font-semibold"
            >
              <Tv className="w-3.5 h-3.5" />
              Mode Proyektor
            </Button>
          </div>
        </div>
      )}

      {/* 1. Upload Dropzone */}
      <CaslabUploadDropzone
        onCandidatesLoaded={handleCandidatesLoaded}
        candidateCount={candidates.length}
      />

      {/* Candidate Table Preview */}
      <CaslabCandidateTable
        candidates={candidates}
        onUpdateCandidate={handleUpdateCandidate}
        onRemoveCandidate={handleRemoveCandidate}
        onClearAll={handleClearAll}
      />

      {/* 2. Control Panel */}
      <CaslabControlPanel
        candidateCount={candidates.length}
        numRooms={numRooms}
        onNumRoomsChange={setNumRooms}
        seatingMode={seatingMode}
        onSeatingModeChange={setSeatingMode}
        rooms={rooms}
        onRoomChange={handleRoomChange}
        onShuffle={handleShuffle}
        onReShuffle={handleReShuffle}
        onResetPlotting={handleResetPlotting}
        isShuffled={isShuffled}
        historyVersion={historyVersion}
      />

      {/* 3. Seat Grid Layout */}
      {isShuffled && (
        <CaslabRoomSeatGrid
          allocations={allocations}
          onToggleDisabledSeat={handleToggleDisabledSeat}
          onSwapSeats={handleSwapSeats}
        />
      )}

      {/* Print Modal Dialog */}
      <CaslabPrintViews
        allocations={allocations}
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        type={printType}
      />

      {/* Projector Fullscreen Modal */}
      <CaslabProjectorModal
        allocations={allocations}
        open={projectorModalOpen}
        onOpenChange={setProjectorModalOpen}
      />
    </div>
  );
}
