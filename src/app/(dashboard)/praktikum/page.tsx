import { Suspense } from 'react';
import { requireAuth } from '@/lib/auth';
import { getAvailableTerms } from '@/services/termService';
import { getPraktikumByTerm } from '@/services/praktikumService';
import PraktikumClientPage from './PraktikumClientPage';
import PraktikumLoading from './loading';

export const dynamic = 'force-dynamic';

export default async function PraktikumPage() {
  await requireAuth();

  let terms: string[] = [];
  let initialPraktikumList: any[] = [];

  try {
    const termsRes = await getAvailableTerms();
    terms = termsRes || [];

    const prakRes = await getPraktikumByTerm(terms[0] || '');
    initialPraktikumList = prakRes || [];

  } catch (error) {
    console.error('[PraktikumPage] SSR fetch error:', error);
  }

  return (
    <Suspense fallback={<PraktikumLoading />}>
      <PraktikumClientPage initialPraktikumList={initialPraktikumList} initialTerms={terms} />
    </Suspense>
  );
}
