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

  try {
    const upstream = await fetch(new URL(source.pathname + source.search, backendUrl), {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    const responseHeaders = new Headers({ 'Cache-Control': 'private, no-store', Vary: 'Cookie' });
    const responseType = upstream.headers.get('content-type');
    if (responseType) responseHeaders.set('Content-Type', responseType);

    // IWAN responses are not transformed; keep JSON parsing and serialization in the backend.
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { ok: false, error: 'Backend IWAN tidak dapat dihubungi' },
      { status: 502, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}
