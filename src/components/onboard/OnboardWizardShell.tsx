'use client';

import type { ReactElement, ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper';

export interface OnboardWizardStep {
  id: string;
  title: string;
  description: string;
  icon?: ReactElement;
}

interface OnboardWizardShellProps {
  title: string;
  description: string;
  term?: string;
  isEditMode?: boolean;
  editModeLabel?: string;
  newModeLabel?: string;
  steps: OnboardWizardStep[];
  currentStep: string;
  completedSteps: string[];
  onStepChange: (stepId: string) => void;
  lockedStepMessage?: string;
  headerActions?: ReactNode;
  children: ReactNode;
}

export function OnboardWizardShell({
  title,
  description,
  term,
  isEditMode = false,
  editModeLabel = 'Mode: Edit Data Tersimpan',
  newModeLabel = 'Mode: Setup Baru',
  steps,
  currentStep,
  completedSteps,
  onStepChange,
  lockedStepMessage,
  headerActions,
  children,
}: OnboardWizardShellProps) {
  const handleValueChange = (id: string) => {
    const targetIndex = steps.findIndex((s) => s.id === id);
    const currentIndex = steps.findIndex((s) => s.id === currentStep);

    if (targetIndex <= currentIndex || completedSteps.includes(id)) {
      onStepChange(id);
      return;
    }

    const previousStepId = steps[targetIndex - 1]?.id;
    if (previousStepId && completedSteps.includes(previousStepId)) {
      onStepChange(id);
    } else if (lockedStepMessage) {
      toast.error(lockedStepMessage);
    }
  };

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 relative space-y-6">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="shrink-0 mt-0.5"
            aria-label="Kembali ke Hub Setup"
          >
            <Link prefetch={false} href="/onboard">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            {term && (
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <Badge variant="outline" className="tabular-nums font-medium">
                  Target: {term}
                </Badge>
                <Badge variant={isEditMode ? 'secondary' : 'outline'}>
                  {isEditMode ? editModeLabel : newModeLabel}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {headerActions && (
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto xl:justify-end">
            {headerActions}
          </div>
        )}
      </header>

      <Stepper
        steps={steps}
        value={currentStep}
        onValueChange={handleValueChange}
        className="flex flex-col w-full items-start gap-6"
      >
        <StepperNav className="w-full bg-transparent p-4 rounded-lg border border-border shadow-none">
          {steps.map((step, index) => (
            <StepperItem
              key={step.id}
              stepId={step.id}
              completed={completedSteps.includes(step.id)}
              className="relative flex-1"
            >
              <StepperTrigger className="flex flex-col gap-2">
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

        <div className="w-full">{children}</div>
      </Stepper>
    </div>
  );
}
