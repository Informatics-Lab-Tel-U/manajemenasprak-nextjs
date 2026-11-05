'use client';

import * as React from 'react';
import { useTermStore } from '@/store/useTermStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface GlobalTermSelectorProps {
  availableTerms: string[];
  disabled?: boolean;
}

export function GlobalTermSelector({ availableTerms, disabled = false }: GlobalTermSelectorProps) {
  const { activeTerm, setActiveTerm } = useTermStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    if (availableTerms.length === 0) return;

    if (!activeTerm || !availableTerms.includes(activeTerm)) {
      setActiveTerm(availableTerms[0]);
    }
  }, [activeTerm, availableTerms, setActiveTerm]);

  if (!mounted) {
    return (
      <div className="w-[140px] h-9 border rounded-md px-3 flex items-center bg-background">
        <span className="text-sm text-muted-foreground opacity-50">Memuat...</span>
      </div>
    );
  }

  const displayValue = activeTerm && availableTerms.includes(activeTerm)
    ? activeTerm
    : availableTerms[0] || '';

  if (!displayValue) return null;

  return (
    <Select value={displayValue} onValueChange={setActiveTerm} disabled={disabled}>
      <SelectTrigger className="w-[140px] h-9 bg-background font-medium">
        <SelectValue placeholder="Tahun Ajaran" />
      </SelectTrigger>
      <SelectContent>
        {availableTerms.map((term) => (
          <SelectItem key={term} value={term}>
            {term}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
