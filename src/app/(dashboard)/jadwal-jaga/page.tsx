import React from 'react';
import JadwalJagaClient from './JadwalJagaClient';
import { getCachedAvailableTerms } from '@/services/termService';
import { getModulScheduleByTerm, type ModulScheduleEntry } from '@/services/modulScheduleService';
import { determineActiveModul } from '@/utils/jagaUtils';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Input Jadwal Jaga | Informatics Lab',
  description: 'Kelola jadwal jaga Asisten Laboratorium',
};

export default async function JadwalJagaPage() {
  const user = await requireAuth();
  let terms: string[] = [];
  let initialModuls: ModulScheduleEntry[] = [];
  let activeModul = 1;

  try {
    terms = (await getCachedAvailableTerms()) || [];
    const latestTerm = terms[0] ?? '';
    if (latestTerm) {
      initialModuls = (await getModulScheduleByTerm(latestTerm)) || [];
      activeModul = determineActiveModul(initialModuls);
    }
  } catch (e) {
    console.error('[JadwalJagaPage] SSR terms / modul fetch failed:', e);
  }

  return (
    <JadwalJagaClient
      initialTerms={terms}
      userRole={user.pengguna.role}
      initialActiveModul={activeModul}
      initialModulSchedule={initialModuls}
    />
  );
}
