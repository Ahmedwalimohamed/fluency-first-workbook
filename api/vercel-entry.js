// Vercel migration entrypoint.
// Static assets never trigger the legacy database/bootstrap chain.
// Dynamic bootstrap is serialized across serverless instances with a PostgreSQL advisory lock.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const legacyHandler = require('./index.js');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const BOOTSTRAP_LOCK_KEY = '684521973104';
let initialized = false;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function requestPath(req) {
  try {
    return decodeURIComponent(String(req.url || '/').split('?')[0]);
  } catch (_) {
    return '/';
  }
}

function publicFileFor(reqPath) {
  if (reqPath === '/') return path.join(PUBLIC_DIR, 'index.html');
  if (reqPath.startsWith('/api/') || reqPath.startsWith('/__migration/')) return null;
  const relative = reqPath.replace(/^\/+/, '');
  const candidate = path.resolve(PUBLIC_DIR, relative);
  const rootPrefix = PUBLIC_DIR.endsWith(path.sep) ? PUBLIC_DIR : PUBLIC_DIR + path.sep;
  if (candidate !== PUBLIC_DIR && !candidate.startsWith(rootPrefix)) return null;
  return candidate;
}

function tryServePublic(req, res) {
  if (!['GET', 'HEAD'].includes(String(req.method || 'GET').toUpperCase())) return false;
  const reqPath = requestPath(req);
  const file = publicFileFor(reqPath);
  if (!file) return false;
  let stat;
  try {
    stat = fs.statSync(file);
  } catch (_) {
    return false;
  }
  if (!stat.isFile()) return false;

  const ext = path.extname(file).toLowerCase();
  res.statusCode = 200;
  res.setHeader('content-type', CONTENT_TYPES[ext] || 'application/octet-stream');
  res.setHeader('cache-control', reqPath === '/' ? 'no-store' : 'public, max-age=300');
  res.setHeader('content-length', String(stat.size));
  if (String(req.method).toUpperCase() === 'HEAD') {
    res.end();
  } else {
    fs.createReadStream(file).pipe(res);
  }
  return true;
}

function isNonBootstrapProbe(reqPath) {
  return [
    '/__migration/runtime',
    '/__migration/database-config',
    '/__migration/database',
    '/__migration/read-smoke'
  ].includes(reqPath);
}

async function withBootstrapLock(fn) {
  if (!process.env.DATABASE_URL) return fn();
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("set lock_timeout = '20s'");
    await client.query('select pg_advisory_lock($1::bigint)', [BOOTSTRAP_LOCK_KEY]);
    try {
      return await fn();
    } finally {
      try {
        await client.query('select pg_advisory_unlock($1::bigint)', [BOOTSTRAP_LOCK_KEY]);
      } catch (_) {
        // Connection close also releases the advisory lock.
      }
    }
  } finally {
    await client.end().catch(() => {});
  }
}

module.exports = async function vercelMigrationEntry(req, res) {
  if (tryServePublic(req, res)) return;

  const reqPath = requestPath(req);
  if (initialized || isNonBootstrapProbe(reqPath)) {
    return legacyHandler(req, res);
  }

  try {
    return await withBootstrapLock(async () => {
      const result = await legacyHandler(req, res);
      if ((res.statusCode || 200) < 500) initialized = true;
      return result;
    });
  } catch (error) {
    console.error('EnglishGate serialized Vercel bootstrap failed:', error);
    if (!res.headersSent) {
      res.statusCode = 503;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.setHeader('cache-control', 'no-store');
      res.end(JSON.stringify({
        ok: false,
        layer: 'bootstrap-lock',
        error: error?.code || error?.name || 'BOOTSTRAP_LOCK_FAILED'
      }));
    }
  }
};
