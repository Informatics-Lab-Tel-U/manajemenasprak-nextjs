import { NextRequest, NextResponse } from 'next/server';
import { requireRoleApi } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const fetchCache = 'force-no-store';

const CONFIG_KEY = 'caslab_plotting_state';

export async function GET() {
  try {
    const guard = await requireRoleApi(['ADMIN', 'ASLAB']);
    if (!guard.ok) {
      return guard.response;
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('web_config')
      .select('value, updated_at')
      .eq('key', CONFIG_KEY)
      .maybeSingle();

    if (error) {
      console.error('Error fetching caslab plotting state from DB:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data || !data.value) {
      return NextResponse.json({ ok: true, data: null });
    }

    let parsed = null;
    try {
      parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    } catch {
      parsed = data.value;
    }

    return NextResponse.json({
      ok: true,
      data: parsed,
      updatedAt: data.updated_at,
    });
  } catch (err: any) {
    console.error('Unexpected error in GET /api/caslab:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireRoleApi(['ADMIN', 'ASLAB']);
    if (!guard.ok) {
      return guard.response;
    }

    const payload = await request.json();
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ ok: false, error: 'Payload tidak valid.' }, { status: 400 });
    }

    const valueStr = JSON.stringify({
      candidates: payload.candidates ?? [],
      numRooms: payload.numRooms ?? 2,
      seatingMode: payload.seatingMode ?? 'spaced',
      rooms: payload.rooms ?? [],
      allocations: payload.allocations ?? [],
      historyVersion: payload.historyVersion ?? 0,
    });

    const nowIso = new Date().toISOString();
    const supabase = createAdminClient();

    const { error } = await supabase.from('web_config').upsert(
      {
        key: CONFIG_KEY,
        value: valueStr,
        updated_at: nowIso,
      },
      { onConflict: 'key' }
    );

    if (error) {
      console.error('Error saving caslab plotting state to DB:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: 'Data plotting berhasil disimpan ke database.',
      updatedAt: nowIso,
    });
  } catch (err: any) {
    console.error('Unexpected error in POST /api/caslab:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const guard = await requireRoleApi(['ADMIN', 'ASLAB']);
    if (!guard.ok) {
      return guard.response;
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('web_config').delete().eq('key', CONFIG_KEY);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: 'Data plotting di database berhasil direset.',
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

