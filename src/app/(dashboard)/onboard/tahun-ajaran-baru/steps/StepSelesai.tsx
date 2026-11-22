'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { OnboardStepCompleteCard } from '@/components/onboard/OnboardStepCompleteCard';
import { useOnboardingStore } from '@/store/useOnboardingStore';

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
    <OnboardStepCompleteCard
      title="Tahun Ajaran Berhasil Dibuat"
      description={
        <>
          Pondasi data untuk tahun ajaran baru sudah berhasil disiapkan. Anda sudah bisa mulai
          mengelola praktikum dan mata kuliah melalui{' '}
          <strong className="text-foreground font-medium">Global Term Selector</strong> di pojok kanan
          atas.
        </>
      }
      nextStep={{
        icon: <Calendar className="w-4 h-4" />,
        description: (
          <>
            Konfigurasi jadwal per modul di menu{' '}
            <span className="font-medium text-foreground">
              Jadwal Praktikum &gt; Tanggal Mulai Modul
            </span>{' '}
            agar asisten dapat mulai melakukan pengaturan jadwal.
          </>
        ),
      }}
      buttonLabel="Selesai & Kembali ke Hub Setup"
      loadingLabel="Mengalihkan ke Hub Setup..."
      isNavigating={isNavigating}
      onFinish={handleFinish}
    />
  );
}
