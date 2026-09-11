'use server';

import { getPraktikumDetails, getPraktikumByTerm } from '@/services/praktikumService';
import { requireAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { honoFetch } from '@/lib/honoClient';

export async function getPraktikumList(term: string) {
  try {
    await requireAuth();

    const list = await getPraktikumByTerm(term);
    return { success: true, data: list.map((p) => ({ id: p.id, nama: p.nama })) };
  } catch (error: any) {
    console.error('Error fetching praktikum list:', error);
    return { success: false, error: error.message };
  }
}

export async function getPraktikumClasses(praktikumId: string) {
  try {
    await requireAuth();

    const details = await getPraktikumDetails(praktikumId);
    return {
      success: true,
      data: details.classes.map((c) => c.kelas),
      classes: details.classes,
    };
  } catch (error: any) {
    console.error('Error fetching praktikum classes:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mengambil daftar asprak (nama + kode) yang terdaftar pada suatu praktikum.
 * Data ini digunakan untuk sheet "ASPRAK BELUM NILAI" dan "REKAP".
 */
export async function getAsprakListByPraktikum(praktikumId: string) {
  try {
    await requireAuth();

    const result = await honoFetch<any[]>(`/api/praktikum/${praktikumId}/asprak`);
    return { success: result.ok, data: result.data || [] };
  } catch (error: any) {
    logger.error('Error in getAsprakListByPraktikum:', error);
    return { success: false, error: error.message };
  }
}
