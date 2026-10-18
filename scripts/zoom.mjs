// Crops the same region from two PNGs and writes them side by side, scaled up (nearest neighbour).
// Usage: node scripts/zoom.mjs <a.png> <b.png> <x> <y> <w> <h> <scale> <out.png>
import { PNG } from 'pngjs'
import { readFileSync, writeFileSync } from 'node:fs'
const [a, b, x, y, w, h, s, out] = process.argv.slice(2)
const [X, Y, W, H, S] = [x, y, w, h, s].map(Number)
const imgs = [a, b].map((p) => PNG.sync.read(readFileSync(p)))
const o = new PNG({ width: W * S * 2 + 8, height: H * S })
o.data.fill(255)
imgs.forEach((img, k) => {
  for (let j = 0; j < H * S; j++) for (let i = 0; i < W * S; i++) {
    const si = ((Y + Math.floor(j / S)) * img.width + X + Math.floor(i / S)) * 4
    const di = (j * o.width + k * (W * S + 8) + i) * 4
    o.data.set(img.data.subarray(si, si + 4), di)
  }
})
writeFileSync(out, PNG.sync.write(o))
