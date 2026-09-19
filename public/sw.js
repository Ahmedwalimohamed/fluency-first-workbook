/* EnglishGate Progressive Web App service worker
   Resilient navigation policy: never turn a temporary upstream/network failure
   into Chrome's ERR_FAILED page when a previously installed EnglishGate PWA
   can still serve its application shell. */
const CACHE_NAME = 'englishgate-pwa-v6';
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/pwa.css',
  '/pwa.js',
  '/pwa-icon-192.svg',
  '/pwa-icon-512.svg',
  '/pwa-maskable.svg',
  '/app.js',
  '/mobile-activity-focus.js',
  '/mobile-form-fix.css',
  '/question-nav-fix.css',
  '/mobile-single-question-v5.css',
  '/mobile-lesson-player-v1.css',
  '/mobile-student-home-v2.css',
  '/mobile-student-course-v1.css',
  '/englishgate-unified-ui-v1.css',
  '/englishgate-blue-red-white-v1.css?v=2',
  '/englishgate-student-mode-v1.js?v=1',
  '/b2-lift-vocabulary-stage-v1.js?v=1',
  '/lesson1-grammar-micro-v1.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(APP_SHELL.map(url => cache.add(new Request(url, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('englishgate-pwa-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function offlinePage() {
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EnglishGate</title><style>body{font-family:system-ui,sans-serif;margin:0;background:#f8fafc;color:#0f172a;display:grid;min-height:100vh;place-items:center}.card{max-width:520px;margin:24px;padding:32px;background:white;border:1px solid #e2e8f0;border-radius:18px;box-shadow:0 12px 35px #0f172a12}h1{margin:0 0 12px;font-size:26px}p{line-height:1.55;color:#475569}button{border:0;border-radius:10px;padding:12px 18px;background:#2563eb;color:white;font-weight:700;cursor:pointer}</style></head><body><main class="card"><h1>EnglishGate is reconnecting</h1><p>Your browser temporarily lost the connection. Your account and learning data are safe. Check your connection and try again.</p><button onclick="location.reload()">Try again</button></main></body></html>`, {status: 200, headers: {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // User/account data must always come from the network and must never be cached by the PWA.
  if (url.pathname.startsWith('/api/')) return;

  // Password recovery is an account route, not the cached app shell.
  // Never replace it with the generic reconnecting page or a cached index page.
  if (url.pathname === '/forgot-password') {
    event.respondWith((async () => {
      try {
        return await fetch(request, { cache: 'no-store' });
      } catch (error) {
        return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EnglishGate · Password help</title><style>body{font-family:system-ui,sans-serif;margin:0;background:#f8fafc;color:#0f172a;display:grid;min-height:100vh;place-items:center}.card{max-width:520px;margin:24px;padding:32px;background:white;border:1px solid #e2e8f0;border-radius:18px}h1{margin:0 0 12px;font-size:26px}p{line-height:1.55;color:#475569}a{display:inline-block;margin-top:10px;color:#2563eb;font-weight:700}</style></head><body><main class="card"><h1>Password recovery is temporarily unavailable</h1><p>EnglishGate could not reach the recovery service. Your account has not been changed. Check your connection and try again.</p><a href="/forgot-password">Try again</a></main></body></html>`, {status: 503, headers: {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
      }
    })());
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('/index.html', response.clone());
          return response;
        }
        const cached = await caches.match('/index.html') || await caches.match('/');
        return cached || response || offlinePage();
      } catch (error) {
        const cached = await caches.match('/index.html') || await caches.match('/');
        return cached || offlinePage();
      }
    })());
    return;
  }

  const isStatic = ['style', 'script', 'image', 'font'].includes(request.destination) || /\.(?:css|js|svg|png|jpg|jpeg|webp|woff2?|ico|webmanifest)$/i.test(url.pathname);
  if (!isStatic) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      // A normal HTTP response avoids the FetchEvent network-error state shown by Chrome.
      return new Response('', {status: 503, statusText: 'Temporarily unavailable'});
    }
  })());
});