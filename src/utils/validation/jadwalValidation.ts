import { JadwalPreviewRow } from '@/components/jadwal/JadwalCSVPreview';
import * as jadwalFetcher from '@/lib/fetchers/jadwalFetcher';
import { excelFractionToTime } from '@/utils/parsers/timetableGridParser';

const VALID_DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

export async function validateJadwalConflicts(
  rows: JadwalPreviewRow[],
  term: string
): Promise<JadwalPreviewRow[]> {
  if (!term) return rows;

  const dbResult = await jadwalFetcher.fetchScheduleForValidation(term);
  const dbSchedule = dbResult.ok ? dbResult.data || [] : [];

  const getKey = (hari: string, sesi: number | string, ruangan: string, jam: string) =>
    `${hari}-${sesi}-${jam}-${ruangan}`;
  const getFullKey = (id_mk: string, kelas: string, hari: string, sesi: number, ruangan: string) =>
    `${id_mk}-${kelas}-${hari}-${sesi}-${ruangan}`;

  const dbMap = new Map<string, any>();
  const dbFullMap = new Set<string>();

  dbSchedule.forEach((s: any) => {
    const ruanganKey = s.ruangan || 'Tanpa Ruangan';
    dbMap.set(getKey(s.hari, s.sesi, ruanganKey, s.jam || ''), s);
    dbFullMap.add(getFullKey(s.id_mk.toString(), s.kelas, s.hari, s.sesi, ruanganKey));
  });

  const internalMap = new Map<string, number[]>();

  rows.forEach((row, idx) => {
    if (row.status === 'error') return;

    const isPJJ = row.kelas.toUpperCase().includes('PJJ');
    if (!row.ruangan && !isPJJ) return; // Drop empty rooms IF NOT PJJ (this is handled later as error anyway)

    const key = getKey(row.hari, row.sesi, row.ruangan || 'Tanpa Ruangan', row.jam);
    if (!internalMap.has(key)) {
      internalMap.set(key, []);
    }
    internalMap.get(key)?.push(idx);
  });

  return rows.map((row) => {
    const newRow = { ...row };

    if (newRow.status === 'error') return newRow;

    const isCurrentPJJ = newRow.kelas.toUpperCase().includes('PJJ');
    const fullKey = getFullKey(
      newRow.id_mk,
      newRow.kelas,
      newRow.hari,
      newRow.sesi,
      newRow.ruangan || 'Tanpa Ruangan'
    );
    if (dbFullMap.has(fullKey)) {
      newRow.status = 'error';
      newRow.statusMessage = 'Duplikat: Jadwal ini sudah ada di database.';
      newRow.selected = false;
      return newRow;
    }

    if (newRow.ruangan || isCurrentPJJ) {
      const ruanganKey = newRow.ruangan || 'Tanpa Ruangan';
      const key = getKey(newRow.hari, newRow.sesi, ruanganKey, newRow.jam);
      const conflictingIndices = internalMap.get(key) || [];

      const activeConflicts = conflictingIndices.filter(
        (idx) => !rows[idx].kelas.toUpperCase().includes('PJJ')
      );

      if (!isCurrentPJJ && activeConflicts.length > 1) {
        newRow.status = 'error';
        newRow.statusMessage = `Tabrakan Internal CSV (Baris ${activeConflicts.map((i) => rows[i].originalRow).join(', ')})`;
        newRow.selected = false;
        return newRow;
      }

      if (dbMap.has(key)) {
        const existing = dbMap.get(key);
        const isExistingPJJ = existing.kelas.toUpperCase().includes('PJJ');

        if (!isCurrentPJJ && !isExistingPJJ) {
          newRow.status = 'error';
          newRow.statusMessage = `Tabrakan Database: Ruangan ${ruanganKey} dipakai ${existing.mata_kuliah?.nama_lengkap || 'MK lain'} (${existing.kelas})`;
          newRow.selected = false;
          return newRow;
        }
      }
    } else {
      if (!newRow.kelas.toUpperCase().includes('PJJ')) {
        newRow.status = 'error';
        newRow.statusMessage = 'Ruangan tidak boleh kosong (Kecuali PJJ)';
        newRow.selected = false;
        return newRow;
      }
    }

    return newRow;
  });
}

export function buildJadwalPreviewRows(
  data: any[],
  mataKuliahList: any[],
  term?: string
): JadwalPreviewRow[] {
  const preview: JadwalPreviewRow[] = [];

  const candidates = term
    ? mataKuliahList.filter((mk) => mk.praktikum?.tahun_ajaran === term)
    : mataKuliahList;

  data.forEach((row: any) => {
    const mkName = (row.nama_singkat || row['Nama Singkat'] || row.mata_kuliah || '').trim();
    const kelas = (row.kelas || row.Kelas || '').trim();
    const isPJJ = kelas.toUpperCase().includes('PJJ');
    const prodi = kelas.split('-')[0].toUpperCase();

    const findMk = (searchProdi: string) => {
      return candidates.find(
        (mk: any) =>
          (mk.praktikum?.nama?.toLowerCase() === mkName.toLowerCase() ||
            mk.nama_lengkap.toLowerCase() === mkName.toLowerCase()) &&
          mk.program_studi?.toUpperCase() === searchProdi.toUpperCase()
      );
    };

    let targetMK = isPJJ ? findMk(`${prodi}-PJJ`) : null;
    if (!targetMK) targetMK = findMk(prodi);
    if (!targetMK && isPJJ) targetMK = findMk('IF-PJJ');
    if (!targetMK) targetMK = findMk('IF') || findMk('SE') || findMk('IT') || findMk('DS');

    const mkId = targetMK?.id.toString() || '';

    const hari = (row.hari || row.Hari || '').trim().toUpperCase();
    const isValidDay = VALID_DAYS.includes(hari);

    const sesi = Number(row.sesi || row.Sesi || 0);
    const totalAsprak = Number(row.total_asprak || row['Total Asprak'] || 0);

    const displayMkName = targetMK ? targetMK.nama_lengkap : mkName;

    let status: 'ok' | 'error' | 'warning' = 'ok';
    let statusMessage = '';

    if (!targetMK) {
      status = 'error';
      statusMessage = `Mata Kuliah "${mkName}" tidak ditemukan.`;
    } else if (!isValidDay) {
      status = 'error';
      statusMessage = `Hari "${hari}" tidak valid.`;
    } else if (!isPJJ && sesi <= 0) {
      status = 'error';
      statusMessage = 'Sesi harus > 0 (Kecuali PJJ)';
    }

    let ruanganClean = (row.ruangan || row.Ruangan || '').trim();
    ruanganClean = ruanganClean.replace(/\s+dan\s+/gi, ' & ').replace(/[\/,]/g, ' & ');
    if (ruanganClean.includes('&')) {
      ruanganClean = ruanganClean.split('&')[0].trim();
    }

    const rawJam = row.jam ?? row.Jam ?? '';
    const formattedJam = excelFractionToTime(rawJam);

    preview.push({
      id_mk: mkId,
      kelas: kelas,
      hari: hari,
      sesi: sesi,
      jam: formattedJam,
      ruangan: ruanganClean,
      total_asprak: totalAsprak,
      dosen: (row.dosen || row.Dosen || '').trim(),
      mkName: displayMkName,
      fromSystemLogic: !!targetMK,
      status,
      statusMessage,
      selected: status === 'ok',
      originalRow: preview.length + 2,
    });
  });

  return preview;
}
