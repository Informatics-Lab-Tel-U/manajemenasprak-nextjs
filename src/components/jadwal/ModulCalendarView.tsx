'use client';

import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  addMonths,
  addDays,
  parseISO,
} from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { ModulScheduleEntryDto } from '@/lib/fetchers/modulScheduleFetcher';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

interface ModulCalendarViewProps {
  rows: ModulScheduleEntryDto[];
  activeModul?: number | null;
  onSelectModul?: (modul: number) => void;
  expanded?: boolean;
}

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export function ModulCalendarView({
  rows,
  activeModul = null,
  onSelectModul,
  expanded = false,
}: ModulCalendarViewProps) {
  const { moduleRanges, dayToModulMap } = useMemo(() => {
    const ranges: { modul: number; start: Date; end: Date }[] = [];
    const map = new Map<string, number>();

    for (const r of rows) {
      if (!r.tanggal_mulai) continue;
      const start = parseISO(r.tanggal_mulai);
      if (Number.isNaN(start.getTime())) continue;

      const end = addDays(start, 6);
      ranges.push({ modul: r.modul, start, end });

      for (let offset = 0; offset < 7; offset += 1) {
        map.set(format(addDays(start, offset), 'yyyy-MM-dd'), r.modul);
      }
    }

    ranges.sort((a, b) => a.start.getTime() - b.start.getTime());
    return { moduleRanges: ranges, dayToModulMap: map };
  }, [rows]);

  const monthsToRender = useMemo(() => {
    if (moduleRanges.length === 0) return [];

    const minDate = moduleRanges[0].start;
    const maxDate = moduleRanges[moduleRanges.length - 1].end;

    let current = startOfMonth(minDate);
    const end = startOfMonth(maxDate);
    const months: Date[] = [];

    while (current <= end) {
      months.push(current);
      current = addMonths(current, 1);
    }

    return months;
  }, [moduleRanges]);

  const dateRangeLabel = useMemo(() => {
    if (moduleRanges.length === 0) return 'Visualisasi timeline modul praktikum';
    const first = moduleRanges[0].start;
    const last = moduleRanges[moduleRanges.length - 1].end;
    return `${format(first, 'dd MMM yyyy', { locale: id })} - ${format(last, 'dd MMM yyyy', { locale: id })}`;
  }, [moduleRanges]);

  if (monthsToRender.length === 0) {
    return (
      <Card className="bg-transparent border-border shadow-none">
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4 border-b border-border">
          <div>
            <CardTitle className="text-base font-semibold">Pratinjau Kalender</CardTitle>
            <CardDescription>{dateRangeLabel}</CardDescription>
          </div>
          <Badge variant="outline" className="tabular-nums font-medium shrink-0">
            0/16 Modul
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <CalendarIcon className="h-9 w-9 stroke-1 text-muted-foreground/50 mb-3" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">Belum ada modul yang dijadwalkan</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Pilih tanggal mulai pada Daftar Modul di sebelah kiri, lalu gunakan Kalibrasi Tanggal
            untuk mengisi modul berikutnya secara otomatis.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-transparent border-border shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4 border-b border-border">
        <div>
          <CardTitle className="text-base font-semibold">Pratinjau Kalender</CardTitle>
          <CardDescription className="tabular-nums">{dateRangeLabel}</CardDescription>
        </div>
        <Badge variant="outline" className="tabular-nums font-medium shrink-0">
          {moduleRanges.length}/16 Modul
        </Badge>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">
        <div
          className={cn(
            'grid grid-cols-1 gap-6',
            expanded ? 'md:grid-cols-2 xl:grid-cols-3' : 'xl:grid-cols-2'
          )}
        >
          {monthsToRender.map((month) => {
            const start = startOfWeek(month, { weekStartsOn: 1 });
            const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
            const days = eachDayOfInterval({ start, end });

            return (
              <div key={month.toISOString()} className="space-y-3">
                <h3 className="font-semibold text-sm capitalize text-foreground pb-2 border-b border-border/60 tabular-nums">
                  {format(month, 'MMMM yyyy', { locale: id })}
                </h3>

                <div className="grid grid-cols-7 gap-1">
                  {DAY_NAMES.map((day) => (
                    <div
                      key={day}
                      className="text-center font-medium text-xs text-muted-foreground pb-1"
                    >
                      {day}
                    </div>
                  ))}

                  {days.map((day) => {
                    if (!isSameMonth(day, month)) {
                      return <div key={day.toISOString()} className="h-10" />;
                    }

                    const dateKey = format(day, 'yyyy-MM-dd');
                    const modulNum = dayToModulMap.get(dateKey) ?? null;

                    if (modulNum === null) {
                      return (
                        <div
                          key={day.toISOString()}
                          className="h-10 rounded-md flex items-center justify-center text-xs text-muted-foreground tabular-nums"
                        >
                          {format(day, 'd')}
                        </div>
                      );
                    }

                    const isFocused = activeModul === modulNum;
                    const isDimmed = activeModul !== null && activeModul !== modulNum;
                    const isOddWeek = modulNum % 2 === 1;

                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => onSelectModul?.(modulNum)}
                        className={cn(
                          'h-10 rounded-md border flex flex-col items-center justify-center text-xs font-semibold tabular-nums transition-colors cursor-pointer',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                          isFocused
                            ? 'bg-primary text-primary-foreground border-primary'
                            : isOddWeek
                              ? 'bg-muted border-border text-foreground hover:bg-accent'
                              : 'bg-background border-foreground/25 text-foreground hover:bg-accent',
                          isDimmed && 'opacity-45'
                        )}
                        title={`Modul ${modulNum} - ${format(day, 'd MMM yyyy', { locale: id })}`}
                        aria-label={`Modul ${modulNum}, ${format(day, 'd MMMM yyyy', { locale: id })}`}
                      >
                        <span className="leading-none">{format(day, 'd')}</span>
                        <span
                          className={cn(
                            'text-[10px] font-medium leading-none mt-0.5 tabular-nums',
                            isFocused ? 'text-primary-foreground/85' : 'text-muted-foreground'
                          )}
                        >
                          M{modulNum}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
