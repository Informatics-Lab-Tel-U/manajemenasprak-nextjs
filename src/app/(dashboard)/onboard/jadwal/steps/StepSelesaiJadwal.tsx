'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardStepCompleteCard } from '@/components/onboard/OnboardStepCompleteCard';
import { useJadwalOnboardStore } from '@/store/useJadwalOnboardStore';

interface StepSelesaiJadwalProps {
  term: string;
}

export default function StepSelesaiJadwal({ term }: StepSelesaiJadwalProps) {
  const router = useRouter();
  const { markStepCompleted, resetProgress } = useJadwalOnboardStore();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    markStepCompleted('selesai');
  }, [markStepCompleted]);

  const handleFinish = () => {
    setIsNavigating(true);
    router.push('/onboard');

    setTimeout(() => {
      resetProgress();
      router.refresh();
    }, 1000);
  };

  return (
    <OnboardStepCompleteCard
      title="Setup Jadwal Selesai"
      description={
        <>
          Data jadwal praktikum untuk angkatan{' '}
          <strong className="text-foreground font-medium">{term}</strong> berhasil diimpor dan
          disimpan ke dalam database.
        </>
      }
      buttonLabel="Selesai & Kembali ke Hub Setup"
      isNavigating={isNavigating}
      onFinish={handleFinish}
    />
  );
}
