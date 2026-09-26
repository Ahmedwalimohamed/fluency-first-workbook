'use strict';

// Dedicated authenticated Jev relay for EnglishGate course-fit decisions.
const http = require('http');

const PORT = Number(process.env.PORT || 3000);
const API_KEY = String(process.env.TYPESAFE_API_KEY || '').trim();
const MODEL = String(process.env.TYPESAFE_MODEL || 'jev-latest').trim();
const RELAY_SECRET = String(process.env.COURSE_FIT_RELAY_SECRET || '').trim();

function resolveEndpoint(raw) {
  const value = String(raw || '').trim().replace(/\/+$/, '');
  if (!value) return 'https://api.typesafe.ai/v1/systemone';
  if (value.endsWith('/v1/systemone')) return value;
  if (value.endsWith('/v1')) return `${value}/systemone`;
  return `${value}/v1/systemone`;
}

const API_URL = resolveEndpoint(process.env.TYPESAFE_API_URL);

function send(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  res.end(JSON.stringify(body));
}

function suppliedSecret(req) {
  const auth = String(req.headers.authorization || '');
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1] || '';
  return String(req.headers['x-course-fit-secret'] || bearer || '').trim();
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new Error('payload_too_large');
  }
  return JSON.parse(raw || '{}');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/healthz') {
    const configured = Boolean(API_KEY && RELAY_SECRET);
    return send(res, configured ? 200 : 503, {
      ok: configured,
      configured,
      model: MODEL,
      role: 'jev-course-fit-relay'
    });
  }

  if (req.method !== 'POST' || url.pathname !== '/course-fit') {
    return send(res, 404, { ok: false, error: 'not_found' });
  }

  if (!RELAY_SECRET || suppliedSecret(req) !== RELAY_SECRET) {
    return send(res, 403, { ok: false, error: 'forbidden' });
  }

  if (!API_KEY) return send(res, 503, { ok: false, error: 'jev_unconfigured' });

  let body;
  try {
    body = await readJson(req);
  } catch {
    return send(res, 400, { ok: false, error: 'invalid_json' });
  }

  if (!body.state || !body.questions || typeof body.questions !== 'object') {
    return send(res, 400, { ok: false, error: 'invalid_payload' });
  }

  try {
    const upstream = await fetch(API_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${API_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        state: body.state,
        questions: body.questions
      }),
      signal: AbortSignal.timeout(15000)
    });

    const text = await upstream.text();
    let data = {};
    try { data = JSON.parse(text); } catch { data = { error: text.slice(0, 500) }; }

    if (!upstream.ok) {
      return send(res, 502, {
        ok: false,
        error: data.detail || data.error || `HTTP ${upstream.status}`
      });
    }

    return send(res, 200, {
      model: data.model || MODEL,
      answers: data.answers || {},
      usage: data.usage || {}
    });
  } catch (error) {
    return send(res, 502, { ok: false, error: String(error?.message || error) });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({
    type: 'ready',
    role: 'jev-course-fit-relay',
    port: PORT,
    model: MODEL,
    configured: Boolean(API_KEY && RELAY_SECRET)
  }));
});
