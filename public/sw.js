/* EnglishGate Progressive Web App service worker */
const CACHE_NAME = 'englishgate-pwa-v1';
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
  '/mobile-student-course-v1.css'
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

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // User/account data must always come from the network and must never be cached by the PWA.
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put('/index.html', response.clone());
        }
        return response;
      } catch (error) {
        return (await caches.match('/index.html')) || (await caches.match('/')) || Response.error();
      }
    })());
    return;
  }

  const isStatic = ['style', 'script', 'image', 'font'].includes(request.destination) || /\.(?:css|js|svg|png|jpg|jpeg|webp|woff2?|ico|webmanifest)$/i.test(url.pathname);
  if (!isStatic) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    const network = fetch(request).then(async response => {
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    }).catch(() => null);

    return cached || (await network) || Response.error();
  })());
});
