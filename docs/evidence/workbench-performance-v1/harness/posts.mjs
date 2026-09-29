import { chromium } from "@playwright/test"
const url = process.argv[2] ?? "http://127.0.0.1:5199"
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addInitScript(() => { if (new URLSearchParams(location.search).has("preview")) { window.__msgs = 0; window.addEventListener("message", (e) => { if (e.data?.type === "workbench-preview-state") window.__msgs++ }, true); window.__loads = (window.__loads ?? 0) + 1 } })
const p = await ctx.newPage(); await p.goto(url)
await p.waitForFunction(() => document.querySelector("iframe")?.contentDocument?.querySelector('[data-ready="true"]'))
await new Promise(r => setTimeout(r, 500))
const fr = () => p.frames().find(f => f.url().includes("preview=1"))
const doc0 = await fr().evaluate(() => { window.__marker = 1; return window.__msgs })
await p.getByRole("tab", { name: "Geometry", exact: true }).click()
const thumb = p.locator('[data-testid="control-radius"] [role="slider"]')
for (let i = 0; i < 10; i++) { await thumb.press(i % 2 ? "ArrowLeft" : "ArrowRight"); await new Promise(r => setTimeout(r, 80)) }
const a = await fr().evaluate(() => window.__msgs)
await p.getByRole("tab", { name: "Colors", exact: true }).click()
const pk = p.locator('[data-testid="color-primary-picker"]')
for (let i = 0; i < 5; i++) { await pk.evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })) }, i % 2 ? "#2266aa" : "#aa6622"); await new Promise(r => setTimeout(r, 200)); await pk.evaluate(el => el.dispatchEvent(new Event("change", { bubbles: true }))); await new Promise(r => setTimeout(r, 80)) }
const c = await fr().evaluate(() => [window.__msgs, window.__marker])
console.log(JSON.stringify({ initialPosts: doc0, radiusSteps: 10, postsAfterRadius: a - doc0, pickerGestures: 5, postsForPicker: c[0] - a, sameIframeDocument: c[1] === 1 }))
await b.close()
