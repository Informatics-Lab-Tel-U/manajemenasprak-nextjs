'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Cell, Pie, PieChart } from 'recharts';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Search, X, GripVertical } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { SynchronizedJagaSnakeBorder } from '@/components/jadwal/JagaCell';
import { ScheduleCell } from '@/components/jadwal/ScheduleCell';
import { ROOMS, STATIC_SESSIONS } from '@/constants';
import { useJaga } from '@/hooks/useJaga';
import {
  useIwanEvidenceRealtime,
  type EvidenceLogItem,
} from '@/hooks/useIwanEvidenceRealtime';
import { useScheduleData } from '@/hooks/useScheduleData';
import { isLabOnline } from '@/lib/labStatus';
import { useMonitoringStore } from '@/store/useMonitoringStore';
import { usePresensiJagaStore } from '@/store/usePresensiJagaStore';
import { Jadwal, JadwalPengganti } from '@/types/database';
import { getCourseColor } from '@/utils/colorUtils';
import { getJagaShiftsByDay } from '@/utils/jagaUtils';

const MAX_JAGA_CODES = 6;
const DASHBOARD_LAYOUT_STORAGE_KEY = 'manas:beranda-layout-v1';

type EvidencePlacement = 'bottom' | 'left' | 'right';
type BottomCardId = 'asprak' | 'evidence' | 'jadwal-dist';
type DraggableCardId = 'jadwal' | BottomCardId;

interface DashboardLayoutState {
  evidencePlacement: EvidencePlacement;
  bottomOrder: BottomCardId[];
}

const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutState = {
  evidencePlacement: 'bottom',
  bottomOrder: ['asprak', 'evidence', 'jadwal-dist'],
};

function normalizeLayoutState(raw: unknown): DashboardLayoutState {
  if (!raw || typeof raw !== 'object') return DEFAULT_DASHBOARD_LAYOUT;
  const obj = raw as Partial<DashboardLayoutState>;
  const placement: EvidencePlacement =
    obj.evidencePlacement === 'left' || obj.evidencePlacement === 'right' || obj.evidencePlacement === 'bottom'
      ? obj.evidencePlacement
      : 'bottom';
  const validIds: BottomCardId[] = ['asprak', 'evidence', 'jadwal-dist'];
  const seen = new Set<BottomCardId>();
  const order: BottomCardId[] = [];
  if (Array.isArray(obj.bottomOrder)) {
    for (const item of obj.bottomOrder) {
      if (validIds.includes(item as BottomCardId) && !seen.has(item as BottomCardId)) {
        seen.add(item as BottomCardId);
        order.push(item as BottomCardId);
      }
    }
  }
  for (const id of validIds) {
    if (!seen.has(id)) order.push(id);
  }
  return { evidencePlacement: placement, bottomOrder: order };
}

const MONO_CHART_SHADES = [
  'var(--foreground)',
  'var(--chart-2)',
  'var(--chart-1)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

// 1 kode = 1 kotak penuh. 2 kode = sejajar. 3-4 kode = 2 kolom. 5-6 kode = 3 kolom.
function splitJagaRows<T>(tiles: T[]): T[][] {
  const cols = tiles.length <= 2 ? tiles.length : tiles.length <= 4 ? 2 : 3;
  const rows: T[][] = [];
  for (let i = 0; i < tiles.length; i += cols) rows.push(tiles.slice(i, i + cols));
  return rows;
}

const chartConfigAsprak = {
  count: {
    label: 'Jumlah Asprak',
    color: 'var(--foreground)',
  },
} satisfies ChartConfig;

function matchesScheduleQuery(jadwal: Jadwal, room: string, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const fields = [
    jadwal.kelas,
    jadwal.mata_kuliah?.nama_lengkap,
    jadwal.mata_kuliah?.praktikum?.nama,
    jadwal.dosen,
    jadwal.ruangan,
    room,
  ];
  return fields.some((field) => field?.toLowerCase().includes(normalizedQuery));
}

function EvidenceListRow({
  item,
  isRecentInsert,
}: {
  item: EvidenceLogItem;
  isRecentInsert: boolean;
}) {
  const [expanded, setExpanded] = useState(!isRecentInsert);

  useEffect(() => {
    if (expanded) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setExpanded(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [expanded]);

  const detectedDate = item.detectedAt ? new Date(item.detectedAt) : null;
  const timeLabel =
    detectedDate && !Number.isNaN(detectedDate.getTime())
      ? format(detectedDate, 'dd MMM, HH:mm', { locale: id })
      : '-';

  return (
    <div
      style={{
        gridTemplateRows: expanded ? '1fr' : '0fr',
        opacity: expanded ? 1 : 0,
        transform: expanded ? 'translateY(0)' : 'translateY(-6px)',
        transition:
          'grid-template-rows 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease-out, transform 360ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      className="grid overflow-hidden"
    >
      <div className="min-h-0 overflow-hidden">
        <Link
          prefetch={false}
          href="/iwan/evidence"
          style={{
            transition: 'border-color 2000ms ease-out, background-color 150ms ease-out',
          }}
          className={`flex min-h-14 items-center justify-between gap-3 rounded-lg border bg-transparent px-3.5 py-2.5 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            isRecentInsert ? 'border-red-500/80 dark:border-red-500/70' : 'border-border'
          }`}
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-medium text-foreground truncate">
              {item.roomName} · {item.deviceLabel} (Kursi {item.seatNumber})
            </p>
            <p className="text-xs text-muted-foreground truncate">{item.windowTitle}</p>
          </div>

          <div className="shrink-0 text-right">
            <span className="text-xs text-muted-foreground tabular-nums">{timeLabel}</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function DashboardCharts({
  asprakByAngkatan,
  jadwalByDay,
  rawJadwal,
  jadwalPengganti,
  loading,
  error = false,
  term,
  activeModul,
  userRole: _userRole,
  evidenceRealtime,
  isEditingLayout = false,
}: {
  asprakByAngkatan: { name: string; count: number }[];
  jadwalByDay: { name: string; count: number }[];
  rawJadwal: Jadwal[];
  jadwalPengganti: JadwalPengganti[];
  loading: boolean;
  error?: boolean;
  term: string;
  activeModul: number;
  userRole?: string;
  evidenceRealtime?: ReturnType<typeof useIwanEvidenceRealtime>;
  isEditingLayout?: boolean;
}) {
  const [programType, setProgramType] = useState<'REGULER' | 'PJJ'>('REGULER');
  const [searchQuery, setSearchQuery] = useState('');
  const [layout, setLayout] = useState<DashboardLayoutState>(() => {
    if (typeof window === 'undefined') return DEFAULT_DASHBOARD_LAYOUT;
    try {
      const saved = window.localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY);
      return saved ? normalizeLayoutState(JSON.parse(saved)) : DEFAULT_DASHBOARD_LAYOUT;
    } catch {
      return DEFAULT_DASHBOARD_LAYOUT;
    }
  });
  const [draggingCard, setDraggingCard] = useState<DraggableCardId | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const jadwalCardRef = useRef<HTMLDivElement | null>(null);
  const asprakCardRef = useRef<HTMLDivElement | null>(null);
  const evidenceCardRef = useRef<HTMLDivElement | null>(null);
  const jadwalDistCardRef = useRef<HTMLDivElement | null>(null);

  const updateLayout = (updater: (prev: DashboardLayoutState) => DashboardLayoutState) => {
    setLayout((prev) => {
      const next = updater(prev);
      try {
        window.localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const startCardDrag = (
    e: React.DragEvent,
    cardId: DraggableCardId,
    cardEl: HTMLDivElement | null
  ) => {
    if (!isEditingLayout) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', cardId);
    if (cardEl) {
      e.dataTransfer.setDragImage(cardEl, 24, 24);
    }
    setDraggingCard(cardId);
  };

  const endCardDrag = () => {
    setDraggingCard(null);
    setDropTarget(null);
  };

  const reorderBottomCard = (sourceId: BottomCardId, targetId: BottomCardId) => {
    if (sourceId === targetId) return;
    updateLayout((prev) => {
      const nextOrder = [...prev.bottomOrder];
      const fromIdx = nextOrder.indexOf(sourceId);
      const toIdx = nextOrder.indexOf(targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      [nextOrder[fromIdx], nextOrder[toIdx]] = [nextOrder[toIdx], nextOrder[fromIdx]];
      return {
        ...prev,
        evidencePlacement: sourceId === 'evidence' ? 'bottom' : prev.evidencePlacement,
        bottomOrder: nextOrder,
      };
    });
  };

  const dataAsprak = useMemo(() => {
    return [...asprakByAngkatan]
      .sort((a, b) => parseInt(a.name, 10) - parseInt(b.name, 10))
      .map((item, idx) => ({
        ...item,
        label: `Angkatan ${item.name}`,
        fill: MONO_CHART_SHADES[idx % MONO_CHART_SHADES.length],
      }));
  }, [asprakByAngkatan]);

  const totalAsprak = useMemo(
    () => dataAsprak.reduce((sum, item) => sum + item.count, 0),
    [dataAsprak]
  );

  const dayOrder = useMemo(
    () => ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'],
    []
  );

  const dataJadwal = useMemo(() => {
    return [...jadwalByDay]
      .sort((a, b) => dayOrder.indexOf(a.name) - dayOrder.indexOf(b.name))
      .map((item, idx) => ({
        ...item,
        fill: MONO_CHART_SHADES[idx % MONO_CHART_SHADES.length],
      }));
  }, [jadwalByDay, dayOrder]);

  const totalJadwalWeek = useMemo(
    () => dataJadwal.reduce((sum, item) => sum + item.count, 0),
    [dataJadwal]
  );

  const storeNow = useMonitoringStore((state) => state.now);
  const labStatus = useMonitoringStore((state) => state.labStatus);
  const fallbackEvidenceRealtime = useIwanEvidenceRealtime({
    limit: 15,
    autoFetch: !evidenceRealtime,
    enabled: !evidenceRealtime,
  });
  const {
    logs: evidenceLogs,
    recentInsertIds,
    isLoading: isEvidenceLoading,
    loadError: evidenceLoadError,
    loadEvidenceLogs,
  } = evidenceRealtime ?? fallbackEvidenceRealtime;
  const evidenceListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (recentInsertIds.size > 0) {
      evidenceListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [recentInsertIds]);
  const todayDate = storeNow;

  const uniqueRooms = useMemo(() => ROOMS, []);

  const currentDayNameRaw = format(todayDate, 'EEEE', { locale: id }).toUpperCase();
  const currentDayName =
    currentDayNameRaw === 'SENIN' ||
    currentDayNameRaw === 'SELASA' ||
    currentDayNameRaw === 'RABU' ||
    currentDayNameRaw === 'KAMIS' ||
    currentDayNameRaw === 'JUMAT' ||
    currentDayNameRaw === 'SABTU' ||
    currentDayNameRaw === 'MINGGU'
      ? currentDayNameRaw
      : 'SENIN';

  const {
    processedJadwalList,
    scheduleMatrix: fullMatrix,
    dynamicSessionsByDay,
  } = useScheduleData({
    rawJadwalList: rawJadwal,
    jadwalPengganti: jadwalPengganti,
    selectedModul: `Modul ${activeModul}`,
    filterDay: currentDayName,
    programType,
  });

  const scheduleMatrix = useMemo(
    () => fullMatrix[currentDayName] || {},
    [fullMatrix, currentDayName]
  );
  const visibleSessions = useMemo(
    () => dynamicSessionsByDay[currentDayName] || [],
    [dynamicSessionsByDay, currentDayName]
  );

  // Peta jadwal per ruangan dari daftar penuh hari ini untuk validasi kelas aktif
  const roomSchedulesTodayMap = useMemo(() => {
    const map = new Map<string, Jadwal[]>();
    for (const j of processedJadwalList) {
      if (!j.ruangan) continue;
      const cleanRoom = j.ruangan.replace(/\s+/g, '').toUpperCase();
      if (!map.has(cleanRoom)) {
        map.set(cleanRoom, []);
      }
      map.get(cleanRoom)!.push(j);
    }
    return map;
  }, [processedJadwalList]);

  const { jagaList } = useJaga(term, activeModul, currentDayName);
  const shiftInfos = getJagaShiftsByDay(currentDayName);

  const todayPresensi = usePresensiJagaStore((state) => state.todayPresensi);
  const initPresensi = usePresensiJagaStore((state) => state.init);

  useEffect(() => {
    initPresensi();
  }, [initPresensi]);

  const currentHour = todayDate.getHours();
  const currentMin = todayDate.getMinutes();
  const timeValue = currentHour + currentMin / 60;

  let activeSessionNumber = -1;
  const daySessions = STATIC_SESSIONS[currentDayName] || STATIC_SESSIONS['SENIN'];
  for (const s of daySessions) {
    const [h, m] = s.jam.split(':').map(Number);
    const startValue = h + m / 60;
    const endValue = startValue + 3;
    if (timeValue >= startValue && timeValue < endValue) {
      activeSessionNumber = s.sesi;
      break;
    }
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const hasAnyFilteredMatch = useMemo(() => {
    if (!normalizedQuery) return processedJadwalList.length > 0;
    return visibleSessions.some((session) =>
      uniqueRooms.some((room) =>
        (scheduleMatrix[session.rowKey]?.[room] || []).some((j) =>
          matchesScheduleQuery(j, room, normalizedQuery)
        )
      )
    );
  }, [normalizedQuery, processedJadwalList.length, visibleSessions, uniqueRooms, scheduleMatrix]);

  const todayWeekdayName = todayDate.toLocaleDateString('id-ID', {
    weekday: 'long',
    timeZone: 'Asia/Jakarta',
  });

  const isEvidenceDocked = layout.evidencePlacement === 'left' || layout.evidencePlacement === 'right';
  const visibleBottomCards = layout.bottomOrder.filter(
    (cardId) => !(isEvidenceDocked && cardId === 'evidence')
  );

  const tableClass = isEvidenceDocked
    ? 'w-full lg:table-fixed border-collapse text-sm'
    : 'w-full border-collapse text-sm';
  const thPenjagaanClass = isEvidenceDocked
    ? 'p-2 border-r-0 text-center font-bold w-[96px] xl:w-[108px] text-xs uppercase text-muted-foreground bg-transparent leading-tight'
    : 'p-2 border-r-0 text-center font-bold min-w-[120px] text-xs uppercase text-muted-foreground bg-transparent leading-tight';
  const thSesiClass = isEvidenceDocked
    ? 'p-2 border-r border-l border-border text-center font-bold w-[64px] xl:w-[70px] whitespace-nowrap text-xs 2xl:text-sm uppercase text-muted-foreground'
    : 'p-2 border-r border-l border-border text-center font-bold min-w-[60px] text-xs 2xl:text-sm uppercase text-muted-foreground';
  const thRoomClass = isEvidenceDocked
    ? 'p-2 border-r border-border text-center font-bold min-w-0 truncate text-xs 2xl:text-sm'
    : 'p-2 border-r border-border text-center font-bold min-w-[120px] whitespace-nowrap text-xs 2xl:text-sm';

  const jadwalCardNode = (
      <Card
        ref={jadwalCardRef}
        aria-busy={loading || undefined}
        onDragOver={(e) => {
          if (draggingCard === 'evidence') {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const rect = e.currentTarget.getBoundingClientRect();
            const isLeftHalf = e.clientX - rect.left < rect.width / 2;
            setDropTarget(isLeftHalf ? 'jadwal-left' : 'jadwal-right');
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            if (dropTarget === 'jadwal-left' || dropTarget === 'jadwal-right') {
              setDropTarget(null);
            }
          }
        }}
        onDrop={(e) => {
          if (draggingCard === 'evidence') {
            e.preventDefault();
            const rect = e.currentTarget.getBoundingClientRect();
            const isLeftHalf = e.clientX - rect.left < rect.width / 2;
            updateLayout((prev) => ({
              ...prev,
              evidencePlacement: isLeftHalf ? 'left' : 'right',
            }));
            endCardDrag();
          }
        }}
        className={`relative h-full bg-transparent border shadow-none py-5 gap-4 transition-colors ${
          draggingCard === 'jadwal'
            ? 'opacity-60 border-foreground/40'
            : dropTarget === 'jadwal-left' || dropTarget === 'jadwal-right'
              ? 'border-foreground/50'
              : 'border-border'
        }`}
      >
        {draggingCard === 'evidence' && (
          <div className="pointer-events-none absolute inset-2 z-10 grid grid-cols-2 gap-2">
            <div
              className={`flex items-center justify-center rounded-lg border border-dashed text-xs font-medium transition-colors ${
                dropTarget === 'jadwal-left'
                  ? 'border-foreground bg-accent/60 text-foreground'
                  : 'border-border/80 bg-background/60 text-muted-foreground'
              }`}
            >
              Taruh di Kiri Jadwal
            </div>
            <div
              className={`flex items-center justify-center rounded-lg border border-dashed text-xs font-medium transition-colors ${
                dropTarget === 'jadwal-right'
                  ? 'border-foreground bg-accent/60 text-foreground'
                  : 'border-border/80 bg-background/60 text-muted-foreground'
              }`}
            >
              Taruh di Kanan Jadwal
            </div>
          </div>
        )}
        <CardHeader className="flex flex-col gap-4 px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-2 min-w-0">
            {isEditingLayout && (
              <button
                type="button"
                draggable
                onDragStart={(e) => startCardDrag(e, 'jadwal', jadwalCardRef.current)}
                onDragEnd={endCardDrag}
                title="Geser posisi kartu Jadwal"
                aria-label="Geser posisi kartu Jadwal"
                className="mt-0.5 inline-flex size-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <GripVertical className="size-4" aria-hidden="true" />
              </button>
            )}
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-base font-semibold">
                Jadwal Hari Ini ({todayWeekdayName})
              </CardTitle>
              <CardDescription className="text-xs">
                Modul {activeModul} · {term ? `Term ${term}` : 'Semua term'} ·{' '}
                {processedJadwalList.length} kelas ({programType === 'REGULER' ? 'Reguler' : 'PJJ'})
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center w-full lg:w-auto">
            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter kelas, matkul, ruangan..."
                aria-label="Filter jadwal hari ini"
                className="pl-9 pr-9 min-h-11 sm:min-h-9 bg-transparent border-border"
              />
              {searchQuery.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Hapus filter jadwal"
                  className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <ToggleGroup
              type="single"
              value={programType}
              onValueChange={(value) => {
                if (value) setProgramType(value as 'REGULER' | 'PJJ');
              }}
              variant="outline"
              className="*:data-[slot=toggle-group-item]:px-4! *:data-[slot=toggle-group-item]:min-h-11 sm:*:data-[slot=toggle-group-item]:min-h-9"
            >
              <ToggleGroupItem value="REGULER">Reguler</ToggleGroupItem>
              <ToggleGroupItem value="PJJ">PJJ</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>

        <CardContent className="px-5">
          {error ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Gagal memuat jadwal hari ini. Muat ulang halaman untuk mencoba lagi.
              </p>
            </div>
          ) : loading ? (
            <div className="overflow-x-auto rounded-lg border border-border bg-transparent">
              <span className="sr-only">Memuat matriks jadwal hari ini</span>
              <table className={tableClass}>
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className={thPenjagaanClass}>
                      <Skeleton className="h-6 w-16 mx-auto" />
                    </th>
                    <th className={thSesiClass}>
                      <Skeleton className="h-4 w-8 mx-auto" />
                    </th>
                    {uniqueRooms.map((room) => (
                      <th key={room} className={thRoomClass}>
                        <Skeleton className="h-4 w-12 mx-auto" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50 h-[60px] 2xl:h-[80px]">
                      <td className="p-2 border-r-0 bg-muted/5 align-middle">
                        <Skeleton className="h-6 w-16 mx-auto rounded-sm" />
                      </td>
                      <td className="p-2 border-r border-l border-border text-center align-middle">
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-10 mx-auto" />
                          <Skeleton className="h-3 w-8 mx-auto" />
                        </div>
                      </td>
                      {uniqueRooms.map((room) => (
                        <td key={room} className="p-1 border-r border-border align-top">
                          <Skeleton className="h-10 2xl:h-[72px] w-full" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : processedJadwalList.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Tidak ada jadwal praktikum {programType === 'REGULER' ? 'Reguler' : 'PJJ'} untuk
                hari ini.
              </p>
              <Button asChild variant="outline" size="sm" className="min-h-11 sm:min-h-8 bg-transparent">
                <Link prefetch={false} href="/jadwal">
                  Kelola Jadwal
                </Link>
              </Button>
            </div>
          ) : !hasAnyFilteredMatch ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Tidak ada kelas yang cocok dengan &quot;{searchQuery.trim()}&quot;.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="min-h-11 sm:min-h-8 bg-transparent"
              >
                Reset Filter
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-border bg-transparent">
                <table className={tableClass}>
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className={thPenjagaanClass}>
                        Penjagaan
                        <br />
                        <span className="text-blue-700 dark:text-blue-300">
                          (Modul {activeModul})
                        </span>
                      </th>
                      <th className={thSesiClass}>
                        Sesi
                      </th>
                      {uniqueRooms.map((room) => (
                        <th
                          key={room}
                          className={thRoomClass}
                        >
                          {room}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSessions.map((session) => {
                      const matchedShift =
                        shiftInfos.find((s) => s.shift === session.sesi) ||
                        shiftInfos[(session.sesi || 1) - 1];
                      const shiftJaga = jagaList.filter(
                        (j) => j.shift?.toString() === matchedShift?.shift?.toString()
                      );
                      const hasOverflow = shiftJaga.length > MAX_JAGA_CODES;
                      const visibleJaga = shiftJaga.slice(
                        0,
                        hasOverflow ? MAX_JAGA_CODES - 1 : MAX_JAGA_CODES
                      );
                      const overflowCount = shiftJaga.length - visibleJaga.length;
                      const jagaTiles: Array<(typeof visibleJaga)[number] | null> = hasOverflow
                        ? [...visibleJaga, null]
                        : visibleJaga;

                      return (
                        <tr
                          key={session.rowKey}
                          className="hover:bg-muted/20 transition-colors border-b border-border/50"
                        >
                          <td className="border-r-0 p-0 align-top h-[60px] 2xl:h-[80px]">
                            {shiftJaga.length > 0 ? (
                              <TooltipProvider>
                                <div className="flex h-full flex-col gap-px bg-border">
                                  {splitJagaRows(jagaTiles).map((row, rowIndex) => (
                                    <div key={rowIndex} className="flex flex-1 gap-px">
                                      {row.map((j, colIndex) => {
                                        if (j === null) {
                                          return (
                                            <div
                                              key={`more-${colIndex}`}
                                              className="flex min-w-0 flex-1 items-center justify-center bg-muted text-[10px] sm:text-xs 2xl:text-sm font-bold text-muted-foreground"
                                              title={`${overflowCount} kode lainnya`}
                                            >
                                              +{overflowCount}
                                            </div>
                                          );
                                        }

                                        const presensi = todayPresensi.find(
                                          (p) =>
                                            p.id_asprak === j.id_asprak &&
                                            p.shift === j.shift &&
                                            p.hari.toUpperCase() === currentDayName.toUpperCase() &&
                                            p.modul === activeModul
                                        );
                                        const isHadir = !!presensi;
                                        const isTerlambat = presensi?.status === 'TERLAMBAT';
                                        const tileColor = getCourseColor(
                                          j.asprak?.kode || j.asprak?.nama_lengkap || 'ASPRAK'
                                        );
                                        const hadirTime = presensi?.waktu_masuk
                                          ? format(new Date(presensi.waktu_masuk), 'HH:mm', {
                                              locale: id,
                                            })
                                          : null;

                                        return (
                                          <Tooltip key={j.id}>
                                            <TooltipTrigger asChild>
                                              <div
                                                className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden p-1 text-[10px] sm:text-xs 2xl:text-sm font-bold text-white cursor-default transition-all hover:brightness-110"
                                                style={{ backgroundColor: tileColor }}
                                                aria-label={
                                                  isHadir
                                                    ? `${j.asprak?.kode} sudah hadir`
                                                    : undefined
                                                }
                                              >
                                                {isHadir && (
                                                  <SynchronizedJagaSnakeBorder
                                                    isTerlambat={isTerlambat}
                                                  />
                                                )}
                                                <span className="relative z-10 truncate drop-shadow-sm">
                                                  {j.asprak?.kode || 'Unknown'}
                                                </span>
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent
                                              side="right"
                                              className="flex flex-col gap-1.5"
                                            >
                                              <div className="flex items-center gap-2 border-b pb-1.5 border-background/20">
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-sm uppercase font-bold bg-primary text-primary-foreground">
                                                  {j.asprak?.role}
                                                </span>
                                                <span className="font-bold text-xs">
                                                  {j.asprak?.kode}
                                                </span>
                                                {isHadir ? (
                                                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm uppercase font-bold bg-green-600 text-white">
                                                    HADIR {hadirTime}
                                                  </span>
                                                ) : null}
                                              </div>
                                              <div>
                                                <div className="font-semibold text-xs leading-none mb-1">
                                                  {j.asprak?.nama_lengkap}
                                                </div>
                                                <div className="text-[10px] opacity-70 leading-none">
                                                  {j.asprak?.nim}
                                                </div>
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        );
                                      })}
                                    </div>
                                  ))}
                                </div>
                              </TooltipProvider>
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <span className="text-xs text-muted-foreground italic opacity-70">
                                  -
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="p-2 border-r border-l border-border text-center font-medium text-muted-foreground text-xs 2xl:text-sm whitespace-nowrap">
                            {session.sesi ? (
                              <div className="font-bold">Sesi {session.sesi}</div>
                            ) : null}
                            <div className="text-xs opacity-90">{session.jam}</div>
                          </td>
                          {uniqueRooms.map((room) => {
                            const rawCellJadwals = scheduleMatrix[session.rowKey]?.[room] || [];
                            const jadwals = normalizedQuery
                              ? rawCellJadwals.filter((j) =>
                                  matchesScheduleQuery(j, room, normalizedQuery)
                                )
                              : rawCellJadwals;
                            const cleanRoomKey = room.replace(/\s+/g, '').toUpperCase();

                            const roomStatus = labStatus.find(
                              (l) => l.lab_id.replace(/\s+/g, '').toUpperCase() === cleanRoomKey
                            );
                            const isRoomOnline = roomStatus
                              ? isLabOnline(roomStatus, storeNow)
                              : false;

                            const rawSelectedKelas = roomStatus?.kelas?.trim();
                            const selectedKelas = rawSelectedKelas?.includes(' | ')
                              ? rawSelectedKelas.split(' | ').slice(1).join(' | ').trim()
                              : rawSelectedKelas;
                            const hasSelectedKelas = Boolean(
                              selectedKelas &&
                                selectedKelas !== '-' &&
                                selectedKelas.toLowerCase() !== 'tidak ada sesi'
                            );

                            const roomJadwals = roomSchedulesTodayMap.get(cleanRoomKey) || [];
                            const isSelectedKelasScheduledInRoom =
                              hasSelectedKelas &&
                              roomJadwals.some(
                                (j) => j.kelas?.trim().toUpperCase() === selectedKelas!.toUpperCase()
                              );

                            return (
                              <td
                                key={`${session.rowKey}-${room}`}
                                className={
                                  isEvidenceDocked
                                    ? 'p-0 border-r border-border h-[60px] relative align-top'
                                    : 'p-0 border-r border-border h-[60px] w-[120px] relative align-top'
                                }
                              >
                                <div className="flex flex-col w-full h-full min-h-[60px]">
                                  {jadwals.map((jadwal) => {
                                    let isClassActive = false;
                                    if (isRoomOnline) {
                                      if (isSelectedKelasScheduledInRoom) {
                                        const kelasMatch =
                                          jadwal.kelas?.trim().toUpperCase() ===
                                          selectedKelas!.toUpperCase();

                                        const selectedMatkul = rawSelectedKelas?.includes(' | ')
                                          ? rawSelectedKelas.split(' | ')[0].trim().toUpperCase()
                                          : null;
                                        const matkulMatch = selectedMatkul
                                          ? jadwal.mata_kuliah?.praktikum?.nama
                                              ?.trim()
                                              .toUpperCase() === selectedMatkul ||
                                            jadwal.mata_kuliah?.nama_lengkap
                                              ?.trim()
                                              .toUpperCase() === selectedMatkul
                                          : true;

                                        isClassActive = kelasMatch && matkulMatch;
                                      } else {
                                        isClassActive = session.sesi === activeSessionNumber;
                                      }
                                    }

                                    return (
                                      <ScheduleCell
                                        key={jadwal.id}
                                        jadwal={jadwal}
                                        showAsprakCount={true}
                                        isOnlineActive={isClassActive}
                                      />
                                    );
                                  })}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t border-border pt-3">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-4 h-4 bg-muted rounded-[2px]"
                    style={{
                      background: `linear-gradient(var(--muted), var(--muted)) padding-box, repeating-linear-gradient(45deg, #facc15, #facc15 5px, #ffffff 5px, #ffffff 10px) border-box`,
                      border: '3px solid transparent',
                    }}
                  />
                  <span>Jadwal Pengganti</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-sm bg-muted border border-border" />
                  <span>Jadwal Reguler</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-sm bg-muted ring-[3px] ring-green-500/90 ring-inset" />
                  <span>Kelas Sedang Berjalan (Realtime)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-green-100 text-green-800 border border-green-400 ring-2 ring-green-500/50">
                    JD
                  </div>
                  <span>Asisten Hadir Jaga (RFID)</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
  );

  const bottomDropProps = (targetId: BottomCardId) => ({
    onDragOver: (e: React.DragEvent) => {
      if (draggingCard && draggingCard !== 'jadwal' && draggingCard !== targetId) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropTarget(`bottom-${targetId}`);
      }
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null) && dropTarget === `bottom-${targetId}`) {
        setDropTarget(null);
      }
    },
    onDrop: (e: React.DragEvent) => {
      if (draggingCard && draggingCard !== 'jadwal' && draggingCard !== targetId) {
        e.preventDefault();
        reorderBottomCard(draggingCard, targetId);
        endCardDrag();
      }
    },
  });

  const asprakCardNode = (
        <Card
          key="asprak"
          ref={asprakCardRef}
          aria-busy={loading || undefined}
          {...bottomDropProps('asprak')}
          className={`flex flex-col bg-transparent border shadow-none py-5 gap-4 transition-colors ${
            draggingCard === 'asprak'
              ? 'opacity-60 border-foreground/40'
              : dropTarget === 'bottom-asprak'
                ? 'border-foreground/50 bg-accent/20'
                : 'border-border'
          }`}
        >
          <CardHeader className="flex flex-row items-start justify-between gap-2 px-5">
            <div className="flex items-start gap-2 min-w-0">
              {isEditingLayout && (
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => startCardDrag(e, 'asprak', asprakCardRef.current)}
                  onDragEnd={endCardDrag}
                  title="Geser posisi kartu Asprak per Angkatan"
                  aria-label="Geser posisi kartu Asprak per Angkatan"
                  className="mt-0.5 inline-flex size-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <GripVertical className="size-4" aria-hidden="true" />
                </button>
              )}
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-base font-semibold">Asprak per Angkatan</CardTitle>
                <CardDescription className="text-xs">
                  Komposisi asisten aktif berdasarkan angkatan
                </CardDescription>
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-8 shrink-0 bg-transparent border-border hover:bg-accent/50"
            >
              <Link prefetch={false} href="/asprak">
                Detail
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col justify-between gap-4 px-5">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-5 py-4">
                <Skeleton className="size-44 rounded-full" />
                <span className="sr-only">Memuat data asprak per angkatan</span>
                <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-10 w-full" />
                  ))}
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Gagal memuat komposisi asprak. Muat ulang halaman untuk mencoba lagi.
                </p>
              </div>
            ) : dataAsprak.length === 0 || totalAsprak === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Belum ada data asprak pada term ini.
                </p>
                <Button asChild variant="outline" size="sm" className="min-h-11 sm:min-h-8 bg-transparent">
                  <Link prefetch={false} href="/asprak">
                    Kelola Asprak
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="relative mx-auto flex w-full max-w-[240px] items-center justify-center">
                  <ChartContainer
                    config={chartConfigAsprak}
                    className="h-[200px] w-full aspect-auto"
                  >
                    <PieChart>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      <Pie
                        data={dataAsprak}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={56}
                        outerRadius={82}
                        paddingAngle={2}
                        stroke="var(--background)"
                        strokeWidth={2}
                        isAnimationActive={false}
                      >
                        {dataAsprak.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold tabular-nums text-foreground">
                      {totalAsprak}
                    </span>
                    <span className="text-xs text-muted-foreground">Asprak</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-border pt-3 sm:grid-cols-3">
                  {dataAsprak.map((item) => (
                    <div key={item.name} className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="size-2 rounded-full shrink-0 border border-border/50"
                          style={{ backgroundColor: item.fill }}
                          aria-hidden="true"
                        />
                        <span className="text-xs text-muted-foreground truncate">
                          Angkatan {item.name}
                        </span>
                      </div>
                      <p className="text-sm font-semibold tabular-nums text-foreground pl-3.5">
                        {item.count}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
  );

  const evidenceCardNode = (
        <Card
          key="evidence"
          ref={evidenceCardRef}
          aria-busy={isEvidenceLoading || undefined}
          onDragOver={(e) => {
            if (isEvidenceDocked && draggingCard === 'jadwal') {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDropTarget('swap-docked');
              return;
            }
            if (!isEvidenceDocked && draggingCard && draggingCard !== 'jadwal' && draggingCard !== 'evidence') {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDropTarget('bottom-evidence');
            }
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              if (dropTarget === 'swap-docked' || dropTarget === 'bottom-evidence') {
                setDropTarget(null);
              }
            }
          }}
          onDrop={(e) => {
            if (isEvidenceDocked && draggingCard === 'jadwal') {
              e.preventDefault();
              updateLayout((prev) => ({
                ...prev,
                evidencePlacement: prev.evidencePlacement === 'left' ? 'right' : 'left',
              }));
              endCardDrag();
              return;
            }
            if (!isEvidenceDocked && draggingCard && draggingCard !== 'jadwal' && draggingCard !== 'evidence') {
              e.preventDefault();
              reorderBottomCard(draggingCard, 'evidence');
              endCardDrag();
            }
          }}
          className={`flex flex-col bg-transparent border shadow-none py-5 gap-4 transition-colors ${
            isEvidenceDocked ? 'h-full' : ''
          } ${
            draggingCard === 'evidence'
              ? 'opacity-60 border-foreground/40'
              : dropTarget === 'swap-docked' || dropTarget === 'bottom-evidence'
                ? 'border-foreground/50 bg-accent/20'
                : 'border-border'
          }`}
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 px-5">
            <div className="flex items-start gap-2 min-w-0">
              {isEditingLayout && (
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => startCardDrag(e, 'evidence', evidenceCardRef.current)}
                  onDragEnd={endCardDrag}
                  title="Geser posisi Log Kecurangan"
                  aria-label="Geser posisi Log Kecurangan"
                  className="mt-0.5 inline-flex size-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <GripVertical className="size-4" aria-hidden="true" />
                </button>
              )}
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-base font-semibold">Log Kecurangan</CardTitle>
                <CardDescription className="text-xs">
                  Deteksi aktivitas terlarang secara realtime
                </CardDescription>
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-8 shrink-0 bg-transparent border-border hover:bg-accent/50"
            >
              <Link prefetch={false} href="/iwan/evidence">
                Lihat Semua
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col px-5 min-h-0">
            <div
              ref={evidenceListRef}
              className={`${
                isEvidenceDocked ? 'flex-1 max-h-[420px] lg:max-h-[520px]' : 'max-h-[300px]'
              } overflow-y-auto scrollbar-thin space-y-2 pr-1`}
            >
              {isEvidenceLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-14 w-full rounded-lg" />
                ))
              ) : evidenceLoadError ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-4 py-8 text-center">
                  <p className="text-xs text-muted-foreground">
                    Gagal memuat log kecurangan
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void loadEvidenceLogs().catch(() => {})}
                    className="min-h-9 bg-transparent border-border hover:bg-accent/50"
                  >
                    Coba Lagi
                  </Button>
                </div>
              ) : evidenceLogs.length === 0 ? (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-border px-4 py-10 text-center text-xs text-muted-foreground">
                  Belum ada log kecurangan terdeteksi
                </div>
              ) : (
                evidenceLogs.map((item) => (
                  <EvidenceListRow
                    key={item.id}
                    item={item}
                    isRecentInsert={recentInsertIds.has(item.id)}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>
  );

  const jadwalDistCardNode = (
        <Card
          key="jadwal-dist"
          ref={jadwalDistCardRef}
          aria-busy={loading || undefined}
          {...bottomDropProps('jadwal-dist')}
          className={`flex flex-col bg-transparent border shadow-none py-5 gap-4 transition-colors ${
            draggingCard === 'jadwal-dist'
              ? 'opacity-60 border-foreground/40'
              : dropTarget === 'bottom-jadwal-dist'
                ? 'border-foreground/50 bg-accent/20'
                : 'border-border'
          }`}
        >
          <CardHeader className="flex flex-row items-start justify-between gap-2 px-5">
            <div className="flex items-start gap-2 min-w-0">
              {isEditingLayout && (
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => startCardDrag(e, 'jadwal-dist', jadwalDistCardRef.current)}
                  onDragEnd={endCardDrag}
                  title="Geser posisi kartu Distribusi Jadwal"
                  aria-label="Geser posisi kartu Distribusi Jadwal"
                  className="mt-0.5 inline-flex size-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <GripVertical className="size-4" aria-hidden="true" />
                </button>
              )}
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-base font-semibold">Distribusi Jadwal</CardTitle>
                <CardDescription className="text-xs">
                  Proporsi kelas praktikum per hari dalam seminggu
                </CardDescription>
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-8 shrink-0 bg-transparent border-border hover:bg-accent/50"
            >
              <Link prefetch={false} href="/jadwal">
                Jadwal
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col justify-between gap-4 px-5">
            {loading ? (
              <div className="space-y-3 py-1">
                <Skeleton className="h-2.5 w-full rounded-full" />
                <span className="sr-only">Memuat distribusi jadwal per hari</span>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-8 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Gagal memuat distribusi jadwal. Muat ulang halaman untuk mencoba lagi.
                </p>
              </div>
            ) : dataJadwal.length === 0 || totalJadwalWeek === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Belum ada jadwal terjadwal pada term ini.
                </p>
                <Button asChild variant="outline" size="sm" className="min-h-11 sm:min-h-8 bg-transparent">
                  <Link prefetch={false} href="/jadwal">
                    Atur Jadwal
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  role="img"
                  aria-label={`Total ${totalJadwalWeek} kelas praktikum tersebar dalam seminggu`}
                  className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/40 gap-0.5"
                >
                  {dataJadwal.map((item) => {
                    if (item.count <= 0) return null;
                    const widthPct = (item.count / totalJadwalWeek) * 100;
                    return (
                      <div
                        key={item.name}
                        style={{ width: `${widthPct}%`, backgroundColor: item.fill }}
                        title={`${item.name}: ${item.count} kelas`}
                        className="h-full first:rounded-l-full last:rounded-r-full"
                      />
                    );
                  })}
                </div>

                <div className="space-y-3">
                  {dataJadwal.map((item) => {
                    const pct = Math.round((item.count / totalJadwalWeek) * 100);
                    return (
                      <div key={item.name} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="size-2.5 rounded-full shrink-0 border border-border/50"
                            style={{ backgroundColor: item.fill }}
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground leading-tight truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {item.count} kelas
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="h-1.5 w-20 sm:w-24 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: item.fill }}
                            />
                          </div>
                          <span className="w-9 text-right text-xs font-medium tabular-nums text-muted-foreground">
                            {pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
  );

  const bottomCardMap: Record<BottomCardId, React.ReactNode> = {
    asprak: asprakCardNode,
    evidence: evidenceCardNode,
    'jadwal-dist': jadwalDistCardNode,
  };

  return (
    <div className="space-y-6">
      {/* Row 2: Matriks Jadwal (Full-width or Proportional 2-Column with Log Kecurangan) */}
      {isEvidenceDocked ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-stretch">
          {layout.evidencePlacement === 'left' ? (
            <>
              <div className="lg:col-span-4 xl:col-span-3 min-w-0">{evidenceCardNode}</div>
              <div className="lg:col-span-8 xl:col-span-9 min-w-0">{jadwalCardNode}</div>
            </>
          ) : (
            <>
              <div className="lg:col-span-8 xl:col-span-9 min-w-0">{jadwalCardNode}</div>
              <div className="lg:col-span-4 xl:col-span-3 min-w-0">{evidenceCardNode}</div>
            </>
          )}
        </div>
      ) : (
        jadwalCardNode
      )}

      {/* Row 3: Analytics & Realtime Cards */}
      <div
        className={`grid grid-cols-1 gap-4 ${
          visibleBottomCards.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'
        }`}
      >
        {visibleBottomCards.map((id) => bottomCardMap[id])}
      </div>
    </div>
  );
}
