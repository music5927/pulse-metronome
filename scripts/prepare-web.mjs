import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webDir = path.join(rootDir, 'www');
const webAssets = [
  'index.html',
  'styles.css',
  'app.js',
  'voice-data.js',
  'manifest.json',
  'sw.js',
  'icon-192.png',
  'icon-512.png',
  'guide_images'
];

await rm(webDir, { recursive: true, force: true });
await mkdir(webDir, { recursive: true });
await Promise.all(
  webAssets.map((asset) => cp(
    path.join(rootDir, asset),
    path.join(webDir, asset),
    { recursive: asset === 'guide_images' }
  ))
);

console.log(`Prepared ${webAssets.length} web assets in ${path.relative(rootDir, webDir)}/`);
