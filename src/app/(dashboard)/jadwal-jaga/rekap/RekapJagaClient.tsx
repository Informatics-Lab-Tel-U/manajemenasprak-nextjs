'use client';

import React, { useState } from 'react';
import { useRekapJaga } from '@/hooks/useJaga';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, RotateCw } from 'lucide-react';
import { useTermStore } from '@/store/useTermStore';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

function RekapTableSkeleton() {
  const weeks = Array.from({ length: 16 }, (_, i) => i + 1);
  return (
    <div className="overflow-x-auto rounded-lg border border-border shadow-sm bg-card/50 backdrop-blur-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="p-2 border-r border-border text-center sticky left-0 bg-muted/95 z-20 min-w-[75px]">
              <Skeleton className="h-4 w-10 mx-auto" />
            </th>
            {weeks.map((w) => (
              <th key={w} className="p-2 border-r border-border text-center min-w-[42px]">
                <Skeleton className="h-3 w-6 mx-auto" />
              </th>
            ))}
            <th className="p-2 text-center min-w-[60px] bg-muted/20">
              <Skeleton className="h-4 w-10 mx-auto" />
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 10 }).map((_, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="p-2 border-r border-border sticky left-0 bg-card/95 z-10 text-center">
                <Skeleton className="h-5 w-10 mx-auto rounded" />
              </td>
              {weeks.map((w) => (
                <td key={w} className="p-2 border-r border-border text-center">
                  <Skeleton className="h-3 w-4 mx-auto opacity-30" />
                </td>
              ))}
              <td className="p-2 text-center bg-muted/5">
                <Skeleton className="h-4 w-6 mx-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RekapJagaClient({ initialTerms: _initialTerms }: { initialTerms: string[] }) {
  const { activeTerm } = useTermStore();
  const selectedTerm = activeTerm || '';
  const { rekapAslab, rekapAsprak, loading, refresh } = useRekapJaga(selectedTerm);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ASLAB' | 'ASPRAK'>('ALL');

  const weeks = Array.from({ length: 16 }, (_, i) => i + 1);

  const allData = [...rekapAslab, ...rekapAsprak].sort((a, b) => {
    if (a.role === 'ASLAB' && b.role !== 'ASLAB') return -1;
    if (a.role !== 'ASLAB' && b.role === 'ASLAB') return 1;
    return a.kode.localeCompare(b.kode);
  });

  const filteredData = allData.filter((item) => {
    if (roleFilter === 'ASLAB') return item.role === 'ASLAB';
    if (roleFilter === 'ASPRAK') return item.role !== 'ASLAB';
    return true;
  });

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">Rekapitulasi Penjagaan</h1>
          <p className="text-sm 2xl:text-base text-muted-foreground mt-1">
            Pantau total shift jaga tiap asisten per modul
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Role filter ToggleGroup — sama dengan pola ToggleGroup di jadwal */}
          <ToggleGroup
            type="single"
            value={roleFilter}
            onValueChange={(val) => {
              if (val) setRoleFilter(val as 'ALL' | 'ASLAB' | 'ASPRAK');
            }}
            variant="outline"
            className="*:data-[slot=toggle-group-item]:px-4! shadow-sm bg-card/50 backdrop-blur-sm"
            aria-label="Filter role asisten"
          >
            <ToggleGroupItem value="ALL">Semua</ToggleGroupItem>
            <ToggleGroupItem value="ASLAB">ASLAB</ToggleGroupItem>
            <ToggleGroupItem value="ASPRAK">ASPRAK</ToggleGroupItem>
          </ToggleGroup>

          <Button
            variant="outline"
            size="icon"
            onClick={() => refresh()}
            disabled={loading}
            title="Muat ulang rekap"
            className="rounded-lg shadow-sm border-border/80 bg-background/80 hover:bg-accent"
          >
            <RotateCw size={16} className={`text-muted-foreground hover:text-foreground ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="w-full">
        {loading ? (
          <RekapTableSkeleton />
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground bg-card/50 rounded-lg border border-border shadow-sm">
            <Shield className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">Belum ada rekap jaga pada term ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border shadow-sm bg-card/50 backdrop-blur-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="p-2 border-r border-border text-center font-bold text-xs uppercase text-muted-foreground sticky left-0 bg-muted/95 backdrop-blur-sm z-20 min-w-[75px]">
                    KODE
                  </th>
                  {weeks.map((w) => (
                    <th
                      key={w}
                      className="p-2 border-r border-border text-center font-bold text-xs uppercase text-muted-foreground min-w-[42px]"
                    >
                      W{w}
                    </th>
                  ))}
                  <th className="p-2 text-center font-bold text-xs uppercase text-muted-foreground min-w-[60px] bg-muted/20">
                    TOTAL
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors border-b border-border/50">
                    <td className="p-2 border-r border-border sticky left-0 bg-card/95 backdrop-blur-sm z-10 text-center align-middle shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[1px_0_0_rgba(255,255,255,0.05)]">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold inline-block ${
                          row.role === 'ASLAB'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}
                      >
                        {row.kode}
                      </span>
                    </td>
                    {weeks.map((w) => {
                      const count = row.w[w] || 0;
                      return (
                        <td
                          key={w}
                          className={`p-2 text-center border-r border-border text-xs ${
                            count > 0
                              ? 'font-semibold text-foreground bg-muted/20'
                              : 'text-muted-foreground/30'
                          }`}
                        >
                          {count > 0 ? count : '-'}
                        </td>
                      );
                    })}
                    <td className="p-2 text-center font-bold text-xs bg-muted/10 text-foreground">
                      {row.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legend & Summary Footer */}
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground border-t border-border/50 p-3 bg-muted/10">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>ASLAB ({rekapAslab.length})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/60"></span>
                  <span>ASPRAK ({rekapAsprak.length})</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                Menampilkan {filteredData.length} dari {allData.length} asisten
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
