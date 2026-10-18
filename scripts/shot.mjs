// Screenshot one demo step (or a sequence of clicks) of the running dev server.
// Usage: node scripts/shot.mjs <step> <out.png> [width=440] [height=956]
//   width < 440 renders the phone layout (full viewport); otherwise the 440×956 device.
import { chromium } from 'playwright-core'
const [step, out, w = '600', h = '1100'] = process.argv.slice(2)
const width = Number(w), height = Number(h)
const phone = width < 440 // 440 itself = the desktop device frame
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const page = await browser.newPage({ viewport: phone ? { width, height } : { width: 600, height: 1100 }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone })
await page.goto(`http://localhost:5173/?step=${step}&auto=0`, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(600)
if (phone) await page.screenshot({ path: out })
else await page.locator('[data-device]').screenshot({ path: out })
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
console.log(out, overflow ? 'HORIZONTAL OVERFLOW' : 'ok')
await browser.close()
