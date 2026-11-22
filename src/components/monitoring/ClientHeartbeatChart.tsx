"use client"
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const InteractiveHeartbeatChart = dynamic(
  () => import('@/components/monitoring/InteractiveHeartbeatChart').then((mod) => mod.InteractiveHeartbeatChart),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-[480px] w-full rounded-xl" />
  }
);

export function ClientHeartbeatChart() {
  return <InteractiveHeartbeatChart />;
}
