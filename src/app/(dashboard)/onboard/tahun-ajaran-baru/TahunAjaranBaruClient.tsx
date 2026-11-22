'use client';

import { useState, useEffect } from 'react';
import { BookOpen, CheckCircle2, Save } from 'lucide-react';
import { StepperContent } from '@/components/ui/stepper';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
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
import { OnboardWizardShell } from '@/components/onboard/OnboardWizardShell';
import { useOnboardingStore, useAutosaveStatus, type OnboardingStep } from '@/store/useOnboardingStore';

import PraktikumStep from './steps/StepPraktikum';
import MatkulStep from './steps/StepMataKuliah';
import PreviewStep from './steps/StepPreview';
import SelesaiStep from './steps/StepSelesai';

const steps = [
  { id: 'praktikum', title: 'Data Praktikum', description: 'Buat tahun ajaran', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'matkul', title: 'Mata Kuliah', description: 'Tambahkan MK', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'jadwal', title: 'Preview & Simpan', description: 'Konfirmasi Data', icon: <Save className="w-4 h-4" /> },
  { id: 'selesai', title: 'Selesai', description: 'Setup berhasil', icon: <CheckCircle2 className="w-4 h-4" /> },
];

interface TahunAjaranBaruClientProps {
  term?: string;
  initialPraktikumList?: unknown[];
  initialMataKuliahList?: unknown[];
}

export default function TahunAjaranBaruClient({
  term = '',
  initialPraktikumList = [],
  initialMataKuliahList = [],
}: TahunAjaranBaruClientProps = {}) {
  const { currentStep, setCurrentStep, completedSteps, resetProgress, syncWithTerm } =
    useOnboardingStore();
  const { lastSaved, isDirty } = useAutosaveStatus();

  const [prevTerm, setPrevTerm] = useState(term);
  if (term !== prevTerm) {
    setPrevTerm(term);
    syncWithTerm(term, initialPraktikumList as never[], initialMataKuliahList as never[]);
  }

  useEffect(() => {
    if (term) {
      syncWithTerm(term, initialPraktikumList as never[], initialMataKuliahList as never[]);
    }
  }, [term, initialPraktikumList, initialMataKuliahList, syncWithTerm]);

  const headerActions = (
    <>
      <div className="text-xs text-muted-foreground tabular-nums">
        {isDirty ? (
          <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <Spinner className="w-3 h-3" />
            Menyimpan perubahan...
          </span>
        ) : lastSaved ? (
          <span className="inline-flex items-center gap-1.5">
            <Save className="w-3 h-3" aria-hidden="true" />
            Disimpan {lastSaved.toLocaleTimeString()}
          </span>
        ) : null}
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
          >
            Reset Progress
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anda yakin ingin reset progress?</AlertDialogTitle>
            <AlertDialogDescription>
              Draft dan data state saat ini akan dihapus. Data yang sudah tersimpan di database tidak
              akan terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={resetProgress} variant="destructive">
              Reset Progress
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return (
    <div suppressHydrationWarning>
      <OnboardWizardShell
        title="Setup Tahun Ajaran Baru"
        description="Ikuti alur ini untuk menambahkan seluruh data semester baru secara berurutan agar sesuai dengan constraint sistem."
        term={term}
        isEditMode={initialPraktikumList.length > 0}
        editModeLabel="Mode: Edit Data Eksisting DB"
        steps={steps}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepChange={(id) => setCurrentStep(id as OnboardingStep)}
        lockedStepMessage="Silakan selesaikan step saat ini terlebih dahulu."
        headerActions={headerActions}
      >
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
      </OnboardWizardShell>
    </div>
  );
}
