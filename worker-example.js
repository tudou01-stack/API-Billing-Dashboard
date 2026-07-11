const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, New-Api-User',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin'
};

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const requestUrl = new URL(request.url);
  const rawTarget = requestUrl.searchParams.get('url');
  if (!rawTarget) return jsonError('缺少 url 查询参数', 400);

  let target;
  try { target = new URL(rawTarget); }
  catch { return jsonError('url 查询参数不是有效网址', 400); }

  if (!['http:', 'https:'].includes(target.protocol)) {
    return jsonError('仅允许转发 HTTP 或 HTTPS 地址', 400);
  }
  if (target.host === requestUrl.host) {
    return jsonError('禁止将 Worker 转发回自身', 400);
  }

  const headers = new Headers();
  for (const name of ['Authorization', 'Content-Type', 'Accept', 'New-Api-User']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init = { method: request.method, headers, redirect: 'follow' };
  if (!['GET', 'HEAD'].includes(request.method)) init.body = request.body;

  try {
    const upstream = await fetch(target.toString(), init);
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete('set-cookie');
    for (const [name, value] of Object.entries(CORS_HEADERS)) responseHeaders.set(name, value);
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders
    });
  } catch {
    return jsonError('上游请求失败', 502);
  }
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ success: false, message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' }
  });
}
