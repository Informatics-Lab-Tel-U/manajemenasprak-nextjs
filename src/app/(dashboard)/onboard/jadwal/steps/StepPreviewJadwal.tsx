'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import JadwalCSVPreview from '@/components/jadwal/JadwalCSVPreview';
import { useJadwalOnboardStore } from '@/store/useJadwalOnboardStore';
import { bulkImportJadwal } from '@/lib/fetchers/jadwalFetcher';

interface StepPreviewJadwalProps {
  term: string;
}

export default function StepPreviewJadwal({ term }: StepPreviewJadwalProps) {
  const { jadwalRows, setJadwalRows, setCurrentStep } = useJadwalOnboardStore();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleSelect = (index: number) => {
    const next = [...jadwalRows];
    if (next[index].status !== 'error') {
      next[index].selected = !next[index].selected;
    }
    setJadwalRows(next);
  };

  const handleToggleAll = (checked: boolean) => {
    const next = jadwalRows.map((r) =>
      r.status !== 'error' ? { ...r, selected: checked } : r
    );
    setJadwalRows(next);
  };

  const handleBack = () => {
    setCurrentStep('upload');
  };

  const handleConfirm = async () => {
    const selected = jadwalRows.filter((r) => r.selected && r.status !== 'error');
    if (selected.length === 0) return;

    setIsSaving(true);
    setError(null);

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

      const result = await bulkImportJadwal(payload);
      if (!result.ok) {
        throw new Error(result.error || 'Terjadi kesalahan saat menyimpan data.');
      }

      setCurrentStep('selesai');
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data jadwal.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-transparent border-border shadow-none w-full">
      <CardHeader>
        <CardTitle className="text-xl">Langkah 2: Preview & Validasi Data</CardTitle>
        <CardDescription>
          Periksa kembali data jadwal praktikum angkatan {term} sebelum menyimpannya ke database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert className="border-destructive/50 text-destructive bg-destructive/10">
            <AlertDescription className="flex items-start gap-2">
              <X size={16} className="mt-0.5 flex-shrink-0" />
              <span className="text-sm whitespace-pre-wrap">{error}</span>
            </AlertDescription>
          </Alert>
        )}

        <JadwalCSVPreview
          rows={jadwalRows}
          onConfirm={handleConfirm}
          onBack={handleBack}
          onToggleSelect={handleToggleSelect}
          onToggleAll={handleToggleAll}
          loading={isSaving}
        />
      </CardContent>
    </Card>
  );
}
