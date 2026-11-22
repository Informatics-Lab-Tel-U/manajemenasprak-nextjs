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

export const ALL_MATA_KULIAH_VALUE = '__all_mata_kuliah__';
export const ALL_MODUL_VALUE = '__all_modul__';

export interface JadwalPenggantiOptions {
  mata_kuliah: string[];
  modul: number[];
}

interface JadwalPenggantiFiltersProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  options: JadwalPenggantiOptions;
  mataKuliahFilter: string;
  onMataKuliahFilterChange: (val: string) => void;
  modulFilter: string;
  onModulFilterChange: (val: string) => void;
}

export default function JadwalPenggantiFilters({
  searchQuery,
  onSearchChange,
  options,
  mataKuliahFilter,
  onMataKuliahFilterChange,
  modulFilter,
  onModulFilterChange,
}: JadwalPenggantiFiltersProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      {/* Search */}
      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari mata kuliah, kelas, hari, atau ruangan..."
          className="pl-8"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select
          value={mataKuliahFilter || ALL_MATA_KULIAH_VALUE}
          onValueChange={(value) =>
            onMataKuliahFilterChange(value === ALL_MATA_KULIAH_VALUE ? '' : value)
          }
        >
          <SelectTrigger className="w-full sm:w-[210px]">
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
          value={modulFilter || ALL_MODUL_VALUE}
          onValueChange={(value) =>
            onModulFilterChange(value === ALL_MODUL_VALUE ? '' : value)
          }
        >
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Semua Modul" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_MODUL_VALUE}>Semua Modul</SelectItem>
            {options.modul.map((modulNum) => (
              <SelectItem key={modulNum} value={modulNum.toString()}>
                Modul {modulNum}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
