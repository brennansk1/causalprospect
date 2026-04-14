// Capture screenshots of the CausalProspect dashboard with real WebGL rendering.
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../screenshots')
mkdirSync(OUT_DIR, { recursive: true })

const URL = process.env.DASH_URL ?? 'http://localhost:5173'

const browser = await chromium.launch({
  args: [
    // Enable WebGL in headless mode.
    '--use-gl=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--enable-accelerated-2d-canvas',
  ],
})
const context = await browser.newContext({
  viewport: { width: 1800, height: 1100 },
  deviceScaleFactor: 2,
})
const page = await context.newPage()

page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('[console.error]', msg.text())
})
page.on('pageerror', (err) => console.log('[pageerror]', err.message))

async function wait(ms) {
  await new Promise((r) => setTimeout(r, ms))
}

console.log(`loading ${URL}...`)
await page.goto(URL, { waitUntil: 'networkidle' })
await wait(3500) // let the camera entrance animation complete

// ------ Tab 1: 3D Geological Model (hero view) ------
console.log('capturing 3d-overview.png')
await page.screenshot({ path: `${OUT_DIR}/3d-overview.png`, fullPage: false })

// Rotate the camera a bit so we can see the topography from a different angle.
const canvas = await page.locator('canvas').first()
const box = await canvas.boundingBox()
if (box) {
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + 180, cy + 40, { steps: 30 })
  await page.mouse.up()
  await wait(800)
}
console.log('capturing 3d-rotated.png')
await page.screenshot({ path: `${OUT_DIR}/3d-rotated.png`, fullPage: false })

// Click a deposit marker to populate the inspector.
console.log('clicking "Morenci" in the right-panel list to open inspector...')
const morenci = page.getByText('Morenci', { exact: false }).first()
if ((await morenci.count()) > 0) {
  await morenci.click().catch(() => {})
  await wait(1200)
}
console.log('capturing 3d-deposit-selected.png')
await page.screenshot({ path: `${OUT_DIR}/3d-deposit-selected.png`, fullPage: false })

// Zoom in on the scene to see drill-hole + contour detail.
if (box) {
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, -120)
    await wait(50)
  }
  await page.mouse.move(cx, cy)
  await wait(400)
}
console.log('capturing 3d-zoomed.png')
await page.screenshot({ path: `${OUT_DIR}/3d-zoomed.png`, fullPage: false })

// Toggle prospectivity overlay ON so we capture that view too.
await page.getByRole('tab', { name: /3D Geological Model/i }).click().catch(() => {})
await wait(400)
const prospBtn = page.getByRole('button', { name: /Prospectivity overlay/i })
if ((await prospBtn.count()) > 0) {
  await prospBtn.click().catch(() => {})
  await wait(800)
}
console.log('capturing 3d-prospectivity.png')
await page.screenshot({ path: `${OUT_DIR}/3d-prospectivity.png`, fullPage: false })

// ------ Tab 2: Causal DAG ------
await page.getByRole('tab', { name: /Causal DAG/i }).click()
await wait(600)
console.log('capturing causal-dag.png')
await page.screenshot({ path: `${OUT_DIR}/causal-dag.png`, fullPage: false })

// ------ Tab 3: Benchmark ------
await page.getByRole('tab', { name: /Model Benchmark/i }).click()
await wait(600)
console.log('capturing benchmark.png')
await page.screenshot({ path: `${OUT_DIR}/benchmark.png`, fullPage: false })

// ------ Tab 4: Uncertainty ------
await page.getByRole('tab', { name: /Uncertainty/i }).click()
await wait(600)
console.log('capturing uncertainty.png')
await page.screenshot({ path: `${OUT_DIR}/uncertainty.png`, fullPage: false })

await browser.close()
console.log(`\nDone — screenshots in: ${OUT_DIR}`)
