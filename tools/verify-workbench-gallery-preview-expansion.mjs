// Offline WGPE producer boundary scan (read-only). No credentials, network, browser, or canonical runtime state.
// Run after `pnpm build:workbench` and `pnpm registry:build`: node tools/verify-workbench-gallery-preview-expansion.mjs
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"

const phase = "workbench-gallery-preview-expansion-v1-001"
const acceptedProduct = "8e405812ffea1f3acd35c17aabb8b0be4bbfd934"
const acceptedControl = "0bb51e993e2d6520f3491be992b8274c0355a159"
const base = "9a1e247503b051f80ed0af4a1d7f03384bd189eb"
const packetDir = "docs/evidence/workbench-gallery-preview-expansion/linear"
const contract = "docs/WORKBENCH_GALLERY_PREVIEW_EXPANSION_CONTRACT.md"
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trimEnd()
const read = path => readFileSync(path, "utf8")
const at = (rev, path) => execFileSync("git", ["show", rev + ":" + path], { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
const lines = value => value.split("\n").filter(Boolean)
const hash = value => createHash("sha256").update(value).digest("hex")
const code = source => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

// WGPE-01: the eight verbatim snapshots, index and contract match their pinned hashes and are byte-identical to the
// prepared implementation base; the accepted product and control bases are ancestors of HEAD.
const tickets = ["PUI-95", "PUI-96", "PUI-97", "PUI-98", "PUI-99", "PUI-100", "PUI-101", "PUI-102"]
const manifest = JSON.parse(read(`${packetDir}/snapshot-hashes.json`))
assert.equal(manifest.schemaVersion, "linear-snapshot-hashes/1")
assert.equal(manifest.phase, phase)
assert.equal(manifest.contract.path, contract)
assert.equal(hash(readFileSync(contract)), manifest.contract.sha256, "contract hash")
assert.equal(hash(readFileSync(manifest.index.path)), manifest.index.sha256, "index hash")
assert.deepEqual(Object.keys(manifest.tickets), tickets)
const index = read(manifest.index.path)
for (const id of tickets) {
  const entry = manifest.tickets[id]
  assert.equal(entry.path, `${packetDir}/${id}.json`)
  assert.equal(hash(readFileSync(entry.path)), entry.sha256, "snapshot hash: " + id)
  const snapshot = JSON.parse(read(entry.path))
  assert.equal(snapshot.issue.id, id)
  assert.equal(snapshot.retrievedAtUtc, manifest.retrievedAtUtc)
  assert.ok(snapshot.issue.description.length > 500, "full description: " + id)
  // The index records each ticket's comment / attachment / document counts and hash.
  const row = index.split("\n").find(line => line.startsWith(`| [${id}](${id}.json)`))
  assert.ok(row, "index row: " + id)
  assert.ok(row.includes(`\`${entry.sha256}\``), "index hash: " + id)
  const [comments, attachments, documents] = row.match(/\| (\d+) \/ (\d+) \/ (\d+) \|/).slice(1).map(Number)
  assert.equal(snapshot.comments.comments.length, comments, "comments: " + id)
  assert.equal(snapshot.comments.hasNextPage, false, "complete comments: " + id)
  assert.equal(snapshot.issue.attachments.length, attachments, "attachments: " + id)
  assert.equal(snapshot.issue.documents.length, documents, "documents: " + id)
}
for (const path of [...lines(git("ls-tree", "-r", "--name-only", base, packetDir)), contract, "BRIEF.md", "AGENTS.md"]) {
  assert.equal(hash(readFileSync(path)), hash(at(base, path)), "Frozen admission record changed: " + path)
}
for (const [ancestor, descendant] of [[acceptedProduct, acceptedControl], [acceptedControl, base], [base, "HEAD"]]) git("merge-base", "--is-ancestor", ancestor, descendant)

// WGPE-02: no dependency, manifest, lockfile or canonical runtime-state change.
for (const path of ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "apps/workbench/package.json", "packages/ui/package.json", "packages/core/package.json"]) {
  assert.equal(hash(readFileSync(path)), hash(at(base, path)), "Dependency boundary changed: " + path)
}
// Historical Lead records under .loop/ are never opened here; git alone confirms this phase did not touch them.
assert.equal(git("diff", "--name-only", base, "--", ".loop"), "", "No .loop change")
assert.equal(git("ls-files", "--others", "--exclude-standard", ".loop"), "", "No new .loop file")

// WGPE-02/12: bounded delivery. Every change since the prepared base is inside the admitted surfaces.
const changedCompositions = ["team-chat", "recent-payments", "now-playing", "offsite-calendar", "local-weather"]
const admittedPaths = new Set([
  // PUI-95..100 compositions, the PUI-97 gallery recipe and PUI-98 switch.
  ...changedCompositions.map(name => `packages/ui/src/compositions/${name}.tsx`),
  "apps/workbench/src/Gallery.tsx", "apps/workbench/src/LiveControls.tsx",
  // PUI-101/102 preview views and the four-view preview.
  "apps/workbench/src/DesignSystemPreview.tsx", "apps/workbench/src/PreviewFrame.tsx",
  "packages/ui/src/compositions/app-shells.tsx", "packages/ui/src/compositions/app-shells.stories.tsx",
  // Unit definitions.
  "apps/workbench/src/gallery.test.ts", "apps/workbench/src/lifecycle.test.ts", "apps/workbench/src/previewViews.test.ts", "packages/ui/src/quiet-workspace.test.ts",
  // Browser definitions (Lead-executed) and their configs.
  ...["workbench-gallery-preview-expansion", "workbench-showcase-components-geometry", "workbench-cards-gallery-curation", "workbench-container-gallery-showcase",
    "workbench-sidebar-theme-polish", "quiet-workspace", "workbench-nested-gallery-interaction-polish", "workbench-sidebar-preview-followup"].map(name => `e2e/${name}.spec.ts`),
  "e2e/workbench-navigation.ts", "playwright.config.ts", "playwright.workbench.config.ts",
  // Phase evidence.
  "tools/verify-workbench-gallery-preview-expansion.mjs", "docs/WORKBENCH_GALLERY_PREVIEW_EXPANSION_CHECKPOINT.md",
])
const tracked = lines(git("ls-tree", "-r", "--name-only", base)).filter(path => !path.startsWith(".loop/"))
const changed = [...new Set([...lines(git("diff", "--name-only", base)), ...lines(git("ls-files", "--others", "--exclude-standard"))])].sort()
for (const path of changed) {
  assert.ok(admittedPaths.has(path), "Outside admitted scope: " + path)
  assert.doesNotMatch(read(path), /[ \t]+$/m, "Trailing whitespace: " + path)
  assert.ok(read(path).endsWith("\n") && !read(path).endsWith("\n\n"), "Exactly one final newline: " + path)
}
assert.equal(git("diff", "--name-only", "--diff-filter=D", base), "", "No file deletions")

// Everything else is byte-frozen: every public component (Sidebar, Switch, Table, Calendar, Message, Bubble ...), the
// Theme v3 schema, mutations, persistence, history, proposals, Design Command, Jev, the preview message boundary,
// retained standalone modules and stories, and every earlier verifier.
const frozen = tracked.filter(path => !admittedPaths.has(path))
for (const path of frozen) assert.equal(hash(readFileSync(path)), hash(at(base, path)), "Frozen file changed: " + path)
const mustBeFrozen = [
  "packages/core/src/theme/schema.ts", "packages/core/src/theme/migrate.ts", "packages/core/src/theme/render.ts", "packages/core/src/mutations/mutation.ts",
  "packages/core/src/mutations/proposal.ts", "packages/core/src/theme/fixtures/default.json", "packages/core/src/theme/fixtures/valid.json", "registry.json",
  "apps/workbench/src/App.tsx", "apps/workbench/src/styles.css", "apps/workbench/src/persistence.ts", "apps/workbench/src/history.ts", "apps/workbench/src/lifecycle.ts",
  "apps/workbench/src/messages.ts", "apps/workbench/src/designCommand.ts", "apps/workbench/src/controls.ts", "apps/workbench/src/workbenchTabs.ts",
  "apps/workbench/src/server/designCommandHandler.ts", "packages/core/src/jev-design/wire.ts",
  ...changedCompositions.map(name => `packages/ui/src/compositions/${name}.stories.tsx`),
  ...readdirSync("packages/ui/src/components").map(name => `packages/ui/src/components/${name}`),
  ...readdirSync("tools").filter(name => name.startsWith("verify-") && name !== "verify-workbench-gallery-preview-expansion.mjs").map(name => `tools/${name}`),
]
for (const path of mustBeFrozen) assert.ok(frozen.includes(path), "Expected frozen: " + path)

// Registry exactly the accepted 23 (unchanged); mutation union exactly 12.
const registry = JSON.parse(read("registry.json"))
assert.equal(registry.items.length, 23)
assert.deepEqual(registry, JSON.parse(at(base, "registry.json").toString()))
assert.deepEqual(readdirSync("public/r").filter(p => p.endsWith(".json") && p !== "registry.json").sort(), registry.items.map(item => item.name + ".json").sort())
const operations = [...read("packages/core/src/mutations/mutation.ts").matchAll(/^\s+\["(set[A-Za-z]+)", new Set\(/gm)].map(match => match[1])
assert.deepEqual(operations, ["setColor", "setRadius", "setDensity", "setFontWeight", "setShadowBlur", "setMotionDuration", "setFontFamily", "setTracking", "setRadiusBase", "setSpacingBase", "setShadowProfile", "setSidebarTokensEnabled"])

// WGPE-11: exactly eleven compositions, once each, in the approved region order, with the one new local pair.
const gallerySource = read("apps/workbench/src/Gallery.tsx")
const gallery = code(gallerySource)
const LEFT = ["plan-usage", "quick-find", "productive-week", "signup-form", "now-playing"]
const RIGHT = ["revenue-overview", "team-chat", "recent-activity", "recent-payments", "offsite-calendar", "local-weather"]
assert.deepEqual([...gallery.matchAll(/\{ id: "([a-z-]+)", render: /g)].map(match => match[1]), [...LEFT, ...RIGHT])
assert.deepEqual([...gallery.matchAll(/<Composition id="([a-z-]+)" \/>/g)].map(match => match[1]), [...LEFT, ...RIGHT])
const region = side => { const start = gallery.indexOf(`<Region side="${side}"`); return [...gallery.slice(start, gallery.indexOf("</Region>", start)).matchAll(/<Composition id="([a-z-]+)" \/>/g)].map(match => match[1]) }
assert.deepEqual(region("left"), LEFT)
assert.deepEqual(region("right"), RIGHT)
assert.deepEqual([...gallery.matchAll(/<LocalGroup className="([^"]+)">\s*<Composition id="([a-z-]+)" \/>\s*<Composition id="([a-z-]+)" \/>\s*<\/LocalGroup>/g)].map(match => match.slice(1)), [
  ["@lg:grid-cols-2", "team-chat", "recent-activity"],
  ["@2xl:grid-cols-[auto_minmax(0,1fr)]", "offsite-calendar", "local-weather"],
])
assert.equal((gallery.match(/<LocalGroup /g) ?? []).length, 2)
assert.equal((gallerySource.match(/from "@personal-ui\/ui\/compositions\//g) ?? []).length, 11)
const helpers = source => { const text = code(source); return text.slice(text.indexOf("function Composition"), text.indexOf("export function Gallery")) }
assert.equal(hash(helpers(gallerySource).replace(/\s+/g, " ")), hash(helpers(at(base, "apps/workbench/src/Gallery.tsx").toString()).replace(/\s+/g, " ")), "Composition/Region/LocalGroup unchanged")
assert.match(gallery, /<div className="grid grid-cols-1 items-start gap-4 @2xl\/gallery:grid-cols-12">/)
for (const text of [gallery, code(read("apps/workbench/src/styles.css"))]) assert.doesNotMatch(text, /masonry|dense|auto-rows|\babsolute\b|gridColumn|gridRow|colSpan/)
const preview = code(read("apps/workbench/src/PreviewFrame.tsx"))
assert.deepEqual([...preview.matchAll(/<TabsTrigger value="([a-z-]+)" className=\{CATEGORY_TRIGGER_CLASS\}>([^<]+)<\/TabsTrigger>/g)].map(match => match[2]), ["Cards", "Design system", "App shells", "States"])
assert.deepEqual([...preview.matchAll(/<TabsContent value="([a-z-]+)" forceMount /g)].map(match => match[1]), ["cards", "design-system", "app-shells", "states"])

// WGPE-03..08 source anchors.
const composition = name => read(`packages/ui/src/compositions/${name}.tsx`)
const chat = composition("team-chat")
assert.match(chat, /placeholder="Type your message\.\.\."/)
assert.match(chat, /aria-label="Send message"/)
assert.match(chat, /onSubmit=\{event => event\.preventDefault\(\)\}/)
assert.doesNotMatch(chat, /Headings sit at 600 now\.|Jonah|footer: "Read"|Delivered|MessageAvatar|CardTitle|CardDescription|useState/)
const table = composition("recent-payments")
assert.match(table, /<Card className="overflow-hidden py-0">/)
assert.match(table, /<CardContent className="px-0">/)
assert.match(table, /type="checkbox" aria-label="Select all payments"/)
assert.match(table, /<TableHead className="w-12 pr-3" \/>/)
assert.doesNotMatch(table, /DOT|rounded-full|components\/checkbox|tanstack/)
const music = composition("now-playing")
assert.doesNotMatch(music, /Now playing|Side [AB]|album|font-mono/)
assert.ok(["Shuffle", "Previous track", "Next track", "Repeat"].every(name => music.includes(`aria-label="${name}"`)))
assert.ok(music.indexOf('aria-label="Shuffle"') < music.indexOf('aria-label="Previous track"') && music.indexOf('aria-label="Previous track"') < music.indexOf('aria-label={playing ? "Pause" : "Play"}') && music.indexOf('aria-label={playing ? "Pause" : "Play"}') < music.indexOf('aria-label="Next track"') && music.indexOf('aria-label="Next track"') < music.indexOf('aria-label="Repeat"'))
assert.doesNotMatch(composition("offsite-calendar"), /Studio offsite|Pick the days away|Starts|Ends|Length|CardHeader/)
assert.match(composition("offsite-calendar"), /mode="range" numberOfMonths=\{1\} fixedWeeks/)
assert.doesNotMatch(composition("local-weather"), /MapPin|Wind|Droplets|Sunset|Humidity|Sample forecast|not live data|HOURS/)
const controls = read("apps/workbench/src/LiveControls.tsx")
assert.doesNotMatch(controls, /Sidebar tokens are active\.|Sidebar tokens are currently not applied\.|sidebar-tokens-status/)
assert.doesNotMatch(controls.slice(controls.indexOf("export function SidebarTokensSwitch")), /aria-describedby|FieldDescription/)

// WGPE-09/10: read-only views on the live CSS and the accepted Sidebar's contained branch.
const designSystem = code(read("apps/workbench/src/DesignSystemPreview.tsx"))
assert.doesNotMatch(designSystem, /<input|<button|<Button|<Input|<Slider|<Switch|onChange|onClick|ThemeOperation|previewVariablesCss|renderShadcnTailwindCss|themeSchema|localStorage|postMessage/)
assert.match(designSystem, /getComputedStyle\(root\)/)
assert.match(designSystem, /document\.getElementById\("workbench-theme"\)/)
const shells = code(read("packages/ui/src/compositions/app-shells.tsx"))
assert.equal((shells.match(/<Sidebar collapsible="none"/g) ?? []).length, 3)
assert.equal((shells.match(/<SidebarProvider /g) ?? []).length, 1)
assert.doesNotMatch(shells, /SidebarTrigger|SidebarRail|SidebarInset|useSidebar|collapsible="(icon|offcanvas)"|\bfixed\b|<table|<form|<input/)

// Token-only colour and no network, credential, geolocation, or audio surface in changed product code.
const rawColour = /#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color-mix)\(|\b(bg|text|border|fill|stroke|ring|from|to|via|accent)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white)\b|\[(#|rgb|hsl|oklch)/
const product = changed.filter(path => /^(packages\/ui|apps\/workbench)\/src\/.*\.tsx?$/.test(path) && !/\.(test|stories)\.tsx?$/.test(path))
// No new raw colour: new files have none, and changed files keep exactly the base's (LiveControls' format hints).
const colours = text => code(text).match(new RegExp(rawColour.source, "g")) ?? []
for (const path of product) assert.deepEqual(colours(read(path)), tracked.includes(path) ? colours(at(base, path).toString()) : [], "raw colour: " + path)
for (const name of [...changedCompositions, "app-shells"]) assert.doesNotMatch(read(`packages/ui/src/compositions/${name}.tsx`), rawColour, "raw colour: " + name)
const surface = /\bfetch\(|XMLHttpRequest|WebSocket|EventSource|navigator\.(sendBeacon|geolocation)|new Audio|<audio|TYPESAFE_|localStorage|sessionStorage/g
for (const path of product) assert.deepEqual(read(path).match(surface) ?? [], tracked.includes(path) ? at(base, path).toString().match(surface) ?? [] : [], path)
const bundleFiles = readdirSync("apps/workbench/dist/assets").filter(name => name.endsWith(".js"))
assert.ok(bundleFiles.length > 0, "build the workbench first")
for (const file of bundleFiles) assert.doesNotMatch(read(`apps/workbench/dist/assets/${file}`), /TYPESAFE_|api\.typesafe\.ai|sk-[A-Za-z0-9]{20}|geolocation\.getCurrentPosition/, file)

console.log(JSON.stringify({ ok: true, phase, base, changed: changed.length, frozen: frozen.length, operations: operations.length, registry: registry.items.length, compositions: LEFT.length + RIGHT.length, previewViews: 4 }))
