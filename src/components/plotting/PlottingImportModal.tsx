'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';

import { FileSpreadsheet, Upload, X, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';


import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

import { validatePlottingImport, savePlotting } from '@/lib/fetchers/plottingFetcher';
import PlottingCSVPreview from './PlottingCSVPreview';
import {
  mapPlottingValidationResponse,
  handlePlottingResolve,
  ExtendedPreviewRow,
} from '@/utils/validation/plottingValidation';
import { parseSpreadsheet, downloadTemplate } from '@/lib/spreadsheet';

interface PlottingImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  terms: string[];
}

const handleDownloadTemplate = (format: 'csv' | 'xlsx') => {
  downloadTemplate('plotting', format);
};

import { useTermStore } from '@/store/useTermStore';

export default function PlottingImportModal({
  open,
  onOpenChange,
  onSuccess,
  terms,
}: PlottingImportModalProps) {
  const { activeTerm } = useTermStore();
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const selectedTerm = activeTerm || '';
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [previewRows, setPreviewRows] = useState<ExtendedPreviewRow[]>([]);

  const processCSV = async (file: File) => {
    setError(null);
    setLoading(true);

    try {
      const matrix = await parseSpreadsheet(file);
      if (matrix.length < 2) {
        setError('CSV/Excel empty or missing columns (kode_asprak, mk_singkat)');
        setLoading(false);
        return;
      }

      const normalizeHeader = (header: string) => {
        const h = header.trim().toLowerCase();
        if (h.includes('kode') && h.includes('asprak')) return 'kode_asprak';
        if (h === 'kode') return 'kode_asprak';
        if (h.includes('mk') || h.includes('mata') || h.includes('singkat')) return 'mk_singkat';
        return h.replace(/[^a-z0-9]/g, '_');
      };

      const rawHeaders = matrix[0];
      const headers = rawHeaders.map(normalizeHeader);

      const rawRows = matrix.slice(1).reduce((acc: any[], row: string[]) => {
        if (!row || !row.some(Boolean)) return acc;
        const obj: any = {};
        headers.forEach((h: string, idx: number) => {
          obj[h] = row[idx] ?? '';
        });

        const kode_asprak = (obj.kode_asprak || obj.kode || '').toString().trim();
        const mk_singkat = (obj.mk_singkat || obj.mk || '').toString().trim();
        if (kode_asprak && mk_singkat) {
          acc.push({ kode_asprak, mk_singkat });
        }
        return acc;
      }, []);

      if (rawRows.length === 0) {
        setError('CSV empty or missing columns (kode_asprak, mk_singkat)');
        setLoading(false);
        return;
      }

      const res = await validatePlottingImport(rawRows, selectedTerm);
      setLoading(false);

      if (res.ok && res.data) {
        const mapped = mapPlottingValidationResponse(res.data);
        setPreviewRows(mapped);
        setStep('preview');
      } else {
        setError(res.error || 'Validation failed');
      }
    } catch (e: any) {
      setError(`Gagal memproses file: ${e.message}`);
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: !selectedTerm,
    onDrop: (files) => files[0] && processCSV(files[0]),
  });



  const handleResolve = (index: number, candidateId: string) => {
    setPreviewRows((prev) => handlePlottingResolve(index, candidateId, prev));
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
      toast.warning('No assignments to save');
      return;
    }

    setLoading(true);
    const res = await savePlotting(payload);
    setLoading(false);

    if (res.ok) {
      toast.success(`Saved ${payload.length} assignments successfully!`);
      onSuccess();
      handleClose();
    } else {
      toast.error(res.error);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setPreviewRows([]);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          'flex max-h-[min(800px,90vh)] flex-col gap-0 p-0',
          step === 'preview' ? 'sm:max-w-4xl' : 'sm:max-w-lg'
        )}
      >
        <DialogHeader className="contents space-y-0 text-left">
          <DialogTitle className="border-b px-6 py-4 flex items-center gap-2">
            <Upload size={18} /> Import CSV Plotting
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex max-h-full flex-col overflow-hidden">
          <div className="px-6 py-5">
            {error && (
              <Alert className="mb-4 text-destructive border-destructive/50">
                <AlertDescription className="flex gap-2">
                  <X size={16} className="mt-0.5" /> {error}
                </AlertDescription>
              </Alert>
            )}

            {step === 'upload' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Tahun Ajaran Penugasan</Label>
                  <p className="text-sm font-medium border border-border/50 bg-muted/20 px-3 py-2 rounded-md">
                    Term: <span className="font-bold">{selectedTerm}</span>
                  </p>
                </div>

                <div
                  {...getRootProps()}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-10 text-center transition-all',
                    !selectedTerm
                      ? 'border-muted bg-muted/20 opacity-50 cursor-not-allowed'
                      : isDragActive
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50 cursor-pointer'
                  )}
                >
                  <input {...getInputProps()} />
                  <FileSpreadsheet size={40} className="mx-auto mb-3 text-muted-foreground" />
                  {!selectedTerm ? (
                    <p className="font-medium text-muted-foreground">Pilih Term dulu</p>
                  ) : isDragActive ? (
                    <p className="text-primary font-semibold">Drop file di sini...</p>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-medium">Drag & drop CSV Asprak</p>
                      <p className="text-xs text-muted-foreground">
                        Format: kode_asprak, mk_singkat
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Format Kolom:</p>
                  <div className="flex flex-wrap gap-2 mb-1">
                    {['kode_asprak', 'mk_singkat'].map((col) => (
                      <span
                        key={col}
                        className="text-[10px] bg-background border px-1.5 py-0.5 rounded font-mono text-muted-foreground"
                      >
                        {col}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Download size={12} />
                      Download Template:
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2 gap-1.5 bg-background"
                        onClick={() => handleDownloadTemplate('csv')}
                      >
                        <FileText size={12} className="text-sky-500" />
                        CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2 gap-1.5 bg-background"
                        onClick={() => handleDownloadTemplate('xlsx')}
                      >
                        <FileSpreadsheet size={12} className="text-emerald-500" />
                        XLSX
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 'preview' && (
              <PlottingCSVPreview
                rows={previewRows}
                term={selectedTerm}
                onConfirm={handleConfirm}
                onBack={() => {
                  setStep('upload');
                  setPreviewRows([]);
                }}
                onResolve={handleResolve}
                onToggleSelect={(idx) =>
                  setPreviewRows((p) => {
                    const u = [...p];
                    u[idx].selected = !u[idx].selected;
                    return u;
                  })
                }
                onToggleAll={(checked) =>
                  setPreviewRows((p) =>
                    p.map((r) => (r.status === 'invalid' ? r : { ...r, selected: checked }))
                  )
                }
                loading={loading}
              />
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
