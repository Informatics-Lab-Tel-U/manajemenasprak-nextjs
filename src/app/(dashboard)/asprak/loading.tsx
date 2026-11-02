import { TableSkeleton } from '@/components/ui/TableSkeleton';

export default function AsprakLoading() {
  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 relative space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Data Asisten Praktikum</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola daftar asisten praktikum</p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3 items-center w-full md:w-auto">
          <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
        </div>
      </div>

      <div className="w-full">
        <div className="flex gap-4 mb-6 border-b pb-2">
          <div className="h-8 w-24 bg-muted animate-pulse rounded-sm" />
          <div className="h-8 w-24 bg-muted animate-pulse rounded-sm" />
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="h-9 w-full sm:max-w-sm bg-muted animate-pulse rounded-md" />
          </div>
          <TableSkeleton columnCount={5} rowCount={10} />
        </div>
      </div>
    </div>
  );
}
