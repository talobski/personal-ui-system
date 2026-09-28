// Offline WGCP producer boundary scan (read-only). No credentials, network, browser, or canonical runtime state.
// Run after `pnpm build:workbench` and `pnpm registry:build`: node tools/verify-workbench-gallery-card-polish.mjs
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"

const phase = "workbench-gallery-card-polish-v1-001"
const acceptedProduct = "304486c4aaf0f276287398075c3a7b25d311bca3"
const acceptedControl = "40c20450b619e17dabd40395263904fd7663720f"
const base = "58c694d401f514a005d872fad854e5813c7582b9"
const packetDir = "docs/evidence/workbench-gallery-card-polish/linear"
const contract = "docs/WORKBENCH_GALLERY_CARD_POLISH_CONTRACT.md"
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trimEnd()
const read = path => readFileSync(path, "utf8")
const at = (rev, path) => execFileSync("git", ["show", rev + ":" + path], { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
const lines = value => value.split("\n").filter(Boolean)
const hash = value => createHash("sha256").update(value).digest("hex")
const code = source => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
const count = (text, pattern) => (text.match(pattern) ?? []).length

// WGCP-01: the five verbatim snapshots, index and contract match their pinned hashes and are byte-identical to the
// prepared implementation base; the accepted product and control bases are ancestors of HEAD.
const tickets = ["PUI-103", "PUI-104", "PUI-105", "PUI-106", "PUI-107"]
const manifest = JSON.parse(read(`${packetDir}/snapshot-hashes.json`))
assert.equal(manifest.schemaVersion, "linear-snapshot-hashes/1")
assert.equal(manifest.phase, phase)
assert.equal(manifest.contract.path, contract)
assert.equal(hash(readFileSync(contract)), manifest.contract.sha256, "contract hash")
assert.equal(hash(readFileSync(manifest.index.path)), manifest.index.sha256, "index hash")
assert.deepEqual(Object.keys(manifest.tickets), tickets)
const index = read(manifest.index.path)
assert.ok(index.includes(`Retrieved: ${manifest.retrievedAtUtc}.`), "index retrieval time")
assert.match(index, /all five have zero comments, attachments and documents/)
for (const id of tickets) {
  const entry = manifest.tickets[id]
  assert.equal(entry.path, `${packetDir}/${id}.json`)
  assert.equal(hash(readFileSync(entry.path)), entry.sha256, "snapshot hash: " + id)
  const snapshot = JSON.parse(read(entry.path))
  assert.equal(snapshot.issue.id, id)
  assert.equal(snapshot.retrievedAtUtc, manifest.retrievedAtUtc)
  assert.equal(snapshot.issue.status, "Todo", "status at admission: " + id)
  assert.ok(snapshot.issue.description.length > 1000, "full description: " + id)
  assert.deepEqual([snapshot.comments.comments.length, snapshot.comments.hasNextPage, snapshot.issue.attachments.length, snapshot.issue.documents.length], [0, false, 0, 0], "comments/attachments/documents: " + id)
  assert.deepEqual(snapshot.issue.relations, { blocks: [], blockedBy: [], relatedTo: [], duplicateOf: null }, "relations: " + id)
  const row = index.split("\n").find(line => line.startsWith(`| [${id}](${id}.json)`))
  assert.ok(row && row.includes(`\`${entry.sha256}\``) && row.includes(snapshot.issue.updatedAt), "index row: " + id)
}
// Owner wording the contract reconciles: PUI-106's equal targets carry no 40px mandate.
assert.match(read(contract), /\*\*No owner-required 40px size\*\*/)
assert.doesNotMatch(JSON.parse(read(`${packetDir}/PUI-106.json`)).issue.description, /40 ?px/)
for (const path of [...lines(git("ls-tree", "-r", "--name-only", base, packetDir)), contract, "BRIEF.md", "AGENTS.md"]) {
  assert.equal(hash(readFileSync(path)), hash(at(base, path)), "Frozen admission record changed: " + path)
}
for (const [ancestor, descendant] of [[acceptedProduct, acceptedControl], [acceptedControl, base], [base, "HEAD"]]) git("merge-base", "--is-ancestor", ancestor, descendant)

// WGCP-02: no dependency, manifest, lockfile or canonical runtime-state change.
for (const path of ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "apps/workbench/package.json", "packages/ui/package.json", "packages/core/package.json"]) {
  assert.equal(hash(readFileSync(path)), hash(at(base, path)), "Dependency boundary changed: " + path)
}
// Historical Lead records under .loop/ are never opened here; git alone confirms this phase did not touch them.
assert.equal(git("diff", "--name-only", base, "--", ".loop"), "", "No .loop change")
assert.equal(git("ls-files", "--others", "--exclude-standard", ".loop"), "", "No new .loop file")

// WGCP-02: bounded delivery. Every change since the prepared base is inside the admitted surfaces.
const changedCompositions = ["plan-usage", "quick-find", "recent-activity", "productive-week", "team-chat", "recent-payments", "local-weather", "now-playing", "revenue-overview"]
const unitTests = ["apps/workbench/src/gallery.test.ts", "packages/ui/src/avatar.test.ts"]
const browserSpecs = ["workbench-gallery-card-polish", "workbench-gallery-preview-expansion", "workbench-cards-gallery-curation", "workbench-nested-gallery-interaction-polish",
  "workbench-container-gallery-showcase", "workbench-showcase-components-geometry", "semantic-typography-history-grid", "chart"].map(name => `e2e/${name}.spec.ts`)
const admittedPaths = new Set([
  // PUI-103..107 compositions and the PUI-105 local-pair alignment in the gallery recipe.
  ...changedCompositions.map(name => `packages/ui/src/compositions/${name}.tsx`),
  "apps/workbench/src/Gallery.tsx",
  // Focused unit and browser definitions (browser specs are Lead-executed) and their configs.
  ...unitTests, ...browserSpecs, "playwright.config.ts", "playwright.workbench.config.ts",
  // Phase evidence.
  "tools/verify-workbench-gallery-card-polish.mjs", "docs/WORKBENCH_GALLERY_CARD_POLISH_CHECKPOINT.md",
])
const tracked = lines(git("ls-tree", "-r", "--name-only", base)).filter(path => !path.startsWith(".loop/"))
const changed = [...new Set([...lines(git("diff", "--name-only", base)), ...lines(git("ls-files", "--others", "--exclude-standard"))])].sort()
for (const path of changed) {
  assert.ok(admittedPaths.has(path), "Outside admitted scope: " + path)
  assert.doesNotMatch(read(path), /[ \t]+$/m, "Trailing whitespace: " + path)
  assert.ok(read(path).endsWith("\n") && !read(path).endsWith("\n\n"), "Exactly one final newline: " + path)
}
assert.equal(git("diff", "--name-only", "--diff-filter=D", base), "", "No file deletions")

// Everything else is byte-frozen: every public component (Slider, Button, Card, Input, Table, Calendar, Message ...),
// the Theme v3 schema and fixtures, mutations, persistence, history, proposals, Design Command, Jev, the preview
// message boundary, untouched compositions and every composition story, and every earlier verifier.
const frozen = tracked.filter(path => !admittedPaths.has(path))
for (const path of frozen) assert.equal(hash(readFileSync(path)), hash(at(base, path)), "Frozen file changed: " + path)
const mustBeFrozen = [
  "packages/core/src/theme/schema.ts", "packages/core/src/theme/migrate.ts", "packages/core/src/theme/render.ts", "packages/core/src/mutations/mutation.ts",
  "packages/core/src/mutations/proposal.ts", "packages/core/src/theme/fixtures/default.json", "packages/core/src/theme/fixtures/valid.json",
  "packages/core/src/theme/fixtures/default.css", "packages/core/src/theme/fixtures/quiet-editorial.css", "registry.json",
  "apps/workbench/src/App.tsx", "apps/workbench/src/styles.css", "apps/workbench/src/persistence.ts", "apps/workbench/src/history.ts", "apps/workbench/src/lifecycle.ts",
  "apps/workbench/src/messages.ts", "apps/workbench/src/designCommand.ts", "apps/workbench/src/controls.ts", "apps/workbench/src/workbenchTabs.ts",
  "apps/workbench/src/PreviewFrame.tsx", "apps/workbench/src/DesignSystemPreview.tsx", "apps/workbench/src/LiveControls.tsx",
  "apps/workbench/src/server/designCommandHandler.ts", "packages/core/src/jev-design/wire.ts", "packages/ui/src/compositions/offsite-calendar.tsx",
  ...readdirSync("packages/ui/src/compositions").filter(name => name.endsWith(".stories.tsx")).map(name => `packages/ui/src/compositions/${name}`),
  ...readdirSync("packages/ui/src/components").map(name => `packages/ui/src/components/${name}`),
  ...readdirSync("tools").filter(name => name.startsWith("verify-") && name !== "verify-workbench-gallery-card-polish.mjs").map(name => `tools/${name}`),
]
for (const path of mustBeFrozen) assert.ok(frozen.includes(path), "Expected frozen: " + path)

// No deletion, skip or weakening of test definitions: per changed test file, the number of test cases never drops and
// no skip/only/fixme/todo marker is added. Assertions superseded by this contract are replaced in place.
const cases = /^\s*(?:it|test)\((?!.*\.skip)|^\s*test\.describe\(|^\s{2,}test\(`/gm
// Declaration-style markers (a title string follows); in-body conditional viewport skips are counted separately below.
const markers = /\b(?:it|test|describe)\.(?:skip|only|fixme|todo)\(\s*["'`]|\bdescribe\.(?:skip|only)\(|\bxit\(|\bxdescribe\(/g
for (const path of [...unitTests, ...browserSpecs]) {
  const now = read(path), before = tracked.includes(path) ? at(base, path).toString() : ""
  assert.ok(count(now, /\bit\(|\btest\(/g) >= count(before, /\bit\(|\btest\(/g), "Test cases removed: " + path)
  assert.ok(count(now, cases) >= count(before, cases), "Test cases removed: " + path)
  assert.ok(count(now, markers) <= count(before, markers), "New skip/only marker: " + path)
  assert.ok(count(now, /\bexpect[.(]/g) >= count(before, /\bexpect[.(]/g) - 2, "Assertions dropped: " + path)
}
// Conditional viewport skips are unchanged in number (only the new spec adds its own desktop-only sweep).
for (const path of browserSpecs.filter(path => tracked.includes(path))) assert.equal(count(read(path), /test\.skip\(/g), count(at(base, path).toString(), /test\.skip\(/g), "Viewport skips changed: " + path)
assert.equal(count(read("e2e/workbench-gallery-card-polish.spec.ts"), /test\.skip\(/g), 1)
for (const config of ["playwright.config.ts", "playwright.workbench.config.ts"]) assert.ok(read(config).includes('"workbench-gallery-card-polish.spec.ts"'), "spec registered: " + config)

// Registry exactly the accepted 23 (unchanged); mutation union exactly 12.
const registry = JSON.parse(read("registry.json"))
assert.equal(registry.items.length, 23)
assert.deepEqual(registry, JSON.parse(at(base, "registry.json").toString()))
assert.deepEqual(readdirSync("public/r").filter(p => p.endsWith(".json") && p !== "registry.json").sort(), registry.items.map(item => item.name + ".json").sort())
const operations = [...read("packages/core/src/mutations/mutation.ts").matchAll(/^\s+\["(set[A-Za-z]+)", new Set\(/gm)].map(match => match[1])
assert.deepEqual(operations, ["setColor", "setRadius", "setDensity", "setFontWeight", "setShadowBlur", "setMotionDuration", "setFontFamily", "setTracking", "setRadiusBase", "setSpacingBase", "setShadowProfile", "setSidebarTokensEnabled"])

// Gallery architecture and order are unchanged; only the Calendar / Weather pair is start-aligned (PUI-105).
const gallerySource = read("apps/workbench/src/Gallery.tsx")
const gallery = code(gallerySource)
const LEFT = ["plan-usage", "quick-find", "productive-week", "signup-form", "now-playing"]
const RIGHT = ["revenue-overview", "team-chat", "recent-activity", "recent-payments", "offsite-calendar", "local-weather"]
const baseGallery = code(at(base, "apps/workbench/src/Gallery.tsx").toString())
assert.deepEqual([...gallery.matchAll(/\{ id: "([a-z-]+)", render: [^}]+\}/g)].map(match => match[0]), [...baseGallery.matchAll(/\{ id: "([a-z-]+)", render: [^}]+\}/g)].map(match => match[0]))
assert.deepEqual([...gallery.matchAll(/<Composition id="([a-z-]+)" \/>/g)].map(match => match[1]), [...LEFT, ...RIGHT])
const region = side => { const start = gallery.indexOf(`<Region side="${side}"`); return [...gallery.slice(start, gallery.indexOf("</Region>", start)).matchAll(/<Composition id="([a-z-]+)" \/>/g)].map(match => match[1]) }
assert.deepEqual(region("left"), LEFT)
assert.deepEqual(region("right"), RIGHT)
assert.deepEqual([...gallery.matchAll(/<LocalGroup (natural )?className="([^"]+)">\s*<Composition id="([a-z-]+)" \/>\s*<Composition id="([a-z-]+)" \/>\s*<\/LocalGroup>/g)].map(match => [Boolean(match[1]), ...match.slice(2)]), [
  [false, "@lg:grid-cols-2", "team-chat", "recent-activity"],
  [true, "@2xl:grid-cols-[auto_minmax(0,1fr)]", "offsite-calendar", "local-weather"],
])
assert.equal(count(gallery, /<LocalGroup /g), 2)
assert.equal(count(gallerySource, /from "@personal-ui\/ui\/compositions\//g), 11)
const slice = (text, from, to) => text.slice(text.indexOf(from), text.indexOf(to)).replace(/\s+/g, " ")
for (const [from, to] of [["function Composition", "function Region"], ["function Region", "function LocalGroup"], ["export function Gallery", "<Region side=\"left\""]]) {
  assert.equal(slice(gallery, from, to), slice(baseGallery, from, to), "Unchanged gallery helper: " + from)
}
assert.match(gallery, /function LocalGroup\(\{ className, natural = false, children \}: \{ className: string; natural\?: boolean; children: ReactNode \}\) \{\s*const align = natural \? "items-start" : "items-stretch \[&>\[data-composition\]>\[data-slot=card\]\]:h-full"\s*return <div data-gallery-group=\{natural \? "natural" : "stretch"\} className=\{`grid min-w-0 grid-cols-1 \$\{align\} gap-4 \$\{className\}`\}>\{children\}<\/div>\s*\}/)
assert.match(gallery, /<div className="grid grid-cols-1 items-start gap-4 @2xl\/gallery:grid-cols-12">/)
for (const text of [gallery, code(read("apps/workbench/src/styles.css"))]) assert.doesNotMatch(text, /masonry|dense|auto-rows|\babsolute\b|gridColumn|gridRow|colSpan/)

// WGCP-03..07 source anchors.
const composition = name => read(`packages/ui/src/compositions/${name}.tsx`)
const storage = code(composition("plan-usage"))
assert.doesNotMatch(storage, /CardDescription|Pro plan|renews|toFixed\(1\)\}<\/span>\s*<\/li>|gigabytes\.toFixed/)
assert.match(storage, /<CardHeader className="grid-rows-none">/)
assert.match(storage, /\{used\.toFixed\(1\)\}/)
const find = code(composition("quick-find"))
assert.doesNotMatch(find, /CardHeader|CardTitle|CardDescription|Jump anywhere/)
assert.match(find, /<CardContent className="grid gap-3">\s*<h2 className="sr-only">Quick find<\/h2>\s*<label htmlFor=\{id\} className="sr-only">Search commands<\/label>/)
const activity = code(composition("recent-activity"))
assert.doesNotMatch(activity, /CardDescription|Small steps|<time|time: "/)
assert.match(activity, /<CardHeader className="grid-rows-none">/)
const steps = code(composition("productive-week"))
assert.match(steps, /<XAxis dataKey="day" hide \/>/)
assert.doesNotMatch(steps, /tickFormatter|tickMargin|tickLine/)
const chat = code(composition("team-chat"))
assert.doesNotMatch(chat, /Avatar|CardHeader|border-b|useState/)
assert.match(chat, /placeholder="Type your message\.\.\."/)
assert.match(chat, /<div data-slot="chat-composer" className="flex h-9 min-w-0 items-center gap-2 rounded-md border border-input [^"]*has-\[input:focus-visible\]:ring-\[3px\][^"]*">/)
assert.match(chat, /<Button type="submit" variant="ghost" size="icon-sm" disabled aria-label="Send message" className="shrink-0 text-muted-foreground"><SendHorizontal \/><\/Button>\s*<\/div>\s*<\/form>/)
assert.match(chat, /onSubmit=\{event => event\.preventDefault\(\)\}/)
const table = code(composition("recent-payments"))
assert.match(table, /className="peer size-4 cursor-pointer appearance-none rounded-\[4px\] border border-input [^"]*checked:bg-primary [^"]*indeterminate:bg-primary [^"]*focus-visible:outline-2/)
assert.equal(count(table, /<TableCheckbox /g), 2)
assert.match(table, /<TableCell className="truncate text-right tabular-nums">\{usd\(payment\.amount\)\}<\/TableCell>/)
assert.doesNotMatch(table, /font-mono|accent-primary|components\/checkbox|\babsolute\b/)
const weather = code(composition("local-weather"))
assert.doesNotMatch(weather, /type-heading|font-mono|justify-evenly|flex-1/)
assert.equal(count(weather, /font-semibold/g), 2)
const music = code(composition("now-playing"))
assert.match(music, /const CONTROL = \{ variant: "ghost", size: "icon-lg" \} as const/)
assert.equal(count(music, /<Button \{\.\.\.CONTROL\} /g), 5)
const transport = music.slice(music.indexOf('<div className="grid grid-cols-5'))
assert.doesNotMatch(transport, /rounded-full|fill-current|size-10|h-10|w-10|size-\[/)
assert.doesNotMatch(music, /<svg|<path/)
assert.match(music, /<Slider className="\[&_\[data-slot=slider-thumb\]\]:bg-primary"/)
assert.ok(music.indexOf('aria-label="Shuffle"') < music.indexOf('aria-label="Previous track"') && music.indexOf('aria-label="Previous track"') < music.indexOf('aria-label={playing ? "Pause" : "Play"}') && music.indexOf('aria-label={playing ? "Pause" : "Play"}') < music.indexOf('aria-label="Next track"') && music.indexOf('aria-label="Next track"') < music.indexOf('aria-label="Repeat"'))
// The icon audit: the pinned lucide-react has no solid/filled variants of the six transport icons.
const lucide = readdirSync("node_modules/.pnpm").find(name => name.startsWith("lucide-react@1.47.0"))
assert.ok(lucide, "pinned lucide-react")
const icons = readdirSync(`node_modules/.pnpm/${lucide}/node_modules/lucide-react/dist/esm/icons`)
for (const name of ["shuffle", "skip-back", "skip-forward", "play", "pause", "repeat"]) {
  assert.ok(icons.includes(`${name}.mjs`), "official icon: " + name)
  assert.equal(icons.filter(file => new RegExp(`^${name}-(solid|filled|fill)\\.mjs$`).test(file)).length, 0, "solid variant: " + name)
}
// No universal 40px assertion anywhere in this phase's definitions.
for (const path of ["e2e/workbench-gallery-card-polish.spec.ts", "apps/workbench/src/gallery.test.ts", "e2e/workbench-gallery-preview-expansion.spec.ts"]) assert.doesNotMatch(read(path), /toBeGreaterThanOrEqual\(40\)|\bsize-10\b.*toMatch|toBe\(40\)/, path)
const revenue = code(composition("revenue-overview"))
assert.match(revenue, /<Card className="gap-0 overflow-hidden py-0">\s*<CardContent className="@container grid gap-5 pt-6 pb-5">/)
assert.match(revenue, /<\/dl>\s*<\/CardContent>\s*<figure data-testid="revenue-chart" className="grid">/)
assert.match(revenue, /margin=\{\{ top: 8, right: 0, bottom: 0, left: 0 \}\}/)
assert.match(revenue, /<XAxis dataKey="period" hide \/>/)
assert.doesNotMatch(revenue, /\s-m[xytrbl]?-\d/)
const baseRevenue = at(base, "packages/ui/src/compositions/revenue-overview.tsx").toString()
for (const anchor of ["const SERIES", "const config"]) assert.equal(slice(revenue, anchor, anchor === "const SERIES" ? "const config" : "const money"), slice(code(baseRevenue), anchor, anchor === "const SERIES" ? "const config" : "const money"), "Unchanged revenue data: " + anchor)

// Token-only colour and no network, credential, geolocation, or audio surface in changed product code.
const rawColour = /#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color-mix)\(|\b(bg|text|border|fill|stroke|ring|from|to|via|accent|outline)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white)\b|\[(#|rgb|hsl|oklch)/
const product = changed.filter(path => /^(packages\/ui|apps\/workbench)\/src\/.*\.tsx?$/.test(path) && !/\.(test|stories)\.tsx?$/.test(path))
for (const path of product) assert.doesNotMatch(code(read(path)), rawColour, "raw colour: " + path)
const surface = /\bfetch\(|XMLHttpRequest|WebSocket|EventSource|navigator\.(sendBeacon|geolocation)|new Audio|<audio|TYPESAFE_|localStorage|sessionStorage/g
for (const path of product) assert.deepEqual(read(path).match(surface) ?? [], tracked.includes(path) ? at(base, path).toString().match(surface) ?? [] : [], path)
const bundleFiles = readdirSync("apps/workbench/dist/assets")
const scripts = bundleFiles.filter(name => name.endsWith(".js"))
assert.ok(scripts.length > 0, "build the workbench first")
for (const file of scripts) assert.doesNotMatch(read(`apps/workbench/dist/assets/${file}`), /TYPESAFE_|api\.typesafe\.ai|sk-[A-Za-z0-9]{20}|geolocation\.getCurrentPosition/, file)
// The built bundle carries this candidate's compositions and the new utilities.
const bundle = scripts.map(file => read(`apps/workbench/dist/assets/${file}`)).join("\n")
for (const text of ["chat-composer", "Type your message...", "grid-rows-none", "[&_[data-slot=slider-thumb]]:bg-primary", "gap-0 overflow-hidden py-0"]) assert.ok(bundle.includes(text), "bundle: " + text)
for (const text of ["Pro plan · renews October 31", "Jump anywhere without leaving the keyboard.", "Small steps, steady progress."]) assert.ok(!bundle.includes(text), "stale bundle: " + text)
const styles = bundleFiles.filter(name => name.endsWith(".css")).map(file => read(`apps/workbench/dist/assets/${file}`)).join("\n")
for (const rule of [/\.\\\[\\&_\\\[data-slot\\=slider-thumb\\\]\\\]\\:bg-primary \[data-slot=slider-thumb\]\{background-color:var\(--primary\)\}/, /\.grid-rows-none\{grid-template-rows:none\}/, /\.indeterminate\\:bg-primary:indeterminate\{/]) assert.match(styles, rule)

console.log(JSON.stringify({ ok: true, phase, base, changed: changed.length, frozen: frozen.length, operations: operations.length, registry: registry.items.length, compositions: LEFT.length + RIGHT.length, naturalPairs: 1 }))
