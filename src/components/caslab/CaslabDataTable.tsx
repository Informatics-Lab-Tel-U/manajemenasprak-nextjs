'use client';

import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { CaslabCandidate, CaslabRoomAllocation } from '@/types/caslab';

interface CaslabRowData extends CaslabCandidate {
  seatNumber: number | null;
  roomName: string | null;
}

interface CaslabDataTableProps {
  candidates: CaslabCandidate[];
  allocations: CaslabRoomAllocation[];
  onUpdateCandidate: (id: string, updated: Partial<CaslabCandidate>) => void;
  onRemoveCandidate: (id: string) => void;
}

const TABLE_EDGE_PADDING =
  '[&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4';

const ALL_ROOMS_VALUE = '__all_rooms__';

export function CaslabDataTable({
  candidates,
  allocations,
  onUpdateCandidate,
  onRemoveCandidate,
}: CaslabDataTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKode, setEditKode] = useState('');

  // Map each candidate to their current assigned seat and room
  const fullRows = useMemo<CaslabRowData[]>(() => {
    const candidateMap = new Map<string, { seatNumber: number; roomName: string }>();

    allocations.forEach((alloc) => {
      alloc.seats.forEach((seat) => {
        if (seat.candidate) {
          candidateMap.set(seat.candidate.id, {
            seatNumber: seat.seatNumber,
            roomName: alloc.room.name,
          });
        }
      });
    });

    return candidates.map((c) => {
      const assignment = candidateMap.get(c.id);
      return {
        ...c,
        seatNumber: assignment?.seatNumber ?? null,
        roomName: assignment?.roomName ?? null,
      };
    });
  }, [candidates, allocations]);

  // Filter rows by search and room
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return fullRows.filter((row) => {
      const matchSearch =
        !q ||
        row.nama_lengkap.toLowerCase().includes(q) ||
        row.nim.toLowerCase().includes(q) ||
        row.kode.toLowerCase().includes(q) ||
        (row.roomName && row.roomName.toLowerCase().includes(q)) ||
        (row.seatNumber && String(row.seatNumber) === q);

      const matchRoom =
        !roomFilter ||
        roomFilter === ALL_ROOMS_VALUE ||
        row.roomName === roomFilter;

      return matchSearch && matchRoom;
    });
  }, [fullRows, searchQuery, roomFilter]);

  // Unique room names for filter dropdown
  const availableRooms = useMemo(() => {
    return Array.from(new Set(allocations.map((a) => a.room.name)));
  }, [allocations]);

  const handleStartEdit = (c: CaslabRowData) => {
    setEditingId(c.id);
    setEditKode(c.kode);
  };

  const handleSaveEdit = (id: string) => {
    const clean = editKode.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(clean)) {
      toast.error('Kode aslab harus 3 huruf kapital (contoh: MAB)');
      return;
    }
    onUpdateCandidate(id, { kode: clean, codeSource: 'manual' });
    setEditingId(null);
    toast.success('Kode aslab berhasil diperbarui');
  };

  const columns = useMemo<ColumnDef<CaslabRowData>[]>(
    () => [
      {
        id: 'no',
        header: () => <span className="w-10 block text-center">No</span>,
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-center block w-10">
            {row.index + 1}
          </span>
        ),
      },
      {
        accessorKey: 'seatNumber',
        header: 'Nomor Meja',
        cell: ({ row }) => {
          const seat = row.original.seatNumber;
          return seat ? (
            <Badge variant="outline" className="font-mono font-medium">
              Meja #{String(seat).padStart(2, '0')}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs italic">Belum di-plot</span>
          );
        },
      },
      {
        accessorKey: 'roomName',
        header: 'Ruangan',
        cell: ({ row }) => {
          const room = row.original.roomName;
          return room ? (
            <span className="font-medium text-xs">{room}</span>
          ) : (
            <span className="text-muted-foreground text-xs">-</span>
          );
        },
      },
      {
        accessorKey: 'kode',
        header: 'Kode Aslab',
        cell: ({ row }) => {
          const c = row.original;
          const isEditing = editingId === c.id;

          if (isEditing) {
            return (
              <div className="flex items-center gap-1">
                <Input
                  value={editKode}
                  onChange={(e) => setEditKode(e.target.value.toUpperCase())}
                  maxLength={3}
                  className="h-7 w-16 text-center font-mono font-bold text-xs uppercase p-1"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
                  onClick={() => handleSaveEdit(c.id)}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={() => setEditingId(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          }

          return (
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="font-mono font-bold tracking-wider">
                {c.kode}
              </Badge>
              {c.codeSource === 'generated' && (
                <span title="Dibuat otomatis dari inisial nama">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'nim',
        header: 'NIM',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.nim}</span>
        ),
      },
      {
        accessorKey: 'nama_lengkap',
        header: 'Nama Lengkap',
        cell: ({ row }) => (
          <span className="font-medium text-xs">{row.original.nama_lengkap}</span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="text-right block">Aksi</span>,
        cell: ({ row }) => {
          const c = row.original;
          const isEditing = editingId === c.id;

          return (
            <div className="flex justify-end gap-1">
              {!isEditing && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => handleStartEdit(c)}
                  title="Edit Kode Aslab"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onRemoveCandidate(c.id)}
                title="Hapus Peserta"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    [editingId, editKode]
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Filters (Matching PraktikanFilters) */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, NIM, kode aslab, atau meja..."
            className="pl-8"
          />
        </div>

        {availableRooms.length > 1 && (
          <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row">
            <Select
              value={roomFilter || ALL_ROOMS_VALUE}
              onValueChange={(val) => setRoomFilter(val === ALL_ROOMS_VALUE ? '' : val)}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Semua Ruangan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ROOMS_VALUE}>Semua Ruangan</SelectItem>
                {availableRooms.map((room) => (
                  <SelectItem key={room} value={room}>
                    {room}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Table (Matching PraktikanTable) */}
      <div className="overflow-hidden rounded-md border">
        <Table className={TABLE_EDGE_PADDING}>
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.column.id === 'actions' ? 'text-right' : undefined}
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Data tidak ditemukan
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls (Matching PraktikanTable) */}
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
    </div>
  );
}

