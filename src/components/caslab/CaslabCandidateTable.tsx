'use client';

import React, { useState, useMemo } from 'react';
import { Search, Edit2, Check, X, Trash2, Users, AlertCircle, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import type { CaslabCandidate } from '@/types/caslab';

interface CaslabCandidateTableProps {
  candidates: CaslabCandidate[];
  onUpdateCandidate: (id: string, updated: Partial<CaslabCandidate>) => void;
  onRemoveCandidate: (id: string) => void;
  onClearAll: () => void;
}

export function CaslabCandidateTable({
  candidates,
  onUpdateCandidate,
  onRemoveCandidate,
  onClearAll,
}: CaslabCandidateTableProps) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKode, setEditKode] = useState('');

  const filteredCandidates = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return candidates;
    return candidates.filter(
      (c) =>
        c.nama_lengkap.toLowerCase().includes(q) ||
        c.nim.toLowerCase().includes(q) ||
        c.kode.toLowerCase().includes(q)
    );
  }, [candidates, search]);

  const handleStartEdit = (c: CaslabCandidate) => {
    setEditingId(c.id);
    setEditKode(c.kode);
  };

  const handleSaveEdit = (id: string) => {
    const cleanKode = editKode.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(cleanKode)) {
      toast.error('Kode aslab harus terdiri dari 3 huruf kapital (contoh: MAB)');
      return;
    }

    // Check collision with other candidates
    const collision = candidates.some((c) => c.id !== id && c.kode === cleanKode);
    if (collision) {
      toast.warning(`Kode ${cleanKode} sudah digunakan peserta lain, tetapi tetap disimpan sesuai permintaan.`);
    }

    onUpdateCandidate(id, { kode: cleanKode, codeSource: 'manual' });
    setEditingId(null);
    toast.success('Kode aslab diperbarui');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditKode('');
  };

  if (candidates.length === 0) return null;

  return (
    <Card className="border border-border/80 shadow-sm bg-card/60 backdrop-blur-xs">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-border/50">
          <div>
            <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Daftar Peserta Caslab ({candidates.length} Orang)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Setiap peserta memiliki Kode Aslab unik 3 huruf. Anda dapat mengedit kode jika diperlukan.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari NIM, Nama, atau Kode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-xs"
              />
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={onClearAll}
              className="text-xs h-8 px-3"
            >
              Hapus Semua
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 overflow-hidden max-h-[360px] overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/70 text-muted-foreground sticky top-0 z-10 border-b border-border/60">
              <tr>
                <th className="py-2.5 px-3 font-semibold w-12 text-center">No</th>
                <th className="py-2.5 px-3 font-semibold w-28">Kode Aslab</th>
                <th className="py-2.5 px-3 font-semibold w-36">NIM</th>
                <th className="py-2.5 px-3 font-semibold">Nama Lengkap</th>
                <th className="py-2.5 px-3 font-semibold text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredCandidates.map((c, index) => {
                const isEditing = editingId === c.id;

                return (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-3 text-center text-muted-foreground font-mono">
                      {index + 1}
                    </td>
                    <td className="py-2 px-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={editKode}
                            onChange={(e) => setEditKode(e.target.value.toUpperCase())}
                            maxLength={3}
                            className="h-7 w-16 text-center font-mono font-bold text-xs uppercase p-1"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
                            onClick={() => handleSaveEdit(c.id)}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={handleCancelEdit}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="secondary"
                            className="font-mono font-bold tracking-wider px-2 py-0.5 text-[11px] bg-primary/10 text-primary border border-primary/20"
                          >
                            {c.kode}
                          </Badge>
                          {c.codeSource === 'generated' && (
                            <span title="Dibuat otomatis oleh algoritma">
                              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono font-medium text-foreground">
                      {c.nim}
                    </td>
                    <td className="py-2 px-3 font-medium text-foreground">
                      {c.nama_lengkap}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {!isEditing && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleStartEdit(c)}
                            title="Edit Kode Aslab"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => onRemoveCandidate(c.id)}
                          title="Hapus Peserta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
