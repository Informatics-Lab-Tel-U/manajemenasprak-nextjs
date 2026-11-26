import { cn } from '@/lib/utils';

interface PlatformWatermarkProps {
  className?: string;
  heightClass?: string;
  fullWidth?: boolean;
}

/** Theme-aware horizontal wordmark indicating part of Informatics Platform. */
export function PlatformWatermark({
  className,
  heightClass = 'h-4',
  fullWidth = false,
}: PlatformWatermarkProps) {
  const sizeClass = fullWidth ? 'w-full h-auto' : cn(heightClass, 'w-auto');

  return (
    <div
      className={cn(
        fullWidth ? 'flex w-full items-center' : 'inline-flex items-center',
        'opacity-90 select-none',
        className
      )}
    >
      <img
        src="/brand/iflab-platform-dark.svg"
        alt="Informatics Platform"
        loading="lazy"
        decoding="async"
        draggable={false}
        className={cn(sizeClass, 'dark:hidden')}
      />
      <img
        src="/brand/iflab-platform-light.svg"
        alt="Informatics Platform"
        loading="lazy"
        decoding="async"
        draggable={false}
        className={cn(sizeClass, 'hidden dark:block')}
      />
    </div>
  );
}
