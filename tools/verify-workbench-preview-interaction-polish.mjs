// Offline WPIP producer boundary scan (read-only). No credentials, network, browser, or canonical runtime state.
// Run after `pnpm build:workbench` and `pnpm registry:build`: node tools/verify-workbench-preview-interaction-polish.mjs
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"

const phase = "workbench-preview-interaction-polish-v1-001"
const acceptedProduct = "256c1c7490843c09294753271abc7e39024857bd"
const acceptedControl = "33f8992157aaa67ef857efe912f9adcedd72a66f"
const base = "e9079cc9d39dca68d3cb017f51cc0c93ca490649"
const packetDir = "docs/evidence/workbench-preview-interaction-polish/linear"
const contract = "docs/WORKBENCH_PREVIEW_INTERACTION_POLISH_CONTRACT.md"
const btcReference = "docs/evidence/workbench-bitcoin-designsystem-shells/btc-reference-data.md"
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trimEnd()
const read = path => readFileSync(path, "utf8")
const at = (rev, path) => execFileSync("git", ["show", rev + ":" + path], { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
const lines = value => value.split("\n").filter(Boolean)
const hash = value => createHash("sha256").update(value).digest("hex")
const code = source => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
const count = (text, pattern) => (text.match(pattern) ?? []).length

// WPIP-01: the six frozen snapshots and the contract match their pinned hashes and are byte-identical to the prepared
// base; no excluded ticket entered the packet; the accepted product and control bases are ancestors of HEAD.
const tickets = ["PUI-111", "PUI-112", "PUI-114", "PUI-115", "PUI-116", "PUI-117"]
const manifest = JSON.parse(read(`${packetDir}/snapshot-hashes.json`))
assert.equal(manifest.schemaVersion, "linear-frozen-packet-hashes/1")
assert.equal(manifest.phase, phase)
assert.equal(manifest.acceptedProductBase, acceptedProduct)
assert.equal(manifest.acceptedControlBase, acceptedControl)
assert.equal(manifest.authoritativeContract.path, contract)
assert.equal(hash(readFileSync(contract)), manifest.authoritativeContract.sha256, "contract hash")
assert.deepEqual(manifest.tickets.map(entry => entry.path), tickets.map(id => `${packetDir}/${id}.json`))
assert.deepEqual(readdirSync(packetDir).sort(), [...tickets.map(id => `${id}.json`), "snapshot-hashes.json"].sort(), "no excluded ticket in the packet")
for (const entry of manifest.tickets) {
  assert.equal(hash(readFileSync(entry.path)), entry.sha256, "snapshot hash: " + entry.path)
  const snapshot = JSON.parse(read(entry.path))
  assert.equal(snapshot.retrievedAtUtc, manifest.retrievedAtUtc)
  assert.ok(snapshot.issue.description.length > 1000, "full description: " + entry.path)
}
for (const path of [...lines(git("ls-tree", "-r", "--name-only", base, "docs/evidence/workbench-preview-interaction-polish")), contract, btcReference, "BRIEF.md", "AGENTS.md"]) {
  assert.equal(hash(readFileSync(path)), hash(at(base, path)), "Frozen admission record changed: " + path)
}
for (const [ancestor, descendant] of [[acceptedProduct, acceptedControl], [acceptedControl, base], [base, "HEAD"]]) git("merge-base", "--is-ancestor", ancestor, descendant)

// WPIP-02: no dependency, manifest, lockfile or canonical runtime-state change.
for (const path of ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "apps/workbench/package.json", "packages/ui/package.json", "packages/core/package.json"]) {
  assert.equal(hash(readFileSync(path)), hash(at(base, path)), "Dependency boundary changed: " + path)
}
// Historical Lead records under .loop/ are never opened here; git alone confirms this phase did not touch them.
assert.equal(git("diff", "--name-only", base, "--", ".loop"), "", "No .loop change")
assert.equal(git("ls-files", "--others", "--exclude-standard", ".loop"), "", "No new .loop file")

// WPIP-02: bounded delivery. Every change since the prepared base is inside the admitted surfaces.
const unitTests = ["apps/workbench/src/gallery.test.ts", "apps/workbench/src/previewViews.test.ts", "apps/workbench/src/resetToast.test.ts", "packages/ui/src/avatar.test.ts"]
const browserSpecs = ["workbench-preview-interaction-polish", "composition-preview-interaction-polish", "workbench-bitcoin-designsystem-shells", "workbench-gallery-preview-expansion",
  "workbench-gallery-card-polish", "workbench-cards-gallery-curation", "workbench-nested-gallery-interaction-polish", "workbench-container-gallery-showcase",
  "workbench-showcase-components-geometry", "semantic-typography-history-grid", "quiet-workspace", "chart"].map(name => `e2e/${name}.spec.ts`)
const admittedPaths = new Set([
  // PUI-111/112/116/117 compositions; PUI-114 view; PUI-117 gallery order; PUI-115 toast in the Workbench.
  "packages/ui/src/compositions/team-chat.tsx", "packages/ui/src/compositions/local-weather.tsx", "packages/ui/src/compositions/app-shells.tsx",
  "packages/ui/src/compositions/bitcoin-price.tsx", "apps/workbench/src/DesignSystemPreview.tsx", "apps/workbench/src/Gallery.tsx", "apps/workbench/src/App.tsx",
  // Re-export-only bridge to the installed Base UI Toast primitive (the Workbench cannot resolve @base-ui/react itself
  // without a dependency change); recorded for Lead reconciliation in the checkpoint.
  "packages/ui/src/lib/toast.ts",
  // Focused unit and browser definitions (browser specs are Lead-executed) and their configs.
  ...unitTests, ...browserSpecs, "playwright.config.ts", "playwright.workbench.config.ts",
  // Phase evidence.
  "tools/verify-workbench-preview-interaction-polish.mjs", "docs/WORKBENCH_PREVIEW_INTERACTION_POLISH_CHECKPOINT.md",
])
const tracked = lines(git("ls-tree", "-r", "--name-only", base)).filter(path => !path.startsWith(".loop/"))
const changed = [...new Set([...lines(git("diff", "--name-only", base)), ...lines(git("ls-files", "--others", "--exclude-standard"))])].sort()
for (const path of changed) {
  assert.ok(admittedPaths.has(path), "Outside admitted scope: " + path)
  assert.doesNotMatch(read(path), /[ \t]+$/m, "Trailing whitespace: " + path)
  assert.ok(read(path).endsWith("\n") && !read(path).endsWith("\n\n"), "Exactly one final newline: " + path)
}
assert.equal(git("diff", "--name-only", "--diff-filter=D", base), "", "No file deletions")

// Everything else is byte-frozen: every public component (the Sidebar included, so its API and internals are unchanged),
// the Theme v3 schema and fixtures, mutations, persistence, history, proposals, Design Command, Jev, the preview message
// boundary, the editor's colour groups, untouched compositions and stories, and every earlier verifier.
const frozen = tracked.filter(path => !admittedPaths.has(path))
for (const path of frozen) assert.equal(hash(readFileSync(path)), hash(at(base, path)), "Frozen file changed: " + path)
const mustBeFrozen = [
  "packages/core/src/theme/schema.ts", "packages/core/src/theme/migrate.ts", "packages/core/src/theme/render.ts", "packages/core/src/mutations/mutation.ts",
  "packages/core/src/mutations/proposal.ts", "packages/core/src/theme/fixtures/default.json", "packages/core/src/theme/fixtures/valid.json",
  "packages/core/src/theme/fixtures/default.css", "packages/core/src/theme/fixtures/quiet-editorial.css", "registry.json",
  "apps/workbench/src/styles.css", "apps/workbench/src/persistence.ts", "apps/workbench/src/history.ts", "apps/workbench/src/lifecycle.ts",
  "apps/workbench/src/messages.ts", "apps/workbench/src/designCommand.ts", "apps/workbench/src/controls.ts", "apps/workbench/src/workbenchTabs.ts",
  "apps/workbench/src/PreviewFrame.tsx", "apps/workbench/src/LiveControls.tsx", "apps/workbench/src/server/designCommandHandler.ts", "packages/core/src/jev-design/wire.ts",
  "packages/ui/src/lib/workbench-icons.ts", "packages/ui/src/compositions/revenue-overview.tsx",
  ...readdirSync("packages/ui/src/compositions").filter(name => name.endsWith(".stories.tsx")).map(name => `packages/ui/src/compositions/${name}`),
  ...readdirSync("packages/ui/src/components").map(name => `packages/ui/src/components/${name}`),
  ...readdirSync("tools").filter(name => name.startsWith("verify-") && name !== "verify-workbench-preview-interaction-polish.mjs").map(name => `tools/${name}`),
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
  assert.ok(count(now, /\bexpect[.(]/g) >= count(before, /\bexpect[.(]/g), "Assertions dropped: " + path)
}
for (const path of browserSpecs.filter(path => tracked.includes(path))) assert.equal(count(read(path), /test\.skip\(/g), count(at(base, path).toString(), /test\.skip\(/g), "Viewport skips changed: " + path)
assert.equal(count(read("e2e/workbench-preview-interaction-polish.spec.ts"), /test\.skip\(/g), 3)
assert.equal(count(read("e2e/composition-preview-interaction-polish.spec.ts"), /test\.skip\(/g), 0)
assert.ok(read("playwright.workbench.config.ts").includes('"workbench-bitcoin-designsystem-shells.spec.ts", "workbench-preview-interaction-polish.spec.ts"]'), "spec registered in the Workbench config")
assert.ok(read("playwright.config.ts").includes('    "workbench-preview-interaction-polish.spec.ts",\n  ],'), "Workbench spec ignored by the Storybook config")
assert.ok(!read("playwright.workbench.config.ts").includes("composition-preview-interaction-polish"), "Storybook spec stays in the Storybook config")

// Registry exactly the accepted 23 (unchanged); mutation union exactly 12.
const registry = JSON.parse(read("registry.json"))
assert.equal(registry.items.length, 23)
assert.deepEqual(registry, JSON.parse(at(base, "registry.json").toString()))
assert.deepEqual(readdirSync("public/r").filter(p => p.endsWith(".json") && p !== "registry.json").sort(), registry.items.map(item => item.name + ".json").sort())
assert.ok(!registry.items.some(item => /toast|sonner|bitcoin|app-shell/.test(item.name)), "no new public resource")
const operations = [...read("packages/core/src/mutations/mutation.ts").matchAll(/^\s+\["(set[A-Za-z]+)", new Set\(/gm)].map(match => match[1])
assert.deepEqual(operations, ["setColor", "setRadius", "setDensity", "setFontWeight", "setShadowBlur", "setMotionDuration", "setFontFamily", "setTracking", "setRadiusBase", "setSpacingBase", "setShadowProfile", "setSidebarTokensEnabled"])

// WPIP-03: Chat avatars on the accepted Message/Avatar parts, expanding thread, enabled filled no-op send.
const chat = code(read("packages/ui/src/compositions/team-chat.tsx"))
for (const module of ["../components/message", "../components/avatar", "../components/bubble", "../components/button"]) assert.ok(chat.includes(`from "${module}"`), module)
assert.match(chat, /<MessageAvatar>\s*<Avatar aria-hidden="true" className="size-6"><AvatarFallback className="text-xs font-medium">\{avatarInitial\(run\.sender\)\}<\/AvatarFallback><\/Avatar>/)
assert.match(chat, /<CardContent className="flex-1">/)
assert.match(chat, /placeholder="Type your message\.\.\."/)
assert.match(chat, /<Button type="submit" size="icon-sm" aria-label="Send message" className="size-7 shrink-0 cursor-pointer"><SendHorizontal \/><\/Button>/)
assert.doesNotMatch(chat, /disabled|variant="ghost"|CardHeader|useState|useEffect|fetch\(|localStorage|absolute|MessageHeader|MessageFooter/)
assert.match(chat, /onSubmit=\{event => event\.preventDefault\(\)\}/)

// WPIP-04: forecast lows removed with their sr-only text; no fixed weight on temperature or place.
const weather = code(read("packages/ui/src/compositions/local-weather.tsx"))
assert.equal(count(weather, /\{ day: "[A-Z][a-z]{2}", label: "[^"]+", icon: [A-Za-z]+, high: \d+ \}/g), 5)
assert.doesNotMatch(weather, /day\.low|sr-only">low<|high: \d+, low: \d+ \},\n  \{ day/)
assert.match(weather, /<p className="shrink-0 text-5xl tabular-nums">/)
assert.match(weather, /<h2 className="max-w-full truncate text-base">/)
assert.match(weather, /<span>L \{NOW\.low\}°<\/span>/)

// WPIP-05: display-only labels and HEX, rectangular swatches, plain Sidebar heading, no alias lines or scale summary.
const design = code(read("apps/workbench/src/DesignSystemPreview.tsx"))
assert.match(design, /import \{ COLOR_GROUPS, pickerHex \} from "\.\/controls"/)
assert.match(design, /export const DESIGN_SYSTEM_COLOR_GROUPS = COLOR_GROUPS/)
assert.match(design, /<SwatchGroup key=\{group\.id\} label=\{group\.title\}>/)
assert.match(design, /className="h-10 w-full rounded-md border" data-testid="swatch"/)
assert.doesNotMatch(design, /SIDEBAR_TOKEN_ALIASES|sidebar-alias|base aliases|type-scale-meta|size-12|workbench-theme|setColor|localStorage|postMessage|<input|<button|onChange|onClick/)
assert.match(design, /export const TYPE_SCALE = \["text-5xl", "text-4xl", "text-3xl", "text-2xl", "text-xl", "text-lg", "text-base", "text-sm", "text-xs"\] as const/)

// WPIP-06: reset toast on the installed Base UI primitive through a re-export-only bridge; existing history Undo only.
assert.equal(read("packages/ui/src/lib/toast.ts").replace(/^\/\/.*\n/gm, ""), 'export { Toast } from "@base-ui/react/toast"\n')
const app = code(read("apps/workbench/src/App.tsx"))
const baseApp = code(at(base, "apps/workbench/src/App.tsx").toString())
assert.match(app, /import \{ Toast \} from "@personal-ui\/ui\/lib\/toast"/)
assert.doesNotMatch(app, /sonner|Undo restores your edits|<Toast\.Close/)
assert.match(app, /if \(target && !locked && now\.id === target\.themeId && now\.revision === target\.revision\) stepHistory\(undo\)/)
assert.equal(count(app, /<SidebarProvider\b/g), 1, "the Workbench keeps one Sidebar provider")
for (const message of ["setNotice(`Saved", "setNotice(`Deleted", "setNotice(`Not saved:", "setNotice(`Not deleted:"]) assert.ok(app.includes(message), "inline notice kept: " + message)
// History, mutation and Design Command wiring are otherwise untouched: the same history imports and calls.
assert.match(app, /import \{ EMPTY_TRACK, isDirty, record, redo, reset, sameDesign, undo \} from "\.\/history"/)
assert.equal(count(app, /stepHistory\(/g), count(baseApp, /stepHistory\(/g) + 1)
for (const call of ["applyProposal(", "stageProposal(", "discardProposal(", "evaluateDesignCommandClient("]) assert.equal(count(app, new RegExp(call.replace("(", "\\("), "g")), count(baseApp, new RegExp(call.replace("(", "\\("), "g")), call)

// WPIP-07: one preview-local provider per shell, in-flow rail, scoped shortcut, taller frame; Sidebar API untouched.
const shells = code(read("packages/ui/src/compositions/app-shells.tsx"))
assert.equal(count(shells, /<SidebarProvider /g), 1)
assert.equal(count(shells, /function Shell\(/g), 1)
assert.deepEqual([...shells.matchAll(/<Shell title="([^"]+)" variant="([a-z]+)"/g)].map(match => [match[1], match[2]]), [["Classic workspace", "classic"], ["Inset project", "inset"], ["Compact utility", "compact"]])
assert.match(shells, /<SidebarProvider open=\{open\} onOpenChange=\{ignoreProviderToggle\} onKeyDown=\{onShortcut\} className="block h-120 /)
assert.match(shells, /collapsible="none"/)
assert.doesNotMatch(shells, /collapsible="(icon|offcanvas)"|SidebarRail|<SidebarInset|useSidebar|addEventListener|localStorage|sessionStorage|createContext|h-108/)
assert.match(shells, /event\.preventDefault\(\)\s*event\.stopPropagation\(\)\s*toggle\(\)/)
assert.match(shells, /<SidebarTrigger aria-label=\{`Toggle \$\{title\} sidebar`\} aria-expanded=\{open\} aria-controls=\{sidebarId\} onClick=\{onToggle\}/)
assert.match(shells, /<div data-app-shells className="@container min-h-0 min-w-0">/)

// WPIP-08: Bitcoin moves only to after the chat pair; 1Y data frozen; bounded static 3Y/5Y; no caption or runtime data.
const gallery = code(read("apps/workbench/src/Gallery.tsx"))
const LEFT = ["plan-usage", "quick-find", "productive-week", "signup-form", "now-playing"]
const RIGHT = ["revenue-overview", "team-chat", "recent-activity", "bitcoin-price", "recent-payments", "offsite-calendar", "local-weather"]
assert.deepEqual([...gallery.matchAll(/<Composition id="([a-z-]+)" \/>/g)].map(match => match[1]), [...LEFT, ...RIGHT])
assert.match(gallery, /<Composition id="recent-activity" \/>\s*<\/LocalGroup>\s*<Composition id="bitcoin-price" \/>\s*<Composition id="recent-payments" \/>/)
const baseGallery = code(at(base, "apps/workbench/src/Gallery.tsx").toString())
const withoutBitcoin = source => source.replace(/\n\s*<Composition id="bitcoin-price" \/>/, "").replace(/\n\s*\{ id: "bitcoin-price", render: \(\) => <BitcoinPrice \/> \},/, "")
assert.equal(withoutBitcoin(gallery), withoutBitcoin(baseGallery), "Gallery changes beyond moving Bitcoin")
const bitcoinSource = read("packages/ui/src/compositions/bitcoin-price.tsx")
const bitcoin = code(bitcoinSource)
const frozenPoints = [...read(btcReference).matchAll(/^\| (\d{4}-\d{2}-\d{2}) \| (\d+\.\d{2}) \|$/gm)].map(match => [match[1], match[2]])
assert.equal(frozenPoints.length, 13)
assert.deepEqual([...bitcoinSource.matchAll(/\{ date: "(\d{4}-\d{2}-\d{2})", price: (\d+\.\d{2}) \}/g)].map(match => [match[1], match[2]]), frozenPoints)
const baseBitcoin = at(base, "packages/ui/src/compositions/bitcoin-price.tsx").toString()
const frozenBlock = source => source.slice(source.indexOf("/**\n * Static historical BTC/USD reference"), source.indexOf("] as const") + 10)
assert.equal(frozenBlock(bitcoinSource), frozenBlock(baseBitcoin), "the 1Y dataset and its provenance are byte-identical")
const illustrative = [...bitcoinSource.matchAll(/\["(\d{4}-\d{2}-01)", (\d+)\]/g)].map(match => [match[1], Number(match[2])])
assert.equal(illustrative.length, 16)
assert.ok(illustrative.every(([date, price], index) => price % 100 === 0 && date === `${2021 + Math.floor(index / 4)}-${String(1 + (index % 4) * 3).padStart(2, "0")}-01`), "quarterly illustrative cadence")
assert.match(bitcoinSource, /Illustrative quarter-start BTC\/USD levels/)
assert.match(bitcoinSource, /were not retrieved from\n \* any source during this phase/)
assert.match(bitcoin, /"3Y": \{ span: "three years", cadence: "the first day of each quarter", points: quarterly\("2023-01-01"\) \}/)
assert.match(bitcoin, /"5Y": \{ span: "five years", cadence: "the first day of each quarter", points: quarterly\("2021-01-01"\) \}/)
assert.match(bitcoin, /"1Y": \{ span: "one year", cadence: "the first day of each month", points: BTC_FIRST_OF_MONTH_USD \}/)
assert.match(bitcoin, /Math\.round\(\(\(last\.price - first\.price\) \/ first\.price\) \* 10000\) \/ 100/)
assert.match(bitcoin, /<SingleToggleGroup label="Bitcoin range" value=\{range\} onValueChange=\{setRange\} options=\{RANGE_OPTIONS\} \/>/)
assert.match(bitcoin, /useState<BitcoinRange>\("1Y"\)/)
assert.match(bitcoin, /<XAxis dataKey="day" hide \/>/)
assert.match(bitcoin, /<YAxis hide domain=/)
assert.match(bitcoin, /<ChartContainer config=\{config\} className="aspect-auto h-36 w-full">/)
assert.equal(count(bitcoin, /<Line /g), 1)
assert.doesNotMatch(bitcoin, /CartesianGrid|Legend|<Area|<Bar|useEffect|Tabs|fetch\(|XMLHttpRequest|WebSocket|EventSource|import\(|setInterval|setTimeout|https?:\/\/|Source: Coinbase|Historical first-of-month|localStorage/)

// Token-only colour and no network, credential or storage surface in changed product code.
const rawColour = /#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color-mix)\(|\b(bg|text|border|fill|stroke|ring|from|to|via|accent|outline)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white)\b|\[(#|rgb|hsl|oklch)/
const product = changed.filter(path => /^(packages\/ui|apps\/workbench)\/src\/.*\.tsx?$/.test(path) && !/\.(test|stories)\.tsx?$/.test(path))
for (const path of product) assert.doesNotMatch(code(read(path)), rawColour, "raw colour: " + path)
const surface = /\bfetch\(|XMLHttpRequest|WebSocket|EventSource|navigator\.(sendBeacon|geolocation)|TYPESAFE_|localStorage|sessionStorage/g
for (const path of product) assert.deepEqual(read(path).match(surface) ?? [], tracked.includes(path) ? at(base, path).toString().match(surface) ?? [] : [], path)
const scripts = readdirSync("apps/workbench/dist/assets").filter(name => name.endsWith(".js"))
assert.ok(scripts.length > 0, "build the workbench first")
for (const file of scripts) assert.doesNotMatch(read(`apps/workbench/dist/assets/${file}`), /TYPESAFE_|api\.typesafe\.ai|sk-[A-Za-z0-9]{20}|fred\.stlouisfed\.org|api\.coinbase|coingecko|sonner/, file)

console.log(`${phase}: offline producer boundary scan passed (${changed.length} changed paths).`)
