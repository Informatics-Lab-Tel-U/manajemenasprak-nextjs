'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import PraktikumCard from './PraktikumCard';
import type { PraktikumWithStats } from '@/services/praktikumService';

interface PraktikumListProps {
  praktikums: PraktikumWithStats[];
  loading: boolean;
  onSelect: (praktikum: PraktikumWithStats) => void;
}

export function PraktikumCardSkeleton() {
  return (
    <Card className="gap-3 rounded-md bg-transparent py-4 shadow-none">
      <CardHeader className="gap-2 px-4">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="px-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PraktikumList({ praktikums, loading, onSelect }: PraktikumListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[2000px]:grid-cols-6 gap-4 2xl:gap-6 animate-pulse">
        {Array.from({ length: 12 }).map((_, i) => (
          <PraktikumCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (praktikums.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-md border border-dashed">
        <p className="font-medium text-muted-foreground">
          Tidak ada data praktikum untuk term ini.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Silakan import data praktikum terlebih dahulu.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[2000px]:grid-cols-6 gap-4 2xl:gap-6 animate-in fade-in duration-500">
      {praktikums.map((p) => (
        <PraktikumCard key={p.id} praktikum={p} onClick={onSelect} />
      ))}
    </div>
  );
}
