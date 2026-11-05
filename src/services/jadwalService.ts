import 'server-only';
import { getCachedAvailableTerms as getCachedTerms } from './termService';
import { Jadwal, JadwalPengganti } from '@/types/database';
import { honoFetch } from '@/lib/honoClient';

export const getCachedAvailableTerms = getCachedTerms;

export async function getJadwalByTerm(
  term: string
): Promise<Jadwal[]> {
  const result = await honoFetch<Jadwal[]>(`/api/jadwal?action=by-term&term=${encodeURIComponent(term)}`);
  return result.ok && result.data ? result.data : [];
}

export const getCachedJadwalByTerm = async (term: string): Promise<Jadwal[]> => {
  return getJadwalByTerm(term);
};

export async function getScheduleForValidation(term: string) {
  const result = await honoFetch<any[]>(`/api/jadwal?action=validation&term=${encodeURIComponent(term)}`);
  return result.ok && result.data ? result.data : [];
}

export async function getTodaySchedule(
  limit: number = 5,
  term?: string
): Promise<Jadwal[]> {
  const query = term ? `&term=${encodeURIComponent(term)}` : '';
  const result = await honoFetch<Jadwal[]>(`/api/jadwal?action=today&limit=${limit}${query}`);
  return result.ok && result.data ? result.data : [];
}

export interface CreateJadwalInput {
  id_mk: string;
  kelas: string;
  hari: string;
  sesi: number;
  jam: string;
  ruangan?: string;
  total_asprak?: number;
  dosen?: string;
}

export async function createJadwal(
  input: CreateJadwalInput
): Promise<Jadwal> {
  const result = await honoFetch<Jadwal>('/api/jadwal', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Failed to create Jadwal');
  }
  return result.data;
}

export async function bulkCreateJadwal(
  inputs: CreateJadwalInput[]
): Promise<{ inserted: number; errors: string[] }> {
  if (inputs.length === 0) return { inserted: 0, errors: [] };
  const result = await honoFetch<{ inserted: number; errors: string[] }>('/api/jadwal?action=bulk-import', {
    method: 'POST',
    body: JSON.stringify(inputs),
  });

  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Failed to bulk create Jadwal');
  }

  return result.data;
}

export interface UpdateJadwalInput {
  id: string;
  id_mk?: string;
  kelas?: string;
  hari?: string;
  sesi?: number;
  jam?: string;
  ruangan?: string;
  total_asprak?: number;
  dosen?: string;
}

export async function updateJadwal(
  input: UpdateJadwalInput
): Promise<Jadwal> {
  const result = await honoFetch<Jadwal>('/api/jadwal', {
    method: 'PUT',
    body: JSON.stringify(input),
  });

  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Failed to update Jadwal');
  }
  return result.data;
}

export async function deleteJadwal(id: string): Promise<void> {
  const result = await honoFetch(`/api/jadwal?id=${id}`, {
    method: 'DELETE',
  });
  if (!result.ok) {
    throw new Error(result.error || 'Failed to delete Jadwal');
  }
}

export async function deleteJadwalByIds(
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  const result = await honoFetch('/api/jadwal?action=delete-ids', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  });
  if (!result.ok) {
    throw new Error(result.error || 'Failed to delete Jadwal by IDs');
  }
}

export async function deleteJadwalByTerm(
  term: string
): Promise<void> {
  const result = await honoFetch(`/api/jadwal?action=by-term&term=${encodeURIComponent(term)}`, {
    method: 'DELETE',
  });

  if (!result.ok) {
    throw new Error(result.error || 'Failed to bulk delete Jadwal');
  }
}

export interface CreateJadwalPenggantiInput {
  id_jadwal: number;
  modul: number;
  tanggal: string;
  hari: string;
  sesi: number;
  jam: string;
  ruangan: string;
}

export async function getAllJadwal(): Promise<Jadwal[]> {
  const result = await honoFetch<Jadwal[]>('/api/jadwal');
  return result.ok && result.data ? result.data : [];
}

export async function getJadwalPengganti(
  modul: number
): Promise<JadwalPengganti[]> {
  if (modul <= 0) return [];
  const result = await honoFetch<JadwalPengganti[]>(`/api/jadwal?action=pengganti&modul=${modul}`);
  return result.ok && result.data ? result.data : [];
}

export async function upsertJadwalPengganti(
  input: CreateJadwalPenggantiInput
): Promise<JadwalPengganti> {
  const result = await honoFetch<JadwalPengganti>('/api/jadwal?action=upsert-pengganti', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Failed to upsert Jadwal Pengganti');
  }
  return result.data;
}

export async function getJadwalPenggantiByTerm(
  term: string
): Promise<any[]> {
  const result = await honoFetch<any[]>(`/api/jadwal?action=pengganti-by-term&term=${encodeURIComponent(term)}`);
  return result.ok && result.data ? result.data : [];
}

export async function deleteJadwalPengganti(
  id: string
): Promise<void> {
  const result = await honoFetch(`/api/jadwal?id=${id}&action=delete-pengganti`, {
    method: 'DELETE',
  });
  if (!result.ok) {
    throw new Error(result.error || 'Failed to delete Jadwal Pengganti');
  }
}
