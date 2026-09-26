// Vercel-only adapter for the existing EnglishGate Express application.
// Railway's production startup remains unchanged. This file exists only on the
// vercel-migration branch so we can prove runtime compatibility before cutover.
const express = require('express');

let capturedApp = null;
let readyResolve;
let readyReject;
const ready = new Promise((resolve, reject) => {
  readyResolve = resolve;
  readyReject = reject;
});

// The current server initializes its database before calling app.listen().
// Vercel owns the HTTP listener, so intercept listen(), capture the fully
// initialized Express app, and expose it through a serverless handler instead.
const originalListen = express.application.listen;
express.application.listen = function vercelCaptureListen(...args) {
  capturedApp = this;
  readyResolve(this);
  return {
    close(callback) { if (typeof callback === 'function') callback(); },
    address() { return null; },
    on() { return this; },
    once() { return this; }
  };
};

try {
  // Match the Railway startup contract:
  // node -r ./core-learning-access-bootstrap.js teacher-management-bootstrap.js
  require('../core-learning-access-bootstrap.js');
  require('../teacher-management-bootstrap.js');
} catch (error) {
  readyReject(error);
}

module.exports = async function englishGateVercelHandler(req, res) {
  try {
    const app = capturedApp || await ready;
    return app(req, res);
  } catch (error) {
    console.error('EnglishGate Vercel bootstrap failed:', error);
    if (!res.headersSent) res.statusCode = 503;
    return res.end('EnglishGate is starting.');
  }
};

// Restore only for tooling that imports this adapter after bootstrap. The
// already-created app keeps its captured startup behavior.
process.once('beforeExit', () => { express.application.listen = originalListen; });
