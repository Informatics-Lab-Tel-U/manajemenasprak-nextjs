import { LucideIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardFooter } from './card';
import { Badge } from './badge';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: LucideIcon;
  trend?: string;
  color: 'purple' | 'blue' | 'green' | 'red';
  loading?: boolean;
}

const colorClasses: Record<
  string,
  { icon: string; badge: string; border: string; gradient: string }
> = {
  purple: {
    icon: 'text-violet-600 bg-violet-100 dark:text-violet-300 dark:bg-violet-500/20',
    badge:
      'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20',
    border: 'border-violet-200/50 dark:border-violet-500/20',
    gradient: 'from-violet-500 to-purple-500 bg-gradient-to-br',
  },
  blue: {
    icon: 'text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-500/20',
    badge:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20',
    border: 'border-blue-200/50 dark:border-blue-500/20',
    gradient: 'from-blue-500 to-cyan-500 bg-gradient-to-br',
  },
  green: {
    icon: 'text-emerald-600 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-500/20',
    badge:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
    border: 'border-emerald-200/50 dark:border-emerald-500/20',
    gradient: 'from-emerald-500 to-green-500 bg-gradient-to-br',
  },
  red: {
    icon: 'text-destructive bg-destructive/10 dark:text-red-300 dark:bg-destructive/20',
    badge:
      'bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/10 dark:text-red-300 dark:border-red-500/20',
    border: 'border-destructive/20 dark:border-red-500/20',
    gradient: 'from-red-500 to-orange-500 bg-gradient-to-br',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color,
  loading,
}: StatCardProps) {
  const textColor = 
    color === 'purple' ? 'text-violet-500 dark:text-violet-400' : 
    color === 'blue' ? 'text-blue-500 dark:text-blue-400' : 
    color === 'green' ? 'text-emerald-500 dark:text-emerald-400' : 
    'text-destructive';

  return (
    <Card className="@container/card bg-card shadow-sm">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {loading ? <Skeleton className="h-8 2xl:h-10 w-16" /> : value}
        </CardTitle>
        <CardAction>
          {trend ? (
            <Badge variant="outline" className={textColor}>
              <Icon />
              {trend}
            </Badge>
          ) : (
            <div className={cn("p-2 rounded-full bg-muted/50", textColor)}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          {subtitle}
        </div>
      </CardFooter>
    </Card>
  );
}
