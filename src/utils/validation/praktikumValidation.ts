import { PraktikumPreviewRow } from '@/components/praktikum/PraktikumCSVPreview';

export function validatePraktikumData(
  data: any[],
  existingPraktikums: { nama: string; tahun_ajaran: string }[]
): PraktikumPreviewRow[] {
  const preview: PraktikumPreviewRow[] = [];

  const existingMap = new Set(
    existingPraktikums.map((p) => `${p.nama.toUpperCase()}|${p.tahun_ajaran}`)
  );

  const internalMap = new Set<string>();

  data.forEach((row: any) => {
    const nama = (
      row.nama_singkat ||
      row.nama_lengkap ||
      row.nama ||
      row.Nama ||
      row['Nama Singkat'] ||
      ''
    )
      .toString()
      .trim()
      .toUpperCase();
    let rawTahun = (row.tahun_ajaran || row['Tahun Ajaran'] || '').toString().trim();
    const num = Number(rawTahun);
    if (!isNaN(num) && num >= 100000 && num <= 400000) {
      const utc_days = Math.floor(num - 25569);
      const date = new Date(utc_days * 86400 * 1000);
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      if (year >= 2000 && year <= 2999 && (month === 1 || month === 2)) {
        rawTahun = `${year}-${month}`;
      }
    }
    const tahunAjaran = rawTahun;

    let status: PraktikumPreviewRow['status'] = 'ok';
    let statusMessage = '';
    let selected = true;

    if (!nama) {
      status = 'error';
      statusMessage = 'Nama kosong';
      selected = false;
    } else if (!tahunAjaran) {
      status = 'error';
      statusMessage = 'Tahun Ajaran kosong';
      selected = false;
    } else {
      const key = `${nama}|${tahunAjaran}`;

      if (existingMap.has(key)) {
        status = 'skipped';
        statusMessage = 'Sudah ada di database';
        selected = false;
      }
      // Check against earlier rows in the same file
      else if (internalMap.has(key)) {
        status = 'skipped';
        statusMessage = 'Duplikat dalam file csv/excel';
        selected = false;
      }

      internalMap.add(key);
    }

    preview.push({
      nama,
      tahun_ajaran: tahunAjaran,
      status,
      statusMessage,
      selected,
    });
  });

  return preview;
}
