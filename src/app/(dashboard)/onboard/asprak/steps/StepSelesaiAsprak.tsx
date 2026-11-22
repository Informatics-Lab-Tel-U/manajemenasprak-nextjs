'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { OnboardStepCompleteCard } from '@/components/onboard/OnboardStepCompleteCard';
import { useAsprakOnboardStore } from '@/store/useAsprakOnboardStore';

interface StepSelesaiAsprakProps {
  term: string;
}

export default function StepSelesaiAsprak({ term }: StepSelesaiAsprakProps) {
  const router = useRouter();
  const { markStepCompleted, resetProgress } = useAsprakOnboardStore();
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
      title="Setup Data Asprak Selesai"
      description={
        <>
          Data asisten praktikum untuk angkatan{' '}
          <strong className="text-foreground font-medium">{term}</strong> berhasil diimpor dan kode
          asprak berhasil dibuat.
        </>
      }
      nextStep={{
        icon: <Users className="w-4 h-4" />,
        description: (
          <>
            Data asisten sudah siap. Anda dapat mengatur penugasan asisten ke modul praktikum
            melalui menu{' '}
            <span className="font-medium text-foreground">Data Asprak &gt; Plotting Penugasan</span>.
          </>
        ),
      }}
      buttonLabel="Selesai & Kembali ke Hub Setup"
      isNavigating={isNavigating}
      onFinish={handleFinish}
    />
  );
}
