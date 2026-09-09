import { addDays, format, startOfDay } from 'date-fns';
import { PRESENSI_STYLES, PRESENSI_COLUMN_WIDTHS, PRESENSI_THEMES, ThemeColors } from '@/constants/presensiConstants';
import { PresensiGeneratorOptions, AsprakEntry } from '@/types/presensi';

/**
 * Memuat ExcelJS secara dinamis dari CDN ke window.ExcelJS
 * Tanpa menambah dependensi package.json Next.js sehingga ukuran Cloudflare Worker bundle tetap 0 byte.
 */
export async function loadExcelJSFromCDN(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('Client-side generator hanya dapat dijalankan di browser.');
  }

  if ((window as any).ExcelJS) {
    return (window as any).ExcelJS;
  }

  return new Promise((resolve, reject) => {
    // 1. Coba cdnjs
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    script.async = true;

    script.onload = () => {
      if ((window as any).ExcelJS) {
        resolve((window as any).ExcelJS);
      } else {
        tryFallback();
      }
    };

    script.onerror = () => {
      tryFallback();
    };

    function tryFallback() {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      // 2. Fallback ke jsdelivr
      const fallbackScript = document.createElement('script');
      fallbackScript.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
      fallbackScript.async = true;

      fallbackScript.onload = () => {
        if ((window as any).ExcelJS) {
          resolve((window as any).ExcelJS);
        } else {
          reject(new Error('ExcelJS gagal diinisialisasi dari CDN.'));
        }
      };

      fallbackScript.onerror = () => {
        reject(new Error('Gagal memuat ExcelJS dari CDN. Periksa koneksi internet Anda.'));
      };

      document.head.appendChild(fallbackScript);
    }

    document.head.appendChild(script);
  });
}

export function applyHeaderStyle(cell: any, colors: ThemeColors = PRESENSI_STYLES.COLORS) {
  cell.font = { bold: true, color: { argb: colors.HEADER_FG } };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.HEADER_BG },
  };
  cell.border = PRESENSI_STYLES.BORDERS;
}

export function getRowDistribution(totalRows: number, numGroups: number): number[] {
  if (numGroups <= 0) return [totalRows];
  const base = Math.floor(totalRows / numGroups);
  const remainder = totalRows % numGroups;
  const dist: number[] = [];
  for (let i = 0; i < numGroups; i++) {
    dist.push(base + (i < remainder ? 1 : 0));
  }
  return dist;
}

/** Konversi nomor kolom (1-based) ke huruf Excel (A, B, ..., Z, AA, ...) */
export function colNumToLetter(col: number): string {
  let letter = '';
  while (col > 0) {
    const rem = (col - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

export function addBase(sheet: any, colors: ThemeColors = PRESENSI_STYLES.COLORS) {
  sheet.mergeCells('A1:A3');
  sheet.getCell('A1').value = 'NO.';
  sheet.mergeCells('B1:B3');
  sheet.getCell('B1').value = 'NIM';
  sheet.mergeCells('C1:C3');
  sheet.getCell('C1').value = 'NAMA';
  sheet.mergeCells('D1:D3');
  sheet.getCell('D1').value = 'KODE ASPRAK';

  const baseHeaders = ['A1', 'B1', 'C1', 'D1'];
  baseHeaders.forEach((cellId) => {
    applyHeaderStyle(sheet.getCell(cellId), colors);
  });

  sheet.getColumn(1).width = PRESENSI_COLUMN_WIDTHS.BASE.NO;
  sheet.getColumn(2).width = PRESENSI_COLUMN_WIDTHS.BASE.NIM;
  sheet.getColumn(3).width = PRESENSI_COLUMN_WIDTHS.BASE.NAMA;
  sheet.getColumn(4).width = PRESENSI_COLUMN_WIDTHS.BASE.KODE_ASPRAK;

  sheet.views = [{ state: 'frozen', ySplit: 3, xSplit: 4, topLeftCell: 'E4' }];
}

export function createModul(
  sheet: any,
  startDate: Date,
  opsi: PresensiGeneratorOptions['opsi'],
  modulNum: number,
  colors: ThemeColors = PRESENSI_STYLES.COLORS
) {
  const optionalCols: { name: string; on: boolean }[] = [
    { name: 'TP', on: opsi.tp.enabled },
    { name: 'JURNAL', on: opsi.jurnal.enabled },
    { name: 'TES AKHIR', on: opsi.tesAkhir.enabled },
    { name: 'RATE', on: opsi.rate },
  ];
  const selectedOptionNames = optionalCols.reduce<string[]>((acc, col) => {
    if (col.on) acc.push(col.name);
    return acc;
  }, []);
  const numOption = selectedOptionNames.length;

  const totalColsThisModule = 4 + numOption;
  const startCol = (modulNum - 1) * totalColsThisModule + 5;
  const parsedStartDate = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const modulDate = addDays(startOfDay(parsedStartDate), (modulNum - 1) * 7);

  // Merge for MODUL {modulNum}
  sheet.mergeCells(1, startCol, 1, startCol + totalColsThisModule - 1);
  const modulCell = sheet.getCell(1, startCol);
  modulCell.value = `MODUL ${modulNum}`;

  // Merge for Date
  sheet.mergeCells(2, startCol, 2, startCol + totalColsThisModule - 1);
  const dateCell = sheet.getCell(2, startCol);
  dateCell.value = format(modulDate, 'dd/MM/yyyy');

  // Add sub-headers in row 3
  let colPointer = startCol;
  const subHeaders = [
    'KEHADIRAN ASPRAK',
    'KEHADIRAN',
    'EVIDENCE',
    ...selectedOptionNames,
    'TOTAL NILAI',
  ];

  subHeaders.forEach((headerText) => {
    const c = sheet.getCell(3, colPointer);
    c.value = headerText;

    if (headerText === 'KEHADIRAN ASPRAK') {
      sheet.getColumn(colPointer).width = PRESENSI_COLUMN_WIDTHS.MODULE.KEHADIRAN_ASPRAK;
    } else if (headerText === 'KEHADIRAN') {
      sheet.getColumn(colPointer).width = PRESENSI_COLUMN_WIDTHS.MODULE.KEHADIRAN;
    } else if (headerText === 'EVIDENCE') {
      sheet.getColumn(colPointer).width = PRESENSI_COLUMN_WIDTHS.MODULE.EVIDENCE;
    } else if (headerText === 'TP') {
      sheet.getColumn(colPointer).width = PRESENSI_COLUMN_WIDTHS.MODULE.TP;
    } else if (headerText === 'JURNAL' || headerText === 'TES AKHIR') {
      sheet.getColumn(colPointer).width = PRESENSI_COLUMN_WIDTHS.MODULE.JURNAL;
    } else if (headerText === 'RATE') {
      sheet.getColumn(colPointer).width = PRESENSI_COLUMN_WIDTHS.MODULE.RATE;
    } else if (headerText === 'TOTAL NILAI') {
      sheet.getColumn(colPointer).width = PRESENSI_COLUMN_WIDTHS.MODULE.TOTAL_NILAI;
    } else {
      sheet.getColumn(colPointer).width = PRESENSI_COLUMN_WIDTHS.MODULE.DEFAULT;
    }
    colPointer++;
  });

  // Apply styling to all cells in the module header
  for (let r = 1; r <= 3; r++) {
    for (let c = startCol; c < startCol + totalColsThisModule; c++) {
      const cell = sheet.getCell(r, c);
      if (cell.type !== 1 /* ValueType.Merge */ || cell.address === sheet.getCell(r, c).master.address) {
        applyHeaderStyle(cell, colors);
      } else {
        const mc = sheet.getCell(r, c);
        mc.border = PRESENSI_STYLES.BORDERS;
      }
    }
  }
}

function injectRowValidationAndFormulas(
  sheet: any,
  r: number,
  numModules: number,
  totalColsThisModule: number,
  opsi: PresensiGeneratorOptions['opsi'],
  fillColor: string
) {
  // Base cells A-D
  for (let c = 1; c <= 4; c++) {
    const cell = sheet.getCell(r, c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
    cell.border = PRESENSI_STYLES.BORDERS;
    if (c === 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  // Module cells
  for (let m = 0; m < numModules; m++) {
    const startCol = m * totalColsThisModule + 5;

    for (let c = startCol; c < startCol + totalColsThisModule; c++) {
      const cell = sheet.getCell(r, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
      cell.border = PRESENSI_STYLES.BORDERS;

      if (c !== startCol + 2) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }

    // KEHADIRAN Dropdown
    const kehadiranColStr = sheet.getColumn(startCol + 1).letter;
    sheet.getCell(`${kehadiranColStr}${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"HADIR, TIDAK HADIR"'],
      showErrorMessage: true,
      showInputMessage: true,
    };

    // TOTAL NILAI Formula
    let tpCol = '', jurnalCol = '', tesAkhirCol = '';
    let currentOffset = startCol + 3;
    if (opsi.tp.enabled) {
      tpCol = sheet.getColumn(currentOffset).letter;
      if (opsi.tp.inputType === 'boolean') {
        sheet.getCell(`${tpCol}${r}`).dataValidation = {
          type: 'list', allowBlank: true, formulae: ['"YA, TIDAK"'], showErrorMessage: true, showInputMessage: true,
        };
      }
      currentOffset++;
    }
    if (opsi.jurnal.enabled) {
      jurnalCol = sheet.getColumn(currentOffset).letter;
      if (opsi.jurnal.inputType === 'boolean') {
        sheet.getCell(`${jurnalCol}${r}`).dataValidation = {
          type: 'list', allowBlank: true, formulae: ['"YA, TIDAK"'], showErrorMessage: true, showInputMessage: true,
        };
      }
      currentOffset++;
    }
    if (opsi.tesAkhir.enabled) {
      tesAkhirCol = sheet.getColumn(currentOffset).letter;
      if (opsi.tesAkhir.inputType === 'boolean') {
        sheet.getCell(`${tesAkhirCol}${r}`).dataValidation = {
          type: 'list', allowBlank: true, formulae: ['"YA, TIDAK"'], showErrorMessage: true, showInputMessage: true,
        };
      }
      currentOffset++;
    }

    const totalNilaiCol = sheet.getColumn(startCol + totalColsThisModule - 1).letter;
    const totalNilaiCell = sheet.getCell(`${totalNilaiCol}${r}`);

    const formulaParts: string[] = [];
    if (tpCol && opsi.tp.inputType === 'number' && opsi.tp.weight > 0) {
      formulaParts.push(`${tpCol}${r}*${opsi.tp.weight / 100}`);
    }
    if (jurnalCol && opsi.jurnal.inputType === 'number' && opsi.jurnal.weight > 0) {
      formulaParts.push(`${jurnalCol}${r}*${opsi.jurnal.weight / 100}`);
    }
    if (tesAkhirCol && opsi.tesAkhir.inputType === 'number' && opsi.tesAkhir.weight > 0) {
      formulaParts.push(`${tesAkhirCol}${r}*${opsi.tesAkhir.weight / 100}`);
    }

    if (formulaParts.length > 0) {
      totalNilaiCell.value = { formula: formulaParts.join('+'), result: 0 };
    } else {
      totalNilaiCell.value = 0;
    }
  }
}

function applyVerticalMerges(
  sheet: any,
  numModules: number,
  totalColsThisModule: number,
  dist: number[]
) {
  let currentRow = 4;
  for (let groupIndex = 0; groupIndex < dist.length; groupIndex++) {
    const rowsInGroup = dist[groupIndex];
    if (rowsInGroup <= 0) continue;

    const startRow = currentRow;
    const endRow = currentRow + rowsInGroup - 1;

    // Merge KODE ASPRAK (Col D)
    if (endRow > startRow) {
      sheet.mergeCells(startRow, 4, endRow, 4);
    }
    sheet.getCell(startRow, 4).alignment = { horizontal: 'center', vertical: 'middle' };

    // Merge KEHADIRAN ASPRAK
    for (let m = 0; m < numModules; m++) {
      const startCol = m * totalColsThisModule + 5;
      if (endRow > startRow) {
        sheet.mergeCells(startRow, startCol, endRow, startCol);
      }
      sheet.getCell(startRow, startCol).alignment = { horizontal: 'center', vertical: 'middle' };
    }

    currentRow += rowsInGroup;
  }
}

export function formatRows(
  sheet: any,
  numModules: number,
  opsi: PresensiGeneratorOptions['opsi'],
  jumlahPraktikan: number,
  jumlahAsprak: number,
  colors: ThemeColors = PRESENSI_STYLES.COLORS
) {
  const numOption = [opsi.tp.enabled, opsi.jurnal.enabled, opsi.tesAkhir.enabled, opsi.rate].filter(Boolean).length;
  const totalColsThisModule = 4 + numOption;
  const rataCol = 5 + (numModules * totalColsThisModule);

  // Create RATA RATA Header
  sheet.mergeCells(1, rataCol, 3, rataCol);
  const rataCell = sheet.getCell(1, rataCol);
  rataCell.value = 'RATA RATA';
  applyHeaderStyle(rataCell, colors);
  sheet.getColumn(rataCol).width = PRESENSI_COLUMN_WIDTHS.RATA_RATA;

  const totalNilaiColLetters: string[] = [];
  for (let m = 0; m < numModules; m++) {
    const startCol = m * totalColsThisModule + 5;
    totalNilaiColLetters.push(sheet.getColumn(startCol + totalColsThisModule - 1).letter);
  }

  const dist = getRowDistribution(jumlahPraktikan, jumlahAsprak);
  let currentRow = 4;

  for (let groupIndex = 0; groupIndex < dist.length; groupIndex++) {
    const rowsInGroup = dist[groupIndex];
    const isBand1 = groupIndex % 2 === 0;
    const fillColor = isBand1 ? colors.BAND_1_BG : colors.BAND_2_BG;

    for (let i = 0; i < rowsInGroup; i++) {
      const r = currentRow + i;
      injectRowValidationAndFormulas(sheet, r, numModules, totalColsThisModule, opsi, fillColor);

      // RATA RATA Formula
      const rataCellRow = sheet.getCell(r, rataCol);
      rataCellRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
      rataCellRow.border = PRESENSI_STYLES.BORDERS;
      rataCellRow.alignment = { horizontal: 'center', vertical: 'middle' };

      if (totalNilaiColLetters.length > 0) {
        const avgCells = totalNilaiColLetters.map((col) => `${col}${r}`).join(',');
        rataCellRow.value = { formula: `AVERAGE(${avgCells})`, result: 0 };
      }
    }
    currentRow += rowsInGroup;
  }

  applyVerticalMerges(sheet, numModules, totalColsThisModule, dist);

  // Merge EVIDENCE column for the entire class
  const lastRow = 4 + jumlahPraktikan - 1;
  if (lastRow >= 4) {
    for (let m = 0; m < numModules; m++) {
      const startCol = m * totalColsThisModule + 5;
      const evidenceCol = startCol + 2;
      sheet.mergeCells(4, evidenceCol, lastRow, evidenceCol);
      sheet.getCell(4, evidenceCol).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    }
  }
}

export function addAsprakBelumNilaiSheet(
  workbook: any,
  asprakList: AsprakEntry[],
  colors: ThemeColors = PRESENSI_STYLES.COLORS
) {
  const ws = workbook.addWorksheet('LIST ASPRAK');
  ws.properties.tabColor = { argb: colors.TAB_LIST_ASPRAK };

  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 44;
  ws.getColumn(3).width = 18;

  const headerStyle: any = {
    font: { bold: true, color: { argb: colors.HEADER_FG } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.HEADER_BG } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: PRESENSI_STYLES.BORDERS,
  };

  const headerRow = ws.getRow(2);
  const cellNama = headerRow.getCell(2);
  cellNama.value = 'Nama Lengkap';
  Object.assign(cellNama, headerStyle);

  const cellKode = headerRow.getCell(3);
  cellKode.value = 'Kode';
  Object.assign(cellKode, headerStyle);
  headerRow.height = 20;

  asprakList.forEach((asprak, idx) => {
    const rowNum = idx + 3;
    const row = ws.getRow(rowNum);

    const namaCell = row.getCell(2);
    namaCell.value = asprak.nama;
    namaCell.border = PRESENSI_STYLES.BORDERS;
    namaCell.alignment = { vertical: 'middle' };

    const kodeCell = row.getCell(3);
    kodeCell.value = asprak.kode;
    kodeCell.border = PRESENSI_STYLES.BORDERS;
    kodeCell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  if (asprakList.length > 0) {
    ws.addTable({
      name: 'TableAsprak',
      ref: `B2:C${asprakList.length + 2}`,
      headerRow: true,
      totalsRow: false,
      style: {
        theme: null,
        showRowStripes: false,
      },
      columns: [
        { name: 'Nama Lengkap', filterButton: true },
        { name: 'Kode', filterButton: true },
      ],
      rows: asprakList.map((a) => [a.nama, a.kode]),
    });
  }
}

export function addRekapSheet(
  workbook: any,
  options: PresensiGeneratorOptions,
  colors: ThemeColors = PRESENSI_STYLES.COLORS
) {
  const { kelasNames, kelasSettings, jumlahModul, opsi } = options;

  const numOption = [opsi.tp.enabled, opsi.jurnal.enabled, opsi.tesAkhir.enabled, opsi.rate].filter(Boolean).length;
  const totalColsThisModule = 4 + numOption;

  const BASE_COLS = 4;
  const MODUL_START_COL = BASE_COLS + 1;

  const optionalOrder = [
    { key: 'tp', enabled: opsi.tp.enabled },
    { key: 'jurnal', enabled: opsi.jurnal.enabled },
    { key: 'tesAkhir', enabled: opsi.tesAkhir.enabled },
    { key: 'rate', enabled: opsi.rate },
  ];
  const enabledOptionalIndices: number[] = [];
  let optOffset = 3;
  for (const opt of optionalOrder) {
    if (opt.enabled) {
      enabledOptionalIndices.push(optOffset);
      optOffset++;
    }
  }

  const ws = workbook.addWorksheet('ASPRAK BELUM NILAI');
  ws.properties.tabColor = { argb: 'FFC00000' };

  const COL_A = 1;
  const COL_NAMA = 2;
  const COL_KODE = 3;
  const COL_KELAS = 4;
  const COL_JPR = 5;
  const COL_SROW = 6;
  const COL_EROW = 7;
  const COL_MODUL1 = 8;

  ws.getColumn(COL_JPR).hidden = true;
  ws.getColumn(COL_SROW).hidden = true;
  ws.getColumn(COL_EROW).hidden = true;

  ws.getColumn(COL_A).width = 3;
  ws.getColumn(COL_NAMA).width = 30;
  ws.getColumn(COL_KODE).width = 8;
  ws.getColumn(COL_KELAS).width = 18;
  for (let m = 0; m < jumlahModul; m++) {
    ws.getColumn(COL_MODUL1 + m).width = 10;
  }

  const headerStyle: any = {
    font: { bold: true, color: { argb: colors.HEADER_FG } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.HEADER_BG } },
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    border: PRESENSI_STYLES.BORDERS,
  };

  const row2 = ws.getRow(2);
  row2.height = 36;

  function setHeaderCell(row: any, colIdx: number, value: string) {
    const cell = row.getCell(colIdx);
    cell.value = value;
    Object.assign(cell, headerStyle);
  }

  const rawStartDate = kelasSettings[0]?.tanggalMulai || new Date();
  const startDate = typeof rawStartDate === 'string' ? new Date(rawStartDate) : rawStartDate;
  const year = startDate.getFullYear();
  const month = startDate.getMonth() + 1;
  const day = startDate.getDate();

  const cellNamaHeader = row2.getCell(COL_NAMA);
  cellNamaHeader.value = {
    formula: `_xlfn.LET(_xlpm.WEEK,INT((TODAY()-DATE(${year},${month},${day}))/7)+1," NAMA ASPRAK (MODUL "&_xlpm.WEEK&")")`,
    result: 'Nama Asprak'
  };
  Object.assign(cellNamaHeader, headerStyle);
  setHeaderCell(row2, COL_KODE, 'Kode');
  setHeaderCell(row2, COL_KELAS, 'Kelas');

  for (let m = 0; m < jumlahModul; m++) {
    setHeaderCell(row2, COL_MODUL1 + m, `Modul ${m + 1}`);
  }

  ws.views = [{ state: 'frozen', ySplit: 2, xSplit: 4, topLeftCell: 'E3' }];

  let currentRow = 3;

  for (let kelasIdx = 0; kelasIdx < kelasNames.length; kelasIdx++) {
    const kelasName = kelasNames[kelasIdx];
    const setting = kelasSettings[kelasIdx];
    const jumlahPraktikan = setting?.jumlahPraktikan || 40;
    const jumlahAsprak = setting?.jumlahAsprak || 4;

    const dist = getRowDistribution(jumlahPraktikan, jumlahAsprak);
    const DATA_START_ROW = 4;
    let groupStartRow = DATA_START_ROW;

    for (let asprakIdx = 0; asprakIdx < dist.length; asprakIdx++) {
      const rowsInGroup = dist[asprakIdx];
      if (rowsInGroup <= 0) continue;

      const groupEndRow = groupStartRow + rowsInGroup - 1;
      const isAlt = asprakIdx % 2 === 0;
      const fillColor = isAlt ? colors.BAND_1_BG : colors.BAND_2_BG;

      const row = ws.getRow(currentRow);
      row.height = 18;

      function styleCell(colIdx: number, value: any, alignment: any = {}, ignoreFillColor = false) {
        const cell = row.getCell(colIdx);
        cell.value = value;
        cell.border = PRESENSI_STYLES.BORDERS;
        cell.alignment = { vertical: 'middle', ...alignment };
        if (fillColor && !ignoreFillColor) {
           cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
        }
      }

      const kodeRef = `$C${currentRow}`;
      styleCell(
        COL_NAMA,
        { formula: `IFERROR(INDEX('LIST ASPRAK'!$B:$B,MATCH(${kodeRef},'LIST ASPRAK'!$C:$C,0)),"")`, result: '' },
        {},
        true
      );

      const formulaKode = `_xlfn.LET(_xlpm.WEEK,INT((TODAY()-DATE(${year},${month},${day}))/7),_xlpm.ROW_OFFSET,SUM(INDIRECT(_xlfn.CONCAT($F${currentRow},":",ADDRESS(ROW($E${currentRow}),COLUMN($E${currentRow})))))-$E${currentRow},_xlpm.KODE_BASE,TRIM(OFFSET(INDIRECT(_xlfn.CONCAT("'",$G${currentRow},"'!D4")),_xlpm.ROW_OFFSET,0)),_xlpm.KODE_MODUL,IF(AND(_xlpm.WEEK>=0,_xlpm.WEEK<${jumlahModul}),TRIM(OFFSET(INDIRECT(_xlfn.CONCAT("'",$G${currentRow},"'!E4")),_xlpm.ROW_OFFSET,_xlpm.WEEK*${totalColsThisModule})),""),_xlpm.KODE,IF(_xlpm.KODE_MODUL<>"",_xlpm.KODE_MODUL,_xlpm.KODE_BASE),IFERROR(IF(_xlpm.KODE="","",_xlpm.KODE),""))`;
      styleCell(
        COL_KODE,
        {
          formula: formulaKode,
          result: '',
        },
        { horizontal: 'center' },
        true
      );

      const safeKelasName = kelasName.substring(0, 31).replace(/[\\/*?:\[\]]/g, '');
      styleCell(COL_KELAS, asprakIdx === 0 ? safeKelasName : '', { horizontal: 'center' });
      styleCell(COL_JPR, rowsInGroup, { horizontal: 'center' });
      
      styleCell(
        COL_SROW,
        { formula: `IF(D${currentRow}<>"",ADDRESS(ROW($E${currentRow}),COLUMN($E${currentRow})),$F${currentRow - 1})`, result: '' },
        { horizontal: 'center' }
      );

      styleCell(
        COL_EROW,
        { formula: `IF(D${currentRow}<>"",D${currentRow},G${currentRow - 1})`, result: '' },
        { horizontal: 'center' }
      );

      for (let m = 0; m < jumlahModul; m++) {
        const colIdx = COL_MODUL1 + m;
        const modulOffset = m * totalColsThisModule;

        let formulaCountBlank = `COUNTBLANK(OFFSET(INDIRECT(_xlfn.CONCAT("'",$G${currentRow},"'!F4")),_xlpm.ROW_OFFSET,${modulOffset},$E${currentRow}))`;

        if (enabledOptionalIndices.length > 0) {
          const firstOpt = enabledOptionalIndices[0];
          const optLetter = colNumToLetter(MODUL_START_COL + firstOpt);
          const numOpts = enabledOptionalIndices.length;
          formulaCountBlank += `+COUNTBLANK(OFFSET(INDIRECT(_xlfn.CONCAT("'",$G${currentRow},"'!${optLetter}4")),_xlpm.ROW_OFFSET,${modulOffset},$E${currentRow},${numOpts}))`;
        }

        const formulaModul = `_xlfn.LET(_xlpm.ROW_OFFSET,SUM(INDIRECT(_xlfn.CONCAT($F${currentRow},":",ADDRESS(ROW($E${currentRow}),COLUMN($E${currentRow})))))-$E${currentRow},_xlpm.KODE_BASE,TRIM(OFFSET(INDIRECT(_xlfn.CONCAT("'",$G${currentRow},"'!D4")),_xlpm.ROW_OFFSET,0)),_xlpm.KODE_MODUL,TRIM(OFFSET(INDIRECT(_xlfn.CONCAT("'",$G${currentRow},"'!E4")),_xlpm.ROW_OFFSET,${modulOffset})),_xlpm.KODE,IF(_xlpm.KODE_MODUL<>"",_xlpm.KODE_MODUL,_xlpm.KODE_BASE),IF(_xlpm.KODE="","",${formulaCountBlank}))`;

        const modCell = row.getCell(colIdx);
        modCell.value = { formula: formulaModul, result: 0 };
        modCell.border = PRESENSI_STYLES.BORDERS;
        modCell.alignment = { vertical: 'middle', horizontal: 'center' };
        modCell.numFmt = ';;;';
        if (fillColor) {
           modCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
        }
      }

      currentRow++;
      groupStartRow = groupEndRow + 1;
    }

    const classStartRowInRekap = currentRow - dist.length;
    const classEndRowInRekap = currentRow - 1;
    if (dist.length > 0) {
      const modulStartLetter = colNumToLetter(COL_MODUL1);
      const modulEndLetter = colNumToLetter(COL_MODUL1 + jumlahModul - 1);
      const firstCell = `${modulStartLetter}${classStartRowInRekap}`;
      const cfRef = `${modulStartLetter}${classStartRowInRekap}:${modulEndLetter}${classEndRowInRekap}`;

      ws.addConditionalFormatting({
        ref: cfRef,
        rules: [
          {
            type: 'expression',
            priority: 1,
            formulae: [`LEN(TRIM(${firstCell}))=0`]
          },
          {
            type: 'cellIs',
            priority: 2,
            operator: 'greaterThan',
            formulae: ['0'],
            style: {
              fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFF0000' } },
            },
          },
          {
            type: 'cellIs',
            priority: 3,
            operator: 'equal',
            formulae: ['0'],
            style: {
              fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FF92D050' } },
            },
          }
        ],
      });
    }

    if (dist.length > 1) {
      ws.mergeCells(classStartRowInRekap, COL_KELAS, classEndRowInRekap, COL_KELAS);
    }
  }
}

export function addRekapBroadcastEngine(
  workbook: any,
  options: PresensiGeneratorOptions
) {
  const ws = workbook.addWorksheet('REKAP');
  ws.properties.tabColor = { argb: 'FFED7D31' };

  const optionalCols: { name: string; on: boolean; id: string }[] = [
    { name: 'TP', on: options.opsi.tp.enabled, id: 'TP' },
    { name: 'Jurnal', on: options.opsi.jurnal.enabled, id: 'JURNAL' },
    { name: 'Tes Akhir', on: options.opsi.tesAkhir.enabled, id: 'TES AKHIR' },
    { name: 'Rate', on: options.opsi.rate, id: 'RATE' },
  ];

  const numOption = optionalCols.filter((col) => col.on).length;
  const totalColsThisModule = 4 + numOption; 

  let currentOffset = 8;
  const columnsControlPanel = [
    { name: 'Kehadiran', hide: false, coord: 'F4', id: 'KEHADIRAN' },
  ];

  for (const col of optionalCols) {
    if (col.on) {
      columnsControlPanel.push({
        name: col.name,
        hide: false,
        coord: `${colNumToLetter(currentOffset)}4`,
        id: col.id,
      });
      currentOffset++;
    } else {
      columnsControlPanel.push({
        name: col.name,
        hide: true,
        coord: '',
        id: col.id,
      });
    }
  }

  const tbl1HeaderStyle: any = {
    font: { bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8EA9DB' } },
    alignment: { vertical: 'middle', horizontal: 'left' },
    border: PRESENSI_STYLES.BORDERS,
  };
  const hideColStyle: any = {
    font: { bold: false },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }, 
    alignment: { vertical: 'middle', horizontal: 'left' },
    border: PRESENSI_STYLES.BORDERS,
  };
  const valColStyle: any = {
    border: PRESENSI_STYLES.BORDERS,
    alignment: { vertical: 'middle', horizontal: 'left' },
  };

  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 7; 
  ws.getColumn(4).width = 3; 
  ws.getColumn(5).width = 14; 
  ws.getColumn(6).width = 7; 
  ws.getColumn(7).width = 16; 

  const b2 = ws.getCell('B2'); b2.value = 'Kelas'; b2.style = tbl1HeaderStyle;
  const c2 = ws.getCell('C2'); c2.value = 'Hide'; c2.style = tbl1HeaderStyle;

  options.kelasNames.forEach((kelas: string, idx: number) => {
    const row = idx + 3;
    const b = ws.getCell(`B${row}`); b.value = kelas; b.style = valColStyle;
    const c = ws.getCell(`C${row}`); c.value = false; c.style = hideColStyle;
  });

  const e2 = ws.getCell('E2'); e2.value = 'Column'; e2.style = tbl1HeaderStyle;
  const f2 = ws.getCell('F2'); f2.value = 'Hide'; f2.style = tbl1HeaderStyle;
  const g2 = ws.getCell('G2'); g2.value = 'Start Coordinate'; g2.style = tbl1HeaderStyle;

  columnsControlPanel.forEach((colData, idx) => {
    const row = idx + 3;
    const e = ws.getCell(`E${row}`); e.value = colData.name; e.style = valColStyle;
    const f = ws.getCell(`F${row}`); f.value = colData.hide; f.style = hideColStyle;
    const g = ws.getCell(`G${row}`); g.value = colData.coord; g.style = valColStyle;
  });

  ws.getCell('E11').value = 'Modul ke-'; ws.getCell('E11').style = tbl1HeaderStyle;
  ws.mergeCells('E11:F11');
  const rawStartDate = options.kelasSettings[0]?.tanggalMulai || new Date();
  const startDate = typeof rawStartDate === 'string' ? new Date(rawStartDate) : rawStartDate;
  const year = startDate.getFullYear();
  const month = startDate.getMonth() + 1;
  const day = startDate.getDate();

  ws.getCell('E12').value = {
    formula: `INT((TODAY()-DATE(${year},${month},${day}))/7)+1`,
    result: 1
  };
  ws.getCell('E12').font = { bold: true, size: 20 };
  ws.getCell('E12').alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getCell('E12').border = PRESENSI_STYLES.BORDERS;
  ws.mergeCells('E12:F13');

  ws.getCell('E15').value = 'Kolom per Modul'; ws.getCell('E15').style = tbl1HeaderStyle;
  ws.mergeCells('E15:F15');
  ws.getCell('E16').value = totalColsThisModule;
  ws.getCell('E16').font = { bold: true, size: 20 };
  ws.getCell('E16').alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getCell('E16').border = PRESENSI_STYLES.BORDERS;
  ws.mergeCells('E16:F17');

  ws.getCell('E21').value = 'Sabtu'; ws.getCell('E21').style = tbl1HeaderStyle;
  const f21 = ws.getCell('F21'); f21.value = true; f21.border = PRESENSI_STYLES.BORDERS;
  f21.dataValidation = { type: 'list', allowBlank: true, formulae: ['"TRUE,FALSE"'] };

  ws.getColumn(22).width = 4;
  ws.getColumn(23).width = 120;
  const w2 = ws.getCell('W2');
  w2.value = 'COPY ME!';
  w2.font = { bold: true };
  w2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4B084' } };
  w2.border = PRESENSI_STYLES.BORDERS;
  w2.alignment = { horizontal: 'center', vertical: 'middle' };

  const w3 = ws.getCell('W3');
  w3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
  w3.font = { color: { argb: 'FFFFFFFF' } }; 
  w3.alignment = { wrapText: true, vertical: 'top' };

  let currentRow = 37;

  const engineHeaders = ['Nama Asprak', 'Kode', 'Kelas', 'RowsInGroup', 'GroupStartRow', 'HelperKelas', 'JmlAsprak'];
  engineHeaders.forEach((h, i) => {
    ws.getCell(`${colNumToLetter(9 + i)}${currentRow - 1}`).value = h;
  });

  let pIdx = 16; 
  const engineColIds: string[] = [];
  columnsControlPanel.forEach(c => {
    if (!c.hide) {
      ws.getCell(`${colNumToLetter(pIdx)}${currentRow - 1}`).value = c.id;
      engineColIds.push(c.id);
      pIdx++;
    }
  });

  const yangBelumColLetter = colNumToLetter(pIdx);
  ws.getCell(`${yangBelumColLetter}${currentRow - 1}`).value = 'YANG_BELUM';
  const concatWAColLetter = colNumToLetter(pIdx + 1);
  ws.getCell(`${concatWAColLetter}${currentRow - 1}`).value = 'CONCAT_WA';
  const finalClassColLetter = colNumToLetter(pIdx + 2);
  ws.getCell(`${finalClassColLetter}${currentRow - 1}`).value = 'FINAL_CLASS_WA';

  const finalClassRefs: string[] = [];

  options.kelasNames.forEach((kelasName: string, kelasIdx: number) => {
    const kelasSet = options.kelasSettings[kelasIdx] || options.kelasSettings[0];
    const numAsprak = kelasSet.jumlahAsprak;
    if (numAsprak <= 0) return;

    const dist = getRowDistribution(kelasSet.jumlahPraktikan, kelasSet.jumlahAsprak);
    let groupStartRow = 4;

    for (let idxInClass = 0; idxInClass < numAsprak; idxInClass++) {
      const rowsInGroup = dist[idxInClass];

      ws.getCell(`L${currentRow}`).value = rowsInGroup;
      ws.getCell(`M${currentRow}`).value = groupStartRow;
      ws.getCell(`N${currentRow}`).value = kelasName.substring(0, 31).replace(/[\\/*?:\[\]]/g, '');
      ws.getCell(`O${currentRow}`).value = numAsprak;

      const fKode = `_xlfn.LET(_xlpm.ROW_OFFSET,${groupStartRow - 4},_xlpm.COL_OFFSET,($E$12-1)*$E$16,_xlpm.KODE_BASE,TRIM(OFFSET(INDIRECT("'"&$N${currentRow}&"'!D4"),_xlpm.ROW_OFFSET,0)),_xlpm.KODE_MODUL,IF(AND($E$12>=1,$E$12<=${options.jumlahModul}),TRIM(OFFSET(INDIRECT("'"&$N${currentRow}&"'!E4"),_xlpm.ROW_OFFSET,_xlpm.COL_OFFSET)),""),_xlpm.KODE,IF(_xlpm.KODE_MODUL<>"",_xlpm.KODE_MODUL,_xlpm.KODE_BASE),IF(_xlpm.KODE="","",_xlpm.KODE))`;
      ws.getCell(`J${currentRow}`).value = { formula: fKode, result: '' };

      const fNama = `IFERROR(INDEX('LIST ASPRAK'!$B:$B,MATCH($J${currentRow},'LIST ASPRAK'!$C:$C,0)),"")`;
      ws.getCell(`I${currentRow}`).value = { formula: fNama, result: '' };
      ws.getCell(`K${currentRow}`).value = kelasName;

      let colPtr = 16;
      engineColIds.forEach((compId) => {
        const letter = colNumToLetter(colPtr);
        const coord = columnsControlPanel.find(c => c.id === compId)?.coord || 'A1';
        const formula = `_xlfn.LET(_xlpm.WIDTH,$E$16,_xlpm.COORDINATE,"${coord}",_xlpm.COL_OFFSET,($E$12-1)*_xlpm.WIDTH,_xlpm.ROW_OFFSET,${groupStartRow - 4},_xlpm.VALUE,COUNTBLANK(OFFSET(INDIRECT("'"&$N${currentRow}&"'!"&_xlpm.COORDINATE),_xlpm.ROW_OFFSET,_xlpm.COL_OFFSET,$L${currentRow},1)),IF(INDEX($F$3:$F$8,MATCH(${letter}$36,$E$3:$E$8,0)),"",IF(_xlpm.VALUE=0,"",UPPER(${letter}$36))))`;
        ws.getCell(`${letter}${currentRow}`).value = { formula, result: '' };
        colPtr++;
      });

      const tLet = yangBelumColLetter;
      const startEng = colNumToLetter(16);
      const endEng = colNumToLetter(colPtr - 1);
      ws.getCell(`${tLet}${currentRow}`).value = {
        formula: `_xlfn.LET(_xlpm.YANG_BELUM,_xlfn.TEXTJOIN(", ",TRUE,${startEng}${currentRow}:${endEng}${currentRow}),IF(_xlpm.YANG_BELUM="","",_xlfn.CONCAT("- ",$J${currentRow},": ",_xlpm.YANG_BELUM)))`,
        result: ''
      };

      const uLet = concatWAColLetter;
      if (idxInClass === 0) {
        ws.getCell(`${uLet}${currentRow}`).value = {
          formula: `_xlfn.TEXTJOIN(CHAR(10),TRUE,OFFSET(${tLet}${currentRow},0,0,$O${currentRow}))`,
          result: ''
        };
      }

      const vLet = finalClassColLetter;
      if (idxInClass === 0) {
        ws.getCell(`${vLet}${currentRow}`).value = {
          formula: `IF(${uLet}${currentRow}="","","*"&$K${currentRow}&"*"&CHAR(10)&${uLet}${currentRow}&CHAR(10))`,
          result: ''
        };
        finalClassRefs.push(`${vLet}${currentRow}`);
      }

      currentRow++;
      groupStartRow += rowsInGroup;
    }
  });

  if (finalClassRefs.length > 0) {
    w3.value = {
      formula: `_xlfn.TEXTJOIN(CHAR(10),TRUE,$${finalClassColLetter}$37:$${finalClassColLetter}$${currentRow - 1})`,
      result: ''
    };
  }

  for (let r = 36; r < currentRow; r++) {
    ws.getRow(r).hidden = true;
  }
  for (let c = 8; c <= 22; c++) {
    ws.getColumn(c).hidden = true;
  }
}

/**
 * Fungsi utama untuk men-generate file Excel presensi langsung di browser pengguna
 */
export async function generatePresensiExcelClient(options: PresensiGeneratorOptions): Promise<void> {
  if (!options || !options.jumlahModul || options.jumlahModul < 1) {
    throw new Error('Jumlah modul tidak valid.');
  }
  if (!options.kelasNames || options.kelasNames.length === 0) {
    throw new Error('Kelas names tidak boleh kosong.');
  }

  // 1. Muat ExcelJS dari CDN
  const ExcelJS = await loadExcelJSFromCDN();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Presensi Generator';
  workbook.created = new Date();

  const colors = options.theme && PRESENSI_THEMES[options.theme]
    ? PRESENSI_THEMES[options.theme].colors 
    : PRESENSI_THEMES.BLUE.colors;

  // 2. Buat sheet kelas
  const worksheets: any[] = [];
  for (const kelasName of options.kelasNames) {
    const safeName = kelasName.substring(0, 31).replace(/[\\/*?:\[\]]/g, '');
    const ws = workbook.addWorksheet(safeName);
    worksheets.push(ws);
  }

  worksheets.forEach((ws) => {
    addBase(ws, colors);
  });

  worksheets.forEach((ws, idxWs) => {
    const setting = options.kelasSettings[idxWs];
    const rawStartDate = setting?.tanggalMulai || new Date();
    const startDate = typeof rawStartDate === 'string' ? new Date(rawStartDate) : rawStartDate;
    
    for (let iModul = 0; iModul < options.jumlahModul; iModul++) {
      createModul(ws, startDate, options.opsi, iModul + 1, colors);
    }
    formatRows(
      ws,
      options.jumlahModul,
      options.opsi,
      setting?.jumlahPraktikan || 40,
      setting?.jumlahAsprak || 4,
      colors
    );
  });

  // 3. Buat sheet ASPRAK BELUM NILAI dan REKAP (opsional)
  if (options.generateRekapSheet) {
    addAsprakBelumNilaiSheet(workbook, options.asprakList || [], colors);
    addRekapSheet(workbook, options, colors);
    addRekapBroadcastEngine(workbook, options);
  }

  // 4. Export ke buffer di browser
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  // 5. Trigger download langsung di browser
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const filename = `${options.namaFile || 'presensi'}.xlsx`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();

  link.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 200);
}
