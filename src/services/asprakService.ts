import 'server-only';
import { Asprak } from '@/types/database';
import { getCachedAvailableTerms as getCachedTerms } from './termService';
import { honoFetch } from '@/lib/honoClient';

export async function checkNimExists(
  nim: string
): Promise<boolean> {
  const result = await honoFetch<{ exists: boolean }>(`/api/asprak?action=check-nim&nim=${encodeURIComponent(nim)}`);
  return result.ok && result.data ? !!result.data.exists : false;
}

export async function generateUniqueCode(
  nama: string,
  forceOverride: boolean = false
): Promise<{ code: string; rule: string }> {
  const result = await honoFetch<{ code: string; rule: string }>(
    `/api/asprak?action=generate-code&nama=${encodeURIComponent(nama)}&forceOverride=${forceOverride}`
  );
  return result.ok && result.data ? result.data : { code: '', rule: 'Manual Input Required' };
}

export async function getAllAsprak(
  term?: string
): Promise<Asprak[]> {
  const query = term && term !== 'all' ? `?term=${encodeURIComponent(term)}` : '';
  const result = await honoFetch<Asprak[]>(`/api/asprak${query}`);
  return result.ok && result.data ? result.data : [];
}

export interface AsprakWithMap extends Asprak {
  assignments: {
    id: string;
    nama: string;
    tahun_ajaran: string;
  }[];
}

export async function getAspraksWithAssignments(
  term?: string
): Promise<AsprakWithMap[]> {
  const query = term && term !== 'all' ? `?action=plotting&term=${encodeURIComponent(term)}` : '?action=plotting';
  const result = await honoFetch<AsprakWithMap[]>(`/api/asprak${query}`);
  return result.ok && result.data ? result.data : [];
}

export async function deleteAsprak(id: string): Promise<void> {
  const result = await honoFetch(`/api/asprak?id=${id}`, {
    method: 'DELETE',
  });
  if (!result.ok) {
    throw new Error(result.error || 'Failed to delete asprak');
  }
}

export async function getExistingCodes(): Promise<string[]> {
  const result = await honoFetch<any[]>('/api/asprak');
  if (!result.ok || !result.data) return [];
  return result.data
    .map((a: any) => (typeof a === 'string' ? a : a?.kode))
    .filter((k): k is string => typeof k === 'string' && k.length > 0);
}

export const getCachedAvailableTerms = getCachedTerms;

export const getCachedAllAsprak = async (term?: string): Promise<Asprak[]> => {
  return getAllAsprak(term);
};

export const getCachedAspraksWithAssignments = async (term?: string): Promise<AsprakWithMap[]> => {
  return getAspraksWithAssignments(term);
};

export async function getAsprakAssignments(
  asprakId: number | string
) {
  const result = await honoFetch<any[]>(`/api/asprak?action=assignments&asprakId=${asprakId}`);
  return result.ok && result.data ? result.data : [];
}

export interface UpsertAsprakInput {
  nim: string;
  nama_lengkap: string;
  kode: string;
  role: 'ASPRAK' | 'ASLAB';
  angkatan: number;
  assignments: {
    term: string;
    praktikumNames: string[];
  }[];
  forceOverride?: boolean;
}

export async function upsertAsprak(
  input: UpsertAsprakInput
): Promise<string> {
  const result = await honoFetch<{ id: string }>('/api/asprak', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Failed to upsert asprak');
  }
  return result.data.id;
}

export interface BulkUpsertRow {
  nim: string;
  nama_lengkap: string;
  kode: string;
  role: 'ASPRAK' | 'ASLAB';
  angkatan: number;
}

export interface BulkUpsertResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  kodeToIdMap: Record<string, string>;
  insertedIds: string[];
}

export async function bulkUpsertAspraks(
  rows: BulkUpsertRow[]
): Promise<BulkUpsertResult> {
  const result = await honoFetch<BulkUpsertResult>('/api/asprak?action=bulk-upsert', {
    method: 'POST',
    body: JSON.stringify(rows),
  });

  if (!result.ok || !result.data) {
    return { inserted: 0, updated: 0, skipped: 0, errors: [result.error || 'Bulk upsert error'], kodeToIdMap: {}, insertedIds: [] };
  }

  return result.data;
}

export async function bulkUpsertAspraksWithPlotting(
  rows: BulkUpsertRow[],
  plottingPayload: { asprak_id: string; praktikum_id: string; kode_asprak: string; }[]
): Promise<BulkUpsertResult> {
  const result = await honoFetch<BulkUpsertResult>('/api/asprak?action=bulk-upsert-with-plotting', {
    method: 'POST',
    body: JSON.stringify({ rows, plottingPayload }),
  });

  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Failed bulk upsert with plotting');
  }

  return result.data;
}

export async function updateAsprakAssignments(
  asprakId: number | string,
  term: string,
  praktikumIds: string[],
  newKode?: string,
  nim?: string,
  forceOverride: boolean = false
): Promise<void> {
  const result = await honoFetch('/api/asprak?action=update-assignments', {
    method: 'PUT',
    body: JSON.stringify({ asprakId, term, praktikumIds, newKode, nim, forceOverride }),
  });

  if (!result.ok) {
    throw new Error(result.error || 'Failed to update asprak assignments');
  }
}
