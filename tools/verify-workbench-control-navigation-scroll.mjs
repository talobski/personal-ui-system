// Offline WCN boundary verification. No credentials, network, or canonical runtime state.
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"

const base = "b6f1371f20374c2b77383f82baba874db986f5c7"
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd()
const read = path => readFileSync(path, "utf8")
const prior = path => execFileSync("git", ["show", base + ":" + path], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
const lines = value => value.split("\n").filter(Boolean)
const hash = value => createHash("sha256").update(value).digest("hex")
const admitted = new Set([
  "apps/workbench/src/App.tsx", "apps/workbench/src/LiveControls.tsx", "apps/workbench/src/PreviewFrame.tsx",
  "apps/workbench/src/styles.css", "apps/workbench/src/lifecycle.test.ts",
  "packages/ui/src/components/scroll-area.tsx", "packages/ui/src/components/scroll-area.stories.tsx",
  "packages/ui/src/scroll-area.test.ts", "packages/ui/src/quiet-workspace.test.ts", "packages/ui/src/foundation.test.ts",
  "packages/core/README.md", "packages/core/src/constraints/component-state.ts", "packages/core/src/contracts/data/scroll-area.ts",
  "packages/core/src/contracts/catalog.ts", "packages/core/src/contracts/contracts.test.ts",
  "packages/core/src/context/evaluator.ts", "packages/core/src/context/provenance.ts",
  "packages/core/src/context/context.acr11-fresh-agent-path.test.ts", "packages/core/src/context/context.get.test.ts",
  "packages/core/src/context/context.list.test.ts", "registry.json",
  "e2e/workbench-navigation.ts", "e2e/quiet-workspace.spec.ts", "e2e/workbench-theme-controls-polish.spec.ts",
  "e2e/workbench-rendering-controls-polish.spec.ts", "e2e/workbench-control-navigation-scroll.spec.ts",
  "e2e/scroll-area.spec.ts", "playwright.config.ts", "playwright.workbench.config.ts",
  "tools/verify-workbench-control-navigation-scroll.mjs",
  "docs/WORKBENCH_CONTROL_NAVIGATION_SCROLL_CHECKPOINT.md",
])
// Only explicitly named producer evidence may accompany the candidate.
const evidence = new Set(["unit.log", "typecheck.log", "workbench-build.log", "storybook-build.log",
  "registry-build.log", "registry-determinism.json", "browser-workbench.log", "browser-definitions.log", "boundary.json", "diff-check.log"])
const allowed = path => admitted.has(path) || (path.startsWith("docs/evidence/workbench-control-navigation-scroll/") && evidence.has(path.split("/").at(-1)))
const changed = [...new Set([...lines(git("diff", "--name-only", base)), ...lines(git("ls-files", "--others", "--exclude-standard"))])].filter(path => !path.startsWith(".tmp/")).sort()
for (const path of changed) {
  assert.ok(allowed(path), "Outside admitted scope: " + path)
  if (!path.startsWith("docs/evidence/")) {
    assert.doesNotMatch(read(path), /[ \t]+$/m, "Trailing whitespace: " + path)
    assert.ok(read(path).endsWith("\n"), "Missing final newline: " + path)
  }
}
assert.equal(git("diff", "--name-only", "--diff-filter=D", base), "", "No file deletions")
const tracked = lines(git("ls-tree", "-r", "--name-only", base))
// Never open tracked runtime records. Everything else outside the bounded allowlist is byte-frozen.
const frozen = tracked.filter(path => !admitted.has(path) && !path.startsWith(".loop/"))
for (const path of frozen) {
  const before = execFileSync("git", ["show", base + ":" + path], { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
  assert.equal(hash(readFileSync(path)), hash(before), "Frozen file changed: " + path)
}
const registry = JSON.parse(read("registry.json")), oldRegistry = JSON.parse(prior("registry.json"))
assert.equal(registry.items.length, 19)
assert.deepEqual(registry.items.filter(item => item.name !== "scroll-area"), oldRegistry.items)
assert.deepEqual(registry.items.at(-1).dependencies, ["cn", "radix-ui"])
assert.deepEqual(readdirSync("public/r").filter(p => p.endsWith(".json") && p !== "registry.json").sort(), registry.items.map(item => item.name + ".json").sort())
const operations = [...read("packages/core/src/mutations/mutation.ts").matchAll(/^\s+\["(set[A-Za-z]+)", new Set/gm)]
assert.equal(operations.length, 11)
const app = read("apps/workbench/src/App.tsx"), controls = read("apps/workbench/src/LiveControls.tsx"), css = read("apps/workbench/src/styles.css")
const preview = read("apps/workbench/src/PreviewFrame.tsx"), scroll = read("packages/ui/src/components/scroll-area.tsx")
// Existing operation handlers, persistence, proposal lifecycle and iframe transport stay byte-identical.
const logic = source => source.slice(source.indexOf("export function App()"), source.indexOf('    <SidebarProvider'))
assert.equal(logic(app), logic(prior("apps/workbench/src/App.tsx")))
// Existing resources and public primitive defaults are covered by the frozen file check.
assert.match(scroll, /import \{ ScrollArea as ScrollAreaPrimitive \} from "radix-ui"/)
assert.doesNotMatch(scroll, /onWheel|onPointer|onTouch|onKeyDown|addEventListener|preventDefault|fetch|process\.env/)
assert.equal((app.match(/<ScrollArea /g) ?? []).length, 3)
assert.match(app, /orientation="horizontal"/)
assert.match(app, /quiet-editor overflow-hidden/)
assert.doesNotMatch(preview, /ScrollArea|quiet-scroll|<Tabs/)
assert.doesNotMatch(css, /scrollbar-width|scrollbar-color|::-webkit-scrollbar|overflow:\s*overlay/)
assert.match(css, /quiet-scroll-area:focus-within/)
const typography = css.match(/\.quiet-control, \.quiet-control-group[^{]+\{([^}]+)\}/)[1]
for (const property of ["font-family", "font-size", "font-weight", "line-height", "letter-spacing"]) assert.ok(typography.includes(property))
assert.doesNotMatch(typography, /color|background|opacity|border/)
assert.match(controls, /grid-cols-\[6rem_minmax\(0,1fr\)_max-content\]/)
for (const fixed of ["w-[3.5rem]", "w-[1.5rem]", "gap-[0.375rem]"]) assert.ok(controls.includes(fixed))
assert.doesNotMatch(controls, /w-24|w-14|w-6\b|font-mono/)
assert.equal((app.match(/className="size-3\.5"/g) ?? []).length, 2)
assert.match(app, /<Download aria-hidden="true" className="size-3\.5"/)
assert.match(app, /<Save aria-hidden="true" className="size-3\.5"/)
assert.equal((app.match(/w-auto flex-none shrink-0 whitespace-nowrap text-sm/g) ?? []).length, 4)
assert.match(app, /quiet-categories w-max flex-nowrap justify-start bg-transparent/)
const oldTrigger = prior("apps/workbench/src/LiveControls.tsx").match(/<CollapsibleTrigger asChild>[\s\S]*?<Button [^>]*className="([^"]+)"/)[1]
const trigger = controls.match(/<CollapsibleTrigger asChild>[\s\S]*?<Button [^>]*className="([^"]+)"/)[1]
assert.equal(trigger, oldTrigger.replace("rounded-md", "rounded-sm"))
assert.match(controls, /className="size-3 transition-transform motion-reduce:transition-none"/)
for (const name of ["Select", "SelectTrigger", "SelectContent", "SelectItem"]) assert.ok(preview.includes("<" + name))
for (const path of changed.filter(path => /\.(test|spec)\.ts$/.test(path))) {
  const after = read(path)
  assert.doesNotMatch(after, /(?:it|test|describe)\.(?:only|todo|fixme)\(/)
  if (tracked.includes(path)) {
    const before = prior(path)
    assert.equal((after.match(/^\s*(?:it|test)(?:\.each\([^)]*\))?\(/gm) ?? []).length, (before.match(/^\s*(?:it|test)(?:\.each\([^)]*\))?\(/gm) ?? []).length, "Existing test count changed: " + path)
    assert.deepEqual(after.match(/(?:it|test|describe)\.skip\([^\n]*/g), before.match(/(?:it|test|describe)\.skip\([^\n]*/g), "Changed skips: " + path)
  }
}
for (const path of changed.filter(path => /^apps\/workbench\/src\//.test(path) && /\.(tsx?|css)$/.test(path) && !/\.test\.ts$/.test(path))) {
  assert.doesNotMatch(read(path), /\bfetch\s*\(|XMLHttpRequest|WebSocket|process\.env|import\.meta\.env|TYPESAFE_|https?:\/\//, "New network/credential surface: " + path)
}
const bundles = readdirSync("apps/workbench/dist/assets").filter(path => /\.(js|css)$/.test(path))
assert.ok(bundles.length)
for (const file of bundles) {
  const source = read("apps/workbench/dist/assets/" + file)
  assert.doesNotMatch(source, /TYPESAFE_(?:PERSONAL_UI_SYSTEM_API_KEY|LOOP_ENGINEERING_API_KEY|API_KEY)|api\.typesafe\.ai|@loop-engineering\/jev-core|fonts\.googleapis\.com|fonts\.gstatic\.com/)
  for (const face of source.match(/@font-face\s*\{[^}]*\}/g) ?? []) assert.doesNotMatch(face, /url\(\s*["']?(?:https?:|\/\/)/i)
}
console.log(JSON.stringify({
  phase: "workbench-control-navigation-scroll-v1-001", base, head: git("rev-parse", "HEAD"),
  candidateState: git("status", "--porcelain") ? "uncommitted" : "clean", result: "pass",
  changedFiles: changed, sourceSha256: hash(changed.filter(path => !path.startsWith("docs/evidence/")).map(path => path + "\0" + hash(readFileSync(path))).join("\0")),
  frozenFileCount: frozen.length, registryCount: registry.items.length, operationCount: operations.length,
  clientBundlesScanned: bundles,
  note: "Offline source/boundary evidence only. Browser execution and protected fresh verification remain Lead-owned.",
}, null, 2))
