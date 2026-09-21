"use client";

/* eslint-disable react-doctor/no-impure-state-updater */
import React, { useState, useRef } from 'react';
import { useJadwal } from '@/hooks/useJadwal';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Filter,
  X,
  Clock,
  MapPin,
  User,
  Users,
  ChevronRight,
  Plus,
  Upload,
  PaintBucket,
  Pencil,
} from 'lucide-react';
import { Jadwal, MataKuliah } from '@/types/database';
import { JadwalModal } from '@/components/jadwal/JadwalModal';
import { ScheduleCell } from '@/components/jadwal/ScheduleCell';
import JadwalImportCSVModal from '@/components/jadwal/JadwalImportCSVModal';
import { GroupColorModal } from '@/components/jadwal/GroupColorModal';
import { JadwalPenggantiModal } from '@/components/jadwal/JadwalPenggantiModal';
import { CreateJadwalInput, UpdateJadwalInput } from '@/services/jadwalService';
import { useScheduleData } from '@/hooks/useScheduleData';
import * as jadwalFetcher from '@/lib/fetchers/jadwalFetcher';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import JagaPanel from '@/components/jadwal/JagaPanel';
import { ROOMS } from '@/constants';

interface JadwalClientPageProps {
  initialJadwal: Jadwal[];
  initialTerms: string[];
  initialMataKuliahList: MataKuliah[];
}

function JadwalTableSkeleton() {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-muted/50 border-b border-border">
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
              <td rowSpan={3} className="p-2 border-r border-border bg-muted/5 text-center">
                <Skeleton className="h-4 w-12 mx-auto" />
              </td>
            )}
            <td className="p-2 border-r border-border text-center">
              <Skeleton className="h-3 w-10 mx-auto" />
            </td>
            {Array.from({ length: 6 }).map((_, j) => (
              <td key={j} className="p-0 border-r border-border align-top relative min-w-[120px]">
                <div className="flex flex-col w-full h-full min-h-[60px] 2xl:min-h-[80px] p-1.5">
                  {(i + j) % 3 === 0 && <Skeleton className="flex-1 w-full rounded-md shadow-sm border border-border/50" />}
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
      const isExistingPJJ = j.kelas?.toUpperCase().includes('PJJ');
      if (isEditingPJJ || isExistingPJJ) return false;

      return (
        Number(j.id) !== Number(id) &&
        j.hari === hari &&
        j.sesi === Number(sesi) &&
        j.ruangan === ruangan
      );
    });

    const conflictName = conflict?.mata_kuliah?.nama_lengkap || 'Unknown Course';
    const conflictClass = conflict?.kelas || 'Unknown Class';

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
    } else {
      toast.success('Jadwal pengganti berhasil disimpan');
      return true;
    }
  };

  const handleDeleteJadwal = async (id: string) => {
    try {
      const result = await removeJadwal(id);
      if (result.ok) {
        toast.success('Jadwal berhasil dihapus');
        setIsModalOpen(false);
      } else {
        toast.error(`Gagal menghapus jadwal: ${result.error}`);
      }
    } catch (e: any) {
      toast.error(`Terjadi kesalahan: ${e.message}`);
    }
  };

  const handleDuplicate = async (jadwal: Jadwal, scheduleMatrix: any) => {
    const hari = jadwal.hari?.toUpperCase() || 'SENIN';
    const sesiKey = jadwal.sesi?.toString() || jadwal.jam || 'Unknown';

    const usedRooms = new Set<string>(
      Object.keys(scheduleMatrix[hari]?.[sesiKey] || {})
    );

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
    if (!id) return;

    const jadwal = rawJadwalList.find((j) => j.id === id);
    if (!jadwal) return;

    if (
      jadwal.hari === targetHari &&
      jadwal.sesi === targetSesi &&
      jadwal.ruangan === targetRoom
    ) {
      return;
    }

    // Check conflict
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
      toast.success(`Jadwal dipindahkan ke ${targetRoom}, ${targetHari} Sesi ${targetSesi ?? targetJam}`);
    }

    dragJadwalId.current = null;
  };

  const { visibleDays, uniqueRooms, scheduleMatrix, dynamicSessionsByDay } = useScheduleData({
    rawJadwalList,
    jadwalPengganti,
    selectedModul,
    programType,
  });

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 relative space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
          <div>
            <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">Jadwal Praktikum</h1>
            <p className="text-sm 2xl:text-base text-muted-foreground mt-1">Overview jadwal per ruangan</p>
          </div>

          <ToggleGroup
            type="single"
            value={programType}
            onValueChange={(value) => {
              if (value) setProgramType(value as 'REGULER' | 'PJJ');
            }}
            variant="outline"
            className="*:data-[slot=toggle-group-item]:px-4!"
          >
            <ToggleGroupItem value="REGULER">Reguler</ToggleGroupItem>
            <ToggleGroupItem value="PJJ">PJJ</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex flex-wrap md:flex-nowrap gap-2 md:gap-3 items-center w-full md:w-auto">
          {/* Edit Mode toggle */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
              isEditMode
                ? 'border-primary/40 bg-primary/5'
                : 'border-border bg-muted/20'
            }`}
          >
            <Pencil
              size={14}
              className={`shrink-0 transition-colors ${isEditMode ? 'text-primary' : 'text-muted-foreground'}`}
            />
            <Label
              htmlFor="edit-mode-switch"
              className={`text-xs font-medium cursor-pointer whitespace-nowrap select-none ${
                isEditMode ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Mode Edit
            </Label>
            <Switch
              id="edit-mode-switch"
              checked={isEditMode}
              onCheckedChange={setIsEditMode}
              className="scale-90"
            />
          </div>

          <Button
            variant="outline"
            onClick={() => handleOpenAdd()}
            className="flex-1 sm:flex-none min-w-0 md:whitespace-nowrap"
          >
            <Plus size={18} className="shrink-0" />
            <span className="hidden sm:inline ml-2">Tambah Jadwal</span>
          </Button>
          <Button
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 sm:flex-none min-w-0 md:whitespace-nowrap"
          >
            <Upload size={18} className="shrink-0" />
            <span className="hidden sm:inline ml-2">Import CSV</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsColorModalOpen(true)}
            title="Atur Warna Grup"
            className="px-2 sm:px-3 shrink-0"
          >
            <PaintBucket size={18} />
          </Button>
          <Select value={selectedModul} onValueChange={setSelectedModul}>
            <SelectTrigger className="w-full md:w-[180px] sm:max-w-[180px]">
              <SelectValue placeholder="Select modul" />
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
        <div className="overflow-x-auto rounded-lg border border-border shadow-sm bg-card/50 backdrop-blur-sm min-h-[400px]">
          {loading && (
            <div className="animate-pulse">
              <JadwalTableSkeleton />
            </div>
          )}

          {!loading && uniqueRooms.length > 0 && (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="p-2 border-r border-border text-center font-bold min-w-[60px] text-xs uppercase text-muted-foreground">
                    Hari
                  </th>
                  <th
                    className="p-2 border-r border-border text-center font-bold min-w-[60px] text-xs uppercase text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors select-none group"
                    onClick={() => setShowSessionId(!showSessionId)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setShowSessionId(!showSessionId);
                      }
                    }}
                    title="Click to toggle between Time/Session"
                  >
                    <div className="flex items-center justify-center gap-1">
                      {showSessionId ? 'SESI' : 'JAM'}
                      <ChevronRight
                        size={12}
                        className={`transition-transform ${showSessionId ? 'rotate-90' : ''}`}
                      />
                    </div>
                  </th>
                  {uniqueRooms.map((room) => (
                    <th
                      key={room}
                      className="p-2 border-r border-border text-center font-bold min-w-[120px] whitespace-nowrap text-xs"
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
                        className="hover:bg-muted/30 transition-colors border-b border-border/50"
                      >
                        {isFirstRow && (
                          <td
                            rowSpan={daySessions.length}
                            className="p-2 border-r border-border border-b border-border text-center font-bold bg-muted/10 align-middle text-sm"
                          >
                            {day}
                          </td>
                        )}

                        <td
                          className="p-2 border-r border-border text-center font-medium text-muted-foreground text-xs cursor-pointer hover:bg-muted/50"
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
                                  ? 'bg-primary/10 ring-2 ring-inset ring-primary/40'
                                  : ''
                              }`}
                              onDragOver={isEditMode ? (e) => {
                                e.preventDefault();
                                setDragOverCell(cellKey);
                              } : undefined}
                              onDragLeave={isEditMode ? () => {
                                setDragOverCell((prev) => prev === cellKey ? null : prev);
                              } : undefined}
                              onDrop={isEditMode ? (e) => {
                                handleDrop(e, day, session.sesi, session.jam, room);
                              } : undefined}
                            >
                              <div className="flex flex-col w-full h-full min-h-[60px]">
                                {jadwals.map((jadwal) => (
                                  <ScheduleCell
                                    key={jadwal.id}
                                    jadwal={jadwal}
                                    onClick={isEditMode ? undefined : () => setSelectedJadwal(jadwal)}
                                    showAsprakCount={true}
                                    isEditMode={isEditMode}
                                    onDragStart={(e) => {
                                      dragJadwalId.current = jadwal.id;
                                      e.dataTransfer.effectAllowed = 'move';
                                    }}
                                    onDuplicate={() => handleDuplicate(jadwal, scheduleMatrix)}
                                  />
                                ))}

                                {/* Add button — shown in edit mode */}
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
                                    className="flex items-center justify-center w-full min-h-[28px] py-1 text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-colors border-t border-dashed border-muted-foreground/20 first:border-t-0"
                                    title={`Tambah jadwal di ${room}, ${day} Sesi ${session.sesi ?? session.jam}`}
                                  >
                                    <Plus size={12} />
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
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground border-t border-border/50 pt-3 px-2">
            <div className="flex items-center gap-1.5">
              <div
                className="w-4 h-4 bg-muted rounded-[2px]"
                style={{
                  background: `linear-gradient(var(--muted), var(--muted)) padding-box, repeating-linear-gradient(45deg, #facc15, #facc15 5px, #ffffff 5px, #ffffff 10px) border-box`,
                  border: '3px solid transparent',
                }}
              ></div>
              <span>Jadwal Pengganti</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-sm bg-muted border border-border"></div>
              <span>Jadwal Reguler</span>
            </div>
            {isEditMode && (
              <div className="flex items-center gap-1.5 ml-auto text-primary/70">
                <Pencil size={11} />
                <span>Drag untuk pindah • icon duplikat di pojok kanan atas • tombol + untuk tambah</span>
              </div>
            )}
          </div>

          {!loading && uniqueRooms.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
              <Filter size={48} className="mb-4 opacity-20" />
              <p>No schedule data found for this term.</p>
            </div>
          )}
        </div>

        {/* Panel Jadwal Jaga Aslab */}
        <div className="hidden" style={{ height: 'calc(100vh - 120px)' }}>
          <JagaPanel term={selectedTerm} selectedModul={selectedModul} />
        </div>
      </div>

      {/* Detail Modal — only available outside edit mode */}
      <Dialog open={!!selectedJadwal} onOpenChange={(v) => !v && setSelectedJadwal(null)}>
        <DialogContent showCloseButton={false} className="p-0 gap-0 overflow-hidden sm:max-w-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>Detail Jadwal</DialogTitle>
          </DialogHeader>
          {selectedJadwal && (
            <>
              {/* Header */}
              <div className="relative p-6 pb-4 border-b border-border/50">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedJadwal(null)}
                  className="absolute top-4 right-4 rounded-full hover:bg-muted text-muted-foreground"
                >
                  <X size={20} />
                </Button>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                    {selectedJadwal.mata_kuliah?.program_studi || 'N/A'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground">
                    {selectedJadwal.sesi ? `Sesi ${selectedJadwal.sesi}` : 'Non-Sesi'}
                  </span>
                </div>

                <h2 className="text-xl md:text-2xl font-bold leading-tight mb-1">
                  {selectedJadwal?.mata_kuliah?.nama_lengkap}
                </h2>
                <p className="text-lg font-medium text-foreground/80">
                  Kelas {selectedJadwal?.kelas}
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
                    <Clock className="text-muted-foreground mt-0.5 shrink-0" size={18} />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Waktu
                      </p>
                      <p className="text-sm font-semibold">
                        {selectedJadwal?.hari}, {selectedJadwal?.jam}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
                    <MapPin className="text-muted-foreground mt-0.5 shrink-0" size={18} />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Ruangan
                      </p>
                      <p className="text-sm font-semibold">
                        {!selectedJadwal?.ruangan || selectedJadwal?.ruangan === 'Tanpa Ruangan'
                          ? '-'
                          : selectedJadwal?.ruangan}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
                    <User className="text-muted-foreground mt-0.5 shrink-0" size={18} />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Dosen
                      </p>
                      <p className="text-sm font-semibold">{selectedJadwal?.dosen || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
                    <Users className="text-muted-foreground mt-0.5 shrink-0" size={18} />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Kebutuhan
                      </p>
                      <p className="text-sm font-semibold">{selectedJadwal?.total_asprak} Asprak</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/20 border-t border-border/50 text-right">
                <div className="flex gap-2 justify-end items-center">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (
                        selectedJadwal &&
                        confirm('Apakah Anda yakin ingin menghapus jadwal ini?')
                      ) {
                        handleDeleteJadwal(selectedJadwal.id);
                      }
                    }}
                    className="mr-auto"
                  >
                    Hapus Jadwal
                  </Button>

                  <Button variant="outline" onClick={() => setSelectedJadwal(null)}>
                    Tutup
                  </Button>

                  <Button
                    onClick={() => selectedJadwal && handleOpenEdit(selectedJadwal)}
                  >
                    Edit Jadwal
                  </Button>
                </div>
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
        onClose={() => setIsPenggantiModalOpen(false)}
        onSubmit={handlePenggantiSubmit}
        initialData={
          modalInitialData
            ? {
                id: modalInitialData.id,
                id_jadwal: modalInitialData.id,
                modul: parseInt(selectedModul.replace('Modul ', '')) || 1,
                tanggal: modalInitialData.tanggal || '',
                hari: modalInitialData.hari || 'SENIN',
                sesi: modalInitialData.sesi || 1,
                jam: modalInitialData.jam || '06:30',
                ruangan: modalInitialData.ruangan || '',
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
