export interface ParsedTimetableRow {
  kelas: string;
  nama_singkat: string;
  hari: string;
  sesi: number;
  jam: string;
  ruangan: string;
  total_asprak: number;
  dosen: string;
  aspraks?: string[];
}

/**
 * Converts Excel fraction of day or decimal string to "HH:mm".
 * Handles:
 * - 0.2708333333333333 -> "06:30"
 * - 0.3125 -> "07:30"
 * - "0,270833333" / "0.270833333" -> "06:30"
 * - String that already has ":" -> returns as-is
 */
export function excelFractionToTime(val: any): string {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      if (parts.length >= 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
      }
      return trimmed;
    }
    const normalized = trimmed.replace(',', '.');
    const num = parseFloat(normalized);
    if (!isNaN(num)) {
      return convertFractionNumber(num);
    }
    return trimmed;
  }
  if (typeof val === 'number') {
    return convertFractionNumber(val);
  }
  return String(val);
}

function convertFractionNumber(num: number): string {
  if (num < 1.0) {
    const totalMinutes = Math.round(num * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  return String(num);
}

/**
 * Parses header cell string in format: <PRAKTIKUM>_<KELAS>_<DOSEN>
 * Examples:
 * - "STD_IF-49-06_SHZ" -> { praktikum: "STD", kelas: "IF-49-06", dosen: "SHZ" }
 * - "ALPRO SE_SE-49-GABREM_MIU+FZD" -> { praktikum: "ALPRO SE", kelas: "SE-49-GABREM", dosen: "MIU+FZD" }
 * - "STD_IT-49-05_Nando_LB" -> { praktikum: "STD", kelas: "IT-49-05", dosen: "Nando_LB" }
 */
export function parseTimetableHeaderCell(rawText: string): {
  praktikum: string;
  kelas: string;
  dosen: string;
} | null {
  if (!rawText || typeof rawText !== 'string') return null;
  const text = rawText.trim();
  const firstUnderscore = text.indexOf('_');
  if (firstUnderscore === -1) return null;

  const praktikum = text.substring(0, firstUnderscore).trim();
  const rest = text.substring(firstUnderscore + 1).trim();
  const secondUnderscore = rest.indexOf('_');

  if (secondUnderscore === -1) {
    return {
      praktikum,
      kelas: rest,
      dosen: '',
    };
  }

  const kelas = rest.substring(0, secondUnderscore).trim();
  const dosen = rest.substring(secondUnderscore + 1).trim();

  return { praktikum, kelas, dosen };
}

/**
 * Checks if the parsed 2D spreadsheet matrix is a timetable grid.
 */
export function isTimetableGrid(matrix: any[][]): boolean {
  if (!matrix || matrix.length < 2) return false;
  const row0 = matrix[0].map((c) => String(c || '').trim().toUpperCase());

  const hasHariCol = row0.some((h) => h.includes('HARI'));
  const hasJamCol = row0.some((h) => h.includes('JAM'));
  const hasRoomCols = row0.some((h) =>
    h.includes('TULT') || h.includes('GKU') || h.includes('LAB') || h.includes('RUANG')
  );

  return (hasHariCol || hasJamCol) && hasRoomCols;
}

/**
 * Parses timetable grid 2D matrix into flat jadwal rows.
 */
export function parseTimetableGrid(matrix: any[][]): ParsedTimetableRow[] {
  if (!matrix || matrix.length < 2) return [];

  const headers = matrix[0].map((c) => String(c || '').trim());
  const roomColumns: { colIndex: number; roomName: string }[] = [];

  for (let c = 0; c < headers.length; c++) {
    const header = headers[c];
    const upper = header.toUpperCase();
    if (
      upper.includes('TULT') ||
      upper.includes('GKU') ||
      upper.includes('LAB') ||
      upper.includes('RUANG') ||
      (!['HARI', 'JAM', 'HARI (HELPER)', 'SESI (HELPER)', 'SESI'].includes(upper) && c >= 4 && header !== '')
    ) {
      roomColumns.push({ colIndex: c, roomName: header });
    }
  }

  if (roomColumns.length === 0) return [];

  const results: ParsedTimetableRow[] = [];
  let currentHari = '';

  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row) continue;

    const dayVal = row[0] ? String(row[0]).trim() : '';
    const helperDayVal = row[2] ? String(row[2]).trim() : '';
    if (dayVal) {
      currentHari = dayVal.toUpperCase();
    } else if (helperDayVal && !currentHari) {
      currentHari = helperDayVal.toUpperCase();
    }

    const jamVal = row[1];
    if (jamVal !== null && jamVal !== undefined && String(jamVal).trim() !== '') {
      const jamStr = excelFractionToTime(jamVal);
      const sesiVal = row[3] ? Number(row[3]) : 0;
      const effectiveHari = (helperDayVal || currentHari || dayVal).toUpperCase();

      for (const room of roomColumns) {
        const cellVal = row[room.colIndex];
        if (!cellVal || typeof cellVal !== 'string' || !cellVal.trim()) continue;

        const parsedHeader = parseTimetableHeaderCell(cellVal);
        if (!parsedHeader) continue;

        const aspraks: string[] = [];
        for (let subR = r + 1; subR < Math.min(r + 9, matrix.length); subR++) {
          const subRow = matrix[subR];
          if (!subRow) continue;
          if (subRow[1] !== null && subRow[1] !== undefined && String(subRow[1]).trim() !== '') {
            break;
          }
          const person = subRow[room.colIndex];
          if (person && typeof person === 'string' && person.trim()) {
            aspraks.push(person.trim());
          }
        }

        results.push({
          kelas: parsedHeader.kelas,
          nama_singkat: parsedHeader.praktikum,
          hari: effectiveHari,
          sesi: sesiVal > 0 ? sesiVal : 1,
          jam: jamStr,
          ruangan: room.roomName,
          total_asprak: aspraks.length > 0 ? aspraks.length : 1,
          dosen: parsedHeader.dosen,
          aspraks,
        });
      }
    }
  }

  return results;
}
