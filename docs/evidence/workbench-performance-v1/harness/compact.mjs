// Compacts harness output into committed evidence and prints a markdown summary table.
// Usage: node compact.mjs <in.json> <out.json> [label]
import fs from "node:fs"

const [, , input, output, label = input] = process.argv
const { meta, results } = JSON.parse(fs.readFileSync(input, "utf8"))
const r1 = (x) => Math.round(x * 10) / 10
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const names = Object.keys(results[0].scenarios)
const scenarios = {}
for (const name of names) {
  const runs = results.map((r) => r.scenarios[name])
  const all = runs.flatMap((s) => s.latencyMs)
  scenarios[name] = {
    samplesMsByRun: runs.map((s) => s.latencyMs.map(r1)),
    runP50Ms: runs.map((s) => r1(s.stats.p50)),
    runP90Ms: runs.map((s) => r1(s.stats.p90)),
    pooled: { n: all.length, p50: r1(median(all)), min: r1(Math.min(...all)), max: r1(Math.max(...all)) },
    perActionMsByRun: runs.map((s) => Object.fromEntries(Object.entries(s.perActionMs).map(([k, v]) => [k, r1(v)]))),
    reactPerAction: {
      parent: { commits: r1(runs[0].react.parent.commits), renders: r1(median(runs.map((s) => s.react.parent.renders))) },
      preview: { commits: r1(runs[0].react.preview.commits), renders: r1(median(runs.map((s) => s.react.preview.renders))) },
    },
  }
}
fs.writeFileSync(output, `${JSON.stringify({ meta, scenarios }, null, 1)}\n`)
console.log(`\n${label} (${meta.viewport}, ${meta.mode}, cpu x${meta.cpuThrottle}, ${meta.runs} runs x ${meta.repeats} samples after ${meta.warmup} warmup)\n`)
console.log("| Scenario | Input→next-frame p50 per run (ms) | Pooled p50 (ms) | Main-thread task / action, median run (ms) | Script / Style / Layout (ms) | React renders / action parent · preview |")
console.log("|---|---|---|---|---|---|")
for (const [name, s] of Object.entries(scenarios)) {
  const tasks = s.perActionMsByRun.map((p) => p.task)
  const mid = s.perActionMsByRun[s.perActionMsByRun.map((p) => p.task).indexOf([...tasks].sort((a, b) => a - b)[tasks.length >> 1])]
  console.log(`| ${name} | ${s.runP50Ms.join(", ")} | ${s.pooled.p50} | ${mid.task} | ${mid.script} / ${mid.recalcStyle} / ${mid.layout} | ${s.reactPerAction.parent.renders} · ${s.reactPerAction.preview.renders} |`)
}
