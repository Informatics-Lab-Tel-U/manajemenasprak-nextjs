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

function parseCSVText(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map((line) => {
    const row: string[] = [];
    let cur = '';
    let inQuotes = false;
    const delimiter = line.includes(';') && !line.includes(',') ? ';' : ',';
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === delimiter && !inQuotes) {
        row.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    row.push(cur.trim());
    return row;
  });
}

async function loadSheetJS(): Promise<any> {
  if (typeof window === 'undefined') throw new Error('Client-only parser');
  if ((window as any).XLSX) return (window as any).XLSX;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).XLSX) resolve((window as any).XLSX);
      else tryFallback();
    };
    script.onerror = () => tryFallback();

    function tryFallback() {
      if (script.parentNode) script.parentNode.removeChild(script);
      const s2 = document.createElement('script');
      s2.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      s2.async = true;
      s2.onload = () => {
        if ((window as any).XLSX) resolve((window as any).XLSX);
        else reject(new Error('Gagal memuat parser XLSX'));
      };
      s2.onerror = () => reject(new Error('Gagal memuat library pembaca spreadsheet'));
      document.head.appendChild(s2);
    }

    document.head.appendChild(script);
  });
}

async function parseExcelClient(file: File): Promise<string[][]> {
  const XLSX = await loadSheetJS();
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const worksheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: true }) as string[][];
  return matrix.map((row) =>
    Array.isArray(row) ? row.map((cell) => String(cell ?? '').trim()) : []
  );
}

export async function parseSpreadsheet(file: File): Promise<any[]> {
  // 1. Try backend API first
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/util/parse', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const result = await response.json();
      if (result.ok && Array.isArray(result.data)) {
        return result.data;
      }
    }
  } catch (backendErr) {
    console.warn('Backend parseSpreadsheet error, attempting client-side fallback:', backendErr);
  }

  // 2. Client-side fallback if backend returns Unauthorized (401), 500, or network error
  try {
    if (file.name.toLowerCase().endsWith('.csv')) {
      const text = await file.text();
      return parseCSVText(text);
    }
    return await parseExcelClient(file);
  } catch (clientErr: any) {
    console.error('Client-side spreadsheet parse failed:', clientErr);
    throw new Error(clientErr.message || 'Gagal memproses file spreadsheet');
  }
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

export async function exportPresensiJagaExcel(params: {
  term: string;
  modul?: number;
}) {
  const query = new URLSearchParams();
  query.set('term', params.term);
  if (typeof params.modul === 'number' && params.modul > 0) {
    query.set('modul', params.modul.toString());
  }

  const response = await fetch(`/api/jaga/presensi/export?${query.toString()}`);

  if (!response.ok) {
    let errStr = 'Gagal mengekspor presensi jaga';
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

  const safeTerm = params.term.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeModul = params.modul && params.modul > 0 ? `_Modul${params.modul}` : '';
  const filename = `Presensi_Jaga_${safeTerm}${safeModul}.xlsx`;

  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();

  link.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 100);
}

