import { JadwalJaga } from '@/types/database';
import { apiFetch } from '@/lib/clientFetch';

export async function fetchJadwalJaga(
  term: string,
  modul?: number,
  hari?: string
): Promise<{ data?: JadwalJaga[]; error?: string }> {
  const normalizedHari = hari && hari.toUpperCase() !== 'ALL' ? hari : undefined;
  const result = await apiFetch<JadwalJaga[]>('/api/jaga', {
    params: { term, modul: modul ? String(modul) : undefined, hari: normalizedHari },
  });
  return result.ok ? { data: result.data } : { error: result.error };
}

export async function addJadwalJaga(payload: {
  id_asprak: string;
  tahun_ajaran: string;
  modul: number;
  hari: string;
  shift: number;
}): Promise<{ success?: boolean; error?: string }> {
  const result = await apiFetch('/api/jaga', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return result.ok ? { success: true } : { error: result.error };
}

export async function deleteJadwalJaga(id: string): Promise<{ success?: boolean; error?: string }> {
  const result = await apiFetch('/api/jaga', {
    method: 'DELETE',
    params: { id },
  });
  return result.ok ? { success: true } : { error: result.error };
}

export async function updateJadwalJaga(
  id: string,
  payload: Partial<{
    id_asprak: string;
    tahun_ajaran: string;
    modul: number;
    hari: string;
    shift: number;
  }>
): Promise<{ success?: boolean; error?: string }> {
  const result = await apiFetch('/api/jaga', {
    method: 'PUT',
    body: JSON.stringify({ id, ...payload }),
  });
  return result.ok ? { success: true } : { error: result.error };
}

export async function bulkAddJadwalJaga(payload: {
  id_asprak: string;
  tahun_ajaran: string;
  moduls: number[];
  hari: string;
  shift: number;
}): Promise<{ success?: boolean; error?: string }> {
  const result = await apiFetch('/api/jaga', {
    method: 'POST',
    body: JSON.stringify({ action: 'bulk-upsert', ...payload }),
  });
  return result.ok ? { success: true } : { error: result.error };
}

export async function bulkDeleteJadwalJaga(payload: {
  id_asprak: string;
  tahun_ajaran: string;
  moduls: number[];
  hari: string;
  shift: number;
}): Promise<{ success?: boolean; error?: string }> {
  const result = await apiFetch('/api/jaga', {
    method: 'DELETE',
    params: {
      action: 'bulk-delete',
      id_asprak: payload.id_asprak,
      tahun_ajaran: payload.tahun_ajaran,
      moduls: payload.moduls.join(','),
      hari: payload.hari,
      shift: String(payload.shift),
    },
  });
  return result.ok ? { success: true } : { error: result.error };
}

export async function fetchRekapJagaAggregated(
  term: string
): Promise<{ data?: any[]; error?: string }> {
  const result = await apiFetch<any[]>('/api/jaga/rekap', {
    params: { term },
  });
  return result.ok ? { data: result.data } : { error: result.error };
}

export async function assignRfidToAsprak(
  id_asprak: string,
  rfid_uid: string
): Promise<{ success?: boolean; message?: string; error?: string }> {
  const result = await apiFetch<any>('/api/jaga/rfid-assign', {
    method: 'POST',
    body: JSON.stringify({ id_asprak, rfid_uid }),
  });
  return result.ok ? { success: true, message: result.data?.message } : { error: result.error };
}

export async function transferRfidToAsprak(payload: {
  from_asprak_id?: string;
  to_asprak_id: string;
  rfid_uid?: string;
}): Promise<{ success?: boolean; message?: string; error?: string }> {
  const result = await apiFetch<any>('/api/jaga/rfid-transfer', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return result.ok ? { success: true, message: result.data?.message } : { error: result.error };
}

export async function submitManualPresensi(payload: {
  idAsprak: string;
  tahunAjaran: string;
  modul: number;
  hari: string;
  shift: number;
  status?: string;
  waktuMasuk?: string;
}): Promise<{ success?: boolean; message?: string; error?: string }> {
  const result = await apiFetch<any>('/api/jaga/presensi/manual', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return result.ok ? { success: true, message: result.data?.message } : { error: result.error };
}

