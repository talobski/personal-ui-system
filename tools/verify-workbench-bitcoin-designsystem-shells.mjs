// Offline WBDS producer boundary scan (read-only). No credentials, network, browser, or canonical runtime state.
// Run after `pnpm build:workbench` and `pnpm registry:build`: node tools/verify-workbench-bitcoin-designsystem-shells.mjs
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"

const phase = "workbench-bitcoin-designsystem-shells-v1-001"
const acceptedProduct = "c4393ebbebe587ae18216f524b56b16ad1f9df35"
const acceptedControl = "d8867047ea9f6a837ae729deca1deb5d60496eff"
const base = "364464d252a462b4f093d5a60a45fcd55811735c"
const evidenceDir = "docs/evidence/workbench-bitcoin-designsystem-shells"
const packetDir = `${evidenceDir}/linear`
const contract = "docs/WORKBENCH_BITCOIN_DESIGNSYSTEM_SHELLS_CONTRACT.md"
const reference = `${evidenceDir}/btc-reference-data.md`
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trimEnd()
const read = path => readFileSync(path, "utf8")
const at = (rev, path) => execFileSync("git", ["show", rev + ":" + path], { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
const lines = value => value.split("\n").filter(Boolean)
const hash = value => createHash("sha256").update(value).digest("hex")
const code = source => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
const count = (text, pattern) => (text.match(pattern) ?? []).length

// WBDS-01: the three verbatim snapshots, index, contract and BTC reference match their pinned hashes and are
// byte-identical to the prepared implementation base; the accepted product and control bases are ancestors of HEAD.
const tickets = ["PUI-108", "PUI-109", "PUI-110"]
const manifest = JSON.parse(read(`${packetDir}/snapshot-hashes.json`))
assert.equal(manifest.schemaVersion, "linear-snapshot-hashes/1")
assert.equal(manifest.phase, phase)
assert.equal(manifest.contract.path, contract)
assert.equal(hash(readFileSync(contract)), manifest.contract.sha256, "contract hash")
assert.equal(hash(readFileSync(manifest.index.path)), manifest.index.sha256, "index hash")
assert.equal(manifest.historicalData.path, reference)
assert.equal(hash(readFileSync(reference)), manifest.historicalData.sha256, "BTC reference hash")
assert.deepEqual(Object.keys(manifest.tickets), tickets)
assert.ok(read(manifest.index.path).includes(`Retrieved and sealed: ${manifest.retrievedAtUtc}.`), "index retrieval time")
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
}
for (const path of [...lines(git("ls-tree", "-r", "--name-only", base, evidenceDir)), contract, "BRIEF.md", "AGENTS.md"]) {
  assert.equal(hash(readFileSync(path)), hash(at(base, path)), "Frozen admission record changed: " + path)
}
for (const [ancestor, descendant] of [[acceptedProduct, acceptedControl], [acceptedControl, base], [base, "HEAD"]]) git("merge-base", "--is-ancestor", ancestor, descendant)

// WBDS-02: no dependency, manifest, lockfile or canonical runtime-state change.
for (const path of ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "apps/workbench/package.json", "packages/ui/package.json", "packages/core/package.json"]) {
  assert.equal(hash(readFileSync(path)), hash(at(base, path)), "Dependency boundary changed: " + path)
}
// Historical Lead records under .loop/ are never opened here; git alone confirms this phase did not touch them.
assert.equal(git("diff", "--name-only", base, "--", ".loop"), "", "No .loop change")
assert.equal(git("ls-files", "--others", "--exclude-standard", ".loop"), "", "No new .loop file")

// WBDS-02: bounded delivery. Every change since the prepared base is inside the admitted surfaces.
const unitTests = ["apps/workbench/src/gallery.test.ts", "apps/workbench/src/previewViews.test.ts", "packages/ui/src/avatar.test.ts", "packages/ui/src/quiet-workspace.test.ts"]
const browserSpecs = ["workbench-bitcoin-designsystem-shells", "workbench-gallery-preview-expansion", "workbench-cards-gallery-curation", "workbench-nested-gallery-interaction-polish",
  "workbench-container-gallery-showcase", "workbench-showcase-components-geometry", "quiet-workspace", "chart"].map(name => `e2e/${name}.spec.ts`)
const admittedPaths = new Set([
  // PUI-108 new gallery-only composition and its thin story; PUI-109 view; PUI-110 composition; the gallery recipe.
  "packages/ui/src/compositions/bitcoin-price.tsx", "packages/ui/src/compositions/bitcoin-price.stories.tsx",
  "packages/ui/src/compositions/app-shells.tsx", "apps/workbench/src/DesignSystemPreview.tsx", "apps/workbench/src/Gallery.tsx",
  // Focused unit and browser definitions (browser specs are Lead-executed) and their configs.
  ...unitTests, ...browserSpecs, "playwright.config.ts", "playwright.workbench.config.ts",
  // Phase evidence.
  "tools/verify-workbench-bitcoin-designsystem-shells.mjs", "docs/WORKBENCH_BITCOIN_DESIGNSYSTEM_SHELLS_CHECKPOINT.md",
])
const tracked = lines(git("ls-tree", "-r", "--name-only", base)).filter(path => !path.startsWith(".loop/"))
const changed = [...new Set([...lines(git("diff", "--name-only", base)), ...lines(git("ls-files", "--others", "--exclude-standard"))])].sort()
for (const path of changed) {
  assert.ok(admittedPaths.has(path), "Outside admitted scope: " + path)
  assert.doesNotMatch(read(path), /[ \t]+$/m, "Trailing whitespace: " + path)
  assert.ok(read(path).endsWith("\n") && !read(path).endsWith("\n\n"), "Exactly one final newline: " + path)
}
assert.equal(git("diff", "--name-only", "--diff-filter=D", base), "", "No file deletions")

// Everything else is byte-frozen: every public component (Sidebar, Select, Avatar, Chart ...), the Theme v3 schema and
// fixtures, mutations, persistence, history, proposals, Design Command, Jev, the preview message boundary, the editor's
// colour groups, untouched compositions and stories, and every earlier verifier.
const frozen = tracked.filter(path => !admittedPaths.has(path))
for (const path of frozen) assert.equal(hash(readFileSync(path)), hash(at(base, path)), "Frozen file changed: " + path)
const mustBeFrozen = [
  "packages/core/src/theme/schema.ts", "packages/core/src/theme/migrate.ts", "packages/core/src/theme/render.ts", "packages/core/src/mutations/mutation.ts",
  "packages/core/src/mutations/proposal.ts", "packages/core/src/theme/fixtures/default.json", "packages/core/src/theme/fixtures/valid.json",
  "packages/core/src/theme/fixtures/default.css", "packages/core/src/theme/fixtures/quiet-editorial.css", "registry.json",
  "apps/workbench/src/App.tsx", "apps/workbench/src/styles.css", "apps/workbench/src/persistence.ts", "apps/workbench/src/history.ts", "apps/workbench/src/lifecycle.ts",
  "apps/workbench/src/messages.ts", "apps/workbench/src/designCommand.ts", "apps/workbench/src/controls.ts", "apps/workbench/src/workbenchTabs.ts",
  "apps/workbench/src/PreviewFrame.tsx", "apps/workbench/src/LiveControls.tsx", "apps/workbench/src/server/designCommandHandler.ts", "packages/core/src/jev-design/wire.ts",
  "packages/ui/src/compositions/revenue-overview.tsx", "packages/ui/src/compositions/app-shells.stories.tsx",
  ...readdirSync("packages/ui/src/components").map(name => `packages/ui/src/components/${name}`),
  ...readdirSync("tools").filter(name => name.startsWith("verify-") && name !== "verify-workbench-bitcoin-designsystem-shells.mjs").map(name => `tools/${name}`),
]
for (const path of mustBeFrozen) assert.ok(frozen.includes(path), "Expected frozen: " + path)

// No deletion, skip or weakening of test definitions: per changed test file, the number of test cases never drops and
// no skip/only/fixme/todo marker is added. Assertions superseded by this contract are replaced in place.
const cases = /^\s*(?:it|test)\((?!.*\.skip)|^\s*test\.describe\(|^\s{2,}test\(`/gm
const markers = /\b(?:it|test|describe)\.(?:skip|only|fixme|todo)\(\s*["'`]|\bdescribe\.(?:skip|only)\(|\bxit\(|\bxdescribe\(/g
for (const path of [...unitTests, ...browserSpecs]) {
  const now = read(path), before = tracked.includes(path) ? at(base, path).toString() : ""
  assert.ok(count(now, /\bit\(|\btest\(/g) >= count(before, /\bit\(|\btest\(/g), "Test cases removed: " + path)
  assert.ok(count(now, cases) >= count(before, cases), "Test cases removed: " + path)
  assert.ok(count(now, markers) <= count(before, markers), "New skip/only marker: " + path)
  assert.ok(count(now, /\bexpect[.(]/g) >= count(before, /\bexpect[.(]/g) - 2, "Assertions dropped: " + path)
}
for (const path of browserSpecs.filter(path => tracked.includes(path))) assert.equal(count(read(path), /test\.skip\(/g), count(at(base, path).toString(), /test\.skip\(/g), "Viewport skips changed: " + path)
assert.equal(count(read("e2e/workbench-bitcoin-designsystem-shells.spec.ts"), /test\.skip\(/g), 3)
assert.ok(read("playwright.workbench.config.ts").includes('"workbench-bitcoin-designsystem-shells.spec.ts"'), "spec registered in the Workbench config")
assert.ok(read("playwright.config.ts").includes('    "workbench-bitcoin-designsystem-shells.spec.ts",\n  ],'), "spec ignored by the Storybook config")

// Registry exactly the accepted 23 (unchanged); mutation union exactly 12.
const registry = JSON.parse(read("registry.json"))
assert.equal(registry.items.length, 23)
assert.deepEqual(registry, JSON.parse(at(base, "registry.json").toString()))
assert.deepEqual(readdirSync("public/r").filter(p => p.endsWith(".json") && p !== "registry.json").sort(), registry.items.map(item => item.name + ".json").sort())
assert.ok(!registry.items.some(item => /bitcoin|app-shell/.test(item.name)), "no new public resource")
const operations = [...read("packages/core/src/mutations/mutation.ts").matchAll(/^\s+\["(set[A-Za-z]+)", new Set\(/gm)].map(match => match[1])
assert.deepEqual(operations, ["setColor", "setRadius", "setDensity", "setFontWeight", "setShadowBlur", "setMotionDuration", "setFontFamily", "setTracking", "setRadiusBase", "setSpacingBase", "setShadowProfile", "setSidebarTokensEnabled"])

// WBDS-03: Bitcoin is the only gallery change, directly after Studio revenue as a direct child of the right region.
const gallerySource = read("apps/workbench/src/Gallery.tsx")
const gallery = code(gallerySource)
const baseGallery = code(at(base, "apps/workbench/src/Gallery.tsx").toString())
const LEFT = ["plan-usage", "quick-find", "productive-week", "signup-form", "now-playing"]
const RIGHT = ["revenue-overview", "bitcoin-price", "team-chat", "recent-activity", "recent-payments", "offsite-calendar", "local-weather"]
assert.deepEqual([...gallery.matchAll(/<Composition id="([a-z-]+)" \/>/g)].map(match => match[1]), [...LEFT, ...RIGHT])
assert.equal(gallery.replace('\n          <Composition id="bitcoin-price" />', "").replace('\n  { id: "bitcoin-price", render: () => <BitcoinPrice /> },', "").replace('import { BitcoinPrice } from "@personal-ui/ui/compositions/bitcoin-price"\n', ""), baseGallery, "Gallery changes beyond the Bitcoin insertion")
assert.match(gallery, /<Region side="right" [^>]+>\s*<Composition id="revenue-overview" \/>\s*<Composition id="bitcoin-price" \/>\s*<LocalGroup className="@lg:grid-cols-2">/)
assert.equal(count(gallerySource, /from "@personal-ui\/ui\/compositions\//g), 12)
const bitcoinSource = read("packages/ui/src/compositions/bitcoin-price.tsx")
const bitcoin = code(bitcoinSource)
assert.match(bitcoin, /import \{ Line, LineChart, XAxis, YAxis \} from "recharts"/)
assert.match(bitcoin, /from "\.\.\/components\/chart"/)
assert.equal(count(bitcoin, /<Line /g), 1)
assert.match(bitcoin, /<XAxis dataKey="day" hide \/>/)
assert.match(bitcoin, /<YAxis hide domain=/)
assert.doesNotMatch(bitcoin, /CartesianGrid|Legend|<Area|<Bar|Button|useState|useEffect|Tabs|ToggleGroup|fetch\(|XMLHttpRequest|WebSocket|EventSource|import\(|setInterval|setTimeout|https?:\/\//)
assert.match(bitcoin, /color: "var\(--chart-1\)"/)
assert.match(bitcoin, /<h2 className="truncate text-sm font-medium">Bitcoin <span className="text-muted-foreground">BTC<\/span><\/h2>/)
assert.match(bitcoin, /data-testid="btc-range">1Y</)
assert.match(bitcoin, /<figcaption className="sr-only">/)
assert.match(bitcoinSource, /FRED series CBBTCUSD \(https:\/\/fred\.stlouisfed\.org\/series\/CBBTCUSD\), retrieved 2026-09-28 UTC/)
assert.match(bitcoinSource, /not a month-end close or monthly average/)
assert.doesNotMatch(bitcoin, /type-heading|font-mono/)

// WBDS-04: the committed points equal the frozen table exactly, and the displayed change is the recorded -8.52%.
const frozenPoints = [...read(reference).matchAll(/^\| (\d{4}-\d{2}-\d{2}) \| (\d+\.\d{2}) \|$/gm)].map(match => [match[1], match[2]])
assert.equal(frozenPoints.length, 13)
const committedPoints = [...bitcoinSource.matchAll(/\{ date: "(\d{4}-\d{2}-\d{2})", price: (\d+\.\d{2}) \}/g)].map(match => [match[1], match[2]])
assert.deepEqual(committedPoints, frozenPoints)
const change = ((Number(frozenPoints[12][1]) - Number(frozenPoints[0][1])) / Number(frozenPoints[0][1])) * 100
assert.equal(change.toFixed(2), "-8.52")
assert.match(read(reference), /the one-year change is -8\.52%/)
assert.match(bitcoin, /Math\.round\(\(\(last\.price - first\.price\) \/ first\.price\) \* 10000\) \/ 100/)

// WBDS-05/06: the Design system view reuses the sidebar's COLOR_GROUPS (no second order or state), is flat, uses Body
// values and renders the nine descending Type scale rows.
const design = code(read("apps/workbench/src/DesignSystemPreview.tsx"))
assert.match(design, /import \{ COLOR_GROUPS \} from "\.\/controls"/)
assert.match(design, /export const DESIGN_SYSTEM_COLOR_GROUPS = COLOR_GROUPS/)
assert.match(design, /export const TYPE_SCALE = \["text-5xl", "text-4xl", "text-3xl", "text-2xl", "text-xl", "text-lg", "text-base", "text-sm", "text-xs"\] as const/)
assert.match(design, /export const TYPE_SCALE_SAMPLE = "The quick brown fox jumps over the lazy dog\."/)
assert.match(design, /<h2 id=\{id\} className="type-heading text-lg">\{title\}<\/h2>/)
assert.match(design, /<Sheet name="type-scale" title="Type scale">/)
assert.match(design, /className="size-12 rounded-md border"/)
assert.doesNotMatch(design, /<Card|components\/card|font-mono|data-role|Typography|useState<Theme|ThemeOperation|postMessage|localStorage|<input|<button|onChange|onClick/)
assert.match(design, /grid-cols-1 gap-4 @3xl:grid-cols-\[minmax\(0,5fr\)_minmax\(0,7fr\)\]/)
assert.match(design, /getComputedStyle\(root\)/)

// WBDS-07: one Shell on the accepted non-collapsible Sidebar with a Select switcher, stacked vertically.
const shells = code(read("packages/ui/src/compositions/app-shells.tsx"))
for (const module of ["../components/sidebar", "../components/select", "../components/avatar"]) assert.ok(shells.includes(`from "${module}"`), module)
assert.equal(count(shells, /<Sidebar collapsible="none"/g), 1)
assert.equal(count(shells, /function Shell\(/g), 1)
assert.equal(count(shells, /<Shell title="/g), 3)
assert.deepEqual([...shells.matchAll(/<Shell title="([^"]+)" variant="([a-z]+)"/g)].map(match => [match[1], match[2]]), [["Classic workspace", "classic"], ["Inset project", "inset"], ["Compact utility", "compact"]])
assert.equal(count(shells, /<SidebarProvider /g), 1)
assert.match(shells, /<SelectTrigger aria-label=\{`\$\{shell\} workspace`\}/)
assert.match(shells, /<div className="grid min-w-0 gap-8">/)
assert.doesNotMatch(shells, /grid-cols-2|col-span|SidebarTrigger|SidebarRail|<SidebarInset|useSidebar|collapsible="(icon|offcanvas)"|<table|<Table|<Chart|recharts|<form|<Input|<textarea/)
assert.match(shells, /@3xl:w-\[72%\]/)

// Token-only colour and no network, credential or storage surface in changed product code.
const rawColour = /#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color-mix)\(|\b(bg|text|border|fill|stroke|ring|from|to|via|accent|outline)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white)\b|\[(#|rgb|hsl|oklch)/
const product = changed.filter(path => /^(packages\/ui|apps\/workbench)\/src\/.*\.tsx?$/.test(path) && !/\.(test|stories)\.tsx?$/.test(path))
for (const path of product) assert.doesNotMatch(code(read(path)), rawColour, "raw colour: " + path)
const surface = /\bfetch\(|XMLHttpRequest|WebSocket|EventSource|navigator\.(sendBeacon|geolocation)|TYPESAFE_|localStorage|sessionStorage/g
for (const path of product) assert.deepEqual(read(path).match(surface) ?? [], tracked.includes(path) ? at(base, path).toString().match(surface) ?? [] : [], path)
const bundleFiles = readdirSync("apps/workbench/dist/assets")
const scripts = bundleFiles.filter(name => name.endsWith(".js"))
assert.ok(scripts.length > 0, "build the workbench first")
const bundle = scripts.map(file => read(`apps/workbench/dist/assets/${file}`)).join("\n")
for (const file of scripts) assert.doesNotMatch(read(`apps/workbench/dist/assets/${file}`), /TYPESAFE_|api\.typesafe\.ai|sk-[A-Za-z0-9]{20}|fred\.stlouisfed\.org|api\.coinbase|coingecko/, file)
// The built bundle carries this candidate's surfaces.
for (const text of ["bitcoin-price", "Historical first-of-month BTC/USD", "Type scale", "The quick brown fox jumps over the lazy dog.", "Classic workspace", "maya@northwind.example"]) assert.ok(bundle.includes(text), "bundle: " + text)
for (const text of ["Calm, clear titles", "Sidebar · base aliases\""]) assert.ok(!bundle.includes(text), "stale bundle: " + text)
const styles = bundleFiles.filter(name => name.endsWith(".css")).map(file => read(`apps/workbench/dist/assets/${file}`)).join("\n")
for (const utility of ["text-5xl", "size-12", "h-108"]) assert.ok(styles.includes(`.${utility}{`), "css utility: " + utility)

console.log(JSON.stringify({ ok: true, phase, base, changed: changed.length, frozen: frozen.length, operations: operations.length, registry: registry.items.length, compositions: LEFT.length + RIGHT.length, btcPoints: committedPoints.length, btcChange: change.toFixed(2) }))
