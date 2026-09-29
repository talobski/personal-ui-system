// Repro of WCN-05 lines 22-43 against a build URL; logs scroll/focus timeline when the second Home is ignored.
import { chromium } from "@playwright/test"
const url = process.argv[2], N = Number(process.argv[3] ?? 20), mode = process.argv[4] ?? "dark", cpu = Number(process.argv[5] ?? 1), motion = process.argv[6] ?? "no-preference"
const b = await chromium.launch()
let fails = 0, pageDownIgnored = 0
for (let i = 0; i < N; i++) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage()
  await page.emulateMedia({ reducedMotion: motion })
  if (cpu > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu }) }
  await page.goto(url)
  await page.waitForFunction(() => document.querySelector("iframe")?.contentDocument?.querySelector('[data-ready="true"]'), null, { timeout: 60000 })
  const toggle = page.getByRole("switch", { name: "Dark mode" })
  if (mode === "dark") await toggle.click()
  await page.getByRole("tab", { name: "Colors", exact: true }).click()
  const editor = page.getByRole("region", { name: "Theme editor", exact: true })
  await editor.hover(); await page.mouse.wheel(0, 251)
  await page.waitForFunction(() => document.querySelector('[aria-label="Theme editor"]').scrollTop > 0, null, { timeout: 60000 })
  await page.mouse.wheel(0, 37)
  await editor.focus(); await editor.press("Home")
  await page.waitForFunction(() => document.querySelector('[aria-label="Theme editor"]').scrollTop === 0, null, { timeout: 5000 }).catch(() => {})
  await editor.press("PageDown")
  const down = await page.waitForFunction(() => document.querySelector('[aria-label="Theme editor"]').scrollTop > 0, null, { timeout: 5000 }).then(() => true, () => false)
  if (!down) { pageDownIgnored++; console.log(`run ${i} PageDown ignored`); await ctx.close(); continue }
  const atHome = await page.evaluate(() => ({ top: document.querySelector('[aria-label="Theme editor"]').scrollTop, active: document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.tagName }))
  await editor.press("Home")
  const ok = await page.waitForFunction(() => document.querySelector('[aria-label="Theme editor"]').scrollTop === 0, null, { timeout: 3000 }).then(() => true, () => false)
  if (!ok) { fails++; const after = await page.evaluate(() => document.querySelector('[aria-label="Theme editor"]').scrollTop); console.log(`run ${i} FAIL: before Home ${JSON.stringify(atHome)} after ${after}`) }
  await ctx.close()
}
console.log(`${url} ${mode} cpu${cpu} ${motion}: Home ignored ${fails}/${N}, PageDown ignored ${pageDownIgnored}/${N}`)
await b.close()
