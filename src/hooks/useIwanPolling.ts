'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { startIwanPolling } from '@/lib/iwanPolling';

export function useIwanPolling(
  task: (signal: AbortSignal) => Promise<void>,
  intervalMs: number,
  errorMessage: string,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    return startIwanPolling(task, intervalMs, () => toast.error(errorMessage));
  }, [task, intervalMs, errorMessage, enabled]);
}
