import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MataKuliahWithPraktikum } from '@/services/mataKuliahService';

interface MataKuliahCardProps {
  mk: MataKuliahWithPraktikum;
}

export default function MataKuliahCard({ mk }: MataKuliahCardProps) {
  const isPJJ = mk.program_studi.includes('PJJ');

  return (
    <Card className="gap-3 rounded-md bg-transparent py-4 shadow-none transition-colors hover:border-foreground/20">
      <CardHeader className="gap-2 px-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle
            role="heading"
            aria-level={3}
            title={mk.nama_lengkap}
            className="min-w-0 text-base leading-snug line-clamp-2"
          >
            {mk.nama_lengkap}
          </CardTitle>
          <div className="flex shrink-0 items-center gap-1">
            {isPJJ && (
              <Badge variant="secondary" className="px-1.5">
                PJJ
              </Badge>
            )}
            <Badge variant="outline" className="px-1.5 text-muted-foreground">
              {mk.program_studi}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div className="min-w-0 space-y-0.5">
            <dt className="text-xs text-muted-foreground">Koordinator</dt>
            <dd className="truncate font-medium">{mk.dosen_koor || '-'}</dd>
          </div>
          <div className="min-w-0 space-y-0.5">
            <dt className="text-xs text-muted-foreground">Praktikum</dt>
            <dd className="truncate font-medium">{mk.praktikum.nama}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
