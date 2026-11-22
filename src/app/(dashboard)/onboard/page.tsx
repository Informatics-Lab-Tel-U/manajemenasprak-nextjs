'use client';

/* eslint-disable react-doctor/no-fetch-in-effect, react-doctor/nextjs-no-client-fetch-for-server-data */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Lock, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import TermInput from '@/components/asprak/TermInput';
import { useTermStore } from '@/store/useTermStore';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useJadwalOnboardStore } from '@/store/useJadwalOnboardStore';
import { useAsprakOnboardStore } from '@/store/useAsprakOnboardStore';

export default function OnboardHubPage() {
  const { activeTerm } = useTermStore();
  const { syncWithTerm: syncOnboardTerm, completedSteps: onboardCompleted } = useOnboardingStore();
  const { syncWithTerm: syncJadwalTerm, completedSteps: jadwalCompleted } = useJadwalOnboardStore();
  const { syncWithTerm: syncAsprakTerm, completedSteps: asprakCompleted } = useAsprakOnboardStore();

  const [termYear, setTermYear] = useState(activeTerm ? activeTerm.substring(0, 2) : '24');
  const [termSem, setTermSem] = useState<'1' | '2'>(activeTerm ? (activeTerm.slice(-1) as '1'|'2') : '2');
  
  const currentTerm = `${termYear}${parseInt(termYear) + 1}-${termSem}`;

  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const availableTerms = useRef<string[]>([]);

  // Sync with activeTerm once it hydrates from localStorage
  useEffect(() => {
    if (activeTerm && activeTerm.length >= 6) {
      setTermYear(activeTerm.substring(0, 2));
      setTermSem(activeTerm.slice(-1) as '1' | '2');
    }
  }, [activeTerm]);

  // Fetch available terms for smart switching
  useEffect(() => {
    fetch('/api/tahun-ajaran')
      .then((res) => res.json())
      .then((res) => {
        if (res.ok) {
          availableTerms.current = res.data;
        }
      })
      .catch(console.error);
  }, []);

  const handleYearChange = (newYear: string) => {
    setTermYear(newYear);
    
    if (newYear.length === 2 && !isNaN(parseInt(newYear))) {
      const newTermPrefix = `${newYear}${parseInt(newYear) + 1}`;
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

  const fetchStatus = useCallback((term: string) => {
    if (!term) return;
    setIsLoading(true);
    fetch(`/api/onboard/status?term=${term}&_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
      },
    })
      .then(res => res.json())
      .then(data => {
        const resData = data?.data || null;
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
  }, [syncJadwalTerm, syncAsprakTerm]);

  useEffect(() => {
    if (!currentTerm) return;
    
    // Nativasi perpindahan term di semua store agar bersih dari sisa localStorage term lama
    syncOnboardTerm(currentTerm);
    syncJadwalTerm(currentTerm, false);
    syncAsprakTerm(currentTerm, false);

    fetchStatus(currentTerm);

    // Otomatis re-fetch status tatkala pengelola kembali ke halaman hub dari tab lain
    const handleFocus = () => fetchStatus(currentTerm);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentTerm, syncOnboardTerm, syncJadwalTerm, syncAsprakTerm, fetchStatus]);

  // Kombinasi ground-truth server yang aktual dan instant response dari state store
  const isStep1Done = Boolean(status?.step1_done || onboardCompleted.includes('selesai'));
  const isStep2Done = Boolean(status?.step2_done || (isStep1Done && jadwalCompleted.includes('selesai')));
  const isStep3Done = Boolean(status?.step3_done || (isStep2Done && asprakCompleted.includes('selesai')));

  return (
    <div className="container mx-auto max-w-[2000px] space-y-6 2xl:px-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Setup Tahun Ajaran</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Pilih modul onboarding yang ingin Anda konfigurasi.
        </p>
      </div>

      <div className="relative mt-12 space-y-8 max-w-6xl mx-auto">
        {isLoading ? (
          <div className="space-y-8">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="relative flex flex-col md:flex-row gap-6 items-stretch md:items-start">
                {i < 3 && <div className="absolute top-10 bottom-[-32px] left-[19px] w-0.5 hidden md:block bg-border"></div>}
                <div className="hidden md:flex relative z-10 items-center justify-center size-10 rounded-md border-[3px] border-background bg-muted shrink-0 shadow-none">
                   <Skeleton className="w-5 h-5 rounded-md" />
                </div>
                <Card className="flex-1 flex flex-col shadow-none min-h-[200px] border-border bg-transparent">
                  <CardHeader className="flex-grow">
                    <Skeleton className="h-7 w-2/3 sm:w-1/3" />
                    <Skeleton className="h-5 w-full sm:w-1/2" />
                  </CardHeader>
                  {i === 0 ? (
                    <CardContent>
                      <div className="flex gap-4 max-w-[280px]">
                        <Skeleton className="h-10 w-20 rounded-md shrink-0" />
                        <Skeleton className="h-10 flex-1 rounded-md" />
                      </div>
                    </CardContent>
                  ) : (
                    <CardFooter>
                      <Skeleton className="h-10 w-full sm:w-32 rounded-md" />
                    </CardFooter>
                  )}
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Card 0: Tahun Ajaran Target */}
            <div className="relative flex flex-col md:flex-row gap-6 items-stretch md:items-start group">
              <div className="absolute top-10 bottom-[-32px] left-[19px] w-0.5 hidden md:block bg-primary"></div>
              <div className="hidden md:flex relative z-10 size-10 shrink-0 items-center justify-center overflow-hidden rounded-md text-sm font-medium border-[3px] border-background bg-primary text-primary-foreground shadow-none">
                <Target className="w-5 h-5" />
              </div>
              <Card className="flex-1 flex flex-col shadow-none border-border bg-transparent min-h-[200px]">
                <CardHeader className="flex-grow">
                  <CardTitle className="text-xl">Target Setup</CardTitle>
                  <CardDescription className="text-base">
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

            {/* Card 1: Tahun Ajaran & Praktikum */}
            <div className="relative flex flex-col md:flex-row gap-6 items-stretch md:items-start group">
              <div className={`absolute top-10 bottom-[-32px] left-[19px] w-0.5 hidden md:block transition-colors ${isStep1Done ? 'bg-primary' : 'bg-border'}`}></div>
              <div className={`hidden md:flex relative z-10 size-10 shrink-0 items-center justify-center overflow-hidden rounded-md text-base font-medium border-[3px] border-background shadow-none bg-primary text-primary-foreground ${!isStep1Done ? 'ring-primary/30 ring-2 ring-offset-2 ring-offset-background' : ''}`}>
                {isStep1Done ? <Check className="w-5 h-5" strokeWidth={3} /> : '1'}
              </div>
              <Card className={`flex-1 flex flex-col shadow-none min-h-[200px] ${isStep1Done ? 'border-border bg-transparent' : 'border-primary ring-1 ring-primary bg-transparent'}`}>
                <CardHeader className="flex-grow">
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-xl">Langkah 1: Tahun Ajaran & Praktikum</CardTitle>
                    {isStep1Done && <Check className="w-5 h-5 text-primary md:hidden shrink-0 mt-0.5" strokeWidth={3} />}
                  </div>
                  <CardDescription className="text-base">
                    Inisialisasi tahun ajaran baru, daftar praktikum, dan referensi mata kuliah.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button asChild className="w-full sm:w-auto" variant={isStep1Done ? "outline" : "default"}>
                    <Link prefetch={false} href={`/onboard/tahun-ajaran-baru?term=${currentTerm}`}>
                      {isStep1Done ? 'Edit Data' : 'Mulai Setup'}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Card 2: Jadwal Praktikum */}
            <div className="relative flex flex-col md:flex-row gap-6 items-stretch md:items-start group">
              <div className={`absolute top-10 bottom-[-32px] left-[19px] w-0.5 hidden md:block transition-colors ${isStep2Done ? 'bg-primary' : 'bg-border'}`}></div>
              <div className={`hidden md:flex relative z-10 size-10 shrink-0 items-center justify-center overflow-hidden rounded-md text-base font-medium border-[3px] border-background shadow-none ${isStep2Done || isStep1Done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'} ${!isStep2Done && isStep1Done ? 'ring-primary/30 ring-2 ring-offset-2 ring-offset-background' : ''}`}>
                {isStep2Done ? <Check className="w-5 h-5" strokeWidth={3} /> : !isStep1Done ? <Lock className="w-4 h-4" /> : '2'}
              </div>
              <Card className={`flex-1 flex flex-col shadow-none min-h-[200px] ${isStep2Done ? 'border-border bg-transparent' : isStep1Done ? 'border-primary ring-1 ring-primary bg-transparent' : 'opacity-70 bg-muted/30 border-border'}`}>
                <CardHeader className="flex-grow">
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-xl">Langkah 2: Jadwal Praktikum</CardTitle>
                    <div className="md:hidden shrink-0 mt-0.5">
                      {isStep2Done ? <Check className="w-5 h-5 text-primary" strokeWidth={3} /> : (!isStep1Done && !isLoading && <Lock className="w-4 h-4 text-muted-foreground" />)}
                    </div>
                  </div>
                  <CardDescription className="text-base">
                    Konfigurasi shift, tanggal modul, dan plotting jadwal asisten.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button 
                    asChild 
                    variant={isStep2Done ? "outline" : "default"} 
                    className="w-full sm:w-auto"
                    disabled={!isStep1Done}
                  >
                    <Link prefetch={false} href={isStep1Done ? `/onboard/jadwal?term=${currentTerm}` : '#'}>
                      {isStep2Done ? 'Edit Data' : isStep1Done ? 'Mulai Setup' : 'Terkunci'}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Card 3: Data Asprak */}
            <div className="relative flex flex-col md:flex-row gap-6 items-stretch md:items-start group">
              <div className={`hidden md:flex relative z-10 size-10 shrink-0 items-center justify-center overflow-hidden rounded-md text-base font-medium border-[3px] border-background shadow-none ${isStep3Done || isStep2Done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'} ${!isStep3Done && isStep2Done ? 'ring-primary/30 ring-2 ring-offset-2 ring-offset-background' : ''}`}>
                {isStep3Done ? <Check className="w-5 h-5" strokeWidth={3} /> : !isStep2Done ? <Lock className="w-4 h-4" /> : '3'}
              </div>
              <Card className={`flex-1 flex flex-col shadow-none min-h-[200px] ${isStep3Done ? 'border-border bg-transparent' : isStep2Done ? 'border-primary ring-1 ring-primary bg-transparent' : 'opacity-70 bg-muted/30 border-border'}`}>
                <CardHeader className="flex-grow">
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-xl">Langkah 3: Data Asprak</CardTitle>
                    <div className="md:hidden shrink-0 mt-0.5">
                      {isStep3Done ? <Check className="w-5 h-5 text-primary" strokeWidth={3} /> : (!isStep2Done && !isLoading && <Lock className="w-4 h-4 text-muted-foreground" />)}
                    </div>
                  </div>
                  <CardDescription className="text-base">
                    Input data asisten praktikum (NIM, Nama, Email, Akun).
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button 
                    asChild 
                    variant={isStep3Done ? "outline" : "default"} 
                    className="w-full sm:w-auto"
                    disabled={!isStep2Done}
                  >
                    <Link prefetch={false} href={isStep2Done ? `/onboard/asprak?term=${currentTerm}` : '#'}>
                      {isStep3Done ? 'Edit Data' : isStep2Done ? 'Mulai Setup' : 'Terkunci'}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
