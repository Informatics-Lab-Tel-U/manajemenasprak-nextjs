/**
 * AsprakCSVPreview — Preview table for parsed CSV data
 *
 * Shows a table of parsed asprak rows before saving to database.
 * Highlights auto-generated codes and any validation issues.
 *
 * @module components/asprak/AsprakCSVPreview
 */

import { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Save,
  Copy,
  FileCheck,
  CopyX,
  Pencil,
  Download,
} from 'lucide-react';
import { exportSpreadsheet } from '@/lib/spreadsheet';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { NavButton } from '@/components/ui/nav-button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface PreviewRow {
  nama_lengkap: string;
  nim: string;
  kode: string;
  role: 'ASPRAK' | 'ASLAB';
  angkatan: number;
  codeRule: string;
  codeSource: 'csv' | 'generated';
  status: 'ok' | 'warning' | 'error' | 'duplicate-csv';
  statusMessage?: string;
  originalKode: string;
  originalCodeRule: string;
  originalCodeSource: 'csv' | 'generated';
  selected: boolean;
}

interface AsprakCSVPreviewProps {
  rows: PreviewRow[];
  term: string;
  onConfirm: () => void;
  onBack: () => void;
  onCodeEdit: (rowIndex: number, newCode: string) => void;
  onRoleEdit?: (rowIndex: number, newRole: 'ASPRAK' | 'ASLAB') => void;
  onToggleSelect: (rowIndex: number) => void;
  onToggleAll: (checked: boolean) => void;
  loading: boolean;
  onSkip?: () => void;
  forceOverride?: boolean;
  onForceOverrideChange?: (val: boolean) => void;
  hideButtons?: boolean;
}

export default function AsprakCSVPreview({
  rows,
  term,
  onConfirm,
  onBack,
  onCodeEdit,
  onRoleEdit,
  onToggleSelect,
  onToggleAll,
  loading,
  onSkip,
  forceOverride = false,
  onForceOverrideChange,
  hideButtons = false,
}: AsprakCSVPreviewProps) {
  const totalOk = rows.filter((r) => r.status === 'ok').length;
  const totalWarning = rows.filter((r) => r.status === 'warning').length;
  const totalError = rows.filter((r) => r.status === 'error').length;
  const totalDuplicateDB = rows.filter(
    (r) => r.status === 'error' && r.statusMessage?.includes('Duplikat')
  ).length;
  const totalDuplicateCSV = rows.filter((r) => r.status === 'duplicate-csv').length;
  const totalOtherErrors = totalError - totalDuplicateDB;
  const totalGenerated = rows.filter(
    (r) => r.codeSource === 'generated' && r.status === 'ok'
  ).length;
  const totalManualEdit = rows.filter(
    (r) => r.codeRule === 'Manual edit' && (r.status === 'ok' || r.status === 'warning')
  ).length;
  const totalFromCSV = rows.filter(
    (r) => r.codeSource === 'csv' && r.codeRule !== 'Manual edit' && r.status === 'ok'
  ).length;

  const selectableRows = rows.filter((r) => r.status === 'ok');
  const selectedCount = selectableRows.filter((r) => r.selected).length;
  const allSelected = selectableRows.length > 0 && selectedCount === selectableRows.length;
  const isIndeterminate = selectedCount > 0 && selectedCount < selectableRows.length;

  const [downloading, setDownloading] = useState(false);

  const handleDownloadPreview = async () => {
    if (rows.length === 0) return;
    setDownloading(true);
    try {
      const exportRows = rows.map((r) => {
        const isDuplicateDB = r.status === 'error' && r.statusMessage?.includes('Duplikat');
        const isDuplicateCSV = r.status === 'duplicate-csv';
        let statusText = 'OK (Baru)';
        if (r.status === 'warning') {
          statusText = 'Data Sudah Ada di DB (Pakai Kode Lama)';
        } else if (isDuplicateCSV) {
          statusText = 'Duplikat di File CSV (Akan Dilewati)';
        } else if (isDuplicateDB) {
          statusText = 'Duplikat di Database';
        } else if (r.status === 'error') {
          statusText = `Error (${r.statusMessage || 'Tidak Valid'})`;
        }

        return {
          'NIM': r.nim,
          'Nama Lengkap': r.nama_lengkap,
          'Kode Asprak': r.kode || '—',
          'Role': r.role,
          'Angkatan': r.angkatan,
          'Aturan Kode': r.codeRule || '-',
          'Status Preview': statusText,
        };
      });

      const cleanTerm = term ? `_${term}` : '';
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const filename = `Preview_Kode_Asprak${cleanTerm}_${dateStr}.xlsx`;

      await exportSpreadsheet(exportRows, filename, 'Preview Asprak', 'xlsx');
      toast.success('File preview berhasil diunduh!');
    } catch (err: any) {
      toast.error(`Gagal mengunduh file preview: ${err.message || err}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex flex-wrap gap-3 items-center">
        <Badge variant="outline" className="text-sm px-3 py-1">
          Term: <span className="font-bold ml-1">{term}</span>
        </Badge>
        <Badge variant="outline" className="text-sm px-3 py-1">
          Total: <span className="font-bold ml-1">{rows.length}</span>
        </Badge>
        <Badge
          variant={selectedCount > 0 ? 'default' : 'outline'}
          className="text-sm px-3 py-1 transition-colors"
        >
          Dipilih: <span className="font-bold ml-1">{selectedCount}</span>
        </Badge>
        {totalOk > 0 && (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-sm px-3 py-1">
            <CheckCircle size={14} className="mr-1" />
            {totalOk} OK
          </Badge>
        )}
        {totalDuplicateDB > 0 && (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/30 text-sm px-3 py-1">
            <Copy size={14} className="mr-1" />
            {totalDuplicateDB} Duplikat DB
          </Badge>
        )}
        {totalDuplicateCSV > 0 && (
          <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/30 text-sm px-3 py-1">
            <CopyX size={14} className="mr-1" />
            {totalDuplicateCSV} Duplikat CSV
          </Badge>
        )}
        {totalOtherErrors > 0 && (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/30 text-sm px-3 py-1">
            <AlertTriangle size={14} className="mr-1" />
            {totalOtherErrors} Error
          </Badge>
        )}
        {totalWarning > 0 && (
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-sm px-3 py-1">
            <AlertTriangle size={14} className="mr-1" />
            {totalWarning} Warning
          </Badge>
        )}
        {totalFromCSV > 0 && (
          <Badge className="bg-sky-500/10 text-sky-500 border-sky-500/30 text-sm px-3 py-1">
            <FileCheck size={14} className="mr-1" />
            {totalFromCSV} Kode dari CSV
          </Badge>
        )}
        {totalGenerated > 0 && (
          <Badge className="bg-violet-500/10 text-violet-500 border-violet-500/30 text-sm px-3 py-1">
            <Sparkles size={14} className="mr-1" />
            {totalGenerated} Auto-generated
          </Badge>
        )}
        {totalManualEdit > 0 && (
          <Badge className="bg-cyan-500/10 text-cyan-500 border-cyan-500/30 text-sm px-3 py-1">
            <Pencil size={14} className="mr-1" />
            {totalManualEdit} Manual edit
          </Badge>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDownloadPreview}
          disabled={loading || downloading || rows.length === 0}
          className="h-8 text-xs px-2.5 gap-1.5 ml-auto bg-background hover:bg-muted/60"
          title="Download seluruh data preview beserta kode yang ter-generate (termasuk yang duplikat)"
        >
          <Download size={13} className="text-primary" />
          <span>{downloading ? 'Mengunduh...' : 'Download XLSX'}</span>
        </Button>
      </div>

      {onForceOverrideChange !== undefined && (
        <div className="flex items-center space-x-2 bg-muted/30 p-3 rounded-md border border-border/50">
          <Switch
            id="force-override"
            checked={forceOverride}
            onCheckedChange={onForceOverrideChange}
            disabled={loading}
          />
          <Label htmlFor="force-override" className="text-sm font-medium leading-tight">
            Paksa gunakan Kode dari CSV
            <p className="text-xs text-muted-foreground font-normal mt-0.5">
              Jika diaktifkan, kode yang ada di CSV tidak akan diubah/di-generate ulang, mengabaikan
              aturan bentrok 5 tahun di database. (Bentrok dalam satu file CSV tetap akan
              diperingatkan).
            </p>
          </Label>
        </div>
      )}

      {/* Preview Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5 text-center border-b border-border w-[40px]">
                  <Checkbox
                    checked={allSelected ? true : isIndeterminate ? 'indeterminate' : false}
                    onCheckedChange={(checked) => onToggleAll(!!checked)}
                    disabled={selectableRows.length === 0}
                  />
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border w-10">
                  #
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                  Nama Lengkap
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                  NIM
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                  Kode
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                  Angkatan
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                  Role
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                  Rule
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const isDuplicateDB =
                  row.status === 'error' && row.statusMessage?.includes('Duplikat');
                const isDuplicateCSV = row.status === 'duplicate-csv';
                const isDuplicate = isDuplicateDB || isDuplicateCSV;
                const isDisabled =
                  row.status === 'error' ||
                  row.status === 'duplicate-csv' ||
                  row.status === 'warning';

                return (
                  <tr
                    key={`${row.nim}_${row.role}_${idx}`}
                    className={`
                    border-b border-border/50 transition-colors
                    ${isDuplicateDB ? 'bg-red-500/10' : ''}
                    ${isDuplicateCSV ? 'bg-orange-500/10' : ''}
                    ${row.status === 'error' && !isDuplicate ? 'bg-red-500/5' : ''}
                    ${row.status === 'warning' ? 'bg-amber-500/10 opacity-75' : ''}
                    ${!isDisabled && row.selected ? 'bg-muted/40' : ''}
                    hover:bg-muted/60
                  `}
                  >
                    <td className="px-3 py-2 text-center">
                      <Checkbox
                        checked={row.selected && !isDisabled}
                        onCheckedChange={() => onToggleSelect(idx)}
                        disabled={isDisabled}
                        className={isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                      />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{idx + 1}</td>
                    <td
                      className={`px-3 py-2 font-medium ${isDuplicate ? 'line-through opacity-50' : ''}`}
                    >
                      {row.nama_lengkap}
                    </td>
                    <td
                      className={`px-3 py-2 font-mono text-xs ${isDuplicate ? 'line-through opacity-50' : ''}`}
                    >
                      {row.nim}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isDuplicate ? (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-md opacity-40 bg-muted/30 text-muted-foreground">
                          {row.kode || '—'}
                        </span>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="text"
                            value={row.kode}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 3);
                              onCodeEdit(idx, val);
                            }}
                            maxLength={3}
                            className={`
                            w-[52px] text-center font-mono font-bold text-xs px-1.5 py-0.5 rounded-md
                            border outline-none transition-all
                            focus:ring-2 focus:ring-primary/40
                            ${
                              !row.kode
                                ? 'border-amber-500/50 bg-amber-500/5 text-amber-400 placeholder:text-amber-400/50'
                                : row.codeSource === 'generated'
                                  ? 'border-violet-500/30 bg-violet-500/10 text-violet-400'
                                  : 'border-sky-500/30 bg-sky-500/10 text-sky-400'
                            }
                          `}
                            placeholder="???"
                            title={row.codeRule}
                          />
                          {row.codeSource === 'generated' && row.kode && (
                            <Sparkles size={11} className="text-violet-400" />
                          )}
                          {row.codeSource === 'csv' &&
                            row.kode &&
                            row.codeRule !== 'Manual edit' && (
                              <FileCheck size={11} className="text-sky-400" />
                            )}
                          {row.codeRule === 'Manual edit' && (
                            <Pencil size={11} className="text-sky-400" />
                          )}
                        </div>
                      )}
                    </td>
                    <td
                      className={`px-3 py-2 text-center font-mono text-xs ${isDuplicate ? 'opacity-50' : ''}`}
                    >
                      {row.angkatan}
                    </td>
                    <td
                      className={`px-3 py-2 text-center font-mono text-xs ${isDuplicate ? 'opacity-50' : ''}`}
                    >
                      {onRoleEdit ? (
                        <Select
                          value={row.role}
                          onValueChange={(value) => onRoleEdit(idx, value as 'ASPRAK' | 'ASLAB')}
                        >
                          <SelectTrigger className="h-[24px] w-[80px] text-xs leading-none font-mono mx-auto bg-background/50 px-1.5 py-0 [&_svg]:size-3 gap-1 min-h-0">
                            <SelectValue placeholder="Role" />
                          </SelectTrigger>
                          <SelectContent className="min-w-[72px]">
                            <SelectItem value="ASPRAK" className="text-xs font-mono py-1 px-2">ASPRAK</SelectItem>
                            <SelectItem value="ASLAB" className="text-xs font-mono py-1 px-2">ASLAB</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        row.role
                      )}
                    </td>
                    <td
                      className="px-3 py-2 text-xs text-muted-foreground font-mono truncate max-w-[150px]"
                      title={row.codeRule}
                    >
                      {row.codeRule || '-'}
                    </td>
                    <td className="px-3 py-2">
                      {row.status === 'ok' && (
                        <span className="inline-flex items-center gap-1 text-emerald-500 text-xs">
                          <CheckCircle size={14} /> OK
                        </span>
                      )}
                      {row.status === 'warning' && (
                        <span
                          className="inline-flex items-center gap-1 text-amber-500 text-xs"
                          title={row.statusMessage}
                        >
                          <AlertTriangle size={14} /> {row.statusMessage || 'Warning'}
                        </span>
                      )}
                      {row.status === 'error' && isDuplicateDB && (
                        <span className="inline-flex items-center gap-1 text-red-400 text-xs font-medium">
                          <Copy size={14} /> Duplikat DB
                        </span>
                      )}
                      {isDuplicateCSV && (
                        <span className="inline-flex items-center gap-1 text-orange-400 text-xs font-medium">
                          <CopyX size={14} /> Duplikat dalam CSV
                        </span>
                      )}
                      {row.status === 'error' && !isDuplicate && (
                        <span
                          className="inline-flex items-center gap-1 text-red-500 text-xs"
                          title={row.statusMessage}
                        >
                          <AlertTriangle size={14} /> {row.statusMessage || 'Error'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      {!hideButtons && (
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-2">
          <NavButton direction="prev" type="button" onClick={onBack} disabled={loading || downloading} />

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {totalError + totalDuplicateCSV > 0 && (
              <p className="text-xs text-amber-500">
                {totalError + totalDuplicateCSV} row(s) bermasalah akan di-skip saat import.
              </p>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadPreview}
              disabled={loading || downloading || rows.length === 0}
              className="gap-1.5 bg-background hover:bg-muted/60"
            >
              <Download size={15} className="text-primary" />
              <span>{downloading ? 'Mengunduh...' : `Download XLSX (${rows.length})`}</span>
            </Button>

            {onSkip && (
              <Button type="button" variant="secondary" onClick={onSkip} disabled={loading || downloading}>
                Lewati Langkah Ini
              </Button>
            )}
            <NavButton 
              direction="next" 
              onClick={onConfirm} 
              disabled={loading || downloading || selectedCount === 0}
              loading={loading}
              loadingText="Menyimpan..."
              icon={<Save size={16} className="ml-2" />}
            >
              {`Simpan ${selectedCount} Data Terpilih`}
            </NavButton>
          </div>
        </div>
      )}
    </div>
  );
}
