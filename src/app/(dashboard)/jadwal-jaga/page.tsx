import React from 'react';
import JadwalJagaClient from './JadwalJagaClient';
import { getCachedAvailableTerms } from '@/services/termService';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Input Jadwal Jaga | Informatics Lab',
  description: 'Kelola jadwal jaga Asisten Laboratorium',
};

export default async function JadwalJagaPage() {
  const user = await requireAuth();
  let terms: string[] = [];
  try {
    terms = await getCachedAvailableTerms();
  } catch (e) {
    console.error('[JadwalJagaPage] SSR terms fetch failed:', e);
  }

  return <JadwalJagaClient initialTerms={terms} userRole={user.pengguna.role} />;
}
