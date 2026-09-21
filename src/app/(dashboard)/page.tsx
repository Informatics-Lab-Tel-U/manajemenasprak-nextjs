import { getStats } from '@/services/databaseService';
import {
  getJadwalByTerm,
  getJadwalPengganti,
  getCachedAvailableTerms as fetchAvailableTerms,
} from '@/services/jadwalService';
import { getModulScheduleByTerm } from '@/services/modulScheduleService';
import DashboardClient from '@/components/DashboardClient';
import { requireAuth } from '@/lib/auth';
import { getMonitoringLabs } from '@/services/monitoringService';
import { determineActiveModul } from '@/utils/jagaUtils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const user = await requireAuth();

  let initialTerms: string[] = [];
  let latestTerm = '';
  let activeModul = 1;
  let initialStats: any = null;
  let initialJadwal: any[] = [];
  let initialPengganti: any[] = [];
  let initialMonitoringData: any[] = [];

  try {
    initialTerms = (await fetchAvailableTerms()) || [];
    latestTerm = initialTerms[0] ?? '';

    const [modulsRes, statsRes, jadwalRes, monitoringRes] = await Promise.all([
      getModulScheduleByTerm(latestTerm),
      getStats(latestTerm),
      getJadwalByTerm(latestTerm),
      getMonitoringLabs(),
    ]);

    const initialModuls = modulsRes || [];
    activeModul = determineActiveModul(initialModuls);

    const penggantiRes = await getJadwalPengganti(activeModul);

    initialStats = statsRes;
    initialJadwal = jadwalRes || [];
    initialPengganti = penggantiRes || [];
    initialMonitoringData = monitoringRes || [];
  } catch (error) {
    console.error('[Home Dashboard] SSR data fetching error:', error);
  }

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8">
      <DashboardClient
        initialStats={initialStats}
        initialJadwal={initialJadwal}
        initialPengganti={initialPengganti}
        initialTerms={initialTerms}
        activeModul={activeModul}
        userRole={user.pengguna.role}
        initialMonitoringData={initialMonitoringData}
      />
    </div>
  );
}
