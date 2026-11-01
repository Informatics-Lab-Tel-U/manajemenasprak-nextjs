'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NavButton } from '@/components/ui/nav-button';
import { Input } from '@/components/ui/input';
import { BookOpen, FileSpreadsheet, Download, FileText, AlertCircle, Copy, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useDropzone } from 'react-dropzone';

import PraktikumCSVPreview, { PraktikumPreviewRow } from '@/components/praktikum/PraktikumCSVPreview';
import { validatePraktikumData } from '@/utils/validation/praktikumValidation';
import { usePraktikum } from '@/hooks/usePraktikum';
import { cn } from '@/lib/utils';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { Field, FieldLabel, FieldContent } from '@/components/ui/field';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import TermInput from '@/components/asprak/TermInput';
import { buildTermString } from '@/utils/termHelpers';
import { useTermStore } from '@/store/useTermStore';
import { useSearchParams } from 'next/navigation';
import { parseSpreadsheet, downloadTemplate } from '@/lib/spreadsheet';

const handleDownloadTemplate = async (format: 'csv' | 'xlsx') => {
  downloadTemplate('praktikum', format);
};

export default function PraktikumStep() {
  const { praktikumNames } = usePraktikum();
  const {
    draft,
    setPraktikumList,
    setMataKuliahList,
    setTargetTerm,
    setCopySourceTerm,
    markStepCompleted,
    unmarkStepCompleted,
    setCurrentStep,
  } = useOnboardingStore();
  const { activeTerm } = useTermStore();

  const getNextTerm = () => {
    if (!activeTerm || activeTerm.length < 6) {
      const currentYear = new Date().getFullYear().toString().slice(-2);
      return { year: currentYear, sem: '1' as '1' | '2' };
    }
    const year = activeTerm.substring(0, 2);
    const sem = activeTerm.substring(5, 6);
    if (sem === '1') {
      return { year, sem: '2' as '1' | '2' };
    } else {
      const nextYear = (parseInt(year) + 1).toString();
      return { year: nextYear, sem: '1' as '1' | '2' };
    }
  };

  const nextTerm = getNextTerm();
  const searchParams = useSearchParams();
  const urlTerm = searchParams.get('term');
  const hasUrlTerm = !!urlTerm;

  const draftTA = urlTerm || draft.praktikumList?.[0]?.tahun_ajaran || draft.targetTerm || '';
  const initialYear = draftTA ? draftTA.substring(0, 2) : nextTerm.year;
  const initialSem = draftTA ? (draftTA.endsWith('2') ? '2' : '1') : nextTerm.sem;

  const [termYear, setTermYear] = useState(initialYear);
  const [termSem, setTermSem] = useState<'1' | '2'>(initialSem as '1' | '2');

  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [copySourceTerm, setLocalCopySourceTerm] = useState(draft.copySourceTerm || '');
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);
  const [termsLoading, setTermsLoading] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

  const [previewRows, setPreviewRows] = useState<PraktikumPreviewRow[]>(() => {
    return draft.praktikumList?.map((p) => ({
      nama: p.nama,
      tahun_ajaran: p.tahun_ajaran,
      status: 'ok' as const,
      selected: true,
    })) || [];
  });

  useEffect(() => {
    if (previewRows.length === 0 && (draft.praktikumList?.length || 0) > 0) {
      setPreviewRows(
        draft.praktikumList!.map((p) => ({
          nama: p.nama,
          tahun_ajaran: p.tahun_ajaran,
          status: 'ok' as const,
          selected: true,
        }))
      );
    }
  }, [draft.praktikumList, previewRows.length]);

  // Modal state (manual add tetap tersedia di kedua mode)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualInputName, setManualInputName] = useState('');

  const handleCopyModalOpenChange = (open: boolean) => {
    setIsCopyModalOpen(open);
    if (open && availableTerms.length === 0) {
      setTermsLoading(true);
      fetch('/api/tahun-ajaran')
        .then((res) => res.json())
        .then((res) => {
          if (res.ok && res.data) {
            setAvailableTerms(res.data);
            if (res.data.length > 0 && !copySourceTerm) {
              setLocalCopySourceTerm(res.data[0]);
            }
          }
        })
        .catch((err) => console.error(err))
        .finally(() => setTermsLoading(false));
    }
  };

  const processSpreadsheet = useCallback(
    async (file: File) => {
      setUploadError(null);
      try {
        const matrix = await parseSpreadsheet(file);
        if (matrix.length < 2) {
          setUploadError('File kosong, tidak ada data yang ditemukan.');
          return;
        }

        const rawHeaders = matrix[0];
        const normalizeHeader = (header: string) => header.trim().toLowerCase().replace(/\s+/g, '_');
        const normalizedHeaders = rawHeaders.map(normalizeHeader);

        const data = matrix.slice(1).reduce((acc: any[], row: string[]) => {
          if (!row || !row.some(Boolean)) return acc;
          const newRow: any = {};
          normalizedHeaders.forEach((header: string, idx: number) => {
            newRow[header] = row[idx] ?? '';
          });
          acc.push(newRow);
          return acc;
        }, []);

        if (data.length === 0) {
          setUploadError('File kosong, tidak ada data yang ditemukan.');
          return;
        }

        const preview = validatePraktikumData(data, praktikumNames.map((p) => ({ ...p, tahun_ajaran: '' })));
        setPreviewRows((prev) => {
          const existingNames = new Set(prev.map((r) => r.nama.toUpperCase()));
          const newRows = preview.filter((r) => !existingNames.has(r.nama.toUpperCase()));
          return [...prev, ...newRows];
        });
      } catch (err: any) {
        setUploadError(`Gagal membaca file: ${err.message}`);
      }
    },
    [praktikumNames]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      await processSpreadsheet(file);
    },
    [processSpreadsheet]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1,
  });



  const handleToggleSelect = useCallback((rowIndex: number) => {
    setPreviewRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[rowIndex] };
      if (row.status !== 'error' && row.status !== 'skipped') {
        row.selected = !row.selected;
        updated[rowIndex] = row;
      }
      return updated;
    });
  }, []);

  const handleToggleAll = useCallback((checked: boolean) => {
    setPreviewRows((prev) => prev.map((row) => (row.status !== 'error' && row.status !== 'skipped' ? { ...row, selected: checked } : row)));
  }, []);

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInputName) return;

    const finalTahunAjaran = buildTermString(termYear, termSem);

    if (previewRows.some((r) => r.nama.toUpperCase() === manualInputName.toUpperCase())) {
      toast.error('Praktikum sudah ada di daftar');
      return;
    }

    setPreviewRows((prev) => [...prev, { nama: manualInputName.toUpperCase(), tahun_ajaran: finalTahunAjaran, selected: true, status: 'ok', message: 'Ready' }]);
    setManualInputName('');
    setIsManualModalOpen(false);
  };

  // Handler: switch ke mode Copy -> ambil praktikum + mata kuliah dari term sumber
  // via /api/tahun-ajaran/prepare-copy (read-only, tidak menulis ke DB).
  const handleFetchCopyData = async () => {
    if (!copySourceTerm) {
      toast.error('Pilih Tahun Ajaran sumber terlebih dahulu');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/tahun-ajaran/prepare-copy?sourceTerm=${encodeURIComponent(copySourceTerm)}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal mengambil data sumber');

      const { praktikumList, mataKuliahList } = result.data;
      if (!praktikumList || praktikumList.length === 0) {
        toast.error('Tidak ada data Praktikum pada tahun ajaran tersebut');
        return;
      }

      const finalTahunAjaran = buildTermString(termYear, termSem);
      const remappedPraktikum = praktikumList.map((p: any) => ({
        tempId: p.tempId,
        nama: p.nama,
        tahun_ajaran: finalTahunAjaran,
      }));

      setPreviewRows(
        remappedPraktikum.map((p: any) => ({
          nama: p.nama,
          tahun_ajaran: p.tahun_ajaran,
          selected: true,
          status: 'ok' as const,
          message: 'Ready',
        }))
      );

      // Simpan draft praktikum + mata kuliah sekaligus, karena mata kuliah
      // sudah dipetakan ke tempId praktikum yang sama dari prepare-copy.
      setPraktikumList(remappedPraktikum);
      setMataKuliahList(mataKuliahList || []);
      setCopySourceTerm(copySourceTerm);
      setTargetTerm(finalTahunAjaran);

      toast.success(`Berhasil menarik ${remappedPraktikum.length} praktikum dan ${mataKuliahList?.length || 0} mata kuliah`);
      setIsCopyModalOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    const finalTahunAjaran = buildTermString(termYear, termSem);
    const selectedRows = previewRows.filter((r) => r.selected);
    if (selectedRows.length === 0) {
      toast.error('Daftar praktikum tidak boleh kosong, harap tambah data terlebih dahulu');
      return;
    }

    const draftData = selectedRows.map((r) => {
      const existing = draft.praktikumList?.find((p) => p.nama.toUpperCase() === r.nama.toUpperCase());
      return {
        tempId: existing?.tempId || crypto.randomUUID(),
        nama: r.nama,
        tahun_ajaran: finalTahunAjaran,
      };
    });

    const keptTempIds = new Set(draftData.map((d) => d.tempId));
    const filteredMataKuliah = (draft.mataKuliahData || []).filter((mk) => keptTempIds.has(mk.id_praktikum || ''));

    setPraktikumList(draftData);
    setMataKuliahList(filteredMataKuliah);
    setTargetTerm(finalTahunAjaran);
    toast.success('Data Praktikum berhasil disimpan ke draft sementara.');
    markStepCompleted('praktikum');
    setCurrentStep('matkul');
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Langkah 1: Master Praktikum</CardTitle>
        <CardDescription>
          Siapkan daftar Praktikum untuk Tahun Ajaran yang baru.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-2">
        <Field>
          <FieldLabel>Target Tahun Ajaran Baru</FieldLabel>
          <FieldContent>
            <TermInput
              termYear={termYear}
              termSem={termSem}
              onYearChange={setTermYear}
              onSemChange={setTermSem}
              disabled={hasUrlTerm}
              description={hasUrlTerm ? "Tahun ajaran dikunci sesuai pilihan di Hub." : undefined}
            />
          </FieldContent>
        </Field>

        <div className="pt-2 space-y-4 mt-6">
          <div className="flex justify-between items-center mt-4">
            <h3 className="font-semibold text-lg">Daftar Praktikum</h3>
            <div className="flex gap-2">
              <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2"><BookOpen className="w-4 h-4" /> Tambah Manual</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tambah Praktikum Manual</DialogTitle>
                    <DialogDescription>Masukkan nama praktikum untuk ditambahkan ke daftar.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddManual} className="space-y-4 py-4">
                    <Field>
                      <FieldLabel>Nama Praktikum</FieldLabel>
                      <FieldContent>
                        <Input value={manualInputName} onChange={(e) => setManualInputName(e.target.value)} placeholder="Contoh: PBO" autoFocus required />
                      </FieldContent>
                    </Field>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsManualModalOpen(false)}>Batal</Button>
                      <Button type="submit">Tambah ke Daftar</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={isCopyModalOpen} onOpenChange={handleCopyModalOpenChange}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2"><Copy className="w-4 h-4"/> Copy dari Tahun Lalu</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tarik Data Praktikum</DialogTitle>
                    <DialogDescription>Masukkan tahun ajaran sebelumnya untuk mengambil daftar praktikumnya.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Field>
                      <FieldLabel>Tahun Ajaran Sumber</FieldLabel>
                      <FieldContent>
                        <Select value={copySourceTerm} onValueChange={setLocalCopySourceTerm}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Pilih Tahun Ajaran" />
                          </SelectTrigger>
                          <SelectContent>
                            {termsLoading ? (
                              <SelectItem value="none" disabled>Memuat data...</SelectItem>
                            ) : availableTerms.length === 0 ? (
                              <SelectItem value="none" disabled>Tidak ada data tahun ajaran</SelectItem>
                            ) : (
                              availableTerms.map((term) => (
                                <SelectItem key={term} value={term}>{term}</SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </FieldContent>
                    </Field>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsCopyModalOpen(false)}>Batal</Button>
                      <Button type="button" onClick={handleFetchCopyData} disabled={loading || !copySourceTerm}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Tarik Data
                      </Button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Upload Gagal</AlertTitle>
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          {previewRows.length === 0 ? (
            <div className="space-y-6">
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-10 text-center transition-all cursor-pointer',
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-transparent hover:border-primary/50'
                )}
              >
                <input {...getInputProps()} />
                <FileSpreadsheet size={40} className="mb-3 mx-auto text-muted-foreground" />
                <div className="space-y-1">
                  <p className="font-medium">Drag & drop file CSV atau Excel di sini</p>
                  <p className="text-xs text-muted-foreground">atau klik untuk pilih file (.csv, .xlsx)</p>
                </div>
              </div>

              <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                <p className="text-xs text-muted-foreground mb-2 font-medium">
                  Format Kolom CSV/Excel yang Didukung:
                </p>
                <div className="flex flex-wrap gap-2 mb-1">
                  {['nama', 'tahun_ajaran'].map((col) => (
                    <span
                      key={col}
                      className="text-[10px] bg-background border px-1.5 py-0.5 rounded font-mono text-muted-foreground"
                    >
                      {col}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-border/50 mt-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Download size={12} />
                    Download Template:
                  </span>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2 gap-1.5" onClick={() => handleDownloadTemplate('csv')}>
                      <FileText size={12} className="text-sky-500" /> CSV
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2 gap-1.5" onClick={() => handleDownloadTemplate('xlsx')}>
                      <FileSpreadsheet size={12} className="text-emerald-500" /> XLSX
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border rounded-md">
              <div className="p-4 bg-muted/20 border-b flex justify-between items-center">
                <h3 className="font-medium text-sm">Preview Data Praktikum ({previewRows.length})</h3>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => {
                      setPreviewRows([]);
                      setPraktikumList([]);
                      setMataKuliahList([]);
                      unmarkStepCompleted('praktikum');
                      unmarkStepCompleted('matkul');
                      unmarkStepCompleted('jadwal');
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Bersihkan
                  </Button>
                  <Button {...getRootProps()} type="button" variant="outline" size="sm" className="h-7 text-xs gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground font-medium">
                    <input {...getInputProps()} />
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Tambah via CSV/Excel
                  </Button>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <PraktikumCSVPreview
                  rows={previewRows}
                  onToggleSelect={handleToggleSelect}
                  onToggleAll={handleToggleAll}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end border-t p-6">
        <div className="flex items-center gap-2 overflow-hidden justify-end">
          {previewRows.length > 0 && previewRows.filter((r) => r.status === 'error').length > 0 && (
            <span className="text-xs text-destructive font-medium mr-3 text-right hidden lg:inline-block">
              {previewRows.filter((r) => r.status === 'error').length} data bermasalah & akan dilewati
            </span>
          )}
          <NavButton 
            direction="next"
            onClick={handleConfirmImport} 
            disabled={loading || previewRows.length === 0 || previewRows.filter(r => r.selected && r.status !== 'error').length === 0} 
            loading={loading}
            loadingText="Menyimpan..."
            className="min-w-[160px] bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            Selanjutnya
          </NavButton>
        </div>
      </CardFooter>
    </Card>
  );
}
