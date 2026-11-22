'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useIwanPolling } from '@/hooks/useIwanPolling';
import {
  useIwanEvidenceRealtime,
  type EvidenceLogItem,
} from '@/hooks/useIwanEvidenceRealtime';
import { fetchIwanData } from '@/lib/iwanPolling';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
} from 'lucide-react';

const DEFAULT_FORBIDDEN_PATTERNS = [
  'chatgpt',
  'chat.openai.com',
  'chatgpt.com',
  'openai.com',
  'claude.ai',
  'gemini.google.com',
  'deepseek',
];

const PRESET_SUGGESTIONS = [
  { label: 'ChatGPT', value: 'chatgpt' },
  { label: 'Claude', value: 'claude.ai' },
  { label: 'Gemini', value: 'gemini.google.com' },
  { label: 'DeepSeek', value: 'deepseek' },
  { label: 'Canva', value: 'canva.com' },
  { label: 'Midjourney', value: 'midjourney.com' },
  { label: 'Perplexity', value: 'perplexity.ai' },
  { label: 'Copilot', value: 'copilot.microsoft.com' },
  { label: 'Ideogram', value: 'ideogram.ai' },
  { label: 'QuillBot', value: 'quillbot.com' },
  { label: 'v0', value: 'v0.dev' },
];

function cleanDomainInput(raw: string): string {
  let cleaned = raw.trim().toLowerCase();
  cleaned = cleaned.replace(/^[a-z]+:\/\//i, '');
  cleaned = cleaned.replace(/^www\./i, '');
  cleaned = cleaned.split('/')[0].split('?')[0].split('#')[0].trim();
  return cleaned;
}

interface IwanPolicyResponse {
  forbiddenPatterns: string[];
  updatedAt: string;
}

const TABLE_EDGE_PADDING =
  '[&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4';

interface RoomOption {
  id: string;
  name: string;
}

function IwanEvidenceContent() {
  const searchParams = useSearchParams();
  const initialRoomParam = searchParams.get('roomId') || 'ALL';

  const [rooms, setRooms] = React.useState<RoomOption[]>([]);
  const [selectedRoomFilter, setSelectedRoomFilter] = React.useState<string>(initialRoomParam);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [realtimeEnabled, setRealtimeEnabled] = React.useState(true);

  const {
    logs,
    setLogs,
    isLoading,
    loadError,
    lastUpdated,
    loadEvidenceLogs,
  } = useIwanEvidenceRealtime({
    roomId: selectedRoomFilter,
    limit: 50,
    enabled: realtimeEnabled,
  });

  const [selectedEvidence, setSelectedEvidence] = React.useState<EvidenceLogItem | null>(null);
  const [deletingEvidence, setDeletingEvidence] = React.useState<EvidenceLogItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = React.useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  const [forbiddenPatterns, setForbiddenPatterns] = React.useState<string[]>(
    DEFAULT_FORBIDDEN_PATTERNS,
  );
  const [draftPatternsText, setDraftPatternsText] = React.useState<string>(
    DEFAULT_FORBIDDEN_PATTERNS.join('\n'),
  );
  const [isPolicyOpen, setIsPolicyOpen] = React.useState(false);
  const [isSavingPolicy, setIsSavingPolicy] = React.useState(false);

  const loadRoomOptions = React.useCallback(async (signal?: AbortSignal) => {
    const data = await fetchIwanData<RoomOption[]>('/api/iwan/rooms?view=options', signal);
    if (!signal?.aborted) setRooms(data);
  }, []);

  const loadPolicy = React.useCallback(async (signal?: AbortSignal) => {
    const data = await fetchIwanData<IwanPolicyResponse>('/api/iwan/policy', signal);
    if (!signal?.aborted && Array.isArray(data?.forbiddenPatterns)) {
      setForbiddenPatterns(data.forbiddenPatterns);
      setDraftPatternsText(data.forbiddenPatterns.join('\n'));
    }
  }, []);

  const fetchData = React.useCallback(async () => {
    try {
      await Promise.all([loadEvidenceLogs(), loadRoomOptions(), loadPolicy()]);
    } catch {
      toast.error('Gagal memuat log kecurangan');
    }
  }, [loadEvidenceLogs, loadRoomOptions, loadPolicy]);

  const pollLogs = React.useCallback(
    (signal: AbortSignal) => loadEvidenceLogs(signal),
    [loadEvidenceLogs],
  );

  useIwanPolling(pollLogs, 0, 'Gagal memuat log kecurangan');
  useIwanPolling(loadRoomOptions, 0, 'Gagal memuat daftar ruangan');
  useIwanPolling(loadPolicy, 0, 'Gagal memuat daftar kata kunci kecurangan');

  async function handleConfirmDelete() {
    if (!deletingEvidence) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/iwan/evidence/${deletingEvidence.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(`Bukti insiden ${deletingEvidence.deviceLabel} dihapus`);
        setLogs((prev) => prev.filter((item) => item.id !== deletingEvidence.id));
        setSelectedIds((prev) => {
          if (!prev.has(deletingEvidence.id)) return prev;
          const next = new Set(prev);
          next.delete(deletingEvidence.id);
          return next;
        });
        if (selectedEvidence?.id === deletingEvidence.id) {
          setSelectedEvidence(null);
        }
        setDeletingEvidence(null);
      } else {
        toast.error(json.error || 'Gagal menghapus bukti insiden');
      }
    } catch {
      toast.error('Terjadi kesalahan saat menghapus bukti insiden');
    } finally {
      setIsDeleting(false);
    }
  }

  const toggleSelectRow = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  async function handleConfirmBulkDelete() {
    const idsToDelete = logs.filter((l) => selectedIds.has(l.id)).map((l) => l.id);
    if (idsToDelete.length === 0) {
      setIsBulkDeleteOpen(false);
      return;
    }

    setIsBulkDeleting(true);
    try {
      // Try single-request bulk-delete endpoint first to minimize CF Workers requests
      const bulkRes = await fetch('/api/iwan/evidence/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToDelete }),
      });

      if (bulkRes.status === 404 || bulkRes.status === 405) {
        // Graceful fallback if backend bulk-delete route is not yet deployed
        const results = await Promise.all(
          idsToDelete.map((id) =>
            fetch(`/api/iwan/evidence/${id}`, { method: 'DELETE' }).then((r) => r.json()),
          ),
        );
        const failed = results.filter((r) => !r?.ok).length;
        if (failed > 0) {
          toast.error(`${failed} item gagal dihapus`);
        } else {
          toast.success(`${idsToDelete.length} bukti insiden dihapus`);
        }
      } else {
        const json = await bulkRes.json();
        if (!json?.ok) {
          toast.error(json?.error || 'Gagal menghapus bukti insiden terpilih');
          return;
        }
        toast.success(`${idsToDelete.length} bukti insiden dihapus`);
      }

      const deletedSet = new Set(idsToDelete);
      setLogs((prev) => prev.filter((item) => !deletedSet.has(item.id)));
      setSelectedIds(new Set());
      if (selectedEvidence && deletedSet.has(selectedEvidence.id)) {
        setSelectedEvidence(null);
      }
      setIsBulkDeleteOpen(false);
    } catch {
      toast.error('Terjadi kesalahan saat menghapus bukti insiden terpilih');
    } finally {
      setIsBulkDeleting(false);
    }
  }

  function handleAddPreset(presetVal: string) {
    const currentLines = draftPatternsText
      .split(/\r?\n/)
      .map((l) => cleanDomainInput(l))
      .filter(Boolean);
    const cleanedPreset = cleanDomainInput(presetVal);
    if (!currentLines.includes(cleanedPreset)) {
      const updated = [...currentLines, cleanedPreset].join('\n');
      setDraftPatternsText(updated);
      toast.info(`Preset "${cleanedPreset}" ditambahkan`);
    } else {
      toast.info(`"${cleanedPreset}" sudah ada di daftar`);
    }
  }

  async function handleSavePolicy() {
    const parsedPatterns = Array.from(
      new Set(
        draftPatternsText
          .split(/\r?\n/)
          .map((line) => cleanDomainInput(line))
          .filter(Boolean),
      ),
    );

    if (parsedPatterns.length === 0) {
      toast.error('Minimal harus ada 1 kata kunci kecurangan');
      return;
    }
    setIsSavingPolicy(true);
    try {
      const res = await fetch('/api/iwan/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forbiddenPatterns: parsedPatterns }),
      });
      const json = await res.json();
      if (json.ok && json.data?.forbiddenPatterns) {
        setForbiddenPatterns(json.data.forbiddenPatterns);
        setDraftPatternsText(json.data.forbiddenPatterns.join('\n'));
        setIsPolicyOpen(false);
        toast.success('Daftar kata kunci kecurangan disimpan dan disinkronkan');
      } else {
        toast.error(json.error || 'Gagal menyimpan daftar kata kunci');
      }
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan daftar kata kunci');
    } finally {
      setIsSavingPolicy(false);
    }
  }

  function formatRelativeTime(dateStr: string) {
    if (!lastUpdated) return new Date(dateStr).toLocaleString('id-ID');
    const diffSeconds = Math.max(0, Math.round((lastUpdated - new Date(dateStr).getTime()) / 1000));
    if (diffSeconds < 15) return 'Baru saja';
    if (diffSeconds < 60) return `${diffSeconds} detik lalu`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    return `${Math.floor(diffHours / 24)} hari lalu`;
  }

  const filteredLogs = logs.filter((item) => {
    if (selectedRoomFilter !== 'ALL' && item.roomId !== selectedRoomFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.deviceLabel.toLowerCase().includes(q) ||
        item.roomName.toLowerCase().includes(q) ||
        item.windowTitle.toLowerCase().includes(q) ||
        String(item.seatNumber).includes(q)
      );
    }
    return true;
  });

  const affectedRoomCount = new Set(filteredLogs.map((l) => l.roomId)).size;
  const affectedDeviceCount = new Set(filteredLogs.map((l) => l.deviceId)).size;

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedLogs = filteredLogs.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize,
  );

  const visibleIdSet = new Set(logs.map((l) => l.id));
  const activeSelectedCount = Array.from(selectedIds).filter((id) => visibleIdSet.has(id)).length;
  const pageSelectedCount = paginatedLogs.filter((l) => selectedIds.has(l.id)).length;
  const allPageSelected = paginatedLogs.length > 0 && pageSelectedCount === paginatedLogs.length;
  const somePageSelected = pageSelectedCount > 0 && !allPageSelected;

  const toggleSelectPage = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      paginatedLogs.forEach((l) => {
        if (checked) next.add(l.id);
        else next.delete(l.id);
      });
      return next;
    });
  };

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 space-y-6">
      {/* Header */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Log Kecurangan</h1>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="auto-refresh-evidence"
              checked={realtimeEnabled}
              onCheckedChange={setRealtimeEnabled}
            />
            <Label htmlFor="auto-refresh-evidence" className="text-sm font-normal">
              Live
            </Label>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDraftPatternsText(forbiddenPatterns.join('\n'));
              setIsPolicyOpen(true);
            }}
          >
            <Settings2 data-icon="inline-start" />
            Kata Kunci ({forbiddenPatterns.length})
          </Button>

          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw data-icon="inline-start" />
            Segarkan
          </Button>
        </div>
      </div>

      {/* Filter Bar & Inline Summary */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari label PC, nomor kursi, judul jendela..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-8"
            aria-label="Cari log kecurangan"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Badge
              variant={filteredLogs.length > 0 ? 'destructive' : 'outline'}
              className="tabular-nums"
            >
              {filteredLogs.length} insiden
            </Badge>
            <Badge variant="outline" className="text-muted-foreground tabular-nums">
              {affectedDeviceCount} PC · {affectedRoomCount} ruangan
            </Badge>
          </div>

          <Select
            value={selectedRoomFilter}
            onValueChange={(value) => {
              setSelectedRoomFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px]" aria-label="Filter ruangan laboratorium">
              <SelectValue placeholder="Pilih Ruangan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Ruangan</SelectItem>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error State */}
      {loadError && !isLoading && (
        <div className="mb-4 flex flex-col items-start justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 sm:flex-row sm:items-center">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-destructive">Gagal memuat data log insiden</p>
            <p className="text-xs text-muted-foreground">{loadError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Bulk Action Bar */}
      {activeSelectedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-4 py-2.5">
          <span className="text-sm font-medium tabular-nums">
            {activeSelectedCount} item dipilih
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {filteredLogs.length > paginatedLogs.length && activeSelectedCount < filteredLogs.length && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set(filteredLogs.map((l) => l.id)))}
              >
                Pilih semua ({filteredLogs.length})
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              disabled={isBulkDeleting}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setIsBulkDeleteOpen(true)}
              disabled={isBulkDeleting}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Hapus Terpilih ({activeSelectedCount})
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table className={`2xl:text-base ${TABLE_EDGE_PADDING}`}>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allPageSelected ? true : somePageSelected ? 'indeterminate' : false}
                  onCheckedChange={(checked) => toggleSelectPage(checked === true)}
                  aria-label="Pilih semua baris di halaman ini"
                  disabled={paginatedLogs.length === 0}
                />
              </TableHead>
              <TableHead className="w-[180px]">Waktu Deteksi</TableHead>
              <TableHead className="w-[140px]">Ruangan</TableHead>
              <TableHead className="w-[150px]">Kursi &amp; Label PC</TableHead>
              <TableHead>Judul Jendela Terdeteksi</TableHead>
              <TableHead className="w-[140px]">Bukti Layar</TableHead>
              <TableHead className="w-[140px] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-36 text-center text-muted-foreground">
                  Memuat daftar log kecurangan...
                </TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center">
                  {searchQuery.trim() || selectedRoomFilter !== 'ALL' ? (
                    <div className="mx-auto flex max-w-md flex-col items-center gap-2 py-4">
                      <p className="text-sm font-medium">
                        Tidak ada log kecurangan yang sesuai dengan filter saat ini.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ubah kata kunci pencarian atau tampilkan seluruh ruangan laboratorium.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-1"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedRoomFilter('ALL');
                          setCurrentPage(1);
                        }}
                      >
                        Reset Filter
                      </Button>
                    </div>
                  ) : (
                    <div className="mx-auto flex max-w-md flex-col items-center gap-2 py-4">
                      <p className="text-sm font-medium">
                        Belum ada log kecurangan yang tercatat.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tangkapan layar otomatis tercatat saat PC praktikan membuka ChatGPT.
                      </p>
                      <Button asChild variant="outline" size="sm" className="mt-1">
                        <Link href="/iwan/devices">Periksa Status PC Terdaftar</Link>
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paginatedLogs.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={(checked) => toggleSelectRow(item.id, checked === true)}
                      aria-label={`Pilih bukti ${item.deviceLabel} kursi ${item.seatNumber}`}
                    />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    <div className="font-medium text-foreground">
                      {formatRelativeTime(item.detectedAt)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(item.detectedAt).toLocaleString('id-ID', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="px-1.5 text-muted-foreground">
                      {item.roomName}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">
                    <span className="text-destructive">
                      #{String(item.seatNumber).padStart(2, '0')}
                    </span>{' '}
                    · {item.deviceLabel}
                  </TableCell>
                  <TableCell className="max-w-[360px]">
                    <p
                      className="truncate text-foreground"
                      title={item.windowTitle}
                    >
                      {item.windowTitle}
                    </p>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setSelectedEvidence(item)}
                      className="group relative block h-12 w-20 overflow-hidden rounded border bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      aria-label={`Perbesar bukti layar ${item.deviceLabel} kursi ${item.seatNumber}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.screenshotUrl}
                        alt={`Thumbnail bukti ${item.deviceLabel}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition-opacity group-hover:opacity-80"
                      />
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedEvidence(item)}
                      >
                        <Eye className="h-4 w-4" />
                        Bukti
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Hapus bukti insiden ${item.deviceLabel}`}
                        onClick={() => setDeletingEvidence(item)}
                        className="border-muted-foreground/40 text-destructive hover:bg-destructive/10 hover:text-destructive dark:border-muted-foreground/40 dark:hover:bg-destructive/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-0">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <p className="text-sm font-medium whitespace-nowrap">Baris per halaman</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger size="sm" className="w-full sm:w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              <SelectGroup>
                {[10, 20, 30, 50].map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-0">
          <div className="order-3 flex w-full items-center justify-center text-sm font-medium tabular-nums sm:order-none sm:w-auto sm:min-w-[120px]">
            Halaman {safeCurrentPage} dari {totalPages}
          </div>
          <div className="order-2 flex justify-between gap-2 sm:order-none sm:ml-4 sm:justify-end sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              className="flex-1 sm:flex-none"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span className="ml-1 hidden sm:inline">Sebelumnya</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="flex-1 sm:flex-none"
            >
              <span className="hidden sm:inline">Berikutnya</span>
              <ChevronRight className="h-4 w-4 shrink-0 sm:ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Preview Bukti Screenshot */}
      <Dialog
        open={Boolean(selectedEvidence)}
        onOpenChange={(open) => {
          if (!open) setSelectedEvidence(null);
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Bukti Kecurangan · {selectedEvidence?.roomName} (Kursi #
              {selectedEvidence ? String(selectedEvidence.seatNumber).padStart(2, '0') : ''} ·{' '}
              {selectedEvidence?.deviceLabel})
            </DialogTitle>
          </DialogHeader>
          {selectedEvidence && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="font-medium">{selectedEvidence.windowTitle}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {new Date(selectedEvidence.detectedAt).toLocaleString('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'medium',
                  })}
                </span>
              </div>
              <div className="overflow-hidden rounded-md border bg-muted/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedEvidence.screenshotUrl}
                  alt={`Bukti layar penuh ${selectedEvidence.deviceLabel}`}
                  className="max-h-[70vh] w-full object-contain"
                />
              </div>
              <DialogFooter className="flex-wrap justify-between gap-2 sm:justify-end">
                <Button asChild variant="outline" size="sm">
                  <a
                    href={selectedEvidence.screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Buka Gambar Asli
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeletingEvidence(selectedEvidence)}
                >
                  <Trash2 className="h-4 w-4" />
                  Hapus Bukti
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEvidence(null)}
                >
                  Tutup
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Konfigurasi Kata Kunci Kecurangan (Durable Objects) */}
      <Dialog open={isPolicyOpen} onOpenChange={setIsPolicyOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kata Kunci Kecurangan</DialogTitle>
          </DialogHeader>
          <div className="min-w-0 space-y-3 py-1">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Preset AI &amp; Domain Cepat (klik untuk menambahkan):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_SUGGESTIONS.map((preset) => {
                  const cleanedTarget = cleanDomainInput(preset.value);
                  const isAdded = draftPatternsText
                    .split(/\r?\n/)
                    .some((l) => cleanDomainInput(l) === cleanedTarget);
                  return (
                    <Badge
                      key={preset.value}
                      variant={isAdded ? 'secondary' : 'outline'}
                      className={`cursor-pointer transition-colors text-xs ${
                        isAdded
                          ? 'opacity-60 cursor-default'
                          : 'hover:bg-primary hover:text-primary-foreground'
                      }`}
                      onClick={() => !isAdded && handleAddPreset(preset.value)}
                    >
                      {isAdded ? '✓ ' : '+ '}
                      {preset.label}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="forbidden-patterns-textarea" className="text-xs text-muted-foreground">
                Satu kata kunci atau domain per baris (URL otomatis dibersihkan saat simpan)
              </Label>
              <Textarea
                id="forbidden-patterns-textarea"
                rows={7}
                value={draftPatternsText}
                onChange={(e) => setDraftPatternsText(e.target.value)}
                placeholder={'chatgpt\nclaude.ai\ngemini.google.com\ncanva.com'}
                className="h-44 max-h-44 w-full resize-none overflow-x-hidden overflow-y-auto break-all [field-sizing:fixed]"
              />
            </div>
          </div>
          <DialogFooter className="flex-wrap justify-between gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDraftPatternsText(DEFAULT_FORBIDDEN_PATTERNS.join('\n'))}
            >
              Reset Default
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPolicyOpen(false)}
                disabled={isSavingPolicy}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSavePolicy}
                disabled={isSavingPolicy || !draftPatternsText.trim()}
              >
                {isSavingPolicy ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Konfirmasi Hapus */}
      <AlertDialog
        open={Boolean(deletingEvidence)}
        onOpenChange={(open) => {
          if (!open) setDeletingEvidence(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Bukti Kecurangan?</AlertDialogTitle>
            <AlertDialogDescription>
              Catatan insiden untuk <strong>{deletingEvidence?.deviceLabel}</strong> (Kursi #
              {deletingEvidence ? String(deletingEvidence.seatNumber).padStart(2, '0') : ''} ·{' '}
              {deletingEvidence?.roomName}) beserta file screenshot di Supabase Storage akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Menghapus...' : 'Hapus Permanen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog Konfirmasi Hapus Massal */}
      <AlertDialog
        open={isBulkDeleteOpen}
        onOpenChange={(open) => {
          if (!isBulkDeleting) setIsBulkDeleteOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {activeSelectedCount} Bukti Kecurangan?</AlertDialogTitle>
            <AlertDialogDescription>
              Sebanyak <strong>{activeSelectedCount}</strong> catatan insiden beserta file
              screenshot terkait di Supabase Storage akan dihapus permanen dan tidak dapat
              dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={isBulkDeleting}
              onClick={handleConfirmBulkDelete}
              variant="destructive"
            >
              {isBulkDeleting ? 'Menghapus...' : `Hapus ${activeSelectedCount} Item`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function IwanEvidencePage() {
  return (
    <React.Suspense
      fallback={
        <div className="container mx-auto max-w-[2000px] 2xl:px-8 space-y-6">
          <div className="h-36 flex items-center justify-center text-sm text-muted-foreground">
            Memuat halaman log kecurangan...
          </div>
        </div>
      }
    >
      <IwanEvidenceContent />
    </React.Suspense>
  );
}
