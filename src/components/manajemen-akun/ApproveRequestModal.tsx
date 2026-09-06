'use client';

import * as React from 'react';
import { toast } from 'sonner';
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field';
import type { Pengguna, Praktikum } from '@/types/database';
import type { Role } from '@/config/rbac';
import { useTermStore } from '@/store/useTermStore';

type AccessRequestUser = Pengguna & { email: string; auth_created_at?: string };

interface ApproveRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AccessRequestUser | null;
  onSuccess: () => void;
}

const ROLE_OPTIONS: { value: Role; label: string; desc: string }[] = [
  { value: 'ASPRAK', label: 'Asisten Praktikum', desc: 'Akses modul & pelaksanaan kegiatan praktikum yang ditugaskan' },
  { value: 'ASPRAK_KOOR', label: 'Koordinator Asprak', desc: 'Monitoring & pelanggaran mata praktikum terkait' },
  { value: 'ASLAB', label: 'Asisten Laboratorium', desc: 'Akses penuh fitur operasional praktikum & modul' },
  { value: 'ADMIN', label: 'Administrator', desc: 'Akses penuh seluruh sistem dan manajemen akun' },
];

const LOGBOOK_ROLE_OPTIONS: { value: 'INTERN' | 'ASLAB' | 'ADMIN'; label: string; desc: string }[] = [
  { value: 'INTERN', label: 'Intern', desc: 'Menulis logbook harian, upload bukti kegiatan, dan edit draf' },
  { value: 'ASLAB', label: 'Asisten Laboratorium (Reviewer)', desc: 'Meninjau, memverifikasi, dan memberi komentar pada logbook' },
  { value: 'ADMIN', label: 'Administrator Logbook', desc: 'Akses penuh seluruh fitur operasional intern logbook' },
];

export function ApproveRequestModal({
  open,
  onOpenChange,
  user,
  onSuccess,
}: ApproveRequestModalProps) {
  const [role, setRole] = React.useState<Role>('ASPRAK');
  const [enableLogbook, setEnableLogbook] = React.useState(false);
  const [logbookRole, setLogbookRole] = React.useState<'INTERN' | 'ASLAB' | 'ADMIN'>('INTERN');
  const [isLoading, setIsLoading] = React.useState(false);
  const [praktikumList, setPraktikumList] = React.useState<Praktikum[]>([]);
  const [selectedPraktikumId, setSelectedPraktikumId] = React.useState<string>('');
  const [loadingPraktikum, setLoadingPraktikum] = React.useState(false);
  const { activeTerm } = useTermStore();

  React.useEffect(() => {
    if (!open || !user) return;

    setRole('ASPRAK');
    setSelectedPraktikumId('');
    setEnableLogbook(false);
    setLogbookRole('INTERN');

    async function fetchPraktikum() {
      setLoadingPraktikum(true);
      try {
        const res = await fetch('/api/praktikum?action=all');
        const json = await res.json();
        if (json.ok && json.data) {
          setPraktikumList(json.data);
        }
      } catch (err) {
        console.error('Failed to load praktikum:', err);
      } finally {
        setLoadingPraktikum(false);
      }
    }

    fetchPraktikum();
  }, [open, user]);

  const filteredPraktikum = React.useMemo(() => {
    if (!activeTerm) return praktikumList;
    const termMatches = praktikumList.filter((p) => p.tahun_ajaran === activeTerm);
    return termMatches.length > 0 ? termMatches : praktikumList;
  }, [praktikumList, activeTerm]);

  async function handleApprove() {
    if (!user) return;

    if (role === 'ASPRAK_KOOR' && !selectedPraktikumId) {
      toast.error('Harap pilih mata praktikum untuk Koordinator Asprak.');
      return;
    }

    setIsLoading(true);
    try {
      const app_roles: { app_slug: string; role: string }[] = [
        { app_slug: 'manajemenasprak', role },
      ];
      if (enableLogbook) {
        app_roles.push({ app_slug: 'intern-logbook', role: logbookRole });
      }

      const res = await fetch(`/api/admin/users/${user.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          praktikum_ids: selectedPraktikumId ? [selectedPraktikumId] : [],
          app_roles,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || 'Gagal menyetujui akun.');
      }

      const appNames = enableLogbook
        ? 'Manajemen Asprak & Intern Logbook'
        : 'Manajemen Asprak';
      toast.success(`Akun "${user.nama_lengkap}" berhasil disetujui untuk ${appNames}.`);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  }

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(700px,90vh)] flex-col gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="contents space-y-0 text-left">
          <DialogTitle className="border-b px-6 py-4">
            Setujui Permintaan Akses
          </DialogTitle>
          <DialogDescription className="sr-only">
            Form untuk menyetujui permintaan akses akun pengguna
          </DialogDescription>
          <ScrollArea className="flex flex-col overflow-hidden">
            <div className="space-y-5 p-6 text-foreground">
                <p className="text-sm text-muted-foreground">
                  Tentukan izin aplikasi dan peran untuk akun{' '}
                  <strong className="text-foreground">{user.nama_lengkap}</strong>{' '}
                  ({user.email}).
                </p>

                {/* Section 1: Manajemen Asprak */}
                <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3">
                  <div className="border-b border-border/50 pb-2">
                    <h4 className="text-sm font-semibold">Manajemen Asisten Praktikum</h4>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Pilih Peran di Manajemen Asprak
                    </Label>
                    <RadioGroup
                      value={role}
                      onValueChange={(val) => setRole(val as Role)}
                      className="gap-2"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <FieldLabel key={opt.value} htmlFor={`role-${opt.value}`}>
                          <Field orientation="horizontal">
                            <RadioGroupItem value={opt.value} id={`role-${opt.value}`} />
                            <FieldContent>
                              <FieldTitle className="text-sm">{opt.label}</FieldTitle>
                              <FieldDescription className="text-xs">{opt.desc}</FieldDescription>
                            </FieldContent>
                          </Field>
                        </FieldLabel>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Praktikum picker for ASPRAK_KOOR */}
                  {role === 'ASPRAK_KOOR' && (
                    <div className="space-y-2 pt-1 border-t border-border/40">
                      <Label className="text-sm font-medium">Mata Praktikum Binaan *</Label>
                      {loadingPraktikum ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                          <Spinner className="h-4 w-4" /> Memuat...
                        </div>
                      ) : (
                        <Select value={selectedPraktikumId} onValueChange={setSelectedPraktikumId}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pilih praktikum..." />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredPraktikum.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nama} ({p.tahun_ajaran})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </div>

                {/* Section 2: Intern Logbook */}
                <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <h4 className="text-sm font-semibold">Intern Logbook</h4>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="toggle-logbook" className="text-xs cursor-pointer text-muted-foreground">
                        {enableLogbook ? 'Akses Diberikan' : 'Tidak Ada Akses'}
                      </Label>
                      <Switch
                        id="toggle-logbook"
                        checked={enableLogbook}
                        onCheckedChange={setEnableLogbook}
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
                        onValueChange={(val) => setLogbookRole(val as any)}
                        className="gap-2"
                      >
                        {LOGBOOK_ROLE_OPTIONS.map((opt) => (
                          <FieldLabel key={opt.value} htmlFor={`logbook-role-${opt.value}`}>
                            <Field orientation="horizontal">
                              <RadioGroupItem value={opt.value} id={`logbook-role-${opt.value}`} />
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
              </div>
          </ScrollArea>
        </DialogHeader>

        <DialogFooter className="border-t px-6 py-4 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Batal
          </Button>
          <Button onClick={handleApprove} disabled={isLoading}>
            {isLoading ? <Spinner className="h-4 w-4 mr-2" /> : null}
            Setujui Permintaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
