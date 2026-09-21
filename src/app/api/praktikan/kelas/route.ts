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

async function getKelas(mataKuliah: string | null) {
  const url = new URL(`${backendUrl}/api/praktikan`);
  url.searchParams.set('action', 'kelas-by-mk');
  if (mataKuliah) {
    url.searchParams.set('mata_kuliah', mataKuliah);
  }

  const res = await fetch(url.toString(), {
    headers: {
      'x-service-role-key': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },
    cache: 'no-store',
  });

  const json = await res.json();
  return json.data || [];
}

function decodeQueryValue(value: string | null) {
  if (!value) return value;

  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

export async function OPTIONS(request: NextRequest) {
  return praktikanOptionsResponse(request);
}

export async function GET(request: NextRequest) {
  try {
    const authorization = await ensurePraktikanGetAccess(request);
    if ('response' in authorization) return authorization.response;

    const searchParams = request.nextUrl.searchParams;
    const mataKuliah = decodeQueryValue(
      searchParams.get('mata_kuliah') ?? searchParams.get('matakuliah')
    );
    const data = await getKelas(mataKuliah);

    return jsonWithCors({ ok: true, data }, getCorsOrigin(authorization.access));
  } catch (error) {
    return errorResponse(error, 'GET /api/praktikan/kelas error:');
  }
}
