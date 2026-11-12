import { requireRole } from '@/lib/auth';
import { CaslabProjectorStandalone } from '@/components/caslab/CaslabProjectorStandalone';

export const metadata = {
  title: 'Layar Proyektor Caslab | Manajemen Asprak',
  description: 'Tampilan denah kursi calon asisten laboratorium untuk layar proyektor lab.',
};

export default async function CaslabProjectorPage() {
  await requireRole(['ADMIN', 'ASLAB']);

  return <CaslabProjectorStandalone />;
}

