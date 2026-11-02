/* eslint-disable react-doctor/no-impure-state-updater */
/* eslint-disable react-doctor/exhaustive-deps */
'use client';

import React, { useState, useEffect } from 'react';
import { Jadwal, MataKuliah } from '@/types/database';

import JadwalPenggantiTable from '@/components/jadwal/JadwalPenggantiTable';
import JadwalPenggantiFilters from '@/components/jadwal/JadwalPenggantiFilters';
import JadwalPenggantiExportDialog, { JadwalPenggantiExportPayload } from '@/components/jadwal/JadwalPenggantiExportDialog';


import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Download } from 'lucide-react';
import { toast } from 'sonner';
import * as jadwalFetcher from '@/lib/fetchers/jadwalFetcher';
import { JadwalPenggantiModal } from '@/components/jadwal/JadwalPenggantiModal';
import { useTermStore } from '@/store/useTermStore';
import { exportSpreadsheet } from '@/lib/spreadsheet';

interface JadwalPenggantiClientPageProps {
  initialTerms: string[];
  initialMataKuliah: MataKuliah[];
  initialAllJadwal: Jadwal[];
}

export default function JadwalPenggantiClientPage({
  initialTerms,
  initialMataKuliah,
  initialAllJadwal,
}: JadwalPenggantiClientPageProps) {
  const { activeTerm } = useTermStore();
  const selectedTerm = activeTerm || '';
  const [penggantiList, setPenggantiList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [mataKuliahFilter, setMataKuliahFilter] = useState('');
  const [modulFilter, setModulFilter] = useState('');
  
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fetchPengganti = React.useCallback(async () => {
    if (!selectedTerm) return;
    setLoading(true);
    const result = await jadwalFetcher.fetchJadwalPenggantiByTerm(selectedTerm);
    if (result.ok && result.data) {
      setPenggantiList(result.data);
    } else {
      toast.error('Gagal mengambil data jadwal jadwal pengganti');
    }
    setLoading(false);
  }, [selectedTerm]);

  useEffect(() => {
    fetchPengganti();
  }, [fetchPengganti]);

  const handleAdd = () => {
    setModalInitialData(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setModalInitialData(item);
    setIsModalOpen(true);
  };

  const handleDelete = (itemId: string) => {
    setDeleteId(itemId);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    const result = await jadwalFetcher.deleteJadwalPengganti(deleteId);
    if (result.ok) {
      toast.success('Jadwal pengganti berhasil dihapus');
      fetchPengganti();
    } else {
      toast.error('Gagal menghapus: ' + result.error);
    }
    setDeleteId(null);
  };

  const handleSubmit = async (input: any) => {
    setIsSubmitting(true);
    const result = await jadwalFetcher.upsertJadwalPengganti(input);
    if (result.ok) {
      toast.success('Jadwal pengganti berhasil disimpan');
      await fetchPengganti();
      setIsSubmitting(false);
      return true;
    } else {
      toast.error('Gagal menyimpan: ' + result.error);
      setIsSubmitting(false);
      return false;
    }
  };

  const filterOptions = React.useMemo(() => {
    const mkSet = new Set<string>();
    const modulSet = new Set<number>();
    penggantiList.forEach((item) => {
      const mk = item.jadwal?.mata_kuliah?.nama_lengkap;
      if (mk) mkSet.add(mk);
      if (item.modul) modulSet.add(item.modul);
    });
    return {
      mata_kuliah: Array.from(mkSet).sort(),
      modul: Array.from(modulSet).sort((a, b) => a - b),
    };
  }, [penggantiList]);

  const filteredRows = React.useMemo(() => {
    let result = penggantiList;

    if (mataKuliahFilter) {
      result = result.filter(item => item.jadwal?.mata_kuliah?.nama_lengkap === mataKuliahFilter);
    }
    
    if (modulFilter) {
      result = result.filter(item => item.modul === Number(modulFilter));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => {
        const mkName = item.jadwal?.mata_kuliah?.nama_lengkap || '';
        const kelas = item.jadwal?.kelas || '';
        const hari = item.hari || '';
        const ruangan = item.ruangan || '';
        
        return (
          mkName.toLowerCase().includes(q) ||
          kelas.toLowerCase().includes(q) ||
          hari.toLowerCase().includes(q) ||
          ruangan.toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [penggantiList, mataKuliahFilter, modulFilter, searchQuery]);

  const handleExportExcel = async (payload: JadwalPenggantiExportPayload) => {
    setIsExporting(true);
    try {
      let dataToExport: any[] = [];

      if (payload.action === 'current') {
        dataToExport = filteredRows;
      } else {
        const response = await jadwalFetcher.fetchJadwalPenggantiByTerm(selectedTerm);
        let allData = response.data || [];
        if (payload.action === 'matakuliah' && payload.mata_kuliah) {
          allData = allData.filter((item: any) => item.jadwal?.mata_kuliah?.nama_lengkap === payload.mata_kuliah);
        }
        dataToExport = allData;
      }

      if (dataToExport.length === 0) {
        toast.error('Tidak ada data yang ditemukan untuk diekspor.');
        return;
      }

      const exportDataFormatted = dataToExport.map((row, index) => ({
        No: index + 1,
        'Mata Kuliah': row.jadwal?.mata_kuliah?.nama_lengkap || '-',
        'Kelas': row.jadwal?.kelas || '-',
        'Modul': row.modul || '-',
        'Hari Pengganti': row.hari || '-',
        'Jam': row.jam || '-',
        'Ruangan': row.ruangan || '-',
      }));

      await exportSpreadsheet(
        exportDataFormatted,
        payload.action === 'matakuliah' ? `jadwal_pengganti_${payload.mata_kuliah}.xlsx` : 'jadwal_pengganti.xlsx',
        'Jadwal Pengganti'
      );
      
      toast.success('Data jadwal pengganti berhasil diekspor');
      setShowExportModal(false);
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengekspor data Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 animate-in fade-in duration-500" style={{ position: 'relative' }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">Jadwal Pengganti</h1>
          <p className="text-sm 2xl:text-base text-muted-foreground mt-1">
            Kelola semua jadwal pengganti praktikum
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={() => setShowExportModal(true)}
            className="flex-1 md:flex-none min-w-0 md:whitespace-nowrap"
          >
            <Download size={18} className="flex-shrink-0" />
            <span className="hidden sm:inline ml-1">Export Excel</span>
          </Button>
          <Button onClick={handleAdd} className="flex-1 sm:flex-none min-w-0 md:whitespace-nowrap">
            <Plus size={18} className="flex-shrink-0" />
            <span className="hidden sm:inline ml-2">Tambah Pengganti</span>
          </Button>
        </div>
      </div>

      <div className="w-full">
        <div className="card glass p-6 flex flex-col gap-6 border border-border/50">
          <JadwalPenggantiFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            options={filterOptions}
            mataKuliahFilter={mataKuliahFilter}
            onMataKuliahFilterChange={setMataKuliahFilter}
            modulFilter={modulFilter}
            onModulFilterChange={setModulFilter}
          />
          <JadwalPenggantiTable
            data={filteredRows}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <JadwalPenggantiModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={modalInitialData}
        mataKuliahList={initialMataKuliah}
        allJadwal={initialAllJadwal}
        isLoading={isSubmitting}
        currentTerm={selectedTerm}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Jadwal Pengganti?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Jadwal pengganti ini akan dihapus secara permanen
              dari sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} variant="destructive">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <JadwalPenggantiExportDialog
        open={showExportModal}
        onOpenChange={(open) => !open && setShowExportModal(false)}
        onConfirm={handleExportExcel}
        options={filterOptions.mata_kuliah}
        isExporting={isExporting}
      />
    </div>
  );
}
