'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';


import { FileSpreadsheet, X, Download, FileText, Loader2, ArrowRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

import { validatePlottingImport } from '@/lib/fetchers/plottingFetcher';
import PlottingCSVPreview from '@/components/plotting/PlottingCSVPreview';
import {
  mapPlottingValidationResponse,
  handlePlottingResolve,
  ExtendedPreviewRow,
} from '@/utils/validation/plottingValidation';
import { useAsprakOnboardStore } from '@/store/useAsprakOnboardStore';
import { NavButton } from '@/components/ui/nav-button';
import { parseSpreadsheet, downloadTemplate } from '@/lib/spreadsheet';

interface StepPlottingAsprakProps {
  term: string;
}

const handleDownloadTemplate = async (format: 'csv' | 'xlsx') => {
  downloadTemplate('plotting', format);
};

export default function StepPlottingAsprak({ term }: StepPlottingAsprakProps) {
  const { setCurrentStep, markStepCompleted, validatedAsprakRows, setValidatedPlottingRows, plottingPreviewRows, setPlottingPreviewRows, unmarkStepCompleted } = useAsprakOnboardStore();
  const [step, setStep] = useState<'upload' | 'preview'>(plottingPreviewRows.length > 0 ? 'preview' : 'upload');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const [previewRows, setPreviewRows] = useState<ExtendedPreviewRow[]>(plottingPreviewRows);

  const handleSetPreviewRows = (updater: React.SetStateAction<ExtendedPreviewRow[]>) => {
    setPreviewRows((prev) => {
      const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
      setPlottingPreviewRows(next);
      return next;
    });
  };

  const processFile = async (file: File) => {
    setError(null);
    setFileName(file.name);
    setLoading(true);

    const handleParsedData = async (resultsData: any[]) => {
      const rawRows = resultsData.reduce((acc: any[], row: any) => {
        const kode_asprak = row.kode_asprak || '';
        const mk_singkat = row.mk_singkat || '';
        if (kode_asprak && mk_singkat) {
          acc.push({ kode_asprak, mk_singkat });
        }
        return acc;
      }, []);

      if (rawRows.length === 0) {
        setError('File kosong atau format kolom salah (harus ada kode_asprak, mk_singkat)');
        setLoading(false);
        return;
      }

      const pendingAspraks = validatedAsprakRows.map(r => ({
        kode: r.kode,
        nama_lengkap: r.nama_lengkap,
        nim: r.nim,
        angkatan: r.angkatan
      }));
      
      try {
        const res = await validatePlottingImport(rawRows, term, pendingAspraks);
        setLoading(false);

        if (res.ok && res.data) {
          const mapped = mapPlottingValidationResponse(res.data);
          handleSetPreviewRows(mapped);
          setStep('preview');
        } else {
          setError(res.error || 'Validasi gagal');
        }
      } catch (e: any) {
        setError(`API Error: ${e.message}`);
        setLoading(false);
      }
    };

    const normalizeHeader = (header: string) => {
      const h = header.trim().toLowerCase();
      if (h.includes('kode') && h.includes('asprak')) return 'kode_asprak';
      if (h.includes('mk') || h.includes('mata') || h.includes('singkat')) return 'mk_singkat';
      return h.replace(/[^a-z0-9]/g, '_');
    };

    try {
      const matrix = await parseSpreadsheet(file);
      if (matrix.length < 2) {
        setError('File kosong, tidak ada data yang ditemukan.');
        setLoading(false);
        return;
      }

      const rawHeaders = matrix[0];
      const normalizedHeaders = rawHeaders.map(normalizeHeader);

      const normalizedData = matrix.slice(1).reduce((acc: any[], row: string[]) => {
        if (!row || !row.some(Boolean)) return acc;
        const newRow: any = {};
        normalizedHeaders.forEach((header: string, idx: number) => {
          newRow[header] = row[idx] ?? '';
        });
        acc.push(newRow);
        return acc;
      }, []);

      await handleParsedData(normalizedData);
    } catch (err: any) {
      setError(`Gagal membaca file: ${err.message}`);
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1,
    disabled: !term || loading,
    onDrop: (files) => files[0] && processFile(files[0]),
  });

  const handleResolve = (index: number, candidateId: string) => {
    handleSetPreviewRows((prev) => handlePlottingResolve(index, candidateId, prev));
  };

  const handleConfirm = async () => {
    const payload: { asprak_id: string; praktikum_id: string }[] = [];

    previewRows.forEach((row) => {
      if (!row.selected) return;
      if (row.status === 'invalid') return;

      if (row.status === 'valid' && row.asprakId && row.praktikumId) {
        payload.push({ asprak_id: row.asprakId, praktikum_id: row.praktikumId });
      }

      else if (row.status === 'ambiguous' && row.selectedCandidateIds && row.praktikumId) {
        row.selectedCandidateIds.forEach((id) => {
          payload.push({ asprak_id: id, praktikum_id: row.praktikumId! });
        });
      }
    });

    if (payload.length === 0) {
      toast.warning('Tidak ada penugasan valid untuk disimpan.');
      return;
    }

    // Save to local Zustand store instead of database
    const storeRows = payload.map(p => {
      const row = previewRows.find(r => r.asprakId === p.asprak_id || r.selectedCandidateIds?.includes(p.asprak_id));
      return {
        asprak_id: p.asprak_id,
        kode_asprak: row?.kode_asprak || '',
        praktikum_id: p.praktikum_id,
        mk_singkat: row?.mk_singkat || ''
      };
    });

    setValidatedPlottingRows(storeRows);

    markStepCompleted('plotting');
    setCurrentStep('preview-final');
  };

  const handleSkip = () => {
    markStepCompleted('plotting');
    setCurrentStep('preview-final');
  };

  if (step === 'preview') {
    return (
      <Card className="border shadow-sm w-full">
        <CardHeader>
          <CardTitle className="text-xl">Langkah 2: Preview Plotting</CardTitle>
          <CardDescription>
            Validasi penugasan asisten praktikum. Pastikan tidak ada konflik.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border rounded-md">
            <div className="p-4 bg-muted/20 border-b flex justify-between items-center">
              <h3 className="font-medium text-sm">Preview Data Plotting ({previewRows.length})</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => {
                  setStep('upload');
                  handleSetPreviewRows([]);
                  unmarkStepCompleted('plotting');
                  setFileName(null);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Bersihkan & Ulangi
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <PlottingCSVPreview
                rows={previewRows}
                term={term}
                onConfirm={handleConfirm}
                onBack={() => setCurrentStep('data_asprak')}
                onResolve={handleResolve}
            onToggleSelect={(idx) =>
              handleSetPreviewRows((p) => {
                const u = [...p];
                u[idx].selected = !u[idx].selected;
                return u;
              })
            }
            onToggleAll={(checked) =>
              handleSetPreviewRows((p) =>
                p.map((r) => (r.status === 'invalid' ? r : { ...r, selected: checked }))
              )
            }
                loading={loading}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm w-full">
      <CardHeader>
        <CardTitle className="text-xl">Langkah 2: Plotting</CardTitle>
        <CardDescription>
          Unggah file CSV berisi data plotting/penugasan asisten praktikum ke mata kuliah.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-start gap-2 whitespace-pre-wrap">
              <X className="w-4 h-4 mt-0.5" />
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium leading-none">Pilih File CSV Plotting</span>
            {fileName && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <FileText size={14} />
                {fileName}
              </span>
            )}
          </div>

          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-12 text-center transition-all',
              isDragActive
                ? 'border-primary bg-primary/5 cursor-copy'
                : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30 cursor-pointer'
            )}
          >
            <input {...getInputProps()} />
            {loading ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <div className="space-y-1">
                  <p className="font-medium">Memproses file...</p>
                  <p className="text-xs text-muted-foreground">Ini mungkin memakan waktu sebentar</p>
                </div>
              </div>
            ) : (
              <>
                <FileSpreadsheet
                  className={cn(
                    'w-12 h-12 mb-4 mx-auto transition-colors',
                    isDragActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                {isDragActive ? (
                  <p className="text-primary font-semibold text-lg">Lepaskan file di sini...</p>
                ) : (
                  <div className="space-y-1">
                    <p className="font-medium text-lg">Drag & drop file CSV Plotting di sini</p>
                    <p className="text-xs text-muted-foreground">atau klik untuk pilih file (.csv, .xlsx)</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
          <p className="text-sm text-muted-foreground mb-3 font-medium">Format Kolom yang Dibutuhkan:</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {['kode_asprak', 'mk_singkat'].map((col) => (
              <span
                key={col}
                className="text-xs bg-background border px-2 py-1 rounded font-mono text-muted-foreground"
              >
                {col}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/80 mb-4 leading-relaxed">
            * Kolom harus persis bernama <code className="bg-muted px-1 py-0.5 rounded text-foreground">kode_asprak</code> dan <code className="bg-muted px-1 py-0.5 rounded text-foreground">mk_singkat</code>.
          </p>

          <div className="flex items-center gap-3 pt-3 border-t border-border/50">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
              <Download size={14} />
              Download Template:
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 bg-background hover:bg-muted"
                onClick={() => handleDownloadTemplate('csv')}
              >
                <FileText size={14} className="text-sky-500" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 bg-background hover:bg-muted"
                onClick={() => handleDownloadTemplate('xlsx')}
              >
                <FileSpreadsheet size={14} className="text-emerald-500" />
                XLSX
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between gap-2 border-t pt-4">
        <NavButton direction="prev" onClick={() => setCurrentStep('data_asprak')} />
        <Button variant="outline" onClick={handleSkip}>
          Lewati Langkah Ini <ArrowRight size={16} className="ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}
