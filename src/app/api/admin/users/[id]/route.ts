import { NextRequest, NextResponse } from 'next/server';
import { ProxyValidationError, forwardToHono, sanitizePathSegment } from '@/lib/apiProxy';

export const fetchCache = 'force-no-store';

function resolveUserTargetPath(id: string, suffix = ''): string | NextResponse {
  try {
    const safeId = sanitizePathSegment(id);
    return `/api/admin/users/${encodeURIComponent(safeId)}${suffix}`;
  } catch (err) {
    const message = err instanceof ProxyValidationError ? err.message : 'Invalid user ID';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const target = resolveUserTargetPath(id);
  if (target instanceof NextResponse) return target;
  return forwardToHono(request, target);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const target = resolveUserTargetPath(id);
  if (target instanceof NextResponse) return target;
  return forwardToHono(request, target);
}
