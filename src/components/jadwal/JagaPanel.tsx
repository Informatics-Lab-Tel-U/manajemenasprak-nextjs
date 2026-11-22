import React, { useEffect, useState } from 'react';
import { Plus, Shield } from 'lucide-react';
import { toast } from 'sonner';

import { JagaCell } from '@/components/jadwal/JagaCell';
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
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DAYS } from '@/constants';
import { useJaga } from '@/hooks/useJaga';
import {
  bulkDeleteJadwalJaga,
  deleteJadwalJaga,
  deletePresensiJaga,
  submitManualPresensi,
} from '@/lib/fetchers/jagaFetcher';
import { usePresensiJagaStore } from '@/store/usePresensiJagaStore';
import { getShiftTimeString } from '@/utils/jagaUtils';

interface JagaPanelProps {
  term: string;
  selectedModul: string;
  filterDay?: string;
  hideInputButton?: boolean;
  userRole?: string;
  onRefreshTrigger?: number;
  onEdit?: (data: any) => void;
  onAdd?: (day: string, shift: number) => void;
  onDayChange?: (day: string) => void;
}

const SHIFT_NUMBERS = [1, 2, 3, 4];
const MIN_ASPRAK_COLS = 4;

export default function JagaPanel({
  term,
  selectedModul,
  filterDay,
  hideInputButton: _hideInputButton,
  userRole,
  onRefreshTrigger,
  onEdit,
  onAdd,
  onDayChange,
}: JagaPanelProps) {
  const isDefault = selectedModul === 'Default';
  const modulNum = isDefault ? 0 : parseInt(selectedModul.replace('Modul ', ''), 10);

  const [localDay, setLocalDay] = useState<string>(() => {
    const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
    const nowDay = dayNames[new Date().getDay()];
    return ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'].includes(nowDay)
      ? nowDay
      : 'SENIN';
  });
  const activeDay = (filterDay || localDay).toUpperCase();

  const { jagaList, loading, refresh } = useJaga(
    isDefault ? '' : term,
    isDefault ? undefined : modulNum,
    activeDay
  );

  const todayPresensi = usePresensiJagaStore((s) => s.todayPresensi);
  const modulPresensi = usePresensiJagaStore((s) => s.modulPresensi);
  const initPresensi = usePresensiJagaStore((s) => s.init);
  const loadPresensiForModul = usePresensiJagaStore((s) => s.loadPresensiForModul);

  useEffect(() => {
    initPresensi();
  }, [initPresensi]);

  useEffect(() => {
    if (term && modulNum > 0) {
      loadPresensiForModul(term, modulNum);
    }
  }, [term, modulNum, onRefreshTrigger, loadPresensiForModul]);

  useEffect(() => {
    if (onRefreshTrigger !== undefined && onRefreshTrigger > 0) {
      refresh();
    }
  }, [onRefreshTrigger, refresh]);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{
    id: string;
    code: string;
    id_asprak: string;
    shift: number;
  } | null>(null);
  const [deleteScope, setDeleteScope] = useState<'single' | 'bulk'>('single');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmedDelete = async () => {
    if (!deletingItem) return;
    const { id, code, id_asprak, shift } = deletingItem;
    setIsDeleting(true);
    try {
      if (deleteScope === 'bulk') {
        const { success, error } = await bulkDeleteJadwalJaga({
          id_asprak,
          tahun_ajaran: term,
          moduls: Array.from({ length: 16 }, (_, i) => i + 1),
          hari: activeDay,
          shift,
        });
        if (success) {
          toast.success(`Jadwal jaga ${code} berhasil dihapus dari semua modul`);
          refresh();
        } else {
          toast.error(error || 'Gagal menghapus bulk');
        }
      } else {
        const { success, error } = await deleteJadwalJaga(id);
        if (success) {
          toast.success('Jadwal jaga berhasil dihapus');
          refresh();
        } else {
          toast.error(error || 'Gagal menghapus');
        }
      }
    } catch {
      toast.error('Gagal menghapus jadwal jaga');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
    }
  };

  const handleQuickPresensi = async (jaga: any, status: 'HADIR' | 'TERLAMBAT') => {
    try {
      const res = await submitManualPresensi({
        idAsprak: jaga.id_asprak,
        tahunAjaran: term,
        modul: modulNum > 0 ? modulNum : 1,
        hari: activeDay,
        shift: jaga.shift,
        status,
        waktuMasuk: new Date().toISOString(),
      });
      if (res.success) {
        toast.success(res.message || `Presensi ${jaga.asprak?.kode || 'asisten'} berhasil dicatat`);
        if (term && modulNum > 0) {
          loadPresensiForModul(term, modulNum);
        }
        initPresensi();
      } else {
        toast.error(res.error || 'Gagal mencatat presensi');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan');
    }
  };

  const [deletingPresensiItem, setDeletingPresensiItem] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeletingPresensi, setIsDeletingPresensi] = useState(false);

  const handleConfirmedDeletePresensi = async () => {
    if (!deletingPresensiItem) return;
    setIsDeletingPresensi(true);
    try {
      const res = await deletePresensiJaga(deletingPresensiItem.id);
      if (res.success) {
        toast.success(res.message || 'Presensi berhasil dibatalkan');
        if (term && modulNum > 0) {
          loadPresensiForModul(term, modulNum);
        }
        initPresensi();
      } else {
        toast.error(res.error || 'Gagal membatalkan presensi');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan');
    } finally {
      setIsDeletingPresensi(false);
      setDeletingPresensiItem(null);
    }
  };

  const maxCols = Math.max(
    MIN_ASPRAK_COLS,
    ...SHIFT_NUMBERS.map((s) => jagaList.filter((j) => j.shift === s).length)
  );

  const renderContent = () => {
    if (isDefault) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground rounded-lg border border-dashed border-border bg-transparent min-h-[350px]">
          <Shield className="size-10 mb-3 opacity-25" aria-hidden="true" />
          <p className="text-sm font-medium">
            Pilih Modul (Modul 1 s/d 16) untuk melihat jadwal Jaga Aslab/Asprak.
          </p>
        </div>
      );
    }

    if (loading) {
      return (
        <div
          aria-busy="true"
          className="overflow-x-auto rounded-lg border border-border bg-transparent min-h-[300px]"
        >
          <span className="sr-only">Memuat jadwal jaga</span>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="p-2 border-r border-border min-w-[90px]">
                  <Skeleton className="h-4 w-12 mx-auto" />
                </th>
                {Array.from({ length: MIN_ASPRAK_COLS }).map((_, i) => (
                  <th key={i} className="p-2 border-r border-border min-w-[120px]">
                    <Skeleton className="h-4 w-16 mx-auto" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SHIFT_NUMBERS.map((s) => (
                <tr key={s} className="border-b border-border/50">
                  <td className="p-2 border-r border-border bg-muted/10">
                    <Skeleton className="h-10 w-14 mx-auto" />
                  </td>
                  {Array.from({ length: MIN_ASPRAK_COLS }).map((_, i) => (
                    <td key={i} className="p-0 border-r border-border">
                      <Skeleton className="h-[72px] w-full rounded-none" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto rounded-lg border border-border bg-transparent">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              <th className="p-2 border-r border-border text-center font-medium text-xs text-muted-foreground min-w-[90px]">
                Shift
              </th>
              <th
                colSpan={maxCols}
                className="p-2 border-r border-border text-center font-medium text-xs text-muted-foreground"
              >
                Jadwal Jaga
              </th>
              {userRole === 'ADMIN' && <th className="w-8 border-r border-border" />}
            </tr>
          </thead>
          <tbody>
            {SHIFT_NUMBERS.map((shiftNum) => {
              const shiftJaga = jagaList.filter((j) => j.shift === shiftNum);
              const shiftTime = getShiftTimeString(activeDay, shiftNum);
              const padded: (any | null)[] = [
                ...shiftJaga,
                ...Array(Math.max(0, maxCols - shiftJaga.length)).fill(null),
              ];

              return (
                <tr key={shiftNum} className="group/row border-b border-border/50">
                  <td className="p-2 border-r border-border bg-muted/10 text-center align-middle min-w-[90px]">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-semibold text-xs 2xl:text-sm text-foreground">
                        Shift {shiftNum}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground tabular-nums">
                        {shiftTime}
                      </span>
                    </div>
                  </td>

                  {padded.map((j, idx) => (
                    <td
                      key={j ? j.id : `empty-${shiftNum}-${idx}`}
                      className="group/cell p-0 border-r border-border min-w-[120px] 2xl:min-w-[140px]"
                      style={{ height: '1px' }}
                    >
                      <div className="h-full flex flex-col">
                        {j ? (
                          <JagaCell
                            jaga={j}
                            presensi={
                              modulPresensi.find(
                                (p) =>
                                  p.id_asprak === j.id_asprak &&
                                  p.shift === j.shift &&
                                  p.hari.toUpperCase() === activeDay &&
                                  (!modulNum || p.modul === modulNum)
                              ) ||
                              todayPresensi.find(
                                (p) =>
                                  p.id_asprak === j.id_asprak &&
                                  p.shift === j.shift &&
                                  p.hari.toUpperCase() === activeDay &&
                                  (!modulNum || p.modul === modulNum)
                              )
                            }
                            userRole={userRole}
                            onEdit={() =>
                              onEdit?.({
                                id: j.id,
                                id_asprak: j.id_asprak,
                                hari: j.hari,
                                shift: j.shift,
                              })
                            }
                            onDelete={() => {
                              setDeletingItem({
                                id: j.id,
                                code: j.asprak?.kode || 'Asisten',
                                id_asprak: j.id_asprak,
                                shift: shiftNum,
                              });
                              setDeleteScope('single');
                              setIsDeleteDialogOpen(true);
                            }}
                            onQuickPresensi={handleQuickPresensi}
                            onDeletePresensi={(presensiId, asprakName) =>
                              setDeletingPresensiItem({ id: presensiId, name: asprakName })
                            }
                          />
                        ) : userRole === 'ADMIN' ? (
                          <button
                            type="button"
                            onClick={() =>
                              onAdd
                                ? onAdd(activeDay, shiftNum)
                                : onEdit?.({ hari: activeDay, shift: shiftNum })
                            }
                            aria-label={`Tambah asisten Shift ${shiftNum}`}
                            className="flex-1 min-h-[72px] 2xl:min-h-[88px] w-full flex items-center justify-center group/empty hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                            title={`Tambah asisten Shift ${shiftNum}`}
                          >
                            <Plus
                              className="size-4 text-muted-foreground opacity-0 group-hover/empty:opacity-100 group-focus-visible/empty:opacity-100 transition-opacity"
                              aria-hidden="true"
                            />
                          </button>
                        ) : (
                          <div className="flex-1 min-h-[72px] 2xl:min-h-[88px]" />
                        )}
                      </div>
                    </td>
                  ))}

                  {userRole === 'ADMIN' && (
                    <td className="p-0 w-8 border-r border-border" style={{ height: '1px' }}>
                      <button
                        type="button"
                        onClick={() =>
                          onAdd
                            ? onAdd(activeDay, shiftNum)
                            : onEdit?.({ hari: activeDay, shift: shiftNum })
                        }
                        aria-label={`Tambah kolom asisten Shift ${shiftNum}`}
                        className="w-full h-full min-h-[72px] 2xl:min-h-[88px] flex items-center justify-center opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-[opacity,colors] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        title={`Tambah asisten Shift ${shiftNum}`}
                      >
                        <Plus className="size-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col h-full space-y-4">
        {!filterDay && (
          <div className="overflow-x-auto pb-0.5">
            <ToggleGroup
              type="single"
              value={activeDay}
              onValueChange={(value) => {
                if (value) {
                  setLocalDay(value);
                  onDayChange?.(value);
                }
              }}
              variant="outline"
              className="*:data-[slot=toggle-group-item]:px-4! *:data-[slot=toggle-group-item]:min-h-11 sm:*:data-[slot=toggle-group-item]:min-h-9 w-max"
            >
              {DAYS.map((d) => (
                <ToggleGroupItem key={d} value={d.toUpperCase()}>
                  {d.charAt(0) + d.slice(1).toLowerCase()}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        )}

        {renderContent()}

        {!isDefault && !loading && (
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-muted-foreground border-t border-border pt-3 px-1">
            <div className="flex items-center gap-1.5">
              <div className="size-3.5 rounded-sm bg-transparent ring-2 ring-inset ring-emerald-500" />
              <span>Hadir Tepat Waktu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3.5 rounded-sm bg-transparent ring-2 ring-inset ring-amber-500" />
              <span>Terlambat</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3.5 rounded-sm bg-transparent border border-border" />
              <span>Belum Hadir</span>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="flex flex-col gap-0 p-0 sm:max-w-lg overflow-hidden">
          <AlertDialogHeader className="border-b px-6 py-4 text-left block space-y-0">
            <AlertDialogTitle className="text-lg font-semibold text-destructive">
              Konfirmasi Hapus Jadwal
            </AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              Konfirmasi cakupan penghapusan jadwal jaga asisten
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 p-6 text-foreground">
            <p className="text-sm text-muted-foreground">
              Anda akan menghapus jadwal jaga untuk{' '}
              <strong className="text-foreground">{deletingItem?.code}</strong>. Pilih cakupan
              penghapusan di bawah ini:
            </p>

            <RadioGroup
              value={deleteScope}
              onValueChange={(val: any) => setDeleteScope(val)}
              className="gap-2.5"
            >
              <FieldLabel
                htmlFor="delete-scope-single"
                className="cursor-pointer transition-colors hover:bg-muted/40"
              >
                <Field orientation="horizontal">
                  <RadioGroupItem value="single" id="delete-scope-single" />
                  <FieldContent>
                    <FieldTitle className="text-sm">Hanya Modul Ini Saja</FieldTitle>
                    <FieldDescription className="text-xs">
                      Menghapus jadwal asisten hanya pada modul yang sedang dipilih sekarang.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>

              <FieldLabel
                htmlFor="delete-scope-bulk"
                className="cursor-pointer transition-colors hover:bg-muted/40"
              >
                <Field orientation="horizontal">
                  <RadioGroupItem value="bulk" id="delete-scope-bulk" />
                  <FieldContent>
                    <FieldTitle className="text-sm">Semua Modul</FieldTitle>
                    <FieldDescription className="text-xs">
                      Menghapus jadwal asisten dari seluruh modul untuk hari, shift, dan ruang yang
                      sama.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
            </RadioGroup>
          </div>

          <AlertDialogFooter className="border-t px-6 py-4 sm:justify-end gap-2">
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmedDelete();
              }}
              variant="destructive"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Spinner className="mr-2 size-4" /> Menghapus...
                </>
              ) : (
                'Ya, Hapus Jadwal'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Presensi confirmation dialog */}
      <AlertDialog
        open={Boolean(deletingPresensiItem)}
        onOpenChange={(open) => !open && setDeletingPresensiItem(null)}
      >
        <AlertDialogContent className="flex flex-col gap-0 p-0 sm:max-w-md overflow-hidden">
          <AlertDialogHeader className="border-b px-6 py-4 text-left block space-y-0">
            <AlertDialogTitle className="text-lg font-semibold text-destructive">
              Batalkan Presensi
            </AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              Konfirmasi pembatalan presensi asisten
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="p-6 text-foreground text-sm">
            <p className="text-muted-foreground">
              Apakah Anda yakin ingin membatalkan status kehadiran untuk{' '}
              <strong className="text-foreground">{deletingPresensiItem?.name}</strong>?
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Status kehadiran asisten ini akan dikembalikan menjadi belum hadir.
            </p>
          </div>

          <AlertDialogFooter className="border-t px-6 py-4 sm:justify-end gap-2">
            <AlertDialogCancel disabled={isDeletingPresensi}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmedDeletePresensi();
              }}
              variant="destructive"
              disabled={isDeletingPresensi}
            >
              {isDeletingPresensi ? (
                <>
                  <Spinner className="mr-2 size-4" /> Memproses...
                </>
              ) : (
                'Ya, Batalkan Presensi'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
