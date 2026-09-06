import { NextRequest } from 'next/server';
import { forwardToHono } from '@/lib/apiProxy';

export const fetchCache = 'force-no-store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return forwardToHono(request, `/api/admin/users/${id}/restore`);
}
