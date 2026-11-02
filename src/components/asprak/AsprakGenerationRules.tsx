import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  getWords,
  rulesFor1Word,
  rulesFor2Words,
  rulesFor3Words,
  generateStrategicCandidates,
  generateFullCandidates,
} from '@/utils/asprakCodeGenerator';

interface AsprakGenerationRulesProps {
  existingCodes?: string[];
}

const generateCodes = (name: string, generator: (words: string[]) => string[]) => {
  const words = getWords(name);
  if (!words.length) return [];
  try {
    // Check word count requirements for specific generators to avoid errors
    if (generator === rulesFor1Word && words.length < 1) return [];
    if (generator === rulesFor2Words && words.length < 2) return [];
    if (generator === rulesFor3Words && words.length < 3) return [];

    const rawCodes = generator(words);
    // Validate length - strictly 3 chars
    return rawCodes.map((code) => (code.length === 3 ? code : null));
  } catch {
    return [];
  }
};

const EMPTY_ITEMS: string[] = [];

export default function AsprakGenerationRules({ existingCodes = EMPTY_ITEMS }: AsprakGenerationRulesProps) {
  const existingSet = useMemo(() => new Set(existingCodes), [existingCodes]);

  const getCodeStatus = (code: string | null, index: number, allCodes: (string | null)[]) => {
    if (!code) return 'none';
    if (existingSet.has(code)) return 'taken';
    const firstAvailableIdx = allCodes.findIndex((c) => c && !existingSet.has(c));
    if (firstAvailableIdx === index) return 'chosen';
    return 'available';
  };

  const renderCodeSpan = (code: string | null, index: number, allCodes: (string | null)[]) => {
    const status = getCodeStatus(code, index, allCodes);
    if (!code || status === 'none') {
      return <span className="font-mono text-muted-foreground">N/A</span>;
    }
    if (status === 'taken') {
      return <span className="font-mono font-bold text-red-500">{code}</span>;
    }
    if (status === 'chosen') {
      return <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{code}</span>;
    }
    return <span className="font-mono font-bold text-green-600 dark:text-green-500">{code}</span>;
  };

  const [name1, setName1] = useState('BUDI');
  const [name2, setName2] = useState('ANDI WIJAYA');
  const [name3, setName3] = useState('MUHAMMAD ABIYU ALGHIFARI');
  const [fallbackName, setFallbackName] = useState('SITI NUR AZIZAH PUTRI');


  const codes1 = generateCodes(name1, rulesFor1Word);
  const codes2 = generateCodes(name2, rulesFor2Words);
  const codes3 = generateCodes(name3, rulesFor3Words);

  // Fallback generation
  const fallbackWords = getWords(fallbackName);
  const strategicCandidates =
    fallbackWords.length > 0 ? generateStrategicCandidates(fallbackWords) : [];
  const fullCandidates = fallbackWords.length > 0 ? generateFullCandidates(fallbackName) : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-lg font-bold tracking-tight">Kode Asprak (3 Huruf)</h2>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          Sistem ini menggunakan algoritma deterministik bertingkat untuk menghasilkan kode unik 3
          huruf berdasarkan nama lengkap asisten. Jika terjadi konflik (kode sudah dipakai), sistem
          akan otomatis mencoba aturan berikutnya hingga menemukan kode yang tersedia.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Aturan 1 Kata */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Nama 1 Kata
              <Badge variant="outline">Risk: High Conflict</Badge>
            </CardTitle>
            <CardDescription>
              <div className="mt-2">
                <Label htmlFor="name1" className="text-xs font-semibold mb-1 block">
                  Contoh Input:
                </Label>
                <Input
                  id="name1"
                  value={name1}
                  onChange={(e) => setName1(e.target.value)}
                  placeholder="Masukkan nama 1 kata..."
                  className="h-8"
                />
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Rule ID</TableHead>
                  <TableHead>Logika</TableHead>
                  <TableHead className="w-[80px]">Hasil</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-xs">1.1</TableCell>
                  <TableCell>3 huruf pertama</TableCell>
                  <TableCell>{renderCodeSpan(codes1[0], 0, codes1)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">1.2</TableCell>
                  <TableCell>Huruf ke-1, 2, 4</TableCell>
                  <TableCell>{renderCodeSpan(codes1[1], 1, codes1)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">1.3</TableCell>
                  <TableCell>Huruf ke-1, 3, 4</TableCell>
                  <TableCell>{renderCodeSpan(codes1[2], 2, codes1)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">1.4</TableCell>
                  <TableCell>Huruf ke-1, 2, Akhir</TableCell>
                  <TableCell>{renderCodeSpan(codes1[3], 3, codes1)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Aturan 2 Kata */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Nama 2 Kata
              <Badge variant="secondary">Risk: Low</Badge>
            </CardTitle>
            <CardDescription>
              <div className="mt-2">
                <Label htmlFor="name2" className="text-xs font-semibold mb-1 block">
                  Contoh Input:
                </Label>
                <Input
                  id="name2"
                  value={name2}
                  onChange={(e) => setName2(e.target.value)}
                  placeholder="Masukkan nama 2 kata..."
                  className="h-8"
                />
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Rule ID</TableHead>
                  <TableHead>Logika (K1=Kata1, K2=Kata2)</TableHead>
                  <TableHead className="w-[80px]">Hasil</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-xs">2.1</TableCell>
                  <TableCell>Huruf 1,2(K1) + Huruf 1(K2)</TableCell>
                  <TableCell>{renderCodeSpan(codes2[0], 0, codes2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">2.2</TableCell>
                  <TableCell>Huruf 1(K1) + Huruf 1,2(K2)</TableCell>
                  <TableCell>{renderCodeSpan(codes2[1], 1, codes2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">2.3</TableCell>
                  <TableCell>Huruf 1(K1) + Huruf 1(K2) + Akhir(K2)</TableCell>
                  <TableCell>{renderCodeSpan(codes2[2], 2, codes2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">2.4</TableCell>
                  <TableCell>Huruf 1,2(K1) + Akhir(K2)</TableCell>
                  <TableCell>{renderCodeSpan(codes2[3], 3, codes2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Aturan 3 Kata */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Nama 3 Kata atau Lebih (3+)
              <Badge
                variant="default"
                className="bg-emerald-500/15 text-emerald-600 border-emerald-200"
              >
                Risk: Very Low
              </Badge>
            </CardTitle>
            <CardDescription>
              <div className="mt-2 max-w-md">
                <Label htmlFor="name3" className="text-xs font-semibold mb-1 block">
                  Contoh Input:
                </Label>
                <Input
                  id="name3"
                  value={name3}
                  onChange={(e) => setName3(e.target.value)}
                  placeholder="Masukkan nama 3 kata atau lebih..."
                  className="h-8"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Catatan: Untuk nama 4 kata atau lebih, hanya 3 kata pertama yang digunakan dalam
                  aturan standar.
                </p>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Rule ID</TableHead>
                    <TableHead>Logika</TableHead>
                    <TableHead className="w-[80px]">Hasil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono text-xs">3.1</TableCell>
                    <TableCell>Huruf pertama tiap kata (3 kata awal)</TableCell>
                    <TableCell>{renderCodeSpan(codes3[0], 0, codes3)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">3.2</TableCell>
                    <TableCell>Huruf 1(K1) + Huruf 1,2(K2)</TableCell>
                    <TableCell>{renderCodeSpan(codes3[1], 1, codes3)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">3.3</TableCell>
                    <TableCell>Huruf 1,2(K1) + Huruf 1(K2)</TableCell>
                    <TableCell>{renderCodeSpan(codes3[2], 2, codes3)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">3.4</TableCell>
                    <TableCell>Huruf 1(K1) + Huruf 1(K2) + Huruf 2(K3)</TableCell>
                    <TableCell>{renderCodeSpan(codes3[3], 3, codes3)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Rule ID</TableHead>
                    <TableHead>Logika</TableHead>
                    <TableHead className="w-[80px]">Hasil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono text-xs">3.5</TableCell>
                    <TableCell>Huruf 1(K1) + Huruf 1,2(K3)</TableCell>
                    <TableCell>{renderCodeSpan(codes3[4], 4, codes3)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">3.6</TableCell>
                    <TableCell>Huruf 1,2(K1) + Huruf 1(K3)</TableCell>
                    <TableCell>{renderCodeSpan(codes3[5], 5, codes3)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">3.7</TableCell>
                    <TableCell>Huruf 1(K1) + Huruf 1(K2) + Akhir(K3)</TableCell>
                    <TableCell>{renderCodeSpan(codes3[6], 6, codes3)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">3.8</TableCell>
                    <TableCell>Huruf 1(K1) + Huruf 2(K2) + Huruf 1(K3)</TableCell>
                    <TableCell>{renderCodeSpan(codes3[7], 7, codes3)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Universal / Fallback */}
        <Card className="md:col-span-2 border-dashed border-2">
          <CardHeader>
            <CardTitle>Sistem Fallback (Konflik Resolution)</CardTitle>
            <CardDescription>
              <div className="space-y-4">
                <p>
                  Digunakan jika semua aturan standar di atas menghasilkan kode yang sudah terpakai
                  (konflik) di database.
                </p>
                <div className="max-w-md">
                  <Label htmlFor="fallbackName" className="text-xs font-semibold mb-1 block">
                    Contoh Input Fallback:
                  </Label>
                  <Input
                    id="fallbackName"
                    value={fallbackName}
                    onChange={(e) => setFallbackName(e.target.value)}
                    placeholder="Masukkan nama untuk simulasi fallback..."
                    className="h-8"
                  />
                </div>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                <span>Level 1: Kombinatorik Strategis</span>
                <Badge variant="outline" className="text-[10px]">
                  {strategicCandidates.length} Candidates
                </Badge>
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Pool = [awal, tengah, akhir, ke-2] dari setiap kata.
              </p>
              <div className="bg-muted p-4 rounded-md font-mono text-xs space-y-2 h-[200px]">
                <ScrollArea className="h-full w-full">
                  <div className="grid grid-cols-4 gap-2">
                    {strategicCandidates.length > 0 ? (
                      strategicCandidates.map((c, idx) => {
                        const status = getCodeStatus(c, idx, strategicCandidates);
                        let bg = 'bg-background';
                        let textColor = 'text-foreground';
                        let border = 'border-border';

                        if (status === 'taken') {
                          bg = 'bg-red-50 dark:bg-red-950/20';
                          textColor = 'text-red-500 font-medium line-through decoration-red-500/50';
                          border = 'border-red-200 dark:border-red-800';
                        } else if (status === 'chosen') {
                          bg = 'bg-blue-50 dark:bg-blue-950/20';
                          textColor = 'text-blue-600 dark:text-blue-400 font-bold';
                          border = 'border-blue-300 dark:border-blue-700';
                        } else if (status === 'available') {
                          bg = 'bg-green-50 dark:bg-green-950/20';
                          textColor = 'text-green-600 dark:text-green-500 font-medium';
                          border = 'border-green-200 dark:border-green-800';
                        }

                        return (
                          <span
                            key={c + '-' + idx}
                            className={`text-center px-1 py-0.5 rounded border ${bg} ${textColor} ${border}`}
                          >
                            {c}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-muted-foreground col-span-4 block text-center py-4">
                        No combinatorics available
                      </span>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                <span>Level 2: Full Combinatorics</span>
                <Badge variant="outline" className="text-[10px]">
                  {fullCandidates.length} Candidates
                </Badge>
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                <span className="text-red-500 font-semibold">Last Resort.</span> Pool = Semua huruf
                unik dari nama.
              </p>
              <div className="bg-muted p-4 rounded-md font-mono text-xs space-y-2 h-[200px]">
                <ScrollArea className="h-full w-full">
                  <div className="grid grid-cols-4 gap-2">
                    {fullCandidates.length > 0 ? (
                      fullCandidates.map((c, idx) => {
                        const status = getCodeStatus(c, idx, fullCandidates);
                        let bg = 'bg-background';
                        let textColor = 'text-foreground';
                        let border = 'border-border';

                        if (status === 'taken') {
                          bg = 'bg-red-50 dark:bg-red-950/20';
                          textColor = 'text-red-500 font-medium line-through decoration-red-500/50';
                          border = 'border-red-200 dark:border-red-800';
                        } else if (status === 'chosen') {
                          bg = 'bg-blue-50 dark:bg-blue-950/20';
                          textColor = 'text-blue-600 dark:text-blue-400 font-bold';
                          border = 'border-blue-300 dark:border-blue-700';
                        } else if (status === 'available') {
                          bg = 'bg-green-50 dark:bg-green-950/20';
                          textColor = 'text-green-600 dark:text-green-500 font-medium';
                          border = 'border-green-200 dark:border-green-800';
                        }

                        return (
                          <span
                            key={c + '-' + idx}
                            className={`text-center px-1 py-0.5 rounded border ${bg} ${textColor} ${border}`}
                          >
                            {c}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-muted-foreground col-span-4 block text-center py-4">
                        No combinatorics available
                      </span>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legend Warna Hasil */}
        <div className="md:col-span-2 pt-2 border-t mt-2 pb-6">
          <h3 className="text-sm font-semibold mb-3">Keterangan Warna Hasil:</h3>
          <div className="flex flex-wrap gap-4 text-xs font-medium">
            <div className="flex items-center gap-2 p-2 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-red-600 dark:text-red-400">Sudah Dipakai (Konflik)</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-300 dark:border-blue-700">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-blue-600 dark:text-blue-400">
                Dimasukkan ke Database (Terpilih/Available)
              </span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-green-600 dark:text-green-500">
                Tersedia (Alternatif/Backup)
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            Sistem secara otomatis akan memilih kode{' '}
            <span className="font-semibold text-blue-500">warna biru</span> untuk dimasukkan ke
            database karena merupakan baris kode pertama dari atas yang belum terpakai oleh orang
            lain.
          </p>
        </div>
      </div>
    </div>
  );
}
