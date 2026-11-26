import { NextRequest, NextResponse } from 'next/server';
import { ProxyValidationError, forwardToHono, sanitizePathSegment } from '@/lib/apiProxy';

export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  return forwardToHono(request, '/api/plotting');
}

export async function POST(request: NextRequest) {
  return forwardToHono(request, '/api/plotting');
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  if (id) {
    try {
      const safeId = sanitizePathSegment(id);
      return forwardToHono(request, `/api/plotting/${encodeURIComponent(safeId)}`);
    } catch (err) {
      const message = err instanceof ProxyValidationError ? err.message : 'Invalid id parameter';
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
  }
  return forwardToHono(request, '/api/plotting/');
}
