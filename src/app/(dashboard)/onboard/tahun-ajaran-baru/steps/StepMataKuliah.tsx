'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  useStepper,
} from '@/components/ui/stepper';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NavButton } from '@/components/ui/nav-button';
import { Input } from '@/components/ui/input';
import { BookOpen, CheckCircle2, FileSpreadsheet, Download, FileText, AlertCircle, Copy, Save, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useDropzone } from 'react-dropzone';

import MataKuliahCSVPreview, { MataKuliahCSVRow } from '@/components/mata-kuliah/MataKuliahCSVPreview';
import { validateMataKuliahData } from '@/utils/validation/mataKuliahValidation';
import { cn } from '@/lib/utils';
import { 
  useOnboardingStore
} from '@/store/useOnboardingStore';
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
import { useTermStore } from '@/store/useTermStore';
import { parseSpreadsheet, downloadTemplate } from '@/lib/spreadsheet';

const steps = [
  { id: 'praktikum', title: 'Data Praktikum', description: 'Buat tahun ajaran', icon: <BookOpen /> },
  { id: 'matkul', title: 'Mata Kuliah', description: 'Tambahkan MK', icon: <BookOpen /> },
  { id: 'jadwal', title: 'Preview & Simpan', description: 'Konfirmasi Data', icon: <Save /> },
  { id: 'selesai', title: 'Selesai', description: 'Setup berhasil', icon: <CheckCircle2 /> },
];

const handleDownloadTemplate = async (format: 'csv' | 'xlsx') => {
  downloadTemplate('mata_kuliah', format);
};

export default function MatkulStep() {
  const { stepper } = useStepper();
  const { draft, setMataKuliahList, setPraktikumList, markStepCompleted, unmarkStepCompleted, setCurrentStep } = useOnboardingStore();
  const { activeTerm } = useTermStore();

  const praktikumList = draft.praktikumList || [];
  const validPraktikums = praktikumList.map(p => ({ id: p.tempId, nama: p.nama }));
  const term = praktikumList[0]?.tahun_ajaran || activeTerm || '';

  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [previewRows, setPreviewRows] = useState<MataKuliahCSVRow[]>(() => {
    return draft.mataKuliahData?.map(m => {
      const p = praktikumList.find(p => p.tempId === m.id_praktikum || (p as any).id === m.id_praktikum);
      return {
        mk_singkat: p?.nama || '',
        originalMkSingkat: p?.nama || '',
        nama_lengkap: m.nama_lengkap,
        program_studi: m.program_studi,
        dosen_koor: m.dosen_koor || '',
        status: 'ok',
        selected: true,
        mappedPraktikumId: p?.tempId || m.id_praktikum
      };
    }) || [];
  });

  useEffect(() => {
    if (previewRows.length === 0 && (draft.mataKuliahData?.length || 0) > 0) {
      const generated = draft.mataKuliahData!.map(m => {
        const p = praktikumList.find(p => p.tempId === m.id_praktikum || (p as any).id === m.id_praktikum);
        return {
          mk_singkat: p?.nama || '',
          originalMkSingkat: p?.nama || '',
          nama_lengkap: m.nama_lengkap,
          program_studi: m.program_studi,
          dosen_koor: m.dosen_koor || '',
          status: 'ok' as const,
          selected: true,
          mappedPraktikumId: p?.tempId || m.id_praktikum,
        };
      });
      setPreviewRows(generated);
    }
  }, [draft.mataKuliahData, praktikumList, previewRows.length]);

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    id_praktikum: praktikumList.length > 0 ? praktikumList[0].tempId : '', 
    namaLengkap: '', 
    programStudi: 'IF', 
    dosenKoor: '' 
  });

  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySourceTerm, setCopySourceTerm] = useState('');
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);
  const termsLoading = useRef(false);

  const handleCopyModalOpenChange = (open: boolean) => {
    setIsCopyModalOpen(open);
    if (open && availableTerms.length === 0) {
      termsLoading.current = true;
      fetch('/api/tahun-ajaran')
        .then((res) => res.json())
        .then((res) => {
          if (res.ok && res.data) {
            setAvailableTerms(res.data);
            if (res.data.length > 0 && !copySourceTerm) {
              setCopySourceTerm(res.data[0]);
            }
          }
        })
        .catch((err) => console.error(err))
        .finally(() => { termsLoading.current = false; });
    }
  };

  const processSpreadsheet = useCallback(async (file: File) => {
    setUploadError(null);
    try {
      const matrix = await parseSpreadsheet(file);
      if (matrix.length < 2) {
        setUploadError('File kosong — tidak ada data yang ditemukan.');
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

      const preview = validateMataKuliahData(data, validPraktikums, []);
      const strictPreview = preview.map(r => {
        if (!r.statusMessage?.includes('Praktikum baru akan dibuat otomatis')) return r;
        return {
          ...r,
          status: 'error' as const,
          statusMessage: 'Praktikum tidak ditemukan di Langkah 1',
          selected: false
        };
      });

      setPreviewRows(prev => [...prev, ...strictPreview]);
    } catch (err: any) {
      setUploadError(`Gagal membaca file: ${err.message}`);
    }
  }, [validPraktikums]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    await processSpreadsheet(file);
  }, [processSpreadsheet]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1,
  });



  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id_praktikum || !formData.namaLengkap || !formData.programStudi) {
      toast.error('Isi kolom yang wajib');
      return;
    }
    
    const prak = praktikumList.find(p => p.tempId === formData.id_praktikum);
    if (!prak) return;

    setPreviewRows(prev => [...prev, {
      mk_singkat: prak.nama,
      originalMkSingkat: prak.nama,
      nama_lengkap: formData.namaLengkap,
      program_studi: formData.programStudi,
      dosen_koor: formData.dosenKoor,
      status: 'ok',
      selected: true,
      mappedPraktikumId: formData.id_praktikum
    }]);

    setFormData(prev => ({ ...prev, namaLengkap: '', dosenKoor: '' }));
    setIsManualModalOpen(false);
  };

  const handleCopyData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copySourceTerm) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/mata-kuliah?term=${copySourceTerm}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      const existingMkGroups = result.data || [];
      if (existingMkGroups.length === 0) {
         toast.error('Tidak ada data mata kuliah di tahun ajaran tersebut');
         return;
      }

      const flattened = existingMkGroups.flatMap((g: any) => g.items.map((item: any) => ({
        mk_singkat: g.mk_singkat,
        nama_lengkap: item.nama_lengkap,
        program_studi: item.program_studi,
        dosen_koor: item.dosen_koor || ''
      })));

      const preview = validateMataKuliahData(flattened, validPraktikums, []);
      const strictPreview = preview.map(r => {
        if (!r.statusMessage?.includes('Praktikum baru akan dibuat otomatis')) return r;
        return {
          ...r,
          status: 'error' as const,
          statusMessage: 'Praktikum tidak ditemukan di Langkah 1',
          selected: false
        };
      });

      toast.success(`Berhasil menarik ${strictPreview.length} mata kuliah`);
      setPreviewRows(strictPreview); // Overwrite, not append
      
      setIsCopyModalOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRow = (index: number, updates: Partial<MataKuliahCSVRow>) => {
    setPreviewRows((prev) => {
      const newRows = [...prev];
      newRows[index] = { ...newRows[index], ...updates };
      return newRows;
    });
  };

  const handleToggleSelect = (index: number) => {
    setPreviewRows((prev) => {
      const newRows = [...prev];
      newRows[index].selected = !newRows[index].selected;
      return newRows;
    });
  };

  const handleToggleAll = (checked: boolean) => {
    setPreviewRows((prev) => prev.map((r) => ({
      ...r,
      selected: r.status === 'error' ? false : checked,
    })));
  };

  const processDraftData = () => {
    const selectedRows = previewRows.filter((r) => r.selected);
    const newPraktikums: typeof praktikumList = [];
    
    const draftData = selectedRows.map(r => {
      let id_praktikum = r.mappedPraktikumId;
      if (!id_praktikum) {
        const existingPrak = praktikumList.find(p => p.nama.toUpperCase() === r.mk_singkat.toUpperCase());
        if (existingPrak) {
          id_praktikum = existingPrak.tempId;
        } else {
          let newPrak = newPraktikums.find(p => p.nama.toUpperCase() === r.mk_singkat.toUpperCase());
          if (!newPrak) {
            newPrak = {
              tempId: crypto.randomUUID(),
              nama: r.mk_singkat.toUpperCase(),
              tahun_ajaran: term,
            };
            newPraktikums.push(newPrak);
          }
          id_praktikum = newPrak.tempId;
        }
      }

      return {
        id_praktikum,
        nama_lengkap: r.nama_lengkap,
        program_studi: r.program_studi,
        dosen_koor: r.dosen_koor
      };
    });

    return {
      validDraftData: draftData.filter(d => d.id_praktikum) as any,
      newPraktikums,
      selectedCount: selectedRows.length
    };
  };

  const handleConfirmImport = async () => {
    const { validDraftData, newPraktikums, selectedCount } = processDraftData();

    if (validDraftData.length === 0 && selectedCount > 0) {
      toast.error('Gagal memetakan Mata Kuliah ke Praktikum.');
      return;
    }

    if (newPraktikums.length > 0) {
      setPraktikumList([...praktikumList, ...newPraktikums]);
    }

    setMataKuliahList(validDraftData);
    toast.success('Data Mata Kuliah berhasil disimpan ke draft sementara.');
    markStepCompleted('matkul');
    setCurrentStep('jadwal');
  };

  return (
    <Card className="border shadow-sm w-full">
      <CardHeader>
        <CardTitle className="text-xl">Langkah 2: Mata Kuliah</CardTitle>
        <CardDescription>
          Tambahkan Mata Kuliah untuk Praktikum yang telah Anda daftarkan di Langkah 1.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-2">
        <div className="pt-2 space-y-4">
          <div className="flex justify-between items-center mt-4">
            <h3 className="font-semibold text-lg">Daftar Mata Kuliah</h3>
            <div className="flex gap-2">
              <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2"><BookOpen className="w-4 h-4"/> Tambah Manual</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tambah Mata Kuliah Manual</DialogTitle>
                    <DialogDescription>Masukkan detail mata kuliah untuk ditambahkan ke daftar.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddManual} className="space-y-4 py-4">
                    <Field>
                      <FieldLabel>Pilih Praktikum Induk <span className="text-destructive">*</span></FieldLabel>
                      <FieldContent>
                        <Select value={formData.id_praktikum} onValueChange={(val) => setFormData(prev => ({ ...prev, id_praktikum: val }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Praktikum" />
                          </SelectTrigger>
                          <SelectContent>
                            {praktikumList.map(p => (
                              <SelectItem key={p.tempId} value={p.tempId}>{p.nama} ({p.tahun_ajaran})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldLabel>Nama Mata Kuliah <span className="text-destructive">*</span></FieldLabel>
                      <FieldContent>
                        <Input 
                          placeholder="Contoh: Pemrograman Web Lanjut" 
                          value={formData.namaLengkap}
                          onChange={(e) => setFormData(prev => ({ ...prev, namaLengkap: e.target.value }))}
                          required
                        />
                      </FieldContent>
                    </Field>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel>Program Studi <span className="text-destructive">*</span></FieldLabel>
                        <FieldContent>
                          <Input 
                            placeholder="Contoh: IF"
                            value={formData.programStudi}
                            onChange={(e) => setFormData(prev => ({ ...prev, programStudi: e.target.value }))}
                            required
                          />
                        </FieldContent>
                      </Field>
                      <Field>
                        <FieldLabel>Dosen Koor</FieldLabel>
                        <FieldContent>
                          <Input 
                            placeholder="Opsional (3 Huruf)" 
                            value={formData.dosenKoor}
                            onChange={(e) => setFormData(prev => ({ ...prev, dosenKoor: e.target.value }))}
                            maxLength={3}
                          />
                        </FieldContent>
                      </Field>
                    </div>
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
                    <DialogTitle>Tarik Data Mata Kuliah</DialogTitle>
                    <DialogDescription>Masukkan tahun ajaran sebelumnya untuk mengambil daftar mata kuliahnya.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCopyData} className="space-y-4 py-4">
                    <Field>
                      <FieldLabel>Tahun Ajaran Sumber</FieldLabel>
                      <FieldContent>
                        <Select value={copySourceTerm} onValueChange={setCopySourceTerm} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Tahun Ajaran" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTerms.length === 0 ? (
                              <SelectItem value="none" disabled>Memuat data...</SelectItem>
                            ) : (
                              availableTerms.map(t => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </FieldContent>
                    </Field>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsCopyModalOpen(false)}>Batal</Button>
                      <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Tarik Data
                      </Button>
                    </DialogFooter>
                  </form>
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
                  {['mk_singkat', 'nama_lengkap', 'program_studi', 'dosen_koor'].map((col) => (
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
                <h3 className="font-medium text-sm">Preview Data Mata Kuliah ({previewRows.length})</h3>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => {
                      setPreviewRows([]);
                      setMataKuliahList([]);
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
                <MataKuliahCSVPreview
                  rows={previewRows}
                  validPraktikums={validPraktikums}
                  term={term}
                  onUpdateRow={handleUpdateRow}
                  onToggleSelect={handleToggleSelect}
                  onToggleAll={handleToggleAll}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t p-6">
        <NavButton 
          direction="prev"
          onClick={() => {
            if (previewRows.length > 0) {
              const { validDraftData, newPraktikums } = processDraftData();
              if (newPraktikums.length > 0) {
                setPraktikumList([...praktikumList, ...newPraktikums]);
              }
              setMataKuliahList(validDraftData);
            }
            setCurrentStep('praktikum');
          }} 
          disabled={loading} 
        />
        <div className="flex items-center gap-2 overflow-hidden justify-end">
          {previewRows.length > 0 && previewRows.filter((r) => r.status === 'error').length > 0 && (
            <span className="text-xs text-destructive font-medium mr-3 text-right hidden lg:inline-block">
              {previewRows.filter((r) => r.status === 'error').length} data bermasalah & akan dilewati
            </span>
          )}
          <NavButton 
            direction="next"
            onClick={handleConfirmImport} 
            disabled={loading || previewRows.length === 0 || previewRows.filter(r => r.selected).length === 0} 
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
