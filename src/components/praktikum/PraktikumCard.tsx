import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PraktikumWithStats } from '@/services/praktikumService';

interface PraktikumCardProps {
  praktikum: PraktikumWithStats;
  onClick: (praktikum: PraktikumWithStats) => void;
}

export default function PraktikumCard({ praktikum, onClick }: PraktikumCardProps) {
  const updatedLabel = praktikum.updated_at
    ? format(new Date(praktikum.updated_at), 'dd MMM yyyy', { locale: localeId })
    : '-';

  return (
    <Card className="relative gap-3 rounded-md bg-transparent py-4 shadow-none transition-colors hover:border-foreground/20">
      <CardHeader className="gap-2 px-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle role="heading" aria-level={3} className="min-w-0 text-base leading-snug">
            <button
              type="button"
              onClick={() => onClick(praktikum)}
              className="line-clamp-2 rounded-sm text-left after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {praktikum.nama}
            </button>
          </CardTitle>
          <Badge variant="outline" className="shrink-0 px-1.5 text-muted-foreground">
            {praktikum.tahun_ajaran}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-4">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-0.5">
            <dt className="text-xs text-muted-foreground">Asprak</dt>
            <dd className="font-medium tabular-nums">{praktikum.asprak_count} orang</dd>
          </div>
          <div className="space-y-0.5">
            <dt className="text-xs text-muted-foreground">Diperbarui</dt>
            <dd className="font-medium tabular-nums">{updatedLabel}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
