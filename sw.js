/* Service Worker SIM Wisuda — app shell instan + bekerja luring untuk aset statis.
   Aturan: permintaan ke Google Apps Script (script.google.com / googleusercontent) TIDAK PERNAH di-cache. */
const VERSI = 'simwisuda-v1.1.0';
const SHELL = [
  './',
  './index.html',
  './tamu.html',
  './daftar.html',
  './manifest.json',
  './css/app.css',
  './js/config.js',
  './js/core.js',
  './js/ui.js',
  './js/app.js',
  './js/docgen.js',
  './js/tamu.js',
  './js/daftar.js',
  './js/import-legacy.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
const PAGES = [
  './js/pages/checklist.js',
  './js/pages/dashboard.js',
  './js/pages/denah.js',
  './js/pages/galeri.js',
  './js/pages/kegiatan.js',
  './js/pages/keuangan.js',
  './js/pages/kuisioner.js',
  './js/pages/laporan.js',
  './js/pages/live.js',
  './js/pages/master.js',
  './js/pages/mc.js',
  './js/pages/pengaturan.js',
  './js/pages/pengumuman.js',
  './js/pages/rekapscan.js',
  './js/pages/rekrutmen.js',
  './js/pages/rundown.js',
  './js/pages/scan.js',
  './js/pages/studio.js',
  './js/pages/urutan.js',
  './js/pages/wa.js'
];
const CDN = /^https:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSI).then(async (c) => {
    await c.addAll(SHELL);
    await Promise.all(PAGES.map((u) => c.add(u).catch(() => null))); // halaman lazy: gagal satu tidak membatalkan instalasi
  }));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSI && k !== 'sw-cdn' && k !== 'sw-drive').map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/script\.google(usercontent)?\.com$/.test(url.hostname) || url.hostname.endsWith('googleusercontent.com') || url.hostname === 'accounts.google.com' || url.hostname === 'oauth2.googleapis.com') return; // API & login: selalu jaringan
  if (CDN.test(req.url)) { // pustaka CDN berversi tetap → cache-first
    e.respondWith(caches.open('sw-cdn').then(async (c) => { const hit = await c.match(req); if (hit) return hit; const r = await fetch(req); if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') { // HTML: jaringan dulu (agar update cepat), cadangan cache
    e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(VERSI).then((c) => c.put(req, cp)); return r; }).catch(() => caches.match(req, { ignoreSearch: true }).then((h) => h || caches.match(url.pathname.indexOf('tamu') > -1 ? './tamu.html' : './index.html'))));
    return;
  }
  // aset statis: stale-while-revalidate (instan dari cache, diperbarui di belakang)
  e.respondWith(caches.open(VERSI).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
