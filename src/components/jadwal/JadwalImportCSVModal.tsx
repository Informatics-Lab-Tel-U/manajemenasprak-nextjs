'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

import { FileSpreadsheet, Upload, FileText, X, Download } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { MataKuliah } from '@/types/database';
import type { CreateJadwalInput } from '@/services/jadwalService';
import JadwalCSVPreview, { JadwalPreviewRow } from './JadwalCSVPreview';
import {
  validateJadwalConflicts,
  buildJadwalPreviewRows,
} from '@/utils/validation/jadwalValidation';
import { parseSpreadsheet, downloadTemplate } from '@/lib/spreadsheet';


interface RawCSVRow {
  kelas?: string;
  nama_singkat?: string; // Replaced mata_kuliah with nama_singkat to match Excel
  hari?: string;
  sesi?: string | number;
  jam?: string;
  ruangan?: string;
  total_asprak?: string | number;
  dosen?: string;
  mata_kuliah?: string;
}

interface JadwalImportCSVModalProps {
  mataKuliahList: MataKuliah[];
  onImport: (rows: CreateJadwalInput[]) => Promise<void>;
  onClose: () => void;
  open: boolean;
  term?: string;
}


const REQUIRED_COLS = ['kelas', 'hari', 'sesi', 'jam', 'ruangan']; // removed mata_kuliah, checking nama_singkat dynamically

const handleDownloadTemplate = (format: 'csv' | 'xlsx') => {
  downloadTemplate('jadwal', format);
};


export default function JadwalImportCSVModal({
  mataKuliahList,
  onImport,
  onClose,
  open,
  term,
}: JadwalImportCSVModalProps) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<JadwalPreviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);


  const processAndValidate = useCallback(
    async (file: File) => {
      setError(null);
      setFileName(file.name);

      try {
        const matrix = await parseSpreadsheet(file);
        if (matrix.length < 2) {
          setError('File kosong: tidak ada data yang ditemukan.');
          return;
        }

        const rawHeaders = matrix[0];
        const normalizedHeaders = rawHeaders.map((h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'));

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
          setError('CSV kosong: tidak ada data yang ditemukan.');
          return;
        }

        const preview = buildJadwalPreviewRows(data, mataKuliahList, term);
        const validatedRows = await validateJadwalConflicts(preview, term || '');

        setPreviewRows(validatedRows);
        setStep('preview');
      } catch (err: any) {
        setError(`Gagal memproses file: ${err.message}`);
      }
    },
    [mataKuliahList, term]
  );



  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => acceptedFiles[0] && processAndValidate(acceptedFiles[0]),
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  const handleToggleSelect = (index: number) => {
    setPreviewRows((prev) => {
      const next = [...prev];
      if (next[index].status !== 'error') {
        next[index].selected = !next[index].selected;
      }
      return next;
    });
  };

  const handleToggleAll = (checked: boolean) => {
    setPreviewRows((prev) =>
      prev.map((r) => (r.status !== 'error' ? { ...r, selected: checked } : r))
    );
  };

  const handleConfirm = async () => {
    const selected = previewRows.filter((r) => r.selected && r.status !== 'error');
    if (selected.length === 0) return;

    setSaving(true);
    try {
      const payload = selected.map((r) => ({
        id_mk: r.id_mk,
        kelas: r.kelas,
        hari: r.hari,
        sesi: r.sesi,
        jam: r.jam,
        ruangan: r.ruangan,
        total_asprak: r.total_asprak,
        dosen: r.dosen,
      }));

      await onImport(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setPreviewRows([]);
    setFileName(null);
    setError(null);
  };


  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          'flex max-h-[min(800px,90vh)] flex-col gap-0 p-0',
          step === 'preview' ? 'sm:max-w-5xl' : 'sm:max-w-lg'
        )}
      >
        <DialogHeader className="contents space-y-0 text-left">
          <DialogTitle className="border-b px-6 py-4 flex items-center gap-2">
            <Upload size={18} />
            Import CSV Jadwal
            {step === 'preview' && (
              <span className="text-sm font-normal text-muted-foreground ml-2">(Preview)</span>
            )}
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

              {step === 'upload' ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label htmlFor="jadwal-csv-upload" className="text-sm font-medium leading-none">Upload CSV</label>
                        {term && (
                          <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            Term: {term}
                          </span>
                        )}
                      </div>
                      {fileName && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText size={12} />
                          {fileName}
                        </span>
                      )}
                    </div>

                    <div
                      {...getRootProps()}
                      className={cn(
                        'border-2 border-dashed rounded-lg p-10 text-center transition-all cursor-pointer',
                        isDragActive
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-transparent hover:border-primary/50'
                      )}
                    >
                      <input {...getInputProps()} id="jadwal-csv-upload" />
                      <FileSpreadsheet size={40} className="mx-auto mb-3 text-muted-foreground" />
                      {isDragActive ? (
                        <p className="text-primary font-semibold">Drop CSV file di sini...</p>
                      ) : (
                        <>
                          <p className="font-medium">Drag & drop CSV file di sini</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            atau klik untuk pilih file
                          </p>
                        </>
                      )}
                    </div>

                    <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">
                        Format Kolom:
                      </p>
                      <div className="flex flex-wrap gap-2 mb-1">
                        {[
                          'kelas',
                          'nama_singkat',
                          'hari',
                          'sesi',
                          'jam',
                          'ruangan',
                          'total_asprak',
                          'dosen',
                        ].map((col) => (
                          <span
                            key={col}
                            className="text-[10px] bg-background border px-1.5 py-0.5 rounded font-mono text-muted-foreground"
                          >
                            {col}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 mb-3">
                        * Kolom <code className="text-[9px] bg-muted px-1 rounded">nama_singkat</code> harus sesuai detail praktikum di database (contoh: "PBO"). Ruangan akan dipotong otomatis jika ada "&amp;" atau "dan" (contoh: "TULT 0602 dan 0604" menjadi "TULT 0602").
                      </p>

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
                </div>
              ) : (
                <JadwalCSVPreview
                  rows={previewRows}
                  onConfirm={handleConfirm}
                  onBack={handleReset}
                  onToggleSelect={handleToggleSelect}
                  onToggleAll={handleToggleAll}
                  loading={saving}
                />
              )}
            </div>
          </ScrollArea>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
