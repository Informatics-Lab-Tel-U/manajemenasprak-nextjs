'use client';

import { useState, useEffect } from 'react';
import { useTermStore } from '@/store/useTermStore';
import { fetchJadwalByTerm } from '@/lib/fetchers/jadwalFetcher';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { generateFont } from '@/services/fontService';
import { toast } from 'sonner';

export default function FontGeneratorForm({ 
  initialRooms = [], 
  initialTerm = '' 
}: { 
  initialRooms?: string[];
  initialTerm?: string;
}) {
  const [labId, setLabId] = useState('');
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<string[]>(initialRooms);
  
  const { activeTerm } = useTermStore();

  useEffect(() => {
    async function loadDynamicRooms() {
      if (!activeTerm || activeTerm === initialTerm) {
        setRooms(initialRooms);
        return;
      }
      
      setLoading(true);
      try {
        const result = await fetchJadwalByTerm(activeTerm);
        if (result.ok && result.data) {
          const newRooms = new Set<string>();
          result.data.forEach((j) => {
            if (j.ruangan && j.ruangan !== 'Tanpa Ruangan' && j.ruangan.trim() !== '') {
              newRooms.add(j.ruangan.trim());
            }
          });
          setRooms(Array.from(newRooms).sort());
          setLabId(''); // reset selection when term changes
        }
      } catch (err) {
        console.error('Failed to fetch dynamic rooms', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadDynamicRooms();
  }, [activeTerm, initialTerm, initialRooms]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labId.trim()) {
      toast.error('Masukkan ID Ruangan Lab');
      return;
    }

    setLoading(true);
    try {
      const base64 = await generateFont(labId.trim());
      
      if (!base64) {
        toast.error('Gagal men-generate font');
        return;
      }

      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'font/ttf' });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `IFLab-${labId.trim()}-Secret.ttf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Font berhasil diunduh');
    } catch (err) {
      toast.error('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-transparent border-border shadow-none">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Generator Font Fingerprint</CardTitle>
        <CardDescription>
          Pilih nama ruangan untuk mengunduh file font.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleGenerate} className="space-y-4">
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="labId">ID Ruangan Lab (contoh: TULT0604)</Label>
            {rooms.length > 0 ? (
              <Select value={labId} onValueChange={setLabId} disabled={loading}>
                <SelectTrigger id="labId" className="w-full">
                  <SelectValue placeholder="Pilih Ruangan Lab" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room} value={room}>
                      {room}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="labId"
                placeholder="TULT0604"
                value={labId}
                onChange={(e) => setLabId(e.target.value)}
                disabled={loading}
                required
              />
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Spinner className="mr-2" />}
            {loading ? 'Men-generate...' : 'Generate & Download TTF'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
