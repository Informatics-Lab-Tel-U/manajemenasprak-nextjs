'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Users, BookOpen, AlertTriangle, Activity, Calendar } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ROOMS } from '@/constants';
import { isLabOnline } from '@/lib/labStatus';
import { useDashboard } from '@/hooks/useDashboard';
import { useScheduleData } from '@/hooks/useScheduleData';
import { LabStatus, useMonitoringStore } from '@/store/useMonitoringStore';
import type { DashboardStats } from '@/services/databaseService';
import type { Jadwal, JadwalPengganti } from '@/types/database';

const DashboardCharts = dynamic(() => import('@/components/DashboardCharts'), { ssr: false });

interface DashboardClientProps {
  initialStats?: DashboardStats | null;
  initialJadwal?: Jadwal[] | null;
  initialPengganti?: JadwalPengganti[] | null;
  initialTerms?: string[];
  activeModul?: number;
  userRole?: string;
  initialMonitoringData?: LabStatus[];
}

const emptyDashboardStats: DashboardStats = {
  asprakCount: 0,
  jadwalCount: 0,
  pelanggaranCount: 0,
  asprakByAngkatan: [],
  jadwalByDay: [],
};

const RING_RADIUS = 22;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function DashboardClient({
  initialStats = emptyDashboardStats,
  initialJadwal = [],
  initialPengganti = [],
  initialTerms = [],
  activeModul = 1,
  userRole,
  initialMonitoringData,
}: DashboardClientProps) {
  const { selectedTerm, stats, rawJadwal, jadwalPengganti, loading, error } = useDashboard(
    initialTerms,
    initialStats ?? emptyDashboardStats,
    initialJadwal ?? [],
    initialPengganti ?? [],
    activeModul
  );

  const labStatus = useMonitoringStore((state) => state.labStatus);
  const now = useMonitoringStore((state) => state.now);
  const initMonitoring = useMonitoringStore((state) => state.init);
  const setInitialLabStatus = useMonitoringStore((state) => state.setInitialLabStatus);
  const didInitMonitoringRef = useRef(false);

  useEffect(() => {
    if (didInitMonitoringRef.current) return;
    didInitMonitoringRef.current = true;
    if (initialMonitoringData && initialMonitoringData.length > 0) {
      setInitialLabStatus(initialMonitoringData);
    }
    initMonitoring();
  }, [initialMonitoringData, setInitialLabStatus, initMonitoring]);

  const todayDate = now;
  const todayLabel = format(todayDate, 'EEEE', { locale: id });
  const formattedDate = format(todayDate, 'd MMMM yyyy', { locale: id });
  const termLabel = selectedTerm ? `term ${selectedTerm}` : 'term ini';
  const currentDayNameRaw = todayLabel.toUpperCase();
  const validDays = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
  const currentDayName = validDays.includes(currentDayNameRaw) ? currentDayNameRaw : 'SENIN';

  const { processedJadwalList } = useScheduleData({
    rawJadwalList: rawJadwal,
    jadwalPengganti: jadwalPengganti,
    selectedModul: `Modul ${activeModul}`,
    filterDay: currentDayName,
  });

  const onlineCount = ROOMS.filter((room) => {
    const data = labStatus.find(
      (d) => d.lab_id.replace(/\s+/g, '') === room.replace(/\s+/g, '')
    );
    return data ? isLabOnline(data, now) : false;
  }).length;

  const onlinePercent = ROOMS.length > 0 ? Math.round((onlineCount / ROOMS.length) * 100) : 0;
  const ringOffset = RING_CIRCUMFERENCE * (1 - onlinePercent / 100);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Beranda
          </h2>
          <p className="text-sm text-muted-foreground" suppressHydrationWarning>
            Modul {activeModul} · {todayLabel}, {formattedDate}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            asChild
            variant="outline"
            className="min-h-11 sm:min-h-9 bg-transparent border-border hover:bg-accent/50"
          >
            <Link prefetch={false} href="/monitoring">
              <Activity className="size-4" aria-hidden="true" />
              Pantau Ruangan
            </Link>
          </Button>
          <Button asChild className="min-h-11 sm:min-h-9">
            <Link prefetch={false} href="/jadwal">
              <Calendar className="size-4" aria-hidden="true" />
              Buka Jadwal
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/monitoring"
          prefetch={false}
          className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Card className="h-full justify-between bg-transparent border border-border shadow-none py-5 gap-3 transition-colors group-hover:border-foreground/25 group-focus-visible:border-foreground/40">
            <CardHeader className="flex flex-row items-center justify-between gap-2 px-5">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ruangan Aktif
              </CardTitle>
              <CardDescription className="text-xs font-medium tabular-nums text-muted-foreground">
                {onlineCount}/{ROOMS.length} lab
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5 flex items-center gap-4">
              <div className="relative size-14 shrink-0 flex items-center justify-center">
                <svg
                  className="size-14 -rotate-90"
                  viewBox="0 0 56 56"
                  role="img"
                  aria-label={`${onlinePercent}% ruangan lab sedang online`}
                >
                  <circle
                    cx="28"
                    cy="28"
                    r={RING_RADIUS}
                    fill="none"
                    className="stroke-border"
                    strokeWidth="4.5"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r={RING_RADIUS}
                    fill="none"
                    className="stroke-foreground transition-[stroke-dashoffset] duration-300"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <span className="absolute text-xs font-semibold tabular-nums text-foreground">
                  {onlinePercent}%
                </span>
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-foreground leading-snug">
                  {onlineCount === 0 ? 'Belum ada lab online' : `${onlineCount} lab sedang online`}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Dari total {ROOMS.length} ruang praktikum terpantau.
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <StatCard
          title="Total Asprak"
          value={stats.asprakCount}
          headlineIcon={Users}
          description={`Terdaftar pada ${termLabel}`}
          href="/asprak"
          loading={loading}
          error={!!error}
        />

        <StatCard
          title="Total Jadwal"
          value={stats.jadwalCount}
          headlineIcon={BookOpen}
          description={`${processedJadwalList.length} kelas berlangsung hari ini`}
          href="/jadwal"
          loading={loading}
          error={!!error}
        />

        <StatCard
          title="Pelanggaran"
          value={stats.pelanggaranCount}
          headlineIcon={AlertTriangle}
          description={`Tercatat pada ${termLabel}`}
          badge={
            stats.pelanggaranCount > 0
              ? { label: 'Perlu ditinjau', icon: AlertTriangle, tone: 'warning' }
              : undefined
          }
          href="/pelanggaran"
          loading={loading}
          error={!!error}
        />
      </div>

      <DashboardCharts
        asprakByAngkatan={stats.asprakByAngkatan}
        jadwalByDay={stats.jadwalByDay}
        rawJadwal={rawJadwal}
        jadwalPengganti={jadwalPengganti}
        loading={loading}
        error={!!error}
        term={selectedTerm}
        activeModul={activeModul}
        userRole={userRole}
      />
    </div>
  );
}
