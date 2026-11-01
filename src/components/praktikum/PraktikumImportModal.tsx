'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileSpreadsheet, Upload, FileText, X, Download } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

import PraktikumCSVPreview, { PraktikumPreviewRow } from './PraktikumCSVPreview';
import { validatePraktikumData } from '@/utils/validation/praktikumValidation';
import { parseSpreadsheet, downloadTemplate } from '@/lib/spreadsheet';


interface PraktikumImportModalProps {
  onImport: (rows: { nama: string; tahun_ajaran: string }[]) => Promise<void>;
  onClose: () => void;
  open: boolean;
  existingPraktikums: { nama: string; tahun_ajaran: string }[]; // To check duplicates locally if needed
}

type Step = 'upload' | 'preview';

const handleDownloadTemplate = (format: 'csv' | 'xlsx') => {
  downloadTemplate('praktikum', format);
};

export default function PraktikumImportModal({
  onImport,
  onClose,
  open,
  existingPraktikums,
}: PraktikumImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [previewRows, setPreviewRows] = useState<PraktikumPreviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const matrix = await parseSpreadsheet(file);
        
        if (matrix.length < 2) {
          setError('File kosong, tidak ada data yang ditemukan.');
          return;
        }
        
        const headers = matrix[0].map((h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'));
        const data = matrix.slice(1).reduce((acc: any[], row: string[]) => {
          if (!row || !row.some(Boolean)) return acc; // skip empty rows
          const obj: any = {};
          headers.forEach((h: string, idx: number) => {
             obj[h] = row[idx] ?? '';
          });
          acc.push(obj);
          return acc;
        }, []);

        const preview = validatePraktikumData(data, existingPraktikums);
        setPreviewRows(preview);
        setStep('preview');
      } catch (err: any) {
        setError(`Gagal memproses file: ${err.message}`);
      }
    },
    [existingPraktikums]
  );



  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      processFile(file);
    },
    [processFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
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
    setPreviewRows((prev) => {
      return prev.map((row) => {
        if (row.status !== 'error' && row.status !== 'skipped') {
          return { ...row, selected: checked };
        }
        return row;
      });
    });
  }, []);

  const handleConfirm = async () => {
    const selectedRows = previewRows.filter((r) => r.selected);
    if (selectedRows.length === 0) return;

    setSaving(true);
    setError(null);

    try {
      await onImport(
        selectedRows.map((r) => ({
          nama: r.nama,
          tahun_ajaran: r.tahun_ajaran,
        }))
      );
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan data.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setPreviewRows([]);
    setError(null);
    setSaving(false);
    onClose();
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
            <Upload size={18} />
            Import Praktikum CSV
          </DialogTitle>
          <ScrollArea className="flex max-h-full flex-col overflow-hidden">
            <div className="px-6 py-5">
              {error && (
                <Alert className="mb-4 border-destructive/50 text-destructive">
                  <AlertDescription className="flex items-start gap-2">
                    <X size={16} className="mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </AlertDescription>
                </Alert>
              )}

              {step === 'upload' && (
                <div className="space-y-6">
                  <div className="space-y-2">
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
                        <p className="font-medium">Drag & drop file CSV di sini</p>
                        <p className="text-xs text-muted-foreground">atau klik untuk pilih file</p>
                      </div>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">
                        Format Kolom:
                      </p>
                      <div className="flex flex-wrap gap-2 mb-1">
                        {['nama_singkat', 'tahun_ajaran'].map((col) => (
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
                            className="h-7 text-xs px-2 gap-1.5"
                            onClick={() => handleDownloadTemplate('csv')}
                          >
                            <FileText size={12} className="text-sky-500" /> CSV
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2 gap-1.5"
                            onClick={() => handleDownloadTemplate('xlsx')}
                          >
                            <FileSpreadsheet size={12} className="text-emerald-500" /> XLSX
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 'preview' && (
                <div className="space-y-4">
                  <PraktikumCSVPreview
                    rows={previewRows}
                    onToggleSelect={handleToggleSelect}
                    onToggleAll={handleToggleAll}
                  />
                  <div className="flex justify-between items-center pt-2">
                    <Button type="button" variant="outline" onClick={() => { setStep('upload'); setPreviewRows([]); }} disabled={saving}>
                      Kembali
                    </Button>
                    <Button onClick={handleConfirm} disabled={saving || previewRows.filter(r => r.selected).length === 0} variant="default">
                      {saving ? (
                        <>
                          <Spinner className="mr-2 h-4 w-4" /> Menyimpan...
                        </>
                      ) : `Simpan ${previewRows.filter(r => r.selected).length} Data Terpilih`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
