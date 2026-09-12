'use client';

import PelanggaranForm from './PelanggaranForm';
import { Dialog } from '@/components/ui/dialog';
import type { Asprak, Jadwal, Praktikum } from '@/types/database';

interface PelanggaranAddModalProps {
  onSubmit: (data: {
    id_asprak: string[];
    id_jadwal: string;
    jenis: string;
    modul: number;
  }) => Promise<void>;
  onClose: () => void;
  open: boolean;
  isLoading?: boolean;
  isDepsLoading?: boolean;
  praktikumList: Praktikum[];
  tahunAjaranList: string[];
  asprakList: (Asprak & { praktikum_ids?: string[] })[];
  jadwalList: (Jadwal & { id_praktikum?: string })[];
  initialTahunAjaran?: string;
  initialPraktikumId?: string;
  initialModul?: string;
}

export default function PelanggaranAddModal({
  onSubmit,
  onClose,
  open,
  isLoading = false,
  isDepsLoading = false,
  praktikumList,
  tahunAjaranList,
  asprakList,
  jadwalList,
  initialTahunAjaran,
  initialPraktikumId,
  initialModul,
}: PelanggaranAddModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <PelanggaranForm
        onSubmit={onSubmit}
        onCancel={onClose}
        isLoading={isLoading}
        isDepsLoading={isDepsLoading}
        praktikumList={praktikumList}
        tahunAjaranList={tahunAjaranList}
        asprakList={asprakList}
        jadwalList={jadwalList}
        initialTahunAjaran={initialTahunAjaran}
        initialPraktikumId={initialPraktikumId}
        initialModul={initialModul}
      />
    </Dialog>
  );
}
