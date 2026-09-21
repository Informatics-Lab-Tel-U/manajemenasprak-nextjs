'use client';

import React, { useState, useEffect } from 'react';
import { Jadwal, MataKuliah } from '@/types/database';
import type { CreateJadwalInput, UpdateJadwalInput } from '@/services/jadwalService';
import { DAYS, ROOMS, STATIC_SESSIONS } from '@/constants';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useTermStore } from '@/store/useTermStore';

interface JadwalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateJadwalInput | UpdateJadwalInput) => Promise<any>;
  initialData?: Jadwal | null;
  prefillData?: { hari?: string; sesi?: number; ruangan?: string };
  mataKuliahList: MataKuliah[];
  isLoading?: boolean;
}

export function JadwalModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  prefillData,
  mataKuliahList,
  isLoading = false,
}: JadwalModalProps) {
  const isEdit = !!initialData;
  const [isDetailsEditable, setIsDetailsEditable] = useState(!isEdit);

  const [formData, setFormData] = useState<
    Partial<CreateJadwalInput> & { total_asprak?: number | '' }
  >({
    id_mk: '',
    kelas: '',
    hari: 'SENIN',
    sesi: 1,
    jam: '06:30',
    ruangan: '',
    total_asprak: 1,
    dosen: '',
  });

  const { activeTerm } = useTermStore();

  const [uiState, updateUiState] = React.useReducer(
    (prev: any, next: any) => ({ ...prev, ...next }),
    { selectedPraktikum: '', isPJJ: false, isCustomJam: false }
  );
  const { selectedPraktikum, isPJJ, isCustomJam } = uiState;
  const selectedTerm = activeTerm || '';


  const availablePraktikum = Array.from(
    new Set(
      mataKuliahList.flatMap((mk: any) => {
        const termMatch = !mk.praktikum?.tahun_ajaran || mk.praktikum?.tahun_ajaran === selectedTerm;
        const name = mk.praktikum?.nama || mk.mk_singkat || mk.nama_singkat;
        return termMatch && name ? [name] : [];
      })
    )
  ).filter(Boolean) as string[];

  const filteredMataKuliah = mataKuliahList.filter((mk: any) => {
    const termMatch = !mk.praktikum?.tahun_ajaran || mk.praktikum?.tahun_ajaran === selectedTerm;
    const prakName = mk.praktikum?.nama || mk.mk_singkat || mk.nama_singkat;
    return termMatch && prakName === selectedPraktikum;
  });

  useEffect(() => {
    if (isOpen) {
      setIsDetailsEditable(!initialData);
      if (initialData) {
        setFormData({
          id_mk: initialData.id_mk.toString(),
          kelas: initialData.kelas,
          hari: initialData.hari,
          sesi: initialData.sesi,
          jam: initialData.jam,
          ruangan: initialData.ruangan || '',
          total_asprak: initialData.total_asprak,
          dosen: initialData.dosen || '',
        });

        const currentMK = mataKuliahList.find((mk) => mk.id === initialData.id_mk) as any;
        const prakName =
          currentMK?.praktikum?.nama || currentMK?.mk_singkat || currentMK?.nama_singkat || '';
        updateUiState({
          selectedPraktikum: prakName,
          isPJJ: (initialData.kelas || '').toUpperCase().includes('PJJ'),
          isCustomJam: !initialData.sesi || initialData.sesi === 0,
        });
      } else {
        const defaultDay = prefillData?.hari || 'SENIN';
        const defaultSesi = prefillData?.sesi;
        const daySessions = STATIC_SESSIONS[defaultDay] || STATIC_SESSIONS['SENIN'];
        const defaultSession = defaultSesi
          ? (daySessions.find((s) => s.sesi === defaultSesi) ?? daySessions[0])
          : daySessions[0];
        setFormData({
          id_mk: '',
          kelas: '',
          hari: defaultDay,
          sesi: defaultSession.sesi,
          jam: defaultSession.jam,
          ruangan: prefillData?.ruangan || '',
          total_asprak: 1,
          dosen: '',
        });
        updateUiState({
          selectedPraktikum: '',
          isPJJ: false,
          isCustomJam: false
        });
      }
    }
  }, [isOpen, initialData, mataKuliahList]);



  const handleChange = (field: keyof CreateJadwalInput, value: any) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      
      if (field === 'kelas') {
        updateUiState({ isPJJ: value.toUpperCase().includes('PJJ') });
      }

      if ((field === 'hari' || field === 'sesi') && !isCustomJam) {
        const currentDay = field === 'hari' ? value : newData.hari;
        let currentSessionId =
          field === 'hari'
            ? STATIC_SESSIONS[currentDay][0].sesi
            : field === 'sesi'
              ? value
              : newData.sesi;

        const daySessions = STATIC_SESSIONS[currentDay];
        let sessionObj = daySessions.find((s) => s.sesi === currentSessionId);

        if (!sessionObj) {
          sessionObj = daySessions[0];
          currentSessionId = sessionObj.sesi;
          newData.sesi = currentSessionId;
        }

        newData.jam = sessionObj.jam;
      }

      return newData;
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.id_mk ||
      !formData.kelas ||
      !formData.hari ||
      formData.sesi === undefined ||
      formData.sesi === null ||
      !formData.jam
    ) {
      toast.error('Mohon isi semua field yang wajib');
      return;
    }

    const baseInput = {
      ...formData,
      sesi: formData.sesi ? Number(formData.sesi) : 0,
      total_asprak: Number(formData.total_asprak),
    };

    if (baseInput.ruangan === 'tanpa_ruangan') {
      baseInput.ruangan = '';
    }

    const input: any = { ...baseInput };

    if (isEdit) {
      input.id = initialData?.id;
    }

    await onSubmit(input);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Jadwal' : 'Tambah Jadwal'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4 py-4">
          {isEdit && (
            <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded-lg border border-border/50">
              <Switch
                id="edit-mode"
                checked={isDetailsEditable}
                onCheckedChange={setIsDetailsEditable}
              />
              <Label htmlFor="edit-mode" className="cursor-pointer">
                Edit Detail Jadwal (Mata Kuliah, Kelas, dll)
              </Label>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium border border-border/50 bg-muted/20 px-3 py-2 rounded-md">
                Tahun Ajaran: <span className="font-bold">{selectedTerm}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="praktikum">Praktikum</Label>
              <Select
                value={selectedPraktikum}
                onValueChange={(val) => {
                  updateUiState({ selectedPraktikum: val });
                  setFormData((prev) => ({ ...prev, id_mk: '' }));
                }}
                disabled={!selectedTerm || !isDetailsEditable}
              >
                <SelectTrigger className="w-full disabled:opacity-70 disabled:cursor-not-allowed">
                  <SelectValue placeholder="Pilih Praktikum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {availablePraktikum.map((prak) => (
                      <SelectItem key={prak} value={prak}>
                        {prak}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="id_mk">Mata Kuliah</Label>
              <Select
                value={formData.id_mk?.toString()}
                onValueChange={(val) => handleChange('id_mk', val)}
                disabled={!selectedPraktikum || !isDetailsEditable}
              >
                <SelectTrigger className="w-full disabled:opacity-70 disabled:cursor-not-allowed">
                  <SelectValue placeholder="Pilih Mata Kuliah" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {filteredMataKuliah.map((mk) => (
                      <SelectItem key={mk.id} value={mk.id.toString()}>
                        {mk.nama_lengkap} ({mk.program_studi})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full items-start">
              <div className="space-y-2 w-full">
                <Label htmlFor="kelas">Kelas</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="kelas"
                    value={formData.kelas}
                    onChange={(e) => handleChange('kelas', e.target.value)}
                    placeholder="e.g. IF-45-01"
                    required
                    disabled={isPJJ || !isDetailsEditable}
                    className="disabled:opacity-70 disabled:cursor-not-allowed"
                  />
                  <div className="flex items-center space-x-2 shrink-0">
                    <Checkbox
                      id="is_pjj"
                      checked={isPJJ}
                      onCheckedChange={(checked) => {
                        const isChecked = !!checked;
                        updateUiState({ isPJJ: isChecked });
                        if (isChecked) {
                          if (!formData.kelas?.endsWith('PJJ')) {
                            setFormData((prev) => ({ ...prev, kelas: (prev.kelas || '') + 'PJJ' }));
                          }
                        } else {
                          if (formData.kelas?.endsWith('PJJ')) {
                            setFormData((prev) => ({
                              ...prev,
                              kelas: prev.kelas?.replace(/PJJ$/, ''),
                            }));
                          }
                        }
                      }}
                      disabled={!isDetailsEditable}
                    />
                    <Label htmlFor="is_pjj">PJJ</Label>
                  </div>
                </div>
              </div>
              <div className="space-y-2 w-full">
                <Label htmlFor="ruangan">Ruangan</Label>
                <Select
                  value={formData.ruangan || (isPJJ ? 'tanpa_ruangan' : '')}
                  onValueChange={(val) => handleChange('ruangan', val)}
                  disabled={!isDetailsEditable}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih Ruangan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {isPJJ && (
                        <SelectItem value="tanpa_ruangan">Tanpa Ruangan (Online)</SelectItem>
                      )}
                      {ROOMS.map((room) => (
                        <SelectItem key={room} value={room}>
                          {room}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hari">Hari</Label>
                <Select value={formData.hari} onValueChange={(val) => handleChange('hari', val)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih Hari" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {DAYS.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <Label htmlFor="sesi" className="leading-none">
                    Sesi & Jam
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Label
                      htmlFor="custom-jam"
                      className="text-[10px] text-muted-foreground font-medium cursor-pointer"
                    >
                      Custom Jam
                    </Label>
                    <Switch
                      id="custom-jam"
                      checked={isCustomJam}
                      onCheckedChange={(checked) => {
                        updateUiState({ isCustomJam: checked });
                        if (checked) {
                          setFormData((prev) => ({ ...prev, sesi: 0 }));
                        } else {
                          const sObj = STATIC_SESSIONS[formData.hari || 'SENIN'][0];
                          setFormData((prev) => ({ ...prev, sesi: sObj.sesi, jam: sObj.jam }));
                        }
                      }}
                      className="scale-75 origin-right"
                    />
                  </div>
                </div>

                {!isCustomJam ? (
                  <Select
                    value={formData.sesi?.toString() || '1'}
                    onValueChange={(val) => handleChange('sesi', parseInt(val))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih Sesi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(STATIC_SESSIONS[formData.hari || 'SENIN'] || []).map((s) => (
                          <SelectItem key={s.sesi} value={s.sesi.toString()}>
                            Sesi {s.sesi} ({s.jam})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={formData.jam?.split(':')[0] || '06'}
                    onValueChange={(val) =>
                      setFormData((prev) => ({ ...prev, jam: `${val}:30`, sesi: 0 }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih Jam" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {Array.from({ length: 16 }, (_, i) => i + 6).map((h) => {
                          const hourStr = h.toString().padStart(2, '0');
                          return (
                            <SelectItem key={hourStr} value={hourStr}>
                              {hourStr}:30
                            </SelectItem>
                          );
                        })}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dosen">Kode Dosen</Label>
              <Input
                id="dosen"
                value={formData.dosen}
                onChange={(e) => handleChange('dosen', e.target.value)}
                placeholder="Kode Dosen"
                disabled={!isDetailsEditable}
                className="disabled:opacity-70 disabled:cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_asprak">Kebutuhan Asprak</Label>
              <Input
                id="total_asprak"
                type="number"
                min={1}
                value={formData.total_asprak ?? ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    handleChange('total_asprak', '');
                  } else {
                    const parsed = parseInt(raw, 10);
                    handleChange('total_asprak', Number.isNaN(parsed) ? '' : parsed);
                  }
                }}
                required
                disabled={!isDetailsEditable}
                className="disabled:opacity-70 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center sm:justify-between w-full">
            <div className="flex w-full items-center justify-between sm:justify-end">
              <div className="flex w-full sm:w-auto justify-end space-x-2">
                <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
                  Batal
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Spinner className="mr-2 h-4 w-4" />}
                  {isEdit ? 'Simpan Perubahan' : 'Tambah Jadwal'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
