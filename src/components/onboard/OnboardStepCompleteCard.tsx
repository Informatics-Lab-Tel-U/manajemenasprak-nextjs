'use client';

import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

interface OnboardStepCompleteCardProps {
  title: string;
  description: ReactNode;
  nextStep?: {
    icon: ReactNode;
    title?: string;
    description: ReactNode;
  };
  buttonLabel: string;
  loadingLabel?: string;
  isNavigating: boolean;
  onFinish: () => void;
}

export function OnboardStepCompleteCard({
  title,
  description,
  nextStep,
  buttonLabel,
  loadingLabel = 'Mengalihkan...',
  isNavigating,
  onFinish,
}: OnboardStepCompleteCardProps) {
  return (
    <Card className="border border-border shadow-none bg-transparent">
      <CardContent className="flex flex-col items-center text-center py-10 px-6 space-y-6">
        <CheckCircle2 className="w-12 h-12 text-foreground" strokeWidth={1.5} aria-hidden="true" />

        <div className="space-y-2 max-w-xl">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>

        {nextStep && (
          <div className="w-full max-w-lg rounded-lg border border-border bg-transparent p-4 text-left">
            <div className="flex gap-3 items-start">
              <div className="border border-border p-2 rounded-md shrink-0 text-muted-foreground">
                {nextStep.icon}
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-sm text-foreground">
                  {nextStep.title ?? 'Langkah Selanjutnya'}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {nextStep.description}
                </p>
              </div>
            </div>
          </div>
        )}

        <Button onClick={onFinish} disabled={isNavigating}>
          {isNavigating && <Spinner className="mr-2" />}
          {isNavigating ? loadingLabel : buttonLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
