/* eslint-disable react-doctor/exhaustive-deps */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Jadwal, JadwalPengganti } from '@/types/database';
import * as jadwalFetcher from '@/lib/fetchers/jadwalFetcher';
import type { DashboardStats } from '@/services/databaseService';
import { useTermStore } from '@/store/useTermStore';

export interface UseDashboardResult {
  terms: string[];
  selectedTerm: string;
  stats: DashboardStats;
  rawJadwal: Jadwal[];
  jadwalPengganti: JadwalPengganti[];
  loading: boolean;
  error: Error | null;
}

export function useDashboard(
  initialTerms: string[] = [],
  initialStats: DashboardStats | null = null,
  initialJadwal: Jadwal[] = [],
  initialPengganti: JadwalPengganti[] = [],
  activeModul = 1
): UseDashboardResult {
  const [terms] = useState<string[]>(initialTerms);
  const { activeTerm } = useTermStore();
  const selectedTerm =
    activeTerm && initialTerms.includes(activeTerm)
      ? activeTerm
      : initialTerms[0] ?? '';

  const safeInitialStats: DashboardStats = initialStats ?? {
    asprakCount: 0,
    jadwalCount: 0,
    pelanggaranCount: 0,
    asprakByAngkatan: [],
    jadwalByDay: [],
  };

  const [rawJadwal, setRawJadwal] = useState<Jadwal[]>(initialJadwal ?? []);
  const [jadwalPengganti, setJadwalPengganti] = useState<JadwalPengganti[]>(initialPengganti ?? []);
  const [stats, setStats] = useState<DashboardStats>(safeInitialStats);
  const [loading, setLoading] = useState(Boolean(selectedTerm));
  const [error, setError] = useState<Error | null>(null);

  const lastFetchedTermRef = useRef<string>(initialTerms[0] ?? '');

  const fetchDashboardData = useCallback(
    async (term: string) => {
      if (!term) return;
      if (term === lastFetchedTermRef.current) return;

      setLoading(true);
      try {
        const [jadwalResult, penggantiResult, statsRes] = await Promise.all([
          jadwalFetcher.fetchJadwalByTerm(term),
          jadwalFetcher.fetchJadwalPengganti(activeModul),
          fetch(`/api/stats?term=${encodeURIComponent(term)}`),
        ]);

        if (jadwalResult.ok && jadwalResult.data) {
          setRawJadwal(jadwalResult.data);
        }

        if (penggantiResult.ok && penggantiResult.data) {
          setJadwalPengganti(penggantiResult.data);
        }

        const statsJson = await statsRes.json();
        if (statsJson?.ok && statsJson.data) {
          setStats(statsJson.data as DashboardStats);
        }

        lastFetchedTermRef.current = term;
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err);
        } else {
          setError(new Error('An unknown error occurred'));
        }
      } finally {
        setLoading(false);
      }
    },
    [activeModul]
  );

  useEffect(() => {
    if (!selectedTerm) return;
    fetchDashboardData(selectedTerm);
  }, [selectedTerm, fetchDashboardData]);

  return {
    terms,
    selectedTerm,
    stats,
    rawJadwal,
    jadwalPengganti,
    loading,
    error,
  };
}
