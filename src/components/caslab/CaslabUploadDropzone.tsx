'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileSpreadsheet, Download, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { parseSpreadsheet, exportSpreadsheet } from '@/lib/spreadsheet';
import { processCaslabCandidates } from '@/utils/caslabShuffle';
import type { CaslabCandidate } from '@/types/caslab';

interface CaslabUploadDropzoneProps {
  onCandidatesLoaded: (candidates: CaslabCandidate[]) => void;
  candidateCount: number;
}

export function CaslabUploadDropzone({
  onCandidatesLoaded,
  candidateCount,
}: CaslabUploadDropzoneProps) {
  const [isProcessing, setIsProcessing] = useState(false);
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

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      setFileName(file.name);
      setIsProcessing(true);

      try {
        const rawRows = await parseSpreadsheet(file);
        if (!Array.isArray(rawRows) || rawRows.length === 0) {
          throw new Error('File tidak memiliki baris data atau kosong.');
        }

        // Normalize keys (handle case-insensitive and common column headers)
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
          throw new Error('Tidak ditemukan kolom NIM atau Nama pada file yang diunggah.');
        }

        const processed = processCaslabCandidates(parsedList);
        onCandidatesLoaded(processed);
        toast.success(`Berhasil memuat ${processed.length} calon aslab!`);
      } catch (err: any) {
        console.error('Error parsing Caslab file:', err);
        toast.error(err.message || 'Gagal memproses file spreadsheet.');
      } finally {
        setIsProcessing(false);
      }
    },
    [onCandidatesLoaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  return (
    <Card className="border border-border/80 shadow-sm overflow-hidden bg-card/60 backdrop-blur-xs">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-border/50">
          <div>
            <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              1. Upload Data Calon Aslab (Caslab)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Format kolom: <strong>NIM</strong>, <strong>Nama Lengkap</strong>, dan opsional <strong>Kode Aslab</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadTemplate('xlsx')}
              className="text-xs h-8 gap-1.5 flex-1 sm:flex-initial"
            >
              <Download className="w-3.5 h-3.5" />
              Template Excel (.xlsx)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadTemplate('csv')}
              className="text-xs h-8 gap-1.5 flex-1 sm:flex-initial"
            >
              <Download className="w-3.5 h-3.5" />
              Template CSV
            </Button>
          </div>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragActive
              ? 'border-primary bg-primary/10 scale-[0.99]'
              : 'border-border/80 hover:border-primary/60 hover:bg-muted/40'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <UploadCloud className="w-6 h-6 animate-pulse" />
            </div>

            {isProcessing ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">Memproses data & generate kode aslab unik...</p>
                <p className="text-xs text-muted-foreground">Mohon tunggu sebentar</p>
              </div>
            ) : fileName && candidateCount > 0 ? (
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{fileName} ({candidateCount} Peserta)</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tarik atau klik di sini untuk mengganti berkas data Caslab
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {isDragActive ? 'Lepaskan berkas di sini...' : 'Tarik & letakkan berkas Excel/CSV di sini, atau klik untuk memilih'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Mendukung .xlsx, .xls, dan .csv • Kode Aslab otomatis dibuat jika kolom kosong
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Kode Aslab 3-huruf unik otomatis di-generate berdasarkan inisial nama.</span>
          </div>
          {candidateCount > 0 && (
            <span className="font-semibold text-foreground">
              Total Dimuat: {candidateCount} Calon Aslab
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
