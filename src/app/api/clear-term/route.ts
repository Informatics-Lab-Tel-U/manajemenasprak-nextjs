import { forwardToHono } from '@/lib/apiProxy';
import { NextRequest } from 'next/server';

export const fetchCache = 'force-no-store';

export async function POST(request: NextRequest) {
  const body = await request.clone().json().catch(() => ({}));
  const term = typeof body?.term === 'string' ? body.term : '';
  return forwardToHono(request, '/api/system/clear-term', {
    customSearch: `term=${encodeURIComponent(term)}`,
  });
}
