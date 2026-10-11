'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Save,
  Plus,
  Trash2,
  Loader2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { updateHeroTitlesData, type HeroTitlePair } from '@/services/webConfigService';

const DEFAULT_PAIR: HeroTitlePair = { line1: 'Informatics', line2: 'Laboratory' };

interface HeroTitleManagerProps {
  initialData: HeroTitlePair[];
}

export default function HeroTitleManager({ initialData }: HeroTitleManagerProps) {
  // Only manage EXTRA pairs — default is always fixed
  const [extras, setExtras] = useState<HeroTitlePair[]>(() =>
    (initialData ?? []).filter(
      (p): p is HeroTitlePair =>
        p !== null &&
        typeof p === 'object' &&
        typeof p.line1 === 'string' &&
        typeof p.line2 === 'string' &&
        !(p.line1.trim() === DEFAULT_PAIR.line1 && p.line2.trim() === DEFAULT_PAIR.line2)
    )
  );

  const [isPending, startTransition] = useTransition();

  const handleAdd = () => {
    setExtras((prev) => [...prev, { line1: '', line2: '' }]);
  };

  const handleRemove = (index: number) => {
    setExtras((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= extras.length) return;
    setExtras((prev) => {
      const updated = [...prev];
      [updated[index], updated[target]] = [updated[target], updated[index]];
      return updated;
    });
  };

  const handleChange = (index: number, field: 'line1' | 'line2', value: string) => {
    setExtras((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = () => {
    const validExtras = extras.filter((p) => p.line1.trim() && p.line2.trim());
    // Default pair always first
    const payload: HeroTitlePair[] = [DEFAULT_PAIR, ...validExtras];

    startTransition(async () => {
      const result = await updateHeroTitlesData(payload);
      if (result.success) {
        setExtras(validExtras);
        toast.success('Perubahan judul berhasil disimpan.');
      } else {
        toast.error(`Gagal menyimpan: ${result.error || 'Terjadi kesalahan sistem'}`);
      }
    });
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Teks Judul Beranda</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola teks judul utama yang tampil di beranda blog.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Judul
        </Button>
      </div>

      <div className="p-6 space-y-4">
        {/* Default pair — always read-only */}
        <div className="rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
          <div className="px-4 py-2 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">#1</span>
            <span className="text-xs text-muted-foreground">Bawaan</span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-border/40">
            <div className="px-4 py-3">
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Baris 1</p>
              <p className="text-sm font-semibold">{DEFAULT_PAIR.line1}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Baris 2</p>
              <p className="text-sm font-semibold">{DEFAULT_PAIR.line2}</p>
            </div>
          </div>
        </div>

        {extras.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2 pl-1">
            Belum ada judul tambahan.
          </p>
        ) : (
          extras.map((pair, index) => (
            <div
              key={index}
              className="rounded-lg border border-border bg-background overflow-hidden"
            >
              <div className="px-4 py-2 border-b border-border/40 bg-muted/10 flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-muted-foreground">#{index + 2}</span>
                <div className="flex items-center gap-1 ml-auto">
                  <Button
                    variant="ghost" size="icon"
                    disabled={index === 0}
                    onClick={() => handleMove(index, 'up')}
                    className="h-7 w-7"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    disabled={index === extras.length - 1}
                    onClick={() => handleMove(index, 'down')}
                    className="h-7 w-7"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => handleRemove(index)}
                    className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-border/40">
                <div className="p-4 space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Baris 1</label>
                  <Input
                    value={pair.line1}
                    placeholder="Contoh: Informatics"
                    onChange={(e) => handleChange(index, 'line1', e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="p-4 space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Baris 2</label>
                  <Input
                    value={pair.line2}
                    placeholder="Contoh: Laboratory"
                    onChange={(e) => handleChange(index, 'line2', e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          ))
        )}

        <div className="pt-4 flex justify-end border-t border-border">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </div>
    </div>
  );
}
