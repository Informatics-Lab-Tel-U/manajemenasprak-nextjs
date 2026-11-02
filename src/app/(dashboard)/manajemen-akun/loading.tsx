import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Sama dengan padding tepi di tabel data (kolom pertama dan terakhir).
const TABLE_EDGE_PADDING =
  '[&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4';

export default function ManajemenAkunLoading() {
  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 relative space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">Manajemen Akun</h1>
          <p className="text-sm 2xl:text-base text-muted-foreground mt-1">
            Kelola akun pengguna yang terdaftar di sistem
          </p>
        </div>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Akun
        </Button>
      </div>

      <div className="space-y-4">
        <div className="overflow-hidden rounded-md border">
          <Table className={`2xl:text-base ${TABLE_EDGE_PADDING}`}>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Terdaftar</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls Skeleton */}
        <div className="flex flex-col gap-4 md:gap-0 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-16" />
          </div>

          <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex w-full sm:w-auto sm:min-w-[120px] items-center justify-center order-3 sm:order-none">
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex gap-2 justify-between sm:justify-end sm:gap-2 order-2 sm:order-none sm:ml-4">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Sebelumnya</span>
              </Button>
              <Button variant="outline" size="sm" disabled>
                <span className="hidden sm:inline">Berikutnya</span>
                <ChevronRight className="h-4 w-4 sm:ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
