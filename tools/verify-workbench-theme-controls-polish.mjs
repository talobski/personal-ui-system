// Offline producer boundary check, WTCP-01/02/03/04/05/07/09/12/13.
// Browser geometry, axe, and behavioral acceptance remain Lead-owned. No runtime state or credentials are read.
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"

const base = "2b840d0531c129e4a8bba3bb8078408c13f8e22a"
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd()
const read = path => readFileSync(path, "utf8")
const prior = path => execFileSync("git", ["show", `${base}:${path}`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
const lines = text => text.split("\n").filter(Boolean)
const hash = text => createHash("sha256").update(text).digest("hex")
const admitted = new Set([
  "apps/workbench/src/App.tsx", "apps/workbench/src/LiveControls.tsx", "apps/workbench/src/controls.ts",
  "apps/workbench/src/styles.css", "apps/workbench/src/lifecycle.test.ts",
  "packages/core/src/theme/fixtures/default.json", "packages/core/src/theme/fixtures/default.css",
  "packages/core/src/theme/fixtures/default.conversion.json", "packages/core/src/theme/default.test.ts",
  "packages/core/src/theme/theme.test.ts", "packages/core/src/context/provenance.ts",
  "packages/ui/src/lib/workbench-icons.ts",
  "e2e/quiet-workspace.spec.ts", "e2e/theme-v2-live-controls.spec.ts",
  "e2e/workbench-theme-controls-polish.spec.ts", "playwright.workbench.config.ts", "playwright.config.ts",
  "tools/verify-workbench-theme-controls-polish.mjs", "docs/WORKBENCH_THEME_CONTROLS_POLISH_CHECKPOINT.md",
])
const changed = [...new Set([...lines(git("diff", "--name-only", base)), ...lines(git("ls-files", "--others", "--exclude-standard"))])].sort()
for (const path of changed) assert.ok(admitted.has(path), `Outside admitted scope: ${path}`)
assert.equal(git("diff", "--name-only", "--diff-filter=D", base), "", "No deletions admitted")
const tracked = lines(git("ls-tree", "-r", "--name-only", base))
// Freeze every other tracked file, including schema, operations, persistence, Design Command, Jev, registry,
// dependencies, lockfiles, public components, Quiet Editorial, historical contracts, and all unrelated tests.
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

const theme = JSON.parse(read("packages/core/src/theme/fixtures/default.json"))
const oldTheme = JSON.parse(prior("packages/core/src/theme/fixtures/default.json"))
const radius = { base: "0.7rem", sm: "0.45rem", md: "0.575rem", lg: "0.7rem", xl: "0.95rem" }
assert.deepEqual(Object.fromEntries(Object.entries(theme.radius).map(([key, token]) => [key, token.$value])), radius)
assert.equal(theme.space.base.$value, "0.25rem")
oldTheme.radius = theme.radius; oldTheme.space.base = theme.space.base
assert.deepEqual(theme, oldTheme, "Only Default radius and spacing baselines may change")
const conversion = JSON.parse(read("packages/core/src/theme/fixtures/default.conversion.json"))
const { ownerOverrides, ...historical } = conversion
assert.deepEqual(historical, JSON.parse(prior("packages/core/src/theme/fixtures/default.conversion.json")), "Historical imported source must remain intact")
assert.equal(ownerOverrides.document, "docs/WORKBENCH_THEME_CONTROLS_POLISH_CONTRACT.md")
assert.deepEqual(ownerOverrides.values, { ...Object.fromEntries(Object.entries(radius).map(([key, value]) => [`radius.${key}`, value])), "space.base": "0.25rem" })
const provenancePath = "packages/core/src/context/provenance.ts"
const oldSha = hash(prior("packages/core/src/theme/fixtures/default.json"))
const newSha = hash(read("packages/core/src/theme/fixtures/default.json"))
assert.equal(read(provenancePath), prior(provenancePath).replace(oldSha, newSha), "Only the Default provenance hash may change")
assert.equal(read("packages/ui/src/lib/workbench-icons.ts").split("\n").filter(line => !line.startsWith("//")).join("\n").trim(), 'export { Download, Save } from "lucide-react"')

const app = read("apps/workbench/src/App.tsx"), controls = read("apps/workbench/src/LiveControls.tsx")
assert.match(app, /const SWATCH_TOKENS = \["primary", "accent", "secondary", "border"\] as const/)
assert.match(app, /h-2\.5 w-2\.5 rounded-sm ring-1 ring-border/)
assert.match(app, /data-testid="theme-swatches"[^>]*gap-0\.5/)
assert.equal((app.match(/<ThemeSwatches\b/g) ?? []).length, 3)
assert.doesNotMatch(app + read("apps/workbench/src/styles.css"), /quiet-toolbar|-space-x-|ring-foreground\/20/)
assert.match(app, /<SidebarHeader className="p-4 pb-0">/)
assert.match(app, /data-testid="workbench-toolbar"[^>]* p-4/)
assert.match(app, /<Button variant="ghost"[^>]*onClick=\{save\}/)
assert.match(app, /<Button variant="ghost"[^\n]*download\(exportThemeJson\(current\)\)/)
for (const icon of ["Download", "Save"]) assert.ok(app.includes(`<${icon} aria-hidden="true" />`))
assert.match(controls, /w-fit rounded-md bg-muted\/50[^"\n]*text-xs[^"\n]*uppercase tracking-wide text-muted-foreground ring-1 ring-border\/50/)
assert.doesNotMatch(controls, /border-t|Current stack:|w-full justify-between px-2/)
assert.match(controls, /min-w-0 flex-1/)
for (const width of ["w-24", "w-14", "w-6"]) assert.ok(controls.includes(`${width} flex-none`))
assert.match(controls, /selected\?\.label \?\? fontControlCopy\(category, stack, defaultStack\)/)
assert.match(controls, /data-testid=\{`\$\{id\}-stack`\} className="sr-only"/)

// Preserve the non-presentation control model exactly; only the visible spacing label and font-copy helper change.
const model = read("apps/workbench/src/controls.ts")
const copyStart = model.indexOf("/** Exact built-in system stacks")
assert.equal(model.slice(0, copyStart).trimEnd(), prior("apps/workbench/src/controls.ts").replace('label: "Spacing base"', 'label: "Spacing"').trimEnd())
// Existing tests cannot be removed or newly skipped. Updated values track the admitted behavior changes.
for (const path of changed.filter(path => tracked.includes(path) && /\.(test|spec)\.ts$/.test(path))) {
  const before = prior(path), after = read(path)
  assert.ok((after.match(/\bexpect\(/g) ?? []).length >= (before.match(/\bexpect\(/g) ?? []).length, `Lost assertions: ${path}`)
  assert.deepEqual(after.match(/(?:test|it|describe)\.(?:skip|only|todo|fixme)\([^\n]*/g), before.match(/(?:test|it|describe)\.(?:skip|only|todo|fixme)\([^\n]*/g), `Changed test exclusions: ${path}`)
}
assert.doesNotMatch(read("e2e/workbench-theme-controls-polish.spec.ts"), /\b(?:skip|only|fixme|todo)\(/)
const priorConfig = prior("playwright.workbench.config.ts")
assert.equal(read("playwright.workbench.config.ts"), priorConfig.replace('"theme-v2-live-controls.spec.ts"]', '"theme-v2-live-controls.spec.ts", "workbench-theme-controls-polish.spec.ts"]'))
// The only admitted Storybook config change routes the new Workbench-only spec away from Storybook.
assert.equal(read("playwright.config.ts"), prior("playwright.config.ts").replace(
  '    "theme-v2-live-controls.spec.ts",',
  '    "theme-v2-live-controls.spec.ts",\n    "workbench-theme-controls-polish.spec.ts",'
))

for (const path of changed.filter(path => /^(apps\/workbench\/src|packages\/ui\/src\/lib)\//.test(path) && /\.(tsx?|css)$/.test(path) && !/\.(spec|test)\.ts$/.test(path))) {
  assert.doesNotMatch(read(path), /\bfetch\s*\(|XMLHttpRequest|WebSocket|process\.env|import\.meta\.env|TYPESAFE_|https?:\/\//, `New network/credential surface: ${path}`)
}
const bundles = readdirSync("apps/workbench/dist/assets").filter(path => /\.(js|css)$/.test(path))
assert.ok(bundles.length > 0, "Build Workbench before scanning")
for (const file of bundles) {
  const source = read(`apps/workbench/dist/assets/${file}`)
  assert.doesNotMatch(source, /TYPESAFE_(?:PERSONAL_UI_SYSTEM_API_KEY|LOOP_ENGINEERING_API_KEY|API_KEY)|api\.typesafe\.ai|@loop-engineering\/jev-core|loop-sentinel-must-never-be-read|generic-sentinel-must-never-be-read|fonts\.googleapis\.com|fonts\.gstatic\.com/)
  for (const face of source.match(/@font-face\s*\{[^}]*\}/g) ?? []) assert.doesNotMatch(face, /url\(\s*["']?(?:https?:|\/\/)/i)
}
console.log(JSON.stringify({
  phase: "workbench-theme-controls-polish-v1-001", base, head: git("rev-parse", "HEAD"),
  candidateState: git("status", "--porcelain") ? "uncommitted" : "clean", result: "pass",
  changedFiles: changed, candidateSha256: hash(changed.map(path => `${path}\0${read(path)}`).join("\0")),
  frozenFileCount: frozen.length, frozenSha256: hash(frozen.map(path => `${path}\0${hash(readFileSync(path))}`).join("\0")),
  registryCount: registry.items.length, operationCount: ops.length, clientBundlesScanned: bundles,
  note: "Producer offline boundary evidence only. No browser execution, acceptance, promotion, or protected verification claimed.",
}, null, 2))
