'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Cell, Pie, PieChart } from 'recharts';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { SynchronizedJagaSnakeBorder } from '@/components/jadwal/JagaCell';
import { ScheduleCell } from '@/components/jadwal/ScheduleCell';
import { ROOMS, STATIC_SESSIONS } from '@/constants';
import { useJaga } from '@/hooks/useJaga';
import { useScheduleData } from '@/hooks/useScheduleData';
import { isLabOnline } from '@/lib/labStatus';
import { useMonitoringStore } from '@/store/useMonitoringStore';
import { usePresensiJagaStore } from '@/store/usePresensiJagaStore';
import { Jadwal, JadwalPengganti } from '@/types/database';
import { getCourseColor } from '@/utils/colorUtils';
import { getJagaShiftsByDay } from '@/utils/jagaUtils';

const MAX_JAGA_CODES = 6;

const MONO_CHART_SHADES = [
  'var(--foreground)',
  'var(--chart-2)',
  'var(--chart-1)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

// 1 kode = 1 kotak penuh. 2 kode = sejajar. 3-4 kode = 2 kolom. 5-6 kode = 3 kolom.
function splitJagaRows<T>(tiles: T[]): T[][] {
  const cols = tiles.length <= 2 ? tiles.length : tiles.length <= 4 ? 2 : 3;
  const rows: T[][] = [];
  for (let i = 0; i < tiles.length; i += cols) rows.push(tiles.slice(i, i + cols));
  return rows;
}

const chartConfigAsprak = {
  count: {
    label: 'Jumlah Asprak',
    color: 'var(--foreground)',
  },
} satisfies ChartConfig;

function parseRoomClassText(rawKelas?: string): string | null {
  const trimmed = rawKelas?.trim();
  if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'tidak ada sesi') {
    return null;
  }
  if (trimmed.includes(' | ')) {
    const parts = trimmed
      .split(' | ')
      .map((p) => p.trim())
      .filter(Boolean);
    return parts.join(' · ');
  }
  return trimmed;
}

function matchesScheduleQuery(jadwal: Jadwal, room: string, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const fields = [
    jadwal.kelas,
    jadwal.mata_kuliah?.nama_lengkap,
    jadwal.mata_kuliah?.praktikum?.nama,
    jadwal.dosen,
    jadwal.ruangan,
    room,
  ];
  return fields.some((field) => field?.toLowerCase().includes(normalizedQuery));
}

export default function DashboardCharts({
  asprakByAngkatan,
  jadwalByDay,
  rawJadwal,
  jadwalPengganti,
  loading,
  error = false,
  term,
  activeModul,
  userRole: _userRole,
}: {
  asprakByAngkatan: { name: string; count: number }[];
  jadwalByDay: { name: string; count: number }[];
  rawJadwal: Jadwal[];
  jadwalPengganti: JadwalPengganti[];
  loading: boolean;
  error?: boolean;
  term: string;
  activeModul: number;
  userRole?: string;
}) {
  const [programType, setProgramType] = useState<'REGULER' | 'PJJ'>('REGULER');
  const [searchQuery, setSearchQuery] = useState('');

  const dataAsprak = useMemo(() => {
    return [...asprakByAngkatan]
      .sort((a, b) => parseInt(a.name, 10) - parseInt(b.name, 10))
      .map((item, idx) => ({
        ...item,
        label: `Angkatan ${item.name}`,
        fill: MONO_CHART_SHADES[idx % MONO_CHART_SHADES.length],
      }));
  }, [asprakByAngkatan]);

  const totalAsprak = useMemo(
    () => dataAsprak.reduce((sum, item) => sum + item.count, 0),
    [dataAsprak]
  );

  const dayOrder = useMemo(
    () => ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'],
    []
  );

  const dataJadwal = useMemo(() => {
    return [...jadwalByDay]
      .sort((a, b) => dayOrder.indexOf(a.name) - dayOrder.indexOf(b.name))
      .map((item, idx) => ({
        ...item,
        fill: MONO_CHART_SHADES[idx % MONO_CHART_SHADES.length],
      }));
  }, [jadwalByDay, dayOrder]);

  const totalJadwalWeek = useMemo(
    () => dataJadwal.reduce((sum, item) => sum + item.count, 0),
    [dataJadwal]
  );

  const storeNow = useMonitoringStore((state) => state.now);
  const labStatus = useMonitoringStore((state) => state.labStatus);
  const todayDate = storeNow;

  const uniqueRooms = useMemo(() => ROOMS, []);

  const currentDayNameRaw = format(todayDate, 'EEEE', { locale: id }).toUpperCase();
  const currentDayName =
    currentDayNameRaw === 'SENIN' ||
    currentDayNameRaw === 'SELASA' ||
    currentDayNameRaw === 'RABU' ||
    currentDayNameRaw === 'KAMIS' ||
    currentDayNameRaw === 'JUMAT' ||
    currentDayNameRaw === 'SABTU' ||
    currentDayNameRaw === 'MINGGU'
      ? currentDayNameRaw
      : 'SENIN';

  const {
    processedJadwalList,
    scheduleMatrix: fullMatrix,
    dynamicSessionsByDay,
  } = useScheduleData({
    rawJadwalList: rawJadwal,
    jadwalPengganti: jadwalPengganti,
    selectedModul: `Modul ${activeModul}`,
    filterDay: currentDayName,
    programType,
  });

  const scheduleMatrix = useMemo(
    () => fullMatrix[currentDayName] || {},
    [fullMatrix, currentDayName]
  );
  const visibleSessions = useMemo(
    () => dynamicSessionsByDay[currentDayName] || [],
    [dynamicSessionsByDay, currentDayName]
  );

  // Peta jadwal per ruangan dari daftar penuh hari ini untuk validasi kelas aktif
  const roomSchedulesTodayMap = useMemo(() => {
    const map = new Map<string, Jadwal[]>();
    for (const j of processedJadwalList) {
      if (!j.ruangan) continue;
      const cleanRoom = j.ruangan.replace(/\s+/g, '').toUpperCase();
      if (!map.has(cleanRoom)) {
        map.set(cleanRoom, []);
      }
      map.get(cleanRoom)!.push(j);
    }
    return map;
  }, [processedJadwalList]);

  const { jagaList } = useJaga(term, activeModul, currentDayName);
  const shiftInfos = getJagaShiftsByDay(currentDayName);

  const todayPresensi = usePresensiJagaStore((state) => state.todayPresensi);
  const initPresensi = usePresensiJagaStore((state) => state.init);

  useEffect(() => {
    initPresensi();
  }, [initPresensi]);

  const currentHour = todayDate.getHours();
  const currentMin = todayDate.getMinutes();
  const timeValue = currentHour + currentMin / 60;

  let activeSessionNumber = -1;
  const daySessions = STATIC_SESSIONS[currentDayName] || STATIC_SESSIONS['SENIN'];
  for (const s of daySessions) {
    const [h, m] = s.jam.split(':').map(Number);
    const startValue = h + m / 60;
    const endValue = startValue + 3;
    if (timeValue >= startValue && timeValue < endValue) {
      activeSessionNumber = s.sesi;
      break;
    }
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const hasAnyFilteredMatch = useMemo(() => {
    if (!normalizedQuery) return processedJadwalList.length > 0;
    return visibleSessions.some((session) =>
      uniqueRooms.some((room) =>
        (scheduleMatrix[session.rowKey]?.[room] || []).some((j) =>
          matchesScheduleQuery(j, room, normalizedQuery)
        )
      )
    );
  }, [normalizedQuery, processedJadwalList.length, visibleSessions, uniqueRooms, scheduleMatrix]);

  const todayWeekdayName = todayDate.toLocaleDateString('id-ID', {
    weekday: 'long',
    timeZone: 'Asia/Jakarta',
  });

  return (
    <div className="space-y-6">
      {/* Row 2: Full-Width Matriks Jadwal Hari Ini */}
      <Card
        aria-busy={loading || undefined}
        className="bg-transparent border border-border shadow-none py-5 gap-4"
      >
        <CardHeader className="flex flex-col gap-4 px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base font-semibold">
              Jadwal Hari Ini ({todayWeekdayName})
            </CardTitle>
            <CardDescription className="text-xs">
              Modul {activeModul} · {term ? `Term ${term}` : 'Semua term'} ·{' '}
              {processedJadwalList.length} kelas ({programType === 'REGULER' ? 'Reguler' : 'PJJ'})
            </CardDescription>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center w-full lg:w-auto">
            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter kelas, matkul, ruangan..."
                aria-label="Filter jadwal hari ini"
                className="pl-9 pr-9 min-h-11 sm:min-h-9 bg-transparent border-border"
              />
              {searchQuery.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Hapus filter jadwal"
                  className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <ToggleGroup
              type="single"
              value={programType}
              onValueChange={(value) => {
                if (value) setProgramType(value as 'REGULER' | 'PJJ');
              }}
              variant="outline"
              className="*:data-[slot=toggle-group-item]:px-4! *:data-[slot=toggle-group-item]:min-h-11 sm:*:data-[slot=toggle-group-item]:min-h-9"
            >
              <ToggleGroupItem value="REGULER">Reguler</ToggleGroupItem>
              <ToggleGroupItem value="PJJ">PJJ</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>

        <CardContent className="px-5">
          {error ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Gagal memuat jadwal hari ini. Muat ulang halaman untuk mencoba lagi.
              </p>
            </div>
          ) : loading ? (
            <div className="overflow-x-auto rounded-lg border border-border bg-transparent">
              <span className="sr-only">Memuat matriks jadwal hari ini</span>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="p-2 border-r-0 min-w-[120px]">
                      <Skeleton className="h-6 w-16 mx-auto" />
                    </th>
                    <th className="p-2 border-r border-l border-border min-w-[60px]">
                      <Skeleton className="h-4 w-8 mx-auto" />
                    </th>
                    {uniqueRooms.map((room) => (
                      <th key={room} className="p-2 border-r border-border min-w-[120px]">
                        <Skeleton className="h-4 w-16 mx-auto" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50 h-[60px] 2xl:h-[80px]">
                      <td className="p-2 border-r-0 bg-muted/5 align-middle">
                        <Skeleton className="h-6 w-16 mx-auto rounded-sm" />
                      </td>
                      <td className="p-2 border-r border-l border-border text-center align-middle">
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-10 mx-auto" />
                          <Skeleton className="h-3 w-8 mx-auto" />
                        </div>
                      </td>
                      {uniqueRooms.map((room) => (
                        <td key={room} className="p-1 border-r border-border align-top">
                          <Skeleton className="h-10 2xl:h-[72px] w-full" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : processedJadwalList.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Tidak ada jadwal praktikum {programType === 'REGULER' ? 'Reguler' : 'PJJ'} untuk
                hari ini.
              </p>
              <Button asChild variant="outline" size="sm" className="min-h-11 sm:min-h-8 bg-transparent">
                <Link prefetch={false} href="/jadwal">
                  Kelola Jadwal
                </Link>
              </Button>
            </div>
          ) : !hasAnyFilteredMatch ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Tidak ada kelas yang cocok dengan &quot;{searchQuery.trim()}&quot;.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="min-h-11 sm:min-h-8 bg-transparent"
              >
                Reset Filter
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-border bg-transparent">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="p-2 border-r-0 text-center font-bold min-w-[120px] text-xs uppercase text-muted-foreground bg-transparent leading-tight">
                        Penjagaan
                        <br />
                        <span className="text-blue-700 dark:text-blue-300">
                          (Modul {activeModul})
                        </span>
                      </th>
                      <th className="p-2 border-r border-l border-border text-center font-bold min-w-[60px] text-xs 2xl:text-sm uppercase text-muted-foreground">
                        Sesi
                      </th>
                      {uniqueRooms.map((room) => (
                        <th
                          key={room}
                          className="p-2 border-r border-border text-center font-bold min-w-[120px] whitespace-nowrap text-xs 2xl:text-sm"
                        >
                          {room}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSessions.map((session) => {
                      const matchedShift =
                        shiftInfos.find((s) => s.shift === session.sesi) ||
                        shiftInfos[(session.sesi || 1) - 1];
                      const shiftJaga = jagaList.filter(
                        (j) => j.shift?.toString() === matchedShift?.shift?.toString()
                      );
                      const hasOverflow = shiftJaga.length > MAX_JAGA_CODES;
                      const visibleJaga = shiftJaga.slice(
                        0,
                        hasOverflow ? MAX_JAGA_CODES - 1 : MAX_JAGA_CODES
                      );
                      const overflowCount = shiftJaga.length - visibleJaga.length;
                      const jagaTiles: Array<(typeof visibleJaga)[number] | null> = hasOverflow
                        ? [...visibleJaga, null]
                        : visibleJaga;

                      return (
                        <tr
                          key={session.rowKey}
                          className="hover:bg-muted/20 transition-colors border-b border-border/50"
                        >
                          <td className="border-r-0 p-0 align-top h-[60px] 2xl:h-[80px]">
                            {shiftJaga.length > 0 ? (
                              <TooltipProvider>
                                <div className="flex h-full flex-col gap-px bg-border">
                                  {splitJagaRows(jagaTiles).map((row, rowIndex) => (
                                    <div key={rowIndex} className="flex flex-1 gap-px">
                                      {row.map((j, colIndex) => {
                                        if (j === null) {
                                          return (
                                            <div
                                              key={`more-${colIndex}`}
                                              className="flex min-w-0 flex-1 items-center justify-center bg-muted text-[10px] sm:text-xs 2xl:text-sm font-bold text-muted-foreground"
                                              title={`${overflowCount} kode lainnya`}
                                            >
                                              +{overflowCount}
                                            </div>
                                          );
                                        }

                                        const presensi = todayPresensi.find(
                                          (p) =>
                                            p.id_asprak === j.id_asprak &&
                                            p.shift === j.shift &&
                                            p.hari.toUpperCase() === currentDayName.toUpperCase() &&
                                            p.modul === activeModul
                                        );
                                        const isHadir = !!presensi;
                                        const isTerlambat = presensi?.status === 'TERLAMBAT';
                                        const tileColor = getCourseColor(
                                          j.asprak?.kode || j.asprak?.nama_lengkap || 'ASPRAK'
                                        );
                                        const hadirTime = presensi?.waktu_masuk
                                          ? format(new Date(presensi.waktu_masuk), 'HH:mm', {
                                              locale: id,
                                            })
                                          : null;

                                        return (
                                          <Tooltip key={j.id}>
                                            <TooltipTrigger asChild>
                                              <div
                                                className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden p-1 text-[10px] sm:text-xs 2xl:text-sm font-bold text-white cursor-default transition-all hover:brightness-110"
                                                style={{ backgroundColor: tileColor }}
                                                aria-label={
                                                  isHadir
                                                    ? `${j.asprak?.kode} sudah hadir`
                                                    : undefined
                                                }
                                              >
                                                {isHadir && (
                                                  <SynchronizedJagaSnakeBorder
                                                    isTerlambat={isTerlambat}
                                                  />
                                                )}
                                                <span className="relative z-10 truncate drop-shadow-sm">
                                                  {j.asprak?.kode || 'Unknown'}
                                                </span>
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent
                                              side="right"
                                              className="flex flex-col gap-1.5"
                                            >
                                              <div className="flex items-center gap-2 border-b pb-1.5 border-background/20">
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-sm uppercase font-bold bg-primary text-primary-foreground">
                                                  {j.asprak?.role}
                                                </span>
                                                <span className="font-bold text-xs">
                                                  {j.asprak?.kode}
                                                </span>
                                                {isHadir ? (
                                                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm uppercase font-bold bg-green-600 text-white">
                                                    HADIR {hadirTime}
                                                  </span>
                                                ) : null}
                                              </div>
                                              <div>
                                                <div className="font-semibold text-xs leading-none mb-1">
                                                  {j.asprak?.nama_lengkap}
                                                </div>
                                                <div className="text-[10px] opacity-70 leading-none">
                                                  {j.asprak?.nim}
                                                </div>
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        );
                                      })}
                                    </div>
                                  ))}
                                </div>
                              </TooltipProvider>
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <span className="text-xs text-muted-foreground italic opacity-70">
                                  -
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="p-2 border-r border-l border-border text-center font-medium text-muted-foreground text-xs 2xl:text-sm">
                            {session.sesi ? (
                              <div className="font-bold">Sesi {session.sesi}</div>
                            ) : null}
                            <div className="text-xs opacity-90">{session.jam}</div>
                          </td>
                          {uniqueRooms.map((room) => {
                            const rawCellJadwals = scheduleMatrix[session.rowKey]?.[room] || [];
                            const jadwals = normalizedQuery
                              ? rawCellJadwals.filter((j) =>
                                  matchesScheduleQuery(j, room, normalizedQuery)
                                )
                              : rawCellJadwals;
                            const cleanRoomKey = room.replace(/\s+/g, '').toUpperCase();

                            const roomStatus = labStatus.find(
                              (l) => l.lab_id.replace(/\s+/g, '').toUpperCase() === cleanRoomKey
                            );
                            const isRoomOnline = roomStatus
                              ? isLabOnline(roomStatus, storeNow)
                              : false;

                            const rawSelectedKelas = roomStatus?.kelas?.trim();
                            const selectedKelas = rawSelectedKelas?.includes(' | ')
                              ? rawSelectedKelas.split(' | ').slice(1).join(' | ').trim()
                              : rawSelectedKelas;
                            const hasSelectedKelas = Boolean(
                              selectedKelas &&
                                selectedKelas !== '-' &&
                                selectedKelas.toLowerCase() !== 'tidak ada sesi'
                            );

                            const roomJadwals = roomSchedulesTodayMap.get(cleanRoomKey) || [];
                            const isSelectedKelasScheduledInRoom =
                              hasSelectedKelas &&
                              roomJadwals.some(
                                (j) => j.kelas?.trim().toUpperCase() === selectedKelas!.toUpperCase()
                              );

                            return (
                              <td
                                key={`${session.rowKey}-${room}`}
                                className="p-0 border-r border-border h-[60px] w-[120px] relative align-top"
                              >
                                <div className="flex flex-col w-full h-full min-h-[60px]">
                                  {jadwals.map((jadwal) => {
                                    let isClassActive = false;
                                    if (isRoomOnline) {
                                      if (isSelectedKelasScheduledInRoom) {
                                        const kelasMatch =
                                          jadwal.kelas?.trim().toUpperCase() ===
                                          selectedKelas!.toUpperCase();

                                        const selectedMatkul = rawSelectedKelas?.includes(' | ')
                                          ? rawSelectedKelas.split(' | ')[0].trim().toUpperCase()
                                          : null;
                                        const matkulMatch = selectedMatkul
                                          ? jadwal.mata_kuliah?.praktikum?.nama
                                              ?.trim()
                                              .toUpperCase() === selectedMatkul ||
                                            jadwal.mata_kuliah?.nama_lengkap
                                              ?.trim()
                                              .toUpperCase() === selectedMatkul
                                          : true;

                                        isClassActive = kelasMatch && matkulMatch;
                                      } else {
                                        isClassActive = session.sesi === activeSessionNumber;
                                      }
                                    }

                                    return (
                                      <ScheduleCell
                                        key={jadwal.id}
                                        jadwal={jadwal}
                                        showAsprakCount={true}
                                        isOnlineActive={isClassActive}
                                      />
                                    );
                                  })}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t border-border pt-3">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-4 h-4 bg-muted rounded-[2px]"
                    style={{
                      background: `linear-gradient(var(--muted), var(--muted)) padding-box, repeating-linear-gradient(45deg, #facc15, #facc15 5px, #ffffff 5px, #ffffff 10px) border-box`,
                      border: '3px solid transparent',
                    }}
                  />
                  <span>Jadwal Pengganti</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-sm bg-muted border border-border" />
                  <span>Jadwal Reguler</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-sm bg-muted ring-[3px] ring-green-500/90 ring-inset" />
                  <span>Kelas Sedang Berjalan (Realtime)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-green-100 text-green-800 border border-green-400 ring-2 ring-green-500/50">
                    JD
                  </div>
                  <span>Asisten Hadir Jaga (RFID)</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Row 3: 3-Column Analytics & Realtime Room Status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: Asprak per Angkatan (Monochrome Donut) */}
        <Card
          aria-busy={loading || undefined}
          className="flex flex-col bg-transparent border border-border shadow-none py-5 gap-4"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-2 px-5">
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-base font-semibold">Asprak per Angkatan</CardTitle>
              <CardDescription className="text-xs">
                Komposisi asisten aktif berdasarkan angkatan
              </CardDescription>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-8 shrink-0 bg-transparent border-border hover:bg-accent/50"
            >
              <Link prefetch={false} href="/asprak">
                Detail
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col justify-between gap-4 px-5">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-5 py-4">
                <Skeleton className="size-44 rounded-full" />
                <span className="sr-only">Memuat data asprak per angkatan</span>
                <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-10 w-full" />
                  ))}
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Gagal memuat komposisi asprak. Muat ulang halaman untuk mencoba lagi.
                </p>
              </div>
            ) : dataAsprak.length === 0 || totalAsprak === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Belum ada data asprak pada term ini.
                </p>
                <Button asChild variant="outline" size="sm" className="min-h-11 sm:min-h-8 bg-transparent">
                  <Link prefetch={false} href="/asprak">
                    Kelola Asprak
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="relative mx-auto flex w-full max-w-[240px] items-center justify-center">
                  <ChartContainer
                    config={chartConfigAsprak}
                    className="h-[200px] w-full aspect-auto"
                  >
                    <PieChart>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      <Pie
                        data={dataAsprak}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={56}
                        outerRadius={82}
                        paddingAngle={2}
                        stroke="var(--background)"
                        strokeWidth={2}
                        isAnimationActive={false}
                      >
                        {dataAsprak.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold tabular-nums text-foreground">
                      {totalAsprak}
                    </span>
                    <span className="text-xs text-muted-foreground">Asprak</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-border pt-3 sm:grid-cols-3">
                  {dataAsprak.map((item) => (
                    <div key={item.name} className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="size-2 rounded-full shrink-0 border border-border/50"
                          style={{ backgroundColor: item.fill }}
                          aria-hidden="true"
                        />
                        <span className="text-xs text-muted-foreground truncate">
                          Angkatan {item.name}
                        </span>
                      </div>
                      <p className="text-sm font-semibold tabular-nums text-foreground pl-3.5">
                        {item.count}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Center: Status Ruangan Realtime (List Card) */}
        <Card className="flex flex-col bg-transparent border border-border shadow-none py-5 gap-4">
          <CardHeader className="flex flex-row items-start justify-between gap-2 px-5">
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-base font-semibold">Status Ruangan</CardTitle>
              <CardDescription className="text-xs">
                Pemantauan langsung {ROOMS.length} ruang laboratorium
              </CardDescription>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-8 shrink-0 bg-transparent border-border hover:bg-accent/50"
            >
              <Link prefetch={false} href="/monitoring">
                Monitoring
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col px-5 min-h-0">
            <div className="max-h-[300px] overflow-y-auto scrollbar-thin space-y-2 pr-1">
              {ROOMS.map((room) => {
                const roomData = labStatus.find(
                  (d) => d.lab_id.replace(/\s+/g, '').toUpperCase() === room.replace(/\s+/g, '').toUpperCase()
                );
                const isOnline = roomData ? isLabOnline(roomData, storeNow) : false;
                const activeClassText = parseRoomClassText(roomData?.kelas);

                return (
                  <div
                    key={room}
                    className={`flex items-center justify-between gap-3 rounded-lg border bg-transparent px-3.5 py-2.5 transition-colors ${
                      isOnline
                        ? 'border-green-500/40 dark:border-green-500/30'
                        : 'border-border'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm font-medium text-foreground truncate">{room}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {isOnline && activeClassText
                          ? activeClassText
                          : isOnline
                            ? 'Perangkat lab aktif'
                            : 'Tidak ada sesi aktif'}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {isOnline ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/40 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                          <span
                            className="size-1.5 rounded-full bg-green-600 dark:bg-green-400"
                            aria-hidden="true"
                          />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          <span
                            className="size-1.5 rounded-full bg-muted-foreground"
                            aria-hidden="true"
                          />
                          Offline
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Right: Distribusi Jadwal per Hari (Pipeline Progress) */}
        <Card
          aria-busy={loading || undefined}
          className="flex flex-col bg-transparent border border-border shadow-none py-5 gap-4"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-2 px-5">
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-base font-semibold">Distribusi Jadwal</CardTitle>
              <CardDescription className="text-xs">
                Proporsi kelas praktikum per hari dalam seminggu
              </CardDescription>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-8 shrink-0 bg-transparent border-border hover:bg-accent/50"
            >
              <Link prefetch={false} href="/jadwal">
                Jadwal
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col justify-between gap-4 px-5">
            {loading ? (
              <div className="space-y-3 py-1">
                <Skeleton className="h-2.5 w-full rounded-full" />
                <span className="sr-only">Memuat distribusi jadwal per hari</span>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-8 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Gagal memuat distribusi jadwal. Muat ulang halaman untuk mencoba lagi.
                </p>
              </div>
            ) : dataJadwal.length === 0 || totalJadwalWeek === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Belum ada jadwal terjadwal pada term ini.
                </p>
                <Button asChild variant="outline" size="sm" className="min-h-11 sm:min-h-8 bg-transparent">
                  <Link prefetch={false} href="/jadwal">
                    Atur Jadwal
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  role="img"
                  aria-label={`Total ${totalJadwalWeek} kelas praktikum tersebar dalam seminggu`}
                  className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/40 gap-0.5"
                >
                  {dataJadwal.map((item) => {
                    if (item.count <= 0) return null;
                    const widthPct = (item.count / totalJadwalWeek) * 100;
                    return (
                      <div
                        key={item.name}
                        style={{ width: `${widthPct}%`, backgroundColor: item.fill }}
                        title={`${item.name}: ${item.count} kelas`}
                        className="h-full first:rounded-l-full last:rounded-r-full"
                      />
                    );
                  })}
                </div>

                <div className="space-y-3">
                  {dataJadwal.map((item) => {
                    const pct = Math.round((item.count / totalJadwalWeek) * 100);
                    return (
                      <div key={item.name} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="size-2.5 rounded-full shrink-0 border border-border/50"
                            style={{ backgroundColor: item.fill }}
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground leading-tight truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {item.count} kelas
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="h-1.5 w-20 sm:w-24 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: item.fill }}
                            />
                          </div>
                          <span className="w-9 text-right text-xs font-medium tabular-nums text-muted-foreground">
                            {pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
