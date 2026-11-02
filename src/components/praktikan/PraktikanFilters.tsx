'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PraktikanOptions } from './types';

export const ALL_KELAS_VALUE = '__all_kelas__';
export const ALL_MATA_KULIAH_VALUE = '__all_mata_kuliah__';

interface PraktikanFiltersProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  options: PraktikanOptions;
  mataKuliahFilter: string;
  onMataKuliahFilterChange: (val: string) => void;
  kelasFilter: string;
  onKelasFilterChange: (val: string) => void;
}

export default function PraktikanFilters({
  searchQuery,
  onSearchChange,
  options,
  mataKuliahFilter,
  onMataKuliahFilterChange,
  kelasFilter,
  onKelasFilterChange,
}: PraktikanFiltersProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari nama, kelas, mata kuliah, atau kode asprak..."
          className="pl-8"
        />
      </div>

      <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row">
        <Select
          value={mataKuliahFilter || ALL_MATA_KULIAH_VALUE}
          onValueChange={(value) =>
            onMataKuliahFilterChange(value === ALL_MATA_KULIAH_VALUE ? '' : value)
          }
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Semua Mata Kuliah" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_MATA_KULIAH_VALUE}>Semua Mata Kuliah</SelectItem>
            {options.mata_kuliah.map((mk) => (
              <SelectItem key={mk} value={mk}>
                {mk}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={kelasFilter || ALL_KELAS_VALUE}
          onValueChange={(value) =>
            onKelasFilterChange(value === ALL_KELAS_VALUE ? '' : value)
          }
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Semua Kelas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_KELAS_VALUE}>Semua Kelas</SelectItem>
            {options.kelas.map((kelas) => (
              <SelectItem key={kelas} value={kelas}>
                {kelas}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
