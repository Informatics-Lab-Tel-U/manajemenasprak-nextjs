"use client";

/* eslint-disable react-doctor/no-impure-state-updater */
import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, FileSpreadsheet, Download } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as importFetcher from '@/lib/fetchers/importFetcher';
import * as jadwalFetcher from '@/lib/fetchers/jadwalFetcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { Role } from '@/config/rbac';
import { toast } from 'sonner';

import StepPraktikum from '@/components/pengaturan/excel-steps/StepPraktikum';
import StepMataKuliah from '@/components/pengaturan/excel-steps/StepMataKuliah';
import StepAsprak from '@/components/pengaturan/excel-steps/StepAsprak';
import StepPlotting from '@/components/pengaturan/excel-steps/StepPlotting';
import StepJadwal from '@/components/pengaturan/excel-steps/StepJadwal';
import { TwoFactorSecurityCard } from '@/components/pengaturan/TwoFactorSecurityCard';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useTahunAjaran } from '@/hooks/useTahunAjaran';
import { useTermStore } from '@/store/useTermStore';

interface DatabaseClientPageProps {
  initialIsMaintenance: boolean;
  initialMaintenanceStatuses?: { dashboard: boolean; informaticsweb: boolean; generator_kursi: boolean };
  initialUserRole: Role | null;
}

export default function DatabaseClientPage({
  initialIsMaintenance,
  initialMaintenanceStatuses,
  initialUserRole,
}: DatabaseClientPageProps) {
  const router = useRouter();
  const [termYear, setTermYear] = useState('24');
  const [termSem, setTermSem] = useState<'1' | '2'>('2');

  const [uiState, updateUiState] = React.useReducer(
    (prev: any, next: any) => ({ ...prev, ...next }),
    { loading: false, status: null as any, progress: 0 }
  );
  const { loading, status, progress } = uiState;

  const { activeTerm: globalActiveTerm, setActiveTerm: setGlobalActiveTerm } = useTermStore();
  const { tahunAjaranList, loading: loadingTahunAjaran, refetch: refetchTahunAjaran } = useTahunAjaran();
  const [selectedExportTerm, setExportTerm] = useState('');
  const exportTerm = selectedExportTerm || globalActiveTerm || (tahunAjaranList.length > 0 ? tahunAjaranList[0] : '');

  const [selectedDeleteTerm, setDeleteTerm] = useState('');
  const deleteTerm = selectedDeleteTerm || globalActiveTerm || (tahunAjaranList.length > 0 ? tahunAjaranList[0] : '');

  const [isMaintenance, setIsMaintenance] = useState(initialIsMaintenance);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);
  const [maintenanceStatuses, setMaintenanceStatuses] = useState({
    dashboard: initialMaintenanceStatuses?.dashboard ?? initialIsMaintenance,
    informaticsweb: initialMaintenanceStatuses?.informaticsweb ?? false,
    generator_kursi: initialMaintenanceStatuses?.generator_kursi ?? false,
  });
  const [loadingMaintenanceApp, setLoadingMaintenanceApp] = useState<string | null>(null);
  const [userRole] = useState<Role | null>(initialUserRole);

  const [wizardStep, setWizardStep] = useState<number>(0);
  const [excelData, setExcelData] = useState<{
    praktikum: any[];
    mataKuliah: any[];
    asprak: any[];
    plotting: any[];
    jadwal: any[];
  } | null>(null);
  const [activeTerm, setActiveTerm] = useState<string>('');



  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteTermModalOpen, setIsDeleteTermModalOpen] = useState(false);
  const [isDeleteDataTermModalOpen, setIsDeleteDataTermModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [confirmTermInput, setConfirmTermInput] = useState('');
  const [confirmDataTermInput, setConfirmDataTermInput] = useState('');
  const [selectedDeleteDataTerm, setDeleteDataTerm] = useState<string>('');
  const deleteDataTerm = selectedDeleteDataTerm || globalActiveTerm || (tahunAjaranList.length > 0 ? tahunAjaranList[0] : '');

  const CONFIRMATION_PHRASE = 'HAPUS SEMUA';
  const CONFIRMATION_TERM_PHRASE = 'HAPUS JADWAL';
  const CONFIRMATION_DATA_TERM_PHRASE = 'HAPUS SEMUA DATA';

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const startY = parseInt(termYear);
      const term = `${startY}${startY + 1}-${termSem}`;

      updateUiState({ loading: true, status: null, progress: 0 });
      updateUiState({ status: { type: 'info', message: `Memproses ${file.name}...` } });

      const interval = setInterval(() => {
        updateUiState({
          progress: (prev: number) => {
            if (prev >= 90) return prev;
            return prev + Math.floor(Math.random() * 10) + 5;
          }
        });
      }, 500);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/util/parse-dataset', {
          method: 'POST',
          body: formData,
        });

        const resData = await res.json();
        if (!res.ok || !resData.ok) {
          throw new Error(resData.error || 'Gagal memproses file dataset');
        }

        setExcelData(resData.data);
        setActiveTerm(term);

        clearInterval(interval);
        updateUiState({ progress: 100 });
        updateUiState({ status: null });
        setWizardStep(1);
      } catch (e: any) {
        clearInterval(interval);
        updateUiState({ progress: 100 });
        updateUiState({ status: { type: 'error', message: e.message || 'Gagal memproses file' } });
      } finally {
        updateUiState({ loading: false });
        setTimeout(() => updateUiState({ progress: 0 }), 1000);
      }
    },
    [termYear, termSem]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1,
  });

  const handleClearTrigger = () => {
    setIsDeleteModalOpen(true);
    setConfirmInput('');
  };

  const handleExecuteClear = async () => {
    if (confirmInput !== CONFIRMATION_PHRASE) return;

    setIsDeleteModalOpen(false);
    updateUiState({ loading: true, status: { type: 'info', message: 'Membersihkan database...' } });

    try {
      const res = await fetch('/api/clear', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      updateUiState({ status: { type: 'success', message: 'Database berhasil dibersihkan!' } });
      refetchTahunAjaran();
      router.refresh();
    } catch (e: any) {
      updateUiState({ status: { type: 'error', message: e.message } });
    } finally {
      updateUiState({ loading: false });
    }
  };

  const handleDeleteJadwalTermTrigger = () => {
    if (!deleteTerm) return;
    setIsDeleteTermModalOpen(true);
    setConfirmTermInput('');
  };

  const handleExecuteDeleteJadwalTerm = async () => {
    if (confirmTermInput !== CONFIRMATION_TERM_PHRASE) return;

    setIsDeleteTermModalOpen(false);
    updateUiState({ loading: true, status: { type: 'info', message: `Menghapus jadwal angkatan ${deleteTerm}...` } });

    try {
      const result = await jadwalFetcher.deleteJadwalByTerm(deleteTerm);
      if (result.ok) {
        updateUiState({ status: { type: 'success', message: `Berhasil menghapus jadwal angkatan ${deleteTerm}!` } });
        setDeleteTerm('');
        router.refresh();
      } else {
        throw new Error(result.error);
      }
    } catch (e: any) {
      updateUiState({ status: { type: 'error', message: e.message || 'Gagal menghapus jadwal' } });
    } finally {
      updateUiState({ loading: false });
    }
  };

  const handleDeleteDataTermTrigger = () => {
    if (!deleteDataTerm) return;
    setIsDeleteDataTermModalOpen(true);
    setConfirmDataTermInput('');
  };

  const handleExecuteDeleteDataTerm = async () => {
    if (confirmDataTermInput !== CONFIRMATION_DATA_TERM_PHRASE) return;

    setIsDeleteDataTermModalOpen(false);
    updateUiState({ loading: true, status: { type: 'info', message: `Menghapus semua data angkatan ${deleteDataTerm}...` } });

    try {
      const res = await fetch('/api/clear-term', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: deleteDataTerm })
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        updateUiState({ status: { type: 'success', message: `Berhasil menghapus semua data untuk angkatan ${deleteDataTerm}!` } });

        if (deleteDataTerm === globalActiveTerm) {
          const newTerms = tahunAjaranList.filter(t => t !== deleteDataTerm);
          if (newTerms.length > 0) {
            setGlobalActiveTerm(newTerms[0]);
          } else {
            setGlobalActiveTerm('');
          }
        }

        setDeleteDataTerm('');

        refetchTahunAjaran();
        router.refresh();
      } else {
        throw new Error(data.error || 'Gagal menghapus data');
      }
    } catch (e: any) {
      updateUiState({ status: { type: 'error', message: e.message || 'Gagal menghapus data' } });
    } finally {
      updateUiState({ loading: false });
    }
  };

  const handleExport = async () => {
    if (!exportTerm) {
      updateUiState({ status: { type: 'error', message: 'Silakan pilih tahun ajaran yang akan diexport' } });
      return;
    }

    updateUiState({ loading: true, status: { type: 'info', message: `Mengekspor data untuk angkatan: ${exportTerm}...` } });

    try {
      const result = await importFetcher.exportExcelDataset(exportTerm);
      if (result.ok && result.data) {
        const res = await fetch('/api/util/export-dataset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataset: result.data, filename: `EXPORT_${exportTerm}.xlsx` }),
        });
        if (!res.ok) throw new Error('Ekspor dataset gagal');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `EXPORT_${exportTerm}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
        updateUiState({ status: { type: 'success', message: `Berhasil mengekspor data untuk ${exportTerm}!` } });
      } else {
        updateUiState({ status: { type: 'error', message: result.error || 'Ekspor gagal' } });
      }
    } catch (e: any) {
      updateUiState({ status: { type: 'error', message: e.message || 'Ekspor gagal' } });
    } finally {
      updateUiState({ loading: false });
    }
  };

  const handleDownloadTemplate = async () => {
    const startY = parseInt(termYear);
    const termStr = `${startY}${startY + 1}-${termSem}`;
    try {
      const res = await fetch(`/api/util/template?type=dataset&term=${encodeURIComponent(termStr)}&format=xlsx`);
      if (!res.ok) throw new Error('Gagal mengunduh template');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${termStr}_TEMPLATE.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (e: any) {
      toast.error(e.message || 'Gagal mengunduh template');
    }
  };

  const handleToggleMaintenance = async (checked: boolean) => {
    setLoadingMaintenance(true);
    try {
      const res = await fetch('/api/system/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: checked, app: 'dashboard' }),
      });
      const data = await res.json();
      if (data.ok) {
        setIsMaintenance(checked);
        setMaintenanceStatuses((prev) => ({ ...prev, dashboard: checked }));
        toast.success(checked ? 'Maintenance Mode Diaktifkan' : 'Maintenance Mode Dimatikan');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengubah status maintenance');
    } finally {
      setLoadingMaintenance(false);
    }
  };

  const handleToggleMaintenanceApp = async (app: string, checked: boolean, label: string) => {
    setLoadingMaintenanceApp(app);
    try {
      const res = await fetch('/api/system/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: checked, app }),
      });
      const data = await res.json();
      if (data.ok) {
        setMaintenanceStatuses((prev) => ({ ...prev, [app]: checked }));
        if (app === 'dashboard') setIsMaintenance(checked);
        toast.success(checked ? `Maintenance Mode (${label}) Diaktifkan` : `Maintenance Mode (${label}) Dimatikan`);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || `Gagal mengubah status maintenance ${label}`);
    } finally {
      setLoadingMaintenanceApp(null);
    }
  };

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8">
      {/* Page Header */}
      <header className="mb-10 pb-8 border-b border-border/50">
        <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-sm 2xl:text-base text-muted-foreground mt-1">
          Kelola impor, ekspor, dan pembersihan data sistem.
        </p>
      </header>

      {/* Global Status */}
      {status && (
        <Alert
          variant={status.type === 'error' ? 'destructive' : 'default'}
          className={cn(
            'mb-8',
            status.type === 'success' && 'border-green-500 text-green-700 dark:text-green-400',
            status.type === 'info' && 'border-blue-500 text-blue-700 dark:text-blue-400'
          )}
        >
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      {/* Section: Import Excel Dataset */}
      <section className="pb-10 mb-10 border-b border-border/40">
        <div className="space-y-1 mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Import Excel Dataset</h2>
            {wizardStep > 0 && (
              <Badge variant="secondary" className="text-xs">
                Langkah {wizardStep}/5
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Upload file .xlsx untuk mengimpor data ke dalam sistem.
          </p>
        </div>

        {wizardStep === 0 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm">Tahun Ajaran</Label>
              <div className="flex items-center gap-2">
                <Input
                  required
                  type="number"
                  min="10"
                  max="99"
                  placeholder="YY"
                  value={termYear}
                  onChange={(e) => setTermYear(e.target.value)}
                  className="w-20 text-center"
                />
                <span className="text-muted-foreground">/</span>
                <Input
                  readOnly
                  tabIndex={-1}
                  value={termYear ? parseInt(termYear) + 1 : 'YY'}
                  className="w-20 text-center pointer-events-none"
                />
                <span className="text-muted-foreground">-</span>
                <Select value={termSem} onValueChange={(val) => setTermSem(val as '1' | '2')}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="1">1 (Ganjil)</SelectItem>
                      <SelectItem value="2">2 (Genap)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Isi ini untuk otomatis mengisi tahun ajaran jika di Excel kosong.
              </p>
            </div>

            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all',
                isDragActive
                  ? 'border-foreground bg-muted/20'
                  : 'border-border bg-transparent hover:border-foreground/40 hover:bg-muted/10'
              )}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet size={40} className="text-muted-foreground mb-4 mx-auto" />
              {isDragActive ? (
                <p className="font-semibold text-sm">Letakkan file Excel di sini...</p>
              ) : (
                <div className="space-y-1">
                  <p className="font-medium text-sm">Tarik & letakkan dataset .xlsx di sini</p>
                  <p className="text-sm text-muted-foreground">atau klik untuk memilih file</p>
                  <p className="text-xs text-muted-foreground mt-3">
                    Sheet: praktikum, mata_kuliah, asprak, jadwal, asprak_praktikum
                  </p>
                </div>
              )}
              {loading && (
                <div className="mt-4 space-y-2">
                  <Progress value={progress} className="h-1 w-full" />
                  <p className="text-xs text-muted-foreground">
                    {progress}% Mengunggah & Memproses...
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {wizardStep === 1 && excelData && (
          <div>
            <div className="mb-4">
              <h3 className="font-semibold text-lg">Langkah 1: Praktikum</h3>
              <p className="text-sm text-muted-foreground">Tinjau dan simpan data Praktikum</p>
            </div>
            <StepPraktikum
              data={excelData.praktikum}
              onNext={() => setWizardStep(2)}
              onPrev={() => setWizardStep(0)}
              onImport={async (rows) => {
                await fetch('/api/praktikum', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'bulk-import', rows }),
                }).then((res) => {
                  if (!res.ok) throw new Error('Gagal import praktikum');
                });
              }}
            />
          </div>
        )}

        {wizardStep === 2 && excelData && (
          <div>
            <div className="mb-4">
              <h3 className="font-semibold text-lg">Langkah 2: Mata Kuliah</h3>
              <p className="text-sm text-muted-foreground">
                Tinjau dan simpan data Mata Kuliah ({activeTerm})
              </p>
            </div>
            <StepMataKuliah
              data={excelData.mataKuliah}
              term={activeTerm}
              onNext={() => setWizardStep(3)}
              onPrev={() => setWizardStep(1)}
              onImport={async (rows, t) => {
                await fetch(`/api/mata-kuliah`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'bulk', data: rows, term: t }),
                }).then((res) => {
                  if (!res.ok) throw new Error('Gagal import MK');
                });
              }}
            />
          </div>
        )}

        {wizardStep === 3 && excelData && (
          <div>
            <div className="mb-4">
              <h3 className="font-semibold text-lg">Langkah 3: Asisten Praktikum</h3>
              <p className="text-sm text-muted-foreground">Tinjau dan simpan data Asprak</p>
            </div>
            <StepAsprak
              data={excelData.asprak}
              term={activeTerm}
              onNext={() => setWizardStep(4)}
              onPrev={() => setWizardStep(2)}
              onImport={async (rows, _t) => {
                const res = await fetch('/api/asprak', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'bulk-import', rows: rows }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Gagal import Asprak');
              }}
            />
          </div>
        )}

        {wizardStep === 4 && excelData && (
          <div>
            <div className="mb-4">
              <h3 className="font-semibold text-lg">Langkah 4: Penugasan (Plotting)</h3>
              <p className="text-sm text-muted-foreground">
                Tinjau dan simpan Plotting Asprak ({activeTerm})
              </p>
            </div>
            <StepPlotting
              data={excelData.plotting}
              term={activeTerm}
              onNext={() => setWizardStep(5)}
              onPrev={() => setWizardStep(3)}
              onSuccess={() => { }}
            />
          </div>
        )}

        {wizardStep === 5 && excelData && (
          <div>
            <div className="mb-4">
              <h3 className="font-semibold text-lg">Langkah 5: Jadwal</h3>
              <p className="text-sm text-muted-foreground">
                Tinjau dan simpan data Jadwal ({activeTerm})
              </p>
            </div>
            <StepJadwal
              data={excelData.jadwal}
              term={activeTerm}
              onPrev={() => setWizardStep(4)}
              onNext={() => {
                setWizardStep(0);
                setExcelData(null);
                updateUiState({ status: { type: 'success', message: 'Import Excel selesai dengan sukses!' } });
              }}
              onImport={async (rows) => {
                const res = await jadwalFetcher.bulkImportJadwal(rows);
                if (!res.ok) throw new Error(res.error || 'Gagal import jadwal');
              }}
            />
          </div>
        )}
      </section>

      {/* Section: Export & Template */}
      <section className="pb-10 mb-10 border-b border-border/40">
        <div className="space-y-1 mb-6">
          <h2 className="text-base font-semibold">Export & Template</h2>
          <p className="text-sm text-muted-foreground">
            Unduh data aktif atau format template kosong untuk impor.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Export */}
          <Card className="flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-base">Export Dataset</CardTitle>
              <CardDescription>
                Unduh seluruh data database dalam format Excel (.xlsx)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={exportTerm}
                onValueChange={setExportTerm}
                disabled={loading || loadingTahunAjaran}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue
                    placeholder={loadingTahunAjaran ? 'Memuat...' : 'Pilih Tahun Ajaran'}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {tahunAjaranList.map((term) => (
                      <SelectItem key={term} value={term}>
                        {term}
                      </SelectItem>
                    ))}
                    {tahunAjaranList.length === 0 && !loadingTahunAjaran && (
                      <SelectItem value="none" disabled>
                        Tidak ada data di database
                      </SelectItem>
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button
                onClick={handleExport}
                disabled={loading || !exportTerm}
                className="w-full h-9 gap-2"
                size="sm"
              >
                <FileSpreadsheet size={14} />
                Unduh Dataset (.xlsx)
              </Button>
            </CardFooter>
          </Card>

          {/* Template */}
          <Card className="flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-base">Template Excel</CardTitle>
              <CardDescription>Format spreadsheet kosong siap diisi untuk impor data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Input
                  required
                  type="number"
                  min="10"
                  max="99"
                  placeholder="YY"
                  value={termYear}
                  onChange={(e) => setTermYear(e.target.value)}
                  className="w-20 text-center h-9"
                />
                <span className="text-muted-foreground text-sm">/</span>
                <Input
                  readOnly
                  tabIndex={-1}
                  value={termYear ? parseInt(termYear) + 1 : 'YY'}
                  className="w-20 text-center h-9 pointer-events-none"
                />
                <Select value={termSem} onValueChange={(val) => setTermSem(val as '1' | '2')}>
                  <SelectTrigger className="flex-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="1">1 (Ganjil)</SelectItem>
                      <SelectItem value="2">2 (Genap)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button
                onClick={handleDownloadTemplate}
                variant="outline"
                className="w-full h-9 gap-2"
                size="sm"
              >
                <Download size={14} />
                Unduh Template (.xlsx)
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Section: System Control — ADMIN ONLY */}
      {userRole === 'ADMIN' && (
        <>
          <section className="pb-10 mb-10 border-b border-border/40">
            <div className="space-y-1 mb-6">
              <h2 className="text-base font-semibold">System Control</h2>
              <p className="text-sm text-muted-foreground">
                Kelola status sistem dan akses pengguna.
              </p>
            </div>

            {/* Maintenance Mode Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Dashboard & Portal Asisten */}
              <Card className="flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-base">Dashboard Manajemen</CardTitle>
                  <CardDescription>
                    Kunci akses publik & non-admin pada portal manajemen praktikum & asisten.
                  </CardDescription>
                  {maintenanceStatuses.dashboard && (
                    <CardAction>
                      <Badge variant="destructive">Maintenance</Badge>
                    </CardAction>
                  )}
                </CardHeader>
                <CardFooter className="flex items-center justify-between border-t pt-4">
                  <Label htmlFor="switch-dashboard" className="text-xs font-medium text-muted-foreground cursor-pointer">
                    {maintenanceStatuses.dashboard ? 'Pemeliharaan Aktif' : 'Operasional Normal'}
                  </Label>
                  <Switch
                    id="switch-dashboard"
                    checked={maintenanceStatuses.dashboard}
                    onCheckedChange={(checked) => handleToggleMaintenanceApp('dashboard', checked, 'Dashboard')}
                    disabled={loadingMaintenanceApp === 'dashboard'}
                  />
                </CardFooter>
              </Card>

              {/* Web Publik Informatics Web/Blog */}
              <Card className="flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-base">Informatics Web / Blog</CardTitle>
                  <CardDescription>
                    Tutup sementara akses blog, pengumuman, dan artikel publik laboratorium.
                  </CardDescription>
                  {maintenanceStatuses.informaticsweb && (
                    <CardAction>
                      <Badge variant="destructive">Maintenance</Badge>
                    </CardAction>
                  )}
                </CardHeader>
                <CardFooter className="flex items-center justify-between border-t pt-4">
                  <Label htmlFor="switch-informaticsweb" className="text-xs font-medium text-muted-foreground cursor-pointer">
                    {maintenanceStatuses.informaticsweb ? 'Pemeliharaan Aktif' : 'Operasional Normal'}
                  </Label>
                  <Switch
                    id="switch-informaticsweb"
                    checked={maintenanceStatuses.informaticsweb}
                    onCheckedChange={(checked) => handleToggleMaintenanceApp('informaticsweb', checked, 'Informatics Web')}
                    disabled={loadingMaintenanceApp === 'informaticsweb'}
                  />
                </CardFooter>
              </Card>

              {/* Generator Kursi V2 */}
              <Card className="flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-base">Generator Kursi Praktikum</CardTitle>
                  <CardDescription>
                    Kunci aplikasi pengacak nomor bangku & tempat duduk sesi laboratorium.
                  </CardDescription>
                  {maintenanceStatuses.generator_kursi && (
                    <CardAction>
                      <Badge variant="destructive">Maintenance</Badge>
                    </CardAction>
                  )}
                </CardHeader>
                <CardFooter className="flex items-center justify-between border-t pt-4">
                  <Label htmlFor="switch-generator-kursi" className="text-xs font-medium text-muted-foreground cursor-pointer">
                    {maintenanceStatuses.generator_kursi ? 'Pemeliharaan Aktif' : 'Operasional Normal'}
                  </Label>
                  <Switch
                    id="switch-generator-kursi"
                    checked={maintenanceStatuses.generator_kursi}
                    onCheckedChange={(checked) => handleToggleMaintenanceApp('generator_kursi', checked, 'Generator Kursi')}
                    disabled={loadingMaintenanceApp === 'generator_kursi'}
                  />
                </CardFooter>
              </Card>
            </div>
          </section>

          {/* Security Section */}
          <section className="pb-10 mb-10 border-b border-border/40">
            <div className="space-y-1 mb-6">
              <h2 className="text-base font-semibold">Keamanan</h2>
              <p className="text-sm text-muted-foreground">
                Kelola autentikasi dan perlindungan akses akun.
              </p>
            </div>
            <TwoFactorSecurityCard />
          </section>

          {/* Danger Zone */}
          <section className="pb-10">
            <div className="space-y-1 mb-6">
              <h2 className="text-base font-semibold text-destructive">Danger Zone</h2>
              <p className="text-sm text-muted-foreground">
                Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
              </p>
            </div>

            <Card className="border-destructive/30 shadow-none">
              <CardContent className="p-0 divide-y divide-destructive/20">
                {/* Delete Jadwal by Term */}
                <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Hapus Jadwal per Tahun Ajaran</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Menghapus jadwal untuk term tertentu, tidak menghapus Mata Kuliah dan Praktikum.
                    </p>
                    <div className="pt-2">
                      <Select
                        value={deleteTerm}
                        onValueChange={setDeleteTerm}
                        disabled={loading || loadingTahunAjaran}
                      >
                        <SelectTrigger className="h-8 w-48 text-xs">
                          <SelectValue
                            placeholder={loadingTahunAjaran ? 'Memuat...' : 'Pilih Tahun Ajaran'}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {tahunAjaranList.map((term) => (
                              <SelectItem key={term} value={term}>
                                {term}
                              </SelectItem>
                            ))}
                            {tahunAjaranList.length === 0 && !loadingTahunAjaran && (
                              <SelectItem value="none" disabled>
                                Tidak ada data
                              </SelectItem>
                            )}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteJadwalTermTrigger}
                    disabled={loading || !deleteTerm}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Hapus Jadwal {deleteTerm || ''}
                  </Button>
                </div>

                {/* Hapus Semua Data by Term */}
                <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Hapus Semua Data per Tahun Ajaran</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Menghapus Praktikum, Mata Kuliah, Jadwal, Plotting Asprak, dan Pelanggaran untuk term terkait.
                    </p>
                    <div className="pt-2">
                      <Select
                        value={deleteDataTerm}
                        onValueChange={setDeleteDataTerm}
                        disabled={loading || loadingTahunAjaran}
                      >
                        <SelectTrigger className="h-8 w-48 text-xs">
                          <SelectValue
                            placeholder={loadingTahunAjaran ? 'Memuat...' : 'Pilih Tahun Ajaran'}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {tahunAjaranList.map((term) => (
                              <SelectItem key={term} value={term}>
                                {term}
                              </SelectItem>
                            ))}
                            {tahunAjaranList.length === 0 && !loadingTahunAjaran && (
                              <SelectItem value="none" disabled>
                                Tidak ada data
                              </SelectItem>
                            )}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteDataTermTrigger}
                    disabled={loading || !deleteDataTerm}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Hapus Semua Data {deleteDataTerm || ''}
                  </Button>
                </div>

                {/* Clear Entire Database */}
                <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Clear Entire Database</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Menghapus SEMUA data dari semua tabel (kecuali data login).
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleClearTrigger}
                    disabled={loading}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Reset Database
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      )}

      {/* Delete Confirmation Modal (Full Clear) */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apakah Anda benar-benar yakin?</DialogTitle>
            <DialogDescription>
              Tindakan ini akan menghapus seluruh data praktikum, mata kuliah, asprak, dan jadwal
              secara permanen.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Ketik "{CONFIRMATION_PHRASE}" untuk mengonfirmasi:</Label>
            <Input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={CONFIRMATION_PHRASE}
              className="border-destructive focus-visible:ring-destructive"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleExecuteClear}
              disabled={confirmInput !== CONFIRMATION_PHRASE}
            >
              Hapus Semua Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Terminal Modal (Delete Term) */}
      <Dialog open={isDeleteTermModalOpen} onOpenChange={setIsDeleteTermModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Jadwal Angkatan {deleteTerm}?</DialogTitle>
            <DialogDescription>
              Semua jadwal praktikum untuk angkatan {deleteTerm} akan dihapus selamanya.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Ketik "{CONFIRMATION_TERM_PHRASE}" untuk mengonfirmasi:</Label>
            <Input
              value={confirmTermInput}
              onChange={(e) => setConfirmTermInput(e.target.value)}
              placeholder={CONFIRMATION_TERM_PHRASE}
              className="border-destructive focus-visible:ring-destructive"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteTermModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleExecuteDeleteJadwalTerm}
              disabled={confirmTermInput !== CONFIRMATION_TERM_PHRASE}
            >
              Hapus Jadwal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal (Delete All Data by Term) */}
      <Dialog open={isDeleteDataTermModalOpen} onOpenChange={setIsDeleteDataTermModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Semua Data Angkatan {deleteDataTerm}?</DialogTitle>
            <DialogDescription>
              Tindakan ini akan menghapus semua Praktikum, Mata Kuliah, Jadwal, Plotting Asprak, dan Pelanggaran untuk angkatan {deleteDataTerm} selamanya. Master Data Asprak tidak akan dihapus.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Ketik "{CONFIRMATION_DATA_TERM_PHRASE}" untuk mengonfirmasi:</Label>
            <Input
              value={confirmDataTermInput}
              onChange={(e) => setConfirmDataTermInput(e.target.value)}
              placeholder={CONFIRMATION_DATA_TERM_PHRASE}
              className="border-destructive focus-visible:ring-destructive"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteDataTermModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleExecuteDeleteDataTerm}
              disabled={confirmDataTermInput !== CONFIRMATION_DATA_TERM_PHRASE}
            >
              Hapus Semua Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
