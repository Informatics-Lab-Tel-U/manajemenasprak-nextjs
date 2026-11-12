import { requireRole } from '@/lib/auth';
import { CaslabPlottingClient } from '@/components/caslab/CaslabPlottingClient';

export const metadata = {
  title: 'Plotting Kursi Caslab | Manajemen Asprak',
  description: 'Alat pengacakan dan penataan kursi ujian calon asisten laboratorium multi-ruangan.',
};

export default async function CaslabPage() {
  await requireRole(['ADMIN', 'ASLAB']);

  return <CaslabPlottingClient />;
}
