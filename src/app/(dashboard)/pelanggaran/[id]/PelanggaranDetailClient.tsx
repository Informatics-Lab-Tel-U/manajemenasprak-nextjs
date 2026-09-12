'use client';

/* eslint-disable react-doctor/no-chain-state-updates, react-doctor/no-cascading-set-state, react-doctor/no-effect-chain, react-doctor/rendering-hydration-no-flicker */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpDown,
  CheckCircle2,
  Download,
  Lock,
  Plus,
  Search,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import PelanggaranAddModal from '@/components/pelanggaran/PelanggaranAddModal';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import type { Pelanggaran, Praktikum } from '@/types/database';
import type { Role } from '@/config/rbac';

import { usePelanggaranDetail } from '@/hooks/usePelanggaran';
import { useTermStore } from '@/store/useTermStore';

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
        kode: v.asprak?.kode ?? '—',
        nama: v.asprak?.nama_lengkap ?? '—',
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
      variant="ghost"
      size="sm"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      className="-ml-3 h-8 gap-1 px-3"
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
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
    error: _error,
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

  // Use praktikum from hook (which includes the one from props as initial state)
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

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const { activeTerm, setActiveTerm } = useTermStore();
  const hasSyncedTermRef = React.useRef(false);

  React.useEffect(() => {
    if (!praktikum?.tahun_ajaran) return;

    if (!hasSyncedTermRef.current) {
      // First load: force global term to match this detail page
      if (activeTerm !== praktikum.tahun_ajaran) {
        setActiveTerm(praktikum.tahun_ajaran);
      }
      hasSyncedTermRef.current = true;
    } else {
      if (activeTerm !== praktikum.tahun_ajaran) {
        toast.info('Tahun ajaran diubah, mengalihkan ke daftar pelanggaran...');
        // eslint-disable-next-line react-doctor/nextjs-no-client-side-redirect
        router.push('/pelanggaran');
      }
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
          <span className="text-sm text-muted-foreground whitespace-nowrap">
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
            <div className="font-medium">{v.asprak?.nama_lengkap ?? '—'}</div>
            <div className="text-xs text-muted-foreground">
              {v.asprak?.kode} · {v.asprak?.nim}
            </div>
          </div>
        ),
      },
      {
        id: 'kelas_info',
        header: 'Mata Kuliah / Kelas',
        cell: ({ row: { original: v } }) => (
          <div>
            <div>{v.jadwal?.mata_kuliah?.nama_lengkap ?? '—'}</div>
            <div className="text-xs text-muted-foreground">
              Kelas {v.jadwal?.kelas} · {v.jadwal?.hari}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'modul',
        header: 'Modul',
        cell: ({ row }) => <span>{row.original.modul ? `Modul ${row.original.modul}` : '—'}</span>,
      },
      {
        accessorKey: 'jenis',
        header: ({ column }) => <SortHeader column={column} label="Jenis" />,
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs font-normal whitespace-nowrap">
            {row.original.jenis}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Aksi',
        cell: ({ row: { original: v } }) => (
          <div className="flex items-center gap-2">
            {isFinalized ? (
              <Badge className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" /> Final
              </Badge>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setViolationToDelete(v.id)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Hapus</span>
              </Button>
            )}
          </div>
        ),
      },
    ],
    [isFinalized, setViolationToDelete]
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
          ? `${data.id_asprak.length} pelanggaran berhasil dicatat!`
          : 'Pelanggaran berhasil dicatat!'
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
      <div className="container mx-auto max-w-[2000px] 2xl:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="card glass p-4 mb-6 space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 space-y-8">
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
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/pelanggaran')}
            className="hover:bg-accent/50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">
                {praktikum?.nama ?? 'Detail Praktikum'}
              </h1>
              {isFinalized && (
                <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-200/50 gap-1.5 py-0.5 px-2">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Finalized
                </Badge>
              )}
            </div>
            <p className="text-sm 2xl:text-base text-muted-foreground mt-1">
              {praktikum?.tahun_ajaran} · Detail log pelanggaran per asisten
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
          {/* Module Selector */}
          <Select value={selectedModul} onValueChange={setSelectedModul}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 bg-background/50 backdrop-blur-sm border-white/20">
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
                        {isModulFinal && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>

          {!isFinalized && (
            <Button
              onClick={() => {
                loadModalDependencies();
                setIsAddOpen(true);
              }}
              onMouseEnter={() => loadModalDependencies()}
              size="sm"
              className="h-9 gap-2 shadow-sm flex-1 sm:flex-none min-w-0"
              disabled={loading}
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Catat Pelanggaran</span>
            </Button>
          )}

          {canFinalize && (
            <Button
              onClick={() => setShowFinalize(true)}
              size="sm"
              variant="outline"
              className="h-9 gap-2 flex-1 sm:flex-none min-w-0 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
              disabled={loading}
            >
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Finalisasi Modul {selectedModul}</span>
            </Button>
          )}

          {isFinalized && role === 'ADMIN' && (
            <Button
              onClick={() => setShowUnfinalize(true)}
              size="sm"
              variant="outline"
              className="h-9 gap-2 flex-1 sm:flex-none min-w-0 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
              disabled={loading}
            >
              <RotateCcw className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Reset Finalisasi</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-9 gap-2 flex-1 sm:flex-none min-w-0 border-primary/20 hover:border-primary/40"
            disabled={loading || violations.length === 0}
          >
            <Download className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Search filter */}
      <div className="mb-4 flex items-center justify-between">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama / kode asprak..."
            value={(table.getColumn('asprak')?.getFilterValue() as string) ?? ''}
            onChange={(e) => table.getColumn('asprak')?.setFilterValue(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin mr-2" />
          )}
        </div>
      </div>

      {/* Dual table layout */}
      <div className="">
        {/* === Violation Log Table === */}
        <div className="card glass p-4 mb-6">
          <h2 className="text-sm 2xl:text-base font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Log Pelanggaran
          </h2>
          <div className="rounded-md border overflow-x-auto">
            <Table className="2xl:text-base">
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((h) => (
                      <TableHead key={h.id}>
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
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
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
                      <TableCell>
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Belum ada pelanggaran.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-end gap-2 mt-3">
            <span className="text-sm text-muted-foreground">
              Hal {table.getState().pagination.pageIndex + 1}/{Math.max(1, table.getPageCount())}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              ‹ Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next ›
            </Button>
          </div>
        </div>

        {/* === Recap Table === */}
        <div className="card glass p-4">
          <h2 className="text-sm 2xl:text-base font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Rekap per Asprak
          </h2>
          <div className="rounded-md border overflow-x-auto">
            <Table className="2xl:text-base">
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  {activeJenis.map((j) => (
                    <TableHead key={j} className="text-center text-xs whitespace-nowrap">
                      {j}
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-bold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recap.length ? (
                  recap.map((r) => (
                    <TableRow key={r.kode}>
                      <TableCell className="font-mono text-xs">{r.kode}</TableCell>
                      <TableCell className="text-sm">{r.nama}</TableCell>
                      {activeJenis.map((j) => (
                        <TableCell key={j} className="text-center text-sm">
                          {r.counts[j] ?? 0}
                        </TableCell>
                      ))}
                      <TableCell className="text-center font-bold">{r.total}</TableCell>
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
                        <Skeleton className="h-4 w-8 mx-auto" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-8 mx-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3 + activeJenis.length}
                      className="h-16 text-center text-muted-foreground text-sm"
                    >
                      Tidak ada data.
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
              className="bg-emerald-600 hover:bg-emerald-700 font-medium"
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
