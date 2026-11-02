import type { LucideIcon } from 'lucide-react';
import { Badge } from './badge';
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
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
  headline: string;
  headlineIcon?: LucideIcon;
  description: string;
  badge?: StatCardBadge;
  loading?: boolean;
  error?: boolean;
}

export function StatCard({
  title,
  value,
  headline,
  headlineIcon: HeadlineIcon,
  description,
  badge,
  loading,
  error,
}: StatCardProps) {
  const BadgeIcon = badge?.icon;
  const showBadge = !!badge && !loading && !error;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {loading ? <Skeleton className="h-8 w-16 2xl:h-10" /> : error ? '-' : value}
        </CardTitle>
        {showBadge && (
          <CardAction>
            <Badge
              variant="outline"
              className={cn(badge.tone === 'warning' && 'border-destructive/40 text-destructive')}
            >
              {BadgeIcon && <BadgeIcon />}
              {badge.label}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        {loading ? (
          <>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-44" />
          </>
        ) : (
          <>
            <div className="line-clamp-1 flex gap-2 font-medium">
              {headline}
              {HeadlineIcon && <HeadlineIcon className="size-4" />}
            </div>
            <div className="text-muted-foreground">
              {error ? 'Data gagal dimuat. Muat ulang halaman.' : description}
            </div>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
