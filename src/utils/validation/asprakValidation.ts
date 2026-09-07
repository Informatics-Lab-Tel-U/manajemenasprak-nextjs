import { PreviewRow } from '@/components/asprak/AsprakCSVPreview';
import { batchGenerateCodes } from '@/utils/asprakCodeGenerator';
import type { ExistingAsprakInfo } from '@/components/asprak/AsprakImportCSVModal';

const CODE_RECYCLE_YEARS = 5;

export type ExistingNimInfo = { nim: string; role: string; kode?: string; nama_lengkap?: string };

export function validateAsprakData(
  data: any[],
  existingCodes: string[],
  existingNims: ExistingNimInfo[],
  forceOverride: boolean = false,
  nimS2Mode: boolean = false
): PreviewRow[] {
  const usedCodes = new Set(
    (existingCodes || [])
      .map((c: any) => (typeof c === 'string' ? c : c?.kode))
      .filter((k): k is string => typeof k === 'string' && k.length > 0)
      .map((c) => c.toUpperCase())
  );
  const existingRecords = new Map<string, string>();
  existingNims.forEach((e) => {
    if (e.kode && typeof e.kode === 'string') {
      existingRecords.set(`${e.nim}_${e.role}`, e.kode.toUpperCase());
    }
  });

  // S2 mode: lookup map by kode+nama_lengkap (normalized uppercase)
  const existingByKodeNama = new Map<string, { nim: string; kode: string; role: string }>();
  if (nimS2Mode) {
    existingNims.forEach((e) => {
      if (e.kode && e.nama_lengkap) {
        const key = `${e.kode.toUpperCase()}_${e.nama_lengkap.toUpperCase().replace(/\s+/g, ' ').trim()}`;
        existingByKodeNama.set(key, { nim: e.nim, kode: e.kode.toUpperCase(), role: e.role });
      }
    });
  }

  const normalizedData = data.map((r: any) => {
    const keys = Object.keys(r);
    const getVal = (possibleNames: string[]) => {
      for (const p of possibleNames) {
        const found = keys.find(
          (k) =>
            k.toLowerCase().replace(/[^a-z0-9]/g, '') === p.toLowerCase().replace(/[^a-z0-9]/g, '')
        );
        if (found) return r[found];
      }
      return undefined;
    };

    return {
      nama_lengkap: String(getVal(['nama_lengkap', 'namalengkap', 'nama']) || '').trim(),
      nim: String(getVal(['nim']) || '').trim(),
      kode: getVal(['kode']) ? String(getVal(['kode'])).trim() : undefined,
      role: String(getVal(['role', 'peran']) || '')
        .trim()
        .toUpperCase(),
      angkatan: getVal(['angkatan', 'tahun']),
    };
  });

  const rowsForCodeGen = normalizedData.map((row) => ({
    nama_lengkap: row.nama_lengkap,
    kode: row.kode,
    role: row.role === 'ASLAB' ? 'ASLAB' : 'ASPRAK',
  }));

  const generatedCodes = batchGenerateCodes(rowsForCodeGen, forceOverride ? new Set() : usedCodes);

  const preview: PreviewRow[] = [];
  const seenNimsInCSV = new Set<string>();
  const seenKodeNamaInCSV = new Set<string>(); // used in S2 mode

  for (let idx = 0; idx < normalizedData.length; idx++) {
    const row = normalizedData[idx];
    const namaLengkap = row.nama_lengkap;
    const nim = row.nim;
    let role = row.role;
    if (role !== 'ASPRAK' && role !== 'ASLAB') {
      role = 'ASPRAK'; // Default role
    }

    const rawAngkatan = row.angkatan;
    let angkatan =
      typeof rawAngkatan === 'number' ? rawAngkatan : parseInt(String(rawAngkatan || '0'), 10);
    if (angkatan > 0 && angkatan < 100) angkatan += 2000;

    let originalKode = row.kode ? row.kode.toUpperCase() : '';
    let generated = generatedCodes[idx];

    let status: PreviewRow['status'] = 'ok';
    let statusMessage = '';

    if (!namaLengkap) {
      status = 'error';
      statusMessage = 'Nama kosong';
    } else if (!nim) {
      status = 'error';
      statusMessage = 'NIM kosong';
    } else if (nimS2Mode) {
      // S2 mode: match by kode + nama, update NIM
      if (!originalKode) {
        status = 'error';
        statusMessage = 'Mode NIM S2: kolom kode wajib diisi';
      } else {
        const csvNamaNorm = namaLengkap.toUpperCase().replace(/\s+/g, ' ').trim();
        const s2Key = `${originalKode.toUpperCase()}_${csvNamaNorm}`;
        if (seenKodeNamaInCSV.has(s2Key)) {
          status = 'duplicate-csv';
          statusMessage = 'Duplikat dalam CSV — Kode dan Nama sama dengan row sebelumnya';
        } else {
          const s2Match = existingByKodeNama.get(s2Key);
          if (s2Match) {
            status = 'warning';
            statusMessage = `NIM S2: ${s2Match.nim} → ${nim}`;
            generated = { code: s2Match.kode, rule: 'Existing (DB) — NIM S2' };
            originalKode = s2Match.kode;
          }
          // else: tidak ditemukan di DB → insert baru (status tetap 'ok')
        }
      }
    } else if (existingRecords.has(`${nim}_${role}`)) {
      status = 'warning';
      statusMessage = `Data sudah ada di DB — akan di-update`;
      if (!originalKode) {
        const oldCode = existingRecords.get(`${nim}_${role}`);
        if (oldCode) {
          originalKode = oldCode;
          generated = { code: oldCode, rule: 'Existing (DB)' };
        }
      }
    } else if (seenNimsInCSV.has(`${nim}_${role}`)) {
      status = 'duplicate-csv';
      statusMessage = 'Duplikat dalam CSV — NIM dan Role sama dengan row sebelumnya';
    } else if (angkatan <= 0 || isNaN(angkatan)) {
      status = 'warning';
      statusMessage = 'Angkatan tidak valid';
    }

    if (generated.rule === 'FAILED' && !originalKode && status === 'ok') {
      status = 'error';
      statusMessage = 'Kode gagal di-generate — isi manual di kolom kode';
    }

    if (nim) seenNimsInCSV.add(`${nim}_${role}`);
    if (nimS2Mode && originalKode && namaLengkap) {
      seenKodeNamaInCSV.add(`${originalKode.toUpperCase()}_${namaLengkap.toUpperCase().replace(/\s+/g, ' ').trim()}`);
    }

    const codeSource: PreviewRow['codeSource'] =
      generated.rule === 'Provided (CSV)' || generated.rule === 'Existing (DB)' ? 'csv' : 'generated';

    const isDuplicate =
      (status === 'error' && statusMessage.includes('Duplikat')) || status === 'duplicate-csv';

    // If forceOverride is true, and originalKode exists in the CSV, we use it directly
    // and ignore DB conflicts (the code generator will still have tried to generate a unique one if we didn't pass empty usedCodes)
    let finalCodeRule = isDuplicate ? 'Duplikat' : generated.rule;
    let finalDisplayKode = isDuplicate && originalKode ? originalKode : generated.code;
    let finalCodeSource = codeSource;
    let finalStatus = status;
    let finalStatusMessage = statusMessage;

    if (forceOverride && originalKode) {
      finalDisplayKode = originalKode;
      if (!isDuplicate) {
        finalCodeRule = 'Provided (CSV) [Forced]';
      }
      finalCodeSource = 'csv';
      if (finalStatusMessage.includes('Kode gagal di-generate')) {
        finalStatus = 'ok';
        finalStatusMessage = '';
      }
    }

    preview.push({
      nama_lengkap: namaLengkap.toUpperCase(),
      nim,
      kode: finalDisplayKode,
      role: role as 'ASPRAK' | 'ASLAB',
      angkatan: isNaN(angkatan) ? 0 : angkatan,
      codeRule: finalCodeRule,
      codeSource: finalCodeSource,
      status: finalStatus,
      statusMessage: finalStatusMessage,
      originalKode: finalDisplayKode,
      originalCodeRule: finalCodeRule,
      originalCodeSource: finalCodeSource,
      selected: finalStatus === 'ok',
    });
  }

  return preview;
}

export function validateAsprakCodeEdit(
  rowIndex: number,
  newCode: string,
  currentRows: PreviewRow[],
  existingAspraks: ExistingAsprakInfo[],
  forceOverride: boolean = false
): PreviewRow[] {
  const updated = [...currentRows];
  const row = { ...updated[rowIndex] };
  const uppercased = newCode.toUpperCase();
  row.kode = uppercased;

  if (uppercased === row.originalKode) {
    row.codeSource = row.originalCodeSource;
    row.codeRule = row.originalCodeRule;
  } else {
    row.codeSource = 'csv';
    row.codeRule = 'Manual edit';
  }

  if (/^[A-Z]{3}$/.test(uppercased)) {
    const conflictInCSV =
      row.role !== 'ASLAB' &&
      updated.some(
        (r, i) =>
          i !== rowIndex &&
          r.kode === uppercased &&
          r.status !== 'error' &&
          r.status !== 'duplicate-csv'
      );

    const conflictInDB =
      row.role !== 'ASLAB' &&
      !forceOverride &&
      existingAspraks.some((a) => {
        if (a.nim === row.nim || !a.kode || typeof a.kode !== 'string') return false;
        if (a.kode.toUpperCase() !== uppercased) return false;
        const gap = row.angkatan - a.angkatan;
        return gap < CODE_RECYCLE_YEARS;
      });

    const preserveError =
      row.status === 'error' &&
      (row.statusMessage?.includes('NIM') || row.statusMessage?.includes('Nama'));
    const preserveDuplicateCsv = row.status === 'duplicate-csv';

    if (conflictInCSV) {
      if (!preserveError && !preserveDuplicateCsv) {
        row.status = 'warning';
        row.statusMessage = `Kode "${uppercased}" sudah dipakai row lain di CSV ini`;
      }
    } else if (conflictInDB) {
      if (!preserveError && !preserveDuplicateCsv) {
        row.status = 'warning';
        row.statusMessage = `Kode "${uppercased}" sudah dipakai asprak lain di DB (< ${CODE_RECYCLE_YEARS} thn)`;
      }
    } else {
      if (!preserveError && !preserveDuplicateCsv) {
        row.status = 'ok';
        row.statusMessage = '';
      }
    }

    if (row.status === 'ok') {
      if (!row.selected) row.selected = true;
    } else {
      row.selected = false;
    }
  } else if (uppercased.length > 0 && uppercased.length < 3) {
    const preserveError =
      row.status === 'error' &&
      (row.statusMessage?.includes('NIM') || row.statusMessage?.includes('Nama'));
    const preserveDuplicateCsv = row.status === 'duplicate-csv';
    if (!preserveError && !preserveDuplicateCsv) {
      row.status = 'error';
      row.statusMessage = 'Kode harus 3 huruf';
    }
    row.selected = false;
  } else if (uppercased.length === 0) {
    const preserveError =
      row.status === 'error' &&
      (row.statusMessage?.includes('NIM') || row.statusMessage?.includes('Nama'));
    const preserveDuplicateCsv = row.status === 'duplicate-csv';
    if (!preserveError && !preserveDuplicateCsv) {
      row.status = 'error';
      row.statusMessage = 'Kode tidak boleh kosong';
    }
    row.selected = false;
  }

  updated[rowIndex] = row;
  return updated;
}
