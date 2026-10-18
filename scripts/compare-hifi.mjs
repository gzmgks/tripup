// Pixel comparison of the prototype against the Figma hi-fi frames.
// Usage: node scripts/compare-hifi.mjs <figma-hifi1.png> <figma-hifi2.png> <out-dir> [baseUrl]
// Renders each demo step in headless Chrome at 1×, screenshots the 440×956 device,
// and writes app-*.png, diff-*.png and side-by-side-*.png (Figma | prototype | diff).
import { chromium } from 'playwright-core'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const [figma1, figma2, outDir, baseUrl = 'http://localhost:5173'] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 600, height: 1100 }, deviceScaleFactor: 1 })

async function shoot(step) {
  await page.goto(`${baseUrl}/?step=${step}&auto=0`, { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => (i.onload = i.onerror = r)))))
  })
  await page.waitForTimeout(300)
  return PNG.sync.read(await page.locator('[data-device]').screenshot())
}

function compare(name, figmaPath, app) {
  const figma = PNG.sync.read(readFileSync(figmaPath))
  const { width, height } = figma
  if (app.width !== width || app.height !== height) throw new Error(`${name}: size ${app.width}×${app.height} vs Figma ${width}×${height}`)
  // Ignore the transparent corners outside the 36px radius.
  for (let i = 0; i < figma.data.length; i += 4) {
    if (figma.data[i + 3] < 255) {
      for (const img of [figma, app]) img.data.set([255, 255, 255, 255], i)
    }
  }
  const diff = new PNG({ width, height })
  const bad = pixelmatch(figma.data, app.data, diff.data, width, height, { threshold: 0.1, includeAA: false, alpha: 0.25 })
  const gap = 24
  const side = new PNG({ width: width * 3 + gap * 2, height })
  side.data.fill(255)
  PNG.bitblt(figma, side, 0, 0, width, height, 0, 0)
  PNG.bitblt(app, side, 0, 0, width, height, width + gap, 0)
  PNG.bitblt(diff, side, 0, 0, width, height, (width + gap) * 2, 0)
  writeFileSync(join(outDir, `app-${name}.png`), PNG.sync.write(app))
  writeFileSync(join(outDir, `diff-${name}.png`), PNG.sync.write(diff))
  writeFileSync(join(outDir, `side-by-side-${name}.png`), PNG.sync.write(side))
  const pct = ((bad / (width * height)) * 100).toFixed(2)
  console.log(`${name}: ${bad} differing pixels (${pct}% of the frame)`)
  return { bad, pct }
}

compare('hifi-1', figma1, await shoot('hifi-1'))
compare('hifi-2', figma2, await shoot('hifi-2'))
await browser.close()
