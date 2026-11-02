'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

function PraktikanLoading() {
  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 relative space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Skeleton className="h-9 w-full sm:max-w-sm" />
          <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row">
            <Skeleton className="h-9 w-full sm:w-[200px]" />
            <Skeleton className="h-9 w-full sm:w-[200px]" />
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

const PraktikanClientPage = dynamic(() => import('@/components/praktikan/PraktikanClientPage'), {
  ssr: false,
  loading: () => <PraktikanLoading />,
});

export function PraktikanClientWrapper() {
  return <PraktikanClientPage />;
}
