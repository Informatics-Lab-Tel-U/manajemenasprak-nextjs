import { Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PelanggaranCardSkeleton } from '@/components/pelanggaran/PelanggaranCardSkeleton';

export default function PelanggaranLoading() {
  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Log Pelanggaran
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Log pelanggaran asisten praktikum per praktikum
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="size-4 text-muted-foreground hidden sm:block" aria-hidden="true" />
          <span className="text-sm font-medium text-muted-foreground hidden sm:block">
            Tahun Ajaran:
          </span>
          <Skeleton className="h-9 w-full sm:w-[180px] rounded-md" />
        </div>
      </div>
      <div
        aria-busy="true"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[2000px]:grid-cols-5"
      >
        <span className="sr-only">Memuat daftar log pelanggaran</span>
        {Array.from({ length: 12 }).map((_, i) => (
          <PelanggaranCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
