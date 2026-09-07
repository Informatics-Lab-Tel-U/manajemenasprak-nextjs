'use client';

import { useState } from 'react';
import { Plus, Trash2, GitFork, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import { validatePlottingImport, savePlotting } from '@/lib/fetchers/plottingFetcher';
import {
  mapPlottingValidationResponse,
  handlePlottingResolve,
  ExtendedPreviewRow,
} from '@/utils/validation/plottingValidation';
import PlottingCSVPreview from './PlottingCSVPreview';
import { useTermStore } from '@/store/useTermStore';

interface PlottingManualModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ManualRow {
  kode_asprak: string;
  mk_singkat: string;
}

const emptyRow = (): ManualRow => ({ kode_asprak: '', mk_singkat: '' });

export default function PlottingManualModal({
  open,
  onOpenChange,
  onSuccess,
}: PlottingManualModalProps) {
  const { activeTerm } = useTermStore();
  const selectedTerm = activeTerm || '';

  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [rows, setRows] = useState<ManualRow[]>([emptyRow()]);
  const [previewRows, setPreviewRows] = useState<ExtendedPreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateRow = (idx: number, field: keyof ManualRow, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (idx: number) => {
    if (rows.length === 1) {
      setRows([emptyRow()]);
    } else {
      setRows((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handleValidate = async () => {
    const validRows = rows.filter((r) => r.kode_asprak.trim() && r.mk_singkat.trim());
    if (validRows.length === 0) {
      setError('Isi minimal satu baris penugasan.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await validatePlottingImport(validRows, selectedTerm);
      if (res.ok && res.data) {
        const mapped = mapPlottingValidationResponse(res.data);
        setPreviewRows(mapped);
        setStep('preview');
      } else {
        setError(res.error || 'Validasi gagal.');
      }
    } catch (e: any) {
      setError(`Gagal memvalidasi: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = (index: number, candidateId: string) => {
    setPreviewRows((prev) => handlePlottingResolve(index, candidateId, prev));
  };

  const handleConfirm = async () => {
    const payload: { asprak_id: string; praktikum_id: string }[] = [];

    previewRows.forEach((row) => {
      if (!row.selected) return;
      if (row.status === 'invalid') return;
      if (row.status === 'valid' && row.asprakId && row.praktikumId) {
        payload.push({ asprak_id: row.asprakId, praktikum_id: row.praktikumId });
      } else if (row.status === 'ambiguous' && row.selectedCandidateIds && row.praktikumId) {
        row.selectedCandidateIds.forEach((id) => {
          payload.push({ asprak_id: id, praktikum_id: row.praktikumId! });
        });
      }
    });

    if (payload.length === 0) {
      toast.warning('Tidak ada penugasan yang akan disimpan.');
      return;
    }

    setLoading(true);
    const res = await savePlotting(payload);
    setLoading(false);

    if (res.ok) {
      toast.success(`${payload.length} penugasan berhasil disimpan!`);
      onSuccess();
      handleClose();
    } else {
      toast.error(res.error);
    }
  };

  const handleClose = () => {
    setStep('input');
    setRows([emptyRow()]);
    setPreviewRows([]);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          'flex max-h-[min(800px,90vh)] flex-col gap-0 p-0',
          step === 'preview' ? 'sm:max-w-4xl' : 'sm:max-w-lg'
        )}
      >
        <DialogHeader className="contents space-y-0 text-left">
          <DialogTitle className="border-b px-6 py-4 flex items-center gap-2">
            <GitFork size={18} />
            Input Penugasan Manual
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex max-h-full flex-col overflow-hidden">
          <div className="px-6 py-5">
            {step === 'input' && (
              <div className="space-y-5">
                {/* Term info */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Term Aktif</Label>
                  <p className="text-sm font-medium border border-border/50 bg-muted/20 px-3 py-2 rounded-md">
                    {selectedTerm || <span className="text-muted-foreground italic">Belum dipilih</span>}
                  </p>
                </div>

                {/* Column labels */}
                <div>
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-2">
                    <Label className="text-xs text-muted-foreground">Kode Asprak</Label>
                    <Label className="text-xs text-muted-foreground">MK Singkat</Label>
                    <span className="w-8" />
                  </div>

                  <div className="space-y-2">
                    {rows.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                        <Input
                          placeholder="cth: A001"
                          value={row.kode_asprak}
                          onChange={(e) => updateRow(idx, 'kode_asprak', e.target.value)}
                          className="h-8 text-sm font-mono"
                        />
                        <Input
                          placeholder="cth: ALPRO"
                          value={row.mk_singkat}
                          onChange={(e) => updateRow(idx, 'mk_singkat', e.target.value)}
                          className="h-8 text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeRow(idx)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 border-dashed text-muted-foreground hover:text-foreground"
                  onClick={addRow}
                >
                  <Plus size={14} />
                  Tambah Baris
                </Button>

                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
              </div>
            )}

            {step === 'preview' && (
              <PlottingCSVPreview
                rows={previewRows}
                term={selectedTerm}
                onConfirm={handleConfirm}
                onBack={() => {
                  setStep('input');
                  setPreviewRows([]);
                }}
                onResolve={handleResolve}
                onToggleSelect={(idx) =>
                  setPreviewRows((p) => {
                    const u = [...p];
                    u[idx].selected = !u[idx].selected;
                    return u;
                  })
                }
                onToggleAll={(checked) =>
                  setPreviewRows((p) =>
                    p.map((r) => (r.status === 'invalid' ? r : { ...r, selected: checked }))
                  )
                }
                loading={loading}
              />
            )}
          </div>
        </ScrollArea>

        {step === 'input' && (
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={handleClose} className="mr-auto">
              Batal
            </Button>
            <Button onClick={handleValidate} disabled={loading || !selectedTerm} className="gap-2">
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <CheckCircle2 size={15} />
              )}
              Validasi &amp; Preview
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
