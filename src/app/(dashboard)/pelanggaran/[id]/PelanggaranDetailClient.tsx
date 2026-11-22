'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Lock,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
import { toast } from 'sonner';

import PelanggaranAddModal from '@/components/pelanggaran/PelanggaranAddModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Role } from '@/config/rbac';
import { usePelanggaranDetail } from '@/hooks/usePelanggaran';
import { useTermStore } from '@/store/useTermStore';
import type { Pelanggaran, Praktikum } from '@/types/database';

const TABLE_EDGE_PADDING =
  '[&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4';

interface Props {
  praktikum?: Praktikum;
  initialViolations?: Pelanggaran[];
  role: Role;
  idPraktikum: string;
}

function buildRecap(violations: Pelanggaran[]) {
  const map = new Map<
    string,
    { kode: string; nama: string; counts: Record<string, number>; total: number }
  >();
  for (const v of violations) {
    const id = v.id_asprak;
    if (!id) continue;
    if (!map.has(id)) {
      map.set(id, {
        kode: v.asprak?.kode ?? '-',
        nama: v.asprak?.nama_lengkap ?? '-',
        counts: {},
        total: 0,
      });
    }
    const entry = map.get(id)!;
    entry.counts[v.jenis] = (entry.counts[v.jenis] ?? 0) + 1;
    entry.total += 1;
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function SortHeader({ column, label }: { column: any; label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      className="-ml-3 gap-1.5 px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      {label}
      <ArrowUpDown className="size-3" aria-hidden="true" />
    </Button>
  );
}

export default function PelanggaranDetailClient({
  praktikum: initialPraktikum,
  initialViolations,
  role,
  idPraktikum,
}: Props) {
  const router = useRouter();
  const {
    violations,
    praktikum: hookPraktikum,
    asprakList,
    jadwalList,
    loading,
    isModalDepsLoading,
    loadModalDependencies,
    error,
    isFinalized,
    selectedModul,
    setSelectedModul,
    finalizedModules,
    refresh,
    addPelanggaran,
    deletePelanggaran,
    finalizeModul,
    unfinalizeModul,
  } = usePelanggaranDetail(idPraktikum, initialViolations, initialPraktikum);

  const praktikum = hookPraktikum || initialPraktikum;

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [showFinalize, setShowFinalize] = React.useState(false);
  const [isFinalizing, setIsFinalizing] = React.useState(false);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showUnfinalize, setShowUnfinalize] = React.useState(false);
  const [isUnfinalizing, setIsUnfinalizing] = React.useState(false);
  const [violationToDelete, setViolationToDelete] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const canFinalize =
    (role === 'ADMIN' || role === 'ASLAB' || role === 'ASPRAK_KOOR') && !isFinalized;

  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const { activeTerm, setActiveTerm } = useTermStore();
  const hasSyncedTermRef = React.useRef(false);

  React.useEffect(() => {
    if (!praktikum?.tahun_ajaran) return;

    if (!hasSyncedTermRef.current) {
      if (activeTerm !== praktikum.tahun_ajaran) {
        setActiveTerm(praktikum.tahun_ajaran);
      }
      hasSyncedTermRef.current = true;
    } else if (activeTerm !== praktikum.tahun_ajaran) {
      toast.info('Tahun ajaran diubah, mengalihkan ke daftar pelanggaran...');
      router.push('/pelanggaran');
    }
  }, [activeTerm, praktikum?.tahun_ajaran, router, setActiveTerm]);

  const filteredViolations = React.useMemo(() => {
    return violations.filter((v) => v.modul === Number(selectedModul));
  }, [violations, selectedModul]);

  const columns = React.useMemo<ColumnDef<Pelanggaran>[]>(
    () => [
      {
        accessorKey: 'created_at',
        header: ({ column }) => <SortHeader column={column} label="Tanggal" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap tabular-nums">
            {new Date(row.original.created_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        ),
      },
      {
        id: 'asprak',
        accessorFn: (v) => `${v.asprak?.nama_lengkap} ${v.asprak?.kode} ${v.asprak?.nim}`,
        header: ({ column }) => <SortHeader column={column} label="Asprak" />,
        cell: ({ row: { original: v } }) => (
          <div>
            <div className="font-medium text-foreground">{v.asprak?.nama_lengkap ?? '-'}</div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {v.asprak?.kode ?? '-'} · {v.asprak?.nim ?? '-'}
            </div>
          </div>
        ),
      },
      {
        id: 'kelas_info',
        header: 'Mata Kuliah / Kelas',
        cell: ({ row: { original: v } }) => (
          <div>
            <div className="text-foreground">{v.jadwal?.mata_kuliah?.nama_lengkap ?? '-'}</div>
            <div className="text-xs text-muted-foreground">
              Kelas {v.jadwal?.kelas ?? '-'} · {v.jadwal?.hari ?? '-'}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'modul',
        header: 'Modul',
        cell: ({ row }) => (
          <span className="tabular-nums text-sm">
            {row.original.modul ? `Modul ${row.original.modul}` : '-'}
          </span>
        ),
      },
      {
        accessorKey: 'jenis',
        header: ({ column }) => <SortHeader column={column} label="Jenis" />,
        cell: ({ row }) => (
          <Badge variant="outline" className="bg-transparent px-2 text-muted-foreground">
            {row.original.jenis}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Aksi',
        cell: ({ row: { original: v } }) => (
          <div className="flex items-center justify-end gap-2">
            {isFinalized ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                Final
              </span>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="bg-transparent border-border text-destructive hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive dark:hover:bg-destructive/20"
                onClick={() => setViolationToDelete(v.id)}
                aria-label={`Hapus pelanggaran ${v.asprak?.nama_lengkap ?? ''}`}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [isFinalized]
  );

  const table = useReactTable({
    data: filteredViolations,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  const recap = React.useMemo(() => buildRecap(filteredViolations), [filteredViolations]);

  const activeJenis = React.useMemo(() => {
    const set = new Set<string>();
    violations.forEach((v) => set.add(v.jenis));
    return Array.from(set).sort();
  }, [violations]);

  const searchValue = (table.getColumn('asprak')?.getFilterValue() as string) ?? '';

  async function handleAddViolation(data: {
    id_asprak: string[];
    id_jadwal: string;
    jenis: string;
    modul: number;
  }) {
    setIsSubmitting(true);
    try {
      const result = await addPelanggaran(data);
      if (!result.ok) throw new Error(result.error || 'Gagal mencatat pelanggaran');

      toast.success(
        data.id_asprak.length > 1
          ? `${data.id_asprak.length} pelanggaran berhasil dicatat`
          : 'Pelanggaran berhasil dicatat'
      );
      setIsAddOpen(false);
      refresh();
    } catch (err: any) {
      toast.error(err.message ?? 'Gagal mencatat pelanggaran');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteViolation() {
    if (!violationToDelete) return;
    setIsDeleting(true);
    try {
      await deletePelanggaran(violationToDelete);
    } finally {
      setIsDeleting(false);
      setViolationToDelete(null);
    }
  }

  async function handleFinalize() {
    setIsFinalizing(true);
    try {
      const res = await finalizeModul(Number(selectedModul));
      if (res.ok) {
        setShowFinalize(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memfinalisasi');
    } finally {
      setIsFinalizing(false);
    }
  }

  async function handleUnfinalize() {
    setIsUnfinalizing(true);
    try {
      const res = await unfinalizeModul(Number(selectedModul));
      if (res.ok) {
        setShowUnfinalize(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal mereset finalisasi');
    } finally {
      setIsUnfinalizing(false);
    }
  }

  function handleExport() {
    const params = new URLSearchParams({
      id_praktikum: idPraktikum,
      tahun_ajaran: praktikum?.tahun_ajaran || '',
    });
    window.location.href = `/api/pelanggaran/export?${params}`;
  }

  if (!mounted) {
    return (
      <div className="container mx-auto max-w-[2000px] 2xl:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-md" />
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 space-y-6 pb-8">
      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!violationToDelete}
        onOpenChange={(o) => !o && setViolationToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Pelanggaran</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data pelanggaran ini? Tindakan ini tidak dapat
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteViolation}
              variant="destructive"
              disabled={isDeleting}
            >
              {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            asChild
            variant="outline"
            size="icon"
            className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 shrink-0 bg-transparent border-border hover:bg-accent/50"
          >
            <Link prefetch={false} href="/pelanggaran" aria-label="Kembali ke daftar pelanggaran">
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground truncate">
                {praktikum?.nama ?? 'Detail Praktikum'}
              </h1>
              {isFinalized && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  Final
                </span>
              )}
            </div>
            {praktikum?.tahun_ajaran && (
              <p className="text-xs text-muted-foreground tabular-nums">
                Term {praktikum.tahun_ajaran} · Modul {selectedModul}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
          <Select value={selectedModul} onValueChange={setSelectedModul}>
            <SelectTrigger
              aria-label="Pilih modul"
              className="w-full sm:w-[180px] min-h-11 sm:min-h-9 bg-transparent border-border"
            >
              <SelectValue placeholder="Pilih Modul" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Daftar Modul</SelectLabel>
                {Array.from({ length: 15 }, (_, i) => {
                  const m = i + 1;
                  const isModulFinal = finalizedModules.includes(m);
                  return (
                    <SelectItem key={m} value={String(m)}>
                      <div className="flex items-center gap-2">
                        <span>Modul {m}</span>
                        {isModulFinal && (
                          <Lock className="size-3 text-muted-foreground" aria-hidden="true" />
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>

          {!isFinalized && (
            <Button
              type="button"
              onClick={() => {
                loadModalDependencies();
                setIsAddOpen(true);
              }}
              onMouseEnter={() => loadModalDependencies()}
              size="sm"
              className="min-h-11 sm:min-h-9 gap-2 flex-1 sm:flex-none min-w-0"
              disabled={loading}
            >
              <Plus className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">Catat Pelanggaran</span>
            </Button>
          )}

          {canFinalize && (
            <Button
              type="button"
              onClick={() => setShowFinalize(true)}
              size="sm"
              variant="destructive-outline"
              className="min-h-11 sm:min-h-9 gap-2 flex-1 sm:flex-none min-w-0"
              disabled={loading}
            >
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">Finalisasi Modul {selectedModul}</span>
            </Button>
          )}

          {isFinalized && role === 'ADMIN' && (
            <Button
              type="button"
              onClick={() => setShowUnfinalize(true)}
              size="sm"
              variant="outline"
              className="min-h-11 sm:min-h-9 gap-2 flex-1 sm:flex-none min-w-0 bg-transparent border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
              disabled={loading}
            >
              <RotateCcw className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">Reset Finalisasi</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="min-h-11 sm:min-h-9 gap-2 flex-1 sm:flex-none min-w-0 bg-transparent border-border hover:bg-accent/50"
            disabled={loading || violations.length === 0}
          >
            <Download className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>Ekspor</span>
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-transparent px-4 py-3 text-sm text-destructive"
        >
          Gagal memuat data pelanggaran: {error}
        </div>
      )}

      {/* Search filter */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Cari nama atau kode asprak..."
            aria-label="Cari nama atau kode asprak"
            value={searchValue}
            onChange={(e) => table.getColumn('asprak')?.setFilterValue(e.target.value)}
            className="pl-9 pr-9 min-h-11 sm:min-h-9 bg-transparent border-border"
          />
          {searchValue.trim().length > 0 && (
            <button
              type="button"
              onClick={() => table.getColumn('asprak')?.setFilterValue('')}
              aria-label="Hapus pencarian asprak"
              className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {loading && (
          <div
            role="status"
            aria-label="Memuat data pelanggaran"
            className="size-4 rounded-full border-2 border-foreground border-t-transparent animate-spin shrink-0"
          />
        )}
      </div>

      {/* Dual table layout */}
      <div className="space-y-6">
        {/* Violation Log Table */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Log Pelanggaran</h2>
          <div className="overflow-x-auto rounded-lg border border-border bg-transparent">
            <Table className={`2xl:text-base ${TABLE_EDGE_PADDING}`}>
              <TableHeader className="bg-muted/30">
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((h) => (
                      <TableHead
                        key={h.id}
                        className={h.column.id === 'actions' ? 'text-right' : undefined}
                      >
                        {h.isPlaceholder
                          ? null
                          : flexRender(h.column.columnDef.header, h.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/20">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="ml-auto size-8 rounded-md" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {searchValue.trim()
                        ? `Tidak ada catatan untuk "${searchValue.trim()}".`
                        : `Belum ada pelanggaran pada Modul ${selectedModul}.`}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <div className="text-xs sm:text-sm font-medium text-muted-foreground tabular-nums mr-1">
              Halaman {table.getState().pagination.pageIndex + 1} dari{' '}
              {Math.max(1, table.getPageCount())}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="min-h-11 sm:min-h-8 bg-transparent border-border"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="min-h-11 sm:min-h-8 bg-transparent border-border"
            >
              <span className="hidden sm:inline">Berikutnya</span>
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Recap Table */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Rekap per Asprak</h2>
          <div className="overflow-x-auto rounded-lg border border-border bg-transparent">
            <Table className={`2xl:text-base ${TABLE_EDGE_PADDING}`}>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  {activeJenis.map((j) => (
                    <TableHead key={j} className="whitespace-nowrap text-right">
                      {j}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recap.length ? (
                  recap.map((r) => (
                    <TableRow key={r.kode} className="hover:bg-muted/20">
                      <TableCell>
                        <Badge variant="outline" className="bg-transparent px-2">
                          {r.kode}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{r.nama}</TableCell>
                      {activeJenis.map((j) => (
                        <TableCell key={j} className="text-right tabular-nums text-muted-foreground">
                          {r.counts[j] ?? 0}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold tabular-nums text-foreground">
                        {r.total}
                      </TableCell>
                    </TableRow>
                  ))
                ) : loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-4 w-8" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-4 w-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3 + activeJenis.length}
                      className="h-16 text-center text-muted-foreground"
                    >
                      Belum ada rekap pelanggaran pada Modul {selectedModul}.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <PelanggaranAddModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleAddViolation}
        isLoading={isSubmitting}
        isDepsLoading={isModalDepsLoading}
        praktikumList={praktikum ? [praktikum] : []}
        tahunAjaranList={praktikum ? [praktikum.tahun_ajaran] : []}
        asprakList={asprakList}
        jadwalList={jadwalList}
        initialTahunAjaran={praktikum?.tahun_ajaran}
        initialPraktikumId={praktikum?.id}
        initialModul={selectedModul}
      />

      {/* AlertDialogs for Module Finalization */}
      <AlertDialog open={showFinalize} onOpenChange={setShowFinalize}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalisasi Modul {selectedModul}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan mengunci semua data pelanggaran pada modul ini. Pastikan data sudah
              benar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isFinalizing}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleFinalize();
              }}
              disabled={isFinalizing}
              variant="destructive"
            >
              {isFinalizing ? 'Memproses...' : 'Finalisasi'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnfinalize} onOpenChange={setShowUnfinalize}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Finalisasi Modul {selectedModul}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan membuka kembali penguncian data pada modul ini. Gunakan hanya jika
              diperlukan perbaikan data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnfinalizing}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleUnfinalize();
              }}
              disabled={isUnfinalizing}
              className="bg-amber-600 hover:bg-amber-700 font-medium"
            >
              {isUnfinalizing ? 'Memproses...' : 'Reset'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
