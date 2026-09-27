// Offline WSCG producer boundary scan. No credentials, network, browser, or canonical runtime state.
// Run after `pnpm build:workbench` and `pnpm registry:build`: node tools/verify-workbench-showcase-components-geometry.mjs
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync } from "node:fs"

const phase = "workbench-showcase-components-geometry-v1-001"
const accepted = "1b6f9e17e305c42af04789a751f1227217f25711"
const dependency = "be4eca8e13728d49fbcfef2c773705c59a4599ad"
const base = "0dcf890431eca3c720b842f34cacb884879e4bd8"
const packetDir = "docs/evidence/workbench-showcase-components-geometry"
const contract = "docs/WORKBENCH_SHOWCASE_COMPONENTS_GEOMETRY_CONTRACT.md"
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trimEnd()
const read = path => readFileSync(path, "utf8")
const at = (rev, path) => execFileSync("git", ["show", rev + ":" + path], { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
const lines = value => value.split("\n").filter(Boolean)
const hash = value => createHash("sha256").update(value).digest("hex")
const code = source => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

// WSCG-01: the frozen nine-ticket packet, source audit and contract are byte-identical to the implementation base, and
// every recorded hash still matches.
const tickets = ["PUI-86", "PUI-87", "PUI-88", "PUI-89", "PUI-90", "PUI-91", "PUI-92", "PUI-93", "PUI-94"]
const hashes = JSON.parse(read(`${packetDir}/snapshot-hashes.json`))
assert.equal(hashes.phase, phase)
assert.equal(hashes.acceptedProductBase, accepted)
assert.equal(hashes.preparedDependencyBase, dependency)
assert.equal(hash(readFileSync(contract)), hashes.contractSha256)
assert.equal(hash(readFileSync(hashes.officialSourceAudit)), hashes.officialSourceAuditSha256)
assert.deepEqual(hashes.tickets.map(ticket => ticket.id), tickets)
for (const ticket of hashes.tickets) {
  const path = `${packetDir}/${ticket.file}`
  assert.equal(hash(readFileSync(path)), ticket.sha256, "Ticket snapshot hash: " + ticket.id)
  const snapshot = JSON.parse(read(path))
  assert.equal(snapshot.issue.id, ticket.id)
  assert.equal(snapshot.comments.comments.length, ticket.commentCount)
  assert.equal(snapshot.issue.attachments.length, ticket.issueAttachmentCount)
  assert.equal(snapshot.issue.documents.length, ticket.issueDocumentCount)
}
for (const path of [...lines(git("ls-tree", "-r", "--name-only", base, packetDir)), contract, "BRIEF.md", "AGENTS.md"]) {
  assert.equal(hash(readFileSync(path)), hash(at(base, path)), "Frozen admission record changed: " + path)
}
for (const [ancestor, descendant] of [[accepted, dependency], [dependency, base], [base, "HEAD"]]) git("merge-base", "--is-ancestor", ancestor, descendant)

// WSCG-02: the prepared dependency commit changed only the manifest and lockfile; both are byte-frozen since.
assert.deepEqual(lines(git("diff", "--name-only", dependency + "^", dependency)).sort(), ["packages/ui/package.json", "pnpm-lock.yaml"])
for (const path of ["packages/ui/package.json", "pnpm-lock.yaml", "package.json", "apps/workbench/package.json", "packages/core/package.json", "pnpm-workspace.yaml"]) {
  assert.equal(hash(readFileSync(path)), hash(at(base, path)), "Dependency boundary changed: " + path)
}
const uiPackage = JSON.parse(read("packages/ui/package.json"))
assert.equal(uiPackage.dependencies["react-day-picker"], "10.0.1")
assert.equal(uiPackage.dependencies["@base-ui/react"], "1.8.0")
assert.deepEqual(Object.keys(uiPackage.dependencies).filter(name => /date-fns|tanstack/.test(name)), [])
const lock = read("pnpm-lock.yaml")
for (const entry of ["react-day-picker@10.0.1", "date-fns@4.4.0", "'@date-fns/tz@1.5.0'"]) assert.ok(lock.includes(entry), "lock entry: " + entry)
assert.doesNotMatch(lock, /@tanstack\//)
// Historical Lead records under .loop/ are never opened here; git alone confirms this phase did not touch them.
assert.equal(git("diff", "--name-only", base, "--", ".loop"), "", "No .loop change")
assert.equal(git("ls-files", "--others", "--exclude-standard", ".loop"), "", "No new .loop file")

// WSCG-14: bounded delivery. Every change since the implementation base is inside the admitted surfaces.
const resources = ["message", "bubble", "calendar", "table"]
const compositions = ["team-chat", "recent-payments", "signup-form", "offsite-calendar", "now-playing", "local-weather"]
const admittedPaths = new Set([
  // Official resources: UI, stories, contracts, constraints, catalog, provenance, registry and their tests.
  ...resources.flatMap(name => [`packages/ui/src/components/${name}.tsx`, `packages/ui/src/components/${name}.stories.tsx`, `packages/core/src/contracts/data/${name}.ts`]),
  "packages/core/src/constraints/component-state.ts", "packages/core/src/constraints/fixtures/valid.json", "packages/core/src/constraints/fixtures/invalid.json",
  "packages/core/src/contracts/catalog.ts", "packages/core/src/context/evaluator.ts", "packages/core/src/context/provenance.ts", "packages/core/README.md", "registry.json",
  "packages/core/src/contracts/contracts.test.ts", "packages/core/src/context/context.get.test.ts", "packages/core/src/context/context.list.test.ts",
  "packages/core/src/context/context.acr11-fresh-agent-path.test.ts", "packages/ui/src/foundation.test.ts", "packages/ui/src/showcase-resources.test.ts", "packages/ui/src/avatar.test.ts",
  // Gallery compositions and recipe.
  ...compositions.flatMap(name => [`packages/ui/src/compositions/${name}.tsx`, `packages/ui/src/compositions/${name}.stories.tsx`]),
  "packages/ui/src/compositions/plan-usage.tsx", "packages/ui/src/compositions/plan-usage.stories.tsx", "packages/ui/src/compositions/productive-week.tsx",
  "packages/ui/src/compositions/revenue-overview.tsx", "apps/workbench/src/Gallery.tsx", "apps/workbench/src/gallery.test.ts", "packages/ui/src/quiet-workspace.test.ts",
  // Editor polish.
  "apps/workbench/src/App.tsx", "apps/workbench/src/LiveControls.tsx", "apps/workbench/src/lifecycle.test.ts",
  // Browser definitions (Lead-executed) and their configs.
  ...["showcase-resources", "workbench-showcase-components-geometry", "chart", "composition-gallery-presentations", "quiet-workspace", "semantic-typography-history-grid",
    "theme-v2-live-controls", "workbench-cards-gallery-curation", "workbench-container-gallery-showcase", "workbench-control-navigation-scroll",
    "workbench-nested-gallery-interaction-polish", "workbench-rendering-controls-polish", "workbench-sidebar-theme-polish", "workbench-theme-controls-polish"].map(name => `e2e/${name}.spec.ts`),
  "e2e/workbench-navigation.ts", "playwright.config.ts", "playwright.workbench.config.ts",
  // Phase evidence.
  "tools/verify-workbench-showcase-components-geometry.mjs", "docs/WORKBENCH_SHOWCASE_COMPONENTS_GEOMETRY_CHECKPOINT.md",
])
const tracked = lines(git("ls-tree", "-r", "--name-only", base)).filter(path => !path.startsWith(".loop/"))
const changed = [...new Set([...lines(git("diff", "--name-only", base)), ...lines(git("ls-files", "--others", "--exclude-standard"))])].sort()
for (const path of changed) {
  assert.ok(admittedPaths.has(path), "Outside admitted scope: " + path)
  assert.doesNotMatch(read(path), /[ \t]+$/m, "Trailing whitespace: " + path)
  assert.ok(read(path).endsWith("\n") && !read(path).endsWith("\n\n"), "Exactly one final newline: " + path)
}
assert.equal(git("diff", "--name-only", "--diff-filter=D", base), "", "No file deletions")

// Everything else is byte-frozen: schema, mutations, persistence, history, proposals, Design Command, Jev, shared
// primitives, retained standalone modules and stories, and earlier verifiers.
const frozen = tracked.filter(path => !admittedPaths.has(path))
for (const path of frozen) assert.equal(hash(readFileSync(path)), hash(at(base, path)), "Frozen file changed: " + path)
const mustBeFrozen = [
  "packages/core/src/theme/schema.ts", "packages/core/src/theme/migrate.ts", "packages/core/src/theme/render.ts", "packages/core/src/mutations/mutation.ts",
  "packages/core/src/mutations/proposal.ts", "packages/core/src/theme/fixtures/default.json", "packages/core/src/theme/fixtures/valid.json",
  "apps/workbench/src/styles.css", "apps/workbench/src/persistence.ts", "apps/workbench/src/history.ts", "apps/workbench/src/lifecycle.ts",
  "apps/workbench/src/PreviewFrame.tsx", "apps/workbench/src/designCommand.ts", "apps/workbench/src/controls.ts", "apps/workbench/src/workbenchTabs.ts",
  "apps/workbench/src/server/designCommandHandler.ts", "packages/core/src/jev-design/wire.ts",
  ...["upcoming-schedule", "launch-board", "support-request", "recent-activity", "quick-find"].flatMap(name => [`packages/ui/src/compositions/${name}.tsx`, `packages/ui/src/compositions/${name}.stories.tsx`]),
  ...readdirSync("packages/ui/src/components").filter(name => !resources.some(resource => name.startsWith(resource + "."))).map(name => `packages/ui/src/components/${name}`),
  ...readdirSync("tools").filter(name => name.startsWith("verify-") && name !== "verify-workbench-showcase-components-geometry.mjs").map(name => `tools/${name}`),
]
for (const path of mustBeFrozen) assert.ok(frozen.includes(path), "Expected frozen: " + path)

// Registry exactly 23 (19 + the four official resources); mutation union exactly 12.
const registry = JSON.parse(read("registry.json"))
const baseRegistry = JSON.parse(at(base, "registry.json").toString())
assert.equal(baseRegistry.items.length, 19)
assert.equal(registry.items.length, 23)
assert.deepEqual(registry.items.slice(0, 19), baseRegistry.items, "existing registry items unchanged")
assert.deepEqual(registry.items.slice(19).map(item => item.name), resources)
assert.deepEqual(readdirSync("public/r").filter(p => p.endsWith(".json") && p !== "registry.json").sort(), registry.items.map(item => item.name + ".json").sort())
const operations = [...read("packages/core/src/mutations/mutation.ts").matchAll(/^\s+\["(set[A-Za-z]+)", new Set\(/gm)].map(match => match[1])
assert.deepEqual(operations, ["setColor", "setRadius", "setDensity", "setFontWeight", "setShadowBlur", "setMotionDuration", "setFontFamily", "setTracking", "setRadiusBase", "setSpacingBase", "setShadowProfile", "setSidebarTokensEnabled"])
const catalog = read("packages/core/src/contracts/catalog.ts")
for (const name of resources) {
  assert.ok(catalog.includes(`${name}: () => import("./data/${name}")`), "catalog: " + name)
  assert.ok(read("packages/core/src/context/provenance.ts").includes(`"resource:${name}"`), "provenance: " + name)
}
assert.doesNotMatch(read("packages/ui/src/components/calendar.tsx"), /from "date-fns|from "@date-fns/)

// WSCG-11: exactly eleven compositions, once each, in the recorded region order, on the accepted container recipe.
const gallerySource = read("apps/workbench/src/Gallery.tsx")
const gallery = code(gallerySource)
const LEFT = ["plan-usage", "quick-find", "productive-week", "signup-form", "local-weather"]
const RIGHT = ["revenue-overview", "team-chat", "recent-activity", "recent-payments", "offsite-calendar", "now-playing"]
assert.deepEqual([...gallery.matchAll(/\{ id: "([a-z-]+)", render: /g)].map(match => match[1]), [...LEFT, ...RIGHT])
assert.deepEqual([...gallery.matchAll(/<Composition id="([a-z-]+)" \/>/g)].map(match => match[1]), [...LEFT, ...RIGHT])
const region = side => { const start = gallery.indexOf(`<Region side="${side}"`); return [...gallery.slice(start, gallery.indexOf("</Region>", start)).matchAll(/<Composition id="([a-z-]+)" \/>/g)].map(match => match[1]) }
assert.deepEqual(region("left"), LEFT)
assert.deepEqual(region("right"), RIGHT)
assert.match(gallery, /<LocalGroup className="@lg:grid-cols-2">\s*<Composition id="team-chat" \/>\s*<Composition id="recent-activity" \/>\s*<\/LocalGroup>/)
assert.equal((gallery.match(/<LocalGroup /g) ?? []).length, 1)
assert.equal((gallerySource.match(/from "@personal-ui\/ui\/compositions\//g) ?? []).length, 11)
assert.equal(hash(gallery.slice(gallery.indexOf("function Composition"), gallery.indexOf("export function Gallery"))), hash(code(at(base, "apps/workbench/src/Gallery.tsx").toString()).slice(code(at(base, "apps/workbench/src/Gallery.tsx").toString()).indexOf("function Composition"), code(at(base, "apps/workbench/src/Gallery.tsx").toString()).indexOf("export function Gallery"))), "Composition/Region/LocalGroup unchanged")
assert.match(gallery, /<div className="grid grid-cols-1 items-start gap-4 @2xl\/gallery:grid-cols-12">/)
for (const text of [gallery, code(read("apps/workbench/src/styles.css"))]) assert.doesNotMatch(text, /masonry|dense|auto-rows|\babsolute\b|gridColumn|gridRow|colSpan/)
for (const name of ["upcoming-schedule", "launch-board", "support-request"]) {
  assert.ok(!gallerySource.includes(`compositions/${name}"`), "replaced in the gallery: " + name)
  for (const file of [`${name}.tsx`, `${name}.stories.tsx`]) assert.ok(existsSync(`packages/ui/src/compositions/${file}`), "standalone module retained: " + file)
}

// WSCG-03..05 and 12..13 source anchors.
assert.doesNotMatch(read("packages/ui/src/compositions/plan-usage.tsx"), /Team plan|Upgrade|Sparkles|<Button|useState/)
assert.match(read("packages/ui/src/compositions/revenue-overview.tsx"), /<XAxis dataKey="period" hide padding=\{\{ left: 12, right: 12 \}\} \/>/)
assert.doesNotMatch(read("packages/ui/src/compositions/productive-week.tsx"), /A productive week|tasks completed|Your workspace, at a glance/)
assert.match(read("packages/ui/src/compositions/productive-week.tsx"), /type-heading text-4xl/)
const controls = read("apps/workbench/src/LiveControls.tsx")
assert.doesNotMatch(controls, /Sidebar tokens are currently not applied\./)
assert.match(controls, /aria-describedby=\{enabled \? "sidebar-tokens-status" : undefined\}/)
const app = read("apps/workbench/src/App.tsx")
assert.deepEqual([...app.matchAll(/<TabsTrigger value="([a-z]+)" className=\{CATEGORY_TRIGGER_CLASS\} onMouseDown=\{focusCategoryTrigger\}>([A-Za-z]+)<\/TabsTrigger>/g)].map(match => match[2]), ["Colors", "Typography", "Geometry", "Effects", "Command"])

// WSCG-10/14: token-only colour and no network, credential, geolocation, or audio surface in changed product code.
const rawColour = /#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color-mix)\(|\b(bg|text|border|fill|stroke|ring|from|to|via)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white)\b|\[(#|rgb|hsl|oklch)/
for (const name of [...LEFT, ...RIGHT]) assert.doesNotMatch(read(`packages/ui/src/compositions/${name}.tsx`), rawColour, "raw colour: " + name)
const surface = /\bfetch\(|XMLHttpRequest|WebSocket|EventSource|navigator\.(sendBeacon|geolocation)|new Audio|<audio|TYPESAFE_|localStorage|sessionStorage/g
for (const path of changed.filter(path => /^packages\/ui\/src\/.*\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path))) assert.doesNotMatch(read(path), surface, path)
// The Workbench shell keeps exactly its accepted persistence and Design Command surface.
for (const path of changed.filter(path => /^apps\/workbench\/src\/.*\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path))) {
  assert.deepEqual(read(path).match(surface) ?? [], at(base, path).toString().match(surface) ?? [], path)
}
const bundleFiles = readdirSync("apps/workbench/dist/assets").filter(name => name.endsWith(".js"))
assert.ok(bundleFiles.length > 0, "build the workbench first")
for (const file of bundleFiles) assert.doesNotMatch(read(`apps/workbench/dist/assets/${file}`), /TYPESAFE_|api\.typesafe\.ai|sk-[A-Za-z0-9]{20}|geolocation\.getCurrentPosition/, file)

console.log(JSON.stringify({ ok: true, phase, base, changed: changed.length, frozen: frozen.length, operations: operations.length, registry: registry.items.length, compositions: LEFT.length + RIGHT.length }))
