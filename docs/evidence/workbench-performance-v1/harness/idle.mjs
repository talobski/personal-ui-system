import { chromium } from "@playwright/test"
const b = await chromium.launch()
for (const url of ["http://127.0.0.1:5197", "http://127.0.0.1:5199", "http://127.0.0.1:5197", "http://127.0.0.1:5199"]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p)
  await cdp.send("Performance.enable")
  const t0 = Date.now(); await p.goto(url)
  await p.waitForFunction(() => document.querySelector("iframe")?.contentDocument?.querySelector('[data-ready="true"]'))
  const tReady = Date.now() - t0
  const m = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map(x => [x.name, x.value]))
  const a = await m(); await new Promise(r => setTimeout(r, 300)); const a2 = await m(); await new Promise(r => setTimeout(r, 3000)); const c = await m()
  const d = (x, y, k) => ((y[k] - x[k]) * 1000).toFixed(1)
  console.log(url, `ready ${tReady}ms | first 300ms after ready: task ${d(a, a2, "TaskDuration")} script ${d(a, a2, "ScriptDuration")} | next 3s idle: task ${d(a2, c, "TaskDuration")} script ${d(a2, c, "ScriptDuration")} style ${d(a2, c, "RecalcStyleDuration")}`)
  await ctx.close()
}
await b.close()
