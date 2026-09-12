/* eslint-disable react-doctor/no-impure-state-updater */
/* eslint-disable react-doctor/exhaustive-deps */
'use client';

import React, { useState, useMemo, useCallback, useEffect, useDeferredValue } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useTermStore } from '@/store/useTermStore';
import { Search, X, ChevronRight, Users, Calendar } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import type { Asprak, Jadwal, Praktikum } from '@/types/database';
import { Field, FieldGroup } from '@/components/ui/field';

import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

const VIOLATION_TYPES = [
  'TELAT NILAI',
  'TELAT DATANG',
  'TIDAK DATANG',
  'LALAI ATURAN PAKAIAN',
  'LAIN LAIN',
] as const;

type ViolationType = (typeof VIOLATION_TYPES)[number];

type SidePanel = 'asprak' | 'jadwal' | null;

interface PelanggaranFormProps {
  onSubmit: (data: {
    id_asprak: string[];
    id_jadwal: string;
    jenis: string;
    modul: number;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isDepsLoading?: boolean;
  praktikumList: Praktikum[];
  tahunAjaranList: string[];
  asprakList: (Asprak & { praktikum_ids?: string[] })[];
  jadwalList: (Jadwal & { id_praktikum?: string })[];
  initialTahunAjaran?: string;
  initialPraktikumId?: string;
  initialModul?: string;
}

export default function PelanggaranForm({
  onSubmit,
  onCancel,
  isLoading = false,
  isDepsLoading = false,
  praktikumList,
  tahunAjaranList,
  asprakList,
  jadwalList,
  initialTahunAjaran = '',
  initialPraktikumId = '',
  initialModul = '',
}: PelanggaranFormProps) {
  const { activeTerm } = useTermStore();

  const [contextState, updateContextState] = React.useReducer(
    (prev: any, next: any) => ({ ...prev, ...next }),
    { 
      selectedPraktikumId: initialPraktikumId, 
      modul: initialModul 
    }
  );
  const { selectedPraktikumId, modul } = contextState;
  const selectedTahunAjaran = activeTerm || '';


  // Sync state if initial props change (e.g. after data fetch in parent)
  useEffect(() => {
    updateContextState({
      ...(initialPraktikumId && { selectedPraktikumId: initialPraktikumId }),
      ...(initialModul && { modul: initialModul })
    });
  }, [initialPraktikumId, initialModul]);

  const [selectedAsprakIds, setSelectedAsprakIds] = useState<string[]>([]);
  const [idJadwal, setIdJadwal] = useState('');
  const [jenis, setJenis] = useState('');

  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [asprakSearch, setAsprakSearch] = useState('');
  const [jadwalSearch, setJadwalSearch] = useState('');
  const deferredAsprakSearch = useDeferredValue(asprakSearch);
  const deferredJadwalSearch = useDeferredValue(jadwalSearch);

  function openPanel(panel: SidePanel) {
    setSidePanel(panel);
  }

  function closePanel() {
    setSidePanel(null);
    setAsprakSearch('');
    setJadwalSearch('');
  }

  const resetViolationFields = useCallback(() => {
    setSelectedAsprakIds([]);
    setIdJadwal('');
    setJenis('');
    updateContextState({ modul: '' });
    setAsprakSearch('');
    setJadwalSearch('');
    setSidePanel(null);
  }, []);

  const filteredPraktikumList = useMemo(
    () =>
      selectedTahunAjaran
        ? praktikumList.filter((p) => p.tahun_ajaran === selectedTahunAjaran)
        : praktikumList,
    [praktikumList, selectedTahunAjaran]
  );

  const filteredAsprak = useMemo(() => {
    let list = asprakList;
    if (selectedPraktikumId) {
      const assigned = list.filter(
        (a) => a.praktikum_ids && a.praktikum_ids.length > 0 && a.praktikum_ids.includes(selectedPraktikumId)
      );
      if (assigned.length > 0) {
        list = assigned;
      }
    }
    if (deferredAsprakSearch.trim()) {
      const q = deferredAsprakSearch.toLowerCase();
      list = list.filter(
        (a) =>
          a.nama_lengkap.toLowerCase().includes(q) ||
          a.kode.toLowerCase().includes(q) ||
          a.nim.toLowerCase().includes(q)
      );
    }
    return list;
  }, [asprakList, selectedPraktikumId, deferredAsprakSearch]);

  const filteredJadwal = useMemo(() => {
    let list = jadwalList;
    if (selectedPraktikumId) {
      list = list.filter((j) => j.id_praktikum === selectedPraktikumId);
    }
    if (deferredJadwalSearch.trim()) {
      const q = deferredJadwalSearch.toLowerCase();
      list = list.filter(
        (j) =>
          j.kelas.toLowerCase().includes(q) ||
          (j.mata_kuliah?.nama_lengkap ?? '').toLowerCase().includes(q) ||
          j.hari.toLowerCase().includes(q)
      );
    }
    return list;
  }, [jadwalList, selectedPraktikumId, deferredJadwalSearch]);

  const selectedJadwal = useMemo(
    () => jadwalList.find((j) => j.id === idJadwal),
    [jadwalList, idJadwal]
  );

  function toggleAsprak(id: string) {
    setSelectedAsprakIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const finalModul = parseInt(modul);

    if (!selectedTahunAjaran || !selectedPraktikumId) {
      toast.error('Pilih Tahun Ajaran dan Nama Praktikum terlebih dahulu');
      return;
    }
    if (selectedAsprakIds.length === 0) {
      toast.error('Pilih minimal 1 Asprak');
      return;
    }
    if (!idJadwal || !jenis || !modul) {
      toast.error('Mohon lengkapi semua field yang wajib');
      return;
    }

    await onSubmit({
      id_asprak: selectedAsprakIds,
      id_jadwal: idJadwal,
      jenis,
      modul: finalModul,
    });
  }

  const contextReady = !!selectedTahunAjaran && !!selectedPraktikumId;

  const sidePanelContent =
    sidePanel === 'asprak' ? (
      <div className="flex flex-col h-full p-2">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 font-medium text-sm">
            <Users className="h-4 w-4 text-primary" />
            Pilih Asprak
          </div>
        </div>

        {/* search */}
        <div className="px-3 pt-2 pb-4 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nama, kode, atau NIM..."
              value={asprakSearch}
              onChange={(e) => setAsprakSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* selected count badge */}
        {selectedAsprakIds.length > 0 && (
          <div className="px-3 py-1.5 border-b bg-primary/5 text-xs text-primary flex items-center gap-1.5">
            <span className="font-semibold">{selectedAsprakIds.length}</span> asprak dipilih
            <button
              type="button"
              onClick={() => setSelectedAsprakIds([])}
              className="ml-auto text-muted-foreground hover:text-foreground"
            >
              Hapus semua
            </button>
          </div>
        )}

        {/* list */}
        <div className="flex-1 overflow-y-auto">
          {isDepsLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
              <Spinner className="h-5 w-5" />
              <span className="text-xs">Memuat daftar asprak...</span>
            </div>
          ) : filteredAsprak.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Tidak ada asprak</p>
          ) : (
            (() => {
              const selectedSet = new Set(selectedAsprakIds);
              return filteredAsprak.map((a) => {
                const checked = selectedSet.has(a.id);
              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer border-b border-border/40 last:border-0
                    ${checked ? 'bg-primary/5' : 'hover:bg-accent'}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleAsprak(a.id);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    toggleAsprak(a.id);
                  }}
                >
                  <Checkbox
                    checked={checked}
                    className="pointer-events-none flex-shrink-0"
                    tabIndex={-1}
                  />
                  <div className="leading-tight min-w-0">
                    <div className="text-sm font-medium truncate">{a.nama_lengkap}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.kode} · {a.nim}
                    </div>
                  </div>
                </div>
              );
            });
          })()
          )}
        </div>
      </div>
    ) : sidePanel === 'jadwal' ? (
      <div className="flex flex-col h-full p-2">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 font-medium text-sm">
            <Calendar className="h-4 w-4 text-primary" />
            Pilih Jadwal
          </div>
        </div>

        <div className="px-3 pt-2 pb-4 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Kelas, hari, atau nama MK..."
              value={jadwalSearch}
              onChange={(e) => setJadwalSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isDepsLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
              <Spinner className="h-5 w-5" />
              <span className="text-xs">Memuat daftar jadwal...</span>
            </div>
          ) : filteredJadwal.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Tidak ada jadwal</p>
          ) : (
            filteredJadwal.map((j) => {
              const selected = idJadwal === j.id;
              const currentModulNum = parseInt(modul);
              const substitute = j.jadwal_pengganti?.find((jp) => jp.modul === currentModulNum);

              return (
                <div
                  key={j.id}
                  className={`px-3 py-2.5 cursor-pointer border-b border-border/40 last:border-0
                    ${selected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-accent'}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIdJadwal(j.id);
                      closePanel();
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIdJadwal(j.id);
                    closePanel();
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{j.kelas}</div>
                    {substitute && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 px-1 bg-amber-500/10 text-amber-600 border-amber-200 uppercase font-bold tracking-tight"
                      >
                        Pengganti
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                    {substitute ? (
                      <div className="flex flex-col">
                        <span className="font-semibold text-amber-600">
                          {substitute.hari} · {substitute.jam}
                        </span>
                        <span className="text-[10px] opacity-80">
                          (
                          {new Date(substitute.tanggal).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            timeZone: 'Asia/Jakarta'
                          })}
                          )
                        </span>
                      </div>
                    ) : (
                      <div>
                        {j.hari} · {j.jam}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    ) : null;

  return (
    <DialogContent
      className={`!flex !flex-col !gap-0 !p-0 overflow-hidden transition-[max-width,width] duration-200 ease-in-out
        ${
          sidePanel
            ? '!max-w-[min(780px,95vw)] !w-[min(780px,95vw)]'
            : '!max-w-[min(520px,95vw)] !w-[min(520px,95vw)]'
        }
        h-[min(640px,85vh)]`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
        <DialogHeader className="border-b px-6 py-4 shrink-0">
          <DialogTitle>Catat Pelanggaran Baru</DialogTitle>
          <DialogDescription className="sr-only">
            Form untuk mencatat pelanggaran asprak praktikum
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 min-w-0">
          {/* ── LEFT: Form ── */}
          <div className="flex flex-col flex-1 min-w-0 min-h-0">
            <FieldGroup className="flex-1 overflow-y-auto px-6 py-4">
              {(!initialTahunAjaran || !initialPraktikumId) && (
                <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3 mb-6">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Konteks Pelanggaran
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <Label>Tahun Ajaran</Label>
                      <div className="h-9 flex items-center px-3 border border-border/50 bg-muted/20 rounded-md text-sm font-medium">
                        {selectedTahunAjaran}
                      </div>
                    </Field>
                    <Field>
                      <Label>Nama Praktikum *</Label>
                      <Select
                        value={selectedPraktikumId}
                        onValueChange={(v) => {
                          updateContextState({ selectedPraktikumId: v, modul: '' });
                          resetViolationFields();
                        }}
                        disabled={!selectedTahunAjaran}
                      >
                        <SelectTrigger className="w-full h-9">
                          <SelectValue placeholder="Pilih Praktikum" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredPraktikumList.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nama}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </div>
              )}

              <FieldGroup
                className={`transition-opacity ${
                  contextReady ? 'opacity-100' : 'opacity-40 pointer-events-none'
                }`}
              >
                <Field>
                  <Label>Asprak yang Melanggar *</Label>
                  {selectedAsprakIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {selectedAsprakIds.map((id) => {
                        const a = asprakList.find((x) => x.id === id);
                        if (!a) return null;
                        return (
                          <Badge key={id} variant="secondary" className="gap-1 pr-1 text-xs">
                            {a.kode}
                            <button
                              type="button"
                              aria-label="Hapus asprak dari daftar"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                toggleAsprak(id);
                              }}
                              className="ml-0.5 rounded-full hover:bg-muted"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => openPanel(sidePanel === 'asprak' ? null : 'asprak')}
                    className={`w-full flex items-center justify-between h-9 rounded-md border px-3 py-2 text-sm text-left transition-colors
                      ${
                        sidePanel === 'asprak'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-input bg-transparent hover:bg-accent text-muted-foreground'
                      }`}
                  >
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4 flex-shrink-0" />
                      {selectedAsprakIds.length === 0
                        ? 'Pilih Asprak...'
                        : `${selectedAsprakIds.length} asprak dipilih`}
                    </span>
                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                  </button>

                  {selectedAsprakIds.length > 1 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      ⚠ Multi-pilih: semua asprak akan dicatat dengan jenis, modul, dan kelas yang
                      sama.
                    </p>
                  )}
                </Field>

                <Field>
                  <Label>Modul *</Label>
                  <Select value={modul} onValueChange={(v) => updateContextState({ modul: v })}>
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="Pilih Modul" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {Array.from({ length: 16 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            Modul {i + 1}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <Label>Kelas / Jadwal *</Label>
                  <button
                    type="button"
                    onClick={() => openPanel(sidePanel === 'jadwal' ? null : 'jadwal')}
                    className={`w-full flex items-center justify-between h-9 rounded-md border px-3 py-2 text-sm text-left transition-colors
                      ${
                        sidePanel === 'jadwal'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-input bg-transparent hover:bg-accent'
                      }`}
                  >
                    <span
                      className={`flex items-center gap-2 min-w-0 ${
                        selectedJadwal ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {selectedJadwal ? (
                          <>
                            {selectedJadwal.kelas}{' '}
                            {(() => {
                              const currentModulNum = parseInt(modul);
                              const sub = selectedJadwal.jadwal_pengganti?.find(
                                (jp) => jp.modul === currentModulNum
                              );
                              return sub ? (
                                <span className="text-amber-600 font-semibold">
                                  ({sub.hari} · PENGGANTI)
                                </span>
                              ) : (
                                `(${selectedJadwal.hari})`
                              );
                            })()}
                          </>
                        ) : (
                          'Pilih Jadwal / Kelas...'
                        )}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  </button>
                </Field>
                <Field>
                  <Label>Jenis Pelanggaran *</Label>
                  <Select value={jenis} onValueChange={setJenis}>
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="Pilih Jenis Pelanggaran" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {VIOLATION_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </FieldGroup>

            <DialogFooter className="px-6 py-4 border-t bg-background shrink-0 mt-auto">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                  className="h-8"
                  disabled={isLoading}
                >
                  Batal
                </Button>
              </DialogClose>
              <Button type="submit" size="sm" className="h-8" disabled={isLoading || !contextReady}>
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" /> Menyimpan...
                  </>
                ) : (
                  'Catat Pelanggaran'
                )}
              </Button>
            </DialogFooter>
          </div>

          {/* ── RIGHT: Side Panel ── */}
          {sidePanel && (
            <div className="w-72 flex-shrink-0 border-l border-border bg-background flex flex-col min-h-0 overflow-hidden">
              {sidePanelContent}
            </div>
          )}
        </div>
      </form>
    </DialogContent>
  );
}
