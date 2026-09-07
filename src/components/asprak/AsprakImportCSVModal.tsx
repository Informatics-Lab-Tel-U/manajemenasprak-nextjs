/* eslint-disable react-doctor/no-chain-state-updates, react-doctor/no-cascading-set-state, react-doctor/no-effect-chain, react-doctor/rendering-hydration-no-flicker */
/**
 * AsprakImportCSVModal — CSV Import dialog for bulk asprak entry
 *
 * Flow: 1) Enter Term → 2) Drag & drop CSV → 3) Preview → 4) Confirm save
 *
 * CSV columns: nama_lengkap, nim, kode, angkatan
 * If "kode" is empty, it is auto-generated using the code generator.
 *
 * @module components/asprak/AsprakImportCSVModal
 */

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

import { FileSpreadsheet, Upload, FileText, X, Download } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

import TermInput from './TermInput';
import { buildTermString } from '@/utils/termHelpers';
import AsprakCSVPreview, { PreviewRow } from './AsprakCSVPreview';
import {
  validateAsprakData,
  validateAsprakCodeEdit,
  ExistingNimInfo,
} from '@/utils/validation/asprakValidation';
import { useTermStore } from '@/store/useTermStore';
import { parseSpreadsheet, downloadTemplate } from '@/lib/spreadsheet';


interface RawCSVRow {
  nama_lengkap?: string;
  nim?: string;
  kode?: string;
  role?: string;
  angkatan?: string | number;
}

export interface ExistingAsprakInfo {
  nim: string;
  kode: string;
  angkatan: number;
}

interface AsprakImportCSVModalProps {
  existingCodes: string[];
  existingNims: ExistingNimInfo[];
  existingAspraks: ExistingAsprakInfo[];
  onImport: (
    rows: {
      nim: string;
      nama_lengkap: string;
      kode: string;
      role: 'ASPRAK' | 'ASLAB';
      angkatan: number;
    }[],
    term: string,
    allPreviewRows?: PreviewRow[]
  ) => Promise<void>;
  onClose: () => void;
  open: boolean;
}


type Step = 'upload' | 'preview';

const RECOMMENDED_COLS = ['kode', 'angkatan', 'role'];

const handleDownloadTemplate = (format: 'csv' | 'xlsx') => {
  downloadTemplate('asprak', format);
};


export default function AsprakImportCSVModal({
  existingCodes,
  existingNims,
  existingAspraks,
  onImport,
  onClose,
  open,
}: AsprakImportCSVModalProps) {
  const { activeTerm } = useTermStore();
  const initialYear = activeTerm ? activeTerm.substring(0, 2) : '25';
  const initialSem = activeTerm && activeTerm.endsWith('2') ? '2' : '1';

  const [termYear, setTermYear] = useState(initialYear);
  const [termSem, setTermSem] = useState<'1' | '2'>(initialSem as '1' | '2');

  const [step, setStep] = useState<Step>('upload');

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [forceOverride, setForceOverride] = useState(false);
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);

  const term = useMemo(() => buildTermString(termYear, termSem), [termYear, termSem]);
  const isTermValid = term.length > 0 && !isNaN(parseInt(termYear));


  const processFile = useCallback(async (file: File) => {
    setError(null);
    setFileName(file.name);

    const normalizeHeader = (header: string) => {
      const h = header.trim().toLowerCase();
      if (h.includes('nama')) return 'nama_lengkap';
      if (h.includes('nim')) return 'nim';
      if (h.includes('kode')) return 'kode';
      if (h.includes('role') || h.includes('peran')) return 'role';
      if (h.includes('angkatan') || h.includes('tahun')) return 'angkatan';
      return h.replace(/[^a-z0-9]/g, '_');
    };

    try {
      const matrix = await parseSpreadsheet(file);
      if (matrix.length < 2) {
        setError('File kosong — tidak ada data yang ditemukan.');
        return;
      }

      const rawHeaders = matrix[0];
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
        setError('File kosong — tidak ada data yang ditemukan.');
        return;
      }

      const firstRow = data[0];
      const requiredCols = ['nama_lengkap', 'nim'];
      const missingCols = requiredCols.filter((col) => !(col in firstRow));
      if (missingCols.length > 0) {
        setError(
          `Kolom wajib tidak ditemukan: ${missingCols.join(', ')}. Kolom yang ada: ${Object.keys(firstRow).join(', ')}`
        );
        return;
      }

      setParsedData(data);
      setStep('preview');
    } catch (err: any) {
      setError(`Gagal membaca file: ${err.message}`);
    }
  }, []);

  // eslint-disable-next-line react-doctor/no-chain-state-updates
  // eslint-disable-next-line react-doctor/no-chain-state-updates
  useEffect(() => {
    if (parsedData.length === 0) return;
    try {
      const preview = validateAsprakData(parsedData, existingCodes, existingNims, forceOverride);
      setPreviewRows(preview);
    } catch (e: any) {
      setError(`Error saat menyiapkan data: ${e.message}`);
    }
  }, [parsedData, existingCodes, existingNims, forceOverride]);


  const handleToggleSelect = useCallback((rowIndex: number) => {
    setPreviewRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[rowIndex] };
      if (row.status !== 'error' && row.status !== 'duplicate-csv' && row.status !== 'warning') {
        row.selected = !row.selected;
        updated[rowIndex] = row;
      }
      return updated;
    });
  }, []);

  const handleToggleAll = useCallback((checked: boolean) => {
    setPreviewRows((prev) => {
      return prev.map((row) => {
        if (row.status !== 'error' && row.status !== 'duplicate-csv' && row.status !== 'warning') {
          return { ...row, selected: checked };
        }
        return row;
      });
    });
  }, []);


  const handleCodeEdit = useCallback(
    (rowIndex: number, newCode: string) => {
      setPreviewRows((prev) =>
        validateAsprakCodeEdit(rowIndex, newCode, prev, existingAspraks, forceOverride)
      );
    },
    [existingAspraks, forceOverride]
  );

  const handleRoleEdit = useCallback(
    (rowIndex: number, newRole: 'ASPRAK' | 'ASLAB') => {
      const updated = [...previewRows];
      const row = { ...updated[rowIndex] };
      row.role = newRole;
      updated[rowIndex] = row;
      try {
        const remappedData = updated.map((r) => ({
          nama_lengkap: r.nama_lengkap,
          nim: r.nim,
          kode: r.codeRule === 'Manual edit' ? r.kode : r.originalKode ? r.originalKode : '',
          role: r.role,
          angkatan: r.angkatan,
        }));
        const revalidated = validateAsprakData(
          remappedData,
          existingCodes,
          existingNims,
          forceOverride
        );
        const finalRows = revalidated.map((revalRow, i) => {
          if (updated[i].codeRule === 'Manual edit') {
            revalRow.kode = updated[i].kode;
            revalRow.codeSource = 'csv';
            revalRow.codeRule = 'Manual edit';
          }
          revalRow.selected = updated[i].selected;
          return revalRow;
        });
        setPreviewRows(finalRows);
      } catch (e: any) {
        setError(`Error saat menyiapkan data: ${e.message}`);
        setPreviewRows(updated);
      }
    },
    [previewRows, existingCodes, existingNims, forceOverride]
  );

  const handleForceOverrideToggle = useCallback((checked: boolean) => {
    if (checked) {
      setShowOverrideConfirm(true);
    } else {
      setForceOverride(false);
    }
  }, []);

  const confirmOverride = () => {
    setForceOverride(true);
    setShowOverrideConfirm(false);
  };

  const cancelOverride = () => {
    setForceOverride(false);
    setShowOverrideConfirm(false);
  };




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
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1,
    disabled: !isTermValid,
  });


  const handleConfirm = async () => {
    const selectedRows = previewRows.filter(
      (r) => r.selected && (r.status === 'ok' || r.status === 'warning')
    );

    if (selectedRows.length === 0) return;

    setSaving(true);
    setError(null);

    try {
      await onImport(
        selectedRows.map((r) => ({
          nim: r.nim,
          nama_lengkap: r.nama_lengkap,
          kode: r.kode,
          role: r.role,
          angkatan: r.angkatan,
        })),
        term,
        previewRows
      );
    } catch (e: any) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setError(errMsg || 'Gagal menyimpan data.');
    } finally {
      setSaving(false);
    }
  };


  const handleBack = () => {
    setStep('upload');
    setPreviewRows([]);
    setParsedData([]);
    setFileName(null);
    setError(null);
    setForceOverride(false);
  };


  const handleClose = () => {
    setStep('upload');
    setPreviewRows([]);
    setParsedData([]);
    setFileName(null);
    setError(null);
    setSaving(false);
    setForceOverride(false);
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
            Import CSV Asprak
            {step === 'preview' && (
              <span className="text-sm font-normal text-muted-foreground ml-2">— Preview</span>
            )}
          </DialogTitle>

          <ScrollArea className="flex max-h-full flex-col overflow-hidden">
            <div className="px-6 py-5">
              {/* Error Alert */}
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
                  {/* Step 1: Term Input */}
                  <TermInput
                    termYear={termYear}
                    termSem={termSem}
                    onYearChange={setTermYear}
                    onSemChange={setTermSem}
                    label="Tahun Ajaran Penugasan"
                    description="Isi term terlebih dahulu sebelum upload CSV."
                  />

                  {/* Step 2: Dropzone (only enabled after term is filled) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="csv-upload" className="text-sm font-medium leading-none">Upload CSV</label>
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
                        'border-2 border-dashed rounded-lg p-10 text-center transition-all',
                        !isTermValid
                          ? 'border-border/50 bg-muted/20 cursor-not-allowed opacity-50'
                          : isDragActive
                            ? 'border-primary bg-primary/5 cursor-copy'
                            : 'border-border bg-transparent hover:border-primary/50 cursor-pointer'
                      )}
                    >
                      <input {...getInputProps()} id="csv-upload" />
                      <FileSpreadsheet
                        size={40}
                        className={cn(
                          'mb-3 mx-auto',
                          isTermValid ? 'text-muted-foreground' : 'text-muted-foreground/40'
                        )}
                      />

                      {!isTermValid ? (
                        <div className="space-y-1">
                          <p className="font-medium text-muted-foreground/60">
                            Isi tahun ajaran terlebih dahulu
                          </p>
                          <p className="text-xs text-muted-foreground/40">
                            Dropzone akan aktif setelah term diisi
                          </p>
                        </div>
                      ) : isDragActive ? (
                        <p className="text-primary font-semibold">Drop CSV file di sini...</p>
                      ) : (
                        <div className="space-y-1">
                          <p className="font-medium">Drag & drop file CSV di sini</p>
                          <p className="text-xs text-muted-foreground">
                            atau klik untuk pilih file (.csv, .xlsx)
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                        <p className="text-xs text-muted-foreground mb-2 font-medium">
                          Format Kolom:
                        </p>
                        <div className="flex flex-wrap gap-2 mb-1">
                          {[
                            'nama_lengkap',
                            'nim',
                            'kode (opsional)',
                            'angkatan',
                            'role (opsional)',
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
                          * Kolom <code className="text-[9px] bg-muted px-1 rounded">kode</code>{' '}
                          boleh kosong (akan di-generate otomatis). * Kolom{' '}
                          <code className="text-[9px] bg-muted px-1 rounded">role</code> akan
                          default menjadi <b>ASPRAK</b> jika kosong (pilih ASPRAK/ASLAB).
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
                </div>
              )}

              {step === 'preview' && (
                <AsprakCSVPreview
                  rows={previewRows}
                  term={term}
                  onConfirm={handleConfirm}
                  onBack={handleBack}
                  onCodeEdit={handleCodeEdit}
                  onRoleEdit={handleRoleEdit}
                  onToggleSelect={handleToggleSelect}
                  onToggleAll={handleToggleAll}
                  loading={saving}
                  forceOverride={forceOverride}
                  onForceOverrideChange={handleForceOverrideToggle}
                />
              )}
            </div>
          </ScrollArea>
        </DialogHeader>
      </DialogContent>

      <AlertDialog open={showOverrideConfirm} onOpenChange={setShowOverrideConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Pemaksaan Kode</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin memaksakan kode dari CSV?
              <br />
              <br />
              <span className="font-semibold text-destructive">Perhatian:</span> Ini akan
              mengabaikan peringatan bentrok kode dari database, termasuk kode yang baru saja
              dipakai dalam selisih kurang dari 5 tahun. Tindakan ini akan me-refresh ulang preview
              data serta mereset input kode manual yang telah Anda ubah.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelOverride}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmOverride}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ya, Paksa Gunakan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
