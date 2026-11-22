'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Upload, CheckCircle2 } from 'lucide-react';
import { StepperContent } from '@/components/ui/stepper';
import { OnboardWizardShell } from '@/components/onboard/OnboardWizardShell';
import OnboardLoadingSkeleton from '@/components/onboard/OnboardLoadingSkeleton';
import { useAsprakOnboardStore, AsprakOnboardStep } from '@/store/useAsprakOnboardStore';
import { ExistingNimInfo } from '@/utils/validation/asprakValidation';
import { ExistingAsprakInfo } from '@/components/asprak/AsprakImportCSVModal';

import StepDataAsprak from './steps/StepDataAsprak';
import StepPlottingAsprak from './steps/StepPlottingAsprak';
import StepPreviewFinalAsprak from './steps/StepPreviewFinalAsprak';
import StepSelesaiAsprak from './steps/StepSelesaiAsprak';

const steps = [
  {
    id: 'data_asprak',
    title: 'Data Asprak',
    description: 'Upload & Validasi Data',
    icon: <Upload className="w-4 h-4" />,
  },
  {
    id: 'plotting',
    title: 'Plotting',
    description: 'Upload CSV Penugasan',
    icon: <Upload className="w-4 h-4" />,
  },
  {
    id: 'preview-final',
    title: 'Preview Final',
    description: 'Simpan Keseluruhan',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  {
    id: 'selesai',
    title: 'Selesai',
    description: 'Asprak berhasil disimpan',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
];

interface AsprakOnboardClientProps {
  term: string;
  initialExistingCodes: string[];
  initialExistingNims: ExistingNimInfo[];
  initialExistingAspraks: ExistingAsprakInfo[];
  initialPlottingList?: unknown[];
  isAlreadyDone?: boolean;
}

export default function AsprakOnboardClient({
  term,
  initialExistingCodes,
  initialExistingNims,
  initialExistingAspraks,
  initialPlottingList = [],
  isAlreadyDone = false,
}: AsprakOnboardClientProps) {
  const { currentStep, setCurrentStep, syncWithTerm, completedSteps } = useAsprakOnboardStore();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [prevTerm, setPrevTerm] = useState(term);

  if (term !== prevTerm) {
    setPrevTerm(term);
    syncWithTerm(term, isAlreadyDone, initialPlottingList);
  }

  useEffect(() => {
    syncWithTerm(term, isAlreadyDone, initialPlottingList);
  }, [term, isAlreadyDone, initialPlottingList, syncWithTerm]);

  if (!mounted) return <OnboardLoadingSkeleton />;

  return (
    <OnboardWizardShell
      title="Setup Data Asprak"
      description="Ikuti alur ini untuk mengunggah dan memvalidasi data asisten praktikum secara berurutan."
      term={term}
      isEditMode={isAlreadyDone}
      editModeLabel="Mode: Update / Edit Plotting Tersimpan"
      steps={steps}
      currentStep={currentStep}
      completedSteps={completedSteps}
      onStepChange={(id) => setCurrentStep(id as AsprakOnboardStep)}
    >
      <StepperContent value="data_asprak">
        <StepDataAsprak
          term={term}
          existingCodes={initialExistingCodes}
          existingNims={initialExistingNims}
          existingAspraks={initialExistingAspraks}
          isAlreadyDone={isAlreadyDone}
        />
      </StepperContent>
      <StepperContent value="plotting">
        <StepPlottingAsprak term={term} />
      </StepperContent>
      <StepperContent value="preview-final">
        <StepPreviewFinalAsprak term={term} />
      </StepperContent>
      <StepperContent value="selesai">
        <StepSelesaiAsprak term={term} />
      </StepperContent>
    </OnboardWizardShell>
  );
}
