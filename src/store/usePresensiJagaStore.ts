import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { PresensiJaga } from '@/types/database';

interface PresensiJagaState {
  todayPresensi: PresensiJaga[];
  modulPresensi: PresensiJaga[];
  currentTerm: string;
  currentModul: number;
  isInitialized: boolean;
  init: (initialData?: PresensiJaga[]) => Promise<void>;
  setInitialPresensi: (data: PresensiJaga[]) => void;
  loadPresensiForModul: (term: string, modul: number) => Promise<void>;
  cleanup: () => void;
  getPresensiForAsprak: (idAsprak: string, shift?: number, hari?: string) => PresensiJaga | undefined;
}

const supabase = createClient();
let channelPresensi: ReturnType<typeof supabase.channel> | null = null;
let initPromise: Promise<void> | null = null;

export const usePresensiJagaStore = create<PresensiJagaState>((set, get) => ({
  todayPresensi: [],
  modulPresensi: [],
  currentTerm: '',
  currentModul: 0,
  isInitialized: false,

  setInitialPresensi: (data) => {
    if (get().todayPresensi.length === 0 && data && data.length > 0) {
      set({ todayPresensi: data });
    }
  },

  loadPresensiForModul: async (term: string, modul: number) => {
    set({ currentTerm: term, currentModul: modul });
    if (!term) return;

    try {
      const params = new URLSearchParams({ term });
      if (modul > 0) params.append('modul', String(modul));

      const res = await fetch(`/api/jaga/presensi?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          set({ modulPresensi: json.data });
        }
      }
    } catch (e) {
      console.warn('[PresensiStore] Load modul presensi error:', e);
    }
  },

  init: async (initialData) => {
    if (initialData && initialData.length > 0 && get().todayPresensi.length === 0) {
      set({ todayPresensi: initialData });
    }

    if (initPromise) return initPromise;

    initPromise = (async () => {
      set({ isInitialized: true });

      const fetchToday = async () => {
        try {
          const res = await fetch('/api/jaga/presensi/today');
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json.data) && json.data.length > 0) {
              set({ todayPresensi: json.data });
            }
          }
        } catch (e) {
          console.warn('[Realtime:Presensi] Fetch today fallback error:', e);
        }
      };

      await fetchToday();

      if (!channelPresensi) {
        channelPresensi = supabase
          .channel('global_presensi_jaga')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'presensi_jaga' },
            async (payload) => {
              if (payload.eventType === 'INSERT') {
                const newRow = payload.new as PresensiJaga;
                
                // Update todayPresensi
                set((state) => {
                  const existingIdx = state.todayPresensi.findIndex(p => p.id === newRow.id);
                  if (existingIdx !== -1) {
                    const copy = [...state.todayPresensi];
                    copy[existingIdx] = { ...copy[existingIdx], ...newRow };
                    return { todayPresensi: copy };
                  }
                  return { todayPresensi: [newRow, ...state.todayPresensi] };
                });

                // Update modulPresensi if matches currentTerm and currentModul
                const { currentTerm, currentModul, loadPresensiForModul } = get();
                if (currentTerm && (!currentModul || newRow.modul === currentModul)) {
                  loadPresensiForModul(currentTerm, currentModul);
                }
                
                fetchToday();
              } else if (payload.eventType === 'UPDATE') {
                const updatedRow = payload.new as PresensiJaga;
                set((state) => ({
                  todayPresensi: state.todayPresensi.map(item =>
                    item.id === updatedRow.id ? { ...item, ...updatedRow } : item
                  ),
                  modulPresensi: state.modulPresensi.map(item =>
                    item.id === updatedRow.id ? { ...item, ...updatedRow } : item
                  ),
                }));
              } else if (payload.eventType === 'DELETE') {
                const oldRow = payload.old as { id: string };
                set((state) => ({
                  todayPresensi: state.todayPresensi.filter(item => item.id !== oldRow.id),
                  modulPresensi: state.modulPresensi.filter(item => item.id !== oldRow.id),
                }));
              }
            }
          )
          .subscribe((status, err) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn('[Realtime:Presensi] Channel issue:', status, err);
            }
          });
      }
    })();

    return initPromise;
  },

  cleanup: () => {
    if (channelPresensi) {
      supabase.removeChannel(channelPresensi);
      channelPresensi = null;
    }
    initPromise = null;
    set({ isInitialized: false });
  },

  getPresensiForAsprak: (idAsprak: string, shift?: number, hari?: string) => {
    const list = get().modulPresensi.length > 0 ? get().modulPresensi : get().todayPresensi;
    return list.find(p => {
      if (p.id_asprak !== idAsprak) return false;
      if (typeof shift === 'number' && p.shift !== shift) return false;
      if (hari && p.hari.toUpperCase() !== hari.toUpperCase()) return false;
      return true;
    });
  }
}));
