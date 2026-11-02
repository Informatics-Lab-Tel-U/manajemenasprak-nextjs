import { getAvailableTerms } from '@/services/termService';
import { getAllMataKuliah } from '@/services/praktikumService';
import { getAllJadwal } from '@/services/jadwalService';
import JadwalPenggantiClientPage from './JadwalPenggantiClientPage';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Jadwal Pengganti | Manajemen Asprak',
  description: 'Kelola jadwal pengganti praktikum',
};

export default async function JadwalPenggantiPage() {
  let terms: string[] = [];
  let mkResult: any[] = [];
  let allJadwal: any[] = [];

  try {
    const res = await Promise.all([
      getAvailableTerms(),
      getAllMataKuliah(),
      getAllJadwal(),
    ]);
    terms = res[0] || [];
    mkResult = res[1] || [];
    allJadwal = res[2] || [];
  } catch (e) {
    console.error('[JadwalPenggantiPage] SSR initial data fetch failed, using fallback:', e);
  }

  return (
    <JadwalPenggantiClientPage
      initialTerms={terms}
      initialMataKuliah={mkResult}
      initialAllJadwal={allJadwal}
    />
  );
}
