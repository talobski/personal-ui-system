// Offline TBDS producer boundary scan (read-only). No credentials, network, browser, or canonical runtime state.
// Run from the repository root: node tools/verify-tactile-border-designsystem-type.mjs
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"

const phase = "tactile-border-designsystem-type-v1-001"
const base = "0972652415d281b5437e6efebe29ba2322bf0656"
const acceptedProduct = "5ea846de50c9206fcb7a9e16d3bdf441d1d48d8a"
const packetDir = "docs/evidence/tactile-border-designsystem-type-v1-001/linear"
const contract = "docs/TACTILE_BORDER_DESIGNSYSTEM_TYPE_CONTRACT.md"
const tickets = ["PUI-129", "PUI-131"]
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trimEnd()
const read = path => readFileSync(path, "utf8")
const at = (rev, path) => execFileSync("git", ["show", `${rev}:${path}`], { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
const hash = value => createHash("sha256").update(value).digest("hex")
const code = source => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

// TBDS-01: the frozen packet manifest and contract carry their pinned hashes, each snapshot matches the manifest, and
// every frozen record is byte-identical to the admission base.
assert.equal(hash(readFileSync(`${packetDir}/snapshot-hashes.json`)), "25d1d269c5ecfe3dfb479f4649d040bda1e8eb47436f9a5d5f87d321ac2d6fae")
assert.equal(hash(readFileSync(contract)), "b512d933dc4aa0c9e4812c82a0757491c685e39c67256fda93cda079c4ebedae")
const manifest = JSON.parse(read(`${packetDir}/snapshot-hashes.json`))
assert.equal(manifest.phase, phase)
assert.deepEqual(Object.keys(manifest.tickets), tickets)
for (const id of tickets) assert.equal(hash(readFileSync(`${packetDir}/${id}.json`)), manifest.tickets[id].sha256, `${id} snapshot hash`)
assert.deepEqual(git("ls-files", packetDir).split("\n").sort(), [...tickets.map(id => `${packetDir}/${id}.json`), `${packetDir}/snapshot-hashes.json`].sort())
execFileSync("git", ["merge-base", "--is-ancestor", acceptedProduct, "HEAD"])
execFileSync("git", ["merge-base", "--is-ancestor", base, "HEAD"])

// TBDS-05: the candidate touches only the two product sources, their directly superseded assertions, and guards;
// no document, dependency, registry, schema, mutation, or public component changes.
const allowed = new Set([
  "packages/core/src/theme/render.ts",
  "apps/workbench/src/DesignSystemPreview.tsx",
  "packages/core/src/theme/ui-effects.test.ts",
  "apps/workbench/src/previewViews.test.ts",
  "e2e/amber-dusk-shell-refinement.spec.ts",
  "e2e/ui-effects-showcase-polish.spec.ts",
  "e2e/tactile-ui-effects.spec.ts",
  "tools/verify-amber-dusk-shell-refinement.mjs",
  "tools/verify-tactile-border-designsystem-type.mjs",
])
const changed = git("diff", "--name-only", base, "HEAD").split("\n").filter(Boolean)
for (const path of changed) assert.ok(allowed.has(path), `Out-of-scope change: ${path}`)
assert.equal(JSON.parse(read("registry.json")).items.length, 23)
assert.match(code(read("packages/core/src/theme/schema.ts")), /THEME_SCHEMA_VERSION = "3\.0" as const/)
assert.equal([...code(read("packages/core/src/mutations/mutation.ts")).matchAll(/^\s+\["(set[A-Za-z]+)", new Set\(\[([^\]]*)\]\)\],$/gm)].length, 13)

// TBDS-02 (PUI-129): the decorative surface TabsList ring is `ring-1 ring-border/80`; nothing else in the effects block
// moves, the Secondary recipe is byte-identical, and Off still emits nothing.
const render = read("packages/core/src/theme/render.ts")
const ring = code(render).match(/const TABS_LIST_RING = \[([\s\S]*?)\] as const/)[1]
assert.match(ring, /"--tw-ring-color: color-mix\(in oklab, var\(--border\) 80%, transparent\);"/)
assert.match(ring, /calc\(1px \+ var\(--tw-ring-offset-width, 0px\)\)/)
assert.doesNotMatch(ring, /var\(--ring\)|strength|\bk\b/)
assert.match(render, /TACTILE_SURFACE_TABS_LIST_SELECTOR = '\[data-slot="tabs-list"\]:not\(\[data-variant="line"\]\)'/)
assert.match(render, /if \(effects\.effect !== "tactile"\) return ""/)
const recipe = source => code(source).match(/const TACTILE_RECIPE = [\s\S]*?export function renderUiEffectsCss/)[0].replace(/const TABS_LIST_RING = \[[\s\S]*?\] as const/, "")
assert.equal(recipe(render), recipe(at(base, "packages/core/src/theme/render.ts").toString()), "Secondary recipe changed")
assert.equal(code(render).split("export function renderShadcnTailwindCss")[1], code(at(base, "packages/core/src/theme/render.ts").toString()).split("export function renderShadcnTailwindCss")[1])

// TBDS-03 (PUI-131): the group heading is text-sm and nothing else in the sheet changes.
const sheet = read("apps/workbench/src/DesignSystemPreview.tsx")
assert.match(sheet, /<h3 id=\{id\} className="text-sm font-medium text-foreground uppercase">\{label\}<\/h3>/)
assert.equal(code(sheet).replace('className="text-sm font-medium', 'className="text-base font-medium'), code(at(base, "apps/workbench/src/DesignSystemPreview.tsx").toString()))

console.log(`${phase} boundary scan: OK (${changed.length} changed paths)`)
