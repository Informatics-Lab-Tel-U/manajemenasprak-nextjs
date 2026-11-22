'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useJadwalOnboardStore } from '@/store/useJadwalOnboardStore';

interface StepSelesaiJadwalProps {
  term: string;
}

export default function StepSelesaiJadwal({ term }: StepSelesaiJadwalProps) {
  const router = useRouter();
  const { markStepCompleted, resetProgress } = useJadwalOnboardStore();

  useEffect(() => {
    markStepCompleted('selesai');
  }, [markStepCompleted]);

  const [isNavigating, setIsNavigating] = useState(false);

  const handleFinish = () => {
    setIsNavigating(true);
    router.push('/onboard');
    
    setTimeout(() => {
      resetProgress();
      router.refresh();
    }, 1000);
  };

  return (
    <Card className="border border-border shadow-none bg-transparent">
      <CardContent className="flex flex-col items-center text-center pt-8 pb-8 px-6 space-y-6">
        <div className="flex justify-center">
          <CheckCircle2 className="w-16 h-16 text-primary" strokeWidth={1.5} />
        </div>
        
        <div className="space-y-3 max-w-xl">
          <h2 className="text-3xl font-semibold tracking-tight">Setup Jadwal Selesai</h2>
          <p className="text-muted-foreground text-[15px] leading-relaxed">
            Data jadwal praktikum untuk angkatan <strong className="text-foreground font-medium">{term}</strong> berhasil diimpor dan disimpan ke dalam database.
          </p>
        </div>

        <div>
          <Button size="lg" onClick={handleFinish} disabled={isNavigating}>
            {isNavigating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Mengalihkan...
              </span>
            ) : (
              'Selesai & Kembali ke Hub Setup'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
