import { cn } from '@/lib/utils';

interface PlatformWatermarkProps {
  className?: string;
  heightClass?: string;
}

/** Theme-aware horizontal wordmark indicating part of Informatics Platform. */
export function PlatformWatermark({
  className,
  heightClass = 'h-4',
}: PlatformWatermarkProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center opacity-80 transition-opacity hover:opacity-100 select-none',
        className
      )}
    >
      <img
        src="/brand/iflab-platform-dark.svg"
        alt="Informatics Platform"
        loading="lazy"
        decoding="async"
        draggable={false}
        className={cn(heightClass, 'w-auto dark:hidden')}
      />
      <img
        src="/brand/iflab-platform-light.svg"
        alt="Informatics Platform"
        loading="lazy"
        decoding="async"
        draggable={false}
        className={cn(heightClass, 'hidden w-auto dark:block')}
      />
    </div>
  );
}
