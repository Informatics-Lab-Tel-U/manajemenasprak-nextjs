import 'server-only';
import { honoFetch } from '@/lib/honoClient';

export async function getAvailableTerms(): Promise<string[]> {
  const result = await honoFetch<string[]>('/api/tahun-ajaran');
  return result.ok && result.data ? result.data : [];
}

// Module-level cache — reused within the same CF Workers isolate lifetime (per request warm-up)
let termsCache: { data: string[]; ts: number } | null = null;
const TERMS_CACHE_TTL_MS = 60_000; // 60 seconds

export async function getCachedAvailableTerms(): Promise<string[]> {
  const now = Date.now();
  if (termsCache && now - termsCache.ts < TERMS_CACHE_TTL_MS) {
    return termsCache.data;
  }
  const data = await getAvailableTerms();
  termsCache = { data, ts: now };
  return data;
}
