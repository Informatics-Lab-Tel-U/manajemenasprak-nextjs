'use client';

import React, { useState } from 'react';


import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle2, Save, Loader2 , ArrowLeft} from 'lucide-react';
import { toast } from 'sonner';

import { 
  useOnboardingStore
} from '@/store/useOnboardingStore';






import { useTermStore } from '@/store/useTermStore';

const steps = [
  { id: 'praktikum', title: 'Data Praktikum', description: 'Buat tahun ajaran', icon: <BookOpen /> },
  { id: 'matkul', title: 'Mata Kuliah', description: 'Tambahkan MK', icon: <BookOpen /> },
  { id: 'jadwal', title: 'Preview & Simpan', description: 'Konfirmasi Data', icon: <Save /> },
  { id: 'selesai', title: 'Selesai', description: 'Setup berhasil', icon: <CheckCircle2 /> },
];


export default function PreviewStep() {
  const { draft, setCurrentStep, markStepCompleted } = useOnboardingStore();
  const { setActiveTerm } = useTermStore();
  const [loading, setLoading] = useState(false);

  const praktikumList = draft.praktikumList || [];
  const mkList = draft.mataKuliahData || [];

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      const payload = {
        praktikumList,
        mataKuliahList: mkList
      };

      const res = await fetch('/api/tahun-ajaran/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      
      if (!res.ok) throw new Error(result.error || 'Gagal menyimpan data ke database');
      
      toast.success('Semua data berhasil disimpan ke Database!');
      if (praktikumList.length > 0) {
        setActiveTerm(praktikumList[0].tahun_ajaran);
      }
      
      markStepCompleted('jadwal');
      setCurrentStep('selesai');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Langkah 3: Preview & Simpan Permanen</CardTitle>
        <CardDescription>
          Harap periksa kembali draf Praktikum dan Mata Kuliah Anda sebelum menyimpannya secara permanen ke Database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        <div className="space-y-4">
          {praktikumList.map((prak, pIdx) => {
            const mks = mkList.filter(mk => mk.id_praktikum === prak.tempId);
            return (
              <div key={prak.tempId} className="border rounded-lg p-4 bg-muted/5">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">{pIdx + 1}</div>
                    <h3 className="font-semibold text-lg">{prak.nama} <span className="text-sm font-normal text-muted-foreground">({prak.tahun_ajaran})</span></h3>
                  </div>
                </div>
                {mks.length > 0 ? (
                  <div className="pl-8 space-y-2">
                    {mks.map((mk, mkIdx) => (
                      <div
                        key={mk.id || `${prak.tempId || pIdx}_${mk.nama_lengkap}_${mk.program_studi || ''}_${mkIdx}`}
                        className="flex items-center text-sm border-l-2 pl-3 py-1"
                      >
                        <span>{mk.nama_lengkap} <span className="text-muted-foreground">- {mk.program_studi}</span></span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="pl-8 text-sm text-muted-foreground italic">Tidak ada Mata Kuliah</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t p-6">
        <Button variant="outline" onClick={() => setCurrentStep('matkul')} disabled={loading} className="shrink-0 min-w-[140px]">
          <ArrowLeft className="mr-2 h-4 w-4" /> Sebelumnya
        </Button>
        <Button onClick={handleSaveAll} disabled={loading} className="shrink-0 min-w-[160px] bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {loading ? 'Menyimpan...' : 'Simpan Permanen'}
        </Button>
      </CardFooter>
    </Card>
  );
}
