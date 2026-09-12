'use client';

/* eslint-disable react-doctor/no-chain-state-updates, react-doctor/no-cascading-set-state, react-doctor/no-effect-chain, react-doctor/rendering-hydration-no-flicker */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ArrowRight, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardFooter } from '@/components/ui/card';


import type { Praktikum } from '@/types/database';
import { usePelanggaran } from '@/hooks/usePelanggaran';
import { PelanggaranCardSkeleton } from '@/components/pelanggaran/PelanggaranCardSkeleton';

interface Props {
  initialPraktikumList: Praktikum[];
  initialTahunAjaranList: string[];
  initialCountMap: Record<string, { total: number; allFinal: boolean; finalized: boolean }>;
  isKoor: boolean;
  userId?: string;
}

export default function PelanggaranClientPage({
  initialPraktikumList,
  initialTahunAjaranList,
  initialCountMap,
  isKoor,
  userId,
}: Props) {
  const router = useRouter();
  const initialData = React.useMemo(() => ({
    praktikumList: initialPraktikumList,
    tahunAjaranList: initialTahunAjaranList,
    countMap: initialCountMap,
  }), [initialPraktikumList, initialTahunAjaranList, initialCountMap]);

  const {
    praktikumList,
    tahunAjaranList,
    selectedTahun: filterTahun,
    countMap,
    loading,
  } = usePelanggaran(initialTahunAjaranList[0], isKoor, userId, initialData);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Hook data is now pre-initialized with initial props
  const displayedPraktikum = praktikumList;
  const displayedTahunList = tahunAjaranList;
  const displayedCountMap = countMap;

  const currentTahun = (mounted ? filterTahun : null) || initialTahunAjaranList[0] || '';

  const filteredPraktikum = React.useMemo(
    () =>
      currentTahun
        ? displayedPraktikum.filter((p) => p.tahun_ajaran === currentTahun)
        : displayedPraktikum,
    // eslint-disable-next-line react-doctor/exhaustive-deps
    [displayedPraktikum, currentTahun]
  );

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">Pelanggaran</h1>
          <p className="text-sm 2xl:text-base text-muted-foreground mt-1">
            Log pelanggaran asisten praktikum per praktikum
          </p>
        </div>

        {/* Filter Tahun */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <span className="text-sm font-medium text-muted-foreground hidden sm:block">
            {currentTahun ? `Tahun Ajaran Aktif: ${currentTahun}` : 'Memuat Tahun Ajaran...'}
          </span>
          {loading && (
            <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin ml-2" />
          )}
        </div>
      </div>

      {loading && filteredPraktikum.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[2000px]:grid-cols-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <PelanggaranCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredPraktikum.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-16">Tidak ada data praktikum.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[2000px]:grid-cols-5">
          {filteredPraktikum.map((p) => {
            const info = (displayedCountMap as any)[p.id] ?? {
              total: 0,
              allFinal: false,
              finalized: false,
            };
            return (
              <Card
                key={p.id}
                className="@container/card bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer group flex flex-col"
                onClick={() => router.push(`/pelanggaran/${p.id}`)}
              >
                <CardHeader>
                  <CardDescription>Praktikum</CardDescription>
                  <CardTitle className="text-xl font-bold line-clamp-2 leading-tight transition-colors" title={p.nama}>
                    {p.nama}
                  </CardTitle>
                  <CardAction className="flex flex-col gap-2 items-end">
                    <Badge variant="outline" className="text-foreground/80">
                      Term {p.tahun_ajaran}
                    </Badge>
                    {info.finalized && (
                      <Badge className="gap-1 bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary-foreground/90 dark:border-primary/30 shadow-sm">
                        <CheckCircle2 className="h-3 w-3" />
                        Terfinalisasi
                      </Badge>
                    )}
                  </CardAction>
                </CardHeader>

                <CardFooter className="mt-auto flex items-center justify-between pt-4 border-t border-border/50">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Total Pelanggaran</span>
                    <span className="text-sm font-semibold text-foreground">{info.total} Log</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-muted-foreground group-hover:text-foreground transition-colors"
                  >
                    Lihat
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
