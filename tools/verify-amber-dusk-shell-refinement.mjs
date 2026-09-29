// Offline ADSR producer boundary scan (read-only). No credentials, network, browser, or canonical runtime state.
// Run after building the Workbench and the registry: node tools/verify-amber-dusk-shell-refinement.mjs
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"

const phase = "amber-dusk-shell-refinement-v1-001"
const base = "24bfc2bd838ce51e70db15c71c38f8f06dd32d7d"
const acceptedProduct = "a30f4d3c6a2fad98852fc51ad5e7520d919c7850"
const packetDir = "docs/evidence/amber-dusk-shell-refinement-v1/linear"
const contract = "docs/AMBER_DUSK_SHELL_REFINEMENT_CONTRACT.md"
const tickets = ["PUI-123", "PUI-124", "PUI-125", "PUI-126", "PUI-127", "PUI-128"]
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trimEnd()
const read = path => readFileSync(path, "utf8")
const at = (rev, path) => execFileSync("git", ["show", `${rev}:${path}`], { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
const hash = value => createHash("sha256").update(value).digest("hex")
const code = source => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

// ADSR-01: the six frozen snapshots, their manifest and the contract are byte-identical to the prepared base, each
// snapshot matches its pinned hash, and no other ticket is in the packet.
const manifest = JSON.parse(read(`${packetDir}/snapshot-hashes.json`))
assert.equal(manifest.phase, phase)
assert.deepEqual(manifest.admittedTicketIds, tickets)
for (const id of tickets) assert.equal(hash(readFileSync(`${packetDir}/${id}.json`)), manifest.snapshotSha256[id], `${id} snapshot hash`)
assert.deepEqual(git("ls-files", packetDir).split("\n").sort(), [...tickets.map(id => `${packetDir}/${id}.json`), `${packetDir}/snapshot-hashes.json`].sort())
for (const path of [...tickets.map(id => `${packetDir}/${id}.json`), `${packetDir}/snapshot-hashes.json`, contract]) assert.ok(readFileSync(path).equals(at(base, path)), `Frozen record changed: ${path}`)
execFileSync("git", ["merge-base", "--is-ancestor", acceptedProduct, "HEAD"])
execFileSync("git", ["merge-base", "--is-ancestor", base, "HEAD"])

// Owner contrast resolution (Lead-committed at 61c6511): pinned and byte-identical; it authorizes the Amber Dusk
// colour overrides checked below and nothing else.
const resolution = "docs/evidence/amber-dusk-shell-refinement-v1/owner-contrast-resolution.json"
const resolutionCommit = "61c651150df448094f3d9240d04003f174c47e25"
execFileSync("git", ["merge-base", "--is-ancestor", resolutionCommit, "HEAD"])
assert.equal(hash(readFileSync(resolution)), "55dc7b8fd4b914dbcaea747b194194b26b693c38d5a48baf6fc5ecf6dce04502", "owner resolution hash")
assert.ok(readFileSync(resolution).equals(at(resolutionCommit, resolution)), "owner resolution changed")

// Admitted scope only: the contract's likely edit surface, tests, and this phase's producer tooling.
const allowed = new Set([
  "packages/core/src/theme/fixtures/amber-dusk.json",
  "packages/core/src/theme/fixtures/amber-dusk.conversion.json",
  "packages/core/src/context/themes.ts",
  "packages/core/src/context/provenance.ts",
  "packages/core/src/context/capability-descriptions.ts",
  "packages/core/src/theme/render.ts",
  "packages/core/src/index.ts",
  "apps/workbench/src/lifecycle.ts",
  "apps/workbench/src/controls.ts",
  "apps/workbench/src/LiveControls.tsx",
  "apps/workbench/src/DesignSystemPreview.tsx",
  "packages/ui/src/lib/workbench-icons.ts",
  "packages/ui/src/compositions/app-shells.tsx",
  "packages/ui/src/compositions/plan-usage.tsx",
  "packages/ui/src/compositions/team-chat.tsx",
  "e2e/workbench-navigation.ts",
  "playwright.workbench.config.ts",
  "playwright.config.ts",
  "tools/verify-amber-dusk-shell-refinement.mjs",
  "docs/evidence/amber-dusk-shell-refinement-v1/owner-contrast-resolution.json",
])
// Include pending tracked edits so a producer cannot pass this scan using stale HEAD-only evidence.
const changed = git("diff", "--name-only", base).split("\n").filter(Boolean)
for (const path of changed) {
  const isTest = /\.(test|spec)\.ts$/.test(path)
  const isEvidence = path.startsWith("docs/evidence/amber-dusk-shell-refinement-v1/producer/")
  assert.ok(allowed.has(path) || isTest || isEvidence, `Outside admitted scope: ${path}`)
  assert.ok(!path.startsWith(".loop/") && !path.includes("/.loop/"), `Canonical runtime state touched: ${path}`)
}

// Frozen boundaries: dependencies, lockfile, registry, public components, schema/migration/mutation sources, and the
// existing built-in fixtures are byte-identical to the accepted product.
for (const path of ["package.json", "pnpm-lock.yaml", "registry.json", "apps/workbench/package.json", "packages/core/package.json", "packages/ui/package.json", "packages/core/src/theme/schema.ts", "packages/core/src/theme/migrate.ts", "packages/core/src/theme/diff.ts", "packages/core/src/theme/derive.ts", "packages/core/src/theme/color.ts", "packages/core/src/mutations/mutation.ts", "packages/core/src/mutations/proposal.ts"]) assert.ok(readFileSync(path).equals(at(acceptedProduct, path)), `Boundary changed: ${path}`)
assert.equal(git("diff", "--name-only", acceptedProduct, "--", "packages/ui/src/components"), "", "public components must be unchanged")
assert.equal(JSON.parse(read("registry.json")).items.length, 23)
for (const fixture of ["default.json", "valid.json", "default.css", "quiet-editorial.css", "default.conversion.json"]) assert.ok(readFileSync(`packages/core/src/theme/fixtures/${fixture}`).equals(at(acceptedProduct, `packages/core/src/theme/fixtures/${fixture}`)), `Built-in fixture changed: ${fixture}`)
assert.equal(git("diff", "--name-only", acceptedProduct, "--", "packages/core/src/theme/fixtures/legacy"), "")

// ADSR-02: one canonical Theme v3 amber-dusk fixture, registered in both catalogs, with provenance matching its bytes.
const amber = JSON.parse(read("packages/core/src/theme/fixtures/amber-dusk.json"))
assert.equal(amber.schemaVersion, "3.0")
assert.equal(amber.id, "amber-dusk")
assert.equal(amber.name, "Amber Dusk")
assert.deepEqual(amber.sidebar, { useDedicatedTokens: { $type: "boolean", $value: true }, dedicatedValuesInitialized: true })
assert.equal(amber.uiEffects, undefined)
for (const mode of ["light", "dark"]) assert.equal(Object.keys(amber.colors[mode]).length, 32)
assert.deepEqual(Object.keys(amber.typography), ["heading", "body", "mono"])
assert.match(read("packages/core/src/context/themes.ts"), /"amber-dusk": \(\) => amberDuskFixture,/)
assert.match(read("apps/workbench/src/lifecycle.ts"), /const BUILT_IN_FIXTURES = \[defaultFixture, quietEditorialFixture, amberDuskFixture\] as const/)
assert.ok(read("packages/core/src/context/provenance.ts").includes(`sha256: "${hash(readFileSync("packages/core/src/theme/fixtures/amber-dusk.json"))}"`), "amber-dusk provenance hash")
assert.ok(!existsSync("packages/core/src/theme/fixtures/amber-dusk.css"), "no parallel Amber Dusk stylesheet")
// Owner contrast overrides: exactly three colour tokens differ from the normalized supplied source, as recorded.
const report = JSON.parse(read("packages/core/src/theme/fixtures/amber-dusk.conversion.json"))
assert.equal(report.ownerContrastOverrides.document, resolution)
const overridden = Object.entries(report.values).filter(([path, entry]) => {
  const [, mode, name] = path.split(".")
  return amber.colors[mode][name].$value !== entry.normalized
}).map(([path]) => path).sort()
assert.deepEqual(overridden, ["colors.dark.primary-foreground", "colors.light.muted-foreground", "colors.light.primary"])
for (const path of overridden) {
  const [, mode, name] = path.split(".")
  assert.equal(amber.colors[mode][name].$value, report.ownerContrastOverrides.values[path].override, path)
  assert.equal(report.values[path].source, report.ownerContrastOverrides.values[path].source, path)
}
assert.doesNotMatch(code(read("packages/core/src/theme/render.ts")) + code(read("apps/workbench/src/lifecycle.ts")).replace(/amberDuskFixture|amber-dusk\.json/g, ""), /amber/i)

// Theme v3 stays 3.0 and the closed mutation union stays thirteen operations.
assert.match(code(read("packages/core/src/theme/schema.ts")), /THEME_SCHEMA_VERSION = "3\.0" as const/)
const ops = [...code(read("packages/core/src/mutations/mutation.ts")).matchAll(/^\s+\["(set[A-Za-z]+)", new Set\(\[([^\]]*)\]\)\],$/gm)]
assert.equal(ops.length, 13)

// ADSR-04: Secondary keeps the strength recipe; surface TabsLists take only the fixed ring; no trigger is targeted.
const render = read("packages/core/src/theme/render.ts")
assert.match(render, /TACTILE_SECONDARY_BUTTON_SELECTOR = '\[data-variant="secondary"\]\[data-size\]:is\(\[data-slot="button"\], \[data-slot\$="-trigger"\], \[data-slot\$="-close"\]\)'/)
assert.match(render, /TACTILE_SURFACE_TABS_LIST_SELECTOR = '\[data-slot="tabs-list"\]:not\(\[data-variant="line"\]\)'/)
assert.doesNotMatch(code(render), /tabs-trigger|TACTILE_SURFACE_TAB_SELECTOR/)
// Superseded by PUI-129 (tactile-border-designsystem-type-v1-001): the decorative ring reads --border at 80%.
assert.match(render, /"--tw-ring-color: color-mix\(in oklab, var\(--border\) 80%, transparent\);"/)
assert.match(render, /calc\(1px \+ var\(--tw-ring-offset-width, 0px\)\)/)
assert.match(render, /if \(effects\.effect !== "tactile"\) return ""/)

// ADSR-05: effect-driven helper, Colors hierarchy, shells, Storage and Chat.
const controls = read("apps/workbench/src/controls.ts"), live = read("apps/workbench/src/LiveControls.tsx")
assert.match(controls, /off: null,\s*tactile: "Applied to secondary buttons and tabs\.",/)
assert.match(live, /\{help && \(\s*<FieldDescription id="ui-effect-help"/)
assert.match(read("packages/ui/src/lib/workbench-icons.ts"), /export \{ Download, Info, Moon, Redo2, RotateCcw, Save, Sun, Undo2 \} from "lucide-react"/)
const sheet = read("apps/workbench/src/DesignSystemPreview.tsx")
// Superseded by PUI-131: group headings are text-sm.
assert.match(sheet, /<h3 id=\{id\} className="text-sm font-medium text-foreground uppercase">/)
assert.match(sheet, /className="truncate text-xs font-normal text-foreground" data-testid="token-label">\{titleCaseLabel\(label\)\}/)
const shells = read("packages/ui/src/compositions/app-shells.tsx")
assert.match(shells, /@3xl:w-\[90%\]/)
assert.match(shells, /bg-muted p-2" data-shell-body/)
assert.match(shells, /rounded-lg border bg-background shadow-2xs" data-shell-inset/)
assert.match(shells, /<Sidebar\s+collapsible="none"/)
assert.match(shells, /const ignoreProviderToggle = \(\) => \{\}/)
assert.match(read("packages/ui/src/compositions/plan-usage.tsx"), /<Button variant="secondary" type="button" className="w-full cursor-pointer">Manage storage<\/Button>/)
assert.match(read("packages/ui/src/compositions/team-chat.tsx"), /aria-label="Send message" className="size-7 shrink-0 cursor-pointer rounded-full"/)

// Build artifacts exist (the caller ran the builds) and no network/credential surface was introduced by this diff.
assert.ok(existsSync("apps/workbench/dist/index.html"), "build the Workbench first")
const scanned = changed.filter(p => !p.endsWith(".md") && !p.endsWith(".json") && !p.startsWith("tools/") && !p.startsWith("e2e/"))
const added = git("diff", base, "--", ...scanned).split("\n").filter(line => line.startsWith("+")).join("\n")
assert.doesNotMatch(added, /fetch\(|XMLHttpRequest|WebSocket|sendBeacon|process\.env|API_KEY|https?:\/\//)
console.log(`${phase}: producer boundary scan passed (${changed.length} changed paths)`)
