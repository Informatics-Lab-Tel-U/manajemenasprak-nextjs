import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMonitoringStore, HeartbeatPoint } from '@/store/useMonitoringStore';

export type { HeartbeatPoint };

export function useHeartbeatLogAll(range: string = '1h') {
  const realtimeData = useMonitoringStore(state => state.heartbeatData);
  const init = useMonitoringStore(state => state.init);

  const [historicalData, setHistoricalData] = useState<Record<string, HeartbeatPoint[]>>({});
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  const fetchHistory = useCallback(async (selectedRange: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/monitoring/heartbeat-log?range=${selectedRange}`, {
        signal: controller.signal,
      });
      if (!res.ok) return;
      const { data } = await res.json();
      if (!Array.isArray(data)) return;

      const grouped: Record<string, HeartbeatPoint[]> = {};
      data.forEach((log: any) => {
        if (!grouped[log.lab_id]) grouped[log.lab_id] = [];
        grouped[log.lab_id].push({
          created_at: log.created_at,
          response_time_ms: log.response_time_ms,
        });
      });
      setHistoricalData(grouped);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[useHeartbeatLogAll] fetch error:', err);
      }
    }
  }, []);

  useEffect(() => {
    fetchHistory(range);
    return () => { abortRef.current?.abort(); };
  }, [range, fetchHistory]);

  // useMemo: merge hanya dihitung ulang saat historicalData atau realtimeData berubah,
  // bukan setiap re-render komponen yang menggunakan hook ini
  return useMemo(() => {
    const merged: Record<string, HeartbeatPoint[]> = {};
    const allLabIds = new Set([...Object.keys(historicalData), ...Object.keys(realtimeData)]);

    allLabIds.forEach(labId => {
      const historical = historicalData[labId] ?? [];
      const realtime = realtimeData[labId] ?? [];

      const seen = new Map<string, HeartbeatPoint>();
      [...historical, ...realtime].forEach(p => seen.set(p.created_at, p));

      merged[labId] = Array.from(seen.values())
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

    return merged;
  }, [historicalData, realtimeData]);
}
