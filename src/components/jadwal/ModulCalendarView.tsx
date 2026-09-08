'use client';

import React, { useMemo } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { COURSE_COLORS } from '@/utils/colorUtils';

interface ModulCalendarViewProps {
  rows: ModulScheduleEntryDto[];
}

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export function ModulCalendarView({ rows }: ModulCalendarViewProps) {
  // A module runs for 7 days starting from tanggal_mulai
  const moduleRanges = useMemo(() => {
    return rows.reduce((acc: { modul: number; start: Date; end: Date }[], r) => {
      if (r.tanggal_mulai) {
        const start = parseISO(r.tanggal_mulai);
        acc.push({
          modul: r.modul,
          start,
          end: addDays(start, 6), // 7 days inclusive
        });
      }
      return acc;
    }, []).sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [rows]);

  const monthsToRender = useMemo(() => {
    if (moduleRanges.length === 0) return [];

    const minDate = moduleRanges[0].start;
    const maxDate = moduleRanges[moduleRanges.length - 1].end;

    let current = startOfMonth(minDate);
    const end = startOfMonth(maxDate);
    const months = [];

    while (current <= end) {
      months.push(current);
      current = addMonths(current, 1);
    }

    return months;
  }, [moduleRanges]);

  const getModuleForDay = (date: Date) => {
    for (const range of moduleRanges) {
      if (date >= range.start && date <= range.end) {
        return range.modul;
      }
    }
    return null;
  };

  if (monthsToRender.length === 0) {
    return (
      <Card className="flex flex-col shadow-sm lg:h-[600px] max-h-[80vh]">
        <CardHeader className="pb-4 shrink-0">
          <CardTitle className="text-lg">Pratinjau Kalender</CardTitle>
          <CardDescription>Visualisasi timeline modul praktikum</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center p-8 border-t border-border/50 text-center text-muted-foreground">
          <CalendarIcon className="h-10 w-10 stroke-1 mb-3 opacity-30" />
          <p className="text-sm font-medium">Belum ada modul yang dijadwalkan</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
            Tentukan tanggal mulai modul di panel kiri untuk melihat visualisasi kalender.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col shadow-sm lg:h-[600px] max-h-[80vh] overflow-hidden">
      <CardHeader className="pb-4 shrink-0">
        <CardTitle className="text-lg">Pratinjau Kalender</CardTitle>
        <CardDescription>Visualisasi timeline modul praktikum</CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden flex flex-col border-t border-border/50">
        <ScrollArea className="flex-1 h-full">
          <div className="p-5 sm:p-6 space-y-8">
            {monthsToRender.map((month) => {
              const start = startOfWeek(month, { weekStartsOn: 1 });
              const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
              const days = eachDayOfInterval({ start, end });

              return (
                <div key={month.toISOString()} className="space-y-3">
                  <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                    <h3 className="font-semibold text-sm sm:text-base capitalize">
                      {format(month, 'MMMM yyyy', { locale: id })}
                    </h3>
                  </div>

                  <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                    {DAY_NAMES.map((day) => (
                      <div
                        key={day}
                        className="text-center font-medium text-[11px] sm:text-xs text-muted-foreground pb-1 uppercase tracking-wider"
                      >
                        {day}
                      </div>
                    ))}

                    {days.map((day) => {
                      const isCurrentMonth = isSameMonth(day, month);

                      if (!isCurrentMonth) {
                        return <div key={day.toISOString()} className="aspect-square p-1" />;
                      }

                      const modulNum = getModuleForDay(day);
                      const hexColor = modulNum
                        ? COURSE_COLORS[(modulNum - 1) % COURSE_COLORS.length]
                        : undefined;

                      return (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            'aspect-square p-1 flex flex-col items-center justify-center rounded-md relative text-xs sm:text-sm transition-all',
                            modulNum
                              ? 'text-white shadow-xs font-semibold hover:scale-105 hover:z-10 hover:shadow-md cursor-default'
                              : 'bg-transparent text-foreground hover:bg-muted/50'
                          )}
                          style={modulNum ? { backgroundColor: hexColor } : {}}
                          title={modulNum ? `Modul ${modulNum}` : undefined}
                        >
                          <span className="leading-none">{format(day, 'd')}</span>
                          {modulNum !== null && (
                            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-tight mt-0.5 opacity-90 leading-none">
                              M{modulNum}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
