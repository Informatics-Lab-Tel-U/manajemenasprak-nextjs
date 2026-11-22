'use client';

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
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

interface RuleDefinition {
  id: string;
  logic: string;
}

const RULES_1_WORD: RuleDefinition[] = [
  { id: '1.1', logic: '3 huruf pertama' },
  { id: '1.2', logic: 'Huruf ke-1, 2, 4' },
  { id: '1.3', logic: 'Huruf ke-1, 3, 4' },
  { id: '1.4', logic: 'Huruf ke-1, 2, Akhir' },
];

const RULES_2_WORDS: RuleDefinition[] = [
  { id: '2.1', logic: 'Huruf 1,2(K1) + Huruf 1(K2)' },
  { id: '2.2', logic: 'Huruf 1(K1) + Huruf 1,2(K2)' },
  { id: '2.3', logic: 'Huruf 1(K1) + Huruf 1(K2) + Akhir(K2)' },
  { id: '2.4', logic: 'Huruf 1,2(K1) + Akhir(K2)' },
];

const RULES_3_WORDS: RuleDefinition[] = [
  { id: '3.1', logic: 'Huruf pertama tiap kata (3 kata awal)' },
  { id: '3.2', logic: 'Huruf 1(K1) + Huruf 1,2(K2)' },
  { id: '3.3', logic: 'Huruf 1,2(K1) + Huruf 1(K2)' },
  { id: '3.4', logic: 'Huruf 1(K1) + Huruf 1(K2) + Huruf 2(K3)' },
  { id: '3.5', logic: 'Huruf 1(K1) + Huruf 1,2(K3)' },
  { id: '3.6', logic: 'Huruf 1,2(K1) + Huruf 1(K3)' },
  { id: '3.7', logic: 'Huruf 1(K1) + Huruf 1(K2) + Akhir(K3)' },
  { id: '3.8', logic: 'Huruf 1(K1) + Huruf 2(K2) + Huruf 1(K3)' },
];

const SAMPLE_PRESETS = [
  { label: '1 Kata', value: 'BUDI' },
  { label: '2 Kata', value: 'ANDI WIJAYA' },
  { label: '3+ Kata', value: 'MUHAMMAD ABIYU ALGHIFARI' },
];

const TABLE_EDGE_PADDING =
  '[&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4';

const EMPTY_ITEMS: string[] = [];

type CodeStatus = 'none' | 'taken' | 'chosen' | 'available';

const evaluateCandidates = (
  words: string[],
  minWords: number,
  generator: (w: string[]) => string[]
): (string | null)[] => {
  if (words.length < minWords) return [];
  try {
    return generator(words).map((code) => (code.length === 3 ? code : null));
  } catch {
    return [];
  }
};

export default function AsprakGenerationRules({
  existingCodes = EMPTY_ITEMS,
}: AsprakGenerationRulesProps) {
  const [sampleName, setSampleName] = useState('MUHAMMAD ABIYU ALGHIFARI');
  const existingSet = useMemo(() => new Set(existingCodes), [existingCodes]);

  const words = useMemo(() => getWords(sampleName), [sampleName]);

  const codes1 = useMemo(() => evaluateCandidates(words, 1, rulesFor1Word), [words]);
  const codes2 = useMemo(() => evaluateCandidates(words, 2, rulesFor2Words), [words]);
  const codes3 = useMemo(() => evaluateCandidates(words, 3, rulesFor3Words), [words]);

  const strategicCandidates = useMemo(
    () => (words.length > 0 ? generateStrategicCandidates(words) : []),
    [words]
  );
  const fullCandidates = useMemo(
    () => (words.length > 0 ? generateFullCandidates(sampleName) : []),
    [words, sampleName]
  );

  const activeTier = words.length === 0 ? 0 : words.length === 1 ? 1 : words.length === 2 ? 2 : 3;

  const getCodeStatus = (
    code: string | null,
    index: number,
    allCodes: (string | null)[],
    isTierActive: boolean
  ): CodeStatus => {
    if (!code) return 'none';
    if (existingSet.has(code)) return 'taken';
    if (isTierActive) {
      const firstAvailableIdx = allCodes.findIndex((c) => c && !existingSet.has(c));
      if (firstAvailableIdx === index) return 'chosen';
    }
    return 'available';
  };

  // Determine overall winning code across the full pipeline for the current input
  const resolvedOutcome = useMemo(() => {
    if (words.length === 0) {
      return { code: null, source: 'Masukkan nama untuk simulasi' };
    }

    const activeStandard = activeTier === 1 ? codes1 : activeTier === 2 ? codes2 : codes3;
    const activeRules =
      activeTier === 1 ? RULES_1_WORD : activeTier === 2 ? RULES_2_WORDS : RULES_3_WORDS;

    const stdIdx = activeStandard.findIndex((c) => c && !existingSet.has(c));
    if (stdIdx !== -1 && activeStandard[stdIdx]) {
      return {
        code: activeStandard[stdIdx],
        source: `Rule ${activeRules[stdIdx].id}`,
      };
    }

    const stratCode = strategicCandidates.find((c) => c && !existingSet.has(c));
    if (stratCode) {
      return { code: stratCode, source: 'Fallback Level 1 (Strategis)' };
    }

    const fullCode = fullCandidates.find((c) => c && !existingSet.has(c));
    if (fullCode) {
      return { code: fullCode, source: 'Fallback Level 2 (Full)' };
    }

    return { code: null, source: 'Semua kandidat konflik' };
  }, [words.length, activeTier, codes1, codes2, codes3, strategicCandidates, fullCandidates, existingSet]);

  const standardWinnerUsed = resolvedOutcome.source.startsWith('Rule ');

  const renderCodeBadge = (
    code: string | null,
    index: number,
    allCodes: (string | null)[],
    isTierActive: boolean
  ) => {
    const status = getCodeStatus(code, index, allCodes, isTierActive);
    if (!code || status === 'none') {
      return <span className="font-mono text-xs text-muted-foreground">-</span>;
    }
    if (status === 'taken') {
      return (
        <Badge
          variant="outline"
          className="font-mono text-xs border-destructive/40 bg-destructive/10 text-destructive line-through"
        >
          {code}
        </Badge>
      );
    }
    if (status === 'chosen') {
      return (
        <Badge variant="default" className="font-mono text-xs">
          {code}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="font-mono text-xs text-foreground">
        {code}
      </Badge>
    );
  };

  const renderRuleTable = (
    rules: RuleDefinition[],
    codes: (string | null)[],
    isTierActive: boolean,
    k1Label?: string
  ) => (
    <div className="overflow-hidden rounded-md border border-border">
      <Table className={TABLE_EDGE_PADDING}>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead className="w-[72px]">Rule</TableHead>
            <TableHead>{k1Label ? `Logika (${k1Label})` : 'Logika'}</TableHead>
            <TableHead className="w-[96px] text-right">Hasil</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule, idx) => (
            <TableRow key={rule.id}>
              <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                {rule.id}
              </TableCell>
              <TableCell className="text-sm text-foreground">{rule.logic}</TableCell>
              <TableCell className="text-right">
                {renderCodeBadge(codes[idx] ?? null, idx, codes, isTierActive)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderCandidateGrid = (
    candidates: string[],
    allowChosen: boolean,
    emptyText: string
  ) => (
    <ScrollArea className="h-[220px] rounded-md border border-border p-3">
      {candidates.length > 0 ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 font-mono text-xs">
          {candidates.map((c, idx) => {
            const status = getCodeStatus(c, idx, candidates, allowChosen);
            return (
              <span
                key={`${c}-${idx}`}
                className={cn(
                  'text-center px-1.5 py-1 rounded-md border tabular-nums',
                  status === 'chosen' && 'bg-primary text-primary-foreground border-primary font-semibold',
                  status === 'taken' &&
                    'bg-destructive/10 text-destructive border-destructive/30 line-through',
                  status === 'available' && 'bg-transparent text-foreground border-border'
                )}
              >
                {c}
              </span>
            );
          })}
        </div>
      ) : (
        <div className="h-[190px] flex items-center justify-center text-xs text-muted-foreground">
          {emptyText}
        </div>
      )}
    </ScrollArea>
  );

  return (
    <div className="space-y-6">
      {/* Unified Simulator Card */}
      <Card className="bg-transparent border-border shadow-none">
        <CardHeader className="pb-4 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold">Simulator Kode Asprak (3 Huruf)</CardTitle>
              <CardDescription>
                Algoritma deterministik bertingkat berdasarkan jumlah kata dan pengecekan konflik kode di database.
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit tabular-nums shrink-0">
              {existingSet.size} Kode Terdaftar
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_280px] items-end">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="simulasi-nama" className="text-sm font-medium">
                  Nama Lengkap Asisten
                </Label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {SAMPLE_PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      type="button"
                      variant={sampleName === preset.value ? 'secondary' : 'outline'}
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setSampleName(preset.value)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <Input
                  id="simulasi-nama"
                  value={sampleName}
                  onChange={(e) => setSampleName(e.target.value)}
                  placeholder="Ketik nama asisten untuk simulasi..."
                  className="pr-9"
                />
                {sampleName && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSampleName('')}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                    aria-label="Hapus input simulasi"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-md border border-border px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Kode Terpilih</p>
                <p className="text-xs font-medium text-foreground truncate mt-0.5">
                  {resolvedOutcome.source}
                </p>
              </div>
              <div className="font-mono text-xl font-semibold tracking-wider text-foreground tabular-nums shrink-0">
                {resolvedOutcome.code ?? '-'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Status:</span>
            <span className="inline-flex items-center gap-1.5">
              <Badge variant="default" className="font-mono text-[11px]">ABC</Badge>
              <span>Dipilih otomatis</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Badge
                variant="outline"
                className="font-mono text-[11px] border-destructive/40 bg-destructive/10 text-destructive line-through"
              >
                ABC
              </Badge>
              <span>Sudah dipakai (konflik)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Badge variant="outline" className="font-mono text-[11px]">ABC</Badge>
              <span>Tersedia</span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Rules & Fallback Tabs */}
      <Tabs defaultValue="standard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="standard">Aturan Standar (16)</TabsTrigger>
          <TabsTrigger value="fallback" className="tabular-nums">
            Sistem Fallback ({strategicCandidates.length + fullCandidates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card
              className={cn(
                'bg-transparent shadow-none',
                activeTier === 1 ? 'border-foreground/40' : 'border-border'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base font-semibold">Nama 1 Kata</CardTitle>
                  <div className="flex items-center gap-1.5">
                    {activeTier === 1 && <Badge variant="secondary">Aktif</Badge>}
                    <Badge variant="outline">Konflik Tinggi</Badge>
                  </div>
                </div>
                <CardDescription>Dipakai ketika nama hanya memiliki 1 kata.</CardDescription>
              </CardHeader>
              <CardContent>{renderRuleTable(RULES_1_WORD, codes1, activeTier === 1)}</CardContent>
            </Card>

            <Card
              className={cn(
                'bg-transparent shadow-none',
                activeTier === 2 ? 'border-foreground/40' : 'border-border'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base font-semibold">Nama 2 Kata</CardTitle>
                  <div className="flex items-center gap-1.5">
                    {activeTier === 2 && <Badge variant="secondary">Aktif</Badge>}
                    <Badge variant="outline">Konflik Rendah</Badge>
                  </div>
                </div>
                <CardDescription>Dipakai ketika nama memiliki tepat 2 kata.</CardDescription>
              </CardHeader>
              <CardContent>
                {renderRuleTable(RULES_2_WORDS, codes2, activeTier === 2, 'K1=Kata1, K2=Kata2')}
              </CardContent>
            </Card>

            <Card
              className={cn(
                'md:col-span-2 bg-transparent shadow-none',
                activeTier === 3 ? 'border-foreground/40' : 'border-border'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base font-semibold">Nama 3 Kata atau Lebih</CardTitle>
                  <div className="flex items-center gap-1.5">
                    {activeTier === 3 && <Badge variant="secondary">Aktif</Badge>}
                    <Badge variant="outline">Konflik Sangat Rendah</Badge>
                  </div>
                </div>
                <CardDescription>
                  Untuk nama 4 kata atau lebih, hanya 3 kata pertama yang digunakan pada aturan standar.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                {renderRuleTable(RULES_3_WORDS.slice(0, 4), codes3.slice(0, 4), activeTier === 3)}
                {renderRuleTable(
                  RULES_3_WORDS.slice(4),
                  codes3.slice(4),
                  activeTier === 3 &&
                    !codes3.slice(0, 4).some((c) => c && !existingSet.has(c))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fallback">
          <Card className="bg-transparent border-border shadow-none">
            <CardHeader className="pb-4 border-b border-border">
              <CardTitle className="text-base font-semibold">Sistem Fallback (Resolusi Konflik)</CardTitle>
              <CardDescription>
                Dijalankan otomatis jika semua aturan standar di atas menghasilkan kode yang sudah terpakai di database.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Level 1: Kombinatorik Strategis
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pool = [awal, tengah, akhir, ke-2] dari setiap kata.
                    </p>
                  </div>
                  <Badge variant="outline" className="tabular-nums shrink-0">
                    {strategicCandidates.length} Kandidat
                  </Badge>
                </div>
                {renderCandidateGrid(
                  strategicCandidates,
                  !standardWinnerUsed,
                  'Masukkan nama untuk melihat kandidat strategis'
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Level 2: Full Combinatorics
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pilihan terakhir menggunakan seluruh huruf unik dari nama.
                    </p>
                  </div>
                  <Badge variant="outline" className="tabular-nums shrink-0">
                    {fullCandidates.length} Kandidat
                  </Badge>
                </div>
                {renderCandidateGrid(
                  fullCandidates,
                  !standardWinnerUsed &&
                    !strategicCandidates.some((c) => c && !existingSet.has(c)),
                  'Masukkan nama untuk melihat kandidat lengkap'
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
