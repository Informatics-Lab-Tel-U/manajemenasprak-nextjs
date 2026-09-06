'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Pencil,
  Trash2,
  Shield,
  ShieldCheck,
  User,
  ChevronLeft,
  ChevronRight,
  Key,
  Clock,
  Users,
  Archive,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ManajemenAkunFormModal } from './ManajemenAkunFormModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { ApproveRequestModal } from './ApproveRequestModal';
import { RejectRequestModal } from './RejectRequestModal';
import type { UserWithEmail } from '@/types/database';
import type { Role } from '@/config/rbac';

const ROLE_BADGE: Record<Role, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  ADMIN: { label: 'Admin', variant: 'default' },
  ASLAB: { label: 'Aslab', variant: 'secondary' },
  ASPRAK_KOOR: { label: 'Koor Asprak', variant: 'outline' },
  ASPRAK: { label: 'Asprak', variant: 'outline' },
  MAHASISWA: { label: 'Mahasiswa', variant: 'outline' },
  INTERN: { label: 'Intern', variant: 'outline' },
};

const ROLE_ICON: Record<Role, React.ElementType> = {
  ADMIN: ShieldCheck,
  ASLAB: Shield,
  ASPRAK_KOOR: User,
  ASPRAK: User,
  MAHASISWA: User,
  INTERN: User,
};

export function ManajemenAkunClientPage({
  users,
  requests = [],
  archivedUsers = [],
}: {
  users: UserWithEmail[];
  requests?: UserWithEmail[];
  archivedUsers?: UserWithEmail[];
}) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<UserWithEmail | null>(null);
  const [passwordTarget, setPasswordTarget] = React.useState<UserWithEmail | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<UserWithEmail | null>(null);
  const [restoreTarget, setRestoreTarget] = React.useState<UserWithEmail | null>(null);
  const [approveTarget, setApproveTarget] = React.useState<UserWithEmail | null>(null);
  const [rejectTarget, setRejectTarget] = React.useState<UserWithEmail | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isRestoring, setIsRestoring] = React.useState(false);

  const pendingCount = React.useMemo(() => {
    return requests.filter((r) => r.status === 'PENDING').length;
  }, [requests]);

  const userColumns = React.useMemo<ColumnDef<UserWithEmail>[]>(
    () => [
      {
        accessorKey: 'nama_lengkap',
        header: 'Nama',
        cell: ({ row }) => <span className="font-medium">{row.original.nama_lengkap}</span>,
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground font-mono text-xs">{row.original.email}</span>
            {row.original.provider === 'azure' && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground border-border/60">
                SSO
              </Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => {
          const role = row.original.role;
          const badgeCfg = ROLE_BADGE[role] || { label: role || 'Unknown', variant: 'outline' };
          const RoleIcon = ROLE_ICON[role] || User;
          return (
            <Badge variant={badgeCfg.variant as any} className="gap-1">
              <RoleIcon className="h-3 w-3" />
              {badgeCfg.label}
            </Badge>
          );
        },
      },
      {
        id: 'apps_access',
        header: 'Akses Aplikasi',
        cell: ({ row }) => {
          const externalApps = (row.original.app_roles || []).filter(
            (r) => r.app_slug !== 'manajemenasprak'
          );

          if (externalApps.length === 0) {
            return <span className="text-xs text-muted-foreground">Hanya Portal</span>;
          }

          const visibleApps = externalApps.slice(0, 2);
          const remainingCount = externalApps.length - visibleApps.length;

          return (
            <div className="flex flex-wrap items-center gap-1.5">
              {visibleApps.map((app) => {
                const appTitle =
                  app.app_name || (app.app_slug === 'intern-logbook' ? 'Logbook' : app.app_slug);
                const roleTitle =
                  app.role === 'INTERN'
                    ? 'Intern'
                    : app.role === 'ASLAB'
                    ? 'Reviewer'
                    : app.role === 'ADMIN'
                    ? 'Admin'
                    : app.role;

                return (
                  <Badge
                    key={app.app_slug}
                    variant="secondary"
                    className="font-normal text-xs"
                  >
                    {appTitle} · {roleTitle}
                  </Badge>
                );
              })}
              {remainingCount > 0 && (
                <Badge variant="outline" className="font-normal text-xs text-muted-foreground">
                  +{remainingCount} lainnya
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Terdaftar',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {new Date(row.original.created_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-center">Aksi</div>,
        cell: ({ row }) => {
          const isSso = row.original.provider === 'azure';
          return (
            <div className="flex justify-center gap-1">
              {!isSso && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPasswordTarget(row.original)}
                  title="Ubah Kata Sandi"
                  className="text-primary hover:text-primary"
                >
                  <Key className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditTarget(row.original)}
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteTarget(row.original)}
                title="Hapus"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const requestColumns = React.useMemo<ColumnDef<UserWithEmail>[]>(
    () => [
      {
        accessorKey: 'nama_lengkap',
        header: 'Nama Pengaju',
        cell: ({ row }) => <span className="font-medium">{row.original.nama_lengkap}</span>,
      },
      {
        accessorKey: 'email',
        header: 'Email SSO Kampus',
        cell: ({ row }) => <span className="text-muted-foreground font-mono text-xs">{row.original.email}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status;
          if (status === 'PENDING') {
            return (
              <Badge variant="outline">
                Menunggu Persetujuan
              </Badge>
            );
          }
          if (status === 'REJECTED') {
            return (
              <Badge variant="destructive">
                Ditolak
              </Badge>
            );
          }
          return (
            <Badge variant="secondary">
              Disetujui
            </Badge>
          );
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Waktu Daftar',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {new Date(row.original.created_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ),
      },
      {
        id: 'request_actions',
        header: () => <div className="text-center">Aksi</div>,
        cell: ({ row }) => (
          <div className="flex justify-center gap-1.5">
            <Button
              size="sm"
              onClick={() => setApproveTarget(row.original)}
            >
              Setujui
            </Button>
            {row.original.status !== 'REJECTED' && (
              <Button
                size="sm"
                variant="destructive-outline"
                onClick={() => setRejectTarget(row.original)}
              >
                Tolak
              </Button>
            )}
          </div>
        ),
      },
    ],
    []
  );

  const archivedColumns = React.useMemo<ColumnDef<UserWithEmail>[]>(
    () => [
      {
        accessorKey: 'nama_lengkap',
        header: 'Nama Pengguna',
        cell: ({ row }) => <span className="font-medium">{row.original.nama_lengkap}</span>,
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-xs">{row.original.email}</span>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Role Terakhir',
        cell: ({ row }) => {
          const role = row.original.role;
          const badgeCfg = ROLE_BADGE[role] || { label: role || 'Unknown', variant: 'outline' };
          const RoleIcon = ROLE_ICON[role] || User;
          return (
            <Badge variant={badgeCfg.variant as any} className="gap-1">
              <RoleIcon className="h-3 w-3" />
              {badgeCfg.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'deleted_at',
        header: 'Waktu Dinonaktifkan',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.deleted_at
              ? new Date(row.original.deleted_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '-'}
          </span>
        ),
      },
      {
        id: 'archived_actions',
        header: () => <div className="text-center">Aksi</div>,
        cell: ({ row }) => (
          <div className="flex justify-center gap-1.5">
            <Button
              size="sm"
              onClick={() => setRestoreTarget(row.original)}
            >
              Pulihkan
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const usersTable = useReactTable({
    data: users,
    columns: userColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const requestsTable = useReactTable({
    data: requests,
    columns: requestColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const archivedTable = useReactTable({
    data: archivedUsers,
    columns: archivedColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      toast.success(`Akun "${deleteTarget.nama_lengkap}" berhasil dinonaktifkan.`);
      router.refresh();
    } catch (err: any) {
      toast.error(`Gagal menonaktifkan akun: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function handleRestore() {
    if (!restoreTarget) return;
    setIsRestoring(true);
    try {
      const res = await fetch(`/api/admin/users/${restoreTarget.id}/restore`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      toast.success(`Akun "${restoreTarget.nama_lengkap}" berhasil dipulihkan.`);
      router.refresh();
    } catch (err: any) {
      toast.error(`Gagal memulihkan akun: ${err.message}`);
    } finally {
      setIsRestoring(false);
      setRestoreTarget(null);
    }
  }

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 relative space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">Manajemen Akun</h1>
          <p className="text-sm 2xl:text-base text-muted-foreground mt-1">
            Kelola akun pengguna dan permintaan akses sistem laboratorium
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Akun Manual
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="glass border border-border/50 p-1">
          <TabsTrigger value="users" className="gap-2 text-xs sm:text-sm">
            <Users className="h-4 w-4" />
            Akun Aktif ({users.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2 text-xs sm:text-sm">
            <Clock className="h-4 w-4" />
            Permintaan Akses
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-2 text-xs sm:text-sm">
            <Archive className="h-4 w-4" />
            Akun Dinonaktifkan ({archivedUsers.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Active Users */}
        <TabsContent value="users" className="space-y-4">
          <div className="card glass p-6 border border-border/50">
            <div className="rounded-md border mb-4 overflow-hidden">
              <Table className="2xl:text-base">
                <TableHeader className="bg-muted/40">
                  {usersTable.getHeaderGroups().map((headerGroup) => (
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
                  {usersTable.getRowModel().rows?.length ? (
                    usersTable.getRowModel().rows.map((row) => (
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
                      <TableCell
                        colSpan={userColumns.length}
                        className="h-32 text-center text-muted-foreground py-12"
                      >
                        Belum ada akun aktif terdaftar.
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
                  value={`${usersTable.getState().pagination.pageSize}`}
                  onValueChange={(value) => usersTable.setPageSize(Number(value))}
                >
                  <SelectTrigger className="h-8 w-full sm:w-[70px]">
                    <SelectValue placeholder={usersTable.getState().pagination.pageSize} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    <SelectGroup>
                      {[10, 20, 30, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row sm:items-center sm:justify-end">
                <div className="flex w-full sm:w-auto sm:min-w-[120px] items-center justify-center text-sm font-medium">
                  Halaman {usersTable.getState().pagination.pageIndex + 1} dari {Math.max(1, usersTable.getPageCount())}
                </div>
                <div className="flex gap-2 justify-between sm:justify-end sm:ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => usersTable.previousPage()}
                    disabled={!usersTable.getCanPreviousPage()}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Sebelumnya</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => usersTable.nextPage()}
                    disabled={!usersTable.getCanNextPage()}
                  >
                    <span className="hidden sm:inline">Berikutnya</span>
                    <ChevronRight className="h-4 w-4 sm:ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Access Requests */}
        <TabsContent value="requests" className="space-y-4">
          <div className="card glass p-6 border border-border/50">
            <div className="rounded-md border mb-4 overflow-hidden">
              <Table className="2xl:text-base">
                <TableHeader className="bg-muted/40">
                  {requestsTable.getHeaderGroups().map((headerGroup) => (
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
                  {requestsTable.getRowModel().rows?.length ? (
                    requestsTable.getRowModel().rows.map((row) => (
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
                      <TableCell
                        colSpan={requestColumns.length}
                        className="h-32 text-center text-muted-foreground py-12"
                      >
                        Tidak ada permintaan akses yang pending atau ditolak saat ini.
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
                  value={`${requestsTable.getState().pagination.pageSize}`}
                  onValueChange={(value) => requestsTable.setPageSize(Number(value))}
                >
                  <SelectTrigger className="h-8 w-full sm:w-[70px]">
                    <SelectValue placeholder={requestsTable.getState().pagination.pageSize} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    <SelectGroup>
                      {[10, 20, 30, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row sm:items-center sm:justify-end">
                <div className="flex w-full sm:w-auto sm:min-w-[120px] items-center justify-center text-sm font-medium">
                  Halaman {requestsTable.getState().pagination.pageIndex + 1} dari {Math.max(1, requestsTable.getPageCount())}
                </div>
                <div className="flex gap-2 justify-between sm:justify-end sm:ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => requestsTable.previousPage()}
                    disabled={!requestsTable.getCanPreviousPage()}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Sebelumnya</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => requestsTable.nextPage()}
                    disabled={!requestsTable.getCanNextPage()}
                  >
                    <span className="hidden sm:inline">Berikutnya</span>
                    <ChevronRight className="h-4 w-4 sm:ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Archived Users */}
        <TabsContent value="archived" className="space-y-4">
          <div className="card glass p-6 border border-border/50">
            <div className="rounded-md border mb-4 overflow-hidden">
              <Table className="2xl:text-base">
                <TableHeader className="bg-muted/40">
                  {archivedTable.getHeaderGroups().map((headerGroup) => (
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
                  {archivedTable.getRowModel().rows?.length ? (
                    archivedTable.getRowModel().rows.map((row) => (
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
                      <TableCell
                        colSpan={archivedColumns.length}
                        className="h-32 text-center text-muted-foreground py-12"
                      >
                        Tidak ada akun yang sedang dinonaktifkan.
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
                  value={`${archivedTable.getState().pagination.pageSize}`}
                  onValueChange={(value) => archivedTable.setPageSize(Number(value))}
                >
                  <SelectTrigger className="h-8 w-full sm:w-[70px]">
                    <SelectValue placeholder={archivedTable.getState().pagination.pageSize} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    <SelectGroup>
                      {[10, 20, 30, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row sm:items-center sm:justify-end">
                <div className="flex w-full sm:w-auto sm:min-w-[120px] items-center justify-center text-sm font-medium">
                  Halaman {archivedTable.getState().pagination.pageIndex + 1} dari {Math.max(1, archivedTable.getPageCount())}
                </div>
                <div className="flex gap-2 justify-between sm:justify-end sm:ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => archivedTable.previousPage()}
                    disabled={!archivedTable.getCanPreviousPage()}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Sebelumnya</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => archivedTable.nextPage()}
                    disabled={!archivedTable.getCanNextPage()}
                  >
                    <span className="hidden sm:inline">Berikutnya</span>
                    <ChevronRight className="h-4 w-4 sm:ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Modal */}
      <ManajemenAkunFormModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        mode="create"
        onSuccess={() => router.refresh()}
      />

      {/* Edit Modal */}
      {editTarget && (
        <ManajemenAkunFormModal
          open={!!editTarget}
          onOpenChange={(open: boolean) => !open && setEditTarget(null)}
          mode="edit"
          user={editTarget}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan Akun Pengguna</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menonaktifkan akun <strong>{deleteTarget?.nama_lengkap}</strong>?
              Akses login pengguna akan ditutup, namun data riwayat tetap tersimpan dan dapat dipulihkan sewaktu-waktu di tab &quot;Akun Dinonaktifkan&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} variant="destructive">
              {isDeleting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Memproses...
                </>
              ) : 'Nonaktifkan Akun'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation */}
      <AlertDialog
        open={!!restoreTarget}
        onOpenChange={(open: boolean) => !open && setRestoreTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pulihkan Akun Pengguna?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun <strong>{restoreTarget?.nama_lengkap}</strong> ({restoreTarget?.email}) akan diaktifkan kembali. Pengguna akan dapat login kembali menggunakan kredensial atau akun SSO mereka.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={isRestoring}>
              {isRestoring ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Memulihkan...
                </>
              ) : 'Pulihkan Akun'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Password Modal */}
      <ChangePasswordModal
        open={!!passwordTarget}
        onOpenChange={(open: boolean) => !open && setPasswordTarget(null)}
        user={passwordTarget}
        onSuccess={() => router.refresh()}
      />

      {/* Approve Request Modal */}
      <ApproveRequestModal
        open={!!approveTarget}
        onOpenChange={(open) => !open && setApproveTarget(null)}
        user={approveTarget}
        onSuccess={() => {
          setApproveTarget(null);
          router.refresh();
        }}
      />

      {/* Reject Request Modal */}
      <RejectRequestModal
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        user={rejectTarget}
        onSuccess={() => {
          setRejectTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
}
