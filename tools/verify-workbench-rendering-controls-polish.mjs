// Offline producer boundary check, WRCP-01/02/03/04/05/06/07/08/09/10/14.
// Browser geometry, axe, and behavioral acceptance remain Lead-owned. No runtime state or credentials are read.
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"

const base = "9a11b0ee65885ab8fc3a3afe37aaa338e11d441f"
const productBase = "473372c92ad23478c41cc151a79fb8274fea7d9f"
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd()
const read = path => readFileSync(path, "utf8")
const prior = path => execFileSync("git", ["show", `${base}:${path}`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
const lines = text => text.split("\n").filter(Boolean)
const hash = text => createHash("sha256").update(text).digest("hex")
const count = (text, pattern) => (text.match(pattern) ?? []).length

// The control commit descends from the accepted product base and adds only phase-admission records.
execFileSync("git", ["merge-base", "--is-ancestor", productBase, base])
assert.deepEqual(lines(git("diff", "--name-only", productBase, base)).sort(), [
  ".loop/runs/workbench-rendering-controls-polish-v1-001/preflight.json",
  ".loop/runs/workbench-rendering-controls-polish-v1-001/task.md",
  "BRIEF.md", "docs/WORKBENCH_RENDERING_CONTROLS_POLISH_CONTRACT.md",
].sort())

const admitted = new Set([
  "apps/workbench/src/App.tsx", "apps/workbench/src/LiveControls.tsx", "apps/workbench/src/PreviewFrame.tsx",
  "apps/workbench/src/controls.ts", "apps/workbench/src/main.tsx", "apps/workbench/src/styles.css",
  "apps/workbench/src/lifecycle.test.ts",
  "e2e/theme-v2-live-controls.spec.ts", "e2e/workbench-navigation.ts", "e2e/workbench-theme-controls-polish.spec.ts",
  "e2e/workbench-rendering-controls-polish.spec.ts", "playwright.workbench.config.ts", "playwright.config.ts",
  "tools/verify-workbench-rendering-controls-polish.mjs", "docs/WORKBENCH_RENDERING_CONTROLS_POLISH_CHECKPOINT.md",
])
const changed = [...new Set([...lines(git("diff", "--name-only", base)), ...lines(git("ls-files", "--others", "--exclude-standard"))])].sort()
for (const path of changed) assert.ok(admitted.has(path), `Outside admitted scope: ${path}`)
assert.equal(git("diff", "--name-only", "--diff-filter=D", base), "", "No deletions admitted")
const tracked = lines(git("ls-tree", "-r", "--name-only", base))
// Freeze every other tracked file: Theme v2 schema, operations, persistence, Design Command, Jev, registry, public
// components (Tabs, Input, Textarea, Combobox, Sidebar, Button), type tokens and globals, dependencies, and lockfile.
const frozen = tracked.filter(path => !admitted.has(path) && !path.startsWith(".loop/"))
for (const path of frozen) {
  const before = execFileSync("git", ["show", `${base}:${path}`], { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
  assert.equal(hash(readFileSync(path)), hash(before), `Frozen file changed: ${path}`)
}

const registry = JSON.parse(read("registry.json"))
assert.equal(registry.items.length, 18)
const published = readdirSync("public/r").filter(path => path.endsWith(".json") && path !== "registry.json")
assert.deepEqual(published.sort(), registry.items.map(item => `${item.name}.json`).sort())
const ops = [...read("packages/core/src/mutations/mutation.ts").matchAll(/^\s+\["(set[A-Za-z]+)", new Set/gm)].map(match => match[1])
assert.equal(ops.length, 11)

// WRCP-04: only the six approved visible labels change; ids, bounds, reads, and operations are identical.
const relabel = [
  ['label: "Base motion duration"', 'label: "Duration"'], ['label: "Shadow opacity"', 'label: "Opacity"'],
  ['shadowField("blur", "Shadow blur"', 'shadowField("blur", "Blur"'], ['shadowField("spread", "Shadow spread"', 'shadowField("spread", "Spread"'],
  ['shadowField("offsetX", "Shadow offset X"', 'shadowField("offsetX", "Offset X"'], ['shadowField("offsetY", "Shadow offset Y"', 'shadowField("offsetY", "Offset Y"'],
]
assert.equal(read("apps/workbench/src/controls.ts"), relabel.reduce((text, [from, to]) => text.replace(from, to), prior("apps/workbench/src/controls.ts")))

// WRCP-02: antialiasing is the only rendering addition; authored type utilities are unchanged in count.
const main = read("apps/workbench/src/main.tsx")
assert.match(main, /^document\.documentElement\.classList\.add\("antialiased"\)$/m)
assert.equal(main.replace(/\n\/\/ Both documents[^\n]*\n\/\/[^\n]*\ndocument\.documentElement\.classList\.add\("antialiased"\)\n/, ""), prior("apps/workbench/src/main.tsx"))
const typeUtility = /\b(?:font-(?:sans|serif|mono|thin|light|normal|medium|semibold|bold)|tracking-[a-z]+|leading-[\w[\].]+)\b|font-family|font-weight|letter-spacing|line-height/g
for (const path of ["apps/workbench/src/App.tsx", "apps/workbench/src/LiveControls.tsx", "apps/workbench/src/PreviewFrame.tsx", "apps/workbench/src/styles.css"]) {
  assert.deepEqual(read(path).match(typeUtility)?.sort() ?? [], prior(path).match(typeUtility)?.sort() ?? [], `Type utilities changed: ${path}`)
}

const app = read("apps/workbench/src/App.tsx"), controls = read("apps/workbench/src/LiveControls.tsx"), preview = read("apps/workbench/src/PreviewFrame.tsx")
// WRCP-03: Shadow color uses the shared picker/text field and canonical shadow-profile operation; no stored-value helper.
assert.match(app, /<LiveColorField\s+key=\{`\$\{current\.id\}-shadow-color`\}\s+id="shadow-color"\s+label="Shadow color"\s+value=\{readShadowColor\(current\)\}\s+build=\{buildShadowColorOperation\}/)
assert.doesNotMatch(app + controls, /LiveTextField|canonicalNote|Stored as/)
assert.match(controls, /const issues = apply\(\(latest\) => build\(raw, latest\)\)/)
assert.match(controls, /type="color"[\s\S]*onChange=\{\(event\) => commit\(pickedColorInput\(event\.target\.value, value\)\)\}/)

// WRCP-05: the one shared trigger treatment, no restored half-strength, accent, or hard-coded colour.
const trigger = controls.match(/<CollapsibleTrigger asChild>[\s\S]*?<Button [^>]*className="([^"]+)"/)[1]
assert.equal(trigger, "h-auto w-fit rounded-md bg-muted px-2 py-0.5 text-[0.6875rem] font-medium uppercase tracking-wide text-foreground/75 ring-1 ring-border hover:bg-muted/80 hover:text-foreground/75 dark:hover:bg-muted/80 has-[>svg]:px-2 [&[data-state=open]>svg]:rotate-180")
assert.doesNotMatch(trigger, /bg-muted\/50|ring-border\/50|accent|muted-foreground|\[#|oklch|rgb|hsl/)
assert.equal(count(app, /<ControlSection\b/g), count(prior("apps/workbench/src/App.tsx"), /<ControlSection\b/g), "Every section keeps the shared ControlSection")

// WRCP-06: transparent thumbs at rest, revealed on hover/active/focus-within; width and overflow untouched.
const css = read("apps/workbench/src/styles.css")
assert.doesNotMatch(css, /overflow\s*:\s*overlay|overflow-y\s*:\s*overlay/)
assert.match(css, /\.quiet-scroll \{\n  scrollbar-width: thin;\n  scrollbar-color: transparent transparent;\n\}/)
assert.match(css, /\.quiet-scroll:hover, \.quiet-scroll:active, \.quiet-scroll:focus-within \{\n  scrollbar-color: color-mix\(in oklch, var\(--muted-foreground\) 70%, transparent\) transparent;/)
assert.match(css, /\.quiet-scroll::-webkit-scrollbar-thumb \{ border-radius: 9999px; background: transparent; \}/)
const outsideScroll = text => text.replace(/\/\*\n \* (?:Subtle n|N)ative scrollbars[\s\S]*?(?=@media \(prefers-reduced-motion)/, "")
assert.equal(outsideScroll(css), outsideScroll(prior("apps/workbench/src/styles.css")), "Only the scoped scrollbar block may change")

// WRCP-07/08: 64px flex rows; header px-2 + selector px-2; toolbar px-4, no wrapping.
assert.match(app, /<SidebarHeader className="h-16 shrink-0 flex-row items-center px-2 py-0">/)
assert.match(app, /id="theme-select"[^>]*className="quiet-theme-trigger h-12 w-full [^"]* px-2 /)
assert.match(app, /data-testid="workbench-toolbar" className="flex h-16 shrink-0 items-center gap-2 border-b px-4"/)
assert.doesNotMatch(app, /data-testid="workbench-toolbar"[^>]*flex-wrap/)

// WRCP-09: preview tab labels adopt the sidebar text-xs reference; public Tabs is frozen above.
assert.equal(count(app, /<TabsTrigger value="[a-z]+" className="text-xs">/g), 4)
assert.equal(preview, prior("apps/workbench/src/PreviewFrame.tsx").replace('<TabsTrigger value="cards">Cards', '<TabsTrigger value="cards" className="text-xs">Cards').replace('<TabsTrigger value="states">States', '<TabsTrigger value="states" className="text-xs">States'))

// WRCP-10: affected editable controls are text-sm at every width; the documented iOS tradeoff is recorded.
assert.match(controls, /className="h-8 w-14 flex-none px-1 text-right text-sm tabular-nums"/)
assert.match(controls, /className="h-8 font-mono text-sm"/)
assert.match(controls, /showTrigger=\{false\} className="h-8 \[&_\[data-slot=combobox-input\]\]:text-sm"/)
assert.match(app, /data-testid="design-command-input"\s+className="[^"]* px-3 py-2 text-sm shadow-xs/)
assert.match(app, /spellCheck=\{false\}\s+className="text-sm"\s+aria-invalid=\{saveAsIssues\.length > 0\}/)
assert.doesNotMatch(app + controls, /md:text-xs|text-base md:text-sm/)
assert.match(controls, /iOS Safari may zoom on focus of sub-16px text/)

// Existing tests cannot be removed or newly skipped. Updated values track the admitted behavior changes.
for (const path of changed.filter(path => tracked.includes(path) && /\.(test|spec)\.ts$/.test(path))) {
  const before = prior(path), after = read(path)
  assert.ok(count(after, /\bexpect\(/g) >= count(before, /\bexpect\(/g), `Lost assertions: ${path}`)
  assert.deepEqual(after.match(/(?:test|it|describe)\.(?:skip|only|todo|fixme)\([^\n]*/g), before.match(/(?:test|it|describe)\.(?:skip|only|todo|fixme)\([^\n]*/g), `Changed test exclusions: ${path}`)
}
assert.doesNotMatch(read("e2e/workbench-rendering-controls-polish.spec.ts"), /\b(?:skip|only|fixme|todo)\(/)
assert.equal(read("playwright.workbench.config.ts"), prior("playwright.workbench.config.ts").replace('"workbench-theme-controls-polish.spec.ts"]', '"workbench-theme-controls-polish.spec.ts", "workbench-rendering-controls-polish.spec.ts"]'))
assert.equal(read("playwright.config.ts"), prior("playwright.config.ts").replace(
  '    "workbench-theme-controls-polish.spec.ts",',
  '    "workbench-theme-controls-polish.spec.ts",\n    "workbench-rendering-controls-polish.spec.ts",'
))

// WRCP-14: no new network or credential surface in product code or the built client.
for (const path of changed.filter(path => /^apps\/workbench\/src\//.test(path) && /\.(tsx?|css)$/.test(path) && !/\.(spec|test)\.ts$/.test(path))) {
  assert.doesNotMatch(read(path), /\bfetch\s*\(|XMLHttpRequest|WebSocket|process\.env|import\.meta\.env|TYPESAFE_|https?:\/\//, `New network/credential surface: ${path}`)
}
const bundles = readdirSync("apps/workbench/dist/assets").filter(path => /\.(js|css)$/.test(path))
assert.ok(bundles.length > 0, "Build Workbench before scanning")
for (const file of bundles) {
  const source = read(`apps/workbench/dist/assets/${file}`)
  assert.doesNotMatch(source, /TYPESAFE_(?:PERSONAL_UI_SYSTEM_API_KEY|LOOP_ENGINEERING_API_KEY|API_KEY)|api\.typesafe\.ai|@loop-engineering\/jev-core|loop-sentinel-must-never-be-read|generic-sentinel-must-never-be-read|fonts\.googleapis\.com|fonts\.gstatic\.com/)
  for (const face of source.match(/@font-face\s*\{[^}]*\}/g) ?? []) assert.doesNotMatch(face, /url\(\s*["']?(?:https?:|\/\/)/i)
}
const builtCss = bundles.filter(file => file.endsWith(".css")).map(file => read(`apps/workbench/dist/assets/${file}`)).join("\n")
assert.match(builtCss, /\.antialiased\{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale\}/, "Built CSS must include Tailwind antialiased")

console.log(JSON.stringify({
  phase: "workbench-rendering-controls-polish-v1-001", base, productBase, head: git("rev-parse", "HEAD"),
  candidateState: git("status", "--porcelain") ? "uncommitted" : "clean", result: "pass",
  changedFiles: changed, candidateSha256: hash(changed.map(path => `${path}\0${read(path)}`).join("\0")),
  frozenFileCount: frozen.length, frozenSha256: hash(frozen.map(path => `${path}\0${hash(readFileSync(path))}`).join("\0")),
  registryCount: registry.items.length, operationCount: ops.length, clientBundlesScanned: bundles,
  note: "Producer offline boundary evidence only. No acceptance, promotion, or protected verification claimed.",
}, null, 2))
