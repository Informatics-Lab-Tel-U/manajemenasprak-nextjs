import { NextRequest } from 'next/server';

import {
  ensurePraktikanGetAccess,
  errorResponse,
  getCorsOrigin,
  jsonWithCors,
  praktikanOptionsResponse,
} from '../_access';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const backendUrl = process.env.HONO_BACKEND_URL || 'https://manajemenasprak-backend.iflabdev.workers.dev';

async function getMataKuliah() {
  const url = new URL(`${backendUrl}/api/praktikan`);
  url.searchParams.set('action', 'options');

  const res = await fetch(url.toString(), {
    headers: {
      'x-service-role-key': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },
    cache: 'no-store',
  });

  const json = await res.json();
  return json.data?.mata_kuliah || [];
}

export async function OPTIONS(request: NextRequest) {
  return praktikanOptionsResponse(request);
}

export async function GET(request: NextRequest) {
  try {
    const authorization = await ensurePraktikanGetAccess(request);
    if ('response' in authorization) return authorization.response;

    const data = await getMataKuliah();
    return jsonWithCors({ ok: true, data }, getCorsOrigin(authorization.access));
  } catch (error) {
    return errorResponse(error, 'GET /api/praktikan/mata-kuliah error:');
  }
}
