import { getJagaShiftList } from '@/constants/jagaConfig';

export const getJagaShiftsByDay = (hari: string) => {
  return getJagaShiftList(hari).map((s) => ({
    shift: s.shift,
    jam: s.jam,
  }));
};

export const getShiftTimeString = (hari: string, shift: number) => {
  const shifts = getJagaShiftsByDay(hari);
  const found = shifts.find((s) => s.shift === shift);
  return found ? found.jam : 'Unknown';
};

// Only ADMIN / SUPER ADMIN is allowed to input or edit Jadwal Jaga
export const canInputJagaForModul = (
  _targetModul: number,
  _konfigurasiModul: { modul: number; tanggal_mulai: string | null }[],
  role?: string
) => {
  return role === 'SUPER ADMIN' || role === 'ADMIN';
};

/**
 * Menentukan modul aktif berdasarkan tanggal mulai modul dan tanggal hari ini (WIB / UTC+7).
 * Mengembalikan modul terbaru yang sudah berjalan (tanggal_mulai <= hari ini), atau modul 1 sebagai default.
 */
export const determineActiveModul = (
  scheduleEntries?: { modul: number | string; tanggal_mulai: string | null }[] | null,
  referenceDate: Date = new Date()
): number => {
  if (!scheduleEntries || scheduleEntries.length === 0) return 1;

  const nowWib = new Date(referenceDate.getTime() + 7 * 60 * 60 * 1000);
  const todayStr = nowWib.toISOString().split('T')[0];

  const matched = scheduleEntries
    .filter((m) => m.tanggal_mulai && m.tanggal_mulai <= todayStr)
    .map((m) => ({
      modul: typeof m.modul === 'number' ? m.modul : parseInt(String(m.modul), 10),
      tanggal_mulai: m.tanggal_mulai,
    }))
    .filter((m) => !isNaN(m.modul))
    .sort((a, b) => b.modul - a.modul);

  return matched[0]?.modul || 1;
};

