import { NextRequest, NextResponse } from 'next/server';
import { ProxyValidationError, forwardToHono, sanitizePathSegment } from '@/lib/apiProxy';

export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  return forwardToHono(request, '/api/jaga');
}

export async function POST(request: NextRequest) {
  return forwardToHono(request, '/api/jaga');
}

export async function PUT(request: NextRequest) {
  return forwardToHono(request, '/api/jaga');
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (id) {
    try {
      const safeId = sanitizePathSegment(id);
      return forwardToHono(request, `/api/jaga/${encodeURIComponent(safeId)}`);
    } catch (err) {
      const message = err instanceof ProxyValidationError ? err.message : 'Invalid id parameter';
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
  }
  return forwardToHono(request, '/api/jaga');
}
