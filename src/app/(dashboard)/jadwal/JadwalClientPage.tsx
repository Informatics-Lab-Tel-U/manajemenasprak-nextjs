'use client';

import React, { useRef, useState } from 'react';
import {
  ChevronRight,
  Clock,
  Filter,
  MapPin,
  PaintBucket,
  Pencil,
  Plus,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { GroupColorModal } from '@/components/jadwal/GroupColorModal';
import JadwalImportCSVModal from '@/components/jadwal/JadwalImportCSVModal';
import { JadwalModal } from '@/components/jadwal/JadwalModal';
import { JadwalPenggantiModal } from '@/components/jadwal/JadwalPenggantiModal';
import JagaPanel from '@/components/jadwal/JagaPanel';
import { ScheduleCell } from '@/components/jadwal/ScheduleCell';
import { ROOMS } from '@/constants';
import { useJadwal } from '@/hooks/useJadwal';
import { useScheduleData } from '@/hooks/useScheduleData';
import * as jadwalFetcher from '@/lib/fetchers/jadwalFetcher';
import { CreateJadwalInput, UpdateJadwalInput } from '@/services/jadwalService';
import { Jadwal, MataKuliah } from '@/types/database';

interface JadwalClientPageProps {
  initialJadwal: Jadwal[];
  initialTerms: string[];
  initialMataKuliahList: MataKuliah[];
}

function JadwalTableSkeleton() {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-muted/30 border-b border-border">
          <th className="p-2 border-r border-border text-center min-w-[60px]">
            <Skeleton className="h-4 w-8 mx-auto" />
          </th>
          <th className="p-2 border-r border-border text-center min-w-[60px]">
            <Skeleton className="h-4 w-8 mx-auto" />
          </th>
          {Array.from({ length: 6 }).map((_, i) => (
            <th key={i} className="p-2 border-r border-border text-center min-w-[120px]">
              <Skeleton className="h-4 w-16 mx-auto" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 15 }).map((_, i) => (
          <tr key={i} className="border-b border-border/50">
            {i % 3 === 0 && (
              <td rowSpan={3} className="p-2 border-r border-border bg-muted/10 text-center">
                <Skeleton className="h-4 w-12 mx-auto" />
              </td>
            )}
            <td className="p-2 border-r border-border text-center">
              <Skeleton className="h-3 w-10 mx-auto" />
            </td>
            {Array.from({ length: 6 }).map((_, j) => (
              <td key={j} className="p-0 border-r border-border align-top relative min-w-[120px]">
                <div className="flex flex-col w-full h-full min-h-[60px] 2xl:min-h-[80px] p-1.5">
                  {(i + j) % 3 === 0 && (
                    <Skeleton className="flex-1 w-full rounded-md border border-border/50" />
                  )}
                </div>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const handleImportCSV = async (rows: CreateJadwalInput[]) => {
  const result = await jadwalFetcher.bulkImportJadwal(rows);
  if (result.ok) {
    toast.success(`Berhasil import ${result.data?.inserted} jadwal`);
    window.location.reload();
  } else {
    toast.error(`Gagal import: ${result.error}`);
  }
};

export default function JadwalClientPage({
  initialJadwal,
  initialTerms,
  initialMataKuliahList,
}: JadwalClientPageProps) {
  const [programType, setProgramType] = useState<'REGULER' | 'PJJ'>('REGULER');
  const [isEditMode, setIsEditMode] = useState(false);

  const {
    data: rawJadwalList,
    jadwalPengganti,
    selectedTerm,
    moduls,
    selectedModul,
    setSelectedModul,
    loading,
    mataKuliahList,
    addJadwal,
    editJadwal,
    removeJadwal,
    upsertPengganti,
  } = useJadwal(initialTerms[0], {
    jadwal: initialJadwal,
    terms: initialTerms,
    mataKuliah: initialMataKuliahList,
  });

  const [selectedJadwal, setSelectedJadwal] = useState<Jadwal | null>(null);
  const [showSessionId, setShowSessionId] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPenggantiModalOpen, setIsPenggantiModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<any | null>(null);

  // Drag & drop state
  const dragJadwalId = useRef<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [dragPenggantiTarget, setDragPenggantiTarget] = useState<{
    hari: string;
    sesi: number | null;
    jam: string;
    ruangan: string;
  } | null>(null);

  const handleOpenAdd = (prefill?: { hari?: string; sesi?: number; ruangan?: string }) => {
    if (prefill) {
      setModalInitialData({ _prefill: true, ...prefill });
    } else {
      setModalInitialData(null);
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (jadwal: Jadwal) => {
    setModalInitialData(jadwal);
    if (selectedModul !== 'Default') {
      setIsPenggantiModalOpen(true);
    } else {
      setIsModalOpen(true);
    }
    setSelectedJadwal(null);
  };

  const handleModalSubmit = async (input: CreateJadwalInput | UpdateJadwalInput) => {
    const hari = 'hari' in input ? input.hari : '';
    const sesi = 'sesi' in input ? input.sesi : null;
    const ruangan = 'ruangan' in input ? input.ruangan : '';
    const id = 'id' in input ? input.id : undefined;
    const inputKelas = 'kelas' in input ? (input.kelas as string) : '';
    const isEditingPJJ = inputKelas.toUpperCase().includes('PJJ');

    const conflict = rawJadwalList.find((j) => {
      if (id !== undefined && String(j.id) === String(id)) return false;

      const isExistingPJJ = j.kelas?.toUpperCase().includes('PJJ');
      if (isEditingPJJ || isExistingPJJ) return false;

      return j.hari === hari && j.sesi === Number(sesi) && j.ruangan === ruangan;
    });

    const conflictName = conflict?.mata_kuliah?.nama_lengkap || 'Mata Kuliah';
    const conflictClass = conflict?.kelas || 'Kelas';

    if (conflict) {
      toast.error(
        `Gagal: Jadwal bentrok dengan mata kuliah "${conflictName}" (${conflictClass}) di ${ruangan}, ${hari} Sesi ${sesi || (input as any).jam}.`
      );
      return;
    }

    const result =
      'id' in input
        ? await editJadwal(input as UpdateJadwalInput)
        : await addJadwal(input as CreateJadwalInput);

    if (!result.ok) {
      toast.error(`Gagal: ${result.error}`);
    } else {
      toast.success('Jadwal berhasil disimpan');
    }
  };

  const handlePenggantiSubmit = async (input: any) => {
    const result = await upsertPengganti(input);
    if (!result.ok) {
      toast.error(`Gagal: ${result.error}`);
      return false;
    }
    toast.success('Jadwal pengganti berhasil disimpan');
    return true;
  };

  const handleDeleteJadwal = async (id: string) => {
    try {
      const result = await removeJadwal(id);
      if (result.ok) {
        toast.success('Jadwal berhasil dihapus');
        setIsModalOpen(false);
        setSelectedJadwal(null);
      } else {
        toast.error(`Gagal menghapus jadwal: ${result.error}`);
      }
    } catch (e: any) {
      toast.error(`Terjadi kesalahan: ${e.message}`);
    }
  };

  const handleDuplicate = async (jadwal: Jadwal, matrix: any) => {
    const hari = jadwal.hari?.toUpperCase() || 'SENIN';
    const sesiKey = jadwal.sesi?.toString() || jadwal.jam || 'Unknown';

    const usedRooms = new Set<string>(Object.keys(matrix[hari]?.[sesiKey] || {}));

    const freeRoom = ROOMS.find((r) => !usedRooms.has(r)) || ROOMS[0];

    const result = await addJadwal({
      id_mk: jadwal.id_mk.toString(),
      kelas: jadwal.kelas,
      hari: jadwal.hari,
      sesi: jadwal.sesi ?? 0,
      jam: jadwal.jam,
      ruangan: freeRoom,
      total_asprak: jadwal.total_asprak ?? 1,
      dosen: jadwal.dosen || '',
    });

    if (!result.ok) {
      toast.error(`Gagal duplikat: ${result.error}`);
    } else {
      toast.success(`Jadwal diduplikat ke ${freeRoom}`);
    }
  };

  const handleDrop = async (
    e: React.DragEvent,
    targetHari: string,
    targetSesi: number | null,
    targetJam: string,
    targetRoom: string
  ) => {
    e.preventDefault();
    setDragOverCell(null);

    const id = dragJadwalId.current;
    dragJadwalId.current = null;
    if (!id) return;

    const jadwal = rawJadwalList.find((j) => j.id === id);
    if (!jadwal) return;

    if (selectedModul !== 'Default') {
      const conflict = processedJadwalList.find((j) => {
        const isPJJ = j.kelas?.toUpperCase().includes('PJJ');
        if (isPJJ) return false;
        return (
          j.id !== id &&
          j.hari === targetHari &&
          j.sesi === (targetSesi ?? 0) &&
          j.ruangan === targetRoom
        );
      });

      if (conflict) {
        toast.error(
          `Bentrok dengan "${conflict.mata_kuliah?.nama_lengkap}" (${conflict.kelas}) di ${targetRoom}`
        );
        return;
      }

      setDragPenggantiTarget({
        hari: targetHari,
        sesi: targetSesi,
        jam: targetJam,
        ruangan: targetRoom,
      });
      setModalInitialData(jadwal);
      setIsPenggantiModalOpen(true);
      return;
    }

    if (
      jadwal.hari === targetHari &&
      jadwal.sesi === targetSesi &&
      jadwal.ruangan === targetRoom
    ) {
      return;
    }

    const conflict = rawJadwalList.find((j) => {
      const isPJJ = j.kelas?.toUpperCase().includes('PJJ');
      if (isPJJ) return false;
      return (
        j.id !== id &&
        j.hari === targetHari &&
        j.sesi === (targetSesi ?? 0) &&
        j.ruangan === targetRoom
      );
    });

    if (conflict) {
      toast.error(
        `Bentrok dengan "${conflict.mata_kuliah?.nama_lengkap}" (${conflict.kelas}) di ${targetRoom}`
      );
      return;
    }

    const result = await editJadwal({
      id,
      hari: targetHari,
      sesi: targetSesi ?? 0,
      jam: targetJam,
      ruangan: targetRoom,
    });

    if (!result.ok) {
      toast.error(`Gagal memindahkan jadwal: ${result.error}`);
    } else {
      toast.success(
        `Jadwal dipindahkan ke ${targetRoom}, ${targetHari} Sesi ${targetSesi ?? targetJam}`
      );
    }
  };

  const { processedJadwalList, visibleDays, uniqueRooms, scheduleMatrix, dynamicSessionsByDay } =
    useScheduleData({
      rawJadwalList,
      jadwalPengganti,
      selectedModul,
      programType,
    });

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 relative space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              Jadwal Praktikum
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Jadwal per ruangan</p>
          </div>

          <ToggleGroup
            type="single"
            value={programType}
            onValueChange={(value) => {
              if (value) setProgramType(value as 'REGULER' | 'PJJ');
            }}
            variant="outline"
            className="*:data-[slot=toggle-group-item]:px-4! *:data-[slot=toggle-group-item]:min-h-11 sm:*:data-[slot=toggle-group-item]:min-h-9"
          >
            <ToggleGroupItem value="REGULER">Reguler</ToggleGroupItem>
            <ToggleGroupItem value="PJJ">PJJ</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex flex-wrap md:flex-nowrap gap-2 md:gap-3 items-center w-full md:w-auto">
          <div
            className={`flex items-center gap-2 px-3 min-h-11 sm:min-h-9 rounded-md border bg-transparent transition-colors ${
              isEditMode
                ? 'border-foreground/40 text-foreground'
                : 'border-border text-muted-foreground'
            }`}
          >
            <Pencil className="size-3.5 shrink-0" aria-hidden="true" />
            <Label
              htmlFor="edit-mode-switch"
              className="text-xs font-medium cursor-pointer whitespace-nowrap select-none text-inherit"
            >
              Mode Edit
            </Label>
            <Switch id="edit-mode-switch" checked={isEditMode} onCheckedChange={setIsEditMode} />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenAdd()}
            className="flex-1 sm:flex-none min-w-0 min-h-11 sm:min-h-9 md:whitespace-nowrap bg-transparent border-border hover:bg-accent/50"
          >
            <Plus className="size-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Tambah Jadwal</span>
          </Button>
          <Button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 sm:flex-none min-w-0 min-h-11 sm:min-h-9 md:whitespace-nowrap"
          >
            <Upload className="size-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Import CSV</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsColorModalOpen(true)}
            title="Atur Warna Grup"
            aria-label="Atur warna grup mata kuliah"
            className="px-2.5 sm:px-3 shrink-0 min-h-11 sm:min-h-9 bg-transparent border-border hover:bg-accent/50"
          >
            <PaintBucket className="size-4" aria-hidden="true" />
          </Button>
          <Select value={selectedModul} onValueChange={setSelectedModul}>
            <SelectTrigger
              aria-label="Pilih modul jadwal"
              className="w-full md:w-[180px] sm:max-w-[180px] min-h-11 sm:min-h-9 bg-transparent border-border"
            >
              <SelectValue placeholder="Pilih modul" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {moduls.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="w-full">
        <div
          aria-busy={loading || undefined}
          className="overflow-x-auto rounded-lg border border-border bg-transparent min-h-[400px]"
        >
          {loading && (
            <>
              <span className="sr-only">Memuat matriks jadwal praktikum</span>
              <JadwalTableSkeleton />
            </>
          )}

          {!loading && uniqueRooms.length > 0 && (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="p-2 border-r border-border text-center font-medium min-w-[60px] text-xs text-muted-foreground">
                    Hari
                  </th>
                  <th
                    className="p-2 border-r border-border text-center font-medium min-w-[60px] text-xs text-muted-foreground cursor-pointer hover:bg-muted/60 transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    onClick={() => setShowSessionId(!showSessionId)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setShowSessionId(!showSessionId);
                      }
                    }}
                    title="Klik untuk beralih antara Jam dan Sesi"
                  >
                    <div className="flex items-center justify-center gap-1">
                      {showSessionId ? 'Sesi' : 'Jam'}
                      <ChevronRight
                        className={`size-3 transition-transform ${showSessionId ? 'rotate-90' : ''}`}
                        aria-hidden="true"
                      />
                    </div>
                  </th>
                  {uniqueRooms.map((room) => (
                    <th
                      key={room}
                      className="p-2 border-r border-border text-center font-medium min-w-[120px] whitespace-nowrap text-xs text-foreground"
                    >
                      {room}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleDays.map((day) => {
                  const daySessions = dynamicSessionsByDay[day] || [];
                  if (daySessions.length === 0) return null;

                  return daySessions.map((session, sessionIndex) => {
                    const isFirstRow = sessionIndex === 0;

                    return (
                      <tr
                        key={`${day}-${session.rowKey}`}
                        className="hover:bg-muted/20 transition-colors border-b border-border/50"
                      >
                        {isFirstRow && (
                          <td
                            rowSpan={daySessions.length}
                            className="p-2 border-r border-b border-border text-center font-semibold bg-muted/10 align-middle text-sm text-foreground"
                          >
                            {day}
                          </td>
                        )}

                        <td
                          className="p-2 border-r border-border text-center font-medium text-muted-foreground text-xs tabular-nums cursor-pointer hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                          onClick={() => setShowSessionId(!showSessionId)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setShowSessionId(!showSessionId);
                            }
                          }}
                          title={showSessionId ? session.jam : `Sesi ${session.sesi ?? '-'}`}
                        >
                          {showSessionId ? (session.sesi ?? sessionIndex + 1) : session.jam}
                        </td>

                        {uniqueRooms.map((room) => {
                          const jadwals = scheduleMatrix[day]?.[session.rowKey]?.[room] || [];
                          const cellKey = `${day}-${session.rowKey}-${room}`;
                          const isDragTarget = dragOverCell === cellKey;

                          return (
                            <td
                              key={cellKey}
                              className={`p-0 border-r border-border align-top relative min-w-[120px] transition-colors ${
                                isEditMode && isDragTarget
                                  ? 'bg-accent/50 ring-2 ring-inset ring-foreground/40'
                                  : ''
                              }`}
                              onDragOver={
                                isEditMode
                                  ? (e) => {
                                      e.preventDefault();
                                      setDragOverCell(cellKey);
                                    }
                                  : undefined
                              }
                              onDragLeave={
                                isEditMode
                                  ? () => {
                                      setDragOverCell((prev) => (prev === cellKey ? null : prev));
                                    }
                                  : undefined
                              }
                              onDrop={
                                isEditMode
                                  ? (e) => {
                                      handleDrop(e, day, session.sesi, session.jam, room);
                                    }
                                  : undefined
                              }
                            >
                              <div className="flex flex-col w-full h-full min-h-[60px]">
                                {jadwals.map((jadwal) => (
                                  <ScheduleCell
                                    key={jadwal.id}
                                    jadwal={jadwal}
                                    onClick={
                                      isEditMode ? undefined : () => setSelectedJadwal(jadwal)
                                    }
                                    showAsprakCount={true}
                                    isEditMode={isEditMode}
                                    onDragStart={(e) => {
                                      dragJadwalId.current = jadwal.id;
                                      e.dataTransfer.effectAllowed = 'move';
                                    }}
                                    onDuplicate={() => handleDuplicate(jadwal, scheduleMatrix)}
                                  />
                                ))}

                                {isEditMode && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenAdd({
                                        hari: day,
                                        sesi: session.sesi ?? undefined,
                                        ruangan: room === 'Tanpa Ruangan' ? '' : room,
                                      })
                                    }
                                    aria-label={`Tambah jadwal di ${room}, ${day} Sesi ${session.sesi ?? session.jam}`}
                                    className="flex items-center justify-center w-full min-h-8 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors border-t border-dashed border-border first:border-t-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                                    title={`Tambah jadwal di ${room}, ${day} Sesi ${session.sesi ?? session.jam}`}
                                  >
                                    <Plus className="size-3.5" aria-hidden="true" />
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          )}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t border-border pt-3 px-3 pb-3">
            <div className="flex items-center gap-1.5">
              <div
                className="size-4 bg-muted rounded-[2px]"
                style={{
                  background: `linear-gradient(var(--muted), var(--muted)) padding-box, repeating-linear-gradient(45deg, #facc15, #facc15 5px, #ffffff 5px, #ffffff 10px) border-box`,
                  border: '3px solid transparent',
                }}
              />
              <span>Jadwal Pengganti</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3.5 rounded-sm bg-muted border border-border" />
              <span>Jadwal Reguler</span>
            </div>
            {isEditMode && (
              <div className="flex items-center gap-1.5 sm:ml-auto text-foreground">
                <Pencil className="size-3" aria-hidden="true" />
                <span>
                  Seret sel untuk pindah · ikon duplikat di pojok kanan · tombol + untuk tambah
                </span>
              </div>
            )}
          </div>

          {!loading && uniqueRooms.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground gap-2">
              <Filter className="size-10 opacity-30" aria-hidden="true" />
              <p className="text-sm">Belum ada jadwal pada term ini.</p>
            </div>
          )}
        </div>

        {/* Panel Jadwal Jaga Aslab */}
        <div className="hidden" style={{ height: 'calc(100vh - 120px)' }}>
          <JagaPanel term={selectedTerm} selectedModul={selectedModul} />
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedJadwal} onOpenChange={(v) => !v && setSelectedJadwal(null)}>
        <DialogContent showCloseButton={false} className="p-0 gap-0 overflow-hidden sm:max-w-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>Detail Jadwal</DialogTitle>
          </DialogHeader>
          {selectedJadwal && (
            <>
              <div className="relative p-6 pb-4 border-b border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedJadwal(null)}
                  aria-label="Tutup detail jadwal"
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>

                <div className="flex flex-wrap gap-2 mb-3 pr-10">
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-medium border border-border bg-transparent text-foreground">
                    {selectedJadwal.mata_kuliah?.program_studi || 'Umum'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-medium border border-border bg-transparent text-muted-foreground tabular-nums">
                    {selectedJadwal.sesi ? `Sesi ${selectedJadwal.sesi}` : 'Non-Sesi'}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-semibold leading-snug text-foreground mb-1 pr-8">
                  {selectedJadwal?.mata_kuliah?.nama_lengkap}
                </h2>
                <p className="text-sm font-medium text-muted-foreground">
                  Kelas {selectedJadwal?.kelas}
                </p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-transparent">
                    <Clock className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs text-muted-foreground">Waktu</p>
                      <p className="text-sm font-medium text-foreground tabular-nums">
                        {selectedJadwal?.hari}, {selectedJadwal?.jam}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-transparent">
                    <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs text-muted-foreground">Ruangan</p>
                      <p className="text-sm font-medium text-foreground">
                        {!selectedJadwal?.ruangan || selectedJadwal?.ruangan === 'Tanpa Ruangan'
                          ? '-'
                          : selectedJadwal?.ruangan}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-transparent">
                    <User className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs text-muted-foreground">Dosen</p>
                      <p className="text-sm font-medium text-foreground truncate">
                        {selectedJadwal?.dosen || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-transparent">
                    <Users className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs text-muted-foreground">Kebutuhan</p>
                      <p className="text-sm font-medium text-foreground tabular-nums">
                        {selectedJadwal?.total_asprak} Asprak
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border flex flex-wrap gap-2 justify-end items-center">
                <Button
                  type="button"
                  variant="destructive-outline"
                  onClick={() => {
                    if (
                      selectedJadwal &&
                      confirm('Apakah Anda yakin ingin menghapus jadwal ini?')
                    ) {
                      handleDeleteJadwal(selectedJadwal.id);
                    }
                  }}
                  className="mr-auto min-h-11 sm:min-h-9"
                >
                  Hapus Jadwal
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedJadwal(null)}
                  className="min-h-11 sm:min-h-9 bg-transparent border-border"
                >
                  Tutup
                </Button>

                <Button
                  type="button"
                  onClick={() => selectedJadwal && handleOpenEdit(selectedJadwal)}
                  className="min-h-11 sm:min-h-9"
                >
                  Edit Jadwal
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <JadwalModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalInitialData(null);
        }}
        onSubmit={handleModalSubmit}
        initialData={modalInitialData?._prefill ? null : modalInitialData}
        prefillData={modalInitialData?._prefill ? modalInitialData : undefined}
        mataKuliahList={mataKuliahList}
        isLoading={loading}
      />

      <JadwalPenggantiModal
        isOpen={isPenggantiModalOpen}
        onClose={() => {
          setIsPenggantiModalOpen(false);
          setDragPenggantiTarget(null);
        }}
        onSubmit={handlePenggantiSubmit}
        initialData={
          modalInitialData
            ? {
                id: modalInitialData.id,
                id_jadwal: modalInitialData.id,
                modul: parseInt(selectedModul.replace('Modul ', ''), 10) || 1,
                tanggal: modalInitialData.tanggal || '',
                hari: dragPenggantiTarget?.hari ?? modalInitialData.hari ?? 'SENIN',
                sesi: dragPenggantiTarget?.sesi ?? modalInitialData.sesi ?? 1,
                jam: dragPenggantiTarget?.jam ?? modalInitialData.jam ?? '06:30',
                ruangan: dragPenggantiTarget?.ruangan ?? modalInitialData.ruangan ?? '',
                jadwal: modalInitialData,
              }
            : null
        }
        mataKuliahList={mataKuliahList}
        allJadwal={rawJadwalList}
        isLoading={loading}
        currentTerm={selectedTerm}
        disableModul={selectedModul !== 'Default'}
      />

      <JadwalImportCSVModal
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportCSV}
        mataKuliahList={mataKuliahList}
        term={selectedTerm}
      />

      <GroupColorModal
        isOpen={isColorModalOpen}
        onClose={() => setIsColorModalOpen(false)}
        mataKuliahList={mataKuliahList}
      />
    </div>
  );
}
