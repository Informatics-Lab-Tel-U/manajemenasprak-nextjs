'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { ChevronDownIcon, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PRESENSI_THEMES } from '@/constants/presensiConstants';
import { usePresensi } from '@/hooks/usePresensi';
import { PraktikumSelector } from '@/components/presensi/PraktikumSelector';
import { KelasManager } from '@/components/presensi/KelasManager';
import { OptionsToggles } from '@/components/presensi/OptionsToggles';
import { ThemeKey } from '@/types/presensi';

export default function PresensiGeneratorClient() {
  const state = usePresensi();
  const data = state;

  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleGenerate = async () => {
    if (!state.selectedPraktikumId || state.kelasNames.length === 0) {
      toast.error('Silakan pilih Praktikum terlebih dahulu');
      return;
    }
    if (!state.isWeightValid) {
      toast.error('Total bobot nilai harus 100%');
      return;
    }

    setIsGenerating(true);
    try {
      const { generatePresensiExcel } = await import('@/lib/spreadsheet');
      await generatePresensiExcel({
        namaFile: state.namaFile,
        kelasNames: state.kelasNames,
        jumlahModul: state.jumlahModul,
        kelasSettings: state.kelasSettings,
        opsi: state.opsi,
        asprakList: data.asprakList,
        generateRekapSheet: state.generateRekapSheet,
        theme: state.theme,
        tanggalMulaiSenin: state.globalTanggalMulai,
      });
      toast.success('File excel berhasil di-generate dan diunduh!');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Gagal men-generate file presensi.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Step 1: File & Praktikum Config */}
      <Card className="bg-card shadow-sm border-border/60">
        <CardHeader>
          <CardTitle className="text-lg font-bold">1. Konfigurasi File & Praktikum</CardTitle>

        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <PraktikumSelector
            praktikumList={data.praktikumList}
            selectedPraktikumId={state.selectedPraktikumId}
            setSelectedPraktikumId={state.setSelectedPraktikumId}
            loadingPraktikum={data.loadingPraktikum}
            availableJurusans={data.availableJurusans}
            selectedJurusan={state.selectedJurusan}
            setSelectedJurusan={state.setSelectedJurusan}
          />

          <KelasManager
            loadingKelas={data.loadingKelas}
            kelasNames={state.kelasNames}
            handleRemoveKelas={state.handleRemoveKelas}
            customKelasInput={state.customKelasInput}
            setCustomKelasInput={state.setCustomKelasInput}
            handleAddCustomKelas={state.handleAddCustomKelas}
          />

          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="namaFile">Nama File (tanpa .xlsx)</Label>
            <Input
              id="namaFile"
              value={state.namaFile}
              onChange={(e) => state.setNamaFile(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="jumlahModul">Jumlah Modul</Label>
            <Input
              id="jumlahModul"
              type="number"
              min={1}
              value={state.jumlahModul || ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) => state.setJumlahModul(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Tema Warna Excel</Label>
            <Select value={state.theme} onValueChange={(val) => state.setTheme(val as ThemeKey)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih Tema" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRESENSI_THEMES).map(([key, themeObj]) => (
                  <SelectItem key={key} value={key}>
                    {themeObj.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Default Tanggal Modul 1 (Senin)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  data-empty={!state.globalTanggalMulai}
                  className="w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                >
                  {state.globalTanggalMulai ? (
                    format(state.globalTanggalMulai, 'EEEE, d MMMM yyyy', { locale: id })
                  ) : (
                    <span>Pilih tanggal</span>
                  )}
                  <ChevronDownIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={state.globalTanggalMulai}
                  onSelect={(date) => state.setGlobalTanggalMulai(date)}
                  defaultMonth={state.globalTanggalMulai}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="globalJumlahPraktikan">Default Jumlah Praktikan</Label>
            <Input
              id="globalJumlahPraktikan"
              type="number"
              min={1}
              value={state.globalJumlahPraktikan || ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) => state.setGlobalJumlahPraktikan(Number(e.target.value))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="globalJumlahAsprak">Default Jumlah Asprak</Label>
            <Input
              id="globalJumlahAsprak"
              type="number"
              min={1}
              value={state.globalJumlahAsprak || ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) => state.setGlobalJumlahAsprak(Number(e.target.value))}
            />
          </div>
          
          <div className="sm:col-span-2 flex justify-end pt-2">
            <Button onClick={state.applyGlobalToAll} disabled={state.kelasNames.length === 0}>
              Terapkan Default ke Semua Kelas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Per-Class Customization */}
      {state.kelasNames.length > 0 && (
        <Card className="bg-card shadow-sm border-border/60">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-bold">2. Pengaturan Spesifik per Kelas</CardTitle>

              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {state.kelasNames.length} Kelas
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {state.kelasNames.map((kelasName, i) => {
              const jadwalList = state.kelasJadwalMap?.[kelasName] || [];
              return (
                <div key={kelasName} className="p-4 rounded-xl border border-border/50 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="default" className="font-mono text-xs px-2.5 py-0.5">
                        {kelasName}
                      </Badge>
                      {jadwalList.length === 1 && (
                        <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">
                          {jadwalList[0].hari} ({jadwalList[0].jam}{jadwalList[0].ruangan ? ` • ${jadwalList[0].ruangan}` : ''})
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {jadwalList.length > 1 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-muted-foreground">Jadwal:</span>
                          <Select
                            onValueChange={(hari) => state.selectKelasJadwal(i, hari)}
                          >
                            <SelectTrigger className="h-7 text-xs w-[180px]">
                              <SelectValue placeholder="Pilih Jadwal" />
                            </SelectTrigger>
                            <SelectContent>
                              {jadwalList.map((j, jIdx) => (
                                <SelectItem key={jIdx} value={j.hari}>
                                  {j.hari} ({j.jam})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground font-medium">Kelas #{i + 1}</span>
                    </div>
                  </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Tanggal Modul 1</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          data-empty={!state.kelasSettings[i]?.tanggalMulai}
                          className="w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                        >
                          {state.kelasSettings[i]?.tanggalMulai ? (
                            format(state.kelasSettings[i].tanggalMulai, 'EEEE, d MMMM yyyy', { locale: id })
                          ) : (
                            <span>Pilih tanggal</span>
                          )}
                          <ChevronDownIcon />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={state.kelasSettings[i]?.tanggalMulai}
                          onSelect={(date) => state.updateKelasSetting(i, 'tanggalMulai', date)}
                          defaultMonth={state.kelasSettings[i]?.tanggalMulai}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Jumlah Praktikan</Label>
                    <Input
                      type="number"
                      min={1}
                      value={state.kelasSettings[i]?.jumlahPraktikan || ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => state.updateKelasSetting(i, 'jumlahPraktikan', Number(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Jumlah Asprak</Label>
                    <Input
                      type="number"
                      min={1}
                      value={state.kelasSettings[i]?.jumlahAsprak || ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => state.updateKelasSetting(i, 'jumlahAsprak', Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Assessment Options & Generate */}
      <Card className="bg-card shadow-sm border-border/60">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg font-bold">3. Kolom Penilaian & Rekapitulasi</CardTitle>

            </div>
            <Badge variant={state.isWeightValid ? 'default' : 'outline'} className={`font-mono text-xs ${!state.isWeightValid ? 'border-destructive/40 text-destructive bg-destructive/10' : ''}`}>
              Total Bobot: {state.totalWeight}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <OptionsToggles 
            opsi={state.opsi} 
            setOpsi={state.setOpsi} 
            generateRekapSheet={state.generateRekapSheet}
            onToggleRekapSheet={state.setGenerateRekapSheet}
            asprakCount={data.asprakList.length}
            loadingAsprak={data.loadingAsprak}
            hasPraktikum={!!state.selectedPraktikumId}
          />

          {!state.isWeightValid && state.totalWeight > 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-semibold">Bobot Penilaian Tidak Valid</AlertTitle>
              <AlertDescription className="text-xs mt-1">
                Total bobot nilai saat ini adalah <strong>{state.totalWeight}%</strong>. Seluruh komponen penilaian bertipe angka harus berjumlah tepat <strong>100%</strong> sebelum file dapat di-generate.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="bg-muted/20 flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border/50 gap-3">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            {state.kelasNames.length === 0 
              ? 'Tentukan minimal 1 kelas untuk mengaktifkan proses generate.'
              : `Siap men-generate template untuk ${state.kelasNames.length} kelas dan ${state.jumlahModul} modul.`}
          </p>
          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={isGenerating || state.kelasNames.length === 0 || (!state.isWeightValid && state.totalWeight > 0)}
            className="w-full sm:w-auto"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Men-generate File...
              </>
            ) : (
              'Generate File Excel'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
