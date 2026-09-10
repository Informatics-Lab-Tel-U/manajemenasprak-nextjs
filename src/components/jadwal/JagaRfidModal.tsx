/* eslint-disable react-doctor/no-impure-state-updater */
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, ChevronsUpDown, Search, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { Asprak } from '@/types/database';
import { fetchAllAsprak } from '@/lib/fetchers/asprakFetcher';
import { assignRfidToAsprak, transferRfidToAsprak, submitManualPresensi } from '@/lib/fetchers/jagaFetcher';
import { getJagaShiftsByDay } from '@/utils/jagaUtils';

interface JagaRfidModalProps {
  isOpen: boolean;
  onClose: () => void;
  term: string;
  selectedModul: number;
  onSuccess?: () => void;
}

export default function JagaRfidModal({
  isOpen,
  onClose,
  term,
  selectedModul,
  onSuccess,
}: JagaRfidModalProps) {
  const [activeTab, setActiveTab] = useState<'rfid' | 'transfer' | 'manual'>('rfid');
  const [asprakList, setAsprakList] = useState<Asprak[]>([]);
  const [loading, setLoading] = useState(false);

  const [openAsprakRfid, setOpenAsprakRfid] = useState(false);
  const [searchQueryRfid, setSearchQueryRfid] = useState('');

  const [openAsprakSource, setOpenAsprakSource] = useState(false);
  const [searchQuerySource, setSearchQuerySource] = useState('');
  const [selectedSourceAsprakId, setSelectedSourceAsprakId] = useState('');

  const [openAsprakTarget, setOpenAsprakTarget] = useState(false);
  const [searchQueryTarget, setSearchQueryTarget] = useState('');
  const [selectedTargetAsprakId, setSelectedTargetAsprakId] = useState('');

  const [openAsprakManual, setOpenAsprakManual] = useState(false);
  const [searchQueryManual, setSearchQueryManual] = useState('');

  const [selectedAsprakIdRfid, setSelectedAsprakIdRfid] = useState('');
  const [rfidInput, setRfidInput] = useState('');

  const [selectedAsprakIdManual, setSelectedAsprakIdManual] = useState('');
  const [selectedHari, setSelectedHari] = useState('SENIN');
  const [selectedShift, setSelectedShift] = useState('1');
  const [status, setStatus] = useState('HADIR');

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      hasLoadedRef.current = false;
      return;
    }

    if (hasLoadedRef.current) return;

    let active = true;

    const init = async () => {
      setLoading(true);

      const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
      const nowDay = dayNames[new Date().getDay()];
      if (['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'].includes(nowDay)) {
        setSelectedHari(nowDay);
      }

      const { data } = await fetchAllAsprak(); // fetch semua asprak, bukan hanya yang di term aktif
      if (active) {
        if (data) {
          const sorted = [...data].sort((a, b) => {
            if (a.role === 'ASLAB' && b.role !== 'ASLAB') return -1;
            if (a.role !== 'ASLAB' && b.role === 'ASLAB') return 1;
            return a.kode.localeCompare(b.kode);
          });
          setAsprakList(sorted);
        }
        setLoading(false);
      }
    };

    init();
    hasLoadedRef.current = true;

    return () => {
      active = false;
    };
  }, [isOpen, term]);

  const filteredAspraksRfid = useMemo(() => {
    const q = searchQueryRfid.toLowerCase();
    return asprakList.filter(
      (a) =>
        `${a.kode} ${a.nama_lengkap} ${a.rfid_uid || ''}`.toLowerCase().includes(q)
    );
  }, [asprakList, searchQueryRfid]);

  const filteredAspraksManual = useMemo(() => {
    const q = searchQueryManual.toLowerCase();
    return asprakList.filter((a) =>
      `${a.kode} ${a.nama_lengkap}`.toLowerCase().includes(q)
    );
  }, [asprakList, searchQueryManual]);

  const aspraksWithRfid = useMemo(() => {
    return asprakList.filter((a) => !!a.rfid_uid);
  }, [asprakList]);

  const filteredAspraksSource = useMemo(() => {
    const q = searchQuerySource.toLowerCase();
    return aspraksWithRfid.filter(
      (a) =>
        `${a.kode} ${a.nama_lengkap} ${a.rfid_uid || ''}`.toLowerCase().includes(q)
    );
  }, [aspraksWithRfid, searchQuerySource]);

  const filteredAspraksTarget = useMemo(() => {
    const q = searchQueryTarget.toLowerCase();
    return asprakList
      .filter((a) => a.id !== selectedSourceAsprakId)
      .filter(
        (a) =>
          `${a.kode} ${a.nama_lengkap} ${a.rfid_uid || ''}`.toLowerCase().includes(q)
      );
  }, [asprakList, selectedSourceAsprakId, searchQueryTarget]);

  const selectedSourceObj = useMemo(
    () => asprakList.find((a) => a.id === selectedSourceAsprakId),
    [asprakList, selectedSourceAsprakId]
  );

  const selectedTargetObj = useMemo(
    () => asprakList.find((a) => a.id === selectedTargetAsprakId),
    [asprakList, selectedTargetAsprakId]
  );

  const selectedAsprakRfidObj = useMemo(
    () => asprakList.find((a) => a.id === selectedAsprakIdRfid),
    [asprakList, selectedAsprakIdRfid]
  );

  const selectedAsprakManualObj = useMemo(
    () => asprakList.find((a) => a.id === selectedAsprakIdManual),
    [asprakList, selectedAsprakIdManual]
  );

  const handleTransferRfid = async () => {
    if (!selectedSourceAsprakId || !selectedTargetAsprakId) {
      toast.error('Pilih asisten pemilik kartu dan asisten penerima');
      return;
    }

    if (!selectedSourceObj?.rfid_uid) {
      toast.error('Asisten sumber belum memiliki kartu RFID');
      return;
    }

    setLoading(true);
    try {
      const res = await transferRfidToAsprak({
        from_asprak_id: selectedSourceAsprakId,
        to_asprak_id: selectedTargetAsprakId,
        rfid_uid: selectedSourceObj.rfid_uid,
      });

      if (res.success) {
        toast.success(res.message || 'Kartu RFID berhasil dipindahkan');
        const transferredUid = selectedSourceObj.rfid_uid;
        setAsprakList((prev) =>
          prev.map((a) => {
            if (a.id === selectedSourceAsprakId) {
              return { ...a, rfid_uid: undefined };
            }
            if (a.id === selectedTargetAsprakId) {
              return { ...a, rfid_uid: transferredUid };
            }
            return a;
          })
        );
        setSelectedSourceAsprakId('');
        setSelectedTargetAsprakId('');
        onSuccess?.();
      } else {
        toast.error(res.error || 'Gagal memindahkan kartu RFID');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat transfer');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAsprakRfid = (id: string) => {
    setSelectedAsprakIdRfid(id);
    setOpenAsprakRfid(false);
    setSearchQueryRfid('');
    const target = asprakList.find((a) => a.id === id);
    if (target?.rfid_uid) {
      setRfidInput(target.rfid_uid);
    } else {
      setRfidInput('');
    }
  };

  const handleSaveRfid = async () => {
    if (!selectedAsprakIdRfid) {
      toast.error('Pilih asisten terlebih dahulu');
      return;
    }

    setLoading(true);
    try {
      const res = await assignRfidToAsprak(selectedAsprakIdRfid, rfidInput);
      if (res.success) {
        toast.success(res.message || 'RFID berhasil disimpan');
        setAsprakList((prev) =>
          prev.map((a) =>
            a.id === selectedAsprakIdRfid
              ? { ...a, rfid_uid: rfidInput ? rfidInput.toUpperCase().trim() : undefined }
              : a
          )
        );
        onSuccess?.();
      } else {
        toast.error(res.error || 'Gagal menyimpan RFID');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveManual = async () => {
    if (!selectedAsprakIdManual || !selectedHari || !selectedShift) {
      toast.error('Harap lengkapi semua data form');
      return;
    }

    setLoading(true);
    try {
      const res = await submitManualPresensi({
        idAsprak: selectedAsprakIdManual,
        tahunAjaran: term,
        modul: selectedModul > 0 ? selectedModul : 1,
        hari: selectedHari,
        shift: parseInt(selectedShift, 10),
        status,
        waktuMasuk: new Date().toISOString(),
      });

      if (res.success) {
        toast.success(res.message || 'Presensi berhasil dicatat');
        onSuccess?.();
        onClose();
      } else {
        toast.error(res.error || 'Gagal mencatat presensi');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const currentShifts = getJagaShiftsByDay(selectedHari);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Presensi & Kartu RFID</DialogTitle>
          <DialogDescription>
            Kelola RFID dan presensi asisten
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as 'rfid' | 'transfer' | 'manual')}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 w-full mt-2 mb-4">
            <TabsTrigger value="rfid" className="text-xs">Daftarkan RFID</TabsTrigger>
            <TabsTrigger value="transfer" className="text-xs">Pindahkan RFID</TabsTrigger>
            <TabsTrigger value="manual" className="text-xs">Presensi Manual</TabsTrigger>
          </TabsList>

          {/* TAB 1: DAFTARKAN / HUBUNGKAN RFID */}
          <TabsContent value="rfid" className="mt-0">
            <div className="grid gap-4 py-2 w-full">
              <div className="flex flex-col gap-2">
                <Label htmlFor="rfid-asprak">Pilih ASLAB / ASPRAK</Label>
                <Popover open={openAsprakRfid} onOpenChange={setOpenAsprakRfid}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openAsprakRfid}
                      className="w-full justify-between px-3 font-normal h-auto py-2 group"
                      disabled={loading}
                    >
                      <div className="flex flex-col items-start min-w-0">
                        {selectedAsprakRfidObj ? (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-primary">
                                [{selectedAsprakRfidObj.kode}]
                              </span>
                              {selectedAsprakRfidObj.rfid_uid && (
                                <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 px-1 rounded font-mono">
                                  UID: {selectedAsprakRfidObj.rfid_uid}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] truncate w-full text-left font-medium text-foreground/80">
                              {selectedAsprakRfidObj.nama_lengkap}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">
                            -- Pilih Asisten --
                          </span>
                        )}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 group-hover:opacity-80 transition-opacity" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[375px] p-0" align="start">
                    <div className="flex items-center border-b px-3 bg-muted/20">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                        placeholder="Cari Asisten (Kode / Nama / UID)..."
                        value={searchQueryRfid}
                        onChange={(e) => setSearchQueryRfid(e.target.value)}
                      />
                    </div>
                    <ScrollArea className="h-64 overflow-y-auto">
                      <div className="p-1">
                        {filteredAspraksRfid.map((a) => (
                          <div
                            key={a.id}
                            role="option"
                            tabIndex={0}
                            aria-selected={selectedAsprakIdRfid === a.id}
                            className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none transition-colors ${
                              selectedAsprakIdRfid === a.id
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-accent hover:text-accent-foreground'
                            }`}
                            onClick={() => handleSelectAsprakRfid(a.id)}
                          >
                            {selectedAsprakIdRfid === a.id && (
                              <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                <Check className="h-4 w-4" />
                              </span>
                            )}
                            <div className="flex flex-col gap-0.5 min-w-0 w-full pr-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs">[{a.kode}]</span>
                                  <span
                                    className={`text-[10px] px-1 rounded-sm uppercase font-bold border ${
                                      a.role === 'ASLAB'
                                        ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                                        : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                    }`}
                                  >
                                    {a.role}
                                  </span>
                                </div>
                                {a.rfid_uid && (
                                  <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 px-1.5 py-0.2 rounded font-mono">
                                    {a.rfid_uid}
                                  </span>
                                )}
                              </div>
                              <span className="truncate text-xs text-foreground/80 font-medium">
                                {a.nama_lengkap}
                              </span>
                            </div>
                          </div>
                        ))}
                        {filteredAspraksRfid.length === 0 && (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Asisten tidak ditemukan.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="rfid-uid">Nomor UID Kartu RFID</Label>
                <Input
                  id="rfid-uid"
                  value={rfidInput}
                  onChange={(e) => setRfidInput(e.target.value.toUpperCase())}
                  placeholder="Contoh: 04A1B2C3"
                  className="font-mono uppercase tracking-wider text-sm"
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground">
                  Tempelkan kartu RFID pada scanner USB atau ketik manual nomor UID.
                </p>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button onClick={handleSaveRfid} disabled={loading || !selectedAsprakIdRfid}>
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" /> Menyimpan...
                  </>
                ) : (
                  'Simpan RFID'
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* TAB 2: TRANSFER / PINDAHKAN RFID TANPA TAP */}
          <TabsContent value="transfer" className="mt-0">
            <div className="grid gap-3.5 py-2 w-full">
              {/* 1. Pemilik Kartu Saat Ini (Sumber) */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="source-asprak" className="text-xs font-semibold">
                  1. Pilih Pemilik Kartu Saat Ini (Sumber)
                </Label>
                <Popover open={openAsprakSource} onOpenChange={setOpenAsprakSource}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openAsprakSource}
                      className="w-full justify-between px-3 font-normal h-auto py-2 group"
                      disabled={loading}
                    >
                      <div className="flex flex-col items-start min-w-0">
                        {selectedSourceObj ? (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-primary">
                                [{selectedSourceObj.kode}]
                              </span>
                              {selectedSourceObj.rfid_uid && (
                                <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 px-1.5 py-0.2 rounded font-mono font-bold">
                                  UID: {selectedSourceObj.rfid_uid}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] truncate w-full text-left font-medium text-foreground/80">
                              {selectedSourceObj.nama_lengkap}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">
                            -- Pilih Asisten yang Memegang Kartu --
                          </span>
                        )}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 group-hover:opacity-80 transition-opacity" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[420px] p-0" align="start">
                    <div className="flex items-center border-b px-3 bg-muted/20">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                        placeholder="Cari Pemilik Kartu (Kode / Nama / UID)..."
                        value={searchQuerySource}
                        onChange={(e) => setSearchQuerySource(e.target.value)}
                      />
                    </div>
                    <ScrollArea className="h-64 overflow-y-auto">
                      <div className="p-1">
                        {filteredAspraksSource.map((a) => (
                          <div
                            key={a.id}
                            role="option"
                            tabIndex={0}
                            aria-selected={selectedSourceAsprakId === a.id}
                            className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none transition-colors ${
                              selectedSourceAsprakId === a.id
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-accent hover:text-accent-foreground'
                            }`}
                            onClick={() => {
                              setSelectedSourceAsprakId(a.id);
                              setOpenAsprakSource(false);
                              setSearchQuerySource('');
                            }}
                          >
                            {selectedSourceAsprakId === a.id && (
                              <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                <Check className="h-4 w-4" />
                              </span>
                            )}
                            <div className="flex flex-col gap-0.5 min-w-0 w-full pr-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs">[{a.kode}]</span>
                                  <span className="text-xs truncate font-medium text-foreground/80">
                                    {a.nama_lengkap}
                                  </span>
                                </div>
                                {a.rfid_uid && (
                                  <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 px-1.5 py-0.2 rounded font-mono font-bold shrink-0">
                                    {a.rfid_uid}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {filteredAspraksSource.length === 0 && (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Tidak ada asisten dengan RFID yang cocok.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Visual Divider Indicator */}
              <div className="flex items-center justify-center py-0.5">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/60 rounded-full border border-border/60 text-[11px] text-muted-foreground font-medium">
                  <ArrowRightLeft className="h-3 w-3 text-primary" />
                  <span>Pindahkan ke Asisten Baru</span>
                </div>
              </div>

              {/* 2. Asisten Penerima (Target) */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="target-asprak" className="text-xs font-semibold">
                  2. Pilih Asisten Penerima (Target)
                </Label>
                <Popover open={openAsprakTarget} onOpenChange={setOpenAsprakTarget}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openAsprakTarget}
                      className="w-full justify-between px-3 font-normal h-auto py-2 group"
                      disabled={loading}
                    >
                      <div className="flex flex-col items-start min-w-0">
                        {selectedTargetObj ? (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-primary">
                                [{selectedTargetObj.kode}]
                              </span>
                              {selectedTargetObj.rfid_uid ? (
                                <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 px-1 rounded font-mono">
                                  UID Lama: {selectedTargetObj.rfid_uid}
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic">
                                  (Belum ada kartu)
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] truncate w-full text-left font-medium text-foreground/80">
                              {selectedTargetObj.nama_lengkap}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">
                            -- Pilih Asisten Penerima Kartu --
                          </span>
                        )}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 group-hover:opacity-80 transition-opacity" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[420px] p-0" align="start">
                    <div className="flex items-center border-b px-3 bg-muted/20">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                        placeholder="Cari Asisten Penerima (Kode / Nama)..."
                        value={searchQueryTarget}
                        onChange={(e) => setSearchQueryTarget(e.target.value)}
                      />
                    </div>
                    <ScrollArea className="h-64 overflow-y-auto">
                      <div className="p-1">
                        {filteredAspraksTarget.map((a) => (
                          <div
                            key={a.id}
                            role="option"
                            tabIndex={0}
                            aria-selected={selectedTargetAsprakId === a.id}
                            className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none transition-colors ${
                              selectedTargetAsprakId === a.id
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-accent hover:text-accent-foreground'
                            }`}
                            onClick={() => {
                              setSelectedTargetAsprakId(a.id);
                              setOpenAsprakTarget(false);
                              setSearchQueryTarget('');
                            }}
                          >
                            {selectedTargetAsprakId === a.id && (
                              <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                <Check className="h-4 w-4" />
                              </span>
                            )}
                            <div className="flex flex-col gap-0.5 min-w-0 w-full pr-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs">[{a.kode}]</span>
                                  <span className="text-xs truncate font-medium text-foreground/80">
                                    {a.nama_lengkap}
                                  </span>
                                </div>
                                {a.rfid_uid && (
                                  <span className="text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.2 rounded font-mono shrink-0">
                                    UID Saat ini: {a.rfid_uid}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {filteredAspraksTarget.length === 0 && (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Asisten tidak ditemukan.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Ringkasan Konfirmasi */}
              {selectedSourceObj && selectedTargetObj && (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1 mt-1">
                  <p className="font-semibold text-foreground">Ringkasan Pemindahan:</p>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>
                      Kartu <strong className="font-mono text-primary">{selectedSourceObj.rfid_uid}</strong> dari{' '}
                      <strong>[{selectedSourceObj.kode}]</strong> akan dipindahkan ke{' '}
                      <strong>[{selectedTargetObj.kode}] {selectedTargetObj.nama_lengkap}</strong>.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button
                onClick={handleTransferRfid}
                disabled={loading || !selectedSourceAsprakId || !selectedTargetAsprakId}
                className="gap-1.5"
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" /> Memindahkan...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="h-4 w-4" />
                    Pindahkan Kartu RFID
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* TAB 3: INPUT PRESENSI MANUAL */}
          <TabsContent value="manual" className="mt-0">
            <div className="grid gap-4 py-2 w-full">
              <div className="flex flex-col gap-2">
                <Label htmlFor="manual-asprak">Pilih ASLAB / ASPRAK</Label>
                <Popover open={openAsprakManual} onOpenChange={setOpenAsprakManual}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openAsprakManual}
                      className="w-full justify-between px-3 font-normal h-auto py-2 group"
                      disabled={loading}
                    >
                      <div className="flex flex-col items-start min-w-0">
                        {selectedAsprakManualObj ? (
                          <>
                            <span className="font-bold text-xs text-primary">
                              [{selectedAsprakManualObj.kode}]
                            </span>
                            <span className="text-[11px] truncate w-full text-left font-medium text-foreground/80">
                              {selectedAsprakManualObj.nama_lengkap}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">
                            -- Pilih Asisten --
                          </span>
                        )}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 group-hover:opacity-80 transition-opacity" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[375px] p-0" align="start">
                    <div className="flex items-center border-b px-3 bg-muted/20">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                        placeholder="Cari Asisten (Kode / Nama)..."
                        value={searchQueryManual}
                        onChange={(e) => setSearchQueryManual(e.target.value)}
                      />
                    </div>
                    <ScrollArea className="h-64 overflow-y-auto">
                      <div className="p-1">
                        {filteredAspraksManual.map((a) => (
                          <div
                            key={a.id}
                            role="option"
                            tabIndex={0}
                            aria-selected={selectedAsprakIdManual === a.id}
                            className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none transition-colors ${
                              selectedAsprakIdManual === a.id
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-accent hover:text-accent-foreground'
                            }`}
                            onClick={() => {
                              setSelectedAsprakIdManual(a.id);
                              setOpenAsprakManual(false);
                              setSearchQueryManual('');
                            }}
                          >
                            {selectedAsprakIdManual === a.id && (
                              <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                <Check className="h-4 w-4" />
                              </span>
                            )}
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs">[{a.kode}]</span>
                                <span
                                  className={`text-[10px] px-1 rounded-sm uppercase font-bold border ${
                                    a.role === 'ASLAB'
                                      ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                                      : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                  }`}
                                >
                                  {a.role}
                                </span>
                              </div>
                              <span className="truncate text-xs text-foreground/80 font-medium">
                                {a.nama_lengkap}
                              </span>
                            </div>
                          </div>
                        ))}
                        {filteredAspraksManual.length === 0 && (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Asisten tidak ditemukan.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <Label htmlFor="hari">Hari</Label>
                <Select
                  value={selectedHari}
                  onValueChange={(val) => {
                    setSelectedHari(val);
                    setSelectedShift('1');
                  }}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'].map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="shift">Pilih Sesi Jam (Shift)</Label>
                <Select value={selectedShift} onValueChange={setSelectedShift} disabled={loading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="-- Pilih Sesi --" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentShifts.map((s) => (
                      <SelectItem key={s.shift} value={s.shift.toString()}>
                        {s.jam} (Shift {s.shift})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="status">Status Kehadiran</Label>
                <Select value={status} onValueChange={setStatus} disabled={loading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HADIR">HADIR (Tepat Waktu)</SelectItem>
                    <SelectItem value="TERLAMBAT">TERLAMBAT</SelectItem>
                    <SelectItem value="PENGGANTI">PENGGANTI (Bukan Jadwal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button onClick={handleSaveManual} disabled={loading || !selectedAsprakIdManual}>
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" /> Menyimpan...
                  </>
                ) : (
                  'Catat Kehadiran'
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
