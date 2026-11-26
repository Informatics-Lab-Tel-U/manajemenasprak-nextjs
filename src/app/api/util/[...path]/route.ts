import { NextRequest, NextResponse } from 'next/server';
import { forwardToHono } from '@/lib/apiProxy';

export const fetchCache = 'force-no-store';

function buildUtilTargetPath(segments: string[] | undefined): string | null {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  if (segments.some((seg) => !seg || seg.includes('/') || seg.includes('\\'))) {
    return null;
  }
  return `/api/util/${segments.join('/')}`;
}

async function handleUtilProxy(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
) {
  const { path } = await params;
  const targetPath = buildUtilTargetPath(path);
  if (!targetPath) {
    return NextResponse.json({ ok: false, error: 'Invalid utility path' }, { status: 400 });
  }
  return forwardToHono(request, targetPath, { allowedPrefix: '/api/util' });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleUtilProxy(request, params);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleUtilProxy(request, params);
}
