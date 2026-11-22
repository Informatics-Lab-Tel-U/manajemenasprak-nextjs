'use client';

import React from 'react';
import { fetchIwanData } from '@/lib/iwanPolling';
import { createClient } from '@/lib/supabase/client';

export interface EvidenceLogItem {
  id: string;
  deviceId: string;
  roomId: string;
  deviceLabel: string;
  seatNumber: number;
  roomName: string;
  windowTitle: string;
  screenshotUrl: string;
  screenshotStoragePath: string;
  detectedAt: string;
}

export function mapEvidenceRow(row: Record<string, unknown>): EvidenceLogItem {
  return {
    id: String(row.id ?? ''),
    deviceId: String(row.device_id ?? row.deviceId ?? ''),
    roomId: String(row.room_id ?? row.roomId ?? ''),
    deviceLabel: String(row.device_label ?? row.deviceLabel ?? ''),
    seatNumber: Number(row.seat_number ?? row.seatNumber ?? 0),
    roomName: String(row.room_name ?? row.roomName ?? ''),
    windowTitle: String(row.window_title ?? row.windowTitle ?? ''),
    screenshotUrl: String(row.screenshot_url ?? row.screenshotUrl ?? ''),
    screenshotStoragePath: String(row.screenshot_storage_path ?? row.screenshotStoragePath ?? ''),
    detectedAt: String(row.detected_at ?? row.detectedAt ?? ''),
  };
}

interface UseIwanEvidenceRealtimeOptions {
  roomId?: string;
  limit?: number;
  enabled?: boolean;
  autoFetch?: boolean;
}

async function fetchEvidenceRows(
  roomId: string,
  limit: number,
  signal?: AbortSignal,
): Promise<{ items: EvidenceLogItem[]; totalCount: number }> {
  // Query directly from Supabase to avoid unnecessary Cloudflare Workers requests
  const supabase = createClient();
  let query = supabase
    .from('iwan_evidence_logs')
    .select('*', { count: 'exact' })
    .order('detected_at', { ascending: false })
    .limit(limit);

  if (roomId !== 'ALL') {
    query = query.eq('room_id', roomId);
  }

  const { data: rows, count, error: sbError } = await query;
  if (!sbError && rows) {
    const items = rows.map((r) => mapEvidenceRow(r as Record<string, unknown>));
    return { items, totalCount: typeof count === 'number' ? count : items.length };
  }

  // Fallback to Hono API if Supabase RLS policy is not yet applied
  const apiQuery =
    roomId === 'ALL'
      ? `?limit=${limit}`
      : `?roomId=${encodeURIComponent(roomId)}&limit=${limit}`;
  const items = await fetchIwanData<EvidenceLogItem[]>(`/api/iwan/evidence${apiQuery}`, signal);
  return { items, totalCount: items.length };
}

export function useIwanEvidenceRealtime({
  roomId = 'ALL',
  limit = 50,
  enabled = true,
  autoFetch = false,
}: UseIwanEvidenceRealtimeOptions = {}) {
  const [logs, setLogs] = React.useState<EvidenceLogItem[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [recentInsertIds, setRecentInsertIds] = React.useState<Set<string>>(() => new Set());
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState(0);

  const logsRequest = React.useRef<AbortController | null>(null);
  const highlightTimers = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const knownIdsRef = React.useRef<Set<string>>(new Set());

  const loadEvidenceLogs = React.useCallback(
    async (signal?: AbortSignal) => {
      logsRequest.current?.abort();
      const controller = new AbortController();
      logsRequest.current = controller;
      const requestSignal = signal
        ? AbortSignal.any([signal, controller.signal])
        : controller.signal;

      try {
        const { items, totalCount: nextCount } = await fetchEvidenceRows(
          roomId,
          limit,
          requestSignal,
        );
        if (!requestSignal.aborted) {
          knownIdsRef.current = new Set(items.map((item) => item.id));
          setLogs(items);
          setTotalCount(nextCount);
          setLoadError(null);
          setLastUpdated(Date.now());
        }
      } catch (error: unknown) {
        if (!requestSignal.aborted) {
          const msg =
            error instanceof Error ? error.message : 'Gagal memuat daftar bukti insiden dari server.';
          setLoadError(msg);
          throw error;
        }
      } finally {
        if (logsRequest.current === controller) logsRequest.current = null;
        if (!requestSignal.aborted) setIsLoading(false);
      }
    },
    [roomId, limit],
  );

  React.useEffect(() => {
    if (!autoFetch) return;
    const controller = new AbortController();
    fetchEvidenceRows(roomId, limit, controller.signal)
      .then(({ items, totalCount: nextCount }) => {
        if (controller.signal.aborted) return;
        knownIdsRef.current = new Set(items.map((item) => item.id));
        setLogs(items);
        setTotalCount(nextCount);
        setLoadError(null);
        setLastUpdated(Date.now());
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const msg =
          error instanceof Error ? error.message : 'Gagal memuat daftar bukti insiden dari server.';
        setLoadError(msg);
        setIsLoading(false);
      });
    return () => controller.abort();
  }, [autoFetch, roomId, limit]);

  // Supabase Realtime subscription (0 CF Workers requests)
  React.useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    const supabase = createClient();
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;

    const subscribeRealtime = async () => {
      // Ensure Realtime WebSocket carries the authenticated user JWT before subscribing,
      // otherwise it joins as `anon` and RLS `TO authenticated` blocks all events.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (disposed) return;

      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
      if (disposed) return;

      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const channelName =
        roomId === 'ALL'
          ? `iwan_evidence_logs_all_${uniqueSuffix}`
          : `iwan_evidence_logs_${roomId}_${uniqueSuffix}`;
      const filter = roomId === 'ALL' ? undefined : `room_id=eq.${roomId}`;

      activeChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'iwan_evidence_logs',
            ...(filter ? { filter } : {}),
          },
          (payload) => {
            if (payload.eventType === 'INSERT' && payload.new) {
              const newItem = mapEvidenceRow(payload.new as Record<string, unknown>);
              if (!knownIdsRef.current.has(newItem.id)) {
                knownIdsRef.current.add(newItem.id);
                setTotalCount((c) => c + 1);
              }
              setLogs((prev) => {
                if (prev.some((item) => item.id === newItem.id)) return prev;
                return [newItem, ...prev]
                  .sort(
                    (a, b) =>
                      new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
                  )
                  .slice(0, limit);
              });
              setRecentInsertIds((prev) => {
                const next = new Set(prev);
                next.add(newItem.id);
                return next;
              });
              const existingTimer = highlightTimers.current.get(newItem.id);
              if (existingTimer) clearTimeout(existingTimer);
              const timer = setTimeout(() => {
                highlightTimers.current.delete(newItem.id);
                setRecentInsertIds((prev) => {
                  if (!prev.has(newItem.id)) return prev;
                  const next = new Set(prev);
                  next.delete(newItem.id);
                  return next;
                });
              }, 3000);
              highlightTimers.current.set(newItem.id, timer);
              setLastUpdated(Date.now());
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              const updated = mapEvidenceRow(payload.new as Record<string, unknown>);
              setLogs((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
              setLastUpdated(Date.now());
            } else if (payload.eventType === 'DELETE' && payload.old) {
              const deletedId = (payload.old as { id?: string }).id;
              if (deletedId) {
                knownIdsRef.current.delete(deletedId);
                setLogs((prev) => prev.filter((item) => item.id !== deletedId));
                setTotalCount((c) => Math.max(0, c - 1));
                setLastUpdated(Date.now());
              }
            }
          },
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('[IwanEvidence] Realtime status:', status, err?.message);
          }
        });
    };

    void subscribeRealtime();

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        void supabase.realtime.setAuth(session.access_token);
      }
    });

    return () => {
      disposed = true;
      authSubscription.unsubscribe();
      if (activeChannel) {
        void supabase.removeChannel(activeChannel);
      }
    };
  }, [enabled, roomId, limit]);

  React.useEffect(
    () => () => {
      logsRequest.current?.abort();
      highlightTimers.current.forEach((timer) => clearTimeout(timer));
      highlightTimers.current.clear();
    },
    [],
  );

  return {
    logs,
    setLogs,
    totalCount,
    recentInsertIds,
    isLoading,
    loadError,
    lastUpdated,
    loadEvidenceLogs,
  };
}
