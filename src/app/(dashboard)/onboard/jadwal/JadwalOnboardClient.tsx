'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Upload, Eye, CheckCircle2 } from 'lucide-react';
import { StepperContent } from '@/components/ui/stepper';
import { OnboardWizardShell } from '@/components/onboard/OnboardWizardShell';
import OnboardLoadingSkeleton from '@/components/onboard/OnboardLoadingSkeleton';
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
    icon: <Upload className="w-4 h-4" />,
  },
  {
    id: 'preview',
    title: 'Preview',
    description: 'Validasi jadwal dan konflik',
    icon: <Eye className="w-4 h-4" />,
  },
  {
    id: 'selesai',
    title: 'Selesai',
    description: 'Jadwal berhasil disimpan',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
];

interface JadwalOnboardClientProps {
  term: string;
  mataKuliahList: MataKuliah[];
  initialJadwalList?: unknown[];
  isAlreadyDone?: boolean;
}

export default function JadwalOnboardClient({
  term,
  mataKuliahList,
  initialJadwalList = [],
  isAlreadyDone = false,
}: JadwalOnboardClientProps) {
  const { currentStep, setCurrentStep, syncWithTerm, completedSteps } = useJadwalOnboardStore();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [prevTerm, setPrevTerm] = useState(term);

  if (term !== prevTerm) {
    setPrevTerm(term);
    syncWithTerm(term, isAlreadyDone, initialJadwalList);
  }

  useEffect(() => {
    syncWithTerm(term, isAlreadyDone, initialJadwalList);
  }, [term, isAlreadyDone, initialJadwalList, syncWithTerm]);

  if (!mounted) return <OnboardLoadingSkeleton />;

  return (
    <OnboardWizardShell
      title="Setup Jadwal Praktikum"
      description="Ikuti alur ini untuk mengunggah dan memvalidasi jadwal praktikum secara berurutan."
      term={term}
      isEditMode={isAlreadyDone}
      editModeLabel="Mode: Update / Edit Jadwal Tersimpan"
      steps={steps}
      currentStep={currentStep}
      completedSteps={completedSteps}
      onStepChange={(id) => setCurrentStep(id as JadwalOnboardStep)}
    >
      <StepperContent value="upload">
        <StepUploadJadwal
          term={term}
          mataKuliahList={mataKuliahList}
          isAlreadyDone={isAlreadyDone}
        />
      </StepperContent>
      <StepperContent value="preview">
        <StepPreviewJadwal term={term} />
      </StepperContent>
      <StepperContent value="selesai">
        <StepSelesaiJadwal term={term} />
      </StepperContent>
    </OnboardWizardShell>
  );
}
