import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import * as apiProxy from "../src/lib/apiProxy.ts";
import { proxyIwanRequest } from "../src/lib/iwanProxy.ts";
import { updateSession } from "../src/lib/supabase/middleware.ts";
import * as iwanRoute from "../src/app/api/iwan/[...path]/route.ts";
import * as utilRoute from "../src/app/api/util/[...path]/route.ts";
import * as praktikanRoute from "../src/app/api/praktikan/route.ts";
import * as praktikanKelasRoute from "../src/app/api/praktikan/kelas/route.ts";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.HONO_BACKEND_URL = "https://backend.test";
process.env.PRAKTIKAN_GET_API_KEY = "praktikan-read-key-123";
process.env.SUPABASE_SERVICE_ROLE_KEY = "svc-role-secret";

function makeJwt(sub = "user-1") {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub, exp: 4102444800 })}.sig`;
}

function makeSessionRequest(url, init = {}) {
  const token = makeJwt("user-1");
  const session = {
    access_token: token,
    refresh_token: "test-refresh",
    expires_at: 4102444800,
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: "user-1",
      email: "user@lab.test",
      aud: "authenticated",
      app_metadata: { provider: "microsoft" },
      user_metadata: {},
      created_at: "2026-01-01T00:00:00Z",
    },
  };
  const headers = new Headers(init.headers);
  if (!headers.has("cookie")) {
    headers.set(
      "cookie",
      "sb-supabase-auth-token=base64-" + Buffer.from(JSON.stringify(session)).toString("base64url")
    );
  }
  return new NextRequest(url, { ...init, headers });
}

test("sanitizeProxyPath locks prefixes and rejects traversal, encoding evasion, backslashes, @, and control chars", () => {
  assert.equal(typeof apiProxy.sanitizeProxyPath, "function");
  assert.equal(apiProxy.sanitizeProxyPath("/api/iwan", "/api/iwan/rooms"), "/api/iwan/rooms");
  assert.equal(apiProxy.sanitizeProxyPath("/api/iwan", "rooms/room-1"), "/api/iwan/rooms/room-1");
  assert.equal(apiProxy.sanitizeProxyPath("/api/util", "/api/util/parse"), "/api/util/parse");
  assert.equal(apiProxy.sanitizeProxyPath("/api", "/api/plotting/"), "/api/plotting/");

  const invalidForIwan = [
    "/api/iwan/../admin/users",
    "/api/iwan/%2e%2e/admin/users",
    "/api/iwan/%252e%252e/admin/users",
    "/api/iwan/..%2fadmin",
    "/api/iwan/\\admin",
    "/api/iwan/%5cadmin",
    "/api/iwan/rooms\x00admin",
    "/api/iwan/rooms\r\nx",
    "/api/iwan/rooms@evil.com",
    "/api/iwan//evil.com",
    "//evil.com/api/iwan/rooms",
    "https://evil.com/api/iwan/rooms",
    "/api/admin/users",
    "/api/util/parse",
  ];

  for (const payload of invalidForIwan) {
    assert.throws(
      () => apiProxy.sanitizeProxyPath("/api/iwan", payload),
      (err) => err instanceof Error,
      `Expected /api/iwan sanitizeProxyPath to reject ${JSON.stringify(payload)}`
    );
  }
});

test("buildSafeForwardHeaders strips spoofable trust headers and gates x-praktikan-api-key", () => {
  assert.equal(typeof apiProxy.buildSafeForwardHeaders, "function");
  const req = new NextRequest("https://manas.test/api/admin/users", {
    method: "POST",
    headers: {
      authorization: "Bearer user-jwt",
      "content-type": "application/json",
      accept: "application/json",
      "x-service-role-key": "evil-svc",
      "x-api-key": "evil-api",
      "x-praktikan-api-key": "client-praktikan-key",
      "x-auth-user": "spoofed-b64",
      "x-intern-user-role": "ADMIN",
      "x-http-method-override": "DELETE",
      "x-forwarded-for": "127.0.0.1",
      cookie: "sb-secret=1",
      "x-middleware-subrequest": "middleware",
    },
  });

  const defaultHeaders = apiProxy.buildSafeForwardHeaders(req, {
    authHeader: "Bearer user-jwt",
    hasBody: true,
  });

  assert.equal(defaultHeaders.get("authorization"), "Bearer user-jwt");
  assert.equal(defaultHeaders.get("content-type"), "application/json");
  assert.equal(defaultHeaders.get("accept"), "application/json");
  for (const stripped of [
    "x-service-role-key",
    "x-api-key",
    "x-praktikan-api-key",
    "x-auth-user",
    "x-intern-user-role",
    "x-http-method-override",
    "x-forwarded-for",
    "cookie",
    "x-middleware-subrequest",
  ]) {
    assert.equal(defaultHeaders.get(stripped), null, `Header ${stripped} must not be forwarded`);
  }

  const getReq = new NextRequest("https://manas.test/api/praktikan", {
    method: "GET",
    headers: req.headers,
  });
  const permittedHeaders = apiProxy.buildSafeForwardHeaders(getReq, {
    authHeader: "Bearer user-jwt",
    hasBody: false,
    allowPraktikanApiKey: true,
  });
  assert.equal(permittedHeaders.get("x-praktikan-api-key"), "client-praktikan-key");
  assert.equal(permittedHeaders.get("x-api-key"), null);
  assert.equal(permittedHeaders.get("x-service-role-key"), null);

  const postPermittedHeaders = apiProxy.buildSafeForwardHeaders(req, {
    authHeader: "Bearer user-jwt",
    hasBody: true,
    allowPraktikanApiKey: true,
  });
  assert.equal(postPermittedHeaders.get("x-praktikan-api-key"), null);
});

test("forwardToHono rejects traversal, encoding evasion, backslash, control chars, and prefix escape before fetch", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("fetch should never be called");
  });

  const req = new NextRequest("https://manas.test/api/iwan/rooms", {
    headers: { authorization: `Bearer ${makeJwt()}` },
  });

  for (const badPath of [
    "/api/iwan/../admin/users",
    "/api/iwan/%2e%2e/admin/users",
    "/api/iwan/%252e%252e/admin/users",
    "/api/iwan/\\admin",
    "/api/iwan/rooms\x00",
    "/api/iwan/rooms@evil.com",
    "//evil.com/leak",
    "/api/admin/users",
  ]) {
    const res = await apiProxy.forwardToHono(req, badPath);
    assert.equal(res.status, 400, `Expected 400 for ${JSON.stringify(badPath)}, got ${res.status}`);
  }

  assert.equal(fetchMock.mock.callCount(), 0);
});

test("forwardToHono strips spoofed trust headers, locks target origin/prefix, rejects 3xx redirects, and streams body with duplex: half", async (t) => {
  const captured = [];
  t.mock.method(globalThis, "fetch", async (input, init = {}) => {
    const urlStr = typeof input === "string" ? input : input.url || input.href;
    captured.push({ url: urlStr, init });
    if (urlStr.includes("/api/util/redirect")) {
      return new Response(null, {
        status: 302,
        headers: { Location: "https://evil.test/leak" },
      });
    }
    return Response.json({ ok: true });
  });

  const stream = new ReadableStream({
    start(c) {
      c.enqueue(new TextEncoder().encode('{"ok":1}'));
      c.close();
    },
  });

  const req = new NextRequest("https://manas.test/api/util/parse?sheet=1", {
    method: "POST",
    headers: {
      authorization: `Bearer ${makeJwt()}`,
      "content-type": "application/json",
      "x-service-role-key": "evil-svc",
      "x-api-key": "evil-api",
      "x-praktikan-api-key": "evil-praktikan",
      "x-auth-user": Buffer.from(JSON.stringify({ token: makeJwt("forged") })).toString("base64"),
      "x-intern-user-role": "ADMIN",
      "x-http-method-override": "DELETE",
      "x-forwarded-for": "127.0.0.1",
      cookie: "sb-secret=1",
    },
    body: stream,
    duplex: "half",
  });

  const okRes = await apiProxy.forwardToHono(req, "/api/util/parse", { allowedPrefix: "/api/util" });
  assert.equal(okRes.status, 200);
  assert.equal(captured.length, 1);

  const outUrl = new URL(captured[0].url);
  assert.equal(outUrl.origin, "https://backend.test");
  assert.ok(outUrl.pathname.startsWith("/api/util/"));
  assert.equal(captured[0].init.redirect, "manual");
  assert.equal(captured[0].init.duplex, "half");
  assert.ok(captured[0].init.body instanceof ReadableStream);

  const outHeaders = new Headers(captured[0].init.headers);
  assert.equal(outHeaders.get("x-service-role-key"), null);
  assert.equal(outHeaders.get("x-api-key"), null);
  assert.equal(outHeaders.get("x-praktikan-api-key"), null);
  assert.equal(outHeaders.get("x-auth-user"), null);
  assert.equal(outHeaders.get("x-intern-user-role"), null);
  assert.equal(outHeaders.get("x-http-method-override"), null);
  assert.equal(outHeaders.get("x-forwarded-for"), null);
  assert.equal(outHeaders.get("cookie"), null);

  const redirReq = new NextRequest("https://manas.test/api/util/redirect", {
    headers: { authorization: `Bearer ${makeJwt()}` },
  });
  const redirRes = await apiProxy.forwardToHono(redirReq, "/api/util/redirect", {
    allowedPrefix: "/api/util",
  });
  assert.equal(redirRes.status, 502);
  assert.equal(redirRes.headers.get("location"), null);
});

test("catch-all route handlers /api/iwan/[...path] and /api/util/[...path] reject traversal segments", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json({ ok: true }));

  const iwanReq = new NextRequest("https://manas.test/api/iwan/%2e%2e/admin/users");
  const iwanRes = await iwanRoute.GET(iwanReq, {
    params: Promise.resolve({ path: ["%2e%2e", "admin", "users"] }),
  });
  assert.equal(iwanRes.status, 400);

  const utilReq = new NextRequest("https://manas.test/api/util/../system/stats");
  const utilRes = await utilRoute.POST(utilReq, {
    params: Promise.resolve({ path: ["..", "system", "stats"] }),
  });
  assert.equal(utilRes.status, 400);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("praktikan GET preserves explicit x-praktikan-api-key callers while POST strips it", async (t) => {
  const seen = [];
  t.mock.method(globalThis, "fetch", async (input, init = {}) => {
    const urlStr = typeof input === "string" ? input : input.url || input.href;
    seen.push({ url: urlStr, headers: new Headers(init.headers) });
    return Response.json({ ok: true, data: [] });
  });

  const getReq = new NextRequest("https://manas.test/api/praktikan", {
    method: "GET",
    headers: { "x-praktikan-api-key": "legit-praktikan-key", "x-api-key": "spoof-api-key" },
  });
  const getRes = await praktikanRoute.GET(getReq);
  assert.equal(getRes.status, 200);
  assert.equal(seen[0].headers.get("x-praktikan-api-key"), "legit-praktikan-key");
  assert.equal(seen[0].headers.get("x-api-key"), null);

  const postReq = new NextRequest("https://manas.test/api/praktikan", {
    method: "POST",
    headers: {
      authorization: `Bearer ${makeJwt()}`,
      "content-type": "application/json",
      "x-praktikan-api-key": "spoof-praktikan-key",
    },
    body: JSON.stringify({ nama: "Test" }),
  });
  const postRes = await praktikanRoute.POST(postReq);
  assert.equal(postRes.status, 200);
  assert.equal(seen[1].headers.get("x-praktikan-api-key"), null);

  const kelasReq = new NextRequest("https://manas.test/api/praktikan/kelas", {
    method: "GET",
    headers: { "x-praktikan-api-key": "praktikan-read-key-123" },
  });
  const kelasRes = await praktikanKelasRoute.GET(kelasReq);
  assert.equal(kelasRes.status, 200);
});

test("proxyIwanRequest rejects encoded traversal, backslash, and control chars before fetch", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("fetch should never be called");
  });

  // Direct unnormalized URL (e.g. raw proxy/edge request before URL canonicalization)
  const rawTraversalRes = await proxyIwanRequest(
    {
      url: "https://manas.test/api/iwan/%2e%2e/admin/users",
      method: "GET",
      headers: new Headers(),
      body: null,
    },
    "validated-session",
    "https://backend.test"
  );
  assert.equal(rawTraversalRes.status, 400);

  for (const path of [
    "/api/iwan/%252e%252e/admin/users",
    "/api/iwan/..%2fadmin",
    "/api/iwan/%5cadmin",
    "/api/iwan/rooms%00",
    "/api/iwan/rooms@evil.com",
  ]) {
    const res = await proxyIwanRequest(
      new Request(`https://manas.test${path}`),
      "validated-session",
      "https://backend.test"
    );
    assert.equal(res.status, 400, `Expected 400 for ${path}, got ${res.status}`);
  }

  assert.equal(fetchMock.mock.callCount(), 0);
});

test("updateSession scrubs spoofed internal headers even on fast-path/OPTIONS/monitoring/praktikan routes and resists x-middleware-subrequest", async (t) => {
  let clock = 2500000000000;
  t.mock.method(Date, "now", () => (clock += 40000));
  t.mock.method(globalThis, "fetch", async (input) => {
    const url = new URL(typeof input === "string" ? input : input.url || input.href);
    if (url.pathname === "/api/system/maintenance") {
      return Response.json({ active: false });
    }
    if (url.pathname === "/auth/v1/user") {
      return Response.json({
        id: "user-1",
        email: "user@lab.test",
        aud: "authenticated",
        app_metadata: { provider: "microsoft" },
        user_metadata: {},
      });
    }
    if (url.pathname === "/api/auth/me") {
      return Response.json({
        data: { pengguna: { id: "user-1", role: "ADMIN", status: "ACTIVE" }, effectiveRole: "ADMIN" },
      });
    }
    throw new Error(`Unexpected fetch to ${url.pathname}`);
  });

  const spoofedHeaders = {
    "x-auth-user": Buffer.from(JSON.stringify({ id: "attacker", pengguna: { role: "ADMIN" } })).toString("base64"),
    "x-api-key": "spoofed-api-key",
    "x-service-role-key": "spoofed-svc-key",
    "x-intern-user-role": "ADMIN",
    "x-http-method-override": "DELETE",
    "x-middleware-subrequest": "middleware:middleware:middleware",
  };

  const fastPaths = [
    { method: "OPTIONS", url: "https://manas.test/api/praktikan/kelas" },
    { method: "POST", url: "https://manas.test/api/monitoring/heartbeat" },
    { method: "GET", url: "https://manas.test/api/monitoring/status" },
    {
      method: "GET",
      url: "https://manas.test/api/praktikan/kelas",
      extra: { "x-praktikan-api-key": "praktikan-read-key-123" },
    },
  ];

  for (const fp of fastPaths) {
    const req = new NextRequest(fp.url, {
      method: fp.method,
      headers: { ...spoofedHeaders, ...(fp.extra || {}) },
    });
    const res = await updateSession(req);
    assert.equal(res.status, 200);
    for (const h of [
      "x-auth-user",
      "x-api-key",
      "x-service-role-key",
      "x-intern-user-role",
      "x-http-method-override",
      "x-middleware-subrequest",
    ]) {
      assert.equal(
        res.headers.get(`x-middleware-request-${h}`),
        null,
        `Header ${h} must be scrubbed on ${fp.method} ${fp.url}`
      );
    }
    if (fp.extra?.["x-praktikan-api-key"]) {
      assert.equal(
        res.headers.get("x-middleware-request-x-praktikan-api-key"),
        "praktikan-read-key-123"
      );
    }
  }

  // x-middleware-subrequest must not bypass authentication on protected API or page routes
  const unauthApi = new NextRequest("https://manas.test/api/admin/users", {
    headers: spoofedHeaders,
  });
  const unauthApiRes = await updateSession(unauthApi);
  assert.equal(unauthApiRes.status, 401);

  const unauthPage = new NextRequest("https://manas.test/pengaturan", {
    headers: spoofedHeaders,
  });
  const unauthPageRes = await updateSession(unauthPage);
  assert.equal(unauthPageRes.status, 307);
  assert.equal(new URL(unauthPageRes.headers.get("location")).pathname, "/login");

  // Authenticated non-IWAN API request scrubs client spoofed headers while setting verified x-auth-user
  const authedReq = makeSessionRequest("https://manas.test/api/admin/users", {
    headers: spoofedHeaders,
  });
  const authedRes = await updateSession(authedReq);
  assert.equal(authedRes.status, 200);
  for (const h of [
    "x-api-key",
    "x-service-role-key",
    "x-intern-user-role",
    "x-http-method-override",
    "x-middleware-subrequest",
  ]) {
    assert.equal(authedRes.headers.get(`x-middleware-request-${h}`), null);
  }
  const verifiedAuthUser = JSON.parse(
    Buffer.from(authedRes.headers.get("x-middleware-request-x-auth-user"), "base64").toString("utf8")
  );
  assert.equal(verifiedAuthUser.id, "user-1");
  assert.equal(verifiedAuthUser.pengguna.role, "ADMIN");
});
