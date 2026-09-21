'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PraktikanOptions } from './types';

export const ALL_KELAS_EXPORT_OPTION = '__all_kelas__';

export type ExportPayload =
  | { action: 'current' }
  | { action: 'group'; mata_kuliah: string; kelas?: string }
  | { action: 'all' };

interface PraktikanExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: ExportPayload) => Promise<void>;
  options: PraktikanOptions;
  isExporting?: boolean;
}

export default function PraktikanExportDialog({
  open,
  onOpenChange,
  onConfirm,
  options,
  isExporting,
}: PraktikanExportDialogProps) {
  const [mode, setMode] = useState<'current' | 'group' | 'all'>('current');
  const [selectedMataKuliah, setSelectedMataKuliah] = useState('');
  const [selectedKelas, setSelectedKelas] = useState(ALL_KELAS_EXPORT_OPTION);
  const [availableKelas, setAvailableKelas] = useState<string[]>([]);
  const [loadingKelas, setLoadingKelas] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMode('current');
      const initialMk = options.mata_kuliah.length > 0 ? options.mata_kuliah[0] : '';
      setSelectedMataKuliah(initialMk);
      setSelectedKelas(ALL_KELAS_EXPORT_OPTION);
    }
  }

  useEffect(() => {
    if (!open || mode !== 'group' || !selectedMataKuliah) {
      setAvailableKelas(options.kelas || []);
      return;
    }

    let isSubscribed = true;
    setLoadingKelas(true);

    const fetchKelasForMk = async () => {
      try {
        const params = new URLSearchParams({ mata_kuliah: selectedMataKuliah });
        const res = await fetch(`/api/praktikan/kelas?${params.toString()}`, { cache: 'no-store' });
        const result = await res.json();
        if (isSubscribed && result.ok && Array.isArray(result.data)) {
          setAvailableKelas(result.data);
        } else if (isSubscribed) {
          setAvailableKelas(options.kelas || []);
        }
      } catch {
        if (isSubscribed) {
          setAvailableKelas(options.kelas || []);
        }
      } finally {
        if (isSubscribed) {
          setLoadingKelas(false);
        }
      }
    };

    fetchKelasForMk();

    return () => {
      isSubscribed = false;
    };
  }, [open, mode, selectedMataKuliah, options.kelas]);

  const isFormValid = () => {
    if (mode === 'group') {
      return selectedMataKuliah.trim() !== '';
    }
    return true;
  };

  const handleSubmit = () => {
    if (!isFormValid()) return;

    if (mode === 'group') {
      onConfirm({
        action: 'group',
        mata_kuliah: selectedMataKuliah,
        kelas: selectedKelas !== ALL_KELAS_EXPORT_OPTION ? selectedKelas : undefined,
      });
    } else {
      onConfirm({ action: mode });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Export Data Praktikan</DialogTitle>
          <DialogDescription>
            Pilih metode ekspor data ke dalam format berkas Excel (.xlsx).
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <RadioGroup value={mode} onValueChange={(val: 'current' | 'group' | 'all') => setMode(val)}>
            <div className="flex flex-col gap-4">
              {/* Opsi Current Table */}
              <div className="flex items-start space-x-3 rounded-md border p-4 bg-card">
                <RadioGroupItem value="current" id="mode-export-current" className="mt-1" />
                <div className="space-y-1 flex-1">
                  <Label htmlFor="mode-export-current" className="font-semibold cursor-pointer">
                    Data Tabel Saat Ini
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Mengekspor data praktikan yang saat ini sedang tampil di layar sesuai filter yang aktif.
                  </p>
                </div>
              </div>

              {/* Opsi Berdasarkan Matkul & Kelas */}
              <div className="flex items-start space-x-3 rounded-md border p-4 bg-card">
                <RadioGroupItem value="group" id="mode-export-group" className="mt-1" />
                <div className="space-y-3 flex-1">
                  <Label htmlFor="mode-export-group" className="font-semibold cursor-pointer">
                    Berdasarkan Matkul &amp; Kelas
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Mengekspor data praktikan dari database berdasarkan mata kuliah praktikum dan kelas.
                  </p>

                  {mode === 'group' && (
                    <div className="pt-2 space-y-3">
                      {/* Dropdown Mata Kuliah */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Mata Kuliah Praktikum
                        </Label>
                        <Select
                          value={selectedMataKuliah}
                          onValueChange={(val) => {
                            setSelectedMataKuliah(val);
                            setSelectedKelas(ALL_KELAS_EXPORT_OPTION);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pilih mata kuliah" />
                          </SelectTrigger>
                          <SelectContent>
                            {options.mata_kuliah.length > 0 ? (
                              options.mata_kuliah.map((mk) => (
                                <SelectItem key={mk} value={mk}>
                                  {mk}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>
                                Tidak ada data mata kuliah
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Dropdown Kelas */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Kelas Praktikum
                        </Label>
                        <Select
                          value={selectedKelas}
                          onValueChange={setSelectedKelas}
                          disabled={loadingKelas || !selectedMataKuliah}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                loadingKelas ? 'Memuat daftar kelas...' : 'Pilih kelas'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ALL_KELAS_EXPORT_OPTION}>
                              Semua Kelas
                            </SelectItem>
                            {availableKelas.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Opsi Semua Data */}
              <div className="flex items-start space-x-3 rounded-md border p-4 bg-card">
                <RadioGroupItem value="all" id="mode-export-all" className="mt-1" />
                <div className="space-y-1 flex-1">
                  <Label htmlFor="mode-export-all" className="font-semibold cursor-pointer">
                    Seluruh Data
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Mengunduh seluruh data praktikan yang ada di sistem tanpa filter.
                  </p>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isExporting || !isFormValid()}
          >
            {isExporting ? (
              <>
                <Spinner className="mr-2 h-4 w-4" /> Mengekspor...
              </>
            ) : (
              <>
                <Download size={16} className="mr-2" /> Export Excel
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

