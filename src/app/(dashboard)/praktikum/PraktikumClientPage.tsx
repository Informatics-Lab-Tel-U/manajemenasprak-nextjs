/* eslint-disable react-doctor/no-impure-state-updater */
/* eslint-disable react-doctor/exhaustive-deps */
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { usePraktikum } from '@/hooks/usePraktikum';
import { useTermStore } from '@/store/useTermStore';
import { Button } from '@/components/ui/button';
import AsprakFilters from '@/components/asprak/AsprakFilters';
import PraktikumList from '@/components/praktikum/PraktikumList';
import PraktikumImportModal from '@/components/praktikum/PraktikumImportModal';
import PraktikumManualModal from '@/components/praktikum/PraktikumManualModal';
import PraktikumDetailsModal from '@/components/praktikum/PraktikumDetailsModal';
import { PraktikumWithStats } from '@/services/praktikumService';

interface PraktikumClientPageProps {
  initialPraktikumList: PraktikumWithStats[];
  initialTerms: string[];
}

export default function PraktikumClientPage({
  initialPraktikumList,
  initialTerms,
}: PraktikumClientPageProps) {
  const { activeTerm } = useTermStore();
  const selectedTerm = activeTerm || '';

  const { getPraktikumByTerm, bulkImport, getOrCreate } = usePraktikum();

  const [praktikumList, setPraktikumList] = useState<PraktikumWithStats[]>(initialPraktikumList);
  const [loadingList, setLoadingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [selectedPraktikum, setSelectedPraktikum] = useState<PraktikumWithStats | null>(null);

  const isInitialMount = useRef(true);

  useEffect(() => {
    async function fetchPraktikums() {
      if (isInitialMount.current) {
        isInitialMount.current = false;
        if (selectedTerm === initialTerms[0]) {
          return;
        }
      }

      if (!selectedTerm) return;

      setLoadingList(true);
      try {
        const data = await getPraktikumByTerm(selectedTerm);
        setPraktikumList(data);
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoadingList(false);
      }
    }
    fetchPraktikums();
  }, [selectedTerm, getPraktikumByTerm, initialTerms]);

  const filteredList = useMemo(() => {
    if (!searchQuery) return praktikumList;
    const lowerQ = searchQuery.toLowerCase();
    return praktikumList.filter((p) => p.nama.toLowerCase().includes(lowerQ));
  }, [praktikumList, searchQuery]);

  const handleImport = async (rows: { nama: string; tahun_ajaran: string }[]) => {
    const result = await bulkImport(rows);
    if (result.ok && result.data) {
      const { inserted, skipped, errors } = result.data;
      toast.success(`Import selesai! Berhasil: ${inserted}, Dilewati: ${skipped}`);
      if (errors.length > 0) {
        toast.error(`Terjadi kesalahan: ${errors.length} galat. Cek konsol.`);
        console.error(errors);
      }
      setShowImportModal(false);
      refreshList();
    } else {
      toast.error(`Import gagal: ${result.error}`);
    }
  };

  const handleManualAdd = async (nama: string, tahunAjaran: string) => {
    try {
      const result = await getOrCreate(nama, tahunAjaran);
      if (result) {
        toast.success(`Berhasil menambahkan praktikum ${nama}`);
        setShowManualModal(false);
        refreshList();
      } else {
        toast.error('Gagal menambahkan praktikum.');
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    }
  };

  const refreshList = async () => {
    if (selectedTerm) {
      const data = await getPraktikumByTerm(selectedTerm);
      setPraktikumList(data);
    }
  };

  const checkExists = async (nama: string, tahunAjaran: string) => {
    const data = await getPraktikumByTerm(tahunAjaran);
    return data.some((p) => p.nama.toUpperCase().trim() === nama.toUpperCase().trim());
  };

  const isLoading = loadingList;

  return (
    <div className="container mx-auto max-w-[2000px] relative space-y-8 2xl:px-8">
      <header className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">Data Praktikum</h1>
            <p className="text-sm 2xl:text-base text-muted-foreground mt-1">
              Kelola data praktikum dan penugasan per angkatan
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-3 items-center w-full md:w-auto">
            <Button
              onClick={() => setShowManualModal(true)}
              variant="outline"
              className="flex-1 md:flex-none min-w-0 md:whitespace-nowrap"
            >
              <Plus size={18} className="flex-shrink-0" />
              <span className="hidden sm:inline ml-2">Input Manual</span>
            </Button>
            <Button
              onClick={() => setShowImportModal(true)}
              className="flex-1 md:flex-none min-w-0 md:whitespace-nowrap"
            >
              <Upload size={18} className="flex-shrink-0" />
              <span className="hidden sm:inline ml-2">Import CSV</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mb-8">
        <AsprakFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          hideSearch={true}
        />

        <div className="mt-6">
          <PraktikumList
            praktikums={filteredList}
            loading={isLoading}
            onSelect={(p) => setSelectedPraktikum(p)}
          />
        </div>
      </div>

      {showImportModal && (
        <PraktikumImportModal
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
          existingPraktikums={praktikumList}
        />
      )}

      {showManualModal && (
        <PraktikumManualModal
          open={showManualModal}
          onClose={() => setShowManualModal(false)}
          onConfirm={handleManualAdd}
          onCheckExists={checkExists}
        />
      )}

      {selectedPraktikum && (
        <PraktikumDetailsModal
          praktikum={selectedPraktikum}
          open={!!selectedPraktikum}
          onClose={() => setSelectedPraktikum(null)}
        />
      )}
    </div>
  );
}
