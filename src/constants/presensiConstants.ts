export const PRESENSI_THEMES = {
  BLUE: {
    label: 'Biru (Default)',
    colors: {
      HEADER_BG: 'FF16365C',
      HEADER_FG: 'FFFFFFFF',
      BAND_1_BG: 'FFDAEEF3',
      BAND_2_BG: 'FFC5D9F1',
      TAB_LIST_ASPRAK: 'FF00B0F0',
    }
  },
  GREEN: {
    label: 'Hijau',
    colors: {
      HEADER_BG: 'FF274E13',
      HEADER_FG: 'FFFFFFFF',
      BAND_1_BG: 'FFE2EFDA',
      BAND_2_BG: 'FFC6E0B4',
      TAB_LIST_ASPRAK: 'FF548235',
    }
  },
  RED: {
    label: 'Merah',
    colors: {
      HEADER_BG: 'FF5B0F00',
      HEADER_FG: 'FFFFFFFF',
      BAND_1_BG: 'FFFCE4D6',
      BAND_2_BG: 'FFF8CBAD',
      TAB_LIST_ASPRAK: 'FFC00000',
    }
  },
  PURPLE: {
    label: 'Ungu',
    colors: {
      HEADER_BG: 'FF3F3151',
      HEADER_FG: 'FFFFFFFF',
      BAND_1_BG: 'FFE4DFEC',
      BAND_2_BG: 'FFCCC1D9',
      TAB_LIST_ASPRAK: 'FF7030A0',
    }
  },
  ORANGE: {
    label: 'Oranye (Warm)',
    colors: {
      HEADER_BG: 'FF9C3800',
      HEADER_FG: 'FFFFFFFF',
      BAND_1_BG: 'FFFCE4D6',
      BAND_2_BG: 'FFF8CBAD',
      TAB_LIST_ASPRAK: 'FFED7D31',
    }
  },
  TEAL: {
    label: 'Teal (Ocean)',
    colors: {
      HEADER_BG: 'FF004C4C',
      HEADER_FG: 'FFFFFFFF',
      BAND_1_BG: 'FFE0F2F1',
      BAND_2_BG: 'FFB2DFDB',
      TAB_LIST_ASPRAK: 'FF009688',
    }
  },
  MONOCHROME: {
    label: 'Monochrome (Grayscale)',
    colors: {
      HEADER_BG: 'FF404040',
      HEADER_FG: 'FFFFFFFF',
      BAND_1_BG: 'FFF2F2F2',
      BAND_2_BG: 'FFD9D9D9',
      TAB_LIST_ASPRAK: 'FF595959',
    }
  },
  SUNSET: {
    label: 'Sunset (Pink/Orange)',
    colors: {
      HEADER_BG: 'FF990033',
      HEADER_FG: 'FFFFFFFF',
      BAND_1_BG: 'FFFDF2E9',
      BAND_2_BG: 'FFFADBD8',
      TAB_LIST_ASPRAK: 'FFFF5733',
    }
  },
  NATURE: {
    label: 'Nature (Brown/Green)',
    colors: {
      HEADER_BG: 'FF3E2723',
      HEADER_FG: 'FFFFFFFF',
      BAND_1_BG: 'FFF1F8E9',
      BAND_2_BG: 'FFDCE775',
      TAB_LIST_ASPRAK: 'FF8D6E63',
    }
  }
} as const;

export type ThemeKey = keyof typeof PRESENSI_THEMES;
export type ThemeColors = {
  HEADER_BG: string;
  HEADER_FG: string;
  BAND_1_BG: string;
  BAND_2_BG: string;
  TAB_LIST_ASPRAK: string;
};

export const PRESENSI_STYLES = {
  COLORS: PRESENSI_THEMES.BLUE.colors, // Default / Fallback
  BORDERS: {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  },
};

export const PRESENSI_COLUMN_WIDTHS = {
  BASE: {
    NO: 4.28,
    NIM: 15,
    NAMA: 44.57,
    KODE_ASPRAK: 13.42,
  },
  MODULE: {
    KEHADIRAN_ASPRAK: 19.14,
    KEHADIRAN: 12.14,
    EVIDENCE: 12.14,
    TP: 12.14,
    JURNAL: 12.14,
    TES_AKHIR: 12.14,
    RATE: 12.14,
    TOTAL_NILAI: 12.14,
    DEFAULT: 12,
  },
  RATA_RATA: 11.85,
};

export const PRESENSI_STRINGS = {
  ATTENDANCE_OPTIONS: ['"HADIR, TIDAK HADIR"'],
  YA_TIDAK_OPTIONS: ['"YA, TIDAK"'],
};
