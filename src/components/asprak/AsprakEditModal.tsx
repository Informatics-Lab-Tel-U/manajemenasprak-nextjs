/* eslint-disable react-doctor/no-impure-state-updater */
/* eslint-disable react-doctor/no-chain-state-updates, react-doctor/no-cascading-set-state, react-doctor/no-effect-chain, react-doctor/rendering-hydration-no-flicker */
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Asprak, Praktikum } from '@/types/database';
import { usePraktikum } from '@/hooks/usePraktikum';
import { Spinner } from '@/components/ui/spinner';

interface AsprakEditModalProps {
  asprak: Asprak;
  assignments: string[]; // List of praktikum IDs currently assigned
  onSave: (
    praktikumIds: string[],
    newKode: string,
    forceOverride: boolean,
    rfidUid?: string,
    namaLengkap?: string,
    newNim?: string
  ) => Promise<void>;
  onClose: () => void;
  open: boolean;
}

export default function AsprakEditModal({
  asprak,
  assignments,
  onSave,
  onClose,
  open,
}: AsprakEditModalProps) {
  const { getPraktikumByTerm, loading: loadingPraktikum } = usePraktikum();
  const [availablePraktikums, setAvailablePraktikums] = useState<Praktikum[]>([]);
  const [selectedPraktikumIds, setSelectedPraktikumIds] = useState<string[]>(assignments || []);
  const [newKode, setNewKode] = useState<string>(asprak.kode);
  const [namaLengkap, setNamaLengkap] = useState<string>(asprak.nama_lengkap);
  const [nim, setNim] = useState<string>(asprak.nim);
  const [rfidUid, setRfidUid] = useState<string>(asprak.rfid_uid || '');
  const [forceOverride, setForceOverride] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingAspraks, setExistingAspraks] = useState<{ kode: string; angkatan: number }[]>([]);

  const [prevAsprakId, setPrevAsprakId] = useState(asprak.id);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen || asprak.id !== prevAsprakId) {
    setPrevOpen(open);
    setPrevAsprakId(asprak.id);
    if (open) {
      setSelectedPraktikumIds(assignments || []);
      setNewKode(asprak.kode);
      setNamaLengkap(asprak.nama_lengkap);
      setNim(asprak.nim);
      setRfidUid(asprak.rfid_uid || '');
      setForceOverride(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    if (open) {
      getPraktikumByTerm('all')
        .then((data) => {
          if (!controller.signal.aborted) setAvailablePraktikums(data);
        })
        .catch((err) => {
          if (err.name !== 'AbortError') console.error(err);
        });

      // eslint-disable-next-line react-doctor/no-fetch-in-effect
      fetch('/api/asprak?action=all-info', { signal: controller.signal })
        .then((res) => res.json())
        .then((json) => {
          if (!controller.signal.aborted && json.ok && json.data) {
            setExistingAspraks(json.data);
          }
        })
        .catch((err) => {
          if (err.name !== 'AbortError') console.error(err);
        });
    }
    return () => controller.abort();
  }, [open, getPraktikumByTerm]);

  const getKodeError = (up: string, force: boolean) => {
    const safeUp = up || '';
    if (safeUp.length === 0) return 'Kode tidak boleh kosong';
    if (safeUp.length !== 3) return 'Kode Asisten harus persis 3 huruf';

    if (!force) {
      let calculatedAngkatan = asprak.angkatan || 0;
      if (calculatedAngkatan > 0 && calculatedAngkatan < 100) calculatedAngkatan += 2000;

      const conflictInDB = existingAspraks.find((a) => {
        return a.kode.toUpperCase() === safeUp && a.kode.toUpperCase() !== asprak.kode.toUpperCase();
      });

      if (conflictInDB) {
        const gap = calculatedAngkatan - conflictInDB.angkatan;
        if (gap < 1) return 'KODE KERAS: Kode sedang aktif digunakan!';
        return 'Kode digunakan (cooldown 1-6 thn)';
      }
    }
    return null;
  };

  const kodeError = getKodeError(newKode, forceOverride);

  const handleKodeChange = (val: string) => {
    const up = val.toUpperCase().slice(0, 3);
    setNewKode(up);
  };

  const handleSave = async () => {
    if (newKode.length !== 3 || kodeError || !namaLengkap.trim() || !nim.trim()) {
      return;
    }

    setSaving(true);
    await onSave(
      selectedPraktikumIds,
      newKode.toUpperCase(),
      forceOverride,
      rfidUid,
      namaLengkap.trim(),
      nim.trim() !== asprak.nim ? nim.trim() : undefined
    );
    setSaving(false);
    onClose();
  };

  const handleToggle = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedPraktikumIds((prev) => [...prev, id]);
    } else {
      setSelectedPraktikumIds((prev) => prev.filter((pId) => pId !== id));
    }
  };

  const groupedPraktikums = useMemo(() => {
    const groups: Record<string, Praktikum[]> = {};
    availablePraktikums.forEach((p) => {
      if (!groups[p.tahun_ajaran]) {
        groups[p.tahun_ajaran] = [];
      }
      groups[p.tahun_ajaran].push(p);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [availablePraktikums]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Edit Data Asisten</DialogTitle>
          <DialogDescription className="sr-only">
            Edit data dan penugasan asisten praktikum.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 grid gap-4 shrink-0">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nim" className="text-muted-foreground text-xs">NIM</Label>
              <Input
                id="nim"
                value={nim}
                onChange={(e) => setNim(e.target.value.replace(/\D/g, ''))}
                className="font-mono transition-colors h-8 text-xs"
                placeholder="NIM Asprak"
                maxLength={20}
              />
            </div>
            <div>
              <Label htmlFor="kode" className="text-muted-foreground text-xs">
                Kode
              </Label>
              <Input
                id="kode"
                value={newKode}
                onChange={(e) => handleKodeChange(e.target.value)}
                className={`font-mono uppercase transition-colors h-8 ${
                  kodeError ? 'border-red-500 focus-visible:ring-red-500' : ''
                }`}
                placeholder="ABC"
                maxLength={3}
              />
              {kodeError && <p className="text-red-500 text-xs mt-1">{kodeError}</p>}
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-muted/30 p-2 rounded-md border border-border/50">
            <Switch
              id="force-override"
              checked={forceOverride}
              onCheckedChange={setForceOverride}
              disabled={saving}
            />
            <Label htmlFor="force-override" className="text-xs font-medium leading-tight">
              Paksa gunakan Kode ini
              <p className="text-[10px] text-muted-foreground font-normal mt-0.5">
                Mengabaikan peringatan bentrok (cooldown 1-6 thn).
              </p>
            </Label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nama_lengkap" className="text-muted-foreground text-xs">
                Nama Lengkap
              </Label>
              <Input
                id="nama_lengkap"
                value={namaLengkap}
                onChange={(e) => setNamaLengkap(e.target.value)}
                className="transition-colors h-8 text-xs font-medium"
                placeholder="Nama Lengkap Asisten"
              />
            </div>
            <div>
              <Label htmlFor="rfid_uid" className="text-muted-foreground text-xs">
                Nomor UID Kartu RFID
              </Label>
              <Input
                id="rfid_uid"
                value={rfidUid}
                onChange={(e) => setRfidUid(e.target.value.toUpperCase())}
                className="font-mono uppercase transition-colors h-8 tracking-wider text-xs"
                placeholder="Contoh: 04A1B2C3"
              />
            </div>
          </div>
        </div>


        <div className="px-6 py-2 flex-1 overflow-y-auto min-h-0 border-t">
          {loadingPraktikum ? (
            <div className="text-sm text-muted-foreground py-4">Memuat praktikum...</div>
          ) : availablePraktikums.length === 0 ? (
            <div className="text-sm text-muted-foreground italic bg-muted/30 p-3 rounded my-2">
              Tidak ada data praktikum.
            </div>
          ) : (
            <div className="space-y-6 pt-2 pb-4">
              {(() => {
                const selectedSet = new Set(selectedPraktikumIds);
                return groupedPraktikums.map(([termKey, praktikums]) => (
                  <div key={termKey} className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground bg-muted/40 px-2 py-1 rounded">
                      Term {termKey}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                      {praktikums.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-start space-x-2 border p-2 rounded hover:bg-muted/10 transition-colors"
                        >
                          <Checkbox
                            id={p.id}
                            checked={selectedSet.has(p.id)}
                            onCheckedChange={(c) => handleToggle(p.id, !!c)}
                          />
                          <div className="grid gap-1.5 leading-none pt-0.5">
                            <label
                              htmlFor={p.id}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {p.nama}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t mt-auto">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Spinner className="mr-2 h-4 w-4" /> Menyimpan...
              </>
            ) : 'Simpan Perubahan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
