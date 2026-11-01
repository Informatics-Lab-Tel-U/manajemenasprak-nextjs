import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileSpreadsheet, Upload, FileText, X, Download, ArrowLeft, Save } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { cn } from '@/lib/utils';

import TermInput from '@/components/asprak/TermInput';
import { buildTermString } from '@/utils/termHelpers';
import MataKuliahCSVPreview, { MataKuliahCSVRow } from './MataKuliahCSVPreview';
import { validateMataKuliahData } from '@/utils/validation/mataKuliahValidation';
import type { MataKuliahGrouped } from '@/services/mataKuliahService';
import { parseSpreadsheet, downloadTemplate } from '@/lib/spreadsheet';


const handleDownloadTemplate = (format: 'csv' | 'xlsx') => {
  downloadTemplate('mata-kuliah', format);
};

interface MataKuliahImportModalProps {
  open: boolean;
  onClose: () => void;
  validPraktikums: { id: string; nama: string }[];
  onImport: (rows: any[], term: string) => Promise<void>;
  defaultTerm?: string;
}

export default function MataKuliahImportModal({
  open,
  onClose,
  validPraktikums,
  onImport,
  defaultTerm,
}: MataKuliahImportModalProps) {
  const initialYear = defaultTerm ? defaultTerm.substring(0, 2) : '25';
  const initialSem = defaultTerm && defaultTerm.endsWith('2') ? '2' : '1';

  const [termYear, setTermYear] = useState(initialYear);
  const [termSem, setTermSem] = useState<'1' | '2'>(initialSem);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<MataKuliahCSVRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchedValidPraktikums, setFetchedValidPraktikums] = useState<{ id: string; nama: string }[] | null>(null);
  const localValidPraktikums = fetchedValidPraktikums ?? validPraktikums;
  const [existingMataKuliah, setExistingMataKuliah] = useState<MataKuliahGrouped[]>([]);

  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const term = useMemo(() => buildTermString(termYear, termSem), [termYear, termSem]);
  const isTermValid = term.length > 0 && !isNaN(parseInt(termYear));

  // Fetch valid praktikums AND key existing data whenever the term changes inside the modal
  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      if (!isTermValid) return;

      try {
        // eslint-disable-next-line react-doctor/no-fetch-in-effect
        const [praktikumRes, mkRes] = await Promise.all([
          fetch(`/api/praktikum?action=by-term&term=${term}`, { signal: controller.signal }),
          fetch(`/api/mata-kuliah?term=${term}`, { signal: controller.signal }),
        ]);

        if (!controller.signal.aborted && praktikumRes.ok) {
          const json = await praktikumRes.json();
          if (json.ok && Array.isArray(json.data)) {
            setFetchedValidPraktikums(json.data);
          } else {
            setFetchedValidPraktikums([]);
          }
        }

        if (!controller.signal.aborted && mkRes.ok) {
          const mkJson = await mkRes.json();
          if (mkJson.ok && Array.isArray(mkJson.data)) {
            setExistingMataKuliah(mkJson.data);
          } else {
            setExistingMataKuliah([]);
          }
        }
      } catch (e: any) {
        if (!controller.signal.aborted) console.error(e);
      }
    }

    fetchData();
    return () => {
      controller.abort();
    };
  }, [term, isTermValid]);

  const processCSV = useCallback(
    async (file: File) => {
      setError(null);
      setFileName(file.name);

      try {
        const matrix = await parseSpreadsheet(file);
        if (matrix.length < 2) {
          setError('File CSV/Excel kosong.');
          return;
        }

        const rawHeaders = matrix[0];
        const headers = rawHeaders.map((h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'));

        const rows = matrix.slice(1).reduce((acc: any[], row: string[]) => {
          if (!row || !row.some(Boolean)) return acc;
          const obj: any = {};
          headers.forEach((h: string, idx: number) => {
            obj[h] = row[idx] ?? '';
          });
          acc.push(obj);
          return acc;
        }, []);

        if (rows.length === 0) {
          setError('File CSV/Excel kosong.');
          return;
        }

        const transformed = validateMataKuliahData(
          rows,
          localValidPraktikums,
          existingMataKuliah
        );
        setParsedRows(transformed);
        setStep('preview');
      } catch (err: any) {
        setError(`Gagal membaca file: ${err.message}`);
      }
    },
    [localValidPraktikums, existingMataKuliah]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      processCSV(file);
    },
    [processCSV]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: !isTermValid,
  });

  const handleUpdateRow = (index: number, updates: Partial<MataKuliahCSVRow>) => {
    const newRows = [...parsedRows];
    newRows[index] = { ...newRows[index], ...updates };
    setParsedRows(newRows);
  };

  const handleToggleSelect = (index: number) => {
    const newRows = [...parsedRows];
    newRows[index].selected = !newRows[index].selected;
    setParsedRows(newRows);
  };

  const handleToggleAll = (checked: boolean) => {
    const newRows = parsedRows.map((r) => ({
      ...r,
      selected: r.status === 'error' ? false : checked,
    }));
    setParsedRows(newRows);
  };

  const handleConfirmImport = async () => {
    try {
      const selectedRows = parsedRows.filter((r) => r.selected);
      if (selectedRows.length === 0) {
        toast.error('Pilih setidaknya satu baris.');
        return;
      }

      setLoading(true);
      const rowsToImport = selectedRows.map((r) => ({
        mk_singkat: r.mk_singkat,
        nama_lengkap: r.nama_lengkap,
        program_studi: r.program_studi,
        dosen_koor: r.dosen_koor,
      }));

      await onImport(rowsToImport, term);
      onClose();
      setStep('upload');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };



  const handleClose = () => {
    setStep('upload');
    setFileName(null);
    setError(null);
    setParsedRows([]);
    setExistingMataKuliah([]);
    onClose();
  };

  const handleAttemptClose = (isOpen: boolean) => {
    if (!isOpen) {
      if (step === 'preview') {
        setShowConfirmClose(true);
      } else {
        handleClose();
      }
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleAttemptClose}>
        <DialogContent
          className={cn(
            'flex flex-col gap-0 p-0 transition-all duration-200',
            step === 'preview'
              ? 'w-[95vw] !max-w-[1200px] h-[90vh]'
              : 'sm:max-w-lg max-h-[min(800px,90vh)]'
          )}
          onPointerDownOutside={(e) => {
            if (step === 'preview') {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader className="contents space-y-0 text-left">
            <DialogTitle className="border-b px-6 py-4 flex items-center gap-2 shrink-0">
              <Upload size={18} />
              Import Data Mata Kuliah
              {step === 'preview' && (
                <span className="text-sm font-normal text-muted-foreground ml-2">· Pratinjau</span>
              )}
            </DialogTitle>
          </DialogHeader>

          {step === 'upload' && (
            <ScrollArea className="flex-1 overflow-hidden">
              <div className="px-6 py-5">
                {error && (
                  <Alert className="mb-4 border-destructive/50 text-destructive">
                    <AlertDescription className="flex items-start gap-2">
                      <X size={16} className="mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{error}</span>
                    </AlertDescription>
                  </Alert>
                )}

                <FieldGroup className="space-y-6">
                  <Field>
                    <TermInput
                      termYear={termYear}
                      termSem={termSem}
                      onYearChange={setTermYear}
                      onSemChange={setTermSem}
                      label="Tahun Ajaran Target"
                      description="Pilih tahun ajaran untuk data yang akan diimport."
                    />
                  </Field>

                  <Field className="space-y-2">
                    <div className="flex items-center justify-between">
                      <FieldLabel className="text-sm font-medium leading-none">
                        Upload CSV
                      </FieldLabel>
                      {fileName && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText size={12} /> {fileName}
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
                      <input {...getInputProps()} />
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
                        </div>
                      ) : isDragActive ? (
                        <p className="text-primary font-semibold">Drop CSV file di sini...</p>
                      ) : (
                        <div className="space-y-1">
                          <p className="font-medium">Drag & drop file CSV di sini</p>
                          <p className="text-xs text-muted-foreground">
                            atau klik untuk pilih file
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
                          {['mk_singkat', 'nama_lengkap', 'program_studi', 'dosen_koor'].map(
                            (col) => (
                              <span
                                key={col}
                                className="text-[10px] bg-background border px-1.5 py-0.5 rounded font-mono text-muted-foreground"
                              >
                                {col}
                              </span>
                            )
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/60 mb-3">
                          * Prodi harus valid (IF, IT, SE, DS). Dosen harus 3 huruf.
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
                              <FileText size={12} className="text-sky-500" /> CSV
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2 gap-1.5 bg-background"
                              onClick={() => handleDownloadTemplate('xlsx')}
                            >
                              <FileSpreadsheet size={12} className="text-emerald-500" /> XLSX
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Field>
                </FieldGroup>
              </div>
            </ScrollArea>
          )}

          {step === 'preview' && (
            <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-background/50">
              <div className="flex-1 min-h-0 relative">
                <MataKuliahCSVPreview
                  rows={parsedRows}
                  validPraktikums={localValidPraktikums}
                  term={term}
                  onUpdateRow={handleUpdateRow}
                  onToggleSelect={handleToggleSelect}
                  onToggleAll={handleToggleAll}
                />
              </div>
              <div className="flex justify-between items-center px-6 py-4 border-t bg-background shrink-0 gap-4 mt-auto shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)] z-30">
                <Button variant="outline" onClick={() => setStep('upload')} disabled={loading} className="shrink-0 min-w-[140px]">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Upload
                </Button>
                <div className="flex items-center gap-2 overflow-hidden justify-end flex-1">
                  {parsedRows.filter((r) => r.status === 'error').length > 0 && (
                    <span className="text-xs text-destructive font-medium mr-3 text-right hidden lg:inline-block">
                      {parsedRows.filter((r) => r.status === 'error').length} data bermasalah & akan dilewati
                    </span>
                  )}
                  <Button onClick={handleConfirmImport} disabled={loading || parsedRows.filter(r => r.selected).length === 0} className="shrink-0 min-w-[160px] bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
                    {loading ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4" /> Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> Simpan {parsedRows.filter(r => r.selected).length} Data
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Import?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda sedang dalam proses import. Jika Anda keluar sekarang, data pratinjau akan
              hilang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal, kembali ke pratinjau</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose} variant="destructive">
              Ya, Batalkan Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
