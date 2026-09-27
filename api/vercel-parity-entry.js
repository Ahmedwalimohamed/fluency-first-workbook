'use strict';

// Match Railway's runtime preloads before the shared EnglishGate app is bootstrapped.
// These modules install live-task sharing and A1 pilot safety/observability wrappers
// without starting the HTTP listener themselves.
require('../live-task-share-bootstrap.js');
require('../a1-pilot-bootstrap.js');
require('../a1-pilot-observability-bootstrap.js');

module.exports = require('./vercel-entry.js');
