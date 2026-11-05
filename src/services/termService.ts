import 'server-only';
import { honoFetch } from '@/lib/honoClient';

export async function getAvailableTerms(): Promise<string[]> {
  const result = await honoFetch<string[]>('/api/tahun-ajaran');
  return result.ok && result.data ? result.data : [];
}

export const getCachedAvailableTerms = async (): Promise<string[]> => {
  return getAvailableTerms();
};
