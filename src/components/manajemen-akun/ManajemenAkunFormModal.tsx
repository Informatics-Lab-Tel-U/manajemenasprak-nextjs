/* eslint-disable react-doctor/exhaustive-deps */
'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field';
import type { UserWithEmail, Praktikum } from '@/types/database';
import type { Role } from '@/config/rbac';
import { useTermStore } from '@/store/useTermStore';

type Props =
  | {
      open: boolean;
      onOpenChange: (v: boolean) => void;
      mode: 'create';
      user?: never;
      onSuccess: () => void;
    }
  | {
      open: boolean;
      onOpenChange: (v: boolean) => void;
      mode: 'edit';
      user: UserWithEmail;
      onSuccess: () => void;
    };

const ROLE_OPTIONS: { value: Role; label: string; desc: string }[] = [
  { value: 'ADMIN', label: 'Administrator', desc: 'Akses penuh seluruh konfigurasi portal dan manajemen akun' },
  { value: 'ASLAB', label: 'Asisten Laboratorium', desc: 'Mengelola praktikum, jadwal, dan asisten praktikum' },
  { value: 'ASPRAK_KOOR', label: 'Koordinator Asprak', desc: 'Bertanggung jawab atas 1 praktikum tertentu (memerlukan penugasan)' },
  { value: 'ASPRAK', label: 'Asisten Praktikum', desc: 'Asisten praktikum operasional reguler' },
];

const LOGBOOK_ROLE_OPTIONS: { value: 'INTERN' | 'ASLAB' | 'ADMIN'; label: string; desc: string }[] = [
  { value: 'INTERN', label: 'Intern', desc: 'Menulis logbook harian, upload bukti kegiatan, dan edit draf' },
  { value: 'ASLAB', label: 'Asisten Laboratorium (Reviewer)', desc: 'Meninjau, memverifikasi, dan memberi komentar pada logbook' },
  { value: 'ADMIN', label: 'Administrator Logbook', desc: 'Akses penuh seluruh fitur operasional intern logbook' },
];

export function ManajemenAkunFormModal({ open, onOpenChange, mode, user, onSuccess }: Props) {
  const [state, updateState] = React.useReducer(
    (prev: any, next: any) => typeof next === 'function' ? { ...prev, ...next(prev) } : { ...prev, ...next },
    {
      nama: '', email: '', password: '', showPassword: false, role: 'ASPRAK_KOOR', isLoading: false,
      praktikumList: [], tahunAjaranList: [], selectedPraktikumId: '', loadingPraktikum: false,
      enableLogbook: false, logbookRole: 'INTERN',
    }
  );
  const {
    nama, email, password, showPassword, role, isLoading,
    praktikumList, tahunAjaranList, selectedPraktikumId, loadingPraktikum,
    enableLogbook, logbookRole
  } = state;
  const { activeTerm } = useTermStore();
  const selectedTahun = activeTerm || '';

  
  
  
  
  
  

  // ASPRAK_KOOR — a koordinator handles exactly 1 praktikum
  
  
  
   // single
  

  React.useEffect(() => {
    if (!open) return;

    const logbookApp = user?.app_roles?.find((r) => r.app_slug === 'intern-logbook');
    const hasLogbook = Boolean(logbookApp);
    const initialLogbookRole = (logbookApp?.role as 'INTERN' | 'ASLAB' | 'ADMIN') || 'INTERN';

    updateState({
      nama: user?.nama_lengkap ?? '',
      email: user?.email ?? '',
      password: '',
      showPassword: false,
      role: user?.role ?? 'ASPRAK_KOOR',
      praktikumList: [],
      tahunAjaranList: [],
      selectedPraktikumId: '',
      enableLogbook: hasLogbook,
      logbookRole: initialLogbookRole,
    });

    // Fetch praktikum + existing assignment if ASPRAK_KOOR
    const shouldFetch = (user?.role ?? 'ASPRAK_KOOR') === 'ASPRAK_KOOR';
    if (!shouldFetch) return;

    updateState({ loadingPraktikum: true });
    const controller = new AbortController();

    const loadData = async () => {
      try {
        // 1. Fetch all praktikum
        // eslint-disable-next-line react-doctor/no-fetch-in-effect
        const pRes = await fetch('/api/praktikum?action=all', { signal: controller.signal });
        const pJson = await pRes.json();
        if (controller.signal.aborted) return;

        let list: Praktikum[] = [];
        let tahuns: string[] = [];
        if (pJson.ok && pJson.data) {
          list = pJson.data;
          tahuns = Array.from(new Set(list.map((p: Praktikum) => p.tahun_ajaran)))
            .sort()
            .reverse() as string[];
        }

        // 2. Fetch existing assignment for this user (edit mode)
        let existingPraktikumId = '';
        let existingTahun = tahuns[0] ?? '';
        if (mode === 'edit' && user?.id) {
          // eslint-disable-next-line react-doctor/no-fetch-in-effect
          const aRes = await fetch(`/api/admin/users/assignments?id_pengguna=${user.id}`, { signal: controller.signal });
          const aJson = await aRes.json();
          if (!controller.signal.aborted && aJson.ok && aJson.data?.length > 0) {
            existingPraktikumId = aJson.data[0].id_praktikum ?? '';
            existingTahun = aJson.data[0].tahun_ajaran ?? tahuns[0] ?? '';
          }
        }

        if (!controller.signal.aborted) {
          updateState({
            praktikumList: list,
            tahunAjaranList: tahuns,
            selectedPraktikumId: existingPraktikumId
          });
        }
      } catch (e: any) {
        if (!controller.signal.aborted) toast.error('Gagal memuat data praktikum');
      } finally {
        if (!controller.signal.aborted) updateState({ loadingPraktikum: false });
      }
    };

    loadData();
    return () => {
      controller.abort();
    };
    // Only re‑run when `open` changes — deliberate: avoids the setState→useEffect loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    if (!open || role !== 'ASPRAK_KOOR' || praktikumList.length > 0 || loadingPraktikum) return;

    updateState({ loadingPraktikum: true });
    const controller = new AbortController();

    // eslint-disable-next-line react-doctor/no-fetch-in-effect
    fetch('/api/praktikum?action=all', { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        if (controller.signal.aborted) return;
        if (json.ok && json.data) {
          const list: Praktikum[] = json.data;
          const tahuns = Array.from(new Set(list.map((p) => p.tahun_ajaran)))
            .sort()
            .reverse() as string[];
          updateState({
            praktikumList: list,
            tahunAjaranList: tahuns
          });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) toast.error('Gagal memuat data praktikum')
      })
      .finally(() => {
        if (!controller.signal.aborted) updateState({ loadingPraktikum: false });
      });

    return () => {
      controller.abort();
    };
    // intentionally only depends on role changing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const filteredPraktikum = React.useMemo(
    () => praktikumList.filter((p: any) => p.tahun_ajaran === selectedTahun),
    [praktikumList, selectedTahun]
  );

  async function handleSubmit(_e: React.FormEvent) {
    _e.preventDefault();
    updateState({ isLoading: true });

    try {
      const app_roles = [
        { app_slug: 'manajemenasprak', role, enabled: true },
        { app_slug: 'intern-logbook', role: logbookRole, enabled: enableLogbook },
      ];

      if (mode === 'create') {
        if (role === 'ASPRAK_KOOR' && !selectedPraktikumId) {
          toast.error('Pilih 1 praktikum untuk Koordinator Asprak');
          updateState({ isLoading: false });
          return;
        }

        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            nama_lengkap: nama,
            role,
            praktikum_ids: role === 'ASPRAK_KOOR' ? [selectedPraktikumId] : undefined,
            app_roles,
          }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error);
        if (json.data?.reactivated) {
          toast.success(`Akun "${nama}" yang sebelumnya dinonaktifkan berhasil dipulihkan & diperbarui.`);
        } else {
          toast.success(`Akun "${nama}" berhasil dibuat.`);
        }
      } else {
        if (role === 'ASPRAK_KOOR' && !selectedPraktikumId) {
          toast.error('Pilih 1 praktikum untuk Koordinator Asprak');
          updateState({ isLoading: false });
          return;
        }

        const payload: any = {
          nama_lengkap: nama,
          role,
          app_roles,
        };
        if (role === 'ASPRAK_KOOR') {
          payload.praktikum_ids = [selectedPraktikumId];
          // tahun_ajaran is derived from id_praktikum — not sent
        }

        const res = await fetch(`/api/admin/users/${user!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error);
        toast.success(`Akun "${nama}" berhasil diperbarui.`);
      }

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      updateState({ isLoading: false });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(700px,90vh)] flex-col gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="contents space-y-0 text-left">
          <DialogTitle className="border-b px-6 py-4">
            {mode === 'create' ? 'Tambah Akun Baru' : 'Edit Akun'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Form untuk mengelola data akun dan hak akses pengguna
          </DialogDescription>
          <ScrollArea className="flex flex-col overflow-hidden">
            <form id="modal-akun-form" onSubmit={handleSubmit} className="flex flex-col gap-4 p-6 text-foreground">
                {/* Nama */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="akun-nama">Nama Lengkap</Label>
                  <Input
                    id="akun-nama"
                    value={nama}
                    onChange={(e) => updateState({ nama: e.target.value })}
                    required
                    disabled={isLoading}
                    placeholder="Nama Lengkap"
                  />
                </div>

                {mode === 'create' && (
                  <>
                    {/* Email */}
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="akun-email">Email</Label>
                      <Input
                        id="akun-email"
                        type="email"
                        value={email}
                        onChange={(e) => updateState({ email: e.target.value })}
                        required
                        disabled={isLoading}
                        placeholder="email@contoh.com"
                        autoComplete="off"
                      />
                    </div>

                    {/* Password with visibility toggle */}
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="akun-password">Kata Sandi</Label>
                      <div className="relative">
                        <Input
                          id="akun-password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => updateState({ password: e.target.value })}
                          required
                          disabled={isLoading}
                          placeholder="Minimal 6 karakter"
                          minLength={6}
                          className="pr-10"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => updateState((prev: any) => ({ showPassword: !prev.showPassword }))}
                          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                          aria-label={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Section: Manajemen Asprak Role */}
                <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3">
                  <div className="border-b border-border/50 pb-2">
                    <h4 className="text-sm font-semibold">Manajemen Asisten Praktikum</h4>
                  </div>

                  <div className="space-y-2 pt-1">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Pilih Peran di Manajemen Asprak
                    </Label>
                    <RadioGroup
                      value={role}
                      onValueChange={(v) => {
                        updateState({ role: v as Role, selectedPraktikumId: '' });
                      }}
                      className="gap-2"
                      disabled={isLoading}
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <FieldLabel key={opt.value} htmlFor={`asprak-role-${opt.value}`}>
                          <Field orientation="horizontal">
                            <RadioGroupItem value={opt.value} id={`asprak-role-${opt.value}`} disabled={isLoading} />
                            <FieldContent>
                              <FieldTitle className="text-sm">{opt.label}</FieldTitle>
                              <FieldDescription className="text-xs">{opt.desc}</FieldDescription>
                            </FieldContent>
                          </Field>
                        </FieldLabel>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* ASPRAK_KOOR: Single Praktikum Assignment */}
                  {role === 'ASPRAK_KOOR' && (
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-3 mt-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Assignment Praktikum
                        </p>
                        {loadingPraktikum && (
                          <Spinner className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs font-medium border border-border/50 bg-muted/20 px-3 py-1.5 rounded-md">
                          Tahun Ajaran: <span className="font-bold">{selectedTahun}</span>
                        </p>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs">Nama Praktikum *</Label>
                        {loadingPraktikum ? (
                          <p className="text-xs text-muted-foreground py-2">Memuat...</p>
                        ) : filteredPraktikum.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">
                            Tidak ada praktikum di tahun ini
                          </p>
                        ) : (
                          <RadioGroup
                            value={selectedPraktikumId}
                            onValueChange={(val) => updateState({ selectedPraktikumId: val })}
                            className="space-y-2 max-h-48 overflow-y-auto pr-1"
                          >
                            {filteredPraktikum.map((p: any) => (
                              <FieldLabel key={p.id} htmlFor={`p-${p.id}`} className="cursor-pointer">
                                <Field orientation="horizontal">
                                  <FieldContent>
                                    <FieldTitle className="text-xs">{p.nama}</FieldTitle>
                                    <FieldDescription className="text-[11px]">ID: {p.id.substring(0, 8)}...</FieldDescription>
                                  </FieldContent>
                                  <RadioGroupItem value={p.id} id={`p-${p.id}`} disabled={isLoading} />
                                </Field>
                              </FieldLabel>
                            ))}
                          </RadioGroup>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Section: Intern Logbook */}
                <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <h4 className="text-sm font-semibold">Intern Logbook</h4>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="toggle-logbook-edit" className="text-xs cursor-pointer text-muted-foreground">
                        {enableLogbook ? 'Akses Aktif' : 'Nonaktif'}
                      </Label>
                      <Switch
                        id="toggle-logbook-edit"
                        checked={enableLogbook}
                        onCheckedChange={(val) => updateState({ enableLogbook: val })}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {enableLogbook && (
                    <div className="space-y-2 pt-1 animate-in fade-in-50 duration-200">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Pilih Peran di Intern Logbook
                      </Label>
                      <RadioGroup
                        value={logbookRole}
                        onValueChange={(val) => updateState({ logbookRole: val })}
                        className="gap-2"
                        disabled={isLoading}
                      >
                        {LOGBOOK_ROLE_OPTIONS.map((opt) => (
                          <FieldLabel key={opt.value} htmlFor={`logbook-role-${opt.value}`}>
                            <Field orientation="horizontal">
                              <RadioGroupItem value={opt.value} id={`logbook-role-${opt.value}`} disabled={isLoading} />
                              <FieldContent>
                                <FieldTitle className="text-sm">{opt.label}</FieldTitle>
                                <FieldDescription className="text-xs">{opt.desc}</FieldDescription>
                              </FieldContent>
                            </Field>
                          </FieldLabel>
                        ))}
                      </RadioGroup>
                    </div>
                  )}
                </div>
              </form>
          </ScrollArea>
        </DialogHeader>

        <DialogFooter className="border-t px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Batal
          </Button>
          <Button type="submit" form="modal-akun-form" disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Menyimpan...
              </>
            ) : mode === 'create' ? (
              'Buat Akun'
            ) : (
              'Simpan Perubahan'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
