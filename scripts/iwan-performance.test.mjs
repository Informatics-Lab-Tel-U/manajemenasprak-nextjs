import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextRequest } from 'next/server';
import proxyModule from '../src/lib/iwanProxy.ts';
import pollingModule from '../src/lib/iwanPolling.ts';
import middlewareModule from '../src/lib/supabase/middleware.ts';

const { proxyIwanRequest } = proxyModule;
const { startIwanPolling, fetchIwanData } = pollingModule;
const { updateSession } = middlewareModule;

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.HONO_BACKEND_URL = 'https://backend.test';

const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

function setupPolling(t) {
  const document = new EventTarget();
  document.hidden = false;
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { value: document, configurable: true });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'document', original);
    else delete globalThis.document;
  });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  return document;
}

test('proxy preserves streaming body, query, status and trusted authorization', async (t) => {
  const upstream = new Response('{"ok":false,"error":"Forbidden"}', {
    status: 403,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': 'upstream-secret=1' },
  });
  t.mock.method(upstream, 'json', () => { throw new Error('Proxy must not parse JSON'); });
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url.toString(), 'https://backend.test/api/iwan/devices?roomId=room-1');
    assert.equal(init.headers.get('authorization'), 'Bearer validated-session');
    assert.equal(init.headers.get('cookie'), null);
    assert.equal(init.headers.get('x-service-role-key'), null);
    return upstream;
  });
  const response = await proxyIwanRequest(new Request('https://manas.test/api/iwan/devices?roomId=room-1', {
    headers: { Authorization: 'Bearer attacker', Cookie: 'session=secret', 'x-service-role-key': 'attacker' },
  }), 'validated-session', 'https://backend.test');
  assert.equal(response.body, upstream.body);
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal((await response.json()).error, 'Forbidden');
});

test('proxy forwards mutation method and body without parsing JSON', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    assert.equal(init.method, 'POST');
    assert.equal(init.body, '{"durationMinutes":120}');
    assert.equal(init.headers.get('content-type'), 'application/json');
    return new Response(null, { status: 204 });
  });
  const response = await proxyIwanRequest(new Request('https://manas.test/api/iwan/rooms/room-1/session', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"durationMinutes":120}',
  }), 'session', 'https://backend.test');
  assert.equal(response.status, 204);
  assert.equal(response.body, null);
});

test('proxy rejects paths outside IWAN without contacting the backend', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch');
  const response = await proxyIwanRequest(new Request('https://manas.test/api/auth/me'), 'session', 'https://backend.test');
  assert.equal(response.status, 404);
  assert.equal(fetch.mock.callCount(), 0);
});

test('proxy returns a non-cacheable gateway error on network failure', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Disconnected'); });
  const response = await proxyIwanRequest(new Request('https://manas.test/api/iwan/rooms'), 'session', 'https://backend.test');
  assert.equal(response.status, 502);
  assert.equal((await response.json()).ok, false);
});

test('polling never overlaps and aborts an active request on cleanup', async (t) => {
  setupPolling(t);
  let calls = 0;
  let signal;
  let release;
  const stop = startIwanPolling(async (current) => {
    calls++;
    signal = current;
    await new Promise((resolve) => { release = resolve; });
  }, 5000, assert.fail);
  t.mock.timers.tick(20000);
  assert.equal(calls, 1);
  stop();
  assert.equal(signal.aborted, true);
  release();
  await flush();
  t.mock.timers.tick(60000);
  assert.equal(calls, 1);
});

test('polling pauses while hidden and resumes when visible', async (t) => {
  const document = setupPolling(t);
  let calls = 0;
  const stop = startIwanPolling(async () => { calls++; }, 5000, assert.fail);
  await flush();
  document.hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  t.mock.timers.tick(30000);
  assert.equal(calls, 1);
  document.hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  await flush();
  assert.equal(calls, 2);
  stop();
});

test('polling backs off failures and resets after recovery', async (t) => {
  setupPolling(t);
  let calls = 0;
  let errors = 0;
  const stop = startIwanPolling(async () => {
    calls++;
    if (calls < 3) throw new Error('Worker limit');
  }, 5000, () => { errors++; });
  await flush();
  t.mock.timers.tick(9999);
  assert.equal(calls, 1);
  t.mock.timers.tick(1);
  await flush();
  assert.equal(calls, 2);
  t.mock.timers.tick(19999);
  assert.equal(calls, 2);
  t.mock.timers.tick(1);
  await flush();
  assert.equal(calls, 3);
  t.mock.timers.tick(5000);
  await flush();
  assert.equal(calls, 4);
  assert.equal(errors, 1);
  stop();
});

test('zero-interval resources load without starting a recurring timer', async (t) => {
  setupPolling(t);
  let calls = 0;
  const stop = startIwanPolling(async () => { calls++; }, 0, assert.fail);
  await flush();
  t.mock.timers.tick(60000);
  assert.equal(calls, 1);
  stop();
});

test('initial resources resume after a hide/show while the aborted task is still settling', async (t) => {
  const document = setupPolling(t);
  let calls = 0;
  let release;
  const stop = startIwanPolling(async () => {
    calls++;
    if (calls === 1) await new Promise((resolve) => { release = resolve; });
  }, 0, assert.fail);
  document.hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  document.hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(calls, 1);
  release();
  await flush();
  t.mock.timers.tick(0);
  await flush();
  assert.equal(calls, 2);
  t.mock.timers.tick(60000);
  assert.equal(calls, 2);
  stop();
});

test('fetch helper propagates HTTP and application errors to polling backoff', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('Worker limit', { status: 500 }));
  await assert.rejects(fetchIwanData('/api/iwan/rooms'), /HTTP 500/);
  globalThis.fetch.mock.mockImplementation(async () => Response.json({ ok: false, error: 'Forbidden' }));
  await assert.rejects(fetchIwanData('/api/iwan/rooms'), /Forbidden/);
});

function sessionRequest(path, extraHeaders = {}) {
  const token = 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ sub: 'user-1', exp: 4102444800 })).toString('base64url') + '.test-signature';
  const session = {
    access_token: token, refresh_token: 'test-refresh', expires_at: 4102444800,
    expires_in: 3600, token_type: 'bearer',
    user: { id: 'user-1', email: 'user@test.invalid', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
  };
  return new NextRequest('https://manas.test' + path, { headers: {
    Cookie: 'sb-supabase-auth-token=base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'),
    ...extraHeaders,
  } });
}

let clock = 2000000000000;
function mockMiddlewareBackend(t, { valid = true, maintenance = false, role = 'ASLAB' } = {}) {
  const calls = [];
  clock += 20000;
  t.mock.method(Date, 'now', () => clock);
  t.mock.method(globalThis, 'fetch', async (input) => {
    const url = new URL(typeof input === 'string' ? input : input.url || input.href);
    calls.push(url.pathname);
    if (url.pathname === '/api/system/maintenance') return Response.json({ active: maintenance });
    if (url.pathname === '/api/auth/me') return valid
      ? Response.json({ data: { pengguna: { id: 'user-1', role, status: 'ACTIVE' }, effectiveRole: role } })
      : Response.json({ ok: false }, { status: 401 });
    if (url.pathname === '/api/iwan/rooms') return Response.json({ ok: true, data: [] });
    throw new Error(`Unexpected network call: ${url.pathname}`);
  });
  return calls;
}

test('IWAN middleware returns the proxy response without getUser or a Next route invocation', async (t) => {
  const calls = mockMiddlewareBackend(t);
  const response = await updateSession(sessionRequest('/api/iwan/rooms'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, data: [] });
  assert.equal(response.headers.get('x-middleware-next'), null);
  assert.deepEqual(calls.filter((path) => path !== '/api/system/maintenance'), ['/api/auth/me', '/api/iwan/rooms']);
});

test('IWAN middleware rejects a forged internal header without a session', async (t) => {
  const calls = mockMiddlewareBackend(t);
  const response = await updateSession(new NextRequest('https://manas.test/api/iwan/rooms', {
    headers: { 'x-auth-user': Buffer.from('{"id":"attacker","pengguna":{"role":"ADMIN"}}').toString('base64') },
  }));
  assert.equal(response.status, 401);
  assert.ok(!calls.includes('/api/iwan/rooms'));
});

test('IWAN middleware preserves maintenance restrictions for ASLAB', async (t) => {
  const calls = mockMiddlewareBackend(t, { maintenance: true });
  const response = await updateSession(sessionRequest('/api/iwan/rooms'));
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get('location')).pathname, '/maintenance');
  assert.ok(!calls.includes('/api/iwan/rooms'));
});

test('IWAN middleware allows ADMIN during maintenance', async (t) => {
  mockMiddlewareBackend(t, { maintenance: true, role: 'ADMIN' });
  const response = await updateSession(sessionRequest('/api/iwan/rooms'));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
});

test('IWAN middleware refuses an invalid session before proxying', async (t) => {
  const calls = mockMiddlewareBackend(t, { valid: false });
  const response = await updateSession(sessionRequest('/api/iwan/rooms'));
  assert.equal(response.status, 401);
  assert.ok(!calls.includes('/api/iwan/rooms'));
});
