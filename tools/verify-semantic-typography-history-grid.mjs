// Offline STHG boundary scan. No credentials, network, browser, or canonical runtime state.
// Run after `pnpm build:workbench` and `pnpm registry:build`: node tools/verify-semantic-typography-history-grid.mjs
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"

const accepted = "47d0aebef617f9d936d21f53089c96bd040e70d6"
const base = "0c251593571da9b6418e88e8278677b1d3277e33"
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd()
const read = path => readFileSync(path, "utf8")
const prior = path => execFileSync("git", ["show", base + ":" + path], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
const lines = value => value.split("\n").filter(Boolean)
const hash = value => createHash("sha256").update(value).digest("hex")
const code = source => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

// STHG-01: the phase base only adds admission records to the accepted product; the frozen packet is untouched.
const admission = [
  ".loop/runs/semantic-typography-history-grid-v1-001/admission.json", ".loop/runs/semantic-typography-history-grid-v1-001/linear-ticket-snapshots.md",
  ".loop/runs/semantic-typography-history-grid-v1-001/preflight.json", ".loop/runs/semantic-typography-history-grid-v1-001/task.md",
  "BRIEF.md", "docs/SEMANTIC_TYPOGRAPHY_HISTORY_GRID_CONTRACT.md",
]
assert.deepEqual(lines(git("diff", "--name-only", accepted, base)).sort(), admission)
for (const path of admission) assert.equal(git("rev-parse", "HEAD:" + path), git("rev-parse", base + ":" + path), "Admission record changed: " + path)

// STHG-02: bounded delivery.
const admitted = new Set([
  // Theme v3 schema, migration, renderer, mutation/context/recipes, fixtures, and their tests.
  "packages/core/README.md", "packages/core/src/index.ts",
  "packages/core/src/theme/schema.ts", "packages/core/src/theme/migrate.ts", "packages/core/src/theme/render.ts",
  "packages/core/src/theme/fixtures/default.json", "packages/core/src/theme/fixtures/default.css", "packages/core/src/theme/fixtures/quiet-editorial.css",
  "packages/core/src/theme/theme.test.ts", "packages/core/src/theme/default.test.ts", "packages/core/src/theme/migrate.test.ts", "packages/core/src/theme/sidebar-tokens.test.ts",
  "packages/core/src/mutations/mutation.ts", "packages/core/src/mutations/mutation.test.ts", "packages/core/src/mutations/mutation.v2.test.ts",
  "packages/core/src/context/capability-descriptions.ts", "packages/core/src/context/provenance.ts", "packages/core/src/context/context.get.test.ts",
  "packages/core/src/jev-design/recipes.ts", "packages/core/src/jev-design/recipes.fixtures.ts", "packages/core/src/jev-design/compose.test.ts",
  // Semantic role adoption in shared compositions, the Workbench-only Panel, the font catalog, base styles, and icons.
  "packages/ui/src/components/panel.tsx", "packages/ui/src/lib/fonts.ts", "packages/ui/src/fonts.test.ts", "packages/ui/src/lib/workbench-icons.ts",
  "packages/ui/src/styles/globals.css",
  ...["account-profile", "notification-preferences", "productive-week", "recent-activity", "room-to-think", "support-request", "team-access", "workspace-settings"].map(name => `packages/ui/src/compositions/${name}.tsx`),
  // Workbench controls, history, grid.
  "apps/workbench/src/App.tsx", "apps/workbench/src/LiveControls.tsx", "apps/workbench/src/controls.ts", "apps/workbench/src/PreviewFrame.tsx",
  "apps/workbench/src/Gallery.tsx", "apps/workbench/src/styles.css", "apps/workbench/src/history.ts",
  "apps/workbench/src/lifecycle.test.ts", "apps/workbench/src/history.test.ts", "apps/workbench/src/gallery.test.ts",
  // Browser definitions (Lead-executed).
  "e2e/semantic-typography-history-grid.spec.ts", "e2e/design-command-fixture.ts", "e2e/design-command.spec.ts", "e2e/proposal-preview.spec.ts",
  "e2e/quiet-workspace.spec.ts", "e2e/theme-v2-live-controls.spec.ts", "e2e/workbench-control-navigation-scroll.spec.ts", "e2e/workbench-navigation.ts",
  "e2e/workbench-rendering-controls-polish.spec.ts", "e2e/workbench-sidebar-preview-followup.spec.ts", "e2e/workbench-sidebar-theme-polish.spec.ts",
  "e2e/workbench-theme-controls-polish.spec.ts", "e2e/workbench.spec.ts", "playwright.config.ts", "playwright.workbench.config.ts",
  // Phase evidence.
  "tools/verify-semantic-typography-history-grid.mjs", "docs/SEMANTIC_TYPOGRAPHY_HISTORY_GRID_CHECKPOINT.md",
])
const tracked = lines(git("ls-tree", "-r", "--name-only", base))
const changed = [...new Set([...lines(git("diff", "--name-only", base)), ...lines(git("ls-files", "--others", "--exclude-standard"))])].sort()
for (const path of changed) {
  assert.ok(admitted.has(path), "Outside admitted scope: " + path)
  assert.doesNotMatch(read(path), /[ \t]+$/m, "Trailing whitespace: " + path)
  // New files end in exactly one newline; a modified file keeps (never worsens) its base EOF form.
  const eof = text => (text.endsWith("\n\n") ? "blank" : text.endsWith("\n") ? "newline" : "none")
  const was = tracked.includes(path) ? eof(prior(path)) : "newline"
  assert.ok(eof(read(path)) === "newline" || eof(read(path)) === was, "Final newline: " + path)
}
assert.equal(git("diff", "--name-only", "--diff-filter=D", base), "", "No file deletions")

// STHG-15: everything else is byte-frozen, including dependencies, the lockfile, the registry, public primitives,
// persistence, proposals, Jev transport, the historical v1 fixture, and every earlier phase verifier.
const frozen = tracked.filter(path => !admitted.has(path))
for (const path of frozen) {
  const before = execFileSync("git", ["show", base + ":" + path], { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
  assert.equal(hash(readFileSync(path)), hash(before), "Frozen file changed: " + path)
}
for (const path of ["package.json", "pnpm-lock.yaml", "registry.json", "packages/ui/package.json", "apps/workbench/package.json", "packages/core/package.json",
  "packages/ui/src/components/card.tsx", "packages/ui/src/components/chart.tsx", "packages/ui/src/components/dialog.tsx", "packages/ui/src/components/drawer.tsx",
  "packages/ui/src/components/button.tsx", "packages/ui/src/components/slider.tsx", "packages/ui/src/components/responsive-dialog.tsx",
  "apps/workbench/src/persistence.ts", "apps/workbench/src/lifecycle.ts", "apps/workbench/src/designCommand.ts", "apps/workbench/src/server/designCommandHandler.ts",
  "packages/core/src/mutations/proposal.ts", "packages/core/src/theme/diff.ts", "packages/core/src/theme/fixtures/valid.json", "packages/core/src/theme/schema-v1.ts",
  "packages/core/src/jev-design/questions.ts", "packages/core/src/jev-design/wire.ts", "packages/core/src/jev-design/evaluate.ts"]) {
  assert.ok(frozen.includes(path), "Expected frozen: " + path)
}
const registry = JSON.parse(read("registry.json"))
assert.equal(registry.items.length, 19)
assert.deepEqual(readdirSync("public/r").filter(p => p.endsWith(".json") && p !== "registry.json").sort(), registry.items.map(item => item.name + ".json").sort())

// STHG-08: exactly twelve current operations; setSansFamily replaced by setFontWeight; typography ops are targeted.
const operationFields = source => Object.fromEntries([...source.matchAll(/^\s+\["(set[A-Za-z]+)", new Set\(\[([^\]]*)\]\)\]/gm)].map(match => [match[1], match[2].match(/"([^"]+)"/g).map(field => field.slice(1, -1))]))
const operations = operationFields(read("packages/core/src/mutations/mutation.ts"))
assert.deepEqual(Object.keys(operations), ["setColor", "setRadius", "setDensity", "setFontWeight", "setShadowBlur", "setMotionDuration", "setFontFamily", "setTracking", "setRadiusBase", "setSpacingBase", "setShadowProfile", "setSidebarTokensEnabled"])
for (const name of ["setFontWeight", "setFontFamily", "setTracking"]) assert.deepEqual(operations[name], ["op", "target", "value"])
assert.deepEqual(Object.keys(operationFields(prior("packages/core/src/mutations/mutation.ts"))).filter(name => !(name in operations)), ["setSansFamily"])
const descriptions = read("packages/core/src/context/capability-descriptions.ts")
for (const name of Object.keys(operations)) assert.match(descriptions, new RegExp(`\\b${name}:`))
assert.doesNotMatch(descriptions, /setSansFamily|sans\|serif/)
assert.doesNotMatch(code(read("packages/core/src/jev-design/recipes.ts")), /setSansFamily/)

// STHG-03/04: canonical v3 roles only; both built-ins load as complete v3 with the approved mapping.
const schema = read("packages/core/src/theme/schema.ts")
assert.match(schema, /export const THEME_SCHEMA_VERSION = "3\.0" as const/)
assert.match(schema, /const typographyV3 = z\.strictObject\(\{ heading: typeRole, body: typeRole, mono: fontFamily \}\)/)
assert.match(schema, /typography: typographyV3,/)
const defaultTheme = JSON.parse(read("packages/core/src/theme/fixtures/default.json"))
const priorDefault = JSON.parse(prior("packages/core/src/theme/fixtures/default.json"))
assert.equal(defaultTheme.schemaVersion, "3.0")
assert.deepEqual(Object.keys(defaultTheme.typography), ["heading", "body", "mono"])
assert.deepEqual(defaultTheme.typography.heading, { font: priorDefault.typography.serif, weight: { $type: "fontWeight", $value: 600 }, tracking: priorDefault.typography.tracking })
assert.deepEqual(defaultTheme.typography.body, { font: priorDefault.typography.sans, weight: { $type: "fontWeight", $value: 400 }, tracking: priorDefault.typography.tracking })
assert.deepEqual(defaultTheme.typography.mono, priorDefault.typography.mono)
for (const key of Object.keys(priorDefault).filter(key => !["$schema", "schemaVersion", "typography"].includes(key))) assert.deepEqual(defaultTheme[key], priorDefault[key], "Default value changed: " + key)
const migration = read("packages/core/src/theme/migrate.ts")
assert.match(migration, /export const V3_MIGRATION_DEFAULTS = Object\.freeze\(\{ headingWeight: 600, bodyWeight: 400 \}\)/)
assert.match(migration, /heading: role\(serif, V3_MIGRATION_DEFAULTS\.headingWeight\),\s*body: role\(sans, V3_MIGRATION_DEFAULTS\.bodyWeight\),/)

// STHG-05: exact semantic variables and composed roles; no size/line-height scale and no text-heading/text-body.
for (const name of ["default", "quiet-editorial"]) {
  const css = read(`packages/core/src/theme/fixtures/${name}.css`)
  for (const variable of ["--font-heading", "--font-body", "--font-mono", "--font-weight-heading", "--font-weight-body", "--tracking-heading", "--tracking-body"]) {
    assert.match(css, new RegExp(`^  ${variable}: [^;]+;$`, "m"), `${name}: ${variable}`)
  }
  for (const role of ["heading", "body"]) {
    assert.ok(css.includes(`@utility type-${role} {\n  font-family: var(--font-${role});\n  font-weight: var(--font-weight-${role});\n  letter-spacing: var(--tracking-${role});\n}`), `${name}: type-${role}`)
  }
  assert.doesNotMatch(css, /text-(?:heading|body)|--font-family-|--tracking-base|--font-(?:sans|serif):|--(?:text|leading|line-height)-(?:heading|body)/)
  const inline = css.slice(css.indexOf("@theme inline {"), css.indexOf("}", css.indexOf("@theme inline {")))
  assert.doesNotMatch(inline, /--(?:font|tracking|type)-/)
}

// STHG-07: Body at the shared root, Heading on semantic titles, Mono untouched for code.
assert.doesNotMatch(read("packages/ui/src/styles/globals.css"), /font-sans/)
assert.match(read("apps/workbench/src/styles.css"), /font-family: var\(--font-body\);\s*font-size: 0\.875rem;\s*font-weight: var\(--font-weight-body\);\s*line-height: 1\.25rem;\s*letter-spacing: var\(--tracking-body\);/)
for (const name of ["productive-week", "team-access", "recent-activity", "room-to-think", "account-profile", "notification-preferences", "support-request", "workspace-settings"]) {
  assert.match(read(`packages/ui/src/compositions/${name}.tsx`), /<h2 className="type-heading">/, name)
}

// STHG-12/13/14: recovery group placement and the composition grid contract.
const app = read("apps/workbench/src/App.tsx")
const toolbar = app.slice(app.indexOf('data-testid="workbench-toolbar"'))
const order = ['aria-label="Undo"', 'aria-label="Redo"', 'aria-label="Reset"', 'title="Export JSON"', 'title="Save"'].map(needle => toolbar.indexOf(needle))
assert.ok(order.every((index, i) => index > 0 && (i === 0 || index > order[i - 1])), "Recovery group precedes Export and Save")
assert.doesNotMatch(app, /localStorage\.[a-zA-Z]+\([^)]*(?:history|tracks)/i)
const gallery = read("apps/workbench/src/Gallery.tsx")
assert.match(gallery, /export type PreviewLayout = "default" \| "wide"/)
assert.deepEqual([...gallery.matchAll(/\{ id: "([a-z-]+)", layout: "(default|wide)"/g)].map(match => [match[1], match[2]]), [
  ["productive-week", "wide"], ["account-profile", "default"], ["team-access", "wide"], ["workspace-settings", "wide"],
  ["notifications", "default"], ["support-request", "default"], ["recent-activity", "default"], ["room-to-think", "default"],
])
const styles = code(read("apps/workbench/src/styles.css"))
assert.match(styles, /grid-auto-flow: row; align-items: start;/)
assert.doesNotMatch(styles, /dense|aspect-ratio|masonry|quiet-stack/)

// STHG-15: the client bundle carries no credential, provider transport, or new network surface.
const bundleFiles = readdirSync("apps/workbench/dist/assets").filter(name => name.endsWith(".js"))
assert.ok(bundleFiles.length > 0, "build the workbench first")
for (const file of bundleFiles) {
  const bundle = read(`apps/workbench/dist/assets/${file}`)
  assert.doesNotMatch(bundle, /TYPESAFE_|api\.typesafe\.ai|sk-[A-Za-z0-9]{20}/, file)
}
for (const path of ["apps/workbench/src/history.ts", "apps/workbench/src/Gallery.tsx", "apps/workbench/src/App.tsx", "apps/workbench/src/LiveControls.tsx"]) {
  assert.doesNotMatch(read(path), /\bfetch\(|XMLHttpRequest|WebSocket|EventSource|navigator\.sendBeacon/, path)
}

console.log(JSON.stringify({ ok: true, changed: changed.length, frozen: frozen.length, operations: Object.keys(operations).length, registry: registry.items.length }))
