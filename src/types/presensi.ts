export interface AsprakEntry {
  nama: string;
  kode: string;
}

export interface PresensiReducibility {
  enabled: boolean;
  targetComponent: 'jurnal' | 'tesAkhir' | 'tp';
  reductionPercent: number;
}

export interface PresensiComponent {
  enabled: boolean;
  weight: number;
  inputType: 'number' | 'boolean';
  reducibility?: PresensiReducibility;
}

export interface PresensiFormOptions {
  tp: PresensiComponent;
  jurnal: PresensiComponent;
  tesAkhir: PresensiComponent;
  rate: boolean;
}

export interface KelasSetting {
  tanggalMulai: Date | undefined;
  jumlahPraktikan: number;
  jumlahAsprak: number;
}

import { ThemeKey } from '@/constants/presensiConstants';

export type { ThemeKey };

export interface PresensiGeneratorOptions {
  namaFile: string;
  kelasNames: string[];
  jumlahModul: number;
  kelasSettings: KelasSetting[];
  opsi: PresensiFormOptions;
  asprakList?: AsprakEntry[];
  generateRekapSheet?: boolean;
  theme?: ThemeKey;
  /** Tanggal Senin minggu pertama praktikum — dipakai khusus di sheet REKAP kolom J (Tanggal Senin).
   *  Berbeda dari kelasSettings[i].tanggalMulai yang sudah di-offset sesuai hari jadwal kelas. */
  tanggalMulaiSenin?: Date;
}
