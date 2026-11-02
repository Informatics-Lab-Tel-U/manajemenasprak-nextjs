'use client';

import React, { useState, useTransition } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { updateActiveScheduleTerm } from '@/services/webConfigService';
import { Save, TriangleAlert, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface WebConfigClientPageProps {
  initialTerms: string[];
  initialActiveTerm: string | null;
}

export default function WebConfigClientPage({
  initialTerms,
  initialActiveTerm
}: WebConfigClientPageProps) {
  const [activeTerm, setActiveTerm] = useState<string>(initialActiveTerm || (initialTerms[0] ?? ''));
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (!activeTerm) {
      toast.error('Pilih Tahun Ajaran terlebih dahulu');
      return;
    }

    startTransition(async () => {
      const result = await updateActiveScheduleTerm(activeTerm);
      if (result.success) {
        toast.success(`Berhasil mengatur Tahun Ajaran aktif menjadi ${activeTerm}`);
      } else {
        toast.error(`Gagal menyimpan: ${result.error}`);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">
            Konfigurasi Web
          </h1>
          <p className="text-sm 2xl:text-base text-muted-foreground mt-1">
            Atur konten dan data yang akan diekspos ke website publik (Informatics Blog).
          </p>
        </div>
      </div>

      <Alert className="border-yellow-500/50 bg-yellow-500/5 text-yellow-700 dark:text-yellow-400 [&>svg]:text-yellow-500">
        <TriangleAlert className="h-4 w-4" />
        <AlertTitle className="font-semibold">Perhatian</AlertTitle>
        <AlertDescription className="text-yellow-700/80 dark:text-yellow-400/80">
          Perubahan pada halaman ini akan langsung berdampak pada website publik. Pastikan jadwal untuk Tahun Ajaran yang dipilih sudah final.
        </AlertDescription>
      </Alert>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/20">
          <h2 className="text-lg font-semibold">Tahun Ajaran Aktif (Jadwal Praktikum)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pilih Tahun Ajaran yang datanya akan ditampilkan publik.
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium">Tahun Ajaran</label>
            <Select
              value={activeTerm}
              onValueChange={setActiveTerm}
              disabled={isPending || initialTerms.length === 0}
            >
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Pilih Tahun Ajaran" />
              </SelectTrigger>
              <SelectContent>
                {initialTerms.length > 0 ? (
                  initialTerms.map((term) => (
                    <SelectItem key={term} value={term}>
                      {term}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    Tidak ada data Tahun Ajaran
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isPending || !activeTerm || activeTerm === initialActiveTerm}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
