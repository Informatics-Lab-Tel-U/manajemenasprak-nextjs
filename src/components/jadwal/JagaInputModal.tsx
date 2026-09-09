/* eslint-disable react-doctor/no-impure-state-updater */
import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { fetchAllAsprak } from '@/lib/fetchers/asprakFetcher';
import { addJadwalJaga, bulkAddJadwalJaga, updateJadwalJaga } from '@/lib/fetchers/jagaFetcher';
import { Asprak } from '@/types/database';
import { canInputJagaForModul, getJagaShiftsByDay } from '@/utils/jagaUtils';
import { AlertCircle, Check, ChevronsUpDown, Search } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

interface JagaInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  term: string;
  selectedModul: number;
  konfigurasiModul: { modul: number; tanggal_mulai: string | null }[];
  defaultDay: string;
  userRole?: string;
  onSuccess: () => void;
  editData?: {
    id?: string;
    id_asprak?: string;
    hari?: string;
    shift?: number;
  } | null;
}

export default function JagaInputModal({
  isOpen,
  onClose,
  term,
  selectedModul,
  konfigurasiModul,
  defaultDay,
  userRole = 'ASPRAK',
  onSuccess,
  editData,
}: JagaInputModalProps) {
  const [loading, setLoading] = useState(false);
  const [asprakList, setAsprakList] = useState<Asprak[]>([]);

  const [selectedAsprakId, setSelectedAsprakId] = useState(editData?.id_asprak || '');
  const [selectedHari, setSelectedHari] = useState(editData?.hari || defaultDay);
  const [selectedShift, setSelectedShift] = useState(() => editData?.shift?.toString() || '');

  const [applyToAllModuls, setApplyToAllModuls] = useState(false);

  const [openAsprak, setOpenAsprak] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAsprakList = React.useMemo(() => {
    const q = searchQuery.toLowerCase();
    return asprakList.filter((a) =>
      `${a.kode} ${a.nama_lengkap}`.toLowerCase().includes(q)
    );
  }, [asprakList, searchQuery]);

  const [canInput, setCanInput] = useState(true);
  
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      hasLoadedRef.current = false;
      return;
    }

    if (hasLoadedRef.current) return;
    
    let active = true;

    const init = async () => {
      if (active) {
        if (editData) {
          setSelectedAsprakId(editData.id_asprak || '');
          setSelectedHari(editData.hari || defaultDay);
          setSelectedShift(editData.shift?.toString() || '');
        } else {
          setSelectedAsprakId('');
          setSelectedHari(defaultDay);
          setSelectedShift('');
          setApplyToAllModuls(false);
        }
        
        setLoading(true);
        const allowed = canInputJagaForModul(selectedModul, konfigurasiModul, userRole);
        setCanInput(allowed);
      }

      const { data } = await fetchAllAsprak(term);
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
  }, [isOpen, editData, defaultDay, selectedModul, konfigurasiModul, userRole, term]);

  const handleSubmit = async () => {
    if (!selectedAsprakId || !selectedHari || !selectedShift) {
      toast.error('Harap lengkapi semua data form');
      return;
    }

    setLoading(true);

    let result;
    if (editData && editData.id) {
      const { success, error } = await updateJadwalJaga(editData.id, {
        id_asprak: selectedAsprakId,
        hari: selectedHari,
        shift: parseInt(selectedShift),
      });
      result = { success, error };
    } else {
      const { success, error } = applyToAllModuls
        ? await bulkAddJadwalJaga({
            id_asprak: selectedAsprakId,
            tahun_ajaran: term,
            moduls: Array.from({ length: 16 }, (_, i) => i + 1),
            hari: selectedHari,
            shift: parseInt(selectedShift),
          })
        : await addJadwalJaga({
            id_asprak: selectedAsprakId,
            tahun_ajaran: term,
            modul: selectedModul,
            hari: selectedHari,
            shift: parseInt(selectedShift),
          });
      result = { success, error };
    }

    if (result.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    toast.success(
      editData
        ? 'Jadwal jaga berhasil diperbarui'
        : applyToAllModuls
          ? 'Jadwal jaga berhasil ditambahkan ke seluruh modul'
          : 'Jadwal jaga berhasil ditambahkan'
    );
    setLoading(false);
    onSuccess();
    onClose();
  };

  const currentShifts = getJagaShiftsByDay(selectedHari);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editData ? 'Edit Jadwal Jaga' : 'Input Jadwal Jaga'}</DialogTitle>
          <DialogDescription>
            {editData
              ? `Memperbarui jadwal jaga untuk Modul ${selectedModul}`
              : `Menambahkan status jaga untuk Modul ${selectedModul}`}
          </DialogDescription>
        </DialogHeader>

        {!canInput ? (
          <Alert variant="destructive" className="my-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Tidak Diizinkan</AlertTitle>
            <AlertDescription>
              Hanya Administrator yang memiliki akses untuk menginput atau mengubah jadwal jaga.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 py-4 w-full">
            <div className="flex flex-col gap-2">
              <Label htmlFor="asprak">Pilih ASLAB / ASPRAK</Label>
              <Popover open={openAsprak} onOpenChange={setOpenAsprak}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openAsprak}
                    className="w-full justify-between px-3 font-normal h-auto py-2 group"
                    disabled={loading}
                  >
                    <div className="flex flex-col items-start min-w-0">
                      {selectedAsprakId ? (
                        (() => {
                          const selected = asprakList.find((a) => a.id === selectedAsprakId);
                          return selected ? (
                            <>
                              <span className="font-bold text-xs text-primary">
                                [{selected.kode}]
                              </span>
                              <span className="text-[11px] truncate w-full text-left font-medium">
                                {selected.nama_lengkap}
                              </span>
                            </>
                          ) : (
                            '-- Pilih Asisten --'
                          );
                        })()
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
                      className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Cari Asisten (Kode / Nama)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <ScrollArea className="h-64 overflow-y-auto">
                    <div className="p-1">
                      {filteredAsprakList.map((a) => (
                          <div
                            key={a.id}
                            role="option"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedAsprakId(a.id);
                                setOpenAsprak(false);
                                setSearchQuery('');
                              }
                            }}
                            aria-selected={selectedAsprakId === a.id}
                            className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none transition-colors
                              ${selectedAsprakId === a.id ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground'}
                            `}
                            onClick={() => {
                              setSelectedAsprakId(a.id);
                              setOpenAsprak(false);
                              setSearchQuery('');
                            }}
                          >
                            {selectedAsprakId === a.id && (
                              <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                <Check className="h-4 w-4" />
                              </span>
                            )}
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs">[{a.kode}]</span>
                                <span
                                  className={`text-[10px] px-1 rounded-sm uppercase font-bold border ${a.role === 'ASLAB' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}
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
                      {filteredAsprakList.length === 0 && (
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
                  setSelectedShift('');
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

            {!editData?.id && (
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-primary/20 bg-primary/5 mt-2">
                <input
                  type="checkbox"
                  id="bulk"
                  className="w-4 h-4 rounded border-primary text-primary focus:ring-primary"
                  checked={applyToAllModuls}
                  onChange={(e) => setApplyToAllModuls(e.target.checked)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="bulk"
                    className="text-xs font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Terapkan ke semua modul (1-16)
                  </label>
                  <p className="text-[10px] text-muted-foreground">
                    Status jaga asisten ini akan dicatat untuk seluruh modul pada term ini.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !canInput}>
            {loading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" /> Menyimpan...
              </>
            ) : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
