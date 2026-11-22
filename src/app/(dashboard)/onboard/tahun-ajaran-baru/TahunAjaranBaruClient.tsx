'use client';

/* eslint-disable react-doctor/no-locale-format-in-render */

import Link from 'next/link';

import React, { useState, useEffect } from 'react';
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

import PraktikumStep from './steps/StepPraktikum';
import MatkulStep from './steps/StepMataKuliah';
import PreviewStep from './steps/StepPreview';
import SelesaiStep from './steps/StepSelesai';

import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle2, Save, RefreshCw, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { 
  useOnboardingStore, 
  useAutosaveStatus
} from '@/store/useOnboardingStore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';





const steps = [
  { id: 'praktikum', title: 'Data Praktikum', description: 'Buat tahun ajaran', icon: <BookOpen /> },
  { id: 'matkul', title: 'Mata Kuliah', description: 'Tambahkan MK', icon: <BookOpen /> },
  { id: 'jadwal', title: 'Preview & Simpan', description: 'Konfirmasi Data', icon: <Save /> },
  { id: 'selesai', title: 'Selesai', description: 'Setup berhasil', icon: <CheckCircle2 /> },
];

interface TahunAjaranBaruClientProps {
  term?: string;
  initialPraktikumList?: any[];
  initialMataKuliahList?: any[];
}

export default function TahunAjaranBaruClient({
  term = '',
  initialPraktikumList = [],
  initialMataKuliahList = [],
}: TahunAjaranBaruClientProps = {}) {
  const { 
    currentStep, 
    setCurrentStep,
    completedSteps,
    draft,
    resetProgress,
    syncWithTerm,
  } = useOnboardingStore();
  
  const { lastSaved, isDirty } = useAutosaveStatus();

  const [prevTerm, setPrevTerm] = useState(term);
  if (term !== prevTerm) {
    setPrevTerm(term);
    syncWithTerm(term, initialPraktikumList, initialMataKuliahList);
  }

  useEffect(() => {
    if (term) {
      syncWithTerm(term, initialPraktikumList, initialMataKuliahList);
    }
  }, [term, initialPraktikumList, initialMataKuliahList, syncWithTerm]);

  return (
    <div className="container mx-auto max-w-[2000px] relative space-y-6 2xl:px-8" suppressHydrationWarning>
      <header className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild className="shrink-0 mt-1">
            <Link prefetch={false} href="/onboard">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Setup Tahun Ajaran Baru</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Ikuti alur ini untuk menambahkan seluruh data semester baru secara berurutan agar sesuai dengan constraint sistem.
            </p>
            {term && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  Target Tahun Ajaran: <strong className="font-semibold">{term}</strong>
                </span>
                {initialPraktikumList.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Mode: Edit Data Eksisting DB
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Mode: Setup Baru
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-muted-foreground text-right">
            {isDirty ? (
              <span className="flex items-center gap-1 text-amber-500"><RefreshCw className="w-3 h-3 animate-spin"/> Ada perubahan belum tersimpan</span>
            ) : lastSaved ? (
              <span className="flex items-center gap-1 text-green-500"><Save className="w-3 h-3"/> Disimpan {lastSaved.toLocaleTimeString()}</span>
            ) : null}
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10">
                Reset Progress
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Anda yakin ingin reset progress?</AlertDialogTitle>
                <AlertDialogDescription>
                  Draft dan data state saat ini akan dihapus. Data yang sudah tersimpan di database tidak akan terhapus.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={resetProgress} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                  Reset Progress
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <Stepper 
        steps={steps} 
        value={currentStep}
        onValueChange={(id) => {
          const targetIndex = steps.findIndex(s => s.id === id);
          const currentIndex = steps.findIndex(s => s.id === currentStep);
          if (targetIndex <= currentIndex || completedSteps.includes(id as any)) {
            setCurrentStep(id as any);
          } else {
            const previousStepId = steps[targetIndex - 1]?.id;
            if (completedSteps.includes(previousStepId as any)) {
              setCurrentStep(id as any);
            } else {
              toast.error('Silakan selesaikan step saat ini terlebih dahulu.');
            }
          }
        }}
        className="flex flex-col w-full items-start gap-8"
      >
        <StepperNav className="w-full bg-transparent p-4 rounded-xl border border-border shadow-none">
          {steps.map((step, index) => (
            <StepperItem key={step.id} stepId={step.id} completed={completedSteps.includes(step.id as any)} className="relative flex-1">
              <StepperTrigger className="flex flex-col gap-2.5">
                <StepperIndicator />
                <div className="flex flex-col">
                  <StepperTitle>{step.title}</StepperTitle>
                  <StepperDescription className="text-nowrap max-md:hidden">{step.description}</StepperDescription>
                </div>
              </StepperTrigger>
              {steps.length > index + 1 && (
                <StepperSeparator className="absolute inset-x-0 top-2 right-[calc(-50%+18px)] left-[calc(50%+18px)]" />
              )}
            </StepperItem>
          ))}
        </StepperNav>

        <div className="w-full">
          <StepperContent value="praktikum">
            <PraktikumStep />
          </StepperContent>
          <StepperContent value="matkul">
            <MatkulStep />
          </StepperContent>
          <StepperContent value="jadwal">
            <PreviewStep />
          </StepperContent>
          <StepperContent value="selesai">
            <SelesaiStep />
          </StepperContent>
        </div>
      </Stepper>
    </div>
  );
}

