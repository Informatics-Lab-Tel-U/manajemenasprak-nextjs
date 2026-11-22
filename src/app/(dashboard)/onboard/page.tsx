'use client';

/* eslint-disable react-doctor/no-fetch-in-effect, react-doctor/nextjs-no-client-fetch-for-server-data */

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Check, Lock, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import TermInput from '@/components/asprak/TermInput';
import { cn } from '@/lib/utils';
import { useTermStore } from '@/store/useTermStore';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useJadwalOnboardStore } from '@/store/useJadwalOnboardStore';
import { useAsprakOnboardStore } from '@/store/useAsprakOnboardStore';

interface OnboardStatusData {
  step1_done?: boolean;
  step2_done?: boolean;
  step3_done?: boolean;
}

export default function OnboardHubPage() {
  const { activeTerm } = useTermStore();
  const { syncWithTerm: syncOnboardTerm, completedSteps: onboardCompleted } = useOnboardingStore();
  const { syncWithTerm: syncJadwalTerm, completedSteps: jadwalCompleted } = useJadwalOnboardStore();
  const { syncWithTerm: syncAsprakTerm, completedSteps: asprakCompleted } = useAsprakOnboardStore();

  const [termYear, setTermYear] = useState(activeTerm ? activeTerm.substring(0, 2) : '24');
  const [termSem, setTermSem] = useState<'1' | '2'>(
    activeTerm ? (activeTerm.slice(-1) as '1' | '2') : '2'
  );

  const currentTerm = `${termYear}${parseInt(termYear, 10) + 1}-${termSem}`;

  const [status, setStatus] = useState<OnboardStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const availableTerms = useRef<string[]>([]);

  useEffect(() => {
    if (activeTerm && activeTerm.length >= 6) {
      setTermYear(activeTerm.substring(0, 2));
      setTermSem(activeTerm.slice(-1) as '1' | '2');
    }
  }, [activeTerm]);

  useEffect(() => {
    fetch('/api/tahun-ajaran')
      .then((res) => res.json())
      .then((res) => {
        if (res.ok && Array.isArray(res.data)) {
          availableTerms.current = res.data;
        }
      })
      .catch(console.error);
  }, []);

  const handleYearChange = (newYear: string) => {
    setTermYear(newYear);

    if (newYear.length === 2 && !Number.isNaN(parseInt(newYear, 10))) {
      const newTermPrefix = `${newYear}${parseInt(newYear, 10) + 1}`;
      const targetTerm = `${newTermPrefix}-${termSem}`;

      if (!availableTerms.current.includes(targetTerm)) {
        const otherSem = termSem === '1' ? '2' : '1';
        const otherTerm = `${newTermPrefix}-${otherSem}`;

        if (availableTerms.current.includes(otherTerm)) {
          setTermSem(otherSem);
        } else {
          setTermSem('1');
        }
      }
    }
  };

  const fetchStatus = useCallback(
    (term: string) => {
      if (!term) return;
      setIsLoading(true);
      fetch(`/api/onboard/status?term=${term}&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          Pragma: 'no-cache',
          'Cache-Control': 'no-cache',
        },
      })
        .then((res) => res.json())
        .then((data) => {
          const resData = (data?.data as OnboardStatusData | null) ?? null;
          setStatus(resData);
          setIsLoading(false);

          if (resData) {
            syncJadwalTerm(term, Boolean(resData.step2_done));
            syncAsprakTerm(term, Boolean(resData.step3_done));
          }
        })
        .catch((err) => {
          console.error('[OnboardHub] Gagal memuat status DB:', err);
          setIsLoading(false);
        });
    },
    [syncJadwalTerm, syncAsprakTerm]
  );

  useEffect(() => {
    if (!currentTerm) return;

    syncOnboardTerm(currentTerm);
    syncJadwalTerm(currentTerm, false);
    syncAsprakTerm(currentTerm, false);

    fetchStatus(currentTerm);

    const handleFocus = () => fetchStatus(currentTerm);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentTerm, syncOnboardTerm, syncJadwalTerm, syncAsprakTerm, fetchStatus]);

  const isStep1Done = Boolean(status?.step1_done || onboardCompleted.includes('selesai'));
  const isStep2Done = Boolean(
    status?.step2_done || (isStep1Done && jadwalCompleted.includes('selesai'))
  );
  const isStep3Done = Boolean(
    status?.step3_done || (isStep2Done && asprakCompleted.includes('selesai'))
  );

  const wizardSteps = [
    {
      stepNumber: 1,
      title: 'Langkah 1: Tahun Ajaran & Praktikum',
      description: 'Inisialisasi tahun ajaran baru, daftar praktikum, dan referensi mata kuliah.',
      href: `/onboard/tahun-ajaran-baru?term=${currentTerm}`,
      isDone: isStep1Done,
      isUnlocked: true,
    },
    {
      stepNumber: 2,
      title: 'Langkah 2: Jadwal Praktikum',
      description: 'Konfigurasi shift, tanggal modul, dan plotting jadwal asisten.',
      href: `/onboard/jadwal?term=${currentTerm}`,
      isDone: isStep2Done,
      isUnlocked: isStep1Done,
    },
    {
      stepNumber: 3,
      title: 'Langkah 3: Data Asprak',
      description: 'Input data asisten praktikum (NIM, Nama, Email, Akun).',
      href: `/onboard/asprak?term=${currentTerm}`,
      isDone: isStep3Done,
      isUnlocked: isStep2Done,
    },
  ];

  return (
    <div className="container mx-auto max-w-[2000px] space-y-6 2xl:px-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Setup Tahun Ajaran
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pilih modul onboarding yang ingin Anda konfigurasi secara berurutan.
        </p>
      </div>

      <div className="relative space-y-8 max-w-6xl mx-auto">
        {isLoading ? (
          <div className="space-y-8">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="relative flex flex-col md:flex-row gap-6 items-stretch md:items-start"
              >
                {i < 3 && (
                  <div className="absolute top-10 bottom-[-32px] left-[19px] w-0.5 hidden md:block bg-border" />
                )}
                <div className="hidden md:flex relative z-10 items-center justify-center size-10 rounded-md border-[3px] border-background bg-muted shrink-0">
                  <Skeleton className="w-5 h-5 rounded-md" />
                </div>
                <Card className="flex-1 flex flex-col shadow-none border-border bg-transparent">
                  <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-56" />
                    <Skeleton className="h-4 w-full max-w-md" />
                  </CardHeader>
                  <CardFooter>
                    <Skeleton className="h-9 w-32 rounded-md" />
                  </CardFooter>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Target Setup Card */}
            <div className="relative flex flex-col md:flex-row gap-6 items-stretch md:items-start">
              <div className="absolute top-10 bottom-[-32px] left-[19px] w-0.5 hidden md:block bg-primary" />
              <div className="hidden md:flex relative z-10 size-10 shrink-0 items-center justify-center overflow-hidden rounded-md text-sm font-medium border-[3px] border-background bg-primary text-primary-foreground">
                <Target className="w-5 h-5" aria-hidden="true" />
              </div>
              <Card className="flex-1 flex flex-col shadow-none border-border bg-transparent">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base font-semibold">Target Setup</CardTitle>
                    <Badge variant="outline" className="tabular-nums">
                      {currentTerm}
                    </Badge>
                  </div>
                  <CardDescription>
                    Tentukan konteks tahun ajaran yang akan Anda setup.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-w-md">
                    <TermInput
                      termYear={termYear}
                      termSem={termSem}
                      onYearChange={handleYearChange}
                      onSemChange={setTermSem}
                      label=""
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Steps 1..3 */}
            {wizardSteps.map((step, idx) => {
              const isCurrent = step.isUnlocked && !step.isDone;
              const isLast = idx === wizardSteps.length - 1;

              return (
                <div
                  key={step.stepNumber}
                  className="relative flex flex-col md:flex-row gap-6 items-stretch md:items-start"
                >
                  {!isLast && (
                    <div
                      className={cn(
                        'absolute top-10 bottom-[-32px] left-[19px] w-0.5 hidden md:block transition-colors',
                        step.isDone ? 'bg-primary' : 'bg-border'
                      )}
                    />
                  )}
                  <div
                    className={cn(
                      'hidden md:flex relative z-10 size-10 shrink-0 items-center justify-center overflow-hidden rounded-md text-base font-medium border-[3px] border-background tabular-nums',
                      step.isDone || step.isUnlocked
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                      isCurrent && 'ring-primary/30 ring-2 ring-offset-2 ring-offset-background'
                    )}
                  >
                    {step.isDone ? (
                      <Check className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" />
                    ) : !step.isUnlocked ? (
                      <Lock className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      step.stepNumber
                    )}
                  </div>

                  <Card
                    className={cn(
                      'flex-1 flex flex-col shadow-none bg-transparent',
                      step.isDone
                        ? 'border-border'
                        : isCurrent
                          ? 'border-primary ring-1 ring-primary'
                          : 'opacity-70 bg-muted/30 border-border'
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="text-base font-semibold">{step.title}</CardTitle>
                        <Badge
                          variant={
                            step.isDone ? 'secondary' : isCurrent ? 'default' : 'outline'
                          }
                          className="shrink-0"
                        >
                          {step.isDone ? 'Selesai' : isCurrent ? 'Berikutnya' : 'Terkunci'}
                        </Badge>
                      </div>
                      <CardDescription>{step.description}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button
                        asChild={step.isUnlocked}
                        size="sm"
                        variant={step.isDone ? 'outline' : 'default'}
                        disabled={!step.isUnlocked}
                        className="w-full sm:w-auto"
                      >
                        {step.isUnlocked ? (
                          <Link prefetch={false} href={step.href}>
                            {step.isDone ? 'Edit Data' : 'Mulai Setup'}
                          </Link>
                        ) : (
                          <span>Terkunci</span>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
