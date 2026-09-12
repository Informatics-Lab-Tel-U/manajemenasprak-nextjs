'use client';

import PelanggaranClientPage from './PelanggaranClientPage';
import type { Praktikum } from '@/types/database';

interface Props {
  initialPraktikumList: Praktikum[];
  initialTahunAjaranList: string[];
  initialCountMap: Record<string, { total: number; allFinal: boolean; finalized: boolean }>;
  isKoor: boolean;
  userId?: string;
}

export function PelanggaranClientWrapper(props: Props) {
  return <PelanggaranClientPage {...props} />;
}

