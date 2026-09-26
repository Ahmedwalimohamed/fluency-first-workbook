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

function sanitizeBootstrapMessage(value) {
  return String(value || '')
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[database-url-redacted]')
    .replace(/password\s*[=:]\s*[^\s,;]+/gi, 'password=[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .slice(0, 300);
}

function loadEnglishGateApp() {
  if (appPromise) return appPromise;

  appPromise = new Promise((resolve, reject) => {
    let settled = false;
    let bootstrapExitCode = null;
    let lastBootstrapError = '';
    const originalListen = express.application.listen;
    const originalExit = process.exit;
    const originalConsoleError = console.error;

    const restore = () => {
      express.application.listen = originalListen;
      process.exit = originalExit;
      console.error = originalConsoleError;
    };
    const finishResolve = app => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      restore();
      resolve(app);
    };
    const finishReject = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      restore();
      if (lastBootstrapError && !error.bootstrapDetail) error.bootstrapDetail = lastBootstrapError;
      reject(error);
    };

    console.error = (...args) => {
      const text = sanitizeBootstrapMessage(args.map(x => x instanceof Error ? (x.stack || x.message) : String(x)).join(' '));
      if (text) lastBootstrapError = text;
      originalConsoleError(...args);
    };

    process.exit = function captureBootstrapExit(code) {
      bootstrapExitCode = Number(code ?? 0);
      const error = new Error(`Legacy bootstrap requested process.exit(${bootstrapExitCode})`);
      error.code = 'BOOTSTRAP_EXIT';
      finishReject(error);
    };

    express.application.listen = function captureListen() {
      finishResolve(this);
      return {
        close(callback) { if (typeof callback === 'function') callback(); },
        address() { return null; },
        on() { return this; },
        once() { return this; }
      };
    };

    const timeout = setTimeout(() => {
      const error = new Error(bootstrapExitCode === null
        ? 'EnglishGate bootstrap did not reach app.listen() within 8000ms'
        : `EnglishGate bootstrap exited with code ${bootstrapExitCode}`);
      error.code = bootstrapExitCode === null ? 'BOOTSTRAP_TIMEOUT' : 'BOOTSTRAP_EXIT';
      finishReject(error);
    }, 8000);

    try {
      require('../core-learning-access-bootstrap.js');
      require('../teacher-management-bootstrap.js');
    } catch (error) {
      finishReject(error);
    }
  });

  return appPromise;
}

module.exports = async function englishGateVercelHandler(req, res) {
  const path = String(req.url || '').split('?')[0];

  if (path === '/__migration/runtime') {
    return json(res, 200, { ok: true, layer: 'runtime', runtime: 'vercel' });
  }

  if (path === '/__migration/database-config') {
    const config = databaseConfigProbe();
    return json(res, config.configured ? 200 : 503, { ok: config.configured, layer: 'database-config', ...config });
  }

  if (path === '/__migration/database') {
    try {
      const ok = await databaseProbe();
      return json(res, ok ? 200 : 503, { ok, layer: 'database', check: 'SELECT 1' });
    } catch (error) {
      console.error('EnglishGate migration database probe failed:', error);
      return json(res, 503, { ok: false, layer: 'database', error: error?.code || error?.name || 'DATABASE_PROBE_FAILED' });
    }
  }

  if (path === '/__migration/app') {
    try {
      await loadEnglishGateApp();
      return json(res, 200, { ok: true, layer: 'app', loaded: true });
    } catch (error) {
      console.error('EnglishGate migration app probe failed:', error);
      return json(res, 503, {
        ok: false,
        layer: 'app',
        error: error?.code || error?.name || 'APP_BOOTSTRAP_FAILED',
        detail: String(error?.message || '').slice(0, 180),
        bootstrapDetail: sanitizeBootstrapMessage(error?.bootstrapDetail || '') || null
      });
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
