import { requireRole } from '@/lib/auth';
import { CaslabPlottingClient } from '@/components/caslab/CaslabPlottingClient';

export const metadata = {
  title: 'Plotting Kursi Caslab | Manajemen Asprak',
  description: 'Alat pengacakan dan penataan kursi ujian calon asisten laboratorium multi-ruangan.',
};

export default async function CaslabPage() {
  await requireRole(['ADMIN', 'ASLAB']);

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 relative space-y-6">
      <header className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">
              Plotting Kursi Ujian Caslab
            </h1>
            <p className="text-sm 2xl:text-base text-muted-foreground mt-1">
              Upload data calon aslab, acak kursi pada 1 atau 2 ruangan lab secara seimbang, dengan pilihan mode berselang (anti-contek) atau sebelahan.
            </p>
          </div>
        </div>
      </header>

      <CaslabPlottingClient />
    </div>
  );
}
