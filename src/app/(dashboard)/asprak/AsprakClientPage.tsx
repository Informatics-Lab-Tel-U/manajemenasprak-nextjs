"use client";

/* eslint-disable react-doctor/no-impure-state-updater */
/* eslint-disable react-doctor/no-chain-state-updates, react-doctor/no-cascading-set-state, react-doctor/no-effect-chain, react-doctor/rendering-hydration-no-flicker */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, Plus, Upload, ChevronDown, Users, GitFork } from 'lucide-react';
import { toast } from 'sonner';
import { Asprak } from '@/types/database';
import { useAsprak } from '@/hooks/useAsprak';
import { usePraktikum } from '@/hooks/usePraktikum';
import {
  fetchExistingCodes,
  fetchAllAsprak,
  AsprakAssignment,
  bulkImportAspraks,
  updateAssignments,
  UpsertAsprakInput,
} from '@/lib/fetchers/asprakFetcher';
import { ExistingAsprakInfo } from '@/components/asprak/AsprakImportCSVModal';
import { PreviewRow } from '@/components/asprak/AsprakCSVPreview';
import { exportSpreadsheet } from '@/lib/spreadsheet';
import { ExistingNimInfo } from '@/utils/validation/asprakValidation';
import AsprakFilters from '@/components/asprak/AsprakFilters';
import AsprakTable from '@/components/asprak/AsprakTable';
import AsprakAddModal from '@/components/asprak/AsprakAddModal';
import AsprakImportCSVModal from '@/components/asprak/AsprakImportCSVModal';
import AsprakExportModal from '@/components/asprak/AsprakExportModal';
import AsprakDetailsModal from '@/components/asprak/AsprakDetailsModal';
import AsprakEditModal from '@/components/asprak/AsprakEditModal';
import PlottingImportModal from '@/components/plotting/PlottingImportModal';
import PlottingManualModal from '@/components/plotting/PlottingManualModal';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import AsprakGenerationRules from '@/components/asprak/AsprakGenerationRules';
import AsprakDeleteDialog from '@/components/asprak/AsprakDeleteDialog';
import { HIDE_ASLAB_YEAR } from '@/constants';

interface AsprakWithAssignments extends Asprak {
  assignments?: AsprakAssignment[];
}

interface AsprakClientPageProps {
  initialAsprakList: Asprak[];
  initialTerms: string[];
  initialExistingCodes: string[];
  initialExistingNims: ExistingNimInfo[];
  initialExistingAspraks: ExistingAsprakInfo[];
}

export default function AsprakClientPage({
  initialAsprakList,
  initialTerms,
  initialExistingCodes,
  initialExistingNims,
  initialExistingAspraks,
}: AsprakClientPageProps) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'data');

  // Sync tab state if URL changes externally (e.g., browser back button)
  // eslint-disable-next-line react-doctor/no-chain-state-updates
  useEffect(() => {
    const tab = searchParams.get('tab') || 'data';
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  const {
    data: asprakList,
    loading,
    refetch: fetchAsprak,
    upsert,
    deleteAsprak,
    getAssignments,
  } = useAsprak(initialTerms[0], true, {
    asprakList: initialAsprakList,
    terms: initialTerms,
  });

  const {} = usePraktikum(); // Still useful for other methods, but maybe we can hydrate it too?
  // For now let's keep it simple and just use the initial ones for listing if needed.

  const [existingCodes, setExistingCodes] = useState<string[]>(initialExistingCodes);
  const [allExistingNims, setAllExistingNims] = useState<ExistingNimInfo[]>(initialExistingNims);
  const [allExistingAspraks, setAllExistingAspraks] =
    useState<ExistingAsprakInfo[]>(initialExistingAspraks);

  // View mode: 'term' = ikuti term aktif global, 'all' = tampilkan semua term
  const [viewMode, setViewMode] = useState<'term' | 'all'>('term');
  const [allAsprakData, setAllAsprakData] = useState<Asprak[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  const fetchAllData = useCallback(async () => {
    setLoadingAll(true);
    const result = await fetchAllAsprak();
    if (result.ok && result.data) {
      setAllAsprakData(result.data);
    }
    setLoadingAll(false);
  }, []);

  useEffect(() => {
    if (viewMode === 'all') {
      fetchAllData();
    }
  }, [viewMode, fetchAllData]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsprak, setSelectedAsprak] = useState<AsprakWithAssignments | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPlottingImportModal, setShowPlottingImportModal] = useState(false);
  const [showManualPlottingModal, setShowManualPlottingModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<{ asprak: Asprak; assignments: string[] } | null>(
    null
  );

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<Asprak | null>(null);

  // Fetch existing codes + all NIMs for conflict detection and code generation
  const refreshCodesAndNims = async () => {
    const [codesResult, allAsprakResult] = await Promise.all([
      fetchExistingCodes(),
      fetchAllAsprak(), // No term filter — gets ALL aspraks
    ]);
    if (codesResult.ok && codesResult.data) {
      setExistingCodes(codesResult.data);
    }
    if (allAsprakResult.ok && allAsprakResult.data) {
      setAllExistingNims(allAsprakResult.data.map((a) => ({ nim: a.nim, role: a.role, kode: a.kode, nama_lengkap: a.nama_lengkap })));
      setAllExistingAspraks(
        allAsprakResult.data.map((a) => ({ nim: a.nim, kode: a.kode, angkatan: a.angkatan ?? 0 }))
      );
    }
  };

  useEffect(() => {
    refreshCodesAndNims();
  }, []);


  const handleFormSubmit = async (data: UpsertAsprakInput) => {
    const result = await upsert(data);

    if (!result.ok) {
      throw new Error(result.error);
    }
    toast.success('Data berhasil disimpan!');
    setShowAddModal(false);
    fetchAsprak();
    refreshCodesAndNims();
  };

  const handleCSVImport = async (
    rows: {
      nim: string;
      nama_lengkap: string;
      kode: string;
      role: 'ASPRAK' | 'ASLAB';
      angkatan: number;
      nimS2?: boolean;
    }[],
    term: string,
    allPreviewRows?: PreviewRow[]
  ) => {
    const result = await bulkImportAspraks(rows);

    if (!result.ok) {
      throw new Error(result.error || 'Gagal import data.');
    }

    const data = result.data!;

    // Jika Inngest berhasil meng-queue job, tampilkan info khusus dan skip export
    if (data.queued) {
      toast.info('Import dijadwalkan!', {
        description: (
          <div className="mt-2 text-xs">
            <p>{data.message || 'Import sedang diproses di background oleh Inngest.'}</p>
            <p className="mt-1 text-muted-foreground">Halaman akan direfresh otomatis setelah selesai.</p>
          </div>
        ),
        duration: 5000,
      });
      setShowImportModal(false);
      return;
    }

    // Auto-download hasil import berupa spreadsheet XLSX (lengkap dengan kode asprak & status duplikat)
    if (allPreviewRows && allPreviewRows.length > 0) {
      try {
        const exportRows = allPreviewRows.map((r) => ({
          'NIM': r.nim,
          'Nama Lengkap': r.nama_lengkap,
          'Kode Asprak': r.kode,
          'Role': r.role,
          'Angkatan': r.angkatan,
          'Aturan Kode': r.codeRule || '-',
          'Status Import':
            r.status === 'ok'
              ? 'Berhasil (Baru)'
              : r.status === 'warning'
              ? 'Berhasil (Update DB / Kode Existing)'
              : r.status === 'duplicate-csv'
              ? 'Duplikat di File (Dilewati)'
              : `Gagal (${r.statusMessage || 'Error'})`,
        }));

        const cleanTerm = term ? `_${term}` : '';
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        const exportFilename = `Hasil_Import_Asprak${cleanTerm}_${dateStr}.xlsx`;

        exportSpreadsheet(exportRows, exportFilename, 'Hasil Import Asprak', 'xlsx').catch((err) => {
          console.error('Gagal mengunduh file hasil import:', err);
        });
      } catch (err) {
        console.error('Error saat membuat data export spreadsheet:', err);
      }
    }

    toast.success('Import selesai! File hasil import otomatis diunduh.', {
      description: (
        <div className="mt-2 text-xs font-mono">
          <p>
            ✅ Inserted: <span className="font-bold">{data.inserted}</span>
          </p>
          <p>
            🔄 Updated: <span className="font-bold">{data.updated}</span>
          </p>
          {data.skipped > 0 && <p className="text-amber-500">⚠️ Skipped: {data.skipped}</p>}
          {data.errors.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-red-500 font-semibold mb-1">Errors:</p>
              <ul className="list-disc pl-4 space-y-1">
                {data.errors.slice(0, 3).map((err) => (
                  <li key={err}>{err}</li>
                ))}
                {data.errors.length > 3 && <li>...and {data.errors.length - 3} more</li>}
              </ul>
            </div>
          )}
        </div>
      ),
      duration: 5000,
    });
    setShowImportModal(false);
    fetchAsprak();
    refreshCodesAndNims();
  };


  const handleView = async (asprak: Asprak) => {
    setSelectedAsprak(asprak);
    setLoadingDetails(true);

    const assignments = await getAssignments(asprak.id);
    setSelectedAsprak({ ...asprak, assignments });
    setLoadingDetails(false);
  };

  const closeDetails = () => setSelectedAsprak(null);

  const handleEditAsprak = async (asprak: Asprak) => {
    setLoadingDetails(true);
    const result = await getAssignments(asprak.id);

    // Map to IDs directly, getting all assignments across all terms
    const currentAssignmentIds = (result || [])
      .map((a) => a.praktikum?.id)
      .filter((id): id is string => Boolean(id));

    setEditTarget({
      asprak,
      assignments: currentAssignmentIds,
    });
    setLoadingDetails(false);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (
    praktikumIds: string[],
    newKode: string,
    forceOverride: boolean,
    rfidUid?: string,
    namaLengkap?: string,
    newNim?: string
  ) => {
    if (!editTarget) return;

    // Use 'all' to indicate global update
    const result = await updateAssignments(
      editTarget.asprak.id,
      'all',
      praktikumIds,
      newKode,
      newNim,
      forceOverride,
      rfidUid,
      namaLengkap
    );

    if (result.ok) {
      toast.success('Data asisten berhasil diperbarui');
      fetchAsprak(); // Refresh list
      refreshCodesAndNims();
      if (viewMode === 'all') {
        fetchAllData();
      }
    } else {
      toast.error(`Gagal memperbarui: ${result.error}`);
    }
  };

  const handleDeleteClick = (asprak: Asprak) => {
    setDeleteTarget(asprak);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    const result = await deleteAsprak(deleteTarget.id);
    if (result.ok) {
      toast.success(`Berhasil menghapus ${deleteTarget.nama_lengkap}`);
      refreshCodesAndNims();
    } else {
      toast.error(`Gagal menghapus: ${result.error}`);
    }
    setDeleteTarget(null);
  };

  const filteredList = useMemo(() => {
    const list = viewMode === 'all' ? allAsprakData : asprakList;

    if (!searchQuery) return list;
    const lowerQ = searchQuery.toLowerCase();
    return list.filter((a) => {
      let roleText: string = a.role || 'ASPRAK';
      if (roleText === 'ASLAB') {
        const angkatan = a.angkatan || 0;
        const start = (angkatan + 3) % 100;
        const end = (angkatan + 4) % 100;
        const term = `${start.toString().padStart(2, '0')}${end.toString().padStart(2, '0')}`;
        roleText = HIDE_ASLAB_YEAR ? 'ASLAB' : `ASLAB ${term}`;
        if (HIDE_ASLAB_YEAR && (lowerQ.includes(term) || term.includes(lowerQ))) {
          roleText = `ASLAB ${term}`;
        }
      }

      return (
        a.nama_lengkap.toLowerCase().includes(lowerQ) ||
        a.nim.includes(lowerQ) ||
        a.kode.toLowerCase().includes(lowerQ) ||
        roleText.toLowerCase().includes(lowerQ)
      );
    });
  }, [asprakList, allAsprakData, viewMode, searchQuery]);

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8" style={{ position: 'relative' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">Data Asisten Praktikum</h1>
          <p className="text-sm 2xl:text-base text-muted-foreground mt-1">Kelola daftar asisten praktikum</p>
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

          {/* Import Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex-1 md:flex-none min-w-0 md:whitespace-nowrap">
                <Upload size={18} className="flex-shrink-0" />
                <span className="hidden sm:inline ml-1">Import CSV</span>
                <ChevronDown size={14} className="hidden sm:inline ml-1 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Pilih jenis import
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowImportModal(true)}>
                <Users size={15} className="mr-2 text-blue-500" />
                Import Data Asprak
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowPlottingImportModal(true)}>
                <GitFork size={15} className="mr-2 text-violet-500" />
                Import Penugasan (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowManualPlottingModal(true)}>
                <GitFork size={15} className="mr-2 text-amber-500" />
                Input Penugasan Manual
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View mode: Term / All */}
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'term' | 'all')}>
            <SelectTrigger className="w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="term">Term</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setShowExportModal(true)}
            className="flex-1 md:flex-none min-w-0 md:whitespace-nowrap"
          >
            <Download size={18} className="flex-shrink-0" />
            <span className="hidden sm:inline ml-1">Export Data</span>
          </Button>
        </div>
      </div>

      <div className="w-full">
        {activeTab === 'rules' ? (
          <AsprakGenerationRules existingCodes={existingCodes} />
        ) : (
          <div className="card glass p-6 flex flex-col gap-6 border border-border/50">
            <AsprakFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            <AsprakTable data={filteredList} loading={loading || loadingAll} onViewDetails={handleView} />
          </div>
        )}
      </div>

      {/* Manual Add Modal */}
      {showAddModal && (
        <AsprakAddModal
          onSubmit={handleFormSubmit}
          onClose={() => setShowAddModal(false)}
          open={showAddModal}
        />
      )}

      {/* CSV Import Modal — Data Asprak */}
      {showImportModal && (
        <AsprakImportCSVModal
          existingCodes={existingCodes}
          existingNims={allExistingNims}
          existingAspraks={allExistingAspraks}
          onImport={handleCSVImport}
          onClose={() => setShowImportModal(false)}
          open={showImportModal}
        />
      )}

      {/* CSV Import Modal — Penugasan (Plotting) */}
      <PlottingImportModal
        open={showPlottingImportModal}
        onOpenChange={setShowPlottingImportModal}
        onSuccess={() => {}}
        terms={initialTerms}
      />

      {/* Manual Input — Penugasan (Plotting) */}
      <PlottingManualModal
        open={showManualPlottingModal}
        onOpenChange={setShowManualPlottingModal}
        onSuccess={fetchAsprak}
      />

      {/* Export Modal */}
      {showExportModal && (
        <AsprakExportModal onClose={() => setShowExportModal(false)} open={showExportModal} />
      )}

      {/* Details Modal */}
      {selectedAsprak && (
        <AsprakDetailsModal
          asprak={selectedAsprak}
          loading={loadingDetails}
          onEdit={handleEditAsprak}
          onDelete={handleDeleteClick}
          onClose={closeDetails}
          open={!!selectedAsprak}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editTarget && (
        <AsprakEditModal
          asprak={editTarget.asprak}
          assignments={editTarget.assignments}
          onSave={handleSaveEdit}
          onClose={() => setShowEditModal(false)}
          open={showEditModal}
        />
      )}

      {/* Delete Dialog */}
      <AsprakDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        name={deleteTarget?.nama_lengkap || ''}
      />
    </div>
  );
}
