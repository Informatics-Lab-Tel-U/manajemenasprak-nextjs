export async function proxyIwanRequest(
  request: Request,
  accessToken: string,
  backendUrl: string,
): Promise<Response> {
  const source = new URL(request.url);
  if (!source.pathname.startsWith('/api/iwan/')) {
    return Response.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  const headers = new Headers({ Authorization: `Bearer ${accessToken}` });
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);

  const rayId = request.headers.get('cf-ray');
  const startedAt = Date.now();
  const failure = (code: string, status: number, error: string, details: Record<string, unknown>) => {
    console.error('[IWAN proxy]', {
      event: 'iwan_proxy_failure', code, rayId, method: request.method,
      path: source.pathname, elapsedWallMs: Date.now() - startedAt, ...details,
    });
    return Response.json(
      { ok: false, error, code },
      { status, headers: {
        'Cache-Control': 'private, no-store', Vary: 'Cookie',
        'X-Iwan-Error-Source': 'proxy', 'X-Iwan-Error-Code': code,
      } },
    );
  };

  try {
    const upstream = await fetch(new URL(source.pathname + source.search, backendUrl), {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(24000),
    });
    if (upstream.status >= 300 && upstream.status < 400 && upstream.status !== 304) {
      void upstream.body?.cancel().catch(() => {});
      return failure('IWAN_UPSTREAM_REDIRECT', 502, 'Backend IWAN mengembalikan redirect yang tidak diizinkan', {
        upstreamStatus: upstream.status,
      });
    }

    const responseHeaders = new Headers({ 'Cache-Control': 'private, no-store', Vary: 'Cookie' });
    if (upstream.status >= 500) {
      responseHeaders.set('X-Iwan-Error-Source', 'upstream');
      console.error('[IWAN proxy]', {
        event: 'iwan_upstream_error', rayId, method: request.method,
        path: source.pathname, upstreamStatus: upstream.status,
        upstreamRayId: upstream.headers.get('cf-ray'), elapsedWallMs: Date.now() - startedAt,
      });
    }
    const responseType = upstream.headers.get('content-type');
    if (responseType) responseHeaders.set('Content-Type', responseType);

    // IWAN responses are not transformed; keep JSON parsing and serialization in the backend.
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : 'UnknownError';
    const message = error instanceof Error ? error.message : 'Unknown proxy failure';
    // Never log credentials or URLs, which may contain sensitive query parameters.
    const safeMessage = (accessToken ? message.replaceAll(accessToken, '[redacted]') : message)
      .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [redacted]')
      .replace(/https?:\/\/[^\s"')]+/gi, '[url]')
      .slice(0, 500);
    const timedOut = name === 'TimeoutError';
    return failure(
      timedOut ? 'IWAN_BACKEND_TIMEOUT' : 'IWAN_PROXY_FAILURE',
      timedOut ? 504 : 502,
      timedOut ? 'Backend IWAN tidak merespons tepat waktu' : 'Backend IWAN tidak dapat dihubungi',
      { errorName: name, errorMessage: safeMessage },
    );
  }
}
