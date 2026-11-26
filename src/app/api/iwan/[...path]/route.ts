import { forwardToHono } from '@/lib/apiProxy';
import { NextRequest, NextResponse } from 'next/server';

export const fetchCache = 'force-no-store';

function buildIwanTargetPath(segments: string[] | undefined): string | null {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  if (segments.some((seg) => !seg || seg.includes('/') || seg.includes('\\'))) {
    return null;
  }
  return `/api/iwan/${segments.join('/')}`;
}

async function handleIwanProxy(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
) {
  const { path } = await params;
  const targetPath = buildIwanTargetPath(path);
  if (!targetPath) {
    return NextResponse.json({ ok: false, error: 'Invalid IWAN path' }, { status: 400 });
  }
  return forwardToHono(request, targetPath, { allowedPrefix: '/api/iwan' });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleIwanProxy(request, params);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleIwanProxy(request, params);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleIwanProxy(request, params);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleIwanProxy(request, params);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleIwanProxy(request, params);
}
