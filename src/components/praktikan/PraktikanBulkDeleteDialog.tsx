'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export const ALL_KELAS_OPTION = '__all_kelas__';

export type BulkDeletePayload =
  | { action: 'group'; mata_kuliah: string; kelas?: string }
  | { action: 'all' };

interface PraktikanBulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: BulkDeletePayload) => Promise<void>;
  options: PraktikanOptions;
  isDeleting?: boolean;
}

export default function PraktikanBulkDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  options,
  isDeleting,
}: PraktikanBulkDeleteDialogProps) {
  const [mode, setMode] = useState<'group' | 'all'>('group');
  const [selectedMataKuliah, setSelectedMataKuliah] = useState('');
  const [selectedKelas, setSelectedKelas] = useState(ALL_KELAS_OPTION);
  const [availableKelas, setAvailableKelas] = useState<string[]>([]);
  const [loadingKelas, setLoadingKelas] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMode('group');
      const initialMk = options.mata_kuliah.length > 0 ? options.mata_kuliah[0] : '';
      setSelectedMataKuliah(initialMk);
      setSelectedKelas(ALL_KELAS_OPTION);
      setConfirmText('');
    }
  }

  // Ambil daftar kelas yang relevan setiap kali mata kuliah berubah
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
    return confirmText === 'HAPUS SEMUA';
  };

  const handleSubmit = () => {
    if (!isFormValid()) return;

    if (mode === 'group') {
      onConfirm({
        action: 'group',
        mata_kuliah: selectedMataKuliah,
        kelas: selectedKelas !== ALL_KELAS_OPTION ? selectedKelas : undefined,
      });
    } else {
      onConfirm({ action: 'all' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Hapus Data Praktikan (Bulk)</DialogTitle>
          <DialogDescription>
            Pilih metode penghapusan massal data praktikan. Tindakan ini permanen dan tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <RadioGroup value={mode} onValueChange={(val: 'group' | 'all') => setMode(val)}>
            <div className="flex flex-col gap-4">
              {/* Opsi Group by Mata Kuliah dan Kelas */}
              <div className="flex items-start space-x-3 rounded-md border p-4 bg-card">
                <RadioGroupItem value="group" id="mode-group" className="mt-1" />
                <div className="space-y-3 flex-1">
                  <Label htmlFor="mode-group" className="font-semibold cursor-pointer">
                    Berdasarkan Matkul &amp; Kelas
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Hapus praktikan yang terdaftar pada mata kuliah tertentu, baik satu kelas spesifik maupun seluruh kelas.
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
                            setSelectedKelas(ALL_KELAS_OPTION);
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
                            <SelectItem value={ALL_KELAS_OPTION}>
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
                <RadioGroupItem value="all" id="mode-all" className="mt-1" />
                <div className="space-y-2 flex-1">
                  <Label htmlFor="mode-all" className="font-semibold text-destructive cursor-pointer">
                    Hapus Seluruh Data
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Mengosongkan seluruh tabel praktikan tanpa memandang mata kuliah atau kelas.
                  </p>
                  {mode === 'all' && (
                    <div className="pt-3 space-y-3">
                      <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
                        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                        <span>
                          Ketik <strong>HAPUS SEMUA</strong> di bawah ini untuk mengonfirmasi.
                        </span>
                      </div>
                      <Input
                        placeholder="HAPUS SEMUA"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        className="border-destructive/50 focus-visible:ring-destructive/30"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isDeleting || !isFormValid()}
          >
            {isDeleting ? <Spinner className="mr-2 h-4 w-4" /> : <Trash2 size={16} className="mr-2" />}
            {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
