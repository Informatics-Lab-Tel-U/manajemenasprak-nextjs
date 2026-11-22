'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X } from 'lucide-react';
import { NavButton } from '@/components/ui/nav-button';
import { toast } from 'sonner';
import { useAsprakOnboardStore } from '@/store/useAsprakOnboardStore';
import { bulkImportAspraks, bulkImportAspraksWithPlotting } from '@/lib/fetchers/asprakFetcher';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { HIDE_ASLAB_YEAR } from '@/constants';

function getAslabTerm(angkatan?: number): string {
  if (!angkatan || isNaN(angkatan)) return '';
  const start = (angkatan + 3) % 100;
  const end = (angkatan + 4) % 100;
  return `${start.toString().padStart(2, '0')}${end.toString().padStart(2, '0')}`;
}

interface StepPreviewFinalAsprakProps {
  term: string;
}

export default function StepPreviewFinalAsprak({ term }: StepPreviewFinalAsprakProps) {
  const { 
    validatedAsprakRows, 
    validatedPlottingRows, 
    setCurrentStep, 
    markStepCompleted 
  } = useAsprakOnboardStore();
  
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);

    try {
      if (validatedAsprakRows.length === 0 && validatedPlottingRows.length === 0) {
        throw new Error('Tidak ada data yang bisa disimpan.');
      }

      if (validatedPlottingRows.length > 0) {
        // Use the new combined transaction API
        const payload = validatedPlottingRows.map(row => ({
          asprak_id: row.asprak_id,
          praktikum_id: row.praktikum_id,
          kode_asprak: row.kode_asprak,
        }));

        const result = await bulkImportAspraksWithPlotting(validatedAsprakRows, payload);
        if (!result.ok) {
          throw new Error(result.error || 'Gagal menyimpan data Asprak dan Penugasan Plotting.');
        }

        if (result.data?.errors && result.data.errors.length > 0) {
          throw new Error(`DB Error saat menyimpan data: ${result.data.errors.join(' | ')}`);
        }
      } else {
        // Fallback for when there's no plotting
        const result = await bulkImportAspraks(validatedAsprakRows);
        if (!result.ok) {
          throw new Error(result.error || 'Gagal menyimpan data Asprak.');
        }

        if (result.data?.errors && result.data.errors.length > 0) {
          throw new Error(`DB Error saat menyimpan Asprak: ${result.data.errors.join(' | ')}`);
        }
      }

      toast.success('Data Asprak dan Penugasan berhasil disimpan!');
      markStepCompleted('preview-final');
      setCurrentStep('selesai');
    } catch (e: any) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    setCurrentStep('plotting');
  };

  return (
    <Card className="bg-transparent border-border shadow-none w-full">
      <CardHeader>
        <CardTitle className="text-xl">Langkah 3: Preview Final</CardTitle>
        <CardDescription>
          Ringkasan data keseluruhan yang akan disimpan secara permanen ke sistem.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-start gap-2 whitespace-pre-wrap">
              <X className="w-4 h-4 mt-0.5" />
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-muted/30 p-6 rounded-lg border border-border/50 space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">Profil Asprak</h3>
            </div>
            {validatedAsprakRows.length > 0 && (
              <ScrollArea className="h-[200px] border rounded-md mt-4">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead>NIM</TableHead>
                      <TableHead>Nama Lengkap</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Kode</TableHead>
                      <TableHead>Angkatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validatedAsprakRows.map((r, i) => (
                      <TableRow key={r.nim}>
                        <TableCell>{r.nim}</TableCell>
                        <TableCell className="font-medium">{r.nama_lengkap}</TableCell>
                        <TableCell>
                          {r.role === 'ASLAB' ? (
                            <Badge variant="default" className="px-2 py-0.5">
                              ASLAB {!HIDE_ASLAB_YEAR && getAslabTerm(r.angkatan)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground font-medium text-xs border border-border px-2 py-1 rounded bg-muted/20">
                              {r.role || 'ASPRAK'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="font-mono">
                            {r.kode}
                          </Badge>
                        </TableCell>
                        <TableCell>{r.angkatan}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>

          <div className="bg-muted/30 p-6 rounded-lg border border-border/50 space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">Penugasan (Plotting)</h3>
            </div>
            {validatedPlottingRows.length > 0 && (
              <ScrollArea className="h-[200px] border rounded-md mt-4">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead>Kode Asprak</TableHead>
                      <TableHead>Mata Kuliah</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validatedPlottingRows.map((r, i) => (
                      <TableRow key={`${r.kode_asprak}_${r.mk_singkat}`}>
                        <TableCell>
                          <Badge variant="default" className="font-mono">
                            {r.kode_asprak}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{r.mk_singkat}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>
        </div>

        <Alert className="bg-muted/50 border-border">
          <AlertDescription className="text-muted-foreground font-medium">
            Pastikan data di atas sudah benar. Setelah disimpan, data ini akan terlihat di menu utama Data Asprak.
          </AlertDescription>
        </Alert>

        <div className="flex justify-between items-center pt-4 border-t">
          <NavButton 
            direction="prev"
            onClick={handleBack} 
            disabled={saving}
          />
          <NavButton 
            direction="next"
            onClick={handleConfirm} 
            disabled={saving || (validatedAsprakRows.length === 0 && validatedPlottingRows.length === 0)}
            loading={saving}
            loadingText="Menyimpan Data..."
            className="min-w-[160px] bg-primary text-primary-foreground hover:bg-primary/90 shadow-none"
          >
            Simpan Keseluruhan
          </NavButton>
        </div>
      </CardContent>
    </Card>
  );
}
