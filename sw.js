/* ===== sw.js — מאפשר לאפליקציה לעבוד גם בלי אינטרנט =====
   אחרי הביקור הראשון כל הקבצים שמורים בטלפון, כך שהאפליקציה
   נפתחת גם אם המחשב ששירת אותה כבוי לגמרי. */

const CACHE = 'fitlife-v1';

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/store.js',
  './js/calc.js',
  './js/ai.js',
  './js/ui.js',
  './js/app.js',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      /* addAll נכשל כולו אם קובץ אחד נכשל, אז מוסיפים אחד-אחד */
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  /* קריאות ל-Claude לא נכנסות לקאש לעולם — הן חייבות להגיע לרשת */
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) {
        /* מרעננים ברקע כדי שגרסה חדשה תיתפס בפעם הבאה */
        fetch(req).then(res => {
          if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res));
        }).catch(() => {});
        return hit;
      }
      return fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
