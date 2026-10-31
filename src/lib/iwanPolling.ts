export function startIwanPolling(
  task: (signal: AbortSignal) => Promise<void>,
  intervalMs: number,
  onError: (error: unknown) => void,
  immediate = true,
): () => void {
  let stopped = false;
  let running = false;
  let completed = false;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active: AbortController | undefined;

  const run = async () => {
    if (stopped || running || document.hidden) return;
    running = true;
    const controller = new AbortController();
    active = controller;
    try {
      await task(controller.signal);
      if (!controller.signal.aborted) failures = 0;
    } catch (error) {
      if (!controller.signal.aborted) {
        failures++;
        if (failures === 1) onError(error);
      }
    } finally {
      running = false;
      active = undefined;
      if (!controller.signal.aborted) completed = true;
      if (!stopped && !document.hidden && (intervalMs > 0 || controller.signal.aborted)) {
        const delay = controller.signal.aborted
          ? 0
          : Math.min(intervalMs * 2 ** Math.min(failures, 4), 60000);
        timer = setTimeout(() => void run(), delay);
      }
    }
  };

  const handleVisibility = () => {
    clearTimeout(timer);
    if (document.hidden) active?.abort();
    else if (intervalMs > 0 || !completed) void run();
  };

  document.addEventListener('visibilitychange', handleVisibility);
  if (immediate) void run();
  else if (intervalMs > 0) timer = setTimeout(() => void run(), intervalMs);
  return () => {
    stopped = true;
    clearTimeout(timer);
    active?.abort();
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}

export async function fetchIwanData<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`IWAN HTTP ${response.status}`);
  const json = await response.json();
  if (!json.ok) throw new Error(json.error || 'Gagal memuat data IWAN');
  return json.data as T;
}
