import { getCachedAvailableTerms as fetchAvailableTerms } from '@/services/jadwalService';
import DashboardClient from '@/components/DashboardClient';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const user = await requireAuth();

  let initialTerms: string[] = [];

  try {
    initialTerms = (await fetchAvailableTerms()) || [];
  } catch (error) {
    console.error('[Home Dashboard] SSR term preloading failed:', error);
  }

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8">
      <DashboardClient
        initialTerms={initialTerms}
        activeModul={1}
        userRole={user.pengguna.role}
      />
    </div>
  );
}
