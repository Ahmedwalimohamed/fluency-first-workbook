'use strict';

// Match Railway's runtime preloads before the shared EnglishGate app is bootstrapped.
// These modules install live-task sharing, A1 pilot safety/observability, and
// the Vercel-first email identity/recovery layer without starting HTTP listeners.
require('../live-task-share-bootstrap.js');
require('../a1-pilot-bootstrap.js');
require('../a1-pilot-observability-bootstrap.js');
require('../email-identity-bootstrap.js');

module.exports = require('./vercel-entry.js');
