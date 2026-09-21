import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

export type LabStatus = {
  lab_id: string;
  kelas: string;
  status: string;
  last_seen: string;
};

export type HeartbeatPoint = {
  created_at: string;
  response_time_ms: number | null;
};

const MAX_POINTS = 60;          // 60 points per lab ~ 20 menit jika interval 20s
const POLLING_INTERVAL_MS = 30_000; // polling fallback setiap 30 detik
const NOW_TICK_MS = 10_000;     // tick `now` setiap 10 detik (threshold offline: 60s)
const RECONNECT_DELAY_MS = 5_000;  // delay sebelum reconnect setelah channel error

interface MonitoringState {
  labStatus: LabStatus[];
  heartbeatData: Record<string, HeartbeatPoint[]>;
  isInitialized: boolean;
  /** Waktu saat ini — diperbarui global setiap 10 detik, menggantikan timer per-komponen */
  now: Date;
  init: () => void;
  cleanup: () => void;
  setInitialLabStatus: (data: LabStatus[]) => void;
  updateLabStatus: (data: LabStatus[]) => void;
  _tickNow: () => void;
}

// Client global untuk websocket — disimpan di luar React lifecycle
const supabase = createClient();
let channelLab: ReturnType<typeof supabase.channel> | null = null;
let channelHeartbeat: ReturnType<typeof supabase.channel> | null = null;
// Mutex: menjamin init() hanya berjalan satu kali meskipun dipanggil bersamaan
let initPromise: Promise<void> | null = null;
// Timer referensi untuk cleanup
let pollTimer: ReturnType<typeof setInterval> | null = null;
let nowTimer: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export const useMonitoringStore = create<MonitoringState>((set, get) => ({
  labStatus: [],
  heartbeatData: {},
  isInitialized: false,
  now: new Date(),

  setInitialLabStatus: (data) => {
    // Hanya set jika labStatus masih kosong agar tidak me-reset data realtime yang sudah jalan
    if (get().labStatus.length === 0) {
      set({ labStatus: data });
    }
  },

  updateLabStatus: (data) => {
    set({ labStatus: data });
  },

  _tickNow: () => set({ now: new Date() }),

  init: async () => {
    if (initPromise) return initPromise;

    initPromise = (async () => {
      set({ isInitialized: true });

      const fetchStatus = async () => {
        try {
          const res = await fetch('/api/monitoring/status');
          if (res.status === 401) {
            // Token belum siap / sesi expired — jangan polling terus
            return;
          }
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json.data) && json.data.length > 0) {
              set({ labStatus: json.data });
            }
          }
        } catch (_err) {}
      };

      // Initial fetch untuk data paling fresh tanpa bergantung jeda SSR/WebSocket
      await fetchStatus();

      // Polling fallback — re-fetch setiap 30 detik agar data tidak stale jika WS putus
      if (!pollTimer) {
        pollTimer = setInterval(fetchStatus, POLLING_INTERVAL_MS);
      }

      // Global `now` ticker — satu interval untuk seluruh aplikasi
      if (!nowTimer) {
        nowTimer = setInterval(() => get()._tickNow(), NOW_TICK_MS);
      }

      // Handler reuse untuk kedua channel
      const handleChannelError = (channelName: string) => (status: string, err: any) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[Realtime:Store] ${channelName} channel error (${status}), reconnecting in ${RECONNECT_DELAY_MS}ms`, err);

          // Bersihkan channel yang bermasalah
          if (channelLab) { supabase.removeChannel(channelLab); channelLab = null; }
          if (channelHeartbeat) { supabase.removeChannel(channelHeartbeat); channelHeartbeat = null; }

          // Hentikan polling timer lama SEBELUM reset initPromise,
          // agar saat init() baru berjalan tidak menumpuk dua setInterval sekaligus
          if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
          if (nowTimer) { clearInterval(nowTimer); nowTimer = null; }

          initPromise = null;

          // Debounce: batalkan reconnect yang sudah dijadwalkan (hindari double-reconnect
          // jika kedua channel error sekaligus)
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            get().init();
          }, RECONNECT_DELAY_MS);
        }
      };

      // Setup WebSocket Subscription untuk monitoring_lab
      if (!channelLab) {
        channelLab = supabase
          .channel('global_monitoring_lab')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'monitoring_lab' },
            (payload) => {
              const updatedRow = payload.new as LabStatus;
              set((state) => {
                const existingIndex = state.labStatus.findIndex((item) => item.lab_id === updatedRow.lab_id);
                if (existingIndex !== -1) {
                  const newData = [...state.labStatus];
                  newData[existingIndex] = updatedRow;
                  return { labStatus: newData.sort((a, b) => a.lab_id.localeCompare(b.lab_id)) };
                }
                return { labStatus: [...state.labStatus, updatedRow].sort((a, b) => a.lab_id.localeCompare(b.lab_id)) };
              });
            }
          )
          .subscribe(handleChannelError('Lab'));
      }

      // Setup WebSocket Subscription untuk monitoring_heartbeat_log
      if (!channelHeartbeat) {
        channelHeartbeat = supabase
          .channel('global_monitoring_heartbeat')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'monitoring_heartbeat_log' },
            (payload) => {
              const newLog = payload.new as any;
              set((state) => {
                const labId = newLog.lab_id;
                const currentList = state.heartbeatData[labId] || [];
                const updatedList = [
                  ...currentList,
                  { created_at: newLog.created_at, response_time_ms: newLog.response_time_ms },
                ];

                if (updatedList.length > MAX_POINTS) {
                  updatedList.shift();
                }

                return {
                  heartbeatData: {
                    ...state.heartbeatData,
                    [labId]: updatedList,
                  },
                };
              });
            }
          )
          .subscribe(handleChannelError('Heartbeat'));
      }
    })();

    return initPromise;
  },

  cleanup: () => {
    if (channelLab) { supabase.removeChannel(channelLab); channelLab = null; }
    if (channelHeartbeat) { supabase.removeChannel(channelHeartbeat); channelHeartbeat = null; }
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (nowTimer) { clearInterval(nowTimer); nowTimer = null; }
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    initPromise = null;
    set({ isInitialized: false });
  },
}));
