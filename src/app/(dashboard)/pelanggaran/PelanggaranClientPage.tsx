'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronRight, Filter } from 'lucide-react';

import { PelanggaranCardSkeleton } from '@/components/pelanggaran/PelanggaranCardSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePelanggaran } from '@/hooks/usePelanggaran';
import type { Praktikum } from '@/types/database';

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
  const initialData = React.useMemo(
    () => ({
      praktikumList: initialPraktikumList,
      tahunAjaranList: initialTahunAjaranList,
      countMap: initialCountMap,
    }),
    [initialPraktikumList, initialTahunAjaranList, initialCountMap]
  );

  const {
    praktikumList,
    selectedTahun: filterTahun,
    countMap,
    loading,
  } = usePelanggaran(initialTahunAjaranList[0], isKoor, userId, initialData);

  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const displayedPraktikum = praktikumList;
  const displayedCountMap = countMap;

  const currentTahun = (mounted ? filterTahun : null) || initialTahunAjaranList[0] || '';

  const filteredPraktikum = React.useMemo(
    () =>
      currentTahun
        ? displayedPraktikum.filter((p) => p.tahun_ajaran === currentTahun)
        : displayedPraktikum,
    [displayedPraktikum, currentTahun]
  );

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Log Pelanggaran
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Log pelanggaran asisten praktikum per praktikum
          </p>
        </div>

        {/* Filter Tahun */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Filter className="size-4 text-muted-foreground hidden sm:block" aria-hidden="true" />
          <span className="text-sm font-medium text-muted-foreground hidden sm:block tabular-nums">
            {currentTahun ? `Tahun Ajaran Aktif: ${currentTahun}` : 'Memuat Tahun Ajaran...'}
          </span>
          {loading && (
            <div
              role="status"
              aria-label="Memuat data pelanggaran"
              className="size-4 rounded-full border-2 border-foreground border-t-transparent animate-spin ml-1"
            />
          )}
        </div>
      </div>

      {loading && filteredPraktikum.length === 0 ? (
        <div
          aria-busy="true"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[2000px]:grid-cols-5"
        >
          <span className="sr-only">Memuat daftar log pelanggaran</span>
          {Array.from({ length: 12 }).map((_, i) => (
            <PelanggaranCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredPraktikum.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-transparent py-16 text-center">
          <p className="text-muted-foreground text-sm">Tidak ada data praktikum.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[2000px]:grid-cols-5">
          {filteredPraktikum.map((p) => {
            const info = (displayedCountMap as any)[p.id] ?? {
              total: 0,
              allFinal: false,
              finalized: false,
            };
            const hasLogs = info.total > 0;

            return (
              <Link
                key={p.id}
                href={`/pelanggaran/${p.id}`}
                prefetch={false}
                className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Card className="h-full justify-between bg-transparent border border-border shadow-none py-5 gap-3 transition-colors group-hover:border-foreground/25 group-focus-visible:border-foreground/40">
                  <CardHeader className="flex flex-row items-start justify-between gap-3 px-5">
                    <CardTitle
                      className="text-sm font-medium text-foreground line-clamp-2 leading-snug"
                      title={p.nama}
                    >
                      {p.nama}
                    </CardTitle>

                    {info.finalized ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 shrink-0">
                        <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        Final
                      </span>
                    ) : (
                      <ChevronRight
                        className="size-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                    )}
                  </CardHeader>

                  <CardContent className="px-5 space-y-1.5">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={`text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums ${
                          hasLogs ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {info.total}
                      </span>
                      <span className="text-xs text-muted-foreground">log</span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {info.finalized
                        ? 'Semua catatan sudah difinalisasi'
                        : hasLogs
                          ? 'Menunggu tinjauan dan finalisasi'
                          : 'Belum ada pelanggaran tercatat'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
