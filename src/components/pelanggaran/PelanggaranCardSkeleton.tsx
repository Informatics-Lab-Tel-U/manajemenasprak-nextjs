import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function PelanggaranCardSkeleton() {
  return (
    <Card className="h-full justify-between bg-transparent border border-border shadow-none py-5 gap-3">
      <CardHeader className="flex flex-row items-start justify-between gap-3 px-5">
        <Skeleton className="h-5 w-3/4 rounded-md" />
        <Skeleton className="size-4 rounded-sm shrink-0" />
      </CardHeader>

      <CardContent className="px-5 space-y-2">
        <Skeleton className="h-8 w-16 rounded-md" />
        <Skeleton className="h-3.5 w-40 rounded-md" />
      </CardContent>
    </Card>
  );
}
