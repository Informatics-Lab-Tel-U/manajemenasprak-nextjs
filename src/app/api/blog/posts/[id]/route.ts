import { NextRequest, NextResponse } from 'next/server';
import { ProxyValidationError, forwardToHono, sanitizePathSegment } from '@/lib/apiProxy';

export const fetchCache = 'force-no-store';

async function forwardBlogPost(request: NextRequest, params: Promise<{ id: string }>) {
  const { id } = await params;
  try {
    const safeId = sanitizePathSegment(id);
    return forwardToHono(request, `/api/blog/posts/${encodeURIComponent(safeId)}`);
  } catch (err) {
    const message = err instanceof ProxyValidationError ? err.message : 'Invalid post ID';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return forwardBlogPost(request, params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return forwardBlogPost(request, params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return forwardBlogPost(request, params);
}
