import 'server-only';
import { honoFetch } from '@/lib/honoClient';

export type PraktikanId = string | number;

export type PraktikanRecord = {
  id: PraktikanId;
  created_at?: string;
  nama: string;
  kode_asprak: string | null;
  kelas: string;
  mata_kuliah: string;
};

export type PraktikanFilters = {
  kelas?: string;
  mata_kuliah?: string;
};

export type CreatePraktikanInput = {
  nama: string;
  kode_asprak?: string | null;
  kelas: string;
  mata_kuliah: string;
};

export type UpdatePraktikanInput = Partial<CreatePraktikanInput>;

export type CreatePraktikanResult = {
  inserted: number;
  data: PraktikanRecord[];
};

export type PraktikanOptions = {
  kelas: string[];
  mata_kuliah: string[];
};

export async function getPraktikanList(
  filters: PraktikanFilters = {}
): Promise<PraktikanRecord[]> {
  const params = new URLSearchParams();
  if (filters.kelas) params.append('kelas', filters.kelas);
  if (filters.mata_kuliah) params.append('mata_kuliah', filters.mata_kuliah);

  const result = await honoFetch<PraktikanRecord[]>(`/api/praktikan?${params.toString()}`);
  return result.ok && result.data ? result.data : [];
}

export function getActiveTahunAjaran(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startsCurrentYear = month >= 6;
  const start = startsCurrentYear ? year : year - 1;
  const end = startsCurrentYear ? year + 1 : year;
  const startYear = String(start).slice(-2).padStart(2, '0');
  const endYear = String(end).slice(-2).padStart(2, '0');
  const semester = month >= 1 && month <= 5 ? '2' : '1';

  return `${startYear}${endYear}-${semester}`;
}

export async function getActivePraktikumMataKuliahOptions(): Promise<string[]> {
  const result = await honoFetch<string[]>('/api/praktikan?action=mata-kuliah-options');
  return result.ok && result.data ? result.data : [];
}

export async function getPraktikanKelasByMataKuliah(
  mataKuliah: string | null | undefined
): Promise<string[]> {
  const query = mataKuliah ? `?action=kelas-options&mata_kuliah=${encodeURIComponent(mataKuliah)}` : '?action=kelas-options';
  const result = await honoFetch<string[]>(`/api/praktikan${query}`);
  return result.ok && result.data ? result.data : [];
}

export async function getPraktikanOptions(): Promise<PraktikanOptions> {
  const result = await honoFetch<PraktikanOptions>('/api/praktikan?action=options');
  return result.ok && result.data ? result.data : { kelas: [], mata_kuliah: [] };
}

export async function createPraktikan(
  input: CreatePraktikanInput | CreatePraktikanInput[]
): Promise<CreatePraktikanResult> {
  const result = await honoFetch<CreatePraktikanResult>('/api/praktikan', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Gagal menyimpan data praktikan');
  }

  return result.data;
}

export async function updatePraktikan(
  id: PraktikanId,
  input: UpdatePraktikanInput
): Promise<PraktikanRecord> {
  const result = await honoFetch<PraktikanRecord>('/api/praktikan', {
    method: 'PUT',
    body: JSON.stringify({ id, ...input }),
  });

  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Gagal memperbarui data praktikan');
  }

  return result.data;
}

export async function deletePraktikan(
  id: PraktikanId
): Promise<void> {
  const result = await honoFetch(`/api/praktikan?id=${id}`, {
    method: 'DELETE',
  });

  if (!result.ok) {
    throw new Error(result.error || 'Gagal menghapus data praktikan');
  }
}

export async function deletePraktikanByGroup(params: {
  mata_kuliah?: string;
  kelas?: string;
}): Promise<{ deleted: number }> {
  const query = new URLSearchParams();
  if (params.mata_kuliah) query.set('mata_kuliah', params.mata_kuliah);
  if (params.kelas) query.set('kelas', params.kelas);

  const result = await honoFetch<{ deleted: number }>(`/api/praktikan?${query.toString()}`, {
    method: 'DELETE',
  });

  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Gagal menghapus data praktikan');
  }

  return result.data;
}

export async function deletePraktikanByKelas(
  kelas: string
): Promise<{ deleted: number }> {
  const result = await honoFetch<{ deleted: number }>(`/api/praktikan?kelas=${encodeURIComponent(kelas)}`, {
    method: 'DELETE',
  });

  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Gagal menghapus data praktikan berdasarkan kelas');
  }

  return result.data;
}

export async function deleteAllPraktikan(): Promise<{ deleted: number }> {
  const result = await honoFetch<{ deleted: number }>('/api/praktikan?action=delete-all', {
    method: 'DELETE',
  });

  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Gagal menghapus seluruh data praktikan');
  }

  return result.data;
}
