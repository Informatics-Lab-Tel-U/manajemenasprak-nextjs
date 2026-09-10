import { Skeleton } from '@/components/ui/skeleton';

export default function PengaturanLoading() {
  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8">
      {/* Page Header */}
      <header className="mb-10 pb-8 border-b border-border/50">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-96" />
      </header>

      {/* Global Status Placeholder */}
      <div className="mb-8" />

      {/* Section: Import Excel Dataset */}
      <section className="pb-10 mb-10 border-b border-border/40">
        <div className="mb-6 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-4 w-80 ml-6" />
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 flex-1" />
            </div>
          </div>

          <div className="border-2 border-dashed rounded-lg p-12 text-center bg-muted/5">
            <Skeleton className="h-10 w-10 mx-auto mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-64 mx-auto" />
              <Skeleton className="h-4 w-48 mx-auto opacity-60" />
            </div>
          </div>
        </div>
      </section>

      {/* Section: Export & Template */}
      <section className="pb-10 mb-10 border-b border-border/40">
        <div className="mb-6 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-4 w-72 ml-6" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      </section>
    </div>
  );
}
