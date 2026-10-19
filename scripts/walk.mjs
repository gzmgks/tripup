// End-to-end walkthrough of the scenario with the group on autopilot, asserting the key figures.
// Usage (dev server running): node scripts/walk.mjs [chrome|webkit|iphone17|iphone|android] [baseUrl]
//   chrome   = desktop Chrome, the 440×956 device frame (needs Google Chrome installed)
//   webkit   = desktop WebKit (Safari's engine)
//   iphone17 = WebKit as an iPhone 17 Pro Max (440×956 pt, 3×), with touch: the reference device
//   iphone   = WebKit as an iPhone 15 Pro Max, with touch
//   android  = Chrome as a Pixel 7, with touch
// WebKit comes from: npx playwright-core install webkit
import { chromium, devices, webkit } from 'playwright-core'

const [target = 'chrome', base = 'http://localhost:5173'] = process.argv.slice(2)
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const setups = {
  chrome: { engine: chromium, launch: { executablePath: CHROME }, context: { viewport: { width: 600, height: 1100 } } },
  webkit: { engine: webkit, launch: {}, context: { viewport: { width: 600, height: 1100 } } },
  iphone17: {
    engine: webkit,
    launch: {},
    context: { ...devices['iPhone 15 Pro Max'], viewport: { width: 440, height: 956 }, screen: { width: 440, height: 956 }, deviceScaleFactor: 3 },
  },
  iphone: { engine: webkit, launch: {}, context: devices['iPhone 15 Pro Max'] },
  android: { engine: chromium, launch: { executablePath: CHROME }, context: devices['Pixel 7'] },
}
const setup = setups[target]
if (!setup) throw new Error(`unknown target ${target}`)

const browser = await setup.engine.launch({ headless: true, ...setup.launch })
const page = await (await browser.newContext(setup.context)).newPage()
const touch = !!setup.context.hasTouch
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

const t0 = Date.now()
const results = []
const check = (name, ok, detail = '') => {
  results.push(ok)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${((Date.now() - t0) / 1000).toFixed(1).padStart(5)}s  ${name}${detail ? `  (${detail})` : ''}`)
}
const tap = async (locator) => (touch ? locator.tap() : locator.click())
const text = () => page.locator('[data-device]').innerText()
const until = (fn, timeout = 20000) => page.waitForFunction(fn, null, { timeout })

await page.goto(`${base}/?step=home&debug`, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)

await tap(page.getByRole('button', { name: /Lisbon with the crew/ }).first())
check('Home → trip hub: Next · Dinner 20:30 · not decided', /Final dinner together/.test(await text()) && /Next · Dinner 20:30 · not decided/.test(await text()))

await tap(page.getByRole('button', { name: 'Add people' }))
await tap(page.getByRole('button', { name: /Add Ren & share link/ }))
check('Ren added as a guest', /\(Guest\)/.test(await text()))

await tap(page.getByRole('button', { name: 'Decide', exact: true }).first())
await tap(page.getByRole('button', { name: /Send to group \(6\)/ }))
await until(() => Object.keys(window.__app.getState().poll?.votes ?? {}).length >= 3)
await tap(page.getByRole('button', { name: /^A Cevicheria/ }))
await page.waitForTimeout(400)
check('4 of 6 voted, Taberna leading', /4 of 6 voted/.test(await text()))

await until(() => window.__app.getState().done.includes('switch-nic'))
await page.waitForTimeout(400)
check('Nic switches: "Nic switched to Ramiro"', /Nic switched to Ramiro/.test(await text()))
await until(() => window.__app.getState().decided)
await page.waitForTimeout(800)
check('Winner lands: Picked by 4 of 6 · Next · Dinner at Cervejaria Ramiro · 20:30', /Picked by 4 of 6/.test(await text()) && /Next · Dinner at Cervejaria Ramiro · 20:30/.test(await text()))
await until(() => ['maya', 'theo', 'sam', 'nic'].every((m) => window.__app.getState().drinks[m] !== null))
await page.waitForTimeout(900)
check('Who’s having wine? · Ren · no answer, counted in', /Who's having wine\?/.test(await text()) && /Ren\s*· no answer, counted in/.test(await text()))

await until(() => window.__app.getState().banner?.kind === 'who-paid', 25000)
check('22:30: Who paid at Cervejaria Ramiro?', /Who paid at Cervejaria Ramiro\?/.test(await text()))
await tap(page.locator('[data-banner-kind="who-paid"]').getByRole('button', { name: 'Log the bill' }))
await page.waitForTimeout(600)
check('Log the bill: €9.60 each · 5 people, €34.60', /€9\.60 each/.test(await text()) && /€34\.60/.test(await text()))

await tap(page.getByRole('button', { name: /Ren doesn.t share the wine/ }))
await page.waitForTimeout(900)
check('Ren off: €12.00 each · 4 people, €37.00', /€12\.00 each/.test(await text()) && /€37\.00/.test(await text()))

await tap(page.getByRole('button', { name: 'Save' }))
await page.waitForTimeout(2200)
const money = await text()
check('Money: You owe €20.00, was €156.00 · 3 payments instead of 10', /You owe €20\.00/.test(money) && /was €156\.00/.test(money) && /3 payments instead of 10/.test(money))
check('3 transfers to Maya + Ren → You €25.00', /€30\.00/.test(money) && /€50\.00/.test(money) && /€25\.00/.test(money))

await tap(page.getByRole('button', { name: /^Pay/ }).first())
await tap(page.getByRole('button', { name: 'Continue to your bank' }))
await until(() => window.__app.getState().payFlow?.phase === 'paid', 8000)
await page.waitForTimeout(500)
check('Paid: You’re square with the group · Ren owes you €25', /You’re square with the group/.test(await text()) && /Ren owes you €25/.test(await text()))
await tap(page.getByRole('button', { name: 'Done' }))
await until(() => window.__app.getState().screen === 'squared', 20000)
await page.waitForTimeout(1600)
const end = await text()
check('Squared up: 23 expenses · 4 payments (incl. Ren)', /Lisbon is squared up/.test(end) && /23 expenses/.test(end) && /4 payments \(incl\. Ren\)/.test(end))

await tap(page.getByRole('button', { name: 'Plan the next trip' }))
await page.waitForTimeout(3200)
const home = await text()
check('Home: Lisbon under Past trips, Squared up ✓, no Squared Up again', !/Active now/.test(home) && /Past trips[\s\S]*Lisbon with the crew[\s\S]*Squared up ✓/.test(home) && (await page.evaluate(() => window.__app.getState().screen)) === 'home')

check('No console or page errors', errors.length === 0, errors.join(' | '))
console.log(`\n${results.filter(Boolean).length}/${results.length} passed on ${target} in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
await browser.close()
process.exit(results.every(Boolean) ? 0 : 1)
