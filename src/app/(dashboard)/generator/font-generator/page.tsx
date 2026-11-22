import { requireRole } from '@/lib/auth';
import FontGeneratorForm from '@/components/admin/FontGeneratorForm';

export const metadata = {
  title: 'Generator Font Fingerprint | Manajemen Asprak',
};

export default async function FontGeneratorPage() {
  await requireRole(['ADMIN', 'ASLAB']);

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 relative space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Generator Font Fingerprint</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate file TTF khusus per ruangan untuk validasi perangkat PC Lab.
          </p>
        </div>
      </div>
      
      <div className="flex items-start pt-4">
        <FontGeneratorForm initialRooms={[]} initialTerm="" />
      </div>
    </div>
  );
}

