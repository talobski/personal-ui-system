// PUI-118: per-document main-thread attribution from a Chrome timeline trace (ignored work file).
// Usage: node trace.mjs --url http://127.0.0.1:5199 --scenario radius|mode|tab|color --n 20 --out trace-summary.json [--viewport 1440x900]
import { chromium } from "@playwright/test"
import fs from "node:fs"

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const URL = arg("url", "http://127.0.0.1:5199")
const SCENARIO = arg("scenario", "radius")
const N = Number(arg("n", "20"))
const OUT = arg("out", `trace-${SCENARIO}.json`)
const [VW, VH] = arg("viewport", "1440x900").split("x").map(Number)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: VW, height: VH } })
const page = await context.newPage()
await page.goto(URL)
await page.waitForFunction(() => document.querySelector("iframe")?.contentDocument?.querySelector('[data-testid="preview"][data-ready="true"]'))
await sleep(500)
const preview = () => page.frames().find((f) => f.url().includes("preview=1"))
const revision = () => preview().evaluate(() => document.querySelector('[data-testid="preview"]').dataset.mode + document.getElementById("workbench-theme").textContent)

const acts = {
  radius: { setup: () => page.getByRole("tab", { name: "Geometry", exact: true }).click(), act: (i) => page.locator('[data-testid="control-radius"] [role="slider"]').press(i % 2 ? "ArrowLeft" : "ArrowRight"), waitPreview: true },
  color: { setup: () => page.getByRole("tab", { name: "Colors", exact: true }).click(), act: (i) => page.locator("#color-primary-input").fill(`#${(0x335500 + i * 7).toString(16).padStart(6, "0")}`), waitPreview: true },
  mode: { setup: async () => {}, act: () => page.locator("#color-mode-switch").click(), waitPreview: true },
  tab: { setup: async () => {}, act: (i) => preview().getByRole("tab", { name: ["Design system", "App shells", "States", "Cards"][i % 4], exact: true }).click(), waitPreview: false },
}
const sc = acts[SCENARIO]
await sc.setup()
for (let i = 0; i < 3; i++) { await sc.act(i); await sleep(100) }

await browser.startTracing(page, { categories: ["devtools.timeline", "disabled-by-default-devtools.timeline", "v8.execute", "blink.user_timing"] })
for (let i = 3; i < 3 + N; i++) {
  const before = sc.waitPreview ? await revision() : null
  await sc.act(i)
  if (sc.waitPreview) await preview().waitForFunction((b) => document.querySelector('[data-testid="preview"]').dataset.mode + document.getElementById("workbench-theme").textContent !== b, before)
  await sleep(150)
}
const buf = await browser.stopTracing()
await browser.close()

const { traceEvents } = JSON.parse(buf.toString())
// Frame id -> url from the tracing-start metadata and frame commit events.
const frameUrl = {}
for (const e of traceEvents) {
  const frames = e.args?.data?.frames
  if (frames) for (const f of frames) frameUrl[f.frame] = f.url
  if (e.name === "CommitLoad" && e.args?.data?.frame) frameUrl[e.args.data.frame] = e.args.data.url
}
const label = (id) => (!id ? "unattributed" : (frameUrl[id] ?? "").includes("preview=1") ? "preview" : frameUrl[id] ? "parent" : `frame:${id}`)
// Renderer main thread: the thread carrying the most RunTask time.
const byThread = {}
for (const e of traceEvents) if (e.name === "RunTask" && e.ph === "X") byThread[`${e.pid}:${e.tid}`] = (byThread[`${e.pid}:${e.tid}`] ?? 0) + e.dur
const main = Object.entries(byThread).sort((a, b) => b[1] - a[1])[0][0]
const events = traceEvents.filter((e) => `${e.pid}:${e.tid}` === main && e.ph === "X").sort((a, b) => a.ts - b.ts || b.dur - a.dur)

// Outermost JS entry points get their frame; style/layout/paint are counted by their own frame attribution.
const JS = new Set(["EventDispatch", "FunctionCall", "TimerFire", "FireAnimationFrame", "RunMicrotasks", "V8.Execute", "EvaluateScript", "v8.callFunction"])
const RENDER = new Set(["UpdateLayoutTree", "Layout", "Paint", "PrePaint", "Layerize", "Commit", "ParseAuthorStyleSheet", "InvalidateLayout", "ScheduleStyleRecalculation"])
const totals = {}
const add = (k, v) => (totals[k] = (totals[k] ?? 0) + v / 1000)
let jsEnd = -1
for (const e of events) {
  if (JS.has(e.name)) {
    if (e.ts >= jsEnd) {
      jsEnd = e.ts + e.dur
      add(`js:${label(e.args?.data?.frame)}`, e.dur)
      add(`jsby:${label(e.args?.data?.frame)}:${e.name}:${e.args?.data?.type ?? e.args?.data?.functionName ?? ""}`, e.dur)
    }
  } else if (RENDER.has(e.name)) {
    add(`${e.name}:${label(e.args?.data?.frame ?? e.args?.beginData?.frame ?? e.args?.data?.frameId)}`, e.dur)
  } else if (e.name === "RunTask") add("RunTask", e.dur)
}
const perAction = Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, +(v / N).toFixed(2)]).sort((a, b) => b[1] - a[1]))
const summary = { scenario: SCENARIO, n: N, viewport: `${VW}x${VH}`, url: URL, perActionMs: perAction }
fs.writeFileSync(OUT, JSON.stringify(summary, null, 1))
console.log(JSON.stringify(summary, null, 1))
