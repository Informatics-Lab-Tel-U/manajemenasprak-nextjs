'use client';

import * as React from 'react';
import { AlertTriangle, Filter, Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type Column,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { fetchPelanggaranSummary } from '@/lib/fetchers/pelanggaranFetcher';
import type { PelanggaranSummaryEntry } from '@/services/pelanggaranService';
import type { Role } from '@/config/rbac';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useTermStore } from '@/store/useTermStore';

// Lebih lega dari px-2 default di sisi tepi tabel, supaya kolom pertama dan terakhir tidak menempel ke border.
const TABLE_EDGE_PADDING =
  '[&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4';

// Kolom angka dan kolom paling kanan dibuat rata kanan.
const RIGHT_ALIGNED_COLUMNS = ['modul', 'jam'];

interface Props {
  initialTahunAjaranList: string[];
  userRole: Role;
}

function SortHeader({ column, label }: { column: Column<any, unknown>; label: string }) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      className="-ml-3 gap-1 px-3"
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </Button>
  );
}

export default function PelanggaranRekapClient({ initialTahunAjaranList, userRole }: Props) {
  const { activeTerm, setActiveTerm } = useTermStore();
  const effectiveTahunAjaran = activeTerm || initialTahunAjaranList[0] || '';
  const [modul, setModul] = React.useState<string>('all');
  const [minCount, setMinCount] = React.useState<number>(1);
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<PelanggaranSummaryEntry[]>([]);
  const [mounted, setMounted] = React.useState(false);
  const [sorting, setSorting] = React.useState<SortingState>([]);

  React.useEffect(() => {
    setMounted(true);
    if (effectiveTahunAjaran) {
      if (!activeTerm && initialTahunAjaranList[0]) {
        setActiveTerm(initialTahunAjaranList[0]);
      }
      handleFetch(effectiveTahunAjaran, 'all', 1);
    }
  }, [effectiveTahunAjaran, activeTerm, initialTahunAjaranList, setActiveTerm]);

  async function handleFetch(t: string, m: string, c: number) {
    if (!t) return;
    setLoading(true);
    try {
      const modulVal = m === 'all' ? 0 : Number(m);
      const res = await fetchPelanggaranSummary(t, modulVal, c);
      if (res.ok) {
        setData(res.data || []);
      } else {
        toast.error(res.error || 'Gagal mengambil data rekap');
      }
    } finally {
      setLoading(false);
    }
  }

  const loadData = () => handleFetch(effectiveTahunAjaran, modul, minCount);

  const flatViolations = React.useMemo(() => {
    return data.flatMap((entry) =>
      (entry.violations || []).map((v: any) => ({
        ...v,
        _kode_asprak: entry.kode_asprak,
        _nama_asprak: entry.nama_asprak,
      }))
    );
  }, [data]);

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorFn: (row) => row.jadwal?.mata_kuliah?.praktikum?.nama ?? '—',
        id: 'mk',
        header: ({ column }) => <SortHeader column={column} label="MK" />,
        cell: ({ row }) => (
          <div className="max-w-[200px] truncate font-medium">{row.getValue('mk')}</div>
        ),
      },
      {
        accessorFn: (row) => row._kode_asprak,
        id: 'asprak',
        header: ({ column }) => <SortHeader column={column} label="Kode Asprak" />,
        cell: ({ row }) => (
          <div className="space-y-1">
            <Badge variant="outline" className="px-1.5">
              {row.getValue('asprak')}
            </Badge>
            <div className="max-w-[180px] truncate text-xs text-muted-foreground">
              {row.original._nama_asprak}
            </div>
          </div>
        ),
      },
      {
        accessorFn: (row) => row.jadwal?.kelas ?? '—',
        id: 'kelas',
        header: 'Kelas',
        cell: ({ row }) => <span className="text-sm">{row.getValue('kelas')}</span>,
      },
      {
        accessorKey: 'jenis',
        header: 'Jenis',
        cell: ({ row }) => (
          <Badge variant="outline" className="px-1.5 text-muted-foreground">
            {row.original.jenis}
          </Badge>
        ),
      },
      {
        accessorKey: 'modul',
        header: 'Modul',
        cell: ({ row }) => <span className="text-sm">{row.getValue('modul') ?? '—'}</span>,
      },
      {
        accessorFn: (row) => row.jadwal?.jam ?? '—',
        id: 'jam',
        header: 'Jam',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.getValue('jam')}</span>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: flatViolations,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (!mounted) return null;

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 relative space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">Rekap Pelanggaran</h1>
          <p className="text-sm 2xl:text-base text-muted-foreground mt-1">
            Agregasi data pelanggaran asisten praktikum lintas praktikum
          </p>
        </div>
      </div>

      {userRole !== 'ADMIN' && userRole !== 'ASLAB' && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Halaman ini membutuhkan hak akses Admin atau Aslab untuk menampilkan rekapitulasi data agregat.
        </div>
      )}

      {/* Filters Accordion */}
      <Accordion type="single" collapsible defaultValue="filter" className="w-full">
        <AccordionItem value="filter" className="border rounded-xl px-4 bg-card/30">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <Filter size={20} className="text-muted-foreground" />
              <div className="text-left">
                <h3 className="font-semibold text-base">Filter Parameter</h3>
                <p className="text-sm font-normal text-muted-foreground">
                  Sesuaikan data rekap pelanggaran yang ingin ditampilkan.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <label className="space-y-1.5 block">
                <span className="text-xs font-medium text-muted-foreground">Target Modul</span>
                <Select value={modul} onValueChange={setModul}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih Modul" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Modul</SelectItem>
                    {Array.from({ length: 16 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        Modul {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-1.5 block">
                <span className="text-xs font-medium text-muted-foreground">
                  Min. Pelanggaran
                </span>
                <Input
                  type="number"
                  min={1}
                  value={minCount}
                  onChange={(e) => setMinCount(Number(e.target.value))}
                  className="w-full"
                />
              </label>

              <Button onClick={loadData} disabled={loading}>
                {loading ? (
                  <Spinner className="h-4 w-4 mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Tampilkan
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Results Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Daftar Pelanggaran</h3>
          <Badge variant="outline" className="px-1.5 text-muted-foreground">
            {flatViolations.length} data
          </Badge>
        </div>

        <div className="overflow-hidden rounded-md border">
          <Table className={`table-fixed w-full ${TABLE_EDGE_PADDING}`}>
            <TableHeader className="bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={RIGHT_ALIGNED_COLUMNS.includes(header.column.id) ? 'text-right' : undefined}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-4 w-8" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-4 w-16" />
                    </TableCell>
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={RIGHT_ALIGNED_COLUMNS.includes(cell.column.id) ? 'text-right' : undefined}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-sm">Tidak ada data pelanggaran yang ditemukan.</p>
                      <p className="text-xs opacity-60">Coba sesuaikan filter pencarian Anda</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {!loading && flatViolations.length > 0 && (
          <div className="flex flex-col gap-4 md:gap-0 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <p className="text-sm font-medium whitespace-nowrap">Baris per halaman</p>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger size="sm" className="w-full sm:w-[90px]">
                  <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 50, 100].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                  <SelectItem value="10000">Semua</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row sm:items-center sm:justify-end">
              <div className="flex w-full sm:w-auto sm:min-w-[120px] items-center justify-center text-sm font-medium order-3 sm:order-none">
                Halaman {table.getState().pagination.pageIndex + 1} dari {table.getPageCount() || 1}
              </div>
              <div className="flex gap-2 justify-between sm:justify-end sm:gap-2 order-2 sm:order-none sm:ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="flex-1 sm:flex-none"
                >
                  <ChevronLeft className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline ml-1">Sebelumnya</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="flex-1 sm:flex-none"
                >
                  <span className="hidden sm:inline">Berikutnya</span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 sm:ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
