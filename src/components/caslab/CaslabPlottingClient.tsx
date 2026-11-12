'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  SlidersHorizontal,
  Download,
  Printer,
  DoorOpen,
  FileText,
  Tv,
  Shuffle,
  Users,
  LayoutGrid,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { exportSpreadsheet } from '@/lib/spreadsheet';
import { CaslabDataTable } from './CaslabDataTable';
import { CaslabRoomSeatGrid } from './CaslabRoomSeatGrid';
import { CaslabSettingsModal } from './CaslabSettingsModal';
import { CaslabImportModal } from './CaslabImportModal';
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

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printType, setPrintType] = useState<'door' | 'attendance'>('door');
  const [showProjector, setShowProjector] = useState(false);

  // Load from localStorage
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

  // Save to localStorage
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

  // Handle Import
  const handleImportComplete = useCallback(
    (newCandidates: CaslabCandidate[]) => {
      setCandidates(newCandidates);
      const newAllocations = performUnifiedShuffle(newCandidates, numRooms, rooms, seatingMode);
      setAllocations(newAllocations);
      setHistoryVersion((v) => v + 1);
      toast.success(`${newCandidates.length} data calon aslab berhasil dimuat & diacak!`);
    },
    [numRooms, rooms, seatingMode]
  );

  // Handle Shuffle
  const handleShuffle = useCallback(() => {
    if (candidates.length === 0) {
      toast.error('Belum ada data calon aslab. Silakan import file terlebih dahulu.');
      return;
    }
    const newAllocations = performUnifiedShuffle(candidates, numRooms, rooms, seatingMode);
    setAllocations(newAllocations);
    setHistoryVersion((v) => v + 1);
    toast.success(`Plotting kursi berhasil diacak! (Kocokan #${historyVersion + 1})`);
  }, [candidates, numRooms, rooms, seatingMode, historyVersion]);

  // Handle Settings Save
  const handleSettingsSave = useCallback(
    (
      newNumRooms: 1 | 2,
      newSeatingMode: SeatingMode,
      newRooms: [CaslabRoomConfig, CaslabRoomConfig]
    ) => {
      setNumRooms(newNumRooms);
      setSeatingMode(newSeatingMode);
      setRooms(newRooms);

      // Re-apply shuffle with new settings if candidates exist
      if (candidates.length > 0) {
        const newAllocations = performUnifiedShuffle(candidates, newNumRooms, newRooms, newSeatingMode);
        setAllocations(newAllocations);
        setHistoryVersion((v) => v + 1);
        toast.success('Pengaturan disimpan dan denah kursi diperbarui.');
      } else {
        toast.success('Pengaturan berhasil disimpan.');
      }
    },
    [candidates]
  );

  // Handle Candidate Update (e.g. edit Kode Aslab)
  const handleUpdateCandidate = useCallback((id: string, updated: Partial<CaslabCandidate>) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
    );
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

  // Handle Candidate Removal
  const handleRemoveCandidate = useCallback((id: string) => {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
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
          toast.warning(`Meja #${seatNumber} ditandai sebagai PC Rusak.`);
        }
        next[rIdx].disabledSeats = Array.from(currentDisabled);
        return next;
      });

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

  // Export Excel
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
              'No Meja': seat.seatNumber,
              'Ruangan': alloc.room.name,
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
      toast.success('Data plotting berhasil diekspor.');
    } catch {
      toast.error('Gagal mengekspor data Excel.');
    }
  };

  const isShuffled = allocations.length > 0 && allocations.some((a) => a.assignedCandidates.length > 0);

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 relative space-y-6">
      {/* Header — Exactly matching PraktikanClientPage */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">
            Plotting Kursi Caslab
          </h1>
          <p className="text-sm 2xl:text-base text-muted-foreground mt-1">
            Kelola alokasi dan pengacakan kursi ujian calon asisten laboratorium
          </p>
        </div>

        <div className="flex flex-wrap gap-2 md:gap-3 items-center w-full md:w-auto">
          {/* Import Data */}
          <Button
            variant="outline"
            onClick={() => setShowImportModal(true)}
            className="flex-1 md:flex-none min-w-0 md:whitespace-nowrap"
          >
            <Upload size={18} className="flex-shrink-0" />
            <span className="hidden sm:inline ml-1">Import Data</span>
          </Button>

          {/* Pengaturan Ruangan Modal */}
          <Button
            variant="outline"
            onClick={() => setShowSettingsModal(true)}
            className="flex-1 md:flex-none min-w-0 md:whitespace-nowrap"
          >
            <SlidersHorizontal size={18} className="flex-shrink-0" />
            <span className="hidden sm:inline ml-1">Pengaturan</span>
          </Button>

          {/* Export Excel */}
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={!isShuffled}
            className="flex-1 md:flex-none min-w-0 md:whitespace-nowrap"
          >
            <Download size={18} className="flex-shrink-0" />
            <span className="hidden sm:inline ml-1">Export Excel</span>
          </Button>

          {/* Cetak Dokumen Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={!isShuffled}
                className="flex-1 md:flex-none min-w-0 md:whitespace-nowrap"
              >
                <Printer size={18} className="flex-shrink-0" />
                <span className="hidden sm:inline ml-1">Cetak Dokumen</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setPrintType('door');
                  setShowPrintModal(true);
                }}
              >
                <DoorOpen className="h-4 w-4 mr-2" />
                Lembar Pintu Masuk
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setPrintType('attendance');
                  setShowPrintModal(true);
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Berita Acara & Presensi Pengawas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Proyektor */}
          <Button
            variant="outline"
            onClick={() => setShowProjector(true)}
            disabled={!isShuffled}
            className="flex-1 md:flex-none min-w-0 md:whitespace-nowrap"
          >
            <Tv size={18} className="flex-shrink-0" />
            <span className="hidden sm:inline ml-1">Layar Proyektor</span>
          </Button>

          {/* Acak Plotting Kursi */}
          <Button
            onClick={handleShuffle}
            disabled={candidates.length === 0}
            className="flex-1 md:flex-none min-w-0 md:whitespace-nowrap"
          >
            <Shuffle size={18} className="flex-shrink-0" />
            <span className="hidden sm:inline ml-1">
              {isShuffled ? 'Kocok Ulang' : 'Acak Kursi'}
            </span>
          </Button>
        </div>
      </div>

      {/* Main Tabs (DataTable vs Layout Denah) */}
      <Tabs defaultValue="table" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
          <TabsList>
            <TabsTrigger value="table" className="text-xs">
              Daftar Tabel Peserta ({candidates.length})
            </TabsTrigger>
            <TabsTrigger value="layout" className="text-xs">
              Denah Layout Kursi
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="font-normal text-[11px]">
              {numRooms} Ruangan ({rooms.slice(0, numRooms).map((r) => r.name).join(' & ')})
            </Badge>
            <Badge variant="secondary" className="font-normal text-[11px]">
              Mode {seatingMode === 'spaced' ? 'Berselang' : 'Sebelahan'}
            </Badge>
          </div>
        </div>

        {/* Tab 1: DataTable (Mirip /data-praktikan) */}
        <TabsContent value="table" className="mt-0">
          {candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border rounded-md text-center bg-muted/10">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-base font-semibold text-foreground">Belum Ada Data Calon Aslab</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Silakan import data calon aslab menggunakan format file Excel (.xlsx) atau CSV untuk memulai pengacakan kursi.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowImportModal(true)}
                className="mt-4 text-xs gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                Import File Caslab
              </Button>
            </div>
          ) : (
            <CaslabDataTable
              candidates={candidates}
              allocations={allocations}
              onUpdateCandidate={handleUpdateCandidate}
              onRemoveCandidate={handleRemoveCandidate}
            />
          )}
        </TabsContent>

        {/* Tab 2: Denah Kursi */}
        <TabsContent value="layout" className="mt-0">
          {!isShuffled ? (
            <div className="flex flex-col items-center justify-center p-12 border rounded-md text-center bg-muted/10">
              <LayoutGrid className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-base font-semibold text-foreground">Kursi Belum Diacak</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Data calon aslab telah siap ({candidates.length} orang). Tekan tombol <strong>"Acak Kursi"</strong> di pojok kanan atas untuk menata layout kursi ruangan lab.
              </p>
              <Button
                size="sm"
                onClick={handleShuffle}
                disabled={candidates.length === 0}
                className="mt-4 text-xs gap-1.5"
              >
                <Shuffle className="h-3.5 w-3.5" />
                Acak Plotting Kursi Sekarang
              </Button>
            </div>
          ) : (
            <CaslabRoomSeatGrid
              allocations={allocations}
              onToggleDisabledSeat={handleToggleDisabledSeat}
              onSwapSeats={handleSwapSeats}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CaslabSettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        numRooms={numRooms}
        seatingMode={seatingMode}
        rooms={rooms}
        candidateCount={candidates.length}
        onSave={handleSettingsSave}
      />

      <CaslabImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onImportComplete={handleImportComplete}
      />

      <CaslabPrintViews
        allocations={allocations}
        open={showPrintModal}
        onOpenChange={setShowPrintModal}
        type={printType}
      />

      <CaslabProjectorModal
        allocations={allocations}
        open={showProjector}
        onOpenChange={setShowProjector}
      />
    </div>
  );
}
