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
import { updateHeroTitlesData } from '@/services/webConfigService';

const DEFAULT_TITLE = 'Informatics Laboratory';

interface HeroTitleManagerProps {
  initialData: string[];
}

export default function HeroTitleManager({ initialData }: HeroTitleManagerProps) {
  // Hanya simpan teks EKSTRA (buang "Informatics Laboratory" karena itu selalu default)
  const [extras, setExtras] = useState<string[]>(() => {
    return (initialData ?? []).filter((t) => t.trim() !== DEFAULT_TITLE);
  });

  const [isPending, startTransition] = useTransition();

  const handleAddTitle = () => {
    setExtras((prev) => [...prev, '']);
  };

  const handleRemove = (index: number) => {
    setExtras((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= extras.length) return;

    setExtras((prev) => {
      const updated = [...prev];
      [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
      return updated;
    });
  };

  const handleChange = (index: number, value: string) => {
    setExtras((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleSave = () => {
    const cleanedExtras = extras.map((t) => t.trim()).filter((t) => t.length > 0 && t !== DEFAULT_TITLE);
    // Simpan: default selalu jadi elemen pertama di backend
    const payload = [DEFAULT_TITLE, ...cleanedExtras];

    startTransition(async () => {
      const result = await updateHeroTitlesData(payload);
      if (result.success) {
        setExtras(cleanedExtras);
        toast.success('Daftar judul hero berhasil disimpan.');
      } else {
        toast.error(`Gagal menyimpan: ${result.error || 'Terjadi kesalahan sistem'}`);
      }
    });
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Teks Judul Tambahan (Flip Text)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Teks <span className="font-medium text-foreground">Informatics Laboratory</span> selalu tampil sebagai judul utama. Tambahkan teks lain untuk animasi flip bergantian.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleAddTitle}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Teks
        </Button>
      </div>

      <div className="p-6 space-y-4">
        {/* Default title — selalu tampil, tidak bisa dihapus */}
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/30">
          <span className="text-xs font-mono text-muted-foreground w-6 text-center shrink-0">#1</span>
          <span className="flex-1 text-sm font-medium text-muted-foreground px-3 py-2">
            {DEFAULT_TITLE}
          </span>
          <span className="text-xs text-muted-foreground shrink-0 pr-1">Default</span>
        </div>

        {extras.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Belum ada teks tambahan. Hanya <span className="font-medium">{DEFAULT_TITLE}</span> yang tampil, tanpa animasi flip.
          </p>
        ) : (
          extras.map((title, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background"
            >
              <span className="text-xs font-mono text-muted-foreground w-6 text-center shrink-0">
                #{index + 2}
              </span>

              <div className="flex-1">
                <Input
                  value={title}
                  placeholder="Contoh: IFLab Telkom University"
                  onChange={(e) => handleChange(index, e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={index === 0}
                  onClick={() => handleMove(index, 'up')}
                  title="Geser ke atas"
                  className="h-8 w-8"
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={index === extras.length - 1}
                  onClick={() => handleMove(index, 'down')}
                  title="Geser ke bawah"
                  className="h-8 w-8"
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(index)}
                  title="Hapus teks ini"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
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
