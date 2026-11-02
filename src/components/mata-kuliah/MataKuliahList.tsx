import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import MataKuliahCard from './MataKuliahCard';
import type { MataKuliahGrouped } from '@/services/mataKuliahService';

interface MataKuliahListProps {
  groupedData: MataKuliahGrouped[];
  loading: boolean;
}

export function MataKuliahCardSkeleton() {
  return (
    <Card className="gap-3 rounded-md bg-transparent py-4 shadow-none">
      <CardHeader className="gap-2 px-4">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="px-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MataKuliahList({ groupedData, loading }: MataKuliahListProps) {
  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {[1, 2].map((groupIndex) => (
          <div key={groupIndex} className="space-y-4">
            <div className="flex items-center justify-between gap-2 border-b pb-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[2000px]:grid-cols-6 gap-4 2xl:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <MataKuliahCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (groupedData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-center">
        <h3 className="text-base font-medium text-muted-foreground">
          Belum ada data mata kuliah untuk term ini.
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">Silakan import CSV atau tambah manual.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groupedData.map((group) => (
        <div key={group.mk_singkat} className="space-y-4">
          <div className="flex items-center justify-between gap-2 border-b pb-2">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {group.mk_singkat}
            </h2>
            <Badge variant="outline" className="shrink-0 px-1.5 text-muted-foreground">
              {group.items.length} varian
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[2000px]:grid-cols-6 gap-4 2xl:gap-6">
            {group.items.map((mk) => (
              <MataKuliahCard key={mk.id} mk={mk} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
