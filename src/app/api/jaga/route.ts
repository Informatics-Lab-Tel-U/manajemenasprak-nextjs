import { NextRequest } from 'next/server';
import { forwardToHono } from '@/lib/apiProxy';

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
    return forwardToHono(request, `/api/jaga/${id}`);
  }
  return forwardToHono(request, '/api/jaga');
}

