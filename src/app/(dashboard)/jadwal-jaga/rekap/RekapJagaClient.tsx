'use client';

import React from 'react';
import { useRekapJaga } from '@/hooks/useJaga';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield } from 'lucide-react';
import { useTermStore } from '@/store/useTermStore';
import { Card, CardContent } from '@/components/ui/card';

export default function RekapJagaClient({ initialTerms }: { initialTerms: string[] }) {
  const { activeTerm } = useTermStore();
  const selectedTerm = activeTerm || '';
  const { rekapAslab, rekapAsprak, loading } = useRekapJaga(selectedTerm);

  const renderTable = (data: any[], emptyMsg: string) => {
    if (loading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-8 2xl:h-10 w-full" />
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 2xl:h-14 w-full" />
          ))}
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
          <Shield className="w-12 h-12 mb-4 opacity-20" />
          <p>{emptyMsg}</p>
        </div>
      );
    }

    const weeks = Array.from({ length: 16 }, (_, i) => i + 1);

    return (
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm 2xl:text-base text-left">
          <thead className="bg-muted/50 border-b border-border text-[13px] 2xl:text-sm uppercase text-muted-foreground/80">
            <tr>
              <th className="px-4 py-4 font-bold text-center border-r border-border sticky left-0 bg-muted/50 w-[90px]">
                KODE
              </th>
              {weeks.map((w) => (
                <th
                  key={w}
                  className="px-2 py-4 font-bold text-center border-r border-border min-w-[40px]"
                >
                  W{w}
                </th>
              ))}
              <th className="px-3 py-4 font-bold text-center bg-primary/5 text-primary">TOTAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 bg-card">
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-bold text-center border-r border-border sticky left-0 bg-card shadow-[1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[1px_0_0_rgba(255,255,255,0.05)]">
                  <span
                    className={`px-2.5 py-1.5 rounded-md inline-block w-full text-xs 2xl:text-sm font-bold ${row.role === 'ASLAB' ? 'bg-blue-100/50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                  >
                    {row.kode}
                  </span>
                </td>
                {weeks.map((w) => {
                  const count = row.w[w] || 0;
                  return (
                    <td
                      key={w}
                      className={`px-2 py-2 text-center border-r border-border ${count > 0 ? 'font-semibold text-foreground bg-primary/5' : 'text-muted-foreground/30'}`}
                    >
                      {count > 0 ? count : '-'}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center font-bold text-primary bg-primary/5">
                  {row.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">Rekapitulasi Penjagaan</h1>
          <p className="text-sm 2xl:text-base text-muted-foreground mt-1">
            Pantau total shift jaga tiap asisten per modul
          </p>
        </div>


      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent>
          {renderTable(
            [...rekapAslab, ...rekapAsprak].sort((a, b) => {
              if (a.role === 'ASLAB' && b.role !== 'ASLAB') return -1;
              if (a.role !== 'ASLAB' && b.role === 'ASLAB') return 1;
              return a.kode.localeCompare(b.kode);
            }),
            'Belum ada rekap jaga pada term ini.'
          )}
        </CardContent>
      </Card>
    </div>
  );
}
