'use client';

import dynamic from 'next/dynamic';
import type { Role } from '@/config/rbac';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  initialTahunAjaranList: string[];
  userRole: Role;
}

function RekapLoading() {
  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 space-y-8">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-64 2xl:h-10" />
        <Skeleton className="h-4 w-96 opacity-50 2xl:h-5" />
      </div>

      {/* Filter Skeleton, mengikuti Accordion filter */}
      <div className="rounded-xl border bg-card/30 px-4 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="overflow-hidden rounded-md border">
          <div className="h-10 bg-muted" />
          <div className="space-y-3 p-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full opacity-60" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const PelanggaranRekapClient = dynamic(() => import('./PelanggaranRekapClient'), {
  ssr: false,
  loading: () => <RekapLoading />,
});

export function PelanggaranRekapWrapper(props: Props) {
  return <PelanggaranRekapClient {...props} />;
}
