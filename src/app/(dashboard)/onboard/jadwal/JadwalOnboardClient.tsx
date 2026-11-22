'use client';

import { useEffect, useState } from 'react';
import {
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
  StepperDescription,
  StepperNav,
  StepperContent,
} from '@/components/ui/stepper';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Upload, Eye, CheckCircle2, ArrowLeft } from 'lucide-react';
import type { MataKuliah } from '@/types/database';
import { useJadwalOnboardStore, JadwalOnboardStep } from '@/store/useJadwalOnboardStore';
import StepUploadJadwal from './steps/StepUploadJadwal';
import StepPreviewJadwal from './steps/StepPreviewJadwal';
import StepSelesaiJadwal from './steps/StepSelesaiJadwal';

const steps = [
  {
    id: 'upload',
    title: 'Upload Data',
    description: 'Upload CSV Jadwal Praktikum',
    icon: <Upload className="w-5 h-5" />,
  },
  {
    id: 'preview',
    title: 'Preview',
    description: 'Validasi jadwal dan konflik',
    icon: <Eye className="w-5 h-5" />,
  },
  {
    id: 'selesai',
    title: 'Selesai',
    description: 'Jadwal berhasil disimpan',
    icon: <CheckCircle2 className="w-5 h-5" />,
  },
];

interface JadwalOnboardClientProps {
  term: string;
  mataKuliahList: MataKuliah[];
  initialJadwalList?: any[];
  isAlreadyDone?: boolean;
}

export default function JadwalOnboardClient({
  term,
  mataKuliahList,
  initialJadwalList = [],
  isAlreadyDone = false,
}: JadwalOnboardClientProps) {
  const { currentStep, setCurrentStep, setTargetTerm, syncWithTerm, completedSteps } = useJadwalOnboardStore();
  const [mounted, setMounted] = useState(false);
  const [prevTerm, setPrevTerm] = useState(term);

  if (term !== prevTerm) {
    setPrevTerm(term);
    syncWithTerm(term, isAlreadyDone, initialJadwalList);
  }

  useEffect(() => {
    syncWithTerm(term, isAlreadyDone, initialJadwalList);
  }, [term, isAlreadyDone, initialJadwalList, syncWithTerm]);

  // eslint-disable-next-line react-doctor/rendering-hydration-no-flicker
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="container mx-auto max-w-[2000px] relative space-y-6 2xl:px-8">
      <header className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild className="shrink-0 mt-1">
            <Link prefetch={false} href="/onboard">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Setup Jadwal Praktikum</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Ikuti alur ini untuk mengunggah dan memvalidasi jadwal praktikum secara berurutan.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                Target Tahun Ajaran: <strong className="font-semibold">{term}</strong>
              </span>
              {isAlreadyDone ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Mode: Update / Edit Jadwal Tersimpan
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Mode: Setup Baru
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <Stepper
        steps={steps}
        value={currentStep}
        onValueChange={(id) => {
          const targetIndex = steps.findIndex((s) => s.id === id);
          const currentIndex = steps.findIndex((s) => s.id === currentStep);
          // Allow going back or to an already completed step
          if (targetIndex <= currentIndex || completedSteps.includes(id as any)) {
            setCurrentStep(id as JadwalOnboardStep);
          } else {
            const previousStepId = steps[targetIndex - 1]?.id;
            if (completedSteps.includes(previousStepId as any)) {
              setCurrentStep(id as JadwalOnboardStep);
            }
          }
        }}
        className="flex flex-col w-full items-start gap-8"
      >
        <StepperNav className="w-full bg-transparent p-4 rounded-xl border border-border shadow-none">
          {steps.map((step, index) => (
            <StepperItem
              key={step.id}
              stepId={step.id}
              completed={completedSteps.includes(step.id as any)}
              className="relative flex-1"
            >
              <StepperTrigger className="flex flex-col gap-2.5">
                <StepperIndicator />
                <div className="flex flex-col">
                  <StepperTitle>{step.title}</StepperTitle>
                  <StepperDescription className="text-nowrap max-md:hidden">
                    {step.description}
                  </StepperDescription>
                </div>
              </StepperTrigger>
              {steps.length > index + 1 && (
                <StepperSeparator className="absolute inset-x-0 top-2 right-[calc(-50%+18px)] left-[calc(50%+18px)]" />
              )}
            </StepperItem>
          ))}
        </StepperNav>

        <div className="w-full">
          <StepperContent value="upload">
            <StepUploadJadwal term={term} mataKuliahList={mataKuliahList} isAlreadyDone={isAlreadyDone} />
          </StepperContent>
          <StepperContent value="preview">
            <StepPreviewJadwal term={term} />
          </StepperContent>
          <StepperContent value="selesai">
            <StepSelesaiJadwal term={term} />
          </StepperContent>
        </div>
      </Stepper>
    </div>
  );
}
