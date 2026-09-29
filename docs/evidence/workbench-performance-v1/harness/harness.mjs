// PUI-118 producer profiling harness (ignored work file). Drives the production Workbench build served on 127.0.0.1.
// Usage: node harness.mjs --url http://127.0.0.1:5199 --runs 5 --out results.json [--viewport 1440x900] [--mode light|dark] [--scenarios a,b]
import { chromium } from "@playwright/test"
import fs from "node:fs"

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const URL = arg("url", "http://127.0.0.1:5199")
const RUNS = Number(arg("runs", "5"))
const OUT = arg("out", "results.json")
const [VW, VH] = arg("viewport", "1440x900").split("x").map(Number)
const MODE = arg("mode", "light")
const ONLY = arg("scenarios", "")?.split(",").filter(Boolean) ?? []
const WARMUP = Number(arg("warmup", "3"))
const REPEATS = Number(arg("repeats", "20"))
const CPU_RATE = Number(arg("cpu", "1"))

// Installed in every document (Workbench and preview iframe): input timestamps, a done-mark after the next frame
// following the first DOM mutation, and a production-safe React DevTools hook shim that counts commits and re-rendered
// function/class components (a fiber re-rendered when its props or state object changed from its alternate).
const INIT = () => {
  const isPreview = new URLSearchParams(location.search).has("preview")
  const now = () => performance.timeOrigin + performance.now()
  const P = (window.__perf = { isPreview, commits: 0, renders: 0, renderedByName: {}, input: null, done: null, mutations: 0, armed: false })
  const arm = (t) => {
    P.input = t
    P.done = null
    P.armed = true
  }
  for (const type of ["keydown", "pointerdown", "input", "click"]) {
    window.addEventListener(type, (e) => { if (P.armed === "wait-input") arm(performance.timeOrigin + e.timeStamp) }, true)
  }
  P.armManual = () => arm(now())
  P.waitInput = () => { P.armed = "wait-input"; P.input = null; P.done = null }
  const onMutate = () => {
    P.mutations++
    if (P.armed === true && P.done === null) {
      P.done = "pending"
      requestAnimationFrame(() => setTimeout(() => { P.done = now() }, 0))
    }
  }
  const startObserver = () => new MutationObserver(onMutate).observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true })
  if (document.documentElement) startObserver()
  else document.addEventListener("DOMContentLoaded", startObserver)

  // Mirrors React DevTools: a subtree whose child pointer is shared with its alternate was bailed out and not visited.
  const walk = (fiber, visit) => {
    const stack = fiber ? [fiber] : []
    while (stack.length) {
      const f = stack.pop()
      visit(f)
      if (f.sibling) stack.push(f.sibling)
      if (f.child && !(f.alternate && f.alternate.child === f.child)) stack.push(f.child)
    }
  }
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    renderers: new Map(),
    supportsFiber: true,
    inject(renderer) { this.renderers.set(1, renderer); return 1 },
    onScheduleFiberRoot() {},
    onCommitFiberUnmount() {},
    onPostCommitFiberRoot() {},
    checkDCE() {},
    onCommitFiberRoot(_id, root) {
      if (!P.count) return
      P.commits++
      walk(root.current.child, (f) => {
        // FunctionComponent 0, ClassComponent 1, ForwardRef 11, MemoComponent 14, SimpleMemoComponent 15
        if (![0, 1, 11, 14, 15].includes(f.tag)) return
        // Mounted in this commit, or PerformedWork (flag 1) set: the component function/render actually ran.
        const rendered = f.alternate === null || (f.flags & 1) === 1
        if (rendered) {
          P.renders++
          const t = f.type
          const name = (t && (t.displayName || t.name)) || (t && t.render && (t.render.displayName || t.render.name)) || (t && t.type && (t.type.displayName || t.type.name)) || "?"
          P.renderedByName[name] = (P.renderedByName[name] || 0) + 1
        }
      })
    },
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]
  const mean = s.reduce((a, b) => a + b, 0) / s.length
  const sd = Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, s.length - 1))
  return { n: s.length, min: s[0], p50: q(0.5), p90: q(0.9), max: s[s.length - 1], mean, sd }
}

async function metrics(cdp) {
  const { metrics } = await cdp.send("Performance.getMetrics")
  return Object.fromEntries(metrics.map((m) => [m.name, m.value]))
}

async function frames(page) {
  const parent = page.mainFrame()
  const preview = page.frames().find((f) => f.url().includes("preview=1"))
  return { parent, preview }
}

const resetCounts = (frame) => frame.evaluate(() => { const P = window.__perf; P.count = true; P.commits = 0; P.renders = 0; P.renderedByName = {} })
const readCounts = (frame) => frame.evaluate(() => { const P = window.__perf; P.count = false; return { commits: P.commits, renders: P.renders, renderedByName: P.renderedByName } })

/** Arms `target` to time from the next input event in `source` to the frame after `target`'s first mutation. */
async function timed(source, target, act) {
  await target.evaluate(() => { window.__perf.armed = false; window.__perf.done = null })
  await source.evaluate(() => window.__perf.waitInput())
  if (source !== target) {
    // Cross-document: the input is observed in `source`; `target` is armed immediately with that input time once seen.
    await target.evaluate(() => { const P = window.__perf; P.armed = true; P.done = null; P.input = null })
  }
  await act()
  await target.waitForFunction(() => typeof window.__perf.done === "number", null, { timeout: 5000 })
  const input = await source.evaluate(() => window.__perf.input)
  const done = await target.evaluate(() => window.__perf.done)
  return done - input
}

const SCENARIOS = {
  // Radius slider: one keyboard step per action (one committed edit + one history checkpoint).
  "geometry-radius-slider-key": {
    setup: async (page) => { await openCategory(page, "Geometry") },
    act: async (page, i) => {
      const { parent, preview } = await frames(page)
      const thumb = page.locator('[data-testid="control-radius"] [role="slider"]')
      return timed(parent, preview, () => thumb.press(i % 2 ? "ArrowLeft" : "ArrowRight"))
    },
  },
  // Canonical text entry for a semantic colour: one input event per action.
  "color-primary-text": {
    setup: async (page) => { await openCategory(page, "Colors") },
    act: async (page, i) => {
      const { parent, preview } = await frames(page)
      const input = page.locator("#color-primary-input")
      const value = i % 2 ? "#3355cc" : "#cc5533"
      return timed(parent, preview, () => input.fill(value))
    },
  },
  // Native colour picker movement: local feedback, then the 120 ms debounced canonical write reaches the preview.
  "color-primary-picker-move": {
    setup: async (page) => { await openCategory(page, "Colors") },
    act: async (page, i) => {
      const { parent, preview } = await frames(page)
      const value = i % 2 ? "#2266aa" : "#aa6622"
      const t = await timed(parent, preview, () => page.locator('[data-testid="color-primary-picker"]').evaluate((el, v) => {
        el.value = v
        el.dispatchEvent(new Event("input", { bubbles: true }))
      }, value))
      await page.locator('[data-testid="color-primary-picker"]').evaluate((el) => el.dispatchEvent(new Event("change", { bubbles: true })))
      await sleep(30)
      return t
    },
  },
  "mode-toggle": {
    setup: async () => {},
    act: async (page) => {
      const { parent, preview } = await frames(page)
      return timed(parent, preview, () => page.locator("#color-mode-switch").click())
    },
  },
  // Preview tab switching inside the iframe (all four panels are force-mounted; only visibility changes).
  "preview-tab-switch": {
    setup: async () => {},
    act: async (page, i) => {
      const { preview } = await frames(page)
      const names = ["Design system", "App shells", "States", "Cards"]
      return timed(preview, preview, () => preview.getByRole("tab", { name: names[i % 4], exact: true }).click())
    },
  },
  "sidebar-category-switch": {
    setup: async () => {},
    act: async (page, i) => {
      const { parent } = await frames(page)
      const names = ["Typography", "Geometry", "Effects", "Colors"]
      return timed(parent, parent, () => page.getByRole("tab", { name: names[i % 4], exact: true }).click())
    },
  },
  // Built-in theme switch through the Select: timed from the option click to the preview frame.
  "theme-switch": {
    setup: async () => {},
    act: async (page, i) => {
      const { parent, preview } = await frames(page)
      await page.locator("#theme-select").click()
      const option = page.getByRole("option", { name: i % 2 ? "Default" : "Quiet Editorial" })
      await option.waitFor()
      return timed(parent, preview, () => option.click())
    },
  },
  "undo-redo": {
    setup: async (page) => {
      await openCategory(page, "Geometry")
      const thumb = page.locator('[data-testid="control-radius"] [role="slider"]')
      for (let k = 0; k < 4; k++) await thumb.press("ArrowRight")
    },
    act: async (page, i) => {
      const { parent, preview } = await frames(page)
      return timed(parent, preview, () => page.getByRole("button", { name: i % 2 ? "Redo" : "Undo", exact: true }).click())
    },
  },
}

async function openCategory(page, name) {
  if (VW < 768) {
    const open = await page.locator('[data-sidebar="sidebar"][data-mobile="true"]').count()
    if (!open) await page.locator('[data-sidebar="trigger"]').click()
  }
  await page.getByRole("tab", { name, exact: true }).click()
  await sleep(100)
}

async function runOnce(browser, runIndex) {
  const context = await browser.newContext({ viewport: { width: VW, height: VH } })
  await context.addInitScript(INIT)
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send("Performance.enable")
  if (CPU_RATE > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_RATE })
  const t0 = Date.now()
  await page.goto(URL)
  const out = { run: runIndex, scenarios: {} }
  await page.waitForFunction(() => document.querySelector("iframe")?.contentDocument?.querySelector('[data-testid="preview"][data-ready="true"]'))
  out.loadToReadyMs = Date.now() - t0
  await sleep(500)
  if (MODE === "dark") await page.locator("#color-mode-switch").click()
  await sleep(200)
  for (const [name, sc] of Object.entries(SCENARIOS)) {
    if (ONLY.length && !ONLY.includes(name)) continue
    await sc.setup(page)
    for (let i = 0; i < WARMUP; i++) await sc.act(page, i)
    const { parent, preview } = await frames(page)
    await resetCounts(parent)
    await resetCounts(preview)
    const m0 = await metrics(cdp)
    const samples = []
    for (let i = WARMUP; i < WARMUP + REPEATS; i++) samples.push(await sc.act(page, i))
    const m1 = await metrics(cdp)
    const pc = await readCounts(parent)
    const vc = await readCounts(preview)
    const per = (k) => ((m1[k] - m0[k]) * 1000) / REPEATS
    out.scenarios[name] = {
      latencyMs: samples,
      stats: stats(samples),
      perActionMs: { task: per("TaskDuration"), script: per("ScriptDuration"), recalcStyle: per("RecalcStyleDuration"), layout: per("LayoutDuration") },
      perAction: { recalcStyleCount: (m1.RecalcStyleCount - m0.RecalcStyleCount) / REPEATS, layoutCount: (m1.LayoutCount - m0.LayoutCount) / REPEATS },
      react: {
        parent: { commits: pc.commits / REPEATS, renders: pc.renders / REPEATS, top: topN(pc.renderedByName, REPEATS) },
        preview: { commits: vc.commits / REPEATS, renders: vc.renders / REPEATS, top: topN(vc.renderedByName, REPEATS) },
      },
      nodes: m1.Nodes,
    }
    process.stderr.write(`run ${runIndex} ${name}: p50 ${out.scenarios[name].stats.p50.toFixed(1)}ms task ${out.scenarios[name].perActionMs.task.toFixed(1)}ms renders parent ${out.scenarios[name].react.parent.renders} preview ${out.scenarios[name].react.preview.renders}\n`)
  }
  await context.close()
  return out
}

const topN = (map, div) => Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => [k, v / div])

const browser = await chromium.launch()
const meta = { url: URL, runs: RUNS, viewport: `${VW}x${VH}`, mode: MODE, warmup: WARMUP, repeats: REPEATS, cpuThrottle: CPU_RATE, browserVersion: browser.version(), startedAt: new Date().toISOString() }
const results = []
for (let r = 0; r < RUNS; r++) results.push(await runOnce(browser, r))
await browser.close()
fs.writeFileSync(OUT, JSON.stringify({ meta, results }, null, 1))
// Summary across runs: per-run medians, then median/min/max of those.
const summary = {}
for (const name of Object.keys(results[0].scenarios)) {
  const p50s = results.map((r) => r.scenarios[name].stats.p50)
  const tasks = results.map((r) => r.scenarios[name].perActionMs.task)
  summary[name] = { runP50s: p50s.map((x) => +x.toFixed(1)), medianOfP50: stats(p50s).p50, taskPerAction: tasks.map((x) => +x.toFixed(1)), react: results[0].scenarios[name].react }
}
console.log(JSON.stringify({ meta, summary }, null, 1))
