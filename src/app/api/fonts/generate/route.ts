import { NextRequest, NextResponse } from 'next/server';
import { requireRoleApi } from '@/lib/auth';

const BACKEND_URL =
  process.env.HONO_BACKEND_URL || 'https://manajemenasprak-backend.iflabdev.workers.dev';

export async function POST(request: NextRequest) {
  const guard = await requireRoleApi(['ADMIN', 'ASLAB']);
  if (!guard.ok) {
    return guard.response;
  }

  const internalApiKey = process.env.INTERNAL_API_KEY || '';
  if (!internalApiKey) {
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_API_KEY is not configured' },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const labId = typeof body?.lab_id === 'string' ? body.lab_id.trim() : '';
  if (!labId) {
    return NextResponse.json({ ok: false, error: 'lab_id wajib diisi' }, { status: 400 });
  }

  const upstream = await fetch(`${BACKEND_URL}/api/fonts/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': internalApiKey,
    },
    body: JSON.stringify({ lab_id: labId }),
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { ok: false, error: 'Gagal men-generate font' },
      { status: upstream.status },
    );
  }

  // Stream biner TTF langsung tanpa buffering + base64 encode di Worker
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'font/ttf',
      'Cache-Control': 'no-store',
    },
  });
}
