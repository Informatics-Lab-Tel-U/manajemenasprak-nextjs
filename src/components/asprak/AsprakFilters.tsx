import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AsprakFiltersProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  hideSearch?: boolean;
}

export default function AsprakFilters({
  searchQuery,
  onSearchChange,
  hideSearch = false,
}: AsprakFiltersProps) {
  return (
    <div
      className={`flex flex-col gap-2 sm:flex-row sm:items-center ${hideSearch ? 'justify-end' : ''}`}
    >
      {!hideSearch && (
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari..."
            value={searchQuery || ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-8"
          />
        </div>
      )}
    </div>
  );
}
