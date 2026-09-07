'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Upload, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { exportSpreadsheet } from '@/lib/spreadsheet';

import { Button } from '@/components/ui/button';
import { PraktikanRecord, PraktikanOptions } from './types';
import PraktikanFilters from './PraktikanFilters';
import PraktikanTable from './PraktikanTable';
import PraktikanAddModal from './PraktikanAddModal';
import PraktikanImportCSVModal from './PraktikanImportCSVModal';
import PraktikanEditModal from './PraktikanEditModal';
import PraktikanDeleteDialog from './PraktikanDeleteDialog';
import PraktikanBulkDeleteDialog, { BulkDeletePayload } from './PraktikanBulkDeleteDialog';
import PraktikanExportDialog, { ExportPayload } from './PraktikanExportDialog';

export default function PraktikanClientPage() {
  const [rows, setRows] = useState<PraktikanRecord[]>([]);
  const [options, setOptions] = useState<PraktikanOptions>({ kelas: [], mata_kuliah: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [kelasFilter, setKelasFilter] = useState('');
  const [mataKuliahFilter, setMataKuliahFilter] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  const [editTarget, setEditTarget] = useState<PraktikanRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PraktikanRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (kelasFilter.trim()) params.set('kelas', kelasFilter.trim());
      if (mataKuliahFilter.trim()) params.set('mata_kuliah', mataKuliahFilter.trim());

      const response = await fetch(`/api/praktikan?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Gagal mengambil data praktikan.');
      }

      setRows(result.data ?? []);
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengambil data praktikan.');
    } finally {
      setLoading(false);
    }
  }, [kelasFilter, mataKuliahFilter]);

  const fetchOptions = useCallback(async () => {
    try {
      const optionsResponse = await fetch('/api/praktikan?action=options');
      const optionsResult = await optionsResponse.json();
      const baseOptions = optionsResult.data ?? { kelas: [], mata_kuliah: [] };

      let kelas = baseOptions.kelas;

      if (mataKuliahFilter.trim()) {
        const params = new URLSearchParams({ mata_kuliah: mataKuliahFilter.trim() });
        const kelasResponse = await fetch(`/api/praktikan/kelas?${params.toString()}`);
        const kelasResult = await kelasResponse.json();
        kelas = kelasResult.data ?? [];
      }

      setOptions({
        kelas,
        mata_kuliah: baseOptions.mata_kuliah,
      });

      if (kelasFilter && !kelas.includes(kelasFilter)) setKelasFilter('');
    } catch (error) {
      console.error('Failed to fetch options', error);
    }
  }, [kelasFilter, mataKuliahFilter]);

  useEffect(() => {
    fetchRows();
    fetchOptions();
  }, [fetchOptions, fetchRows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return rows;

    return rows.filter((row) =>
      [row.nama, row.kelas, row.kode_asprak ?? '', row.mata_kuliah].some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      )
    );
  }, [searchQuery, rows]);

  const handleManualAdd = async (data: { nama: string; kelas: string; mata_kuliah: string; kode_asprak: string }) => {
    const response = await fetch('/api/praktikan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || 'Gagal menyimpan data praktikan.');
    }
    
    toast.success('Data praktikan berhasil ditambahkan.');
    setShowAddModal(false);
    fetchRows();
    fetchOptions();
  };

  const handleImportCSV = async (importRows: Omit<PraktikanRecord, 'id' | 'created_at'>[]) => {
    const isAsync = importRows.length > 30;
    const response = await fetch('/api/praktikan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: importRows, asyncJob: isAsync }),
    });
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || 'Gagal menyimpan data praktikan.');
    }

    if (result.queued) {
      toast.info('Import data praktikan sedang diproses di background job!');
      setShowImportModal(false);
      return;
    }
    
    toast.success(`${result.data?.inserted ?? importRows.length} data praktikan berhasil diimport.`);
    setShowImportModal(false);
    fetchRows();
    fetchOptions();
  };

  const handleEditSave = async (id: string | number, data: any) => {
    const response = await fetch('/api/praktikan', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, data }),
    });
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || 'Gagal memperbarui data praktikan.');
    }

    toast.success('Data praktikan berhasil diperbarui.');
    fetchRows();
    fetchOptions();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/praktikan?id=${encodeURIComponent(String(deleteTarget.id))}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Gagal menghapus data praktikan.');
      }

      toast.success('Data praktikan dihapus.');
      setDeleteTarget(null);
      fetchRows();
      fetchOptions();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus data praktikan.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async (payload: BulkDeletePayload) => {
    setIsDeleting(true);
    try {
      let url = '/api/praktikan';
      if (payload.action === 'all') {
        url += '?action=deleteAll';
      } else if (payload.action === 'kelas' && payload.kelas) {
        url += `?kelas=${encodeURIComponent(payload.kelas)}`;
      } else {
        return;
      }

      const response = await fetch(url, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Gagal menghapus data praktikan.');
      }

      const msg = payload.action === 'all' 
        ? `${result.data?.deleted ?? 0} seluruh data dihapus.`
        : `${result.data?.deleted ?? 0} data dari kelas ${payload.kelas} dihapus.`;
      
      toast.success(msg);
      setShowBulkDelete(false);
      fetchRows();
      fetchOptions();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus data kelas.');
    } finally {
      setIsDeleting(false);
    }
  };



  const handleExportExcel = async (payload: ExportPayload) => {
    setIsExporting(true);
    try {
      let dataToExport: PraktikanRecord[] = [];

      if (payload.action === 'current') {
        dataToExport = filteredRows;
      } else {
        const params = new URLSearchParams();
        if (payload.action === 'kelas' && payload.kelas) {
          params.set('kelas', payload.kelas);
        }
        
        const response = await fetch(`/api/praktikan?${params.toString()}`);
        const result = await response.json();
        
        if (!response.ok || !result.ok) {
          throw new Error(result.error || 'Gagal mengambil data untuk diekspor.');
        }
        dataToExport = result.data ?? [];
      }

      if (dataToExport.length === 0) {
        toast.error('Tidak ada data yang ditemukan untuk diekspor.');
        return;
      }

      const exportDataFormatted = dataToExport.map((row, index) => ({
        No: index + 1,
        'Nama Lengkap': row.nama,
        Kelas: row.kelas,
        'Mata Kuliah': row.mata_kuliah,
        'Kode Asprak': row.kode_asprak || '-',
      }));

      await exportSpreadsheet(
        exportDataFormatted, 
        payload.action === 'kelas' ? `data_praktikan_${payload.kelas}.xlsx` : 'data_praktikan.xlsx',
        'Data Praktikan'
      );
      
      toast.success('Data praktikan berhasil diekspor');
      setShowExportModal(false);
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengekspor data Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8" style={{ position: 'relative' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">Data Praktikan</h1>
          <p className="text-sm 2xl:text-base text-muted-foreground mt-1">Kelola daftar mahasiswa praktikan secara terpusat</p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3 items-center w-full md:w-auto">
          <Button
            variant="outline"
            onClick={() => setShowAddModal(true)}
            className="flex-1 md:flex-none min-w-0 md:whitespace-nowrap"
          >
            <Plus size={18} className="flex-shrink-0" />
            <span className="hidden sm:inline ml-1">Input Manual</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowImportModal(true)}
            className="flex-1 md:flex-none min-w-0 md:whitespace-nowrap"
          >
            <Upload size={18} className="flex-shrink-0" />
            <span className="hidden sm:inline ml-1">Import CSV</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowExportModal(true)}
            className="flex-1 md:flex-none min-w-0 md:whitespace-nowrap"
          >
            <Download size={18} className="flex-shrink-0" />
            <span className="hidden sm:inline ml-1">Export Excel</span>
          </Button>

          <Button
            variant="destructive"
            onClick={() => setShowBulkDelete(true)}
            className="flex-1 md:flex-none min-w-0 md:whitespace-nowrap bg-red-600 hover:bg-red-700 dark:bg-red-900 dark:hover:bg-red-800"
          >
            <Trash2 size={18} className="flex-shrink-0" />
            <span className="hidden sm:inline ml-1">Hapus (Bulk)</span>
          </Button>
        </div>
      </div>

      <div className="w-full">
        <div className="card glass p-6 flex flex-col gap-6 border border-border/50">
          <PraktikanFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            options={options}
            mataKuliahFilter={mataKuliahFilter}
            onMataKuliahFilterChange={setMataKuliahFilter}
            kelasFilter={kelasFilter}
            onKelasFilterChange={setKelasFilter}
          />

          <PraktikanTable
            data={filteredRows}
            loading={loading}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
          />
        </div>
      </div>

      {/* Modals */}
      <PraktikanAddModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleManualAdd}
      />

      <PraktikanImportCSVModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportCSV}
      />

      <PraktikanEditModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        praktikan={editTarget}
        onSave={handleEditSave}
      />

      <PraktikanDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        name={deleteTarget?.nama || ''}
        isDeleting={isDeleting}
      />

      <PraktikanBulkDeleteDialog
        open={showBulkDelete}
        onOpenChange={(open) => !open && setShowBulkDelete(false)}
        onConfirm={handleBulkDelete}
        options={options.kelas}
        isDeleting={isDeleting}
      />

      <PraktikanExportDialog
        open={showExportModal}
        onOpenChange={(open) => !open && setShowExportModal(false)}
        onConfirm={handleExportExcel}
        options={options.kelas}
        isExporting={isExporting}
      />
    </div>
  );
}
