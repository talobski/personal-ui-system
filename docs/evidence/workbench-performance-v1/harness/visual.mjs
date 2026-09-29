// Pixel-equality of preview views and the Workbench between two builds (base vs candidate).
import { chromium } from "@playwright/test"
const [a, b] = [process.argv[2] ?? "http://127.0.0.1:5199", process.argv[3] ?? "http://127.0.0.1:5197"]
const browser = await chromium.launch()
async function shots(url, vw, vh, mode) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, reducedMotion: "reduce" })
  const p = await ctx.newPage(); await p.goto(url)
  await p.waitForFunction(() => document.querySelector("iframe")?.contentDocument?.querySelector('[data-ready="true"]'))
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800)
  if (mode === "dark") { await p.locator("#color-mode-switch").click(); await p.waitForTimeout(600) }
  const f = p.frames().find(x => x.url().includes("preview=1"))
  const out = {}
  out.workbench = await p.screenshot()
  for (const v of ["Design system", "App shells", "States", "Cards"]) {
    await f.getByRole("tab", { name: v, exact: true }).click(); await p.waitForTimeout(700)
    out[v] = await f.locator("html").screenshot({ animations: "disabled" })
  }
  // Behaviour: States default button activations still count, and an edit reaches the Design system values.
  await f.getByRole("tab", { name: "States", exact: true }).click()
  await f.getByRole("button", { name: "default", exact: true }).click(); await f.getByRole("button", { name: "default", exact: true }).click()
  out.activations = await f.getByTestId("button-activations").textContent()
  await ctx.close(); return out
}
let ok = true
for (const [vw, vh] of [[1440, 900], [390, 844]]) for (const mode of ["light", "dark"]) {
  const x = await shots(a, vw, vh, mode), y = await shots(b, vw, vh, mode)
  for (const k of Object.keys(x)) {
    const same = Buffer.isBuffer(x[k]) ? x[k].equals(y[k]) : x[k] === y[k]
    if (!same) ok = false
    console.log(`${vw}x${vh} ${mode} ${k}: ${same ? "identical" : "DIFFERENT"}${Buffer.isBuffer(x[k]) ? "" : ` (${x[k]} | ${y[k]})`}`)
  }
}
await browser.close()
console.log(ok ? "ALL IDENTICAL" : "DIFFERENCES FOUND")
