// Link-preview image (1200×630) from the two hi-fi screens as rendered by the prototype.
// Usage: node scripts/build-og.mjs   (after compare-hifi.mjs has written docs/hifi-compare/app-*.png)
import sharp from 'sharp'

const root = new URL('../', import.meta.url).pathname
const H = 540
const phone = async (file) => {
  const img = sharp(`${root}docs/hifi-compare/${file}`).resize({ height: H })
  const { width } = await img.metadata().then(async () => (await img.clone().toBuffer({ resolveWithObject: true })).info)
  const r = 26
  const mask = Buffer.from(`<svg width="${width}" height="${H}"><rect width="${width}" height="${H}" rx="${r}" ry="${r}"/></svg>`)
  const input = await img.composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
  return { input, width }
}
const a = await phone('app-hifi-1.png')
const b = await phone('app-hifi-2.png')
const text = Buffer.from(`<svg width="560" height="630" xmlns="http://www.w3.org/2000/svg">
  <text x="72" y="270" font-family="Helvetica Neue, Arial, sans-serif" font-size="84" font-weight="700" fill="#1b1a22">TripUp</text>
  <text x="74" y="330" font-family="Helvetica Neue, Arial, sans-serif" font-size="30" fill="#626068">The final night in Lisbon:</text>
  <text x="74" y="370" font-family="Helvetica Neue, Arial, sans-serif" font-size="30" fill="#626068">from an open dinner slot</text>
  <text x="74" y="410" font-family="Helvetica Neue, Arial, sans-serif" font-size="30" fill="#626068">to a squared-up trip.</text>
  <text x="74" y="480" font-family="Helvetica Neue, Arial, sans-serif" font-size="22" fill="#5a31f4">Interactive prototype · tap to try it</text>
</svg>`)
const top = Math.round((630 - H) / 2)
await sharp({ create: { width: 1200, height: 630, channels: 4, background: '#f2f2f3' } })
  .composite([
    { input: text, left: 0, top: 0 },
    { input: a.input, left: 1200 - 64 - b.width - 24 - a.width, top },
    { input: b.input, left: 1200 - 64 - b.width, top },
  ])
  .png({ compressionLevel: 9 })
  .toFile(`${root}public/og.png`)
console.log('public/og.png written')
