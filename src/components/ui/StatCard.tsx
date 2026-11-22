import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Badge } from './badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';

export interface StatCardBadge {
  label: string;
  icon?: LucideIcon;
  tone?: 'default' | 'warning';
}

interface StatCardProps {
  title: string;
  value: number | string;
  headline?: string;
  headlineIcon?: LucideIcon;
  description: string;
  badge?: StatCardBadge;
  href?: string;
  loading?: boolean;
  error?: boolean;
}

export function StatCard({
  title,
  value,
  headlineIcon: HeadlineIcon,
  description,
  badge,
  href,
  loading,
  error,
}: StatCardProps) {
  const BadgeIcon = badge?.icon;
  const showBadge = !!badge && !loading && !error;

  const cardBody = (
    <Card
      aria-busy={loading || undefined}
      className={cn(
        '@container/card h-full justify-between bg-transparent border border-border shadow-none py-5 gap-3 transition-colors',
        href && 'group-hover:border-foreground/25 group-focus-visible:border-foreground/40'
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 px-5">
        <div className="min-w-0 space-y-2">
          <CardDescription className="text-sm font-medium text-muted-foreground">
            {title}
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tracking-tight tabular-nums @[220px]/card:text-3xl text-foreground">
            {loading ? (
              <>
                <Skeleton className="h-8 w-16" />
                <span className="sr-only">Memuat {title}</span>
              </>
            ) : error ? (
              '-'
            ) : (
              value
            )}
          </CardTitle>
        </div>

        {HeadlineIcon && (
          <div
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-transparent text-muted-foreground"
          >
            <HeadlineIcon className="size-4" />
          </div>
        )}
      </CardHeader>

      <CardContent className="px-5 flex flex-wrap items-center justify-between gap-2">
        {loading ? (
          <Skeleton className="h-4 w-36" />
        ) : (
          <>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {error ? 'Gagal memuat data. Muat ulang halaman.' : description}
            </p>
            {showBadge && (
              <Badge
                variant="outline"
                className={cn(
                  'bg-transparent',
                  badge.tone === 'warning' &&
                    'border-destructive/50 text-destructive dark:border-destructive/60 dark:text-red-400'
                )}
              >
                {BadgeIcon && <BadgeIcon aria-hidden="true" />}
                {badge.label}
              </Badge>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link
        href={href}
        prefetch={false}
        className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {cardBody}
      </Link>
    );
  }

  return cardBody;
}
