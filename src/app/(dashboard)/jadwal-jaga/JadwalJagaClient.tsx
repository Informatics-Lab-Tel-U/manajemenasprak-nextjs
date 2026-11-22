'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  CreditCard,
  FileSpreadsheet,
  Loader2,
  Plus,
  RotateCw,
} from 'lucide-react';
import { toast } from 'sonner';

import JagaInputModal from '@/components/jadwal/JagaInputModal';
import JagaPanel from '@/components/jadwal/JagaPanel';
import JagaRfidModal from '@/components/jadwal/JagaRfidModal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { exportPresensiJagaExcel } from '@/lib/spreadsheet';
import { useTermStore } from '@/store/useTermStore';
import { determineActiveModul } from '@/utils/jagaUtils';

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
    initialModulSchedule && initialModulSchedule.length > 0 && initialTerms[0]
      ? initialTerms[0]
      : null
  );

  const moduls = Array.from({ length: 16 }, (_, i) => `Modul ${i + 1}`);
  const modulNum =
    selectedModul === 'Default' ? 0 : parseInt(selectedModul.replace('Modul ', ''), 10);

  useEffect(() => {
    if (!selectedTerm) return;

    if (lastFetchedTermRef.current === selectedTerm) {
      return;
    }

    const controller = new AbortController();
    fetch(`/api/modul-schedule?term=${encodeURIComponent(selectedTerm)}`, {
      signal: controller.signal,
    })
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
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Manajemen Penjagaan
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola jadwal jaga Asisten Laboratorium
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <Select value={selectedModul} onValueChange={setSelectedModul}>
            <SelectTrigger
              aria-label="Pilih modul penjagaan"
              className="w-full sm:w-[160px] min-h-11 sm:min-h-9 bg-transparent border-border"
            >
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
            type="button"
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            title="Muat ulang jadwal & presensi"
            aria-label="Muat ulang jadwal dan presensi"
            className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 bg-transparent border-border hover:bg-accent/50"
          >
            <RotateCw className="size-4 text-muted-foreground" aria-hidden="true" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isExporting}
                className="flex-1 sm:flex-none min-w-0 min-h-11 sm:min-h-9 md:whitespace-nowrap bg-transparent border-border hover:bg-accent/50"
                title="Ekspor hasil presensi jaga ke Excel"
              >
                {isExporting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <FileSpreadsheet className="size-4 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="hidden sm:inline font-medium">Ekspor Excel</span>
                <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
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
              type="button"
              variant="outline"
              onClick={() => setIsRfidModalOpen(true)}
              className="flex-1 sm:flex-none min-w-0 min-h-11 sm:min-h-9 md:whitespace-nowrap bg-transparent border-border hover:bg-accent/50"
            >
              <CreditCard className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="hidden sm:inline font-medium">Presensi & RFID</span>
            </Button>
          )}

          {userRole === 'ADMIN' && (
            <Button
              type="button"
              onClick={() => handleAdd()}
              className="flex-1 sm:flex-none min-w-0 min-h-11 sm:min-h-9 md:whitespace-nowrap"
            >
              <Plus className="size-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline font-medium">Input Jaga</span>
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
