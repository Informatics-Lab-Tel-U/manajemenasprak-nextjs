/**
 * Asprak API Fetcher (Client-side)
 * Use this for fetch() calls from client components
 */

import { logger } from '@/lib/logger';
import { Asprak } from '@/types/database';
import { ServiceResult } from '@/types/api';

export interface UpsertAsprakInput {
  id?: string;
  nim: string;
  nama_lengkap: string;
  kode: string;
  role: 'ASPRAK' | 'ASLAB';
  angkatan: number;
  rfid_uid?: string | null;
  assignments: {
    term: string;
    praktikumNames: string[];
  }[];
  forceOverride?: boolean;
}

export interface AsprakAssignment {
  id: number;
  praktikum: {
    id: string;
    nama: string;
    tahun_ajaran: string;
  };
}

export interface AsprakPlottingData extends Asprak {
  assignments: {
    id: string; // Praktikum ID
    nama: string;
    tahun_ajaran: string;
  }[];
}

export async function fetchPlottingData(
  term?: string
): Promise<ServiceResult<AsprakPlottingData[]>> {
  try {
    const url = new URL('/api/asprak', globalThis.location.origin);
    url.searchParams.append('action', 'plotting');
    if (term) url.searchParams.append('term', term);

    const res = await fetch(url.toString(), { cache: 'no-store' });
    const json = await res.json();

    if (!res.ok) {
      return { ok: false, error: json.error };
    }

    return { ok: true, data: json.data };
  } catch (e: any) {
    logger.error('Error fetching plotting data:', e);
    return { ok: false, error: e.message };
  }
}

export async function fetchAllAsprak(term?: string): Promise<ServiceResult<Asprak[]>> {
  try {
    const url = term ? `/api/asprak?term=${encodeURIComponent(term)}` : '/api/asprak';
    const res = await fetch(url, { cache: 'no-store' });
    const json = await res.json();

    if (!res.ok) {
      return { ok: false, error: json.error };
    }

    return { ok: true, data: json.data };
  } catch (e: any) {
    logger.error('Error fetching asprak:', e);
    return { ok: false, error: e.message };
  }
}

export async function upsertAsprak(input: UpsertAsprakInput): Promise<ServiceResult<string>> {
  try {
    const res = await fetch('/api/asprak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert', data: input }),
    });

    const json = await res.json();

    if (!res.ok) {
      return { ok: false, error: json.error };
    }

    return { ok: true, data: json.asprakId };
  } catch (e: any) {
    logger.error('Error upserting asprak:', e);
    return { ok: false, error: e.message };
  }
}

export async function updateAssignments(
  asprakId: number | string,
  term: string,
  praktikumIds: string[],
  newKode?: string,
  nim?: string,
  forceOverride?: boolean,
  rfid_uid?: string | null,
  nama_lengkap?: string
): Promise<ServiceResult<void>> {
  try {
    const res = await fetch('/api/asprak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update-assignments',
        asprakId,
        term,
        praktikumIds,
        newKode,
        nim,
        forceOverride,
        rfid_uid,
        nama_lengkap,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      return { ok: false, error: json.error };
    }
    return { ok: true, data: undefined };
  } catch (e: any) {
    logger.error('Error updating assignments:', e);
    return { ok: false, error: e.message };
  }
}

export async function deleteAsprak(id: number | string): Promise<ServiceResult<void>> {
  try {
    const res = await fetch('/api/asprak', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    const json = await res.json();

    if (!res.ok) {
      return { ok: false, error: json.error };
    }

    return { ok: true, data: undefined };
  } catch (e: any) {
    logger.error('Error deleting asprak:', e);
    return { ok: false, error: e.message };
  }
}

export async function fetchAsprakAssignments(
  asprakId: number | string
): Promise<ServiceResult<AsprakAssignment[]>> {
  try {
    const res = await fetch('/api/asprak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'view', asprakId }),
    });

    const json = await res.json();

    if (!res.ok) {
      return { ok: false, error: json.error };
    }

    return { ok: true, data: json.data || [] };
  } catch (e: any) {
    logger.error('Error fetching assignments:', e);
    return { ok: false, error: e.message };
  }
}

export async function fetchExistingCodes(): Promise<ServiceResult<string[]>> {
  try {
    const res = await fetch('/api/asprak?action=codes', { cache: 'no-store' });
    const json = await res.json();

    if (!res.ok) {
      return { ok: false, error: json.error };
    }

    return { ok: true, data: json.data || [] };
  } catch (e: any) {
    logger.error('Error fetching codes:', e);
    return { ok: false, error: e.message };
  }
}

export async function fetchAvailableTerms(): Promise<ServiceResult<string[]>> {
  try {
    const res = await fetch('/api/asprak?action=terms', { cache: 'no-store' });
    const json = await res.json();

    if (!res.ok) {
      return { ok: false, error: json.error };
    }

    return { ok: true, data: json.data || [] };
  } catch (e: any) {
    logger.error('Error fetching terms:', e);
    return { ok: false, error: e.message };
  }
}

export interface BulkImportRow {
  nim: string;
  nama_lengkap: string;
  kode: string;
  role: 'ASPRAK' | 'ASLAB';
  angkatan: number;
}

export interface BulkImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  kodeToIdMap: Record<string, string>;
}

export async function bulkImportAspraks(
  rows: BulkImportRow[]
): Promise<ServiceResult<BulkImportResult>> {
  try {
    const CHUNK_SIZE = 50;

    // Jika data kecil, kirim langsung 1 request
    if (rows.length <= CHUNK_SIZE) {
      const res = await fetch('/api/asprak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk-import', rows }),
      });

      const json = await res.json();
      if (!res.ok) {
        return { ok: false, error: json.error };
      }
      return { ok: true, data: json.data };
    }

    // Chunking jika data besar (> 50 baris)
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    const allErrors: string[] = [];
    const mergedKodeToIdMap: Record<string, string> = {};

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const res = await fetch('/api/asprak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk-import', rows: chunk }),
      });

      const json = await res.json();
      if (!res.ok) {
        return { ok: false, error: json.error || `Gagal pada batch ${Math.floor(i / CHUNK_SIZE) + 1}` };
      }

      if (json.data) {
        totalInserted += json.data.inserted || 0;
        totalUpdated += json.data.updated || 0;
        totalSkipped += json.data.skipped || 0;
        if (json.data.errors) allErrors.push(...json.data.errors);
        if (json.data.kodeToIdMap) Object.assign(mergedKodeToIdMap, json.data.kodeToIdMap);
      }
    }

    return {
      ok: true,
      data: {
        inserted: totalInserted,
        updated: totalUpdated,
        skipped: totalSkipped,
        errors: allErrors,
        kodeToIdMap: mergedKodeToIdMap,
      },
    };
  } catch (e: any) {
    logger.error('Error bulk importing aspraks:', e);
    return { ok: false, error: e.message };
  }
}

export async function bulkImportAspraksWithPlotting(
  rows: BulkImportRow[],
  plottingPayload: { asprak_id: string; praktikum_id: string; kode_asprak: string; }[]
): Promise<ServiceResult<BulkImportResult>> {
  try {
    const res = await fetch('/api/asprak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk-import-with-plotting', rows, plottingPayload }),
    });

    const json = await res.json();

    if (!res.ok) {
      return { ok: false, error: json.error };
    }

    return { ok: true, data: json.data };
  } catch (e: any) {
    logger.error('Error bulk importing aspraks with plotting:', e);
    return { ok: false, error: e.message };
  }
}


export async function checkNim(nim: string): Promise<ServiceResult<boolean>> {
  try {
    const res = await fetch('/api/asprak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check-nim', nim }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    return { ok: true, data: json.data?.exists || false };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function generateCode(
  name: string,
  forceOverride: boolean = false
): Promise<ServiceResult<{ code: string; rule: string }>> {
  try {
    const res = await fetch('/api/asprak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate-code', name, forceOverride }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    return { ok: true, data: json.data };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
