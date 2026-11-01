'use client';

/* eslint-disable react-doctor/no-chain-state-updates */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileSpreadsheet, FileText, X, Download, Loader2, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';
import { useAsprakOnboardStore } from '@/store/useAsprakOnboardStore';
import { NavButton } from '@/components/ui/nav-button';
import AsprakCSVPreview, { PreviewRow } from '@/components/asprak/AsprakCSVPreview';
import {
  validateAsprakData,
  validateAsprakCodeEdit,
  ExistingNimInfo,
} from '@/utils/validation/asprakValidation';
import { ExistingAsprakInfo } from '@/components/asprak/AsprakImportCSVModal';
import { parseSpreadsheet, downloadTemplate } from '@/lib/spreadsheet';

interface StepDataAsprakProps {
  term: string;
  existingCodes: string[];
  existingNims: ExistingNimInfo[];
  existingAspraks: ExistingAsprakInfo[];
  isAlreadyDone?: boolean;
}

const handleDownloadTemplate = (format: 'csv' | 'xlsx') => {
  downloadTemplate('asprak', format);
};

export default function StepDataAsprak({
  term,
  existingCodes,
  existingNims,
  existingAspraks,
}: StepDataAsprakProps) {
  const { asprakRows, setAsprakRows, setValidatedAsprakRows, setCurrentStep, markStepCompleted, unmarkStepCompleted, setPlottingPreviewRows, setValidatedPlottingRows } = useAsprakOnboardStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [saving, setSaving] = useState(false);

  const [forceOverride, setForceOverride] = useState(false);
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);

  const [prevAsprakRows, setPrevAsprakRows] = useState(asprakRows);

  if (asprakRows !== prevAsprakRows) {
    setPrevAsprakRows(asprakRows);
    if (asprakRows.length === 0) {
      setPreviewRows([]);
    } else {
      try {
        const preview = validateAsprakData(asprakRows, existingCodes, existingNims, forceOverride);
        setPreviewRows(preview);
      } catch (e: any) {
        setError(`Error saat menyiapkan data: ${e.message}`);
      }
    }
  }

  const processAndValidate = useCallback(
    async (file: File) => {
      setError(null);
      setFileName(file.name);
      setIsLoading(true);

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
          setError('File kosong, tidak ada data yang ditemukan.');
          setIsLoading(false);
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
          setError('File kosong, tidak ada data yang ditemukan.');
          setIsLoading(false);
          return;
        }

        const firstRow = data[0];
        const requiredCols = ['nama_lengkap', 'nim'];
        const missingCols = requiredCols.filter((col) => !(col in firstRow));

        if (missingCols.length > 0) {
          setError(
            `Kolom wajib tidak ditemukan: ${missingCols.join(', ')}. \nKolom yang terdeteksi: ${Object.keys(firstRow).join(', ')}`
          );
          setIsLoading(false);
          return;
        }

        setAsprakRows(data);
        setIsLoading(false);
      } catch (err: any) {
        setError(`Gagal membaca file: ${err.message}`);
        setIsLoading(false);
      }
    },
    [setAsprakRows]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => acceptedFiles[0] && processAndValidate(acceptedFiles[0]),
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1,
    disabled: isLoading,
  });



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
        const revalidated = validateAsprakData(remappedData, existingCodes, existingNims, forceOverride);
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

  const handleConfirm = async () => {
    const selectedRows = previewRows.filter(
      (r) => r.selected && (r.status === 'ok' || r.status === 'warning')
    );

    if (selectedRows.length === 0) return;

    const storeRows = selectedRows.map((r) => ({
      nim: r.nim,
      nama_lengkap: r.nama_lengkap,
      kode: r.kode,
      role: r.role,
      angkatan: r.angkatan,
    }));

    setValidatedAsprakRows(storeRows);
    markStepCompleted('data_asprak');
    setCurrentStep('plotting');
  };

  return (
    <Card className="border shadow-sm w-full">
      <CardHeader>
        <CardTitle className="text-xl">Langkah 1: Data Asprak</CardTitle>
        <CardDescription>
          Unggah file CSV berisi data asisten praktikum dan lakukan pratinjau sebelum lanjut.
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

        {asprakRows.length === 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium leading-none">Pilih File CSV</span>
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
              {isLoading ? (
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
                      <p className="font-medium text-lg">Drag & drop file CSV di sini</p>
                      <p className="text-xs text-muted-foreground">atau klik untuk pilih file (.csv, .xlsx)</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
              <p className="text-sm text-muted-foreground mb-3 font-medium">Format Kolom yang Dibutuhkan:</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {['nama_lengkap', 'nim', 'kode (opsional)', 'angkatan', 'role (opsional)'].map((col) => (
                  <span
                    key={col}
                    className="text-xs bg-background border px-2 py-1 rounded font-mono text-muted-foreground"
                  >
                    {col}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground/80 mb-4 leading-relaxed">
                * Kolom <code className="bg-muted px-1 py-0.5 rounded text-foreground">kode</code> boleh kosong (akan di-generate otomatis oleh sistem). 
                Kolom <code className="bg-muted px-1 py-0.5 rounded text-foreground">role</code> akan default menjadi ASPRAK jika kosong.
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
          </div>
        ) : (
          <div className="border rounded-md">
            <div className="p-4 bg-muted/20 border-b flex justify-between items-center">
              <h3 className="font-medium text-sm">Preview Data Profil ({previewRows.length})</h3>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => {
                    setAsprakRows([]);
                    setPreviewRows([]);
                    setFileName(null);
                    setError(null);
                    unmarkStepCompleted('data_asprak');
                    unmarkStepCompleted('plotting');
                    unmarkStepCompleted('preview-final');
                    setPlottingPreviewRows([]);
                    setValidatedPlottingRows([]);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Bersihkan & Ulangi
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <AsprakCSVPreview
                rows={previewRows}
                term={term}
                onConfirm={handleConfirm}
                onBack={() => {}}
                onCodeEdit={handleCodeEdit}
                onRoleEdit={handleRoleEdit}
                onToggleSelect={handleToggleSelect}
                onToggleAll={handleToggleAll}
                loading={saving}
                forceOverride={forceOverride}
                onForceOverrideChange={handleForceOverrideToggle}
                hideButtons={true}
              />
            </div>
          </div>
        )}
      </CardContent>
      
      {asprakRows.length > 0 && (
        <CardFooter className="flex justify-end border-t p-6">
          <NavButton 
            direction="next"
            onClick={handleConfirm} 
            disabled={saving || previewRows.filter(r => r.selected && (r.status === 'ok' || r.status === 'warning')).length === 0}
            loading={saving}
            loadingText="Menyiapkan..."
            className="min-w-[160px] bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            Selanjutnya
          </NavButton>
        </CardFooter>
      )}

      <AlertDialog open={showOverrideConfirm} onOpenChange={setShowOverrideConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Pemaksaan Kode</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin memaksakan kode dari CSV?
              <br />
              <br />
              <span className="font-semibold text-destructive">Perhatian:</span> Ini akan mengabaikan
              peringatan bentrok kode dari database, termasuk kode yang baru saja dipakai dalam selisih
              kurang dari 5 tahun. Tindakan ini akan me-refresh ulang preview data serta mereset
              input kode manual yang telah Anda ubah.
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
    </Card>
  );
}
