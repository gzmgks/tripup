// One-off asset pipeline: turns the raw Figma exports into compressed web assets.
// Usage: node scripts/build-assets.mjs <raw-dir>
import sharp from 'sharp'
import { join } from 'node:path'

const raw = process.argv[2]
const out = new URL('../src/assets/', import.meta.url).pathname

// Avatars: keep each photo's aspect, 4× the 36pt avatar width.
const avatars = { ari: '62ea2', nic: 'f04cf', maya: '49f47', sam: 'd8afa', theo: '44f87' }
for (const [name, id] of Object.entries(avatars)) {
  await sharp(join(raw, `${id}.png`)).resize({ width: 144 }).webp({ quality: 78 }).toFile(join(out, 'avatars', `${name}.webp`))
}

// Map card: Figma shows rows 466.8–842.1 of the 880×1916 map export, stretched into a 406×174 card.
await sharp(join(raw, '741c2.png')).extract({ left: 0, top: 467, width: 880, height: 375 }).webp({ quality: 80 }).toFile(join(out, 'images', 'map-day5.webp'))

// Paper texture for the trip timeline (only used there).
await sharp(join(raw, '2c9f6.png')).webp({ quality: 55 }).toFile(join(out, 'images', 'paper-texture.webp'))

// Explore icon (a bitmap in Figma), 4× its 14pt size.
await sharp(join(raw, '324c1.png')).resize(56, 56).png({ compressionLevel: 9 }).toFile(join(out, 'icons', 'explore.png'))
console.log('done')
