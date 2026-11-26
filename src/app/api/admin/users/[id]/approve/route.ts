import { NextRequest, NextResponse } from 'next/server';
import { ProxyValidationError, forwardToHono, sanitizePathSegment } from '@/lib/apiProxy';

export const fetchCache = 'force-no-store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const safeId = sanitizePathSegment(id);
    return forwardToHono(request, `/api/admin/users/${encodeURIComponent(safeId)}/approve`);
  } catch (err) {
    const message = err instanceof ProxyValidationError ? err.message : 'Invalid user ID';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
