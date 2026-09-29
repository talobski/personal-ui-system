// Offline IESP producer boundary scan (read-only). No credentials, network, browser, or canonical runtime state.
// Run after `pnpm build:workbench` and `pnpm registry:build`: node tools/verify-ui-effects-showcase-polish.mjs
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"

const phase = "ui-effects-showcase-polish-v1-001"
const base = "d7b9e936e6f06d48a4295068202e3f999a0e2d5f"
const acceptedProduct = "e3f7410033966326785cf74f59429eba8d0d68f0"
const packetDir = "docs/evidence/ui-effects-showcase-polish-v1/linear"
const contract = "docs/UI_EFFECTS_SHOWCASE_POLISH_CONTRACT.md"
const tickets = ["PUI-119", "PUI-120", "PUI-121", "PUI-122"]
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trimEnd()
const read = path => readFileSync(path, "utf8")
const at = (rev, path) => execFileSync("git", ["show", `${rev}:${path}`], { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
const hash = value => createHash("sha256").update(value).digest("hex")
const code = source => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

// IESP-01: the four frozen snapshots, their manifest and the contract are byte-identical to the prepared base, each
// snapshot matches its pinned hash, and no other ticket is in the packet.
const manifest = JSON.parse(read(`${packetDir}/snapshot-hashes.json`))
assert.equal(manifest.phase, phase)
assert.deepEqual(manifest.admittedTicketIds, tickets)
for (const id of tickets) assert.equal(hash(readFileSync(`${packetDir}/${id}.json`)), manifest.snapshotSha256[id], `${id} snapshot hash`)
assert.deepEqual(git("ls-files", packetDir).split("\n").sort(), [...tickets.map(id => `${packetDir}/${id}.json`), `${packetDir}/snapshot-hashes.json`].sort())
for (const path of [...tickets.map(id => `${packetDir}/${id}.json`), `${packetDir}/snapshot-hashes.json`, contract]) assert.ok(readFileSync(path).equals(at(base, path)), `Frozen record changed: ${path}`)
execFileSync("git", ["merge-base", "--is-ancestor", acceptedProduct, "HEAD"])
execFileSync("git", ["merge-base", "--is-ancestor", base, "HEAD"])

// Admitted scope only: the contract's likely edit surface, the two specimen compositions, tests, and this phase's
// producer tooling/evidence.
const allowed = new Set([
  "packages/core/src/theme/schema.ts",
  "packages/core/src/theme/render.ts",
  "packages/core/src/mutations/mutation.ts",
  "packages/core/src/context/capability-descriptions.ts",
  "packages/core/src/index.ts",
  "apps/workbench/src/App.tsx",
  "apps/workbench/src/LiveControls.tsx",
  "apps/workbench/src/controls.ts",
  "apps/workbench/src/PreviewFrame.tsx",
  "apps/workbench/src/workbenchTabs.ts",
  "apps/workbench/src/DesignSystemPreview.tsx",
  "apps/workbench/src/styles.css",
  "packages/ui/src/compositions/plan-usage.tsx",
  "packages/ui/src/compositions/signup-form.tsx",
  "playwright.workbench.config.ts",
  "tools/verify-ui-effects-showcase-polish.mjs",
  "tools/measure-ui-effects-showcase-geometry.mjs",
])
const changed = git("diff", "--name-only", base, "HEAD").split("\n").filter(Boolean)
for (const path of changed) {
  const isTest = /\.(test|spec)\.ts$/.test(path)
  const isEvidence = path.startsWith("docs/evidence/ui-effects-showcase-polish-v1/producer/")
  assert.ok(allowed.has(path) || isTest || isEvidence, `Outside admitted scope: ${path}`)
  assert.ok(!path.startsWith(".loop/") && !path.includes("/.loop/"), `Canonical runtime state touched: ${path}`)
}

// IESP-09: dependencies, lockfile, registry, public Button/Tabs/Collapsible, migrations and built-in fixtures unchanged.
for (const path of ["package.json", "pnpm-lock.yaml", "registry.json", "apps/workbench/package.json", "packages/core/package.json", "packages/ui/package.json", "packages/ui/src/components/button.tsx", "packages/ui/src/components/tabs.tsx", "packages/ui/src/components/collapsible.tsx", "packages/core/src/theme/migrate.ts", "packages/core/src/theme/diff.ts"]) assert.ok(readFileSync(path).equals(at(base, path)), `Boundary changed: ${path}`)
assert.equal(git("diff", "--name-only", base, "HEAD", "--", "packages/ui/src/components"), "", "public components must be unchanged")
assert.equal(JSON.parse(read("registry.json")).items.length, 23)
for (const fixture of ["default.json", "valid.json", "default.css", "quiet-editorial.css"]) assert.ok(readFileSync(`packages/core/src/theme/fixtures/${fixture}`).equals(at(base, `packages/core/src/theme/fixtures/${fixture}`)), `Built-in fixture changed: ${fixture}`)

// IESP-02: Theme v3 stays 3.0; canonical uiEffects is Effect (off | tactile) and Strength; the exact prior four-field
// shape is admitted only through the ingress normalizer.
const schema = code(read("packages/core/src/theme/schema.ts"))
assert.match(schema, /THEME_SCHEMA_VERSION = "3\.0" as const/)
assert.doesNotMatch(schema, /theme-4|"4\.0"|schemaVersion: z\.literal\("3\.1"\)/)
assert.match(schema, /uiEffects: uiEffectsState\.optional\(\)/)
assert.match(schema, /export const UI_EFFECTS = \["off", "tactile"\] as const/)
assert.match(schema, /const uiEffectsCanonicalState = z\.strictObject\(\{\s*effect: token\("string", uiEffectSchema\),\s*strength: token\("number", uiEffectStrengthSchema\),\s*\}\)/)
assert.match(schema, /effect: token\("string", z\.literal\("tactile"\)\),\s*outlineButtons: token\("boolean", z\.boolean\(\)\),\s*tabs: token\("boolean", z\.boolean\(\)\),/)
assert.match(schema, /effect: value\.outlineButtons \|\| value\.tabs \? "tactile" : "off"/)
assert.match(schema, /UI_EFFECTS_FLAT: Readonly<UiEffectsValue> = Object\.freeze\(\{ effect: "off", strength: 50 \}\)/)

// IESP-03: exactly thirteen closed operations, identical names/fields/order to the accepted product.
const opsOf = source => [...code(source).matchAll(/^\s+\["(set[A-Za-z]+)", new Set\(\[([^\]]*)\]\)\],$/gm)].map(m => [m[1], m[2]])
const ops = opsOf(read("packages/core/src/mutations/mutation.ts"))
assert.equal(ops.length, 13)
assert.deepEqual(ops, opsOf(at(base, "packages/core/src/mutations/mutation.ts").toString()))
assert.doesNotMatch(read("packages/core/src/jev-design/recipes.ts"), /setUiEffects/)

// IESP-05: Tactile targets the Secondary Button and active non-line surface tab only, and renders nothing while Off.
const render = read("packages/core/src/theme/render.ts")
assert.match(render, /TACTILE_SECONDARY_BUTTON_SELECTOR = '\[data-variant="secondary"\]\[data-size\]:is\(\[data-slot="button"\], \[data-slot\$="-trigger"\], \[data-slot\$="-close"\]\)'/)
assert.match(render, /TACTILE_SURFACE_TAB_SELECTOR = '\[data-slot="tabs-list"\]:not\(\[data-variant="line"\]\) > \[data-slot="tabs-trigger"\]\[data-state="active"\]'/)
assert.doesNotMatch(code(render), /data-variant="outline"/)
assert.match(render, /if \(effects\.effect !== "tactile"\) return ""/)

// IESP-04/06/07: no target toggles; unmarked default surface category lists; Secondary specimens with no local recipe.
const app = read("apps/workbench/src/App.tsx"), preview = read("apps/workbench/src/PreviewFrame.tsx"), controls = read("apps/workbench/src/LiveControls.tsx")
assert.doesNotMatch(code(read("apps/workbench/src/controls.ts")) + code(controls), /UI_EFFECT_TARGETS|outlineButtons|Outline buttons/)
assert.match(read("apps/workbench/src/controls.ts"), /UI_EFFECTS_HELP = "Affects Secondary buttons and surface-style Tabs\."/)
for (const [source, name] of [[app, "Editor categories"], [preview, "Preview views"]]) assert.ok(source.includes(`<TabsList className="w-max flex-nowrap justify-start" aria-label="${name}">`), name)
for (const source of [app, preview, read("apps/workbench/src/styles.css")]) assert.doesNotMatch(source, /data-variant="line"|quiet-categories/)
assert.match(controls, /<CollapsibleTrigger asChild>[\s\S]*?<Button variant="secondary" size="sm" className="h-auto w-fit cursor-pointer rounded-sm px-2 py-0\.5 quiet-section-trigger text-\[0\.6875rem\] uppercase has-\[>svg\]:px-2/)
assert.match(read("packages/ui/src/compositions/plan-usage.tsx"), /<Button variant="secondary" type="button" className="justify-self-start cursor-pointer">Manage storage<\/Button>/)
assert.match(read("packages/ui/src/compositions/signup-form.tsx"), /<Button key=\{provider\.name\} variant="secondary" type="button"/)

// IESP-07 geometry evidence: collapsible triggers unchanged; social Buttons unchanged apart from Outline's border.
const before = JSON.parse(read("docs/evidence/ui-effects-showcase-polish-v1/producer/geometry-before.json")).viewports
const after = JSON.parse(read("docs/evidence/ui-effects-showcase-polish-v1/producer/geometry-after.json")).viewports
for (const viewport of ["390x844", "1440x900"]) {
  assert.deepEqual(after[viewport].triggers, before[viewport].triggers, `${viewport} trigger geometry`)
  for (const name of ["GitHub", "Google"]) assert.deepEqual({ ...after[viewport].social[name], borderTopWidth: null }, { ...before[viewport].social[name], borderTopWidth: null }, `${viewport} ${name}`)
}

// IESP-08: presentation-only; editor labels and token keys unchanged.
assert.ok(read("apps/workbench/src/controls.ts").includes('{ id: "sidebar", title: "Sidebar", tokens: SIDEBAR_COLOR_TOKENS }'))
assert.match(read("apps/workbench/src/DesignSystemPreview.tsx"), /"sidebar-primary": "Primary Background"/)

// Build artifacts exist (the caller ran the builds) and no network/credential surface was introduced by this diff.
assert.ok(existsSync("apps/workbench/dist/index.html"), "run pnpm build:workbench first")
const scanned = changed.filter(p => !p.endsWith(".md") && !p.endsWith(".json") && !p.startsWith("tools/") && !p.startsWith("e2e/"))
const added = git("diff", base, "HEAD", "--", ...scanned).split("\n").filter(line => line.startsWith("+")).join("\n")
assert.doesNotMatch(added, /fetch\(|XMLHttpRequest|WebSocket|sendBeacon|process\.env|API_KEY|https?:\/\//)

console.log(`IESP boundary scan passed: ${changed.length} changed paths, 13 operations, 23 registry resources.`)
