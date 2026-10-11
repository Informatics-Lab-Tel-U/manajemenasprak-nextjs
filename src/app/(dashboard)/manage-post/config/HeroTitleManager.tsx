'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface HeroTitleManagerProps {
  initialData: string[];
}

export default function HeroTitleManager({ initialData }: HeroTitleManagerProps) {
  const [titles, setTitles] = useState<string[]>(() => {
    if (initialData && initialData.length > 0) return initialData;
    return ['Informatics Laboratory'];
  });

  const [isPending, startTransition] = useTransition();

  const handleAddTitle = () => {
    setTitles((prev) => [...prev, '']);
  };

  const handleRemoveTitle = (index: number) => {
    if (titles.length <= 1) {
      toast.error('Minimal harus ada 1 teks judul.');
      return;
    }
    setTitles((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= titles.length) return;

    setTitles((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  const handleChange = (index: number, value: string) => {
    setTitles((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleSave = () => {
    const cleaned = titles.map((t) => t.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      toast.error('Teks judul tidak boleh kosong semua.');
      return;
    }

    startTransition(async () => {
      const result = await updateHeroTitlesData(cleaned);
      if (result.success) {
        setTitles(cleaned);
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
          <h2 className="text-lg font-semibold">Teks Judul Hero (Flip Text)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola daftar teks judul yang berganti dengan animasi flip di halaman utama blog.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleAddTitle}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Judul
        </Button>
      </div>

      <div className="p-6 space-y-4">
        {titles.map((title, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background"
          >
            <span className="text-xs font-mono text-muted-foreground w-6 text-center shrink-0">
              #{index + 1}
            </span>

            <div className="flex-1">
              <Input
                value={title}
                placeholder="Contoh: Informatics Laboratory"
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
                disabled={index === titles.length - 1}
                onClick={() => handleMove(index, 'down')}
                title="Geser ke bawah"
                className="h-8 w-8"
              >
                <ArrowDown className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={titles.length <= 1}
                onClick={() => handleRemoveTitle(index)}
                title="Hapus judul"
                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

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
