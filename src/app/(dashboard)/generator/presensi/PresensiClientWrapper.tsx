'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const PresensiGeneratorClient = dynamic(() => import('./PresensiGeneratorClient'), {
  ssr: false,
  loading: () => (
    <div className="w-full space-y-6">
      <Card className="bg-transparent shadow-none border-border">
        <CardHeader>
          <Skeleton className="h-6 w-60" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  ),
});

export function PresensiClientWrapper() {
  return <PresensiGeneratorClient />;
}
