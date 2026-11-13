import { getCachedAvailableTerms as fetchAvailableTerms } from '@/services/jadwalService';
import { getModulScheduleByTerm } from '@/services/modulScheduleService';
import { determineActiveModul } from '@/utils/jagaUtils';
import DashboardClient from '@/components/DashboardClient';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const user = await requireAuth();

  let initialTerms: string[] = [];
  let activeModul = 1;

  try {
    initialTerms = (await fetchAvailableTerms()) || [];
    const latestTerm = initialTerms[0] ?? '';
    if (latestTerm) {
      const modulSchedule = (await getModulScheduleByTerm(latestTerm)) || [];
      activeModul = determineActiveModul(modulSchedule);
    }
  } catch (error) {
    console.error('[Home Dashboard] SSR term / modul preloading failed:', error);
  }

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8">
      <DashboardClient
        initialTerms={initialTerms}
        activeModul={activeModul}
        userRole={user.pengguna.role}
      />
    </div>
  );
}
