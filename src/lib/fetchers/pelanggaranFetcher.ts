import type { Pelanggaran, Praktikum, Jadwal } from '@/types/database';
import type { ServiceResult, CreatePelanggaranInput } from '@/types/api';
import type { PelanggaranCountMap, PelanggaranSummaryEntry } from '@/services/pelanggaranService';
import { apiFetch } from '@/lib/clientFetch';

export async function fetchAllPelanggaran(): Promise<ServiceResult<Pelanggaran[]>> {
  return apiFetch<Pelanggaran[]>('/api/pelanggaran', { cache: 'no-store' });
}

export async function fetchPelanggaranByFilter(
  idPraktikum?: string,
  tahunAjaran?: string
): Promise<ServiceResult<Pelanggaran[]>> {
  return apiFetch<Pelanggaran[]>('/api/pelanggaran', {
    params: { idPraktikum, tahunAjaran },
    cache: 'no-store',
  });
}

export async function createPelanggaran(
  input: CreatePelanggaranInput
): Promise<ServiceResult<Pelanggaran | Pelanggaran[]>> {
  return apiFetch<Pelanggaran | Pelanggaran[]>('/api/pelanggaran', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function deletePelanggaran(id: string): Promise<ServiceResult<void>> {
  return apiFetch<void>('/api/pelanggaran', {
    method: 'DELETE',
    params: { id },
  });
}

export async function fetchPelanggaranCounts(
  isKoor: boolean
): Promise<ServiceResult<PelanggaranCountMap>> {
  return apiFetch<PelanggaranCountMap>('/api/pelanggaran', {
    params: { action: 'counts', isKoor },
    cache: 'no-store',
  });
}

export async function fetchKoorPraktikumList(userId: string): Promise<ServiceResult<Praktikum[]>> {
  return apiFetch<Praktikum[]>('/api/pelanggaran', {
    params: { action: 'praktikum-list', isKoor: true, userId },
    cache: 'no-store',
  });
}

export async function fetchJadwalForPelanggaran(idPraktikum?: string): Promise<ServiceResult<Jadwal[]>> {
  return apiFetch<Jadwal[]>('/api/pelanggaran', {
    params: { action: 'jadwal-list', idPraktikum },
    cache: 'no-store',
  });
}

export async function finalizePelanggaran(idPraktikum: string): Promise<ServiceResult<void>> {
  return apiFetch<void>('/api/pelanggaran', {
    method: 'POST',
    body: JSON.stringify({ action: 'finalize', id_praktikum: idPraktikum }),
  });
}

export async function fetchPraktikumDetail(id: string): Promise<ServiceResult<Praktikum>> {
  return apiFetch<Praktikum>('/api/pelanggaran', {
    params: { action: 'praktikum-detail', idPraktikum: id },
    cache: 'no-store',
  });
}

export async function unfinalizePelanggaran(idPraktikum: string): Promise<ServiceResult<void>> {
  return apiFetch<void>('/api/pelanggaran', {
    method: 'POST',
    body: JSON.stringify({ action: 'unfinalize', id_praktikum: idPraktikum }),
  });
}

export async function fetchFinalizedModules(idPraktikum: string): Promise<ServiceResult<number[]>> {
  return apiFetch<number[]>('/api/pelanggaran', {
    params: { action: 'finalized-modules', idPraktikum },
    cache: 'no-store',
  });
}

export async function finalizePelanggaranByModul(
  idPraktikum: string,
  modul: number
): Promise<ServiceResult<void>> {
  return apiFetch<void>('/api/pelanggaran', {
    method: 'POST',
    body: JSON.stringify({ action: 'finalize-modul', id_praktikum: idPraktikum, modul }),
  });
}

export async function unfinalizePelanggaranByModul(
  idPraktikum: string,
  modul: number
): Promise<ServiceResult<void>> {
  return apiFetch<void>('/api/pelanggaran', {
    method: 'POST',
    body: JSON.stringify({ action: 'unfinalize-modul', id_praktikum: idPraktikum, modul }),
  });
}

export async function fetchPelanggaranSummary(
  tahunAjaran: string,
  modul?: number,
  minCount: number = 1
): Promise<ServiceResult<PelanggaranSummaryEntry[]>> {
  return apiFetch<PelanggaranSummaryEntry[]>('/api/pelanggaran', {
    params: {
      action: 'summary',
      tahunAjaran,
      modul: modul ? String(modul) : undefined,
      minCount: minCount > 1 ? String(minCount) : undefined,
    },
    cache: 'no-store',
  });
}
