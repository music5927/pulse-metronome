// Pulse Metronome Service Worker
const CACHE_NAME = 'pulse-metronome-v10';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './voice-data.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './guide_images/step_guide_01_tempo.jpg',
  './guide_images/step_guide_02_meter_division.jpg',
  './guide_images/step_guide_03_accent.jpg',
  './guide_images/step_guide_04_tap_play.jpg',
  './guide_images/step_guide_05_track_presets.jpg',
  './guide_images/step_guide_06_sections_voice.jpg',
  './guide_images/step_guide_07_accent_visual.jpg',
  './guide_images/step_guide_08_voice_volume_log.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
