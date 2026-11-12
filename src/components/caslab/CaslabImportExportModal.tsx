'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { parseSpreadsheet, exportSpreadsheet } from '@/lib/spreadsheet';
import {
  processCaslabCandidates,
  extractCaslabCandidatesFromParsed,
} from '@/utils/caslabShuffle';
import type { CaslabCandidate } from '@/types/caslab';

interface CaslabImportExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (candidates: CaslabCandidate[]) => void;
  onExportExcel: () => void;
  candidateCount: number;
  seatedCount: number;
  isShuffled: boolean;
}

export function CaslabImportExportModal({
  open,
  onOpenChange,
  onImportComplete,
  onExportExcel,
  candidateCount,
  seatedCount,
  isShuffled,
}: CaslabImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<CaslabCandidate[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDownloadTemplate = async (format: 'xlsx' | 'csv') => {
    const templateData = [
      {
        'NIM': '1301223045',
        'Nama Lengkap': 'Muhammad Abiyyu Al-Ghifari',
        'Kode Aslab': 'MAB',
      },
      {
        'NIM': '1301220112',
        'Nama Lengkap': 'Athila Ramdani Saputra',
        'Kode Aslab': '',
      },
      {
        'NIM': '1301220455',
        'Nama Lengkap': 'Febry Triantoro',
        'Kode Aslab': '',
      },
    ];

    try {
      await exportSpreadsheet(
        templateData,
        `Template_Caslab.${format}`,
        'Caslab',
        format
      );
      toast.success(`Template ${format.toUpperCase()} diunduh.`);
    } catch {
      toast.error('Gagal mengunduh template.');
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setFileName(file.name);
    setIsProcessing(true);

    try {
      const rawRows = await parseSpreadsheet(file);
      if (!Array.isArray(rawRows) || rawRows.length === 0) {
        throw new Error('File kosong.');
      }

      const parsedList = extractCaslabCandidatesFromParsed(rawRows);

      if (parsedList.length === 0) {
        throw new Error('Kolom NIM atau Nama tidak ditemukan pada file.');
      }

      const processed = processCaslabCandidates(parsedList);
      setParsedPreview(processed);
      toast.success(`${processed.length} peserta terbaca.`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal memproses file.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const handleConfirmImport = () => {
    if (parsedPreview.length === 0) return;
    onImportComplete(parsedPreview);
    onOpenChange(false);
    setParsedPreview([]);
    setFileName(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import / Export</DialogTitle>
          <DialogDescription>
            Import data peserta atau export hasil plotting ke Excel.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as 'import' | 'export')}
          className="w-full pt-1"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import" className="text-xs">
              Import
            </TabsTrigger>
            <TabsTrigger value="export" className="text-xs">
              Export ({candidateCount})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: IMPORT */}
          <TabsContent value="import" className="space-y-4 pt-2">
            {/* Download Template Buttons */}
            <div className="flex items-center justify-between text-xs p-2 rounded-md border bg-muted/20">
              <span className="text-muted-foreground">Template:</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadTemplate('xlsx')}
                  className="h-7 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Excel (.xlsx)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadTemplate('csv')}
                  className="h-7 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  CSV
                </Button>
              </div>
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center gap-2">
                <FileSpreadsheet className="h-7 w-7 text-muted-foreground" />
                {isProcessing ? (
                  <p className="text-xs font-medium">Memproses berkas...</p>
                ) : fileName ? (
                  <div>
                    <p className="text-xs font-medium text-foreground">{fileName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {parsedPreview.length} peserta terbaca.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-medium">
                      {isDragActive ? 'Lepaskan berkas di sini' : 'Tarik berkas ke sini, atau klik untuk memilih'}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Format: .xlsx, .xls, .csv (NIM, Nama Lengkap, [Kode])
                    </p>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              * Kode aslab 3-huruf otomatis dibuat jika kolom kode dikosongkan.
            </p>

            {/* Preview snippet if parsed */}
            {parsedPreview.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium">
                  Preview ({parsedPreview.length} Peserta)
                </span>
                <div className="max-h-32 overflow-y-auto rounded-md border text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-muted text-muted-foreground sticky top-0">
                      <tr>
                        <th className="py-1 px-2.5 w-8 text-center">No</th>
                        <th className="py-1 px-2.5 w-16">Kode</th>
                        <th className="py-1 px-2.5 w-24">NIM</th>
                        <th className="py-1 px-2.5">Nama</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parsedPreview.slice(0, 10).map((c, i) => (
                        <tr key={c.id}>
                          <td className="py-1 px-2.5 text-center text-muted-foreground">{i + 1}</td>
                          <td className="py-1 px-2.5 font-mono font-semibold">{c.kode}</td>
                          <td className="py-1 px-2.5 font-mono">{c.nim}</td>
                          <td className="py-1 px-2.5 truncate max-w-[180px]">{c.nama_lengkap}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-1">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button onClick={handleConfirmImport} disabled={parsedPreview.length === 0}>
                Import {parsedPreview.length > 0 ? `(${parsedPreview.length})` : ''}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* TAB 2: EXPORT */}
          <TabsContent value="export" className="space-y-4 pt-2">
            <div className="rounded-md border p-3.5 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Status Plotting</span>
                <Badge variant={isShuffled ? 'secondary' : 'outline'} className="text-[11px]">
                  {isShuffled ? 'Sudah Di-plot' : 'Belum Di-plot'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-background border">
                  <span className="text-muted-foreground block text-[11px]">Peserta</span>
                  <span className="font-semibold text-xs">{candidateCount} Orang</span>
                </div>
                <div className="p-2 rounded bg-background border">
                  <span className="text-muted-foreground block text-[11px]">Kursi Terisi</span>
                  <span className="font-semibold text-xs">{seatedCount} Meja</span>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-1">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Tutup
              </Button>
              <Button
                onClick={() => {
                  onExportExcel();
                  onOpenChange(false);
                }}
                disabled={!isShuffled || seatedCount === 0}
                className="gap-1.5"
              >
                <Download className="h-4 w-4" />
                Export Excel (.xlsx)
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
