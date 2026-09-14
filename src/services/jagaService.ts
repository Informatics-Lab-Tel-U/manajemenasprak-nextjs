import 'server-only';
import { JadwalJaga } from '@/types/database';
import { honoFetch } from '@/lib/honoClient';

export async function getJadwalJaga(
  term: string,
  modul?: number,
  hari?: string
): Promise<JadwalJaga[]> {
  const params = new URLSearchParams({ term });
  if (typeof modul === 'number' && modul !== 0) {
    params.append('modul', String(modul));
  }
  if (hari) {
    params.append('hari', hari);
  }

  const result = await honoFetch<JadwalJaga[]>(`/api/jaga?${params.toString()}`);
  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Gagal mengambil data jaga');
  }

  return result.data;
}

export interface UpsertJadwalJagaInput {
  id_asprak: string;
  tahun_ajaran: string;
  modul: number;
  hari: string;
  shift: number;
}

export async function upsertJadwalJaga(
  input: UpsertJadwalJagaInput
): Promise<void> {
  const result = await honoFetch('/api/jaga', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (!result.ok) {
    throw new Error(result.error || 'Gagal menambah jadwal jaga');
  }
}

export async function updateJadwalJaga(
  id: string,
  input: Partial<UpsertJadwalJagaInput>
): Promise<void> {
  const result = await honoFetch('/api/jaga', {
    method: 'PUT',
    body: JSON.stringify({ id, ...input }),
  });

  if (!result.ok) {
    throw new Error(result.error || 'Gagal mengubah jadwal jaga');
  }
}

export async function deleteJadwalJaga(id: string): Promise<void> {
  const result = await honoFetch(`/api/jaga?id=${id}`, {
    method: 'DELETE',
  });

  if (!result.ok) {
    throw new Error(result.error || 'Gagal menghapus jadwal jaga');
  }
}

export async function bulkUpsertJadwalJaga(
  id_asprak: string,
  tahun_ajaran: string,
  moduls: number[],
  hari: string,
  shift: number
): Promise<void> {
  const result = await honoFetch('/api/jaga', {
    method: 'POST',
    body: JSON.stringify({ action: 'bulk-upsert', id_asprak, tahun_ajaran, moduls, hari, shift }),
  });

  if (!result.ok) {
    throw new Error(result.error || 'Gagal bulk input jaga');
  }
}

export async function bulkDeleteJadwalJaga(
  id_asprak: string,
  tahun_ajaran: string,
  moduls: number[],
  hari: string,
  shift: number
): Promise<void> {
  const params = new URLSearchParams({
    action: 'bulk-delete',
    id_asprak,
    tahun_ajaran,
    moduls: moduls.join(','),
    hari,
    shift: String(shift),
  });

  const result = await honoFetch(`/api/jaga?${params.toString()}`, {
    method: 'DELETE',
  });

  if (!result.ok) {
    throw new Error(result.error || 'Gagal bulk delete');
  }
}

export async function getRekapJagaAggregated(term: string) {
  const result = await honoFetch<any[]>(`/api/jaga/rekap?term=${encodeURIComponent(term)}`);
  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Gagal mengambil data rekap jaga');
  }

  return result.data;
}

export async function getTodayPresensi(term?: string, tanggal?: string) {
  const params = new URLSearchParams();
  if (term) params.append('term', term);
  if (tanggal) params.append('tanggal', tanggal);

  const result = await honoFetch<any[]>(`/api/jaga/presensi/today?${params.toString()}`);
  if (!result.ok || !result.data) {
    return [];
  }

  return result.data;
}

export async function getPresensiJaga(
  term: string,
  modul?: number,
  hari?: string,
  tanggal?: string
) {
  const params = new URLSearchParams({ term });
  if (typeof modul === 'number' && modul !== 0) {
    params.append('modul', String(modul));
  }
  if (hari && hari.toUpperCase() !== 'ALL') {
    params.append('hari', hari);
  }
  if (tanggal) {
    params.append('tanggal', tanggal);
  }

  const result = await honoFetch<any[]>(`/api/jaga/presensi?${params.toString()}`);
  if (!result.ok || !result.data) {
    return [];
  }

  return result.data;
}


