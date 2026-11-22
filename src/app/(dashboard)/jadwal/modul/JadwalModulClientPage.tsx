'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  X,
} from 'lucide-react';
import { format, addDays, getDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { ModulCalendarView } from '@/components/jadwal/ModulCalendarView';
import { cn } from '@/lib/utils';
import { useTermStore } from '@/store/useTermStore';
import {
  fetchModulSchedule,
  saveModulSchedule,
  type ModulScheduleEntryDto,
} from '@/lib/fetchers/modulScheduleFetcher';

const createEmptyRows = (): ModulScheduleEntryDto[] =>
  Array.from({ length: 16 }, (_, idx) => ({
    modul: idx + 1,
    tanggal_mulai: null,
  }));

const parseDate = (dateStr: string | null): Date | undefined => {
  if (!dateStr) return undefined;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return undefined;
  const [y, m, d] = parts;
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
};

const addDaysSafe = (dateStr: string, days: number): string => {
  const parsed = parseDate(dateStr);
  if (!parsed) return dateStr;
  return format(addDays(parsed, days), 'yyyy-MM-dd');
};

const getDayName = (dateStr: string | null): string => {
  const parsed = parseDate(dateStr);
  if (!parsed) return '';
  return format(parsed, 'EEEE', { locale: id });
};

const isMonday = (dateStr: string | null): boolean => {
  const parsed = parseDate(dateStr);
  if (!parsed) return true;
  return getDay(parsed) === 1;
};

const serializeRows = (entries: ModulScheduleEntryDto[]): string =>
  JSON.stringify(entries.map((r) => [r.modul, r.tanggal_mulai ?? null]));

export default function JadwalModulClientPage() {
  const { activeTerm } = useTermStore();
  const term = activeTerm || '';

  const [rows, setRows] = useState<ModulScheduleEntryDto[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState<string>(() =>
    serializeRows(createEmptyRows())
  );
  const [saving, setSaving] = useState(false);
  const [loadedTerm, setLoadedTerm] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [startModul, setStartModul] = useState<string>('1');
  const [openPopoverModul, setOpenPopoverModul] = useState<number | null>(null);
  const [activeModul, setActiveModul] = useState<number | null>(null);
  const [showModulList, setShowModulList] = useState(false);

  const initialLoading = Boolean(term) && loadedTerm !== term;

  useEffect(() => {
    if (!term) return;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetchModulSchedule(term);
        if (cancelled) return;
        if (res.ok && res.data) {
          setRows(res.data);
          setSavedSnapshot(serializeRows(res.data));
          setLoadError(null);
        } else {
          const empty = createEmptyRows();
          setRows(empty);
          setSavedSnapshot(serializeRows(empty));
          const errMsg = res.error || 'Gagal memuat tanggal modul';
          setLoadError(errMsg);
          toast.error(errMsg);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const errMsg = err instanceof Error ? err.message : 'Gagal memuat tanggal modul';
        setLoadError(errMsg);
        toast.error(errMsg);
      } finally {
        if (!cancelled) {
          setLoadedTerm(term);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [term, refreshTick]);

  const handleRetry = () => {
    setLoadError(null);
    setLoadedTerm(null);
    setRefreshTick((n) => n + 1);
  };

  const handleChangeDate = (modul: number, tanggal: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.modul === modul ? { ...row, tanggal_mulai: tanggal || null } : row
      )
    );
  };

  const validationMap = useMemo(() => {
    const map = new Map<number, { valid: boolean; error?: string }>();
    let lastValidDate: { modul: number; dateStr: string } | null = null;

    for (const row of rows) {
      if (!row.tanggal_mulai) {
        map.set(row.modul, { valid: true });
        continue;
      }

      if (lastValidDate && row.tanggal_mulai < lastValidDate.dateStr) {
        map.set(row.modul, {
          valid: false,
          error: `Sebelum M${lastValidDate.modul}`,
        });
      } else if (!isMonday(row.tanggal_mulai)) {
        map.set(row.modul, { valid: false, error: 'Bukan Senin' });
      } else {
        map.set(row.modul, { valid: true });
      }

      lastValidDate = { modul: row.modul, dateStr: row.tanggal_mulai };
    }

    return map;
  }, [rows]);

  const invalidCount = useMemo(
    () => Array.from(validationMap.values()).filter((v) => !v.valid).length,
    [validationMap]
  );
  const hasInvalidDates = invalidCount > 0;

  const filledCount = useMemo(
    () => rows.filter((r) => Boolean(r.tanggal_mulai)).length,
    [rows]
  );

  const hasUnsavedChanges = useMemo(
    () => rows.length > 0 && serializeRows(rows) !== savedSnapshot,
    [rows, savedSnapshot]
  );

  const selectedAnchor = useMemo(() => {
    const startM = parseInt(startModul, 10);
    const entry = rows.find((r) => r.modul === startM);
    const dateStr = entry?.tanggal_mulai ?? null;
    const status = validationMap.get(startM) ?? { valid: true };
    return { modul: startM, dateStr, status };
  }, [rows, startModul, validationMap]);

  const handleGenerate = () => {
    const { modul: startM, dateStr: anchor, status } = selectedAnchor;

    if (!anchor) {
      toast.error(`Isi tanggal pada Modul ${startM} terlebih dahulu sebagai acuan.`);
      return;
    }
    if (!status.valid) {
      toast.error(`Tanggal Modul ${startM} tidak valid: ${status.error}.`);
      return;
    }

    const byModul = new Map<number, string | null>(rows.map((r) => [r.modul, r.tanggal_mulai]));
    let lastDate = anchor;
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

  const handleReset = () => {
    try {
      const parsed = JSON.parse(savedSnapshot) as [number, string | null][];
      setRows(parsed.map(([modul, tanggal_mulai]) => ({ modul, tanggal_mulai })));
    } catch {
      void handleRetry();
    }
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

    setSaving(true);
    try {
      const res = await saveModulSchedule(term, rows);
      if (res.ok) {
        setSavedSnapshot(serializeRows(rows));
        toast.success('Tanggal mulai modul berhasil disimpan');
      } else {
        toast.error(res.error || 'Gagal menyimpan tanggal modul');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan tanggal modul');
    } finally {
      setSaving(false);
    }
  };

  const handleCalendarSelectModul = (modul: number) => {
    setActiveModul(modul);
    if (!showModulList) {
      setShowModulList(true);
    }
    setTimeout(() => {
      const el = document.getElementById(`modul-row-${modul}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const getFallbackMonth = (index: number): Date | undefined => {
    for (let i = index - 1; i >= 0; i -= 1) {
      const prevDate = parseDate(rows[i].tanggal_mulai);
      if (prevDate) {
        return addDays(prevDate, (index - i) * 7);
      }
    }
    return undefined;
  };

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 relative space-y-6">
      {/* Header Top Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Tanggal Modul
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Atur tanggal mulai praktikum untuk setiap modul (1-16).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
          {hasUnsavedChanges && (
            <Badge
              variant="outline"
              className="border-amber-500/40 text-amber-600 dark:text-amber-400"
            >
              Belum disimpan
            </Badge>
          )}

          {hasUnsavedChanges && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={saving || initialLoading}
              className="min-h-11 sm:min-h-8"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Reset
            </Button>
          )}

          <Button
            variant={showModulList ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowModulList((prev) => !prev)}
            disabled={initialLoading || !term}
            aria-expanded={showModulList}
            className="min-h-11 sm:min-h-8 tabular-nums"
          >
            {showModulList ? (
              <PanelLeftClose className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            ) : (
              <PanelLeftOpen className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            )}
            {showModulList ? 'Sembunyikan Daftar' : `Atur Modul (${filledCount}/16)`}
          </Button>

          <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={saving || initialLoading || !term || rows.length === 0}
                className="min-h-11 sm:min-h-8"
              >
                Kalibrasi Tanggal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>Kalibrasi Tanggal</DialogTitle>
                <DialogDescription>
                  Isi jadwal modul berikutnya otomatis setiap 7 hari sekali dari satu modul acuan.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="startModul" className="text-sm font-medium">
                    Mulai dari Modul
                  </Label>
                  <Select value={startModul} onValueChange={setStartModul}>
                    <SelectTrigger id="startModul" className="w-full">
                      <SelectValue placeholder="Pilih Modul" />
                    </SelectTrigger>
                    <SelectContent>
                      {rows.map((r) => (
                        <SelectItem key={r.modul} value={r.modul.toString()}>
                          Modul {r.modul}
                          {r.tanggal_mulai && parseDate(r.tanggal_mulai)
                            ? ` (${format(parseDate(r.tanggal_mulai)!, 'dd MMM yyyy', { locale: id })})`
                            : ' (belum diisi)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedAnchor.dateStr && parseDate(selectedAnchor.dateStr) ? (
                    selectedAnchor.status.valid ? (
                      <p className="text-xs text-muted-foreground tabular-nums">
                        Acuan: Modul {selectedAnchor.modul} (
                        {format(parseDate(selectedAnchor.dateStr)!, 'dd MMM yyyy', { locale: id })}
                        ). Sistem akan mengisi Modul {Math.min(selectedAnchor.modul + 1, 16)} s.d.
                        16 dengan interval 7 hari.
                      </p>
                    ) : (
                      <p className="text-xs text-destructive">
                        Tanggal acuan Modul {selectedAnchor.modul} tidak valid (
                        {selectedAnchor.status.error}). Perbaiki terlebih dahulu sebelum kalibrasi.
                      </p>
                    )
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Modul {selectedAnchor.modul} belum memiliki tanggal. Pilih tanggal pada Modul{' '}
                      {selectedAnchor.modul} terlebih dahulu agar dapat dijadikan acuan.
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsGenerateDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  disabled={!selectedAnchor.dateStr || !selectedAnchor.status.valid}
                >
                  Kalibrasi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || initialLoading || !term || hasInvalidDates || !hasUnsavedChanges}
            className="min-h-11 sm:min-h-8"
          >
            {saving && <Spinner className="mr-1.5" />}
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </div>

      {/* State Alerts */}
      {loadError && (
        <Alert variant="destructive" className="bg-transparent">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2 w-full">
            <span>{loadError}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={initialLoading || !term}
            >
              Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!initialLoading && hasInvalidDates && (
        <Alert variant="destructive" className="bg-transparent">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            Terdapat {invalidCount} modul dengan tanggal tidak valid (bukan hari Senin atau urutan
            sebelum modul sebelumnya). Perbaiki tanggal berwarna merah untuk menyimpan.
          </AlertDescription>
        </Alert>
      )}

      {!term && !initialLoading ? (
        <Card className="bg-transparent border-border shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <CalendarIcon
              className="h-9 w-9 stroke-1 text-muted-foreground/50 mb-3"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-foreground">Tahun ajaran belum dipilih</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Pilih tahun ajaran aktif pada pemilih di bagian atas halaman untuk mengatur jadwal
              modul.
            </p>
          </CardContent>
        </Card>
      ) : initialLoading ? (
        <Card className="bg-transparent border-border shadow-none">
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4 border-b border-border">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-5 w-32" />
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <Skeleton key={j} className="h-4 w-full mb-1" />
                    ))}
                    {Array.from({ length: 35 }).map((__, j) => (
                      <Skeleton key={j} className="h-10 w-full rounded-md" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div
          className={cn(
            'grid grid-cols-1 gap-6 items-start',
            showModulList && 'lg:grid-cols-[420px_1fr] xl:grid-cols-[460px_1fr]'
          )}
        >
          {/* Left Panel: Daftar Modul (hidden by default to focus on calendar) */}
          {showModulList && (
            <Card className="flex flex-col bg-transparent border-border shadow-none lg:sticky lg:top-20 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3 border-b border-border shrink-0">
                <div>
                  <CardTitle className="text-base font-semibold">Daftar Modul</CardTitle>
                  <CardDescription>Setiap modul dimulai hari Senin (durasi 7 hari).</CardDescription>
                </div>
                <Badge variant="secondary" className="tabular-nums font-medium shrink-0">
                  {filledCount}/16 terisi
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="lg:max-h-[calc(100vh-220px)]">
                  <div className="divide-y divide-border/60">
                    {rows.map((row, idx) => {
                      const parsedDate = parseDate(row.tanggal_mulai);
                      const dayName = getDayName(row.tanggal_mulai);
                      const validation = validationMap.get(row.modul) ?? { valid: true };
                      const isFocused = activeModul === row.modul;
                      const rangeSummary =
                        parsedDate && validation.valid
                          ? `${format(parsedDate, 'dd MMM', { locale: id })} - ${format(
                              addDays(parsedDate, 6),
                              'dd MMM',
                              { locale: id }
                            )}`
                          : null;

                      return (
                        <div
                          key={row.modul}
                          id={`modul-row-${row.modul}`}
                          onMouseEnter={() => row.tanggal_mulai && setActiveModul(row.modul)}
                          onMouseLeave={() => setActiveModul((prev) => (prev === row.modul ? null : prev))}
                          onFocus={() => row.tanggal_mulai && setActiveModul(row.modul)}
                          onBlur={() => setActiveModul((prev) => (prev === row.modul ? null : prev))}
                          className={cn(
                            'flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 text-sm transition-colors hover:bg-muted/30',
                            isFocused && 'bg-muted/40'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={cn(
                                'w-2 h-2 rounded-full shrink-0',
                                row.tanggal_mulai
                                  ? validation.valid
                                    ? 'bg-foreground/70'
                                    : 'bg-destructive'
                                  : 'border border-muted-foreground/40'
                              )}
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <div className="font-medium text-foreground tabular-nums leading-tight">
                                Modul {row.modul}
                              </div>
                              {row.tanggal_mulai ? (
                                validation.valid ? (
                                  <p className="text-xs text-muted-foreground tabular-nums truncate mt-0.5">
                                    {dayName}, {rangeSummary}
                                  </p>
                                ) : (
                                  <p className="text-xs text-destructive truncate mt-0.5">
                                    {dayName} ({validation.error})
                                  </p>
                                )
                              ) : (
                                <p className="text-xs text-muted-foreground mt-0.5">Belum diatur</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Popover
                              open={openPopoverModul === row.modul}
                              onOpenChange={(open) => setOpenPopoverModul(open ? row.modul : null)}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={saving || !term}
                                  className={cn(
                                    'h-9 sm:h-8 min-w-[138px] justify-start text-left font-normal text-xs px-2.5 tabular-nums',
                                    !row.tanggal_mulai && 'text-muted-foreground',
                                    !validation.valid &&
                                      'border-destructive text-destructive focus-visible:ring-destructive'
                                  )}
                                >
                                  <CalendarIcon
                                    className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-70"
                                    aria-hidden="true"
                                  />
                                  <span className="truncate">
                                    {parsedDate
                                      ? format(parsedDate, 'dd MMM yyyy', { locale: id })
                                      : 'Pilih tanggal'}
                                  </span>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                  mode="single"
                                  weekStartsOn={1}
                                  defaultMonth={parsedDate ?? getFallbackMonth(idx)}
                                  selected={parsedDate}
                                  disabled={(date) => getDay(date) !== 1}
                                  onSelect={(d) => {
                                    handleChangeDate(row.modul, d ? format(d, 'yyyy-MM-dd') : '');
                                    setOpenPopoverModul(null);
                                  }}
                                />
                                {row.tanggal_mulai && (
                                  <div className="p-2 border-t border-border flex justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs text-destructive hover:text-destructive gap-1 px-2"
                                      onClick={() => {
                                        handleChangeDate(row.modul, '');
                                        setOpenPopoverModul(null);
                                      }}
                                    >
                                      <X className="h-3 w-3" aria-hidden="true" />
                                      Hapus Tanggal
                                    </Button>
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>

                            {row.tanggal_mulai && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleChangeDate(row.modul, '')}
                                disabled={saving}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                aria-label={`Hapus tanggal Modul ${row.modul}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Right Panel: Calendar Visualizer */}
          <section className="min-w-0">
            <ModulCalendarView
              rows={rows}
              activeModul={activeModul}
              onSelectModul={handleCalendarSelectModul}
              expanded={!showModulList}
            />
          </section>
        </div>
      )}
    </div>
  );
}
