'use client';

import React, { useState } from 'react';
import { FileSpreadsheet, Loader2, RotateCw, Shield } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useRekapJaga } from '@/hooks/useJaga';
import { exportPresensiJagaExcel } from '@/lib/spreadsheet';
import { useTermStore } from '@/store/useTermStore';

function RekapTableSkeleton() {
  const weeks = Array.from({ length: 16 }, (_, i) => i + 1);
  return (
    <div
      aria-busy="true"
      className="overflow-x-auto rounded-lg border border-border bg-transparent"
    >
      <span className="sr-only">Memuat rekap penjagaan</span>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted/30 border-b border-border">
            <th className="p-2 border-r border-border text-center sticky left-0 bg-background z-20 min-w-[75px]">
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
              <td className="p-2 border-r border-border sticky left-0 bg-background z-10 text-center">
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

export default function RekapJagaClient({
  initialTerms: _initialTerms,
}: {
  initialTerms: string[];
}) {
  const { activeTerm } = useTermStore();
  const selectedTerm = activeTerm || '';
  const { rekapAslab, rekapAsprak, loading, refresh } = useRekapJaga(selectedTerm);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ASLAB' | 'ASPRAK'>('ALL');
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPresensi = async () => {
    if (!selectedTerm) {
      toast.error('Pilih tahun ajaran terlebih dahulu');
      return;
    }
    setIsExporting(true);
    try {
      await exportPresensiJagaExcel({ term: selectedTerm });
      toast.success('Presensi jaga berhasil diekspor');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengekspor presensi jaga');
    } finally {
      setIsExporting(false);
    }
  };

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Rekap Penjagaan
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pantau total shift jaga tiap asisten per modul
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <ToggleGroup
            type="single"
            value={roleFilter}
            onValueChange={(val) => {
              if (val) setRoleFilter(val as 'ALL' | 'ASLAB' | 'ASPRAK');
            }}
            variant="outline"
            className="*:data-[slot=toggle-group-item]:px-4! *:data-[slot=toggle-group-item]:min-h-11 sm:*:data-[slot=toggle-group-item]:min-h-9"
            aria-label="Filter role asisten"
          >
            <ToggleGroupItem value="ALL">Semua</ToggleGroupItem>
            <ToggleGroupItem value="ASLAB">ASLAB</ToggleGroupItem>
            <ToggleGroupItem value="ASPRAK">ASPRAK</ToggleGroupItem>
          </ToggleGroup>

          <Button
            type="button"
            variant="outline"
            onClick={handleExportPresensi}
            disabled={isExporting}
            className="min-h-11 sm:min-h-9 bg-transparent border-border hover:bg-accent/50"
            title="Ekspor data presensi jaga ke Excel multi-sheet"
          >
            {isExporting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileSpreadsheet className="size-4 text-muted-foreground" aria-hidden="true" />
            )}
            <span className="font-medium">Ekspor Presensi</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => refresh()}
            disabled={loading}
            title="Muat ulang rekap"
            aria-label="Muat ulang rekap penjagaan"
            className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 bg-transparent border-border hover:bg-accent/50"
          >
            <RotateCw
              className={`size-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
          </Button>
        </div>
      </div>

      <div className="w-full">
        {loading ? (
          <RekapTableSkeleton />
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground bg-transparent rounded-lg border border-dashed border-border">
            <Shield className="size-10 mb-3 opacity-25" aria-hidden="true" />
            <p className="text-sm font-medium">Belum ada rekap jaga pada term ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-transparent">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="p-2 border-r border-border text-center font-medium text-xs text-muted-foreground sticky left-0 bg-background z-20 min-w-[75px]">
                    Kode
                  </th>
                  {weeks.map((w) => (
                    <th
                      key={w}
                      className="p-2 border-r border-border text-center font-medium text-xs text-muted-foreground min-w-[42px] tabular-nums"
                    >
                      W{w}
                    </th>
                  ))}
                  <th className="p-2 text-center font-medium text-xs text-muted-foreground min-w-[60px] bg-muted/20">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-muted/20 transition-colors border-b border-border/50"
                  >
                    <td className="p-2 border-r border-border sticky left-0 bg-background z-10 text-center align-middle">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium inline-block border bg-transparent ${
                          row.role === 'ASLAB'
                            ? 'border-blue-500/40 text-blue-700 dark:text-blue-400'
                            : 'border-border text-muted-foreground'
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
                          className={`p-2 text-center border-r border-border text-xs tabular-nums ${
                            count > 0
                              ? 'font-semibold text-foreground bg-muted/20'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {count > 0 ? count : '-'}
                        </td>
                      );
                    })}
                    <td className="p-2 text-center font-semibold text-xs bg-muted/10 text-foreground tabular-nums">
                      {row.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground border-t border-border p-3 bg-transparent">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full bg-blue-600 dark:bg-blue-400"
                    aria-hidden="true"
                  />
                  <span className="tabular-nums">ASLAB ({rekapAslab.length})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-muted-foreground" aria-hidden="true" />
                  <span className="tabular-nums">ASPRAK ({rekapAsprak.length})</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground font-medium tabular-nums">
                Menampilkan {filteredData.length} dari {allData.length} asisten
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
