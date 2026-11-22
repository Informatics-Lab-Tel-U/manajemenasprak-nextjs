'use client';

import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, Edit, Trash2, FilterX, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface JadwalPenggantiTableProps {
  data: any[];
  loading: boolean;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
}

const TABLE_EDGE_PADDING =
  '[&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4';

const DAY_ORDER: Record<string, number> = {
  Senin: 1,
  Selasa: 2,
  Rabu: 3,
  Kamis: 4,
  Jumat: 5,
  Sabtu: 6,
  Minggu: 7,
};

const formatTime = (time: string | undefined | null) => {
  if (!time) return '-';
  const startTime = time.split('-')[0].trim();
  const parts = startTime.split(':');
  if (parts.length >= 2) {
    const hh = parts[0].trim().padStart(2, '0');
    const mm = parts[1].trim().padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return startTime;
};

export default function JadwalPenggantiTable({
  data,
  loading,
  onEdit,
  onDelete,
}: JadwalPenggantiTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: 'mata_kuliah',
        header: 'Mata Kuliah',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{item.jadwal?.mata_kuliah?.nama_lengkap}</span>
              <span className="text-xs text-muted-foreground">
                {item.jadwal?.mata_kuliah?.praktikum?.nama}
              </span>
            </div>
          );
        },
      },
      {
        id: 'kelas',
        header: 'Kelas',
        cell: ({ row }) => (
          <Badge variant="outline">
            {row.original.jadwal?.kelas}
          </Badge>
        ),
      },
      {
        accessorKey: 'modul',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4 hover:bg-transparent"
          >
            Modul
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <Badge variant="secondary" className="tabular-nums">
            Modul {row.original.modul}
          </Badge>
        ),
      },
      {
        accessorKey: 'hari',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4 hover:bg-transparent whitespace-nowrap"
          >
            Hari Pengganti
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        sortingFn: (rowA, rowB) => {
          const dayA = rowA.original.hari || '';
          const dayB = rowB.original.hari || '';
          return (DAY_ORDER[dayA] || 99) - (DAY_ORDER[dayB] || 99);
        },
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.hari}</span>,
      },
      {
        accessorKey: 'jam',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4 hover:bg-transparent whitespace-nowrap"
          >
            Jam Pengganti
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {formatTime(row.original.jam)}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
              <span>Sesi {row.original.sesi}</span>
              <span className="text-muted-foreground/50">-</span>
              <span>{row.original.ruangan}</span>
            </div>
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-center">Aksi</div>,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex justify-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(item)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Edit jadwal pengganti"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(item.id)}
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                aria-label="Hapus jadwal pengganti"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [onEdit, onDelete]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-md border">
          <Table className={`2xl:text-base ${TABLE_EDGE_PADDING}`}>
            <TableHeader className="bg-muted">
              <TableRow>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TableHead key={i}>
                    <Skeleton className="h-5 w-full" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-md border">
        <Table className={`2xl:text-base ${TABLE_EDGE_PADDING}`}>
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/20 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <FilterX className="h-8 w-8 opacity-20" />
                    <p>Tidak ada jadwal pengganti ditemukan untuk term ini.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col gap-4 md:gap-0 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <p className="text-sm font-medium whitespace-nowrap">Baris per halaman</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger size="sm" className="w-full sm:w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              <SelectGroup>
                {[10, 20, 30, 50, 100].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex w-full sm:w-auto sm:min-w-[120px] items-center justify-center text-sm font-medium tabular-nums order-3 sm:order-none">
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
    </div>
  );
}
