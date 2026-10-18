// Prints the box of every element with a data-m attribute or matching text, for checking against Figma.
import { chromium } from 'playwright-core'
const [step, ...texts] = process.argv.slice(2)
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 600, height: 1100 }, deviceScaleFactor: 1 })
await page.goto(`http://localhost:5173/?step=${step}&auto=0`, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
const out = await page.evaluate((texts) => {
  const dev = document.querySelector('[data-device]').getBoundingClientRect()
  const res = []
  const walker = document.createTreeWalker(document.querySelector('[data-device]'), NodeFilter.SHOW_ELEMENT)
  const seen = new Set()
  while (walker.nextNode()) {
    const el = walker.currentNode
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim()
    for (const t of texts) {
      if (own === t && !seen.has(t)) {
        seen.add(t)
        const r = el.getBoundingClientRect()
        res.push(`${t.padEnd(34)} x=${(r.x - dev.x - 1).toFixed(1)} y=${(r.y - dev.y - 1).toFixed(1)} w=${r.width.toFixed(1)} h=${r.height.toFixed(1)}`)
      }
    }
  }
  return res
}, texts)
console.log(out.join('\n'))
await browser.close()
