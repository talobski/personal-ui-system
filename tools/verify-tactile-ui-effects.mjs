// Offline TUE producer boundary scan (read-only). No credentials, network, browser, or canonical runtime state.
// Run after `pnpm build:workbench` and `pnpm registry:build`: node tools/verify-tactile-ui-effects.mjs
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"

const phase = "tactile-ui-effects-v1-001"
const base = "8d06f7d7c4ffae39e8c2bbb71aa508b42d4d2b99"
const acceptedProduct = "54849dcbda47f72d3fa9cdec34256b77677d4743"
const packetDir = "docs/evidence/tactile-ui-effects-v1/linear"
const contract = "docs/TACTILE_UI_EFFECTS_CONTRACT.md"
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trimEnd()
const read = path => readFileSync(path, "utf8")
const at = (rev, path) => execFileSync("git", ["show", `${rev}:${path}`], { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
const hash = value => createHash("sha256").update(value).digest("hex")
const code = source => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

// TUE-01: the frozen PUI-113 snapshot, its manifest and the contract are byte-identical to the prepared base; the
// snapshot matches its pinned hash; PUI-118 is excluded and absent from the packet.
const manifest = JSON.parse(read(`${packetDir}/snapshot-hashes.json`))
assert.equal(manifest.phase, phase)
assert.deepEqual(manifest.admittedTickets, ["PUI-113"])
assert.deepEqual(manifest.excludedTickets, ["PUI-118"])
assert.equal(hash(readFileSync(manifest.snapshots["PUI-113"].path)), manifest.snapshots["PUI-113"].sha256)
for (const path of [`${packetDir}/PUI-113.json`, `${packetDir}/snapshot-hashes.json`, contract]) assert.ok(readFileSync(path).equals(at(base, path)), `Frozen record changed: ${path}`)
assert.ok(!existsSync(`${packetDir}/PUI-118.json`), "PUI-118 must not enter this packet")
execFileSync("git", ["merge-base", "--is-ancestor", acceptedProduct, "HEAD"])
execFileSync("git", ["merge-base", "--is-ancestor", base, "HEAD"])

// Admitted scope only: product/test surfaces named by the contract plus this phase's checkpoint, spec and guard.
const allowed = new Set([
  "packages/core/src/theme/schema.ts",
  "packages/core/src/theme/render.ts",
  "packages/core/src/theme/diff.ts",
  "packages/core/src/mutations/mutation.ts",
  "packages/core/src/context/capability-descriptions.ts",
  "packages/core/src/index.ts",
  "apps/workbench/src/App.tsx",
  "apps/workbench/src/LiveControls.tsx",
  "apps/workbench/src/controls.ts",
  "apps/workbench/src/lifecycle.ts",
  "apps/workbench/src/PreviewFrame.tsx",
  "docs/TACTILE_UI_EFFECTS_CHECKPOINT.md",
  "tools/verify-tactile-ui-effects.mjs",
  "playwright.config.ts",
  "playwright.workbench.config.ts",
])
const changed = git("diff", "--name-only", base, "HEAD").split("\n").filter(Boolean)
for (const path of changed) {
  const isTest = /\.(test|spec)\.ts$/.test(path)
  assert.ok(allowed.has(path) || isTest, `Outside admitted scope: ${path}`)
  assert.ok(!path.startsWith(".loop/") && !path.includes("/.loop/"), `Canonical runtime state touched: ${path}`)
}

// TUE-08: dependencies, lockfile, registry, public Button/Tabs and every non-targeted primitive are unchanged.
for (const path of ["package.json", "pnpm-lock.yaml", "registry.json", "apps/workbench/package.json", "packages/core/package.json", "packages/ui/package.json"]) assert.ok(readFileSync(path).equals(at(base, path)), `Boundary changed: ${path}`)
assert.equal(git("diff", "--name-only", base, "HEAD", "--", "packages/ui"), "", "packages/ui must be unchanged")
assert.equal(JSON.parse(read("registry.json")).items.length, 23)
for (const fixture of ["default.json", "valid.json", "default.css", "quiet-editorial.css"]) assert.ok(readFileSync(`packages/core/src/theme/fixtures/${fixture}`).equals(at(base, `packages/core/src/theme/fixtures/${fixture}`)), `Built-in fixture changed: ${fixture}`)

// TUE-02: Theme v3 stays 3.0 with one optional, strict uiEffects object; no v4 or new migration.
const schema = code(read("packages/core/src/theme/schema.ts"))
assert.match(schema, /THEME_SCHEMA_VERSION = "3\.0" as const/)
assert.match(schema, /theme-3\.json/)
assert.doesNotMatch(schema, /theme-4|"4\.0"|schemaVersion: z\.literal\("3\.1"\)/)
assert.match(schema, /uiEffects: uiEffectsState\.optional\(\)/)
assert.match(schema, /export const UI_EFFECTS = \["tactile"\] as const/)
assert.ok(read("packages/core/src/theme/migrate.ts") === at(base, "packages/core/src/theme/migrate.ts").toString(), "migrate.ts must be unchanged")

// TUE-03: exactly one new closed operation; the twelve pre-existing entries are unchanged and in order.
const mutation = code(read("packages/core/src/mutations/mutation.ts"))
const ops = [...mutation.matchAll(/^\s+\["(set[A-Za-z]+)", new Set\(\[([^\]]*)\]\)\],$/gm)].map(m => [m[1], m[2]])
const baseOps = [...code(at(base, "packages/core/src/mutations/mutation.ts").toString()).matchAll(/^\s+\["(set[A-Za-z]+)", new Set\(\[([^\]]*)\]\)\],$/gm)].map(m => [m[1], m[2]])
assert.equal(baseOps.length, 12)
assert.equal(ops.length, 13)
assert.deepEqual(ops.slice(0, 12), baseOps)
assert.deepEqual(ops[12], ["setUiEffects", '"op", "value"'])
assert.doesNotMatch(read("packages/core/src/jev-design/recipes.ts"), /setUiEffects/)

// TUE-05/06: targeting uses existing data attributes only; line/minimal lists are marked at their usage sites.
const render = read("packages/core/src/theme/render.ts")
assert.match(render, /TACTILE_OUTLINE_BUTTON_SELECTOR = '\[data-variant="outline"\]\[data-size\]:is\(\[data-slot="button"\], \[data-slot\$="-trigger"\], \[data-slot\$="-close"\]\)'/)
assert.match(render, /TACTILE_SURFACE_TAB_SELECTOR = '\[data-slot="tabs-list"\]:not\(\[data-variant="line"\]\) > \[data-slot="tabs-trigger"\]\[data-state="active"\]'/)
for (const file of ["apps/workbench/src/App.tsx", "apps/workbench/src/PreviewFrame.tsx"]) assert.equal((read(file).match(/className="quiet-categories[^"]*" data-variant="line"/g) ?? []).length, 1, file)
const app = read("apps/workbench/src/App.tsx")
const shadow = app.indexOf('<ControlSection id="shadow"'), effects = app.indexOf('<ControlSection id="ui-effects"'), motion = app.indexOf('<ControlSection id="motion"')
assert.ok(shadow > 0 && shadow < effects && effects < motion, "UI Effects must sit between Shadow and Motion")

// Build artifacts exist (the caller ran the builds) and no network/credential surface was introduced by this diff.
assert.ok(existsSync("apps/workbench/dist/index.html"), "run pnpm build:workbench first")
const diff = git("diff", base, "HEAD", "--", ...changed.filter(p => !p.endsWith(".md") && p !== "tools/verify-tactile-ui-effects.mjs"))
assert.doesNotMatch(diff.split("\n").filter(line => line.startsWith("+")).join("\n"), /fetch\(|XMLHttpRequest|WebSocket|process\.env|API_KEY|https?:\/\/(?!personal-ui\.local)/)

console.log(`TUE boundary scan passed: ${changed.length} changed paths, 13 operations, 23 registry resources.`)
