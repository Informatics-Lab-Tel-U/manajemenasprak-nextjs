export async function exportSpreadsheet(data: any[], filename: string, sheetName = 'Sheet1', format: 'csv' | 'xlsx' = 'xlsx') {
  const response = await fetch('/api/util/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data, filename, sheetName, format }),
  });

  if (!response.ok) {
    let errStr = 'Gagal mengekspor file';
    try {
      const errJson = await response.json();
      errStr = errJson.error || errStr;
    } catch {
    }
    throw new Error(errStr);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  
  link.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 100);
}

export async function parseSpreadsheet(file: File): Promise<any[]> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/util/parse', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.error || 'Gagal memproses file spreadsheet');
  }

  return result.data;
}

export async function parseAllSheets(file: File): Promise<{ name: string; data: string[][] }[]> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/util/parse-all-sheets', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.error || 'Gagal memproses file');
  }

  return result.sheets;
}


export function downloadTemplate(type: string, format: 'csv' | 'xlsx' = 'csv') {
  const url = `/api/util/template?type=${type}&format=${format}`;
  const link = document.createElement('a');
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function generatePresensiExcel(options: any) {
  try {
    // 1. Coba generate langsung di browser menggunakan ExcelJS via CDN
    // Menghindari limit CPU 10ms & memory 128MB Cloudflare Workers tanpa menambah bundle size Next.js
    const { generatePresensiExcelClient } = await import('@/lib/excel/presensiClientGenerator');
    await generatePresensiExcelClient(options);
    return;
  } catch (clientErr: any) {
    console.warn('Client-side Excel generator failed, falling back to backend:', clientErr);
  }

  // 2. Fallback ke endpoint backend jika CDN atau browser generator gagal
  const response = await fetch('/api/util/presensi', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    let errStr = 'Gagal men-generate file presensi';
    try {
      const errJson = await response.json();
      errStr = errJson.error || errStr;
    } catch {
    }
    throw new Error(errStr);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const filename = `${options.namaFile || 'presensi'}.xlsx`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();

  link.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 100);
}

