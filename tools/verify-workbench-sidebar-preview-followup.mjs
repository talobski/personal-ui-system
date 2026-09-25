// Offline WSPF boundary verification. No credentials, network, browser, or canonical runtime state.
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"

const accepted = "90ea824027f71c8e9ef3e376d6c5c6263b56dee9"
const base = "a65c4ebd46d1e9ab63217645e05b18551b62ca37"
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd()
const read = path => readFileSync(path, "utf8")
const prior = path => execFileSync("git", ["show", base + ":" + path], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
const lines = value => value.split("\n").filter(Boolean)
const hash = value => createHash("sha256").update(value).digest("hex")

// The prepared base only adds phase-admission documents to the accepted product.
assert.deepEqual(lines(git("diff", "--name-only", accepted, base)).sort(), [
  ".loop/runs/workbench-sidebar-preview-followup-v1-001/task.md", "BRIEF.md", "docs/WORKBENCH_SIDEBAR_PREVIEW_FOLLOWUP_CONTRACT.md",
])

// WSPF-01: bounded delivery.
const admitted = new Set([
  "apps/workbench/src/App.tsx", "apps/workbench/src/LiveControls.tsx", "apps/workbench/src/PreviewFrame.tsx",
  "apps/workbench/src/styles.css", "apps/workbench/src/lifecycle.test.ts", "packages/ui/src/quiet-workspace.test.ts",
  "e2e/known-contrast-debt.ts", "e2e/workbench-sidebar-preview-followup.spec.ts",
  "e2e/design-command.spec.ts", "e2e/proposal-preview.spec.ts", "e2e/quiet-workspace.spec.ts", "e2e/theme-v2-live-controls.spec.ts",
  "e2e/workbench-control-navigation-scroll.spec.ts", "e2e/workbench-rendering-controls-polish.spec.ts",
  "e2e/workbench-theme-controls-polish.spec.ts", "e2e/workbench.spec.ts",
  "playwright.config.ts", "playwright.workbench.config.ts",
  "tools/verify-workbench-sidebar-preview-followup.mjs", "docs/WORKBENCH_SIDEBAR_PREVIEW_FOLLOWUP_CHECKPOINT.md",
])
const evidenceDir = "docs/evidence/workbench-sidebar-preview-followup/"
const evidence = new Set(["unit.log", "typecheck.log", "registry-build.log", "workbench-build.log", "storybook-build.log",
  "browser-definitions.log", "boundary.json", "diff-check.log", "contrast.json"])
const allowed = path => admitted.has(path) || (path.startsWith(evidenceDir) && evidence.has(path.slice(evidenceDir.length)))
// Worker scratch space is never part of the candidate.
const scratch = path => path.startsWith(".worker-tmp/") || path.startsWith(".tmp/")
const changed = [...new Set([...lines(git("diff", "--name-only", base)), ...lines(git("ls-files", "--others", "--exclude-standard"))])].filter(path => !scratch(path)).sort()
for (const path of changed) {
  assert.ok(allowed(path), "Outside admitted scope: " + path)
  if (!path.startsWith(evidenceDir)) {
    assert.doesNotMatch(read(path), /[ \t]+$/m, "Trailing whitespace: " + path)
    assert.ok(read(path).endsWith("\n") && !read(path).endsWith("\n\n"), "Final newline: " + path)
  }
}
assert.equal(git("diff", "--name-only", "--diff-filter=D", base), "", "No file deletions")

// WSPF-12: everything else, including Theme v2 tokens, schemas, mutations, persistence, Jev, public components,
// registry sources, dependencies, and the lockfile, is byte-frozen. Tracked runtime records are never opened.
const tracked = lines(git("ls-tree", "-r", "--name-only", base))
const frozen = tracked.filter(path => !admitted.has(path) && !path.startsWith(".loop/"))
for (const path of frozen) {
  const before = execFileSync("git", ["show", base + ":" + path], { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
  assert.equal(hash(readFileSync(path)), hash(before), "Frozen file changed: " + path)
}
for (const path of ["package.json", "pnpm-lock.yaml", "registry.json", "packages/ui/package.json", "apps/workbench/package.json", "packages/core/src/theme/fixtures/default.json", "packages/core/src/theme/fixtures/default.css"]) {
  assert.ok(frozen.includes(path), "Expected frozen: " + path)
}
assert.equal(git("status", "--porcelain", "--", ".loop"), "", "No runtime-state edits")
const registry = JSON.parse(read("registry.json"))
assert.equal(registry.items.length, 19)
assert.deepEqual(registry, JSON.parse(prior("registry.json")))
assert.deepEqual(readdirSync("public/r").filter(p => p.endsWith(".json") && p !== "registry.json").sort(), registry.items.map(item => item.name + ".json").sort())
const operations = [...read("packages/core/src/mutations/mutation.ts").matchAll(/^\s+\["(set[A-Za-z]+)", new Set/gm)]
assert.equal(operations.length, 11)

const app = read("apps/workbench/src/App.tsx"), controls = read("apps/workbench/src/LiveControls.tsx")
const preview = read("apps/workbench/src/PreviewFrame.tsx"), css = read("apps/workbench/src/styles.css")
// WSPF-11: operation handlers, persistence, proposal lifecycle, and iframe transport are byte-identical.
const logic = source => source.slice(source.indexOf("export function App()"), source.indexOf("    <SidebarProvider"))
assert.equal(logic(app), logic(prior("apps/workbench/src/App.tsx")))
const transport = source => {
  const end = source.includes("\n  // The root ScrollArea") ? "\n  // The root ScrollArea" : "\n  return (\n"
  return source.slice(source.indexOf("export function PreviewFrame()"), source.indexOf(end))
}
assert.equal(transport(preview), transport(prior("apps/workbench/src/PreviewFrame.tsx")))

// WSPF-02: full-width horizontal owner, 16px inset inside scrolling content, one horizontal ScrollArea.
assert.match(app, /<SidebarGroup className="shrink-0 bg-card p-0">\s*<ScrollArea orientation="horizontal" type="auto" className="quiet-scroll-area w-full min-w-0 max-w-full overflow-hidden" viewportProps=\{\{ role: "region", "aria-label": "Editor category navigation", tabIndex: 0 \}\}>\s*<div data-testid="category-inset" className="w-max p-4">/)
assert.equal((app.match(/orientation="horizontal"/g) ?? []).length, 1)
assert.equal((app.match(/<ScrollArea /g) ?? []).length, 3)
assert.match(app, /<SidebarContent className="quiet-editor overflow-hidden"/)
// WSPF-03: official Tabs, transparent padding-free list, approved trigger state classes.
assert.match(app, /<TabsList className="quiet-categories w-max flex-nowrap justify-start bg-transparent p-0" aria-label="Editor categories">/)
const tabClass = app.match(/const CATEGORY_TRIGGER_CLASS =\s*"([^"]+)"/)[1].split(" ")
assert.deepEqual(tabClass, ["h-[calc(100%-7px)]", "w-auto", "flex-none", "shrink-0", "cursor-pointer", "whitespace-nowrap", "px-3", "text-sm",
  "text-muted-foreground", "dark:text-muted-foreground", "data-[state=inactive]:bg-transparent", "data-[state=inactive]:hover:text-muted-foreground/80",
  "data-[state=active]:bg-secondary", "data-[state=active]:text-secondary-foreground", "data-[state=active]:shadow-none",
  "dark:data-[state=active]:border-transparent", "dark:data-[state=active]:bg-secondary", "dark:data-[state=active]:text-secondary-foreground"])
assert.equal((app.match(/<TabsTrigger value="[a-z]+" className=\{CATEGORY_TRIGGER_CLASS\}>/g) ?? []).length, 4)
// WSPF-04: only border-b is added to the 64px header.
assert.equal(prior("apps/workbench/src/App.tsx").match(/<SidebarHeader className="([^"]+)"/)[1], "h-16 shrink-0 flex-row items-center px-2 py-0")
assert.equal(app.match(/<SidebarHeader className="([^"]+)"/)[1], "h-16 shrink-0 flex-row items-center border-b px-2 py-0")
// WSPF-05: the exact semantic trigger; nothing else in LiveControls changes.
const triggerClass = "h-auto w-fit rounded-sm bg-muted px-2 py-0.5 text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground ring-1 ring-border hover:bg-muted/80 hover:text-muted-foreground dark:hover:bg-muted/80 has-[>svg]:px-2 [&[data-state=open]>svg]:rotate-180"
const trigger = source => source.match(/<CollapsibleTrigger asChild>[\s\S]*?<Button [^>]*className="([^"]+)"/)[1]
assert.equal(trigger(controls), triggerClass)
assert.doesNotMatch(trigger(controls), /text-foreground|accent|\[#|oklch|rgb|hsl/)
const withoutTrigger = source => source.replace(/<CollapsibleTrigger asChild>[\s\S]*?<Button [^>]*className="[^"]+">/, "<TRIGGER>")
assert.equal(withoutTrigger(controls), withoutTrigger(prior("apps/workbench/src/LiveControls.tsx")))
assert.match(controls, /className="size-3 transition-transform motion-reduce:transition-none"/)
// WSPF-07/08: official preview Select with a preview-scoped ghost trigger; gap-4 p-4 root.
for (const name of ["Select", "SelectTrigger", "SelectValue", "SelectContent", "SelectItem"]) assert.ok(preview.includes("<" + name))
const previewTrigger = preview.match(/<SelectTrigger size="sm" aria-label="Preview views" className="([^"]+)"/)[1].split(" ")
for (const token of ["quiet-control", "min-w-[6rem]", "border-transparent", "bg-transparent", "shadow-none", "hover:bg-accent", "hover:text-accent-foreground", "dark:bg-transparent"]) assert.ok(previewTrigger.includes(token), token)
assert.ok(!previewTrigger.some(token => /^(?:focus-visible:|outline-none|ring-0|border-0)/.test(token)), "Focus affordance retained")
assert.match(preview, /<div className="flex justify-center">/)
assert.match(preview, /<main\s+className="grid gap-4 p-4"/)
assert.ok(preview.includes('<div hidden={view !== "states"} className={view === "states" ? "grid gap-6" : "hidden"}>'))
// WSPF-09: exactly one vertical preview-document root ScrollArea; no outer iframe ScrollArea; no competing root overflow.
assert.equal((preview.match(/<ScrollArea /g) ?? []).length, 1)
assert.match(preview, /return \(\s*<ScrollArea type="auto" className="quiet-scroll-area h-dvh w-full" data-testid="preview-scroll" viewportProps=\{\{ role: "group", "aria-label": "Preview document", tabIndex: 0 \}\}>\s*<main/)
assert.doesNotMatch(preview, /orientation=|<Tabs|onWheel|onScroll|onPointer|onTouch|addEventListener\("(?:wheel|scroll|touch)/)
assert.match(preview, /document\.documentElement\.classList\.add\("quiet-preview-document"\)/)
assert.match(css, /\.quiet-preview-document, \.quiet-preview-document body \{ height: 100%; overflow: hidden; \}/)
assert.doesNotMatch(css, /scrollbar-width|scrollbar-color|scrollbar-gutter|::-webkit-scrollbar|overflow:\s*overlay|overscroll-behavior/)
const outer = app.slice(app.indexOf('<div className="quiet-preview-body">'), app.indexOf("</SidebarInset>"))
assert.doesNotMatch(outer, /ScrollArea/)
assert.equal(outer, prior("apps/workbench/src/App.tsx").slice(prior("apps/workbench/src/App.tsx").indexOf('<div className="quiet-preview-body">'), prior("apps/workbench/src/App.tsx").indexOf("</SidebarInset>")))

// WSPF-06: the one known exception is exact, recorded, and routed through a single helper; nothing else is filtered.
const debt = read("e2e/known-contrast-debt.ts")
for (const fixed of ['rule: "color-contrast"', `element: '[data-testid^="section-"] > h3 > button'`, 'fgColor: "#737373"', 'bgColor: "#f5f5f5"', "minRatio: 4.3", "maxRatio: 4.4", "info.attach(", "info.annotations.push("]) assert.ok(debt.includes(fixed), fixed)
const workbenchSpecs = read("playwright.workbench.config.ts").match(/testMatch:\s*\[([^\]]+)\]/)[1].match(/"([^"]+)"/g).map(name => name.slice(1, -1))
assert.ok(workbenchSpecs.includes("workbench-sidebar-preview-followup.spec.ts"))
assert.ok(read("playwright.config.ts").includes('"workbench-sidebar-preview-followup.spec.ts",'), "Storybook runner ignores the Workbench spec")
for (const name of workbenchSpecs) {
  const spec = read("e2e/" + name)
  if (!spec.includes("new AxeBuilder")) continue
  assert.ok(spec.includes("seriousOutsideKnownDebt("), "Axe routed through known-debt helper: " + name)
  assert.doesNotMatch(spec, /impact === "(?:serious|critical)"/, "No parallel ad hoc axe filter: " + name)
  assert.doesNotMatch(spec, /\.(?:disableRules|exclude|include|withRules|withTags|options)\(/, "No axe rule suppression: " + name)
}
const phaseSpec = read("e2e/workbench-sidebar-preview-followup.spec.ts")
for (const required of ["WSPF-02", "WSPF-03", "WSPF-04", "WSPF-05", "WSPF-06", "WSPF-07", "WSPF-08", "WSPF-09", "WSPF-10", "WSPF-11", "wheel", "PageDown", "mouse.down", "touchStart", "reducedMotion", "Preview document"]) assert.ok(phaseSpec.includes(required), required)

// Test hygiene: no focused/skipped additions and unchanged existing test counts.
for (const path of changed.filter(path => /\.(test|spec)\.ts$/.test(path))) {
  const after = read(path)
  assert.doesNotMatch(after, /(?:it|test|describe)\.(?:only|todo|fixme)\(/, "No focused tests: " + path)
  const skips = source => source.match(/(?:it|test|describe)\.skip\([^\n]*/g)
  if (!tracked.includes(path)) assert.equal(skips(after), null, "No skips in new tests: " + path)
  if (tracked.includes(path)) {
    assert.deepEqual(skips(after), skips(prior(path)), "Changed skips: " + path)
    const count = source => (source.match(/^\s*(?:it|test)(?:\.each\([^)]*\))?\(/gm) ?? []).length
    assert.ok(count(after) >= count(prior(path)), "Existing tests removed: " + path)
  }
}
// No new network or credential surface; built client stays credential-free and offline.
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
  phase: "workbench-sidebar-preview-followup-v1-001", accepted, base, head: git("rev-parse", "HEAD"),
  candidateState: lines(git("status", "--porcelain")).filter(line => !scratch(line.slice(3))).length ? "uncommitted" : "clean",
  result: "pass", changedFiles: changed,
  sourceSha256: hash(changed.filter(path => !path.startsWith(evidenceDir)).map(path => path + "\0" + hash(readFileSync(path))).join("\0")),
  frozenFileCount: frozen.length, registryCount: registry.items.length, operationCount: operations.length,
  workbenchSpecs, clientBundlesScanned: bundles,
  knownDebt: { pairing: "Default light muted-foreground #737373 on muted #f5f5f5", disposition: "pre-approved deferred Default-theme debt; measured and recorded, not suppressed" },
  note: "Offline source/boundary evidence only. Browser execution and protected fresh verification remain Lead-owned.",
}, null, 2))
