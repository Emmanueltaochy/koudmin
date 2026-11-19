// Service worker de kivien.re : rend l'espace pro installable et affiche une page claire sans
// connexion. Il ne garde RIEN d'autre en cache : chaque page vient toujours du serveur.
const CACHE = 'kivien-hors-ligne-v1';
const PAGE = '/hors-ligne';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.add(new Request(PAGE, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  // Seulement l'ouverture d'une page : le reste (données, images, scripts) passe sans être touché.
  if (e.request.mode !== 'navigate') return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(PAGE).then((r) => r || Response.error())),
  );
});
