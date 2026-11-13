'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowUpDown,
  SlidersHorizontal,
  Shuffle,
  LayoutGrid,
  Trash2,
  Loader2,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { exportSpreadsheet } from '@/lib/spreadsheet';
import { CaslabDataTable } from './CaslabDataTable';
import { CaslabRoomSeatGrid } from './CaslabRoomSeatGrid';
import { CaslabSettingsModal } from './CaslabSettingsModal';
import { CaslabImportExportModal } from './CaslabImportExportModal';
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
const ALL_ROOMS_VALUE = '__all_rooms__';

const DEFAULT_ROOMS: [CaslabRoomConfig, CaslabRoomConfig] = [
  {
    id: 'room-1',
    name: 'TULT 0604',
    capacity: 40,
    disabledSeats: [],
  },
  {
    id: 'room-2',
    name: 'TULT 0605',
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
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [activeTab, setActiveTab] = useState('table');

  const availableRooms = useMemo(() => {
    return Array.from(new Set(allocations.map((a) => a.room.name)));
  }, [allocations]);

  // Database persistence state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Load from database on mount (falls back to localStorage if offline/not saved)
  useEffect(() => {
    let isMounted = true;
    const loadFromDb = async () => {
      try {
        const response = await fetch('/api/caslab', { cache: 'no-store' });
        if (response.ok) {
          const result = await response.json();
          if (result.ok && result.data && isMounted) {
            const dbData = result.data;
            if (Array.isArray(dbData.candidates)) setCandidates(dbData.candidates);
            if (dbData.numRooms === 1 || dbData.numRooms === 2) setNumRooms(dbData.numRooms);
            if (dbData.seatingMode === 'spaced' || dbData.seatingMode === 'dense') setSeatingMode(dbData.seatingMode);
            if (Array.isArray(dbData.rooms) && dbData.rooms.length === 2) setRooms(dbData.rooms);
            if (Array.isArray(dbData.allocations)) setAllocations(dbData.allocations);
            if (typeof dbData.historyVersion === 'number') setHistoryVersion(dbData.historyVersion);
            if (result.updatedAt) setLastSavedAt(result.updatedAt);
          }
        }
      } catch (err) {
        console.warn('Could not sync Caslab state from DB:', err);
      }
    };

    loadFromDb();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save to database function
  const saveToDatabase = useCallback(
    async (
      customPayload?: Partial<{
        candidates: CaslabCandidate[];
        numRooms: 1 | 2;
        seatingMode: SeatingMode;
        rooms: [CaslabRoomConfig, CaslabRoomConfig];
        allocations: CaslabRoomAllocation[];
        historyVersion: number;
      }>,
      silent = false
    ) => {
      try {
        setIsSaving(true);
        const payload = {
          candidates: customPayload?.candidates ?? candidates,
          numRooms: customPayload?.numRooms ?? numRooms,
          seatingMode: customPayload?.seatingMode ?? seatingMode,
          rooms: customPayload?.rooms ?? rooms,
          allocations: customPayload?.allocations ?? allocations,
          historyVersion: customPayload?.historyVersion ?? historyVersion,
        };

        const response = await fetch('/api/caslab', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (!response.ok || !result.ok) {
          throw new Error(result.error || 'Gagal menyimpan ke database');
        }

        const savedTime = result.updatedAt || new Date().toISOString();
        setLastSavedAt(savedTime);
        if (!silent) {
          toast.success('Data plotting berhasil disimpan ke database.');
        }
      } catch (err: any) {
        console.error('Error saving caslab state to DB:', err);
        toast.error(err.message || 'Gagal menyimpan data ke database.');
      } finally {
        setIsSaving(false);
      }
    },
    [candidates, numRooms, seatingMode, rooms, allocations, historyVersion]
  );

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
      const nextVersion = historyVersion + 1;
      setHistoryVersion(nextVersion);
      toast.success(`${newCandidates.length} data peserta berhasil di-import.`);
      saveToDatabase(
        {
          candidates: newCandidates,
          allocations: newAllocations,
          historyVersion: nextVersion,
        },
        true
      );
    },
    [numRooms, rooms, seatingMode, historyVersion, saveToDatabase]
  );

  // Handle Shuffle
  const handleShuffle = useCallback(() => {
    if (candidates.length === 0) {
      toast.error('Belum ada data peserta. Silakan import file terlebih dahulu.');
      return;
    }
    const newAllocations = performUnifiedShuffle(candidates, numRooms, rooms, seatingMode);
    setAllocations(newAllocations);
    const nextVersion = historyVersion + 1;
    setHistoryVersion(nextVersion);
    toast.success(`Kursi berhasil diacak (Acakan #${nextVersion}).`);
    saveToDatabase(
      {
        candidates,
        numRooms,
        seatingMode,
        rooms,
        allocations: newAllocations,
        historyVersion: nextVersion,
      },
      true
    );
  }, [candidates, numRooms, rooms, seatingMode, historyVersion, saveToDatabase]);

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

      let newAllocations: CaslabRoomAllocation[] | undefined;
      // Re-apply shuffle with new settings if candidates exist
      if (candidates.length > 0) {
        newAllocations = performUnifiedShuffle(candidates, newNumRooms, newRooms, newSeatingMode);
        setAllocations(newAllocations);
        const nextVersion = historyVersion + 1;
        setHistoryVersion(nextVersion);
        toast.success('Pengaturan disimpan dan denah kursi diperbarui.');
      } else {
        toast.success('Pengaturan berhasil disimpan.');
      }

      saveToDatabase(
        {
          numRooms: newNumRooms,
          seatingMode: newSeatingMode,
          rooms: newRooms,
          allocations: newAllocations ?? allocations,
          historyVersion: candidates.length > 0 ? historyVersion + 1 : historyVersion,
        },
        true
      );
    },
    [candidates, allocations, historyVersion, saveToDatabase]
  );

  // Handle Candidate Update (e.g. edit Kode Aslab)
  const handleUpdateCandidate = useCallback(
    (id: string, updated: Partial<CaslabCandidate>) => {
      const nextCandidates = candidates.map((c) => (c.id === id ? { ...c, ...updated } : c));
      const nextAllocations = allocations.map((alloc) => ({
        ...alloc,
        seats: alloc.seats.map((s) =>
          s.candidate?.id === id
            ? { ...s, candidate: { ...s.candidate, ...updated } }
            : s
        ),
        assignedCandidates: alloc.assignedCandidates.map((c) =>
          c.id === id ? { ...c, ...updated } : c
        ),
      }));

      setCandidates(nextCandidates);
      setAllocations(nextAllocations);
      saveToDatabase({ candidates: nextCandidates, allocations: nextAllocations }, true);
    },
    [candidates, allocations, saveToDatabase]
  );

  // Handle Candidate Removal
  const handleRemoveCandidate = useCallback(
    (id: string) => {
      const nextCandidates = candidates.filter((c) => c.id !== id);
      const nextAllocations = allocations.map((alloc) => ({
        ...alloc,
        seats: alloc.seats.map((s) =>
          s.candidate?.id === id ? { ...s, candidate: null } : s
        ),
        assignedCandidates: alloc.assignedCandidates.filter((c) => c.id !== id),
      }));

      setCandidates(nextCandidates);
      setAllocations(nextAllocations);
      saveToDatabase({ candidates: nextCandidates, allocations: nextAllocations }, true);
      toast.success('Peserta dihapus dari daftar.');
    },
    [candidates, allocations, saveToDatabase]
  );

  // Handle Toggle Disabled Seat (PC Rusak)
  const handleToggleDisabledSeat = useCallback(
    (roomId: string, seatNumber: number) => {
      const nextRooms: [CaslabRoomConfig, CaslabRoomConfig] = [{ ...rooms[0] }, { ...rooms[1] }];
      const rIdx = nextRooms.findIndex((r) => r.id === roomId);
      if (rIdx === -1) return;

      const currentDisabled = new Set(nextRooms[rIdx].disabledSeats);
      if (currentDisabled.has(seatNumber)) {
        currentDisabled.delete(seatNumber);
        toast.success(`Meja #${seatNumber} diaktifkan kembali.`);
      } else {
        currentDisabled.add(seatNumber);
        toast.warning(`Meja #${seatNumber} ditandai sebagai PC Rusak.`);
      }
      nextRooms[rIdx].disabledSeats = Array.from(currentDisabled);

      const nextAllocations = allocations.map((alloc) => {
        if (alloc.room.id !== roomId) return alloc;
        return {
          ...alloc,
          room: {
            ...alloc.room,
            disabledSeats: nextRooms[rIdx].disabledSeats,
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
      });

      setRooms(nextRooms);
      setAllocations(nextAllocations);
      saveToDatabase({ rooms: nextRooms, allocations: nextAllocations }, true);
    },
    [rooms, allocations, saveToDatabase]
  );

  // Handle Swap Seats
  const handleSwapSeats = useCallback(
    (
      sourceRoomId: string,
      sourceSeatNum: number,
      targetRoomId: string,
      targetSeatNum: number
    ) => {
      const nextAllocations = swapCaslabSeats(
        allocations,
        sourceRoomId,
        sourceSeatNum,
        targetRoomId,
        targetSeatNum
      );
      setAllocations(nextAllocations);
      saveToDatabase({ allocations: nextAllocations }, true);
    },
    [allocations, saveToDatabase]
  );

  // Handle Delete All
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const handleDeleteAll = async () => {
    try {
      setIsDeletingAll(true);
      setCandidates([]);
      setAllocations([]);
      setRooms(DEFAULT_ROOMS);
      setNumRooms(2);
      setSeatingMode('spaced');
      setHistoryVersion(0);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}

      const res = await fetch('/api/caslab', { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Gagal menghapus data di database.');
      }

      toast.success('Seluruh data peserta dan plotting berhasil dihapus.');
      setShowDeleteAllDialog(false);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus data.');
    } finally {
      setIsDeletingAll(false);
    }
  };

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
  const seatedCount = allocations.reduce(
    (acc, alloc) => acc + alloc.seats.filter((s) => s.candidate !== null).length,
    0
  );

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 relative space-y-6">
      {/* Header — Exactly matching PraktikanClientPage */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">
            Plotting Kursi Caslab
          </h1>
          <p className="text-sm 2xl:text-base text-muted-foreground mt-1">
            Plotting dan penataan kursi ujian calon asisten laboratorium.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 md:gap-3 items-center w-full md:w-auto">
          {/* Import / Export Modal Trigger */}
          <Button
            variant="outline"
            onClick={() => setShowImportExportModal(true)}
            className="flex-1 md:flex-none min-w-0 md:whitespace-nowrap"
          >
            <ArrowUpDown size={18} className="flex-shrink-0" />
            <span className="hidden sm:inline ml-1">Import / Export</span>
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

          {/* Hapus Semua (Matching PraktikanClientPage) */}
          <Button
            variant="destructive"
            onClick={() => setShowDeleteAllDialog(true)}
            disabled={candidates.length === 0}
            className="flex-1 md:flex-none min-w-0 md:whitespace-nowrap bg-red-600 hover:bg-red-700 dark:bg-red-900 dark:hover:bg-red-800"
          >
            <Trash2 size={18} className="flex-shrink-0" />
            <span className="hidden sm:inline ml-1">Hapus Semua</span>
          </Button>
        </div>
      </div>

      {/* Main Tabs (DataTable vs Layout Denah) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {activeTab === 'table' ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, NIM, atau kode..."
                  className="pl-8"
                />
              </div>

              {availableRooms.length > 1 && (
                <Select
                  value={roomFilter || ALL_ROOMS_VALUE}
                  onValueChange={(val) => setRoomFilter(val === ALL_ROOMS_VALUE ? '' : val)}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Semua Ruangan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_ROOMS_VALUE}>Semua Ruangan</SelectItem>
                    {availableRooms.map((room) => (
                      <SelectItem key={room} value={room}>
                        {room}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : (
            <div />
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 lg:ml-auto">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">
                {numRooms} Ruangan
              </Badge>
              <Badge variant="outline">
                {seatingMode === 'spaced' ? 'Berselang' : 'Sebelahan'}
              </Badge>
            </div>

            <TabsList>
              <TabsTrigger value="table">
                Peserta ({candidates.length})
              </TabsTrigger>
              <TabsTrigger value="layout">
                Denah Kursi
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Tab 1: DataTable (Sama persis dengan /data-praktikan) */}
        <TabsContent value="table" className="mt-0">
          <CaslabDataTable
            candidates={candidates}
            allocations={allocations}
            searchQuery={searchQuery}
            roomFilter={roomFilter}
            onUpdateCandidate={handleUpdateCandidate}
            onRemoveCandidate={handleRemoveCandidate}
          />
        </TabsContent>

        {/* Tab 2: Denah Kursi */}
        <TabsContent value="layout" className="mt-0">
          {!isShuffled ? (
            <div className="flex flex-col items-center justify-center p-12 border rounded-md text-center bg-card">
              <LayoutGrid className="size-9 text-muted-foreground mb-3" />
              <h3 className="text-sm font-medium text-foreground">Kursi belum diacak</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {candidates.length > 0
                  ? `${candidates.length} peserta siap di-plot.`
                  : 'Import peserta terlebih dahulu untuk mengacak kursi.'}
              </p>
              <Button
                size="sm"
                onClick={handleShuffle}
                disabled={candidates.length === 0}
                className="mt-4 gap-1.5"
              >
                <Shuffle size={16} />
                Acak Kursi
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

      <CaslabImportExportModal
        open={showImportExportModal}
        onOpenChange={setShowImportExportModal}
        onImportComplete={handleImportComplete}
        onExportExcel={handleExportExcel}
        candidateCount={candidates.length}
        seatedCount={seatedCount}
        isShuffled={isShuffled}
      />

      {/* Dialog Konfirmasi Hapus Semua */}
      <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus Seluruh Data Plotting?</DialogTitle>
            <DialogDescription>
              Tindakan ini akan menghapus semua data ({candidates.length} peserta) dan penataan denah kursi dari sistem serta database secara permanen. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteAllDialog(false)}
              disabled={isDeletingAll}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={isDeletingAll}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-900 dark:hover:bg-red-800 gap-1.5"
            >
              {isDeletingAll ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Ya, Hapus Semua
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
