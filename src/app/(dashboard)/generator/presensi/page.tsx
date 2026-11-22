import { PresensiClientWrapper } from './PresensiClientWrapper';

export const metadata = {
  title: 'Generator Presensi | Manajemen Asprak',
};

export default function PresensiPage() {
  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 relative space-y-6">
      <header className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Generator Presensi</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Buat template absensi asisten praktikum dalam format Excel secara otomatis.
            </p>
          </div>
        </div>
      </header>

      <PresensiClientWrapper />
    </div>
  );
}
