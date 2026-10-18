// Prints boxes for CSS selectors (relative to the device's inner edge).
import { chromium } from 'playwright-core'
const [step, ...sels] = process.argv.slice(2)
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 600, height: 1100 }, deviceScaleFactor: 1 })
await page.goto(`http://localhost:5173/?step=${step}&auto=0`, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
console.log((await page.evaluate((sels) => {
  const d = document.querySelector('[data-device]').getBoundingClientRect()
  return sels.flatMap((s) => [...document.querySelectorAll(s)].slice(0, 8).map((el, i) => {
    const r = el.getBoundingClientRect()
    return `${(s + '#' + i).padEnd(40)} x=${(r.x - d.x - 1).toFixed(1)} y=${(r.y - d.y - 1).toFixed(1)} w=${r.width.toFixed(1)} h=${r.height.toFixed(1)}`
  }))
}, sels)).join('\n'))
await browser.close()
