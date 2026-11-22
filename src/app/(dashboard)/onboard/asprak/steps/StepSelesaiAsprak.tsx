'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Users, Loader2 } from 'lucide-react';
import { useAsprakOnboardStore } from '@/store/useAsprakOnboardStore';

interface StepSelesaiAsprakProps {
  term: string;
}

export default function StepSelesaiAsprak({ term }: StepSelesaiAsprakProps) {
  const router = useRouter();
  const { markStepCompleted, resetProgress } = useAsprakOnboardStore();

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
          <h2 className="text-3xl font-semibold tracking-tight">Setup Data Asprak Selesai</h2>
          <p className="text-muted-foreground text-[15px] leading-relaxed">
            Data asisten praktikum untuk angkatan <strong className="text-foreground font-medium">{term}</strong> berhasil diimpor dan kode asprak berhasil dibuat.
          </p>
        </div>

        <div className="w-full max-w-lg rounded-xl border bg-muted/30 p-4 mt-2 text-left transition-colors hover:bg-muted/50">
          <div className="flex gap-4">
            <div className="bg-background shadow-none border p-2.5 rounded-lg h-fit">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">Langkah Selanjutnya</h4>
              <p className="text-sm text-muted-foreground leading-snug">
                Data asisten sudah siap. Anda dapat mengatur penugasan asisten ke modul praktikum melalui menu <span className="font-medium text-foreground">Data Asprak &gt; Plotting Penugasan</span>.
              </p>
            </div>
          </div>
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
