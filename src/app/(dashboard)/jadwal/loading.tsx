import { Skeleton } from '@/components/ui/skeleton';

function JadwalTableSkeleton() {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-muted/50 border-b border-border">
          <th className="p-2 border-r border-border text-center min-w-[60px]">
            <Skeleton className="h-4 w-8 mx-auto" />
          </th>
          <th className="p-2 border-r border-border text-center min-w-[60px]">
            <Skeleton className="h-4 w-8 mx-auto" />
          </th>
          {Array.from({ length: 6 }).map((_, i) => (
            <th key={i} className="p-2 border-r border-border text-center min-w-[120px]">
              <Skeleton className="h-4 w-16 mx-auto" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 15 }).map((_, i) => (
          <tr key={i} className="border-b border-border/50">
            {i % 3 === 0 && (
              <td rowSpan={3} className="p-2 border-r border-border bg-muted/5 text-center">
                <Skeleton className="h-4 w-12 mx-auto" />
              </td>
            )}
            <td className="p-2 border-r border-border text-center">
              <Skeleton className="h-3 w-10 mx-auto" />
            </td>
            {Array.from({ length: 6 }).map((_, j) => (
              <td key={j} className="p-0 border-r border-border align-top relative min-w-[120px]">
                <div className="flex flex-col w-full h-full min-h-[60px] 2xl:min-h-[80px] p-1.5">
                  {(i + j) % 3 === 0 && <Skeleton className="flex-1 w-full rounded-md shadow-sm border border-border/50" />}
                </div>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function JadwalLoading() {
  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 relative space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
          <div>
            <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">Jadwal Praktikum</h1>
            <p className="text-sm 2xl:text-base text-muted-foreground mt-1">Jadwal per ruangan</p>
          </div>
          <div className="bg-muted/50 p-1.5 rounded-lg flex items-center gap-1 border border-border/50">
            <Skeleton className="h-8 w-16 sm:w-20 rounded-md" />
            <Skeleton className="h-8 w-16 sm:w-20 rounded-md" />
          </div>
        </div>

        <div className="flex flex-wrap md:flex-nowrap gap-2 md:gap-3 items-center w-full md:w-auto">
          <Skeleton className="h-10 flex-1 sm:flex-none sm:w-[140px]" />
          <Skeleton className="h-10 flex-1 sm:flex-none sm:w-[120px]" />
          <Skeleton className="h-10 w-[42px]" />
          <Skeleton className="h-10 w-full md:w-[180px]" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border shadow-sm bg-card/50 backdrop-blur-sm min-h-[400px]">
        <JadwalTableSkeleton />
      </div>
    </div>
  );
}
