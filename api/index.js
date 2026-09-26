// Vercel-only compatibility boundary for EnglishGate.
// Railway production remains unchanged. This adapter deliberately proves the
// runtime and database independently before loading the legacy app bootstrap.
const express = require('express');
const { Pool } = require('pg');

let appPromise = null;

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(payload));
}

function databaseConfigProbe() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return { configured: false, host: null, portConfigured: false, publicRailwayHost: false };
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname || null;
    return {
      configured: true,
      host,
      portConfigured: Boolean(parsed.port),
      publicRailwayHost: Boolean(host && host.endsWith('.proxy.rlwy.net')),
      internalRailwayHost: host === 'postgres.railway.internal'
    };
  } catch (_) {
    return { configured: true, host: null, portConfigured: false, publicRailwayHost: false, parseable: false };
  }
}

async function databaseProbe() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured for this deployment');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const result = await pool.query('SELECT 1 AS ok');
    return result.rows?.[0]?.ok === 1;
  } finally {
    await pool.end();
  }
}

function loadEnglishGateApp() {
  if (appPromise) return appPromise;

  appPromise = new Promise((resolve, reject) => {
    let capturedApp = null;
    const originalListen = express.application.listen;

    // Vercel owns the HTTP listener. Capture the initialized Express app when
    // the existing Railway startup reaches listen(), without opening a socket.
    express.application.listen = function captureListen() {
      capturedApp = this;
      resolve(this);
      return {
        close(callback) { if (typeof callback === 'function') callback(); },
        address() { return null; },
        on() { return this; },
        once() { return this; }
      };
    };

    try {
      require('../core-learning-access-bootstrap.js');
      require('../teacher-management-bootstrap.js');
      if (capturedApp) resolve(capturedApp);
    } catch (error) {
      reject(error);
    } finally {
      express.application.listen = originalListen;
    }
  });

  return appPromise;
}

module.exports = async function englishGateVercelHandler(req, res) {
  const path = String(req.url || '').split('?')[0];

  // Probe 1: proves Vercel can invoke this function. No DB, no app bootstrap.
  if (path === '/__migration/runtime') {
    return json(res, 200, { ok: true, layer: 'runtime', runtime: 'vercel' });
  }

  // Sanitized config probe: exposes host/port shape only, never credentials.
  if (path === '/__migration/database-config') {
    const config = databaseConfigProbe();
    return json(res, config.configured ? 200 : 503, { ok: config.configured, layer: 'database-config', ...config });
  }

  // Probe 2: read-only DB connectivity. Does not load EnglishGate.
  if (path === '/__migration/database') {
    try {
      const ok = await databaseProbe();
      return json(res, ok ? 200 : 503, { ok, layer: 'database', check: 'SELECT 1' });
    } catch (error) {
      console.error('EnglishGate migration database probe failed:', error);
      return json(res, 503, { ok: false, layer: 'database', error: error?.code || error?.name || 'DATABASE_PROBE_FAILED' });
    }
  }

  // Probe 3: proves the EnglishGate bootstrap can load, without a learner write.
  if (path === '/__migration/app') {
    try {
      await loadEnglishGateApp();
      return json(res, 200, { ok: true, layer: 'app', loaded: true });
    } catch (error) {
      console.error('EnglishGate migration app probe failed:', error);
      return json(res, 503, { ok: false, layer: 'app', error: error?.code || error?.name || 'APP_BOOTSTRAP_FAILED' });
    }
  }

  try {
    const app = await loadEnglishGateApp();
    return app(req, res);
  } catch (error) {
    console.error('EnglishGate Vercel bootstrap failed:', error);
    return json(res, 503, { ok: false, layer: 'app', error: error?.code || error?.name || 'APP_BOOTSTRAP_FAILED' });
  }
};
