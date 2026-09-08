'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROOMS } from '@/constants';
import { useMonitoringStore, LabStatus } from '@/store/useMonitoringStore';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { isLabOnline } from '@/lib/labStatus';

const RECONNECT_DELAY_MS = 5_000;

export default function RealtimeMonitoringWidget({ initialData }: { initialData: LabStatus[] }) {
  const monitoringData = useMonitoringStore(s => s.labStatus);
  const init = useMonitoringStore(s => s.init);
  const setInitialLabStatus = useMonitoringStore(s => s.setInitialLabStatus);
  const updateLabStatus = useMonitoringStore(s => s.updateLabStatus);

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setInitialLabStatus(initialData);
    init();
  }, [initialData, setInitialLabStatus, init]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);



  const activeLabsCount = monitoringData.filter((d) => isLabOnline(d, now)).length;

  return (
    <Card className="w-full transition-colors border bg-card hover:border-foreground/20 shadow-sm border-blue-200/50 dark:border-blue-500/20 py-0 mb-6">
      <CardContent className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 w-full flex-1">
          <div className="shrink-0">
            <CardTitle className="flex items-center gap-2">
              Ruangan
            </CardTitle>
          </div>

          <div className="flex flex-row items-center gap-2 sm:border-l sm:pl-6 min-h-[30px] w-full flex-1 overflow-x-auto scrollbar-thin pb-2 sm:pb-0">
            {ROOMS.map((room) => {
              const data = monitoringData.find(
                (d) => d.lab_id.replace(/\s+/g, '') === room.replace(/\s+/g, '')
              );
              let isOnline = false;
              if (data) {
                isOnline = isLabOnline(data, now);
              }

              return (
                <div
                  key={room}
                  className={`flex flex-col items-start justify-center gap-1 rounded-md px-3 py-2 text-sm font-semibold shadow-sm border transition-colors grow shrink-0 min-w-[120px] h-full ${
                    isOnline
                      ? 'bg-card border-green-200 dark:border-green-900'
                      : 'bg-muted/30 border-border opacity-70'
                  }`}
                  title={isOnline ? `Online (Kelas: ${data?.kelas || 'N/A'})` : 'Offline'}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${isOnline ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                    <span className="whitespace-nowrap">{room}</span>
                  </div>
                  <span className="text-xs leading-none font-normal text-muted-foreground truncate w-full">
                    {isOnline ? (data?.kelas || 'Tidak ada sesi') : 'Offline'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <Button asChild variant="outline" size="icon-sm" className="shrink-0 self-start sm:self-auto" title="Lihat Detail">
          <Link prefetch={false} href="/monitoring" aria-label="Lihat Detail">
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
