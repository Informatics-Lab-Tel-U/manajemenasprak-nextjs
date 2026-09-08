/* eslint-disable react-doctor/exhaustive-deps */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTermStore } from '@/store/useTermStore';
import {
  fetchModulSchedule,
  saveModulSchedule,
  type ModulScheduleEntryDto,
} from '@/lib/fetchers/modulScheduleFetcher';
import { toast } from 'sonner';
import { format, addDays, getDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { ModulCalendarView } from '@/components/jadwal/ModulCalendarView';
import { COURSE_COLORS } from '@/utils/colorUtils';

const addDaysSafe = (dateStr: string, days: number): string => {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const newDate = addDays(date, days);
    return format(newDate, 'yyyy-MM-dd');
  } catch {
    return dateStr;
  }
};

const getDayName = (dateStr: string | null): string => {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return format(date, 'EEEE', { locale: id });
  } catch {
    return '';
  }
};

const isMonday = (dateStr: string | null): boolean => {
  if (!dateStr) return true;
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return getDay(date) === 1; // 1 is Monday
  } catch {
    return false;
  }
};

const parseDate = (dateStr: string | null): Date | undefined => {
  if (!dateStr) return undefined;
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d);
  } catch {
    return undefined;
  }
};

export default function JadwalModulClientPage() {
  const { activeTerm } = useTermStore();
  const term = activeTerm || '';
  const [rows, setRows] = useState<ModulScheduleEntryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [startModul, setStartModul] = useState<string>('1');



  const loadRows = useCallback(async (t: string) => {
    if (!t) return;
    setLoading(true);
    setInitialLoading(true);
    try {
      const res = await fetchModulSchedule(t);
      if (res.ok && res.data) {
        setRows(res.data);
      } else {
        setRows(
          Array.from({ length: 16 }, (_, idx) => ({
            modul: idx + 1,
            tanggal_mulai: null,
          }))
        );
        if (res.error) toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat tanggal modul');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    if (term) {
      loadRows(term);
    }
  }, [term, loadRows]);

  const handleChangeDate = (modul: number, tanggal: string) => {
    setRows((prev) =>
      prev.map((row) => (row.modul === modul ? { ...row, tanggal_mulai: tanggal || null } : row))
    );
  };



  const isSequentiallyValid = (
    modul: number,
    dateStr: string | null
  ): { valid: boolean; error?: string } => {
    if (!dateStr) return { valid: true };

    // Find previous module with a date
    const prevRowsWithDate = rows.filter((r) => r.modul < modul && r.tanggal_mulai);
    if (prevRowsWithDate.length > 0) {
      const lastPrev = prevRowsWithDate[prevRowsWithDate.length - 1];
      if (lastPrev.tanggal_mulai && dateStr < lastPrev.tanggal_mulai) {
        return { valid: false, error: `Sebelum M${lastPrev.modul}` };
      }
    }

    if (!isMonday(dateStr)) {
      return { valid: false, error: 'Bukan Senin' };
    }

    return { valid: true };
  };

  const hasInvalidDates = rows.some((row) => {
    const { valid } = isSequentiallyValid(row.modul, row.tanggal_mulai);
    return !valid;
  });

  const handleGenerate = () => {
    const startM = parseInt(startModul, 10);
    const byModul = new Map<number, string | null>(rows.map((r) => [r.modul, r.tanggal_mulai]));
    const anchor = byModul.get(startM);

    if (!anchor) {
      toast.error(`Isi tanggal pada Modul ${startM} terlebih dahulu sebagai acuan.`);
      return;
    }

    const { valid, error } = isSequentiallyValid(startM, anchor);
    if (!valid) {
      toast.error(`Tanggal Modul ${startM} tidak valid: ${error}.`);
      return;
    }

    let lastDate: string = anchor;
    for (let m = startM + 1; m <= 16; m += 1) {
      lastDate = addDaysSafe(lastDate, 7);
      byModul.set(m, lastDate);
    }

    setRows(
      rows.map((row) => ({
        modul: row.modul,
        tanggal_mulai: byModul.get(row.modul) ?? row.tanggal_mulai,
      }))
    );
    setIsGenerateDialogOpen(false);
    toast.success(`Berhasil generate tanggal dari Modul ${startM}`);
  };

  const handleSave = async () => {
    if (!term) {
      toast.error('Pilih tahun ajaran terlebih dahulu');
      return;
    }
    if (hasInvalidDates) {
      toast.error('Gagal menyimpan: Ada urutan tanggal yang tidak valid atau bukan hari Senin');
      return;
    }

    setLoading(true);
    try {
      const res = await saveModulSchedule(term, rows);
      if (res.ok) {
        toast.success('Tanggal mulai modul berhasil disimpan');
      } else {
        toast.error(res.error || 'Gagal menyimpan tanggal modul');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan tanggal modul');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 relative space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
          <div>
            <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">Jadwal Tanggal Modul</h1>
            <p className="text-sm 2xl:text-base text-muted-foreground mt-1">Atur tanggal mulai praktikum untuk setiap modul (1-16).</p>
          </div>
        </div>
      </div>

      {initialLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] xl:grid-cols-[460px_1fr] gap-6 items-start">
          {/* Left Panel Skeleton */}
          <Card className="flex flex-col shadow-sm lg:h-[600px] max-h-[80vh]">
            <CardHeader className="pb-4 shrink-0">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
              <div className="divide-y divide-border/50 flex-1 overflow-y-auto border-t border-border/50">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="flex flex-row items-center justify-between px-4 sm:px-5 py-3 sm:py-2 gap-2 sm:gap-4">
                    <Skeleton className="h-5 w-20 shrink-0" />
                    <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0">
                      <Skeleton className="h-8 w-[140px] rounded-md" />
                      <Skeleton className="h-6 w-12 rounded-sm" />
                      <Skeleton className="h-4 w-4 rounded-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-4 flex items-center justify-between gap-3 border-t border-border/50 bg-muted/10 shrink-0">
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="h-9 w-32 rounded-md" />
            </CardFooter>
          </Card>

          {/* Right Panel Skeleton */}
          <div className="rounded-lg border border-border bg-card/50 shadow-sm p-6 space-y-10 min-h-[500px]">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-7 w-40" />
                  <div className="flex-1 h-px bg-border/50"></div>
                </div>
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 w-full mb-2" />
                  ))}
                  {Array.from({ length: 30 }).map((_, j) => (
                    <Skeleton key={j} className="aspect-square w-full rounded-md" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] xl:grid-cols-[460px_1fr] gap-6 items-start">
          {/* Left Panel: Controls */}
          <Card className="flex flex-col shadow-sm lg:sticky lg:top-[88px] lg:h-[600px] max-h-[80vh]">
            <CardHeader className="pb-4 shrink-0">
              <CardTitle className="text-lg">Daftar Modul</CardTitle>
              <CardDescription>Pilih hari Senin untuk awal setiap modul</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
              <div className="divide-y divide-border/50 flex-1 overflow-y-auto border-t border-border/50">
                {rows.map((row) => {
                  const dayName = getDayName(row.tanggal_mulai);
                  const { valid, error } = isSequentiallyValid(row.modul, row.tanggal_mulai);

                  return (
                    <div
                      key={row.modul}
                      className="flex flex-row items-center justify-between px-4 sm:px-5 py-3 sm:py-2 text-sm hover:bg-muted/30 transition-colors group gap-2 sm:gap-4"
                    >
                      <div className="font-semibold text-foreground shrink-0">Modul {row.modul}</div>
                      <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={loading || !term}
                              className={cn(
                                'h-8 justify-start text-left font-normal text-xs px-2.5 min-w-[130px] max-w-[150px]',
                                !row.tanggal_mulai && 'text-muted-foreground',
                                !valid && 'border-destructive text-destructive focus-visible:ring-destructive'
                              )}
                            >
                              <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-70" />
                              <span className="truncate">
                                {row.tanggal_mulai && parseDate(row.tanggal_mulai) ? (
                                  format(parseDate(row.tanggal_mulai)!, 'dd/MM/yyyy')
                                ) : (
                                  'Pilih tanggal'
                                )}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                              mode="single"
                              selected={parseDate(row.tanggal_mulai)}
                              onSelect={(d) => {
                                handleChangeDate(row.modul, d ? format(d, 'yyyy-MM-dd') : '');
                              }}
                            />
                            {row.tanggal_mulai && (
                              <div className="p-2 border-t border-border flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-destructive hover:text-destructive gap-1 px-2"
                                  onClick={() => handleChangeDate(row.modul, '')}
                                >
                                  <X className="h-3 w-3" />
                                  Hapus
                                </Button>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                        {row.tanggal_mulai && (
                          <>
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded-sm ${valid
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-destructive/10 text-destructive'
                                }`}
                            >
                              {dayName}
                              {!valid && ` (${error})`}
                            </span>
                            <div
                              className="w-4 h-4 rounded-sm border border-border/50 shrink-0"
                              style={{ backgroundColor: COURSE_COLORS[(row.modul - 1) % COURSE_COLORS.length] }}
                              title={`Warna Modul ${row.modul}`}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>

            <CardFooter className="p-4 pt-4 flex items-center justify-between gap-3 border-t border-border/50 bg-muted/10 shrink-0">
              <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading || !term || rows.length === 0}
                  >
                    Kalibrasi Tanggal
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>Kalibrasi Tanggal</DialogTitle>
                  </DialogHeader>
                  <div className="py-2 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="startModul" className="text-sm font-medium">
                        Mulai dari Modul
                      </Label>
                      <Select value={startModul} onValueChange={setStartModul}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih Modul" />
                        </SelectTrigger>
                        <SelectContent>
                          {rows.map((r) => (
                            <SelectItem key={r.modul} value={r.modul.toString()}>
                              Modul {r.modul}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Sistem akan mengisi modul-modul berikutnya dengan interval{' '}
                        <strong>7 hari</strong> sekali dimulai dari modul yang dipilih.
                      </p>
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsGenerateDialogOpen(false)}
                    >
                      Batal
                    </Button>
                    <Button size="sm" onClick={handleGenerate}>
                      Kalibrasi
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                size="sm"
                className="px-6"
                onClick={handleSave}
                disabled={loading || !term || hasInvalidDates}
              >
                Simpan Perubahan
              </Button>
            </CardFooter>
          </Card>

          {/* Right Panel: Calendar Visualizer */}
          <section className="h-full">
            <ModulCalendarView rows={rows} />
          </section>
        </div>
      )}
    </div>
  );
}
