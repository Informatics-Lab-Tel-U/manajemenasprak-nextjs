'use client';

import React, { useState } from 'react';


import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle2, Save, Loader2, Calendar } from 'lucide-react';

import { 
  useOnboardingStore
} from '@/store/useOnboardingStore';







const steps = [
  { id: 'praktikum', title: 'Data Praktikum', description: 'Buat tahun ajaran', icon: <BookOpen /> },
  { id: 'matkul', title: 'Mata Kuliah', description: 'Tambahkan MK', icon: <BookOpen /> },
  { id: 'jadwal', title: 'Preview & Simpan', description: 'Konfirmasi Data', icon: <Save /> },
  { id: 'selesai', title: 'Selesai', description: 'Setup berhasil', icon: <CheckCircle2 /> },
];


export default function SelesaiStep() {
  const { resetProgress } = useOnboardingStore();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleFinish = () => {
    setIsNavigating(true);
    window.location.href = '/onboard';
    
    setTimeout(() => {
      resetProgress();
    }, 1000);
  };

  return (
    <Card className="border border-border shadow-none bg-transparent">
      <CardContent className="flex flex-col items-center text-center pt-8 pb-8 px-6 space-y-6">
        <div className="flex justify-center">
          <CheckCircle2 className="w-16 h-16 text-primary" strokeWidth={1.5} />
        </div>
        
        <div className="space-y-3 max-w-xl">
          <h2 className="text-3xl font-semibold tracking-tight">Tahun Ajaran Berhasil Dibuat</h2>
          <p className="text-muted-foreground text-[15px] leading-relaxed">
            Pondasi data untuk tahun ajaran baru sudah berhasil disiapkan. Anda sudah bisa mulai mengelola praktikum dan mata kuliah melalui <strong className="text-foreground font-medium">Global Term Selector</strong> di pojok kanan atas.
          </p>
        </div>

        <div className="w-full max-w-lg rounded-xl border bg-muted/30 p-4 mt-2 text-left transition-colors hover:bg-muted/50">
          <div className="flex gap-4">
            <div className="bg-background shadow-none border p-2.5 rounded-lg h-fit">
              <Calendar className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">Langkah Selanjutnya</h4>
              <p className="text-sm text-muted-foreground leading-snug">
                Konfigurasi jadwal per modul di menu <span className="font-medium text-foreground">Jadwal Praktikum &gt; Tanggal Mulai Modul</span> agar asisten dapat mulai melakukan pengaturan jadwal.
              </p>
            </div>
          </div>
        </div>

        <div>
          <Button size="lg" onClick={handleFinish} disabled={isNavigating}>
            {isNavigating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Membawa Anda ke Dashboard...
              </span>
            ) : (
              'Selesai & Kembali ke Dashboard'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

