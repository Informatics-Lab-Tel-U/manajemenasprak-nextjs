'use client';

import { Users, BookOpen, AlertTriangle, Calendar } from 'lucide-react';
import dynamic from 'next/dynamic';

const DashboardCharts = dynamic(() => import('@/components/DashboardCharts'), { ssr: false });
import { StatCard } from '@/components/ui/StatCard';
import RealtimeMonitoringWidget from '@/components/RealtimeMonitoringWidget';


import type { DashboardStats } from '@/services/databaseService';
import { Jadwal, JadwalPengganti } from '@/types/database';
import { useDashboard } from '@/hooks/useDashboard';
import { useScheduleData } from '@/hooks/useScheduleData';
import React from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface DashboardClientProps {
  initialStats?: DashboardStats | null;
  initialJadwal?: Jadwal[] | null;
  initialPengganti?: JadwalPengganti[] | null;
  initialTerms?: string[];
  activeModul?: number;
  userRole?: string;
  initialMonitoringData?: any[];
}

const emptyDashboardStats: DashboardStats = {
  asprakCount: 0,
  jadwalCount: 0,
  pelanggaranCount: 0,
  asprakByAngkatan: [],
  jadwalByDay: [],
};

export default function DashboardClient({
  initialStats = emptyDashboardStats,
  initialJadwal = [],
  initialPengganti = [],
  initialTerms = [],
  activeModul = 1,
  userRole,
  initialMonitoringData = [],
}: DashboardClientProps) {
  const { selectedTerm, stats, rawJadwal, jadwalPengganti, loading, error } = useDashboard(
    initialTerms,
    initialStats ?? emptyDashboardStats,
    initialJadwal ?? [],
    initialPengganti ?? [],
    activeModul
  );

  const todayDate = new Date();
  const todayLabel = format(todayDate, 'EEEE', { locale: id });
  const termLabel = selectedTerm ? `term ${selectedTerm}` : 'term ini';
  const currentDayNameRaw = todayLabel.toUpperCase();
  const validDays = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
  const currentDayName = validDays.includes(currentDayNameRaw) ? currentDayNameRaw : 'SENIN';

  // Build "today's effective schedule" using the same hook as JadwalClientPage
  // Filter to today's day, apply pengganti overlay, then count unique visible classes
  const { processedJadwalList } = useScheduleData({
    rawJadwalList: rawJadwal,
    jadwalPengganti: jadwalPengganti,
    selectedModul: `Modul ${activeModul}`,
    filterDay: currentDayName,
  });

  return (
    <>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card">
        <StatCard
          title="Total Asprak"
          value={stats.asprakCount}
          headline="Asprak terdaftar"
          headlineIcon={Users}
          description={`Memiliki penugasan pada ${termLabel}`}
          loading={loading}
          error={!!error}
        />
        <StatCard
          title="Total Jadwal"
          value={stats.jadwalCount}
          headline="Kelas terjadwal"
          headlineIcon={BookOpen}
          description={`Seluruh hari pada ${termLabel}`}
          loading={loading}
          error={!!error}
        />
        <StatCard
          title="Pelanggaran"
          value={stats.pelanggaranCount}
          headline="Pelanggaran tercatat"
          headlineIcon={AlertTriangle}
          description={`Semua modul, ${termLabel}`}
          badge={
            stats.pelanggaranCount > 0
              ? { label: 'Perlu ditinjau', icon: AlertTriangle, tone: 'warning' }
              : undefined
          }
          loading={loading}
          error={!!error}
        />
        <StatCard
          title="Jadwal Hari Ini"
          value={processedJadwalList.length}
          headline="Kelas hari ini"
          headlineIcon={Calendar}
          description={
            processedJadwalList.length === 0
              ? 'Tidak ada kelas terjadwal hari ini'
              : `Modul ${activeModul}, termasuk jadwal pengganti`
          }
          badge={{ label: todayLabel, icon: Calendar }}
          loading={loading}
          error={!!error}
        />
      </div>

      <RealtimeMonitoringWidget initialData={initialMonitoringData} />

      <div className="mb-12">
        <DashboardCharts
          asprakByAngkatan={stats.asprakByAngkatan}
          jadwalByDay={stats.jadwalByDay}
          rawJadwal={rawJadwal}
          jadwalPengganti={jadwalPengganti}
          loading={loading}
          term={selectedTerm}
          activeModul={activeModul}
          userRole={userRole}
        />
      </div>
    </>
  );
}
