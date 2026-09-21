'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import JagaPanel from '@/components/jadwal/JagaPanel';
import { Button } from '@/components/ui/button';
import { CreditCard, FileSpreadsheet, Loader2, ChevronDown, Plus, RotateCw } from 'lucide-react';
import JagaInputModal from '@/components/jadwal/JagaInputModal';
import JagaRfidModal from '@/components/jadwal/JagaRfidModal';
import { useTermStore } from '@/store/useTermStore';
import { exportPresensiJagaExcel } from '@/lib/spreadsheet';
import { toast } from 'sonner';
import { determineActiveModul } from '@/utils/jagaUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ModulScheduleItem {
  modul: number;
  tanggal_mulai: string | null;
}

export default function JadwalJagaClient({
  initialTerms,
  userRole,
  initialActiveModul = 1,
  initialModulSchedule = [],
}: {
  initialTerms: string[];
  userRole?: string;
  initialActiveModul?: number;
  initialModulSchedule?: ModulScheduleItem[];
}) {
  const { activeTerm } = useTermStore();
  const selectedTerm = activeTerm || initialTerms[0] || '';
  const [selectedModul, setSelectedModul] = useState(`Modul ${initialActiveModul}`);
  const [selectedDay, setSelectedDay] = useState('SENIN');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRfidModalOpen, setIsRfidModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);
  const [konfigurasiModul, setKonfigurasiModul] = useState<ModulScheduleItem[]>(initialModulSchedule);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const lastFetchedTermRef = useRef<string | null>(
    initialModulSchedule && initialModulSchedule.length > 0 && initialTerms[0] ? initialTerms[0] : null
  );

  const moduls = Array.from({ length: 16 }, (_, i) => `Modul ${i + 1}`);
  const modulNum = selectedModul === 'Default' ? 0 : parseInt(selectedModul.replace('Modul ', ''));

  useEffect(() => {
    if (!selectedTerm) return;

    if (lastFetchedTermRef.current === selectedTerm) {
      return;
    }

    const controller = new AbortController();
    fetch(`/api/modul-schedule?term=${encodeURIComponent(selectedTerm)}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!controller.signal.aborted && data.ok && data.data) {
          lastFetchedTermRef.current = selectedTerm;
          setKonfigurasiModul(data.data);
          const active = determineActiveModul(data.data);
          setSelectedModul(`Modul ${active}`);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) console.error(e);
      });

    return () => controller.abort();
  }, [selectedTerm]);

  const handleRefresh = () => setRefreshTrigger((prev) => prev + 1);

  const handleAdd = (day?: string, shift?: number) => {
    if (day && shift) {
      setEditingData({ hari: day, shift });
    } else {
      setEditingData(null);
    }
    setIsModalOpen(true);
  };

  const handleEdit = (data: any) => {
    setEditingData(data);
    setIsModalOpen(true);
  };

  const handleExport = async (modulFilter?: number) => {
    if (!selectedTerm) {
      toast.error('Pilih tahun ajaran terlebih dahulu');
      return;
    }
    setIsExporting(true);
    try {
      await exportPresensiJagaExcel({
        term: selectedTerm,
        modul: modulFilter,
      });
      toast.success('Presensi jaga berhasil diekspor');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengekspor presensi jaga');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">Manajemen Penjagaan</h1>
          <p className="text-sm 2xl:text-base text-muted-foreground mt-1">
            Kelola jadwal jaga Asisten Laboratorium
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Select value={selectedModul} onValueChange={setSelectedModul}>
            <SelectTrigger className="w-full sm:w-[160px] bg-card/50 backdrop-blur-sm">
              <SelectValue placeholder="Pilih Modul" />
            </SelectTrigger>
            <SelectContent>
              {moduls.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            title="Muat ulang jadwal & presensi"
            className="rounded-lg shadow-sm border-border/80 bg-background/80 hover:bg-accent"
          >
            <RotateCw size={16} className="text-muted-foreground hover:text-foreground" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={isExporting}
                className="flex-1 sm:flex-none min-w-0 md:whitespace-nowrap rounded-lg shadow-sm border-border/80 bg-background/80 hover:bg-accent"
                title="Ekspor hasil presensi jaga ke Excel"
              >
                {isExporting ? (
                  <Loader2 size={16} className="animate-spin text-primary" />
                ) : (
                  <FileSpreadsheet size={16} className="text-emerald-600 dark:text-emerald-500" />
                )}
                <span className="hidden sm:inline ml-2 font-medium">Ekspor Excel</span>
                <ChevronDown size={14} className="ml-1 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => handleExport(modulNum)}>
                Ekspor {selectedModul}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport(undefined)}>
                Ekspor Semua Modul
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {userRole === 'ADMIN' && (
            <Button
              variant="outline"
              onClick={() => setIsRfidModalOpen(true)}
              className="flex-1 sm:flex-none min-w-0 md:whitespace-nowrap rounded-lg shadow-sm border-border/80 bg-background/80 hover:bg-accent"
            >
              <CreditCard size={18} className="flex-shrink-0 text-primary" />
              <span className="hidden sm:inline ml-2 font-medium">Presensi & RFID</span>
            </Button>
          )}

          {userRole === 'ADMIN' && (
            <Button
              onClick={() => handleAdd()}
              className="flex-1 sm:flex-none min-w-0 md:whitespace-nowrap rounded-lg shadow-sm"
            >
              <Plus size={18} className="flex-shrink-0" />
              <span className="hidden sm:inline ml-2 font-medium">Input Jaga</span>
            </Button>
          )}
        </div>
      </div>

      <JagaPanel
        term={selectedTerm}
        selectedModul={selectedModul}
        userRole={userRole}
        onRefreshTrigger={refreshTrigger}
        onEdit={handleEdit}
        onAdd={handleAdd}
        onDayChange={setSelectedDay}
      />

      <JagaInputModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingData(null);
        }}
        term={selectedTerm}
        selectedModul={modulNum}
        konfigurasiModul={konfigurasiModul}
        defaultDay={selectedDay === 'ALL' ? 'SENIN' : selectedDay}
        userRole={userRole}
        editData={editingData}
        onSuccess={() => {
          handleRefresh();
          setIsModalOpen(false);
          setEditingData(null);
        }}
      />

      <JagaRfidModal
        isOpen={isRfidModalOpen}
        onClose={() => setIsRfidModalOpen(false)}
        term={selectedTerm}
        selectedModul={modulNum}
        selectedDay={selectedDay}
        onSuccess={() => {
          handleRefresh();
        }}
      />
    </div>
  );
}
