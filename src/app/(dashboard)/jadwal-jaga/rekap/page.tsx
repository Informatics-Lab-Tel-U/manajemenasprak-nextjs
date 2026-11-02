import React from 'react';
import RekapJagaClient from './RekapJagaClient';
import { getCachedAvailableTerms } from '@/services/termService';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Rekap Penjagaan | Informatics Lab',
  description: 'Rekapitulasi jadwal jaga Asisten Praktikum',
};

export default async function RekapJagaPage() {
  await requireAuth();

  let terms: string[] = [];
  try {
    terms = (await getCachedAvailableTerms()) || [];
  } catch (e) {
    console.error('[RekapJagaPage] SSR terms fetch failed:', e);
  }

  return <RekapJagaClient initialTerms={terms} />;
}
