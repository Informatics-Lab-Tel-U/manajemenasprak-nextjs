/* eslint-disable react-doctor/no-impure-state-updater */
/* eslint-disable react-doctor/exhaustive-deps */
'use client';

import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import JagaPanel from '@/components/jadwal/JagaPanel';
import { Button } from '@/components/ui/button';
import { CreditCard, Plus, RotateCw } from 'lucide-react';
import JagaInputModal from '@/components/jadwal/JagaInputModal';
import JagaRfidModal from '@/components/jadwal/JagaRfidModal';
import { useTermStore } from '@/store/useTermStore';

export default function JadwalJagaClient({
  initialTerms,
  userRole,
}: {
  initialTerms: string[];
  userRole?: string;
}) {
  const { activeTerm } = useTermStore();
  const selectedTerm = activeTerm || '';
  const [selectedModul, setSelectedModul] = useState('Modul 1');
  const [selectedDay, setSelectedDay] = useState('SENIN');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRfidModalOpen, setIsRfidModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);
  const [konfigurasiModul, setKonfigurasiModul] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const moduls = Array.from({ length: 16 }, (_, i) => `Modul ${i + 1}`);
  const modulNum = selectedModul === 'Default' ? 0 : parseInt(selectedModul.replace('Modul ', ''));

  useEffect(() => {
    const controller = new AbortController();
    if (selectedTerm) {
      // eslint-disable-next-line react-doctor/no-fetch-in-effect
      fetch(`/api/modul-schedule?term=${selectedTerm}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          if (!controller.signal.aborted && data.ok && data.data) {
            setKonfigurasiModul(data.data);
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted) console.error(e);
        });
    }
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
        onSuccess={() => {
          handleRefresh();
        }}
      />
    </div>
  );
}
