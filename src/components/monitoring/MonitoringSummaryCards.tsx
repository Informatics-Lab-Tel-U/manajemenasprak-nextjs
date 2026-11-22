'use client';

import { useEffect, useMemo } from 'react';
import { Activity, AlertTriangle, Computer, Users } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { isLabOnline } from '@/lib/labStatus';
import { useMonitoringStore, LabStatus } from '@/store/useMonitoringStore';

interface MonitoringSummaryCardsProps {
  /** Data awal dari SSR — menghilangkan flash "0" di render pertama */
  initialData?: LabStatus[];
}

export function MonitoringSummaryCards({ initialData = [] }: MonitoringSummaryCardsProps) {
  const monitoringData = useMonitoringStore((s) => s.labStatus);
  const heartbeatData = useMonitoringStore((s) => s.heartbeatData);
  const now = useMonitoringStore((s) => s.now);
  const init = useMonitoringStore((s) => s.init);
  const setInitialLabStatus = useMonitoringStore((s) => s.setInitialLabStatus);

  useEffect(() => {
    if (initialData.length > 0) {
      setInitialLabStatus(initialData);
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { activeLabs, offlineLabs } = useMemo(() => {
    const active = monitoringData.filter((d) => isLabOnline(d, now));
    const offline = monitoringData.filter((d) => !isLabOnline(d, now));
    return { activeLabs: active, offlineLabs: offline };
  }, [monitoringData, now]);

  const { avgLatency, highestSpike, spikeLab } = useMemo(() => {
    let totalLatency = 0;
    let count = 0;
    let maxSpike = 0;
    let maxSpikeLab = '-';

    const activeSet = new Set(activeLabs.map((l) => l.lab_id));

    Object.entries(heartbeatData).forEach(([labId, points]) => {
      if (!activeSet.has(labId) || points.length === 0) return;

      const lastPoint = points[points.length - 1];
      if (lastPoint.response_time_ms !== null) {
        totalLatency += lastPoint.response_time_ms;
        count++;
      }

      points.forEach((p) => {
        if (p.response_time_ms !== null && p.response_time_ms > maxSpike) {
          maxSpike = p.response_time_ms;
          maxSpikeLab = labId;
        }
      });
    });

    return {
      avgLatency: count > 0 ? Math.round(totalLatency / count) : 0,
      highestSpike: maxSpike,
      spikeLab: maxSpikeLab,
    };
  }, [heartbeatData, activeLabs]);

  const metrics = useMemo(() => {
    const uniqueClasses = new Set(
      activeLabs.map((l) => l.kelas).filter((k) => k && k !== '-')
    );
    const hasOffline = offlineLabs.length > 0;

    let anomalyText =
      monitoringData.length === 0 ? 'Belum ada data lab' : 'Semua koneksi stabil';
    let anomalyWarn = false;

    if (hasOffline) {
      anomalyText = `${offlineLabs.length} Lab Disconnect`;
      anomalyWarn = true;
    } else if (highestSpike > 1000) {
      anomalyText = `Spike ${highestSpike}ms (${spikeLab})`;
      anomalyWarn = true;
    }

    return {
      activeCount: activeLabs.length,
      totalCount: monitoringData.length,
      classCount: uniqueClasses.size,
      avgLatency,
      anomalyText,
      anomalyWarn,
    };
  }, [activeLabs, offlineLabs, avgLatency, highestSpike, spikeLab, monitoringData.length]);

  const activePercent =
    metrics.totalCount > 0
      ? `${Math.round((metrics.activeCount / metrics.totalCount) * 100)}%`
      : '-';

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Total Lab Aktif"
        value={`${metrics.activeCount} / ${metrics.totalCount}`}
        headlineIcon={Computer}
        description={
          metrics.totalCount === 0
            ? 'Menunggu sinyal PC Lab'
            : `${metrics.activeCount} PC Lab merespons`
        }
        badge={{
          label: activePercent,
          icon: Computer,
        }}
      />

      <StatCard
        title="Sesi Praktikum"
        value={metrics.classCount}
        headlineIcon={Users}
        description="Berdasarkan sesi aktif di PC"
        badge={{
          label: metrics.classCount > 0 ? 'Aktif' : 'Kosong',
          icon: Users,
        }}
      />

      <StatCard
        title="Rata-rata Ping"
        value={metrics.activeCount > 0 ? `${metrics.avgLatency} ms` : '- ms'}
        headlineIcon={Activity}
        description={
          metrics.activeCount === 0
            ? 'Menunggu koneksi lab'
            : metrics.avgLatency < 500
              ? 'Koneksi jaringan stabil'
              : 'Koneksi jaringan melambat'
        }
        badge={{
          label:
            metrics.activeCount === 0
              ? 'Offline'
              : metrics.avgLatency < 500
                ? 'Good'
                : 'Slow',
          icon: Activity,
          tone: metrics.activeCount > 0 && metrics.avgLatency >= 500 ? 'warning' : 'default',
        }}
      />

      <StatCard
        title="Status Anomali"
        value={metrics.anomalyWarn ? 'Perhatian' : 'Aman'}
        headlineIcon={AlertTriangle}
        description={metrics.anomalyText}
        badge={{
          label: metrics.anomalyWarn ? 'Alert' : 'OK',
          icon: AlertTriangle,
          tone: metrics.anomalyWarn ? 'warning' : 'default',
        }}
      />
    </div>
  );
}
