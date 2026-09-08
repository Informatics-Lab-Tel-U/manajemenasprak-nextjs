/* eslint-disable react-doctor/no-chain-state-updates, react-doctor/no-cascading-set-state, react-doctor/no-effect-chain, react-doctor/rendering-hydration-no-flicker */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

import {
  checkNim,
  generateCode,
  fetchAvailableTerms,
  UpsertAsprakInput,
} from '@/lib/fetchers/asprakFetcher';
import { fetchPraktikumByTerm } from '@/lib/fetchers/praktikumFetcher';
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface AsprakFormProps {
  onSubmit: (data: UpsertAsprakInput) => Promise<void>;
  onCancel: () => void;
}

interface AssignmentBlock {
  id: string; // internal UI ID
  term: string;
  selectedCourseNames: string[];
  availableCourses: { id: string; nama: string }[];
  loadingCourses: boolean;
}

export default function AsprakForm({ onSubmit, onCancel }: AsprakFormProps) {
  const [nama, setNama] = useState('');
  const [nim, setNim] = useState('');
  const [kode, setKode] = useState('');
  const [angkatan, setAngkatan] = useState<string>('2023');
  const [rfidUid, setRfidUid] = useState('');
  const [forceOverride, setForceOverride] = useState(false);
  const [isManualCode, setIsManualCode] = useState(false);

  const [nimStatus, setNimStatus] = useState<'idle' | 'checking' | 'valid' | 'taken'>('idle');
  const [codeStatus, setCodeStatus] = useState<
    'idle' | 'generating' | 'valid' | 'invalid_length' | 'taken' | 'hard_conflict'
  >('idle');
  const [ruleInfo, setRuleInfo] = useState('');

  const [assignments, setAssignments] = useState<AssignmentBlock[]>([]);
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);
  const [existingAspraks, setExistingAspraks] = useState<{ kode: string; angkatan: number }[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);

  const debouncedNama = useDebounceValue(nama, 800);
  const debouncedNim = useDebounceValue(nim, 800);

  useEffect(() => {
    const controller = new AbortController();
    async function loadData() {
      try {
        // eslint-disable-next-line react-doctor/no-fetch-in-effect
        const [termsRes, allInfoRes] = await Promise.all([
          fetchAvailableTerms(),
          fetch('/api/asprak?action=all-info', { signal: controller.signal }).then((r) => r.json()),
        ]);

      if (termsRes.ok && termsRes.data) {
        setAvailableTerms(termsRes.data);
      }
      if (allInfoRes.ok && allInfoRes.data) {
        setExistingAspraks(allInfoRes.data);
      }
      } catch (e) {
        if (!controller.signal.aborted) console.error(e);
      }
    }
    loadData();
    return () => controller.abort();
  }, []);

  // eslint-disable-next-line react-doctor/no-chain-state-updates
  useEffect(() => {
    if (!debouncedNim || debouncedNim.length < 5) {
      setNimStatus('idle');
      return;
    }

    async function check() {
      setNimStatus('checking');
      const res = await checkNim(debouncedNim);
      if (res.ok && res.data) {
        setNimStatus('taken');
      } else {
        setNimStatus('valid');
      }
    }
    check();
  }, [debouncedNim]);

  const validateKodeMatch = useCallback(
    (up: string, force: boolean, currentAngkatanStr: string) => {
      const safeUp = up || '';
      if (safeUp.length === 0) {
        setCodeStatus('idle');
        return;
      }
      if (safeUp.length !== 3) {
        setCodeStatus('invalid_length');
        return;
      }

      if (!force) {
        const formAngkatan = parseInt(currentAngkatanStr, 10) || 0;
        let calculatedAngkatan = formAngkatan;
        if (calculatedAngkatan > 0 && calculatedAngkatan < 100) calculatedAngkatan += 2000;

        const conflictInDB = existingAspraks.find((a) => a.kode.toUpperCase() === up);

        if (conflictInDB) {
          const gap = calculatedAngkatan - conflictInDB.angkatan;

          if (gap < 1) {
            setCodeStatus('hard_conflict');
            return;
          }

          if (!force) {
            setCodeStatus('taken');
            return;
          }
        }
      }

      setCodeStatus('valid');
    },
    [existingAspraks]
  );

  // eslint-disable-next-line react-doctor/no-chain-state-updates
  // eslint-disable-next-line react-doctor/no-chain-state-updates
  useEffect(() => {
    // When name changes, we ALWAYS attempt to re-generate the code
    // and reset the manual override flag.
    if (!debouncedNama || debouncedNama.trim().length < 3) {
      if (!isManualCode) {
        // eslint-disable-next-line react-doctor/no-chain-state-updates
        setKode('');
        setRuleInfo('');
        setCodeStatus('idle');
      }
      return;
    }

    async function gen() {
      setCodeStatus('generating');
      const res = await generateCode(debouncedNama, forceOverride);
      if (res.ok && res.data) {
        setKode(res.data.code);
        setRuleInfo(res.data.rule);
        setIsManualCode(false); // Reset to auto state

        if (res.data.rule === 'FAILED') {
          setCodeStatus('invalid_length');
        } else {
          validateKodeMatch(res.data.code, forceOverride, angkatan);
        }
      } else {
        setCodeStatus('idle');
      }
    }
    gen();
  }, [debouncedNama, forceOverride, angkatan, validateKodeMatch, isManualCode]);

  const handleCodeChange = (val: string) => {
    const up = val.toUpperCase().replace(/[^A-Z]/g, '');
    setKode(up);
    setRuleInfo('Manual');
    setIsManualCode(true); // Mark as manual
    validateKodeMatch(up, forceOverride, angkatan);
  };

  // Re-run validation constraints when forceOverride or angkatan changes
  // eslint-disable-next-line react-doctor/no-chain-state-updates
  useEffect(() => {
    if (kode) validateKodeMatch(kode, forceOverride, angkatan);
  }, [forceOverride, kode, angkatan, validateKodeMatch]);

  const addAssignmentBlock = () => {
    setAssignments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        term: '',
        selectedCourseNames: [],
        availableCourses: [],
        loadingCourses: false,
      },
    ]);
  };

  const removeAssignmentBlock = (id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleTermChange = async (blockId: string, term: string) => {
    // Check if term is already selected (though UI should prevent it)
    if (assignments.some((a) => a.id !== blockId && a.term === term)) {
      toast.error('Tahun ajaran ini sudah dipilih!');
      return;
    }

    setAssignments((prev) =>
      prev.map((a) =>
        a.id === blockId ? { ...a, term, loadingCourses: true, selectedCourseNames: [] } : a
      )
    );

    const res = await fetchPraktikumByTerm(term);

    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== blockId) return a;
        if (res.ok && res.data) {
          return {
            ...a,
            loadingCourses: false,
            availableCourses: res.data.map((p) => ({ id: p.id, nama: p.nama })),
          };
        }
        return { ...a, loadingCourses: false, availableCourses: [] };
      })
    );
  };

  const toggleCourse = (blockId: string, courseName: string, checked: boolean) => {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== blockId) return a;
        const newSelection = checked
          ? [...a.selectedCourseNames, courseName]
          : a.selectedCourseNames.filter((n) => n !== courseName);
        return { ...a, selectedCourseNames: newSelection };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nimStatus === 'taken') {
      toast.error('NIM sudah terdaftar!');
      return;
    }
    if (codeStatus === 'taken' || codeStatus === 'hard_conflict') {
      toast.error(
        codeStatus === 'hard_conflict'
          ? 'Kode sedang aktif digunakan!'
          : 'Kode Asprak sudah digunakan!'
      );
      return;
    }
    if (codeStatus === 'invalid_length') {
      toast.error('Kode Asprak harus 3 huruf!');
      return;
    }
    if (angkatan.length !== 4) {
      toast.error('Angkatan harus 4 digit!');
      return;
    }

    setSubmitLoading(true);
    try {
      const payload: UpsertAsprakInput = {
        nim,
        nama_lengkap: nama,
        kode,
        role: 'ASPRAK',
        angkatan: parseInt(angkatan),
        rfid_uid: rfidUid ? rfidUid.trim().toUpperCase() : undefined,
        assignments: assignments.flatMap((a) =>
          a.term && a.selectedCourseNames.length > 0
            ? [{ term: a.term, praktikumNames: a.selectedCourseNames }]
            : []
        ),
        forceOverride,
      };

      await onSubmit(payload);
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyimpan data');
    } finally {
      setSubmitLoading(false);
    }
  };

  const getDisabledTerms = (currentBlockId: string) => {
    return new Set(
      assignments.flatMap((a) => 
        (a.id !== currentBlockId && a.term) ? [a.term] : []
      )
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Personal Info Section - Header removed as requested */}
      <div className="grid gap-3">
        {/* Nama */}
        <div className="space-y-1.5">
          <Label htmlFor="nama">Nama Lengkap</Label>
          <Input
            id="nama"
            value={nama || ''}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Contoh: Muhammad Farhan"
            required
            className="h-9"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* NIM */}
          <div className="space-y-1.5">
            <Label htmlFor="nim">NIM</Label>
            <div className="relative">
              <Input
                id="nim"
                value={nim || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setNim(val);
                  if (val.length < 5) {
                    setNimStatus('idle');
                  } else {
                    setNimStatus('checking');
                  }
                }}
                placeholder="1301..."
                className={`h-9 ${nimStatus === 'taken' ? 'border-destructive focus-visible:ring-destructive' : nimStatus === 'valid' ? 'border-green-500' : ''}`}
                required
              />
              {nimStatus === 'checking' && (
                <Spinner
                  className="absolute right-3 top-2.5 text-muted-foreground w-3.5 h-3.5"
                />
              )}
              {nimStatus === 'valid' && (
                <CheckCircle2 size={14} className="absolute right-3 top-2.5 text-green-500" />
              )}
              {nimStatus === 'taken' && (
                <AlertCircle size={14} className="absolute right-3 top-2.5 text-destructive" />
              )}
            </div>
            {nimStatus === 'taken' && (
              <p className="text-[10px] text-destructive mt-1">NIM sudah terdaftar.</p>
            )}
          </div>

          {/* Kode */}
          <div className="space-y-1.5">
            <Label htmlFor="kode">Kode Asprak</Label>
            <div className="relative">
              <Input
                id="kode"
                value={kode || ''}
                onChange={(e) => handleCodeChange(e.target.value)}
                maxLength={3}
                className={`h-9 uppercase font-mono tracking-wider ${
                  codeStatus === 'taken' || codeStatus === 'invalid_length'
                    ? 'border-destructive focus-visible:ring-destructive'
                    : codeStatus === 'valid'
                      ? 'border-green-500'
                      : ''
                }`}
                placeholder="MFA"
                required
              />
              {codeStatus === 'generating' && (
                <Spinner
                  className="absolute right-3 top-2.5 text-muted-foreground w-3.5 h-3.5"
                />
              )}
            </div>
            {codeStatus === 'taken' && (
              <p className="text-[10px] text-destructive mt-1">
                Kode digunakan (cooldown 1-6 thn).
              </p>
            )}
            {codeStatus === 'hard_conflict' && (
              <p className="text-[10px] text-destructive mt-1 font-bold">
                Kode sedang aktif digunakan!
              </p>
            )}
            {codeStatus === 'invalid_length' && (
              <p className="text-[10px] text-destructive mt-1">Harus pas 3 huruf.</p>
            )}
            {codeStatus === 'valid' && ruleInfo && (
              <p
                className={`text-[10px] mt-1 ${isManualCode ? 'text-blue-500 font-medium' : 'text-muted-foreground'}`}
              >
                {isManualCode ? 'Manual Input' : `Auto: ${ruleInfo}`}
              </p>
            )}
          </div>
        </div>

        {/* Switch Paksa Gunakan Kode - Tampil saat kode bentrok atau forceOverride aktif agar kolom NIM & Kode simetris */}
        {(codeStatus === 'taken' || forceOverride) && (
          <div className="flex items-center justify-between gap-3 bg-muted/40 p-2.5 rounded-lg border border-border/60 transition-all">
            <div className="space-y-0.5">
              <Label
                htmlFor="form-force-override"
                className="text-xs font-medium cursor-pointer"
              >
                Paksa gunakan kode
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Abaikan peringatan bentrok (cooldown 1-6 tahun)
              </p>
            </div>
            <Switch
              id="form-force-override"
              checked={forceOverride}
              onCheckedChange={setForceOverride}
            />
          </div>
        )}

        {/* Angkatan & RFID */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="angkatan">Angkatan</Label>
            <Input
              id="angkatan"
              type="number"
              value={angkatan || ''}
              onChange={(e) => setAngkatan(e.target.value)}
              min={2000}
              max={2099}
              required
              className="h-9"
            />
            <p className="text-[10px] text-muted-foreground">Format 4 digit (YYYY)</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rfid_uid">Nomor UID Kartu RFID (Opsional)</Label>
            <Input
              id="rfid_uid"
              value={rfidUid}
              onChange={(e) => setRfidUid(e.target.value.toUpperCase())}
              className="h-9 font-mono uppercase tracking-wider text-xs"
              placeholder="Contoh: 04A1B2C3"
            />
            <p className="text-[10px] text-muted-foreground">Bisa diisi manual / scan nanti</p>
          </div>
        </div>
      </div>

      <hr className="border-border/50" />

      {/* Assignments Section */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Penugasan / History
          </h3>
          {/* No button here as requested? "step paling bawah tombol biru" */}
        </div>

        <div className="space-y-3">
          {assignments.map((block) => {
            const disabledTerms = getDisabledTerms(block.id);
            return (
              <Card key={block.id} className="relative bg-muted/20 border-border/50 shadow-sm py-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => removeAssignmentBlock(block.id)}
                  type="button"
                >
                  <Trash2 size={14} />
                </Button>
                <CardContent className="p-3 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tahun Ajaran (Term)</Label>
                    <Select
                      value={block.term}
                      onValueChange={(val) => handleTermChange(block.id, val)}
                    >
                      <SelectTrigger className="bg-background h-8 text-xs">
                        <SelectValue placeholder="Pilih Term" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTerms.map((t) => (
                          <SelectItem
                            key={t}
                            value={t}
                            disabled={disabledTerms.has(t)}
                            className="text-xs"
                          >
                            {t} {disabledTerms.has(t) ? '(Dipilih)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {block.term && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Mata Kuliah Diampu</Label>
                      {block.loadingCourses ? (
                        <div className="flex justify-center p-2">
                          <Spinner className="w-4 h-4 text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto border rounded-md p-2 bg-background">
                          {block.availableCourses.map((course) => (
                            <div key={course.id} className="flex items-start space-x-2">
                              <Checkbox
                                id={`${block.id}-${course.id}`}
                                checked={block.selectedCourseNames.includes(course.nama)}
                                onCheckedChange={(c) => toggleCourse(block.id, course.nama, !!c)}
                                className="h-3.5 w-3.5 mt-0.5"
                              />
                              <label
                                htmlFor={`${block.id}-${course.id}`}
                                className="text-xs cursor-pointer select-none leading-tight"
                              >
                                {course.nama}
                              </label>
                            </div>
                          ))}
                          {block.availableCourses.length === 0 && (
                            <p className="text-[10px] text-muted-foreground col-span-2 text-center py-1">
                              Tidak ada praktikum.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button
          type="button"
          onClick={addAssignmentBlock}
          variant="outline"
          size="sm"
          className="w-full border-dashed h-9 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus size={14} className="mr-2" /> Tambah Tahun Ajaran
        </Button>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Batal
        </Button>
        <Button
          type="submit"
          size="sm"
          className="h-8"
          disabled={
            submitLoading ||
            nimStatus === 'taken' ||
            nimStatus === 'checking' ||
            codeStatus === 'invalid_length' ||
            codeStatus === 'taken' ||
            codeStatus === 'hard_conflict' ||
            codeStatus === 'generating'
          }
        >
          {submitLoading ? (
            <>
              <Spinner className="mr-2 h-4 w-4" /> Menyimpan...
            </>
          ) : 'Simpan Data Asprak'}
        </Button>
      </div>
    </form>
  );
}
