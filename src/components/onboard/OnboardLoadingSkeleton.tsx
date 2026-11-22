import { Skeleton } from '@/components/ui/skeleton';

export default function OnboardLoadingSkeleton() {
  return (
    <div className="container mx-auto max-w-[2000px] relative space-y-6 2xl:px-8">
      {/* Header Skeleton */}
      <header className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex items-start gap-4">
          <Skeleton className="w-9 h-9 rounded-md shrink-0 mt-1" />
          <div>
            <Skeleton className="h-9 w-64 sm:w-80 mb-3" />
            <Skeleton className="h-5 w-full sm:w-[450px] max-w-full" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-5 w-48 hidden xl:block" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </header>

      {/* Stepper Skeleton */}
      <div className="flex flex-col w-full items-start gap-8">
        <div className="w-full bg-card p-4 rounded-xl border shadow-sm flex flex-col md:flex-row md:items-center gap-4 md:gap-0 justify-between">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 flex items-center gap-2.5">
              <Skeleton className="w-8 h-8 rounded-md shrink-0" />
              <div className="flex-col gap-1 hidden md:flex">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
        
        {/* Step Content Card Skeleton */}
        <div className="w-full">
          <div className="flex-1 flex flex-col gap-6 rounded-xl border border-border shadow-sm bg-card min-h-[400px] p-6">
            <div className="flex flex-col gap-2 border-b pb-6">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="mt-2 space-y-6">
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-10 w-full max-w-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
