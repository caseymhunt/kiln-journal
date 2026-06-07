const CACHE = 'kiln-v1';
const STATIC = [
  '/',
  '/css/tokens.css',
  '/css/base.css',
  '/css/app.css',
  '/js/app.js',
  '/js/firebase.js',
  '/js/state.js',
  '/js/data.js',
  '/js/router.js',
  '/js/screens/today.js',
  '/js/screens/log.js',
  '/js/screens/library.js',
  '/js/screens/settings.js',
  '/js/flows/new-firing.js',
  '/js/flows/live.js',
  '/js/flows/witness.js',
  '/js/flows/outcome.js',
  '/js/detail/firing.js',
  '/js/detail/glaze.js',
  '/firebase-app-compat.js',
  '/firebase-auth-compat.js',
  '/firebase-firestore-compat.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Let Firebase/Google requests go straight to network
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('google.com')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
