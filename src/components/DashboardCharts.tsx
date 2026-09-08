'use client';

// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useScheduleData } from '@/hooks/useScheduleData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Jadwal, JadwalPengganti } from '@/types/database';
import { ROOMS, STATIC_SESSIONS } from '@/constants';
import { ScheduleCell } from '@/components/jadwal/ScheduleCell';
import React, { useMemo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useJaga } from '@/hooks/useJaga';
import { getJagaShiftsByDay } from '@/utils/jagaUtils';
import { useMonitoringStore } from '@/store/useMonitoringStore';
import { usePresensiJagaStore } from '@/store/usePresensiJagaStore';
import { isLabOnline } from '@/lib/labStatus';
import { CheckCircle2 } from 'lucide-react';

const chartConfigAsprak = {
  count: {
    label: 'Jumlah Asprak',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

const chartConfigJadwal = {
  count: {
    label: 'Total Kelas',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

export default function DashboardCharts({
  asprakByAngkatan,
  jadwalByDay,
  rawJadwal,
  jadwalPengganti,
  loading,
  term,
  activeModul,
  userRole: _userRole,
}: {
  asprakByAngkatan: { name: string; count: number }[];
  jadwalByDay: { name: string; count: number }[];
  rawJadwal: Jadwal[];
  jadwalPengganti: JadwalPengganti[];
  loading: boolean;
  term: string;
  activeModul: number;
  userRole?: string;
}) {
  const dataAsprak = [...asprakByAngkatan].sort((a, b) => parseInt(a.name) - parseInt(b.name));

  const dayOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const dataJadwal = [...jadwalByDay].sort(
    (a, b) => dayOrder.indexOf(a.name) - dayOrder.indexOf(b.name)
  );


  const [todayDate, setTodayDate] = React.useState(new Date());

  React.useEffect(() => {
    // Memperbarui waktu setiap 10 detik agar deteksi kedaluwarsa (TTL) dan pergeseran sesi tetap sinkron
    const timer = setInterval(() => setTodayDate(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const uniqueRooms = useMemo(() => {
    // We can use the global ROOMS constant or derive from today's schedule
    // Using global ROOMS ensures the grid structure is consistent
    return ROOMS;
  }, []);

  const [programType, setProgramType] = React.useState<'REGULER' | 'PJJ'>('REGULER');
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

  // Use the unified useScheduleData hook — same logic as JadwalClientPage
  // Apply pengganti overlay for the active modul before filtering to today
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

  const scheduleMatrix = fullMatrix[currentDayName] || {};
  const visibleSessions = dynamicSessionsByDay[currentDayName] || [];

  const { jagaList } = useJaga(term, activeModul, currentDayName);
  const shiftInfos = getJagaShiftsByDay(currentDayName);

  const labStatus = useMonitoringStore((state) => state.labStatus);
  const todayPresensi = usePresensiJagaStore((state) => state.todayPresensi);
  const initPresensi = usePresensiJagaStore((state) => state.init);

  React.useEffect(() => {
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
    const endValue = startValue + 3; // Asumsi durasi sesi 3 jam
    if (timeValue >= startValue && timeValue < endValue) {
      activeSessionNumber = s.sesi;
      break;
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Schedule Visualization */}
      <Card className="col-span-full border-border/50 shadow-sm bg-card">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>
              Jadwal Hari Ini ({todayDate.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' })})
            </CardTitle>
            <CardDescription>
              Jadwal praktikum yang berlangsung hari ini
            </CardDescription>
          </div>
          <ToggleGroup
            type="single"
            value={programType}
            onValueChange={(value) => {
              if (value) setProgramType(value as 'REGULER' | 'PJJ');
            }}
            variant="outline"
            className="*:data-[slot=toggle-group-item]:px-4!"
          >
            <ToggleGroupItem value="REGULER">Reguler</ToggleGroupItem>
            <ToggleGroupItem value="PJJ">PJJ</ToggleGroupItem>
          </ToggleGroup>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-lg border border-border bg-card/50">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="p-2 border-r-0 min-w-[120px]">
                        <Skeleton className="h-6 w-16 mx-auto" />
                      </th>
                      <th className="w-4 bg-transparent border-none"></th>
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
                        <td className="w-4 bg-transparent border-none"></td>
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
            </div>
          ) : processedJadwalList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              <p>Tidak ada jadwal praktikum untuk hari ini.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-border shadow-sm bg-card/50">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="p-2 border-r-0 text-center font-bold min-w-[120px] text-xs uppercase text-muted-foreground bg-transparent leading-tight">
                        Penjagaan
                        <br />
                        <span className="text-blue-700 dark:text-blue-300">(Modul {activeModul})</span>
                      </th>
                      <th className="w-4 bg-transparent border-none"></th>
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

                      return (
                        <tr
                          key={session.rowKey}
                          className="hover:bg-muted/30 transition-colors border-b border-border/50"
                        >
                          <td className="p-2 border-r-0 text-center align-top relative bg-muted/5">
                            <div className="flex flex-wrap gap-1 justify-center max-w-[120px] mx-auto min-h-[40px] items-center">
                              {shiftJaga.length > 0 ? (
                                <TooltipProvider>
                                  {shiftJaga.map((j) => {
                                    const presensi = todayPresensi.find(
                                      (p) =>
                                        p.id_asprak === j.id_asprak &&
                                        p.shift === j.shift &&
                                        p.hari.toUpperCase() === currentDayName.toUpperCase() &&
                                        p.modul === activeModul
                                    );
                                    const isHadir = !!presensi;
                                    const hadirTime = presensi?.waktu_masuk
                                      ? format(new Date(presensi.waktu_masuk), 'HH:mm', { locale: id })
                                      : null;

                                    return (
                                      <Tooltip key={j.id}>
                                        <TooltipTrigger asChild>
                                          <div
                                            className={`text-xs px-1.5 py-0.5 rounded-sm font-bold transition-all hover:scale-105 cursor-default border flex items-center gap-1 ${
                                              isHadir
                                                ? 'bg-green-50/90 text-green-800 border-green-400 ring-2 ring-green-500/70 shadow-sm dark:bg-green-950/60 dark:text-green-300 dark:border-green-700'
                                                : j.asprak?.role === 'ASLAB'
                                                ? 'bg-blue-50/50 text-blue-700 border-blue-200/60 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/40'
                                                : 'bg-slate-50/50 text-slate-700 border-slate-200/60 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700/60'
                                            }`}
                                          >
                                            {isHadir ? (
                                              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                                            ) : null}
                                            {j.asprak?.kode || 'Unknown'}
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
                                </TooltipProvider>
                              ) : (
                                <span className="text-xs text-muted-foreground italic opacity-50">
                                  -
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="w-4 bg-transparent border-none"></td>
                          <td className="p-2 border-r border-l border-border text-center font-medium text-muted-foreground text-xs 2xl:text-sm">
                            {session.sesi ? (
                              <div className="font-bold">Sesi {session.sesi}</div>
                            ) : null}
                            <div className="text-xs opacity-80">{session.jam}</div>
                          </td>
                          {uniqueRooms.map((room) => {
                            const jadwals = scheduleMatrix[session.rowKey]?.[room] || [];
                            
                            // Cek status ruangan dari realtime monitoring
                            const roomStatus = labStatus.find(
                              (l) => l.lab_id.replace(/\s+/g, '').toUpperCase() === room.replace(/\s+/g, '').toUpperCase()
                            );
                            const isRoomOnline = roomStatus ? isLabOnline(roomStatus, todayDate) : false;

                            return (
                              <td
                                key={`${session.rowKey}-${room}`}
                                className="p-0 border-r border-border h-[60px] w-[120px] relative align-top"
                              >
                                <div className="flex flex-col w-full h-full min-h-[60px]">
                                  {jadwals.map((jadwal) => {
                                    // Kelas dianggap sedang berjalan jika ruangan tersebut online 
                                    // dan sesi jadwal ini adalah sesi yang sedang berjalan SEKARANG berdasarkan jam.
                                    // (Atau jika nama kelas cocok persis dengan yang dimasukkan asprak)
                                    const isClassActive = isRoomOnline && (session.sesi === activeSessionNumber || roomStatus?.kelas === jadwal.kelas);

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
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t border-border/50 pt-3">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-4 h-4 bg-muted rounded-[2px]"
                    style={{
                      background: `linear-gradient(var(--muted), var(--muted)) padding-box, repeating-linear-gradient(45deg, #facc15, #facc15 5px, #ffffff 5px, #ffffff 10px) border-box`,
                      border: '3px solid transparent',
                    }}
                  ></div>
                  <span>Jadwal Pengganti</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-sm bg-muted border border-border"></div>
                  <span>Jadwal Reguler</span>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  <div className="w-4 h-4 rounded-sm bg-muted ring-[3px] ring-green-500/90 ring-inset"></div>
                  <span>Kelas Sedang Berjalan (Realtime)</span>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
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

      {/* Chart 1: Asprak per Angkatan */}
      <Card className="border-border/50 shadow-sm bg-card">
        <CardHeader>
          <CardTitle>Total Asprak per Angkatan</CardTitle>
          <CardDescription>Distribusi asisten praktikum berdasarkan angkatan</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] w-full flex items-end gap-2 pb-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="flex-1"
                  style={{ height: `${20 + ((i * 17) % 60)}%` }}
                />
              ))}
            </div>
          ) : (
            <ChartContainer config={chartConfigAsprak} className="h-[300px] 2xl:h-[450px] w-full">
              <BarChart data={dataAsprak} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickMargin={10} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Chart 2: Jadwal per Hari */}
      <Card className="border-border/50 shadow-sm bg-card">
        <CardHeader>
          <CardTitle>Distribusi Jadwal per Hari</CardTitle>
          <CardDescription>Jumlah kelas praktikum per hari dalam seminggu</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] w-full flex items-end gap-2 pb-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="flex-1"
                  style={{ height: `${30 + ((i * 10) % 50)}%` }}
                />
              ))}
            </div>
          ) : (
            <ChartContainer config={chartConfigJadwal} className="h-[300px] 2xl:h-[450px] w-full">
              <BarChart data={dataJadwal} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickMargin={10} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
