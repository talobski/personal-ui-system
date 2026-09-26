// Offline WSTP boundary verification. No credentials, network, browser, or canonical runtime state.
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"

const accepted = "d3ce5ec5822da47db94b509f8848203520154eb6"
const base = "82cd428e294bc9f52b041af244002f4f20252344"
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd()
const read = path => readFileSync(path, "utf8")
const prior = path => execFileSync("git", ["show", base + ":" + path], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
const lines = value => value.split("\n").filter(Boolean)
const hash = value => createHash("sha256").update(value).digest("hex")

// WSTP-01: the prepared base only adds phase-admission documents to the accepted product. Admission records are
// identified by their git blob ids; their contents are not opened here.
const admission = [
  ".loop/runs/workbench-sidebar-theme-polish-v1-001/linear-ticket-snapshots.md", ".loop/runs/workbench-sidebar-theme-polish-v1-001/task.md",
  "BRIEF.md", "docs/WORKBENCH_SIDEBAR_THEME_POLISH_CONTRACT.md",
]
assert.deepEqual(lines(git("diff", "--name-only", accepted, base)).sort(), admission)
const admissionBlobs = Object.fromEntries(admission.map(path => [path, git("rev-parse", base + ":" + path)]))

// WSTP-02: bounded delivery.
const admitted = new Set([
  // Theme/schema/migration/rendering, mutation/diff/context, and their fixtures and tests.
  "packages/core/README.md", "packages/core/src/index.ts",
  "packages/core/src/theme/schema.ts", "packages/core/src/theme/migrate.ts", "packages/core/src/theme/render.ts", "packages/core/src/theme/diff.ts",
  "packages/core/src/theme/fixtures/default.json", "packages/core/src/theme/fixtures/default.css", "packages/core/src/theme/fixtures/quiet-editorial.css",
  "packages/core/src/theme/fixtures/default.conversion.json",
  "packages/core/src/theme/theme.test.ts", "packages/core/src/theme/default.test.ts", "packages/core/src/theme/sidebar-tokens.test.ts",
  "packages/core/src/mutations/mutation.ts", "packages/core/src/mutations/mutation.v2.test.ts",
  "packages/core/src/context/capability-descriptions.ts", "packages/core/src/context/provenance.ts", "packages/core/src/context/context.get.test.ts",
  "packages/core/src/constraints/component-state.ts", "packages/core/src/constraints/fixtures/valid.json", "packages/core/src/constraints/fixtures/invalid.json",
  "packages/core/src/contracts/data/sidebar.ts",
  // Sidebar/ScrollArea public styling and their tests.
  "packages/ui/src/components/sidebar.tsx", "packages/ui/src/components/scroll-area.tsx",
  "packages/ui/src/foundation.test.ts", "packages/ui/src/scroll-area.test.ts", "packages/ui/src/quiet-workspace.test.ts",
  // Workbench controls.
  "apps/workbench/src/App.tsx", "apps/workbench/src/LiveControls.tsx", "apps/workbench/src/controls.ts", "apps/workbench/src/styles.css",
  "apps/workbench/src/lifecycle.test.ts",
  // Browser definitions (Lead-executed).
  "e2e/workbench-sidebar-theme-polish.spec.ts", "e2e/workbench-navigation.ts", "e2e/quiet-workspace.spec.ts",
  "e2e/sidebar.spec.ts", "e2e/theme-v2-live-controls.spec.ts", "e2e/workbench-control-navigation-scroll.spec.ts",
  "e2e/workbench-rendering-controls-polish.spec.ts", "e2e/workbench-sidebar-preview-followup.spec.ts", "e2e/workbench-theme-controls-polish.spec.ts", "e2e/workbench.spec.ts",
  "playwright.config.ts", "playwright.workbench.config.ts",
  // Phase evidence.
  "tools/verify-workbench-sidebar-theme-polish.mjs", "docs/WORKBENCH_SIDEBAR_THEME_POLISH_CHECKPOINT.md",
])
const evidenceDir = "docs/evidence/workbench-sidebar-theme-polish/"
const evidence = new Set(["unit.log", "typecheck.log", "registry-build.log", "workbench-build.log", "storybook-build.log",
  "generated-css.log", "browser-definitions.log", "worker-browser-smoke.log", "boundary.json", "diff-check.log"])
const allowed = path => admitted.has(path) || (path.startsWith(evidenceDir) && evidence.has(path.slice(evidenceDir.length)))
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

// WSTP-14: everything else, including dependencies, lockfile, registry, the public Button, and Jev, is byte-frozen.
const tracked = lines(git("ls-tree", "-r", "--name-only", base))
const frozen = tracked.filter(path => !admitted.has(path) && !path.startsWith(".loop/"))
for (const path of frozen) {
  const before = execFileSync("git", ["show", base + ":" + path], { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
  assert.equal(hash(readFileSync(path)), hash(before), "Frozen file changed: " + path)
}
for (const path of ["package.json", "pnpm-lock.yaml", "registry.json", "packages/ui/package.json", "apps/workbench/package.json", "packages/core/package.json",
  "packages/ui/src/components/button.tsx", "packages/ui/src/components/switch.tsx", "packages/ui/src/components/tabs.tsx", "packages/ui/src/components/select.tsx",
  "apps/workbench/src/persistence.ts", "apps/workbench/src/lifecycle.ts", "apps/workbench/src/PreviewFrame.tsx", "packages/core/src/mutations/proposal.ts",
  "packages/core/src/theme/fixtures/valid.json", "packages/core/src/theme/schema-v1.ts"]) {
  assert.ok(frozen.includes(path), "Expected frozen: " + path)
}
assert.equal(git("status", "--porcelain", "--", ".loop"), "", "No runtime-state edits")
const registry = JSON.parse(read("registry.json"))
assert.equal(registry.items.length, 19)
assert.deepEqual(registry, JSON.parse(prior("registry.json")))
assert.deepEqual(readdirSync("public/r").filter(p => p.endsWith(".json") && p !== "registry.json").sort(), registry.items.map(item => item.name + ".json").sort())

// WSTP-08: exactly one added operation.
const operationNames = source => [...source.matchAll(/^\s+\["(set[A-Za-z]+)", new Set/gm)].map(match => match[1])
const operations = operationNames(read("packages/core/src/mutations/mutation.ts"))
assert.equal(operations.length, 12)
assert.deepEqual(operations.filter(name => !operationNames(prior("packages/core/src/mutations/mutation.ts")).includes(name)), ["setSidebarTokensEnabled"])

// WSTP-03: canonical v2.1 with exactly the eight Sidebar colours and the approved state; no sidebar-input/card.
const schema = read("packages/core/src/theme/schema.ts")
assert.match(schema, /export const THEME_SCHEMA_VERSION = "2\.1" as const/)
const sidebarTokens = schema.match(/export const SIDEBAR_COLOR_TOKENS = \[([^\]]+)\]/)[1].match(/"([^"]+)"/g).map(token => token.slice(1, -1))
assert.deepEqual(sidebarTokens, ["sidebar", "sidebar-foreground", "sidebar-primary", "sidebar-primary-foreground", "sidebar-accent", "sidebar-accent-foreground", "sidebar-border", "sidebar-ring"])
assert.match(schema, /useDedicatedTokens: token\("boolean", z\.boolean\(\)\),\s*dedicatedValuesInitialized: z\.boolean\(\),/)
const fixture = JSON.parse(read("packages/core/src/theme/fixtures/default.json"))
// No sidebar-input/card token is declared, stored, or rendered (the constraint fixtures may still name one to reject it).
assert.doesNotMatch(schema.slice(schema.indexOf("export const BASE_COLOR_TOKENS"), schema.indexOf("export const COLOR_TOKENS")), /"sidebar-(?:input|card)"/)
for (const mode of ["light", "dark"]) assert.deepEqual(Object.keys(fixture.colors[mode]).filter(name => name.startsWith("sidebar")), sidebarTokens)
for (const name of ["default.css", "quiet-editorial.css"]) assert.doesNotMatch(read("packages/core/src/theme/fixtures/" + name), /--(?:color-)?sidebar-(?:input|card)/)
assert.equal(fixture.schemaVersion, "2.1")
assert.deepEqual(fixture.sidebar, { useDedicatedTokens: { $type: "boolean", $value: false }, dedicatedValuesInitialized: false })
// WSTP-06: exact off aliases.
const aliases = Object.fromEntries([...schema.match(/SIDEBAR_TOKEN_ALIASES[^{]*\{([^}]+)\}/)[1].matchAll(/"?([a-z-]+)"?: "([a-z-]+)"/g)].map(match => [match[1], match[2]]))
assert.deepEqual(aliases, { sidebar: "background", "sidebar-foreground": "foreground", "sidebar-primary": "primary", "sidebar-primary-foreground": "primary-foreground", "sidebar-accent": "accent", "sidebar-accent-foreground": "accent-foreground", "sidebar-border": "border", "sidebar-ring": "ring" })
for (const css of ["default.css", "quiet-editorial.css"].map(name => read("packages/core/src/theme/fixtures/" + name))) {
  for (const [token, alias] of Object.entries(aliases)) assert.equal((css.match(new RegExp(`^  --${token}: var\\(--${alias}\\);$`, "gm")) ?? []).length, 2, token)
}
// Initialization bookkeeping never reaches controls, context vocabulary, or Design Command vocabulary.
for (const path of ["apps/workbench/src/App.tsx", "apps/workbench/src/LiveControls.tsx", "apps/workbench/src/controls.ts", "packages/core/src/context/capability-descriptions.ts"]) {
  assert.doesNotMatch(read(path), /dedicatedValuesInitialized|initiali[sz]ed/i, "Bookkeeping exposed: " + path)
}
for (const file of readdirSync("packages/core/src/jev-design")) assert.doesNotMatch(read("packages/core/src/jev-design/" + file), /dedicatedValuesInitialized|setSidebarTokensEnabled/, file)
// The Sidebar consumes canonical sidebar-* semantics; no card fill and no literal colours.
const sidebar = read("packages/ui/src/components/sidebar.tsx")
assert.doesNotMatch(sidebar, /(?:bg|text|border)-card\b|#[0-9a-f]{3,8}\b|oklch\(|hsl\(|rgb\(/i)
assert.match(sidebar, /flex h-full w-\(--sidebar-width\) flex-col bg-sidebar text-sidebar-foreground/)

const app = read("apps/workbench/src/App.tsx"), controls = read("apps/workbench/src/LiveControls.tsx"), models = read("apps/workbench/src/controls.ts")
// WSTP-07: one Sidebar group with the official Switch, exact copy, fields ungated by the mode.
assert.match(models, /\{ id: "sidebar", title: "Sidebar", tokens: SIDEBAR_COLOR_TOKENS \},\n\]/)
assert.ok(controls.includes('<Label htmlFor="sidebar-tokens-switch">Use sidebar tokens</Label>'))
assert.ok(controls.includes('"Sidebar tokens are active."') && controls.includes('"Sidebar tokens are currently not applied."'))
assert.ok(controls.includes('import { Switch } from "@personal-ui/ui/components/switch"'))
assert.equal((app.match(/<SidebarTokensSwitch /g) ?? []).length, 1)
// WSTP-10: shared ScrollArea; the Workbench-only thumb override is gone.
const scroll = read("packages/ui/src/components/scroll-area.tsx")
for (const token of ['"h-full w-[0.5rem] border-l border-l-transparent"', '"h-[0.5rem] flex-col border-t border-t-transparent"', "bg-muted-foreground/25", "group-hover/scroll-area:bg-muted-foreground/40", "group-focus-within/scroll-area:bg-muted-foreground/40", "hover:bg-muted-foreground/55", "active:bg-muted-foreground/55", "rounded-full"]) assert.ok(scroll.includes(token), token)
assert.doesNotMatch(read("apps/workbench/src/styles.css"), /scroll-area-thumb|scrollbar-width|scrollbar-color|::-webkit-scrollbar/)
assert.doesNotMatch(scroll, /onWheel|onPointer|onTouch|onKeyDown|addEventListener|preventDefault/)
// WSTP-11: one official width variable on the provider.
assert.equal((app.match(/--sidebar-width/g) ?? []).length, 1)
assert.ok(app.includes('style={{ "--sidebar-width": "28rem" } as React.CSSProperties}'))
assert.ok(sidebar.includes('const SIDEBAR_WIDTH_MOBILE = "18rem"'))
// WSTP-12: shared 5rem physical geometry and exact copy.
assert.ok(controls.includes('export const LABELLED_ROW_CLASS = "grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] items-center gap-[0.375rem]"'))
assert.ok(controls.includes('export const NUMERIC_ROW_CLASS = "grid min-w-0 grid-cols-[5rem_minmax(0,1fr)_max-content] items-center gap-[0.375rem]"'))
assert.doesNotMatch(controls, /6rem_minmax/)
assert.ok(models.includes('{ family: "sans", label: "Sans" },') && models.includes('{ family: "serif", label: "Serif" },') && models.includes('{ family: "mono", label: "Mono" },'))
assert.ok(models.includes('label: "Tracking",') && models.includes('build: (value) => ({ op: "setTracking", value: `${value}em` }),'))
assert.ok(app.includes('<ControlSection id="tracking" title="Spacing">'))
// WSTP-13: selector weight, Effects label, px-2, bounded pointer call sites.
for (const span of ['<span className="truncate font-medium">{current.name}</span>', '<span className="font-medium">{theme.name}</span>', '<span className="font-medium">{saved.themes[id]!.name}</span>']) assert.ok(app.includes(span), span)
const tabs = [...app.matchAll(/<TabsTrigger value="([a-z]+)" className=\{CATEGORY_TRIGGER_CLASS\}>([A-Za-z]+)<\/TabsTrigger>/g)].map(match => match[1] + ":" + match[2])
assert.deepEqual(tabs, ["colors:Colors", "typography:Typography", "other:Effects", "command:Command"])
const tabClass = app.match(/const CATEGORY_TRIGGER_CLASS =\s*"([^"]+)"/)[1].split(" ")
const priorTabClass = prior("apps/workbench/src/App.tsx").match(/const CATEGORY_TRIGGER_CLASS =\s*"([^"]+)"/)[1].split(" ")
assert.deepEqual(tabClass, priorTabClass.map(token => (token === "px-3" ? "px-2" : token)))
assert.ok(app.includes('<SidebarTrigger className="size-8 cursor-pointer" />'))
assert.match(controls, /<Button variant="ghost" size="sm" className="h-auto w-fit cursor-pointer rounded-sm bg-muted/)
for (const action of ["onClick={() => download(exportThemeJson(current))}>", "onClick={save}>"]) assert.ok(app.includes(`<Button variant="ghost" size="sm" className="cursor-pointer" disabled={locked} ${action}`), action)
assert.doesNotMatch(controls, /<(?:FieldLabel|Slider|FieldDescription)[^>]*cursor-pointer/)

// WSTP-15: axe stays routed through the one known-debt helper in every Workbench spec.
const workbenchSpecs = read("playwright.workbench.config.ts").match(/testMatch:\s*\[([^\]]+)\]/)[1].match(/"([^"]+)"/g).map(name => name.slice(1, -1))
assert.ok(workbenchSpecs.includes("workbench-sidebar-theme-polish.spec.ts"))
assert.ok(read("playwright.config.ts").includes('"workbench-sidebar-theme-polish.spec.ts"'), "Storybook runner ignores the Workbench spec")
for (const name of workbenchSpecs) {
  const spec = read("e2e/" + name)
  if (!spec.includes("new AxeBuilder")) continue
  assert.ok(spec.includes("seriousOutsideKnownDebt("), "Axe routed through known-debt helper: " + name)
  assert.doesNotMatch(spec, /impact === "(?:serious|critical)"/, "No parallel ad hoc axe filter: " + name)
  assert.doesNotMatch(spec, /\.(?:disableRules|exclude|include|withRules|withTags|options)\(/, "No axe rule suppression: " + name)
}
assert.equal(read("e2e/known-contrast-debt.ts"), prior("e2e/known-contrast-debt.ts"))
const phaseSpec = read("e2e/workbench-sidebar-theme-polish.spec.ts")
for (const required of ["WSTP-06/07/09", "WSTP-04/06", "WSTP-06/08", "WSTP-11/12/13", "WSTP-10", "reducedMotion", '"light", "dark"', "Use sidebar tokens", "stageCommand", "page.reload()", "mouse.wheel", "PageDown", "mouse.down", "ControlOrMeta+b", "18 * 16", "28 * 16", "AxeBuilder"]) assert.ok(phaseSpec.includes(required), required)

// Test hygiene: no focused/skipped additions and no removed existing tests.
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
// No new network or credential surface; the built client stays credential-free and offline.
for (const path of changed.filter(path => /^(?:apps\/workbench\/src|packages\/(?:core|ui)\/src)\//.test(path) && /\.(tsx?|css)$/.test(path) && !/\.test\.ts$/.test(path))) {
  const added = lines(git("diff", base, "--", path)).filter(line => line.startsWith("+") && !line.startsWith("+++")).join("\n")
  assert.doesNotMatch(added, /\bfetch\s*\(|XMLHttpRequest|WebSocket|process\.env|import\.meta\.env|TYPESAFE_|https?:\/\//, "New network/credential surface: " + path)
}
const bundles = readdirSync("apps/workbench/dist/assets").filter(path => /\.(js|css)$/.test(path))
assert.ok(bundles.length)
for (const file of bundles) {
  const source = read("apps/workbench/dist/assets/" + file)
  assert.doesNotMatch(source, /TYPESAFE_(?:PERSONAL_UI_SYSTEM_API_KEY|LOOP_ENGINEERING_API_KEY|API_KEY)|api\.typesafe\.ai|@loop-engineering\/jev-core|fonts\.googleapis\.com|fonts\.gstatic\.com/)
  for (const face of source.match(/@font-face\s*\{[^}]*\}/g) ?? []) assert.doesNotMatch(face, /url\(\s*["']?(?:https?:|\/\/)/i)
}

console.log(JSON.stringify({
  phase: "workbench-sidebar-theme-polish-v1-001", accepted, base, head: git("rev-parse", "HEAD"),
  candidateState: lines(git("status", "--porcelain")).filter(line => !scratch(line.slice(3))).length ? "uncommitted" : "clean",
  result: "pass", admissionBlobs, changedFiles: changed,
  sourceSha256: hash(changed.filter(path => !path.startsWith(evidenceDir)).map(path => path + "\0" + hash(readFileSync(path))).join("\0")),
  frozenFileCount: frozen.length, registryCount: registry.items.length, operationCount: operations.length, addedOperations: ["setSidebarTokensEnabled"],
  themeSchemaVersion: "2.1", sidebarTokens, workbenchSpecs, clientBundlesScanned: bundles,
  note: "Offline source/boundary evidence only. Browser acceptance and protected fresh verification remain Lead-owned.",
}, null, 2))
