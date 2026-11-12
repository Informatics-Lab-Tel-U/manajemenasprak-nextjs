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
import { Button } from '@/components/ui/button';
import { Download, Upload, FileSpreadsheet, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { parseSpreadsheet, exportSpreadsheet } from '@/lib/spreadsheet';
import { processCaslabCandidates } from '@/utils/caslabShuffle';
import type { CaslabCandidate } from '@/types/caslab';

interface CaslabImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (candidates: CaslabCandidate[]) => void;
}

export function CaslabImportModal({
  open,
  onOpenChange,
  onImportComplete,
}: CaslabImportModalProps) {
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
        'Kode Aslab': '', // Auto-generated
      },
      {
        'NIM': '1301220455',
        'Nama Lengkap': 'Febry Triantoro',
        'Kode Aslab': '', // Auto-generated
      },
      {
        'NIM': '1301221089',
        'Nama Lengkap': 'Siti Rahma Azzahra',
        'Kode Aslab': 'SRA',
      },
    ];

    try {
      await exportSpreadsheet(
        templateData,
        `Template_Caslab_IFLab.${format}`,
        'Caslab',
        format
      );
      toast.success(`Template ${format.toUpperCase()} berhasil diunduh!`);
    } catch {
      toast.error('Gagal mengunduh template spreadsheet');
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
        throw new Error('File tidak memiliki data atau kosong.');
      }

      const parsedList: Array<{ nim: string; nama_lengkap: string; kode?: string }> = [];

      rawRows.forEach((row: any) => {
        let nim = '';
        let nama = '';
        let kode = '';

        Object.entries(row).forEach(([key, val]) => {
          const cleanKey = key.trim().toLowerCase();
          const strVal = String(val ?? '').trim();

          if (cleanKey === 'nim' || cleanKey.includes('induk') || cleanKey === 'student_id') {
            nim = strVal;
          } else if (cleanKey.includes('nama') || cleanKey === 'name') {
            nama = strVal;
          } else if (cleanKey.includes('kode') || cleanKey === 'code') {
            kode = strVal;
          }
        });

        if (nim || nama) {
          parsedList.push({ nim, nama_lengkap: nama, kode });
        }
      });

      if (parsedList.length === 0) {
        throw new Error('Tidak ditemukan kolom NIM atau Nama pada file.');
      }

      const processed = processCaslabCandidates(parsedList);
      setParsedPreview(processed);
      toast.success(`Berhasil membaca ${processed.length} calon aslab.`);
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

  const handleConfirm = () => {
    if (parsedPreview.length === 0) {
      toast.error('Silakan upload file peserta terlebih dahulu.');
      return;
    }
    onImportComplete(parsedPreview);
    onOpenChange(false);
    setParsedPreview([]);
    setFileName(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Data Calon Aslab
          </DialogTitle>
          <DialogDescription>
            Unggah berkas Excel (.xlsx) atau CSV yang berisi data calon aslab.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Download Template Buttons */}
          <div className="flex items-center justify-between text-xs p-2.5 rounded-md border bg-muted/30">
            <span className="text-muted-foreground">Belum memiliki format?</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadTemplate('xlsx')}
                className="h-7 text-xs gap-1"
              >
                <Download className="h-3 w-3" />
                Template Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadTemplate('csv')}
                className="h-7 text-xs gap-1"
              >
                <Download className="h-3 w-3" />
                Template CSV
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
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              {isProcessing ? (
                <p className="text-sm font-medium">Memproses file...</p>
              ) : fileName ? (
                <div>
                  <p className="text-sm font-medium text-foreground">{fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {parsedPreview.length} peserta terdeteksi. Klik atau tarik file lain untuk mengganti.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium">
                    {isDragActive ? 'Lepaskan file di sini' : 'Tarik file ke sini, atau klik untuk memilih'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Kolom: NIM, Nama Lengkap, Kode Aslab (Opsional)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Auto-generate code notice */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>Kode aslab 3-huruf otomatis dibuat dari inisial jika kolom kode kosong.</span>
          </div>

          {/* Preview snippet if parsed */}
          {parsedPreview.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold">
                Preview Data ({parsedPreview.length} Peserta)
              </span>
              <div className="max-h-40 overflow-y-auto rounded-md border text-xs">
                <table className="w-full text-left">
                  <thead className="bg-muted text-muted-foreground sticky top-0">
                    <tr>
                      <th className="py-1.5 px-3 w-10 text-center">No</th>
                      <th className="py-1.5 px-3 w-20">Kode</th>
                      <th className="py-1.5 px-3 w-28">NIM</th>
                      <th className="py-1.5 px-3">Nama</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsedPreview.slice(0, 10).map((c, i) => (
                      <tr key={c.id}>
                        <td className="py-1.5 px-3 text-center text-muted-foreground">{i + 1}</td>
                        <td className="py-1.5 px-3 font-mono font-semibold">{c.kode}</td>
                        <td className="py-1.5 px-3 font-mono">{c.nim}</td>
                        <td className="py-1.5 px-3 truncate max-w-[200px]">{c.nama_lengkap}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedPreview.length > 10 && (
                <p className="text-[11px] text-muted-foreground italic">
                  Menampilkan 10 dari {parsedPreview.length} peserta.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleConfirm} disabled={parsedPreview.length === 0}>
            Import {parsedPreview.length > 0 ? `(${parsedPreview.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

