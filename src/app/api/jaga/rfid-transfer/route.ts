import { NextRequest } from 'next/server';
import { forwardToHono } from '@/lib/apiProxy';

export const fetchCache = 'force-no-store';

export async function POST(request: NextRequest) {
  return forwardToHono(request, '/api/jaga/rfid-transfer');
}
