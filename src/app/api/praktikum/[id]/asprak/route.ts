import { ProxyValidationError, forwardToHono, sanitizePathSegment } from '@/lib/apiProxy';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const safeId = sanitizePathSegment(id);
    return forwardToHono(request, `/api/praktikum/${encodeURIComponent(safeId)}/asprak`);
  } catch (err) {
    const message = err instanceof ProxyValidationError ? err.message : 'Invalid praktikum ID';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
