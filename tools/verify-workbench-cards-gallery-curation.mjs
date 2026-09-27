// Offline CGCR boundary scan. No credentials, network, browser, or canonical runtime state.
// Run after `pnpm build:workbench` and `pnpm registry:build`: node tools/verify-workbench-cards-gallery-curation.mjs
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync } from "node:fs"

const phase = "workbench-cards-gallery-curation-v1-001"
const accepted = "696e7c4e1af19be88bcac308dda2227acc9323f6"
const base = "73e2c6e472e393fcf82d25938383a1eeee6eb98f"
const control = "42dc19eebe31998309908cf6f8d5b6f153134c73"
const run = `.loop/runs/${phase}`
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trimEnd()
const read = path => readFileSync(path, "utf8")
const at = (rev, path) => execFileSync("git", ["show", rev + ":" + path], { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
const lines = value => value.split("\n").filter(Boolean)
const hash = value => createHash("sha256").update(value).digest("hex")
const code = source => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

// CGCR-01: the frozen packet and authoritative contract are byte-identical to the implementation base, and every
// recorded hash still matches.
const tickets = ["PUI-81", "PUI-82", "PUI-83", "PUI-84", "PUI-85"]
const packet = [
  `${run}/linear-ticket-snapshots.md`, `${run}/snapshot-hashes.json`, `${run}/task.md`,
  ...tickets.flatMap(id => [`${run}/linear/${id}.json`, `${run}/linear/${id}.comments.json`]),
]
const contract = "docs/WORKBENCH_CARDS_GALLERY_CURATION_CONTRACT.md"
for (const path of [...packet, contract, "BRIEF.md", "AGENTS.md"]) assert.equal(hash(readFileSync(path)), hash(at(base, path)), "Frozen admission record changed: " + path)
assert.equal(git("merge-base", "--is-ancestor", accepted, base), "", "accepted product base is an ancestor")
assert.ok(lines(git("diff", "--name-only", accepted, base)).every(path => path.startsWith(run + "/") || ["BRIEF.md", contract].includes(path)), "admission diff touches only the packet, contract, and brief")
const hashes = JSON.parse(read(`${run}/snapshot-hashes.json`))
assert.equal(hashes.retrievedAt, "2026-09-27T12:06:49Z")
for (const id of tickets) {
  assert.equal(hash(readFileSync(`${run}/linear/${id}.json`)), hashes.tickets[id], "Ticket snapshot hash: " + id)
  assert.equal(hash(readFileSync(`${run}/linear/${id}.comments.json`)), hashes.comments[id], "Comment snapshot hash: " + id)
  const issue = JSON.parse(read(`${run}/linear/${id}.json`))
  assert.equal(issue.id, id)
  assert.ok(Array.isArray(issue.attachments) && Array.isArray(issue.documents), "attachments/documents recorded: " + id)
  assert.deepEqual(JSON.parse(read(`${run}/linear/${id}.comments.json`)), { comments: [], hasNextPage: false })
}
assert.equal(hash(readFileSync(`${run}/linear-ticket-snapshots.md`)), hashes.index)
assert.equal(hash(readFileSync(contract)), hashes.contract)
assert.equal(hash(readFileSync(`${run}/task.md`)), hashes.task)
// admission.json is written by the Lead; when present its execution flags must stay closed.
if (existsSync(`${run}/admission.json`)) {
  const admission = JSON.parse(read(`${run}/admission.json`))
  for (const flag of ["networkAllowed", "credentialsAllowed", "externalActionsAllowed", "paidFallbackAllowed", "ownerVisualReviewRequired"]) if (flag in admission) assert.equal(admission[flag], false, flag)
}
for (const path of [`${run}/admission.json`, `${run}/preflight.json`]) {
  assert.equal(hash(readFileSync(path)), hash(at(control, path)), "Lead control receipt changed: " + path)
}

// CGCR-02: bounded delivery. Every change since the implementation base is inside the admitted surfaces.
const curated = ["plan-usage", "quick-find", "productive-week", "support-request", "revenue-overview", "upcoming-schedule", "recent-activity", "launch-board"]
const stable = ["plan-usage", "quick-find", "support-request", "upcoming-schedule", "launch-board"]
const removed = { "account-profile": "account-profile", notifications: "notification-preferences", "team-access": "team-access", "workspace-settings": "workspace-settings", "room-to-think": "room-to-think" }
const admittedPaths = new Set([
  // Workbench gallery recipe and its unit tests.
  "apps/workbench/src/Gallery.tsx", "apps/workbench/src/gallery.test.ts", "packages/ui/src/quiet-workspace.test.ts",
  // Stable gallery presentations with thin Gallery stories, and the Studio revenue simplification.
  ...stable.flatMap(name => [`packages/ui/src/compositions/${name}.tsx`, `packages/ui/src/compositions/${name}.stories.tsx`]),
  "packages/ui/src/compositions/revenue-overview.tsx",
  // Browser definitions (Lead-executed) and their configs.
  "e2e/workbench-cards-gallery-curation.spec.ts", "e2e/composition-gallery-presentations.spec.ts",
  ...["quiet-workspace", "workbench-container-gallery-showcase", "workbench-nested-gallery-interaction-polish", "workbench-sidebar-preview-followup"].map(name => `e2e/${name}.spec.ts`),
  "playwright.config.ts", "playwright.workbench.config.ts",
  // Phase evidence.
  "tools/verify-workbench-cards-gallery-curation.mjs", "docs/WORKBENCH_CARDS_GALLERY_CURATION_CHECKPOINT.md",
  `${run}/admission.json`, `${run}/preflight.json`,
])
const tracked = lines(git("ls-tree", "-r", "--name-only", base))
const changed = [...new Set([...lines(git("diff", "--name-only", base)), ...lines(git("ls-files", "--others", "--exclude-standard"))])].sort()
for (const path of changed) {
  assert.ok(admittedPaths.has(path), "Outside admitted scope: " + path)
  assert.doesNotMatch(read(path), /[ \t]+$/m, "Trailing whitespace: " + path)
  assert.ok(read(path).endsWith("\n") && !read(path).endsWith("\n\n"), "Exactly one final newline: " + path)
}
assert.equal(git("diff", "--name-only", "--diff-filter=D", base), "", "No file deletions")

// CGCR-02/08: everything else is byte-frozen: dependencies, lockfile, registry, schema, mutations, persistence, history,
// proposals, Jev transport, the Workbench shell, shared primitives, removed-card modules and stories, and earlier verifiers.
const frozen = tracked.filter(path => !admittedPaths.has(path))
for (const path of frozen) assert.equal(hash(readFileSync(path)), hash(at(base, path)), "Frozen file changed: " + path)
const mustBeFrozen = [
  "package.json", "pnpm-lock.yaml", "registry.json", "packages/ui/package.json", "apps/workbench/package.json", "packages/core/package.json",
  "packages/core/src/theme/schema.ts", "packages/core/src/theme/migrate.ts", "packages/core/src/theme/render.ts", "packages/core/src/mutations/mutation.ts",
  "packages/core/src/mutations/proposal.ts", "packages/core/src/theme/fixtures/default.json", "packages/core/src/theme/fixtures/valid.json",
  "apps/workbench/src/App.tsx", "apps/workbench/src/styles.css", "apps/workbench/src/persistence.ts", "apps/workbench/src/history.ts",
  "apps/workbench/src/lifecycle.ts", "apps/workbench/src/PreviewFrame.tsx", "apps/workbench/src/designCommand.ts",
  "apps/workbench/src/server/designCommandHandler.ts", "packages/core/src/jev-design/wire.ts",
  "tools/verify-workbench-container-gallery-showcase.mjs", "tools/verify-workbench-nested-gallery-interaction-polish.mjs",
  "packages/ui/src/compositions/productive-week.tsx", "packages/ui/src/compositions/recent-activity.tsx",
  ...Object.values(removed).flatMap(name => [`packages/ui/src/compositions/${name}.tsx`, `packages/ui/src/compositions/${name}.stories.tsx`]),
  ...readdirSync("packages/ui/src/components").map(name => `packages/ui/src/components/${name}`),
]
for (const path of mustBeFrozen) assert.ok(frozen.includes(path), "Expected frozen: " + path)
const registry = JSON.parse(read("registry.json"))
assert.equal(registry.items.length, 19)
assert.deepEqual(readdirSync("public/r").filter(p => p.endsWith(".json") && p !== "registry.json").sort(), registry.items.map(item => item.name + ".json").sort())
const operationNames = source => [...source.matchAll(/^\s+\["(set[A-Za-z]+)", new Set\(/gm)].map(match => match[1])
const operations = operationNames(read("packages/core/src/mutations/mutation.ts"))
assert.deepEqual(operations, ["setColor", "setRadius", "setDensity", "setFontWeight", "setShadowBlur", "setMotionDuration", "setFontFamily", "setTracking", "setRadiusBase", "setSpacingBase", "setShadowProfile", "setSidebarTokensEnabled"])

// CGCR-03: exactly the eight curated compositions, once each, in the owner-approved region order.
const source = read("apps/workbench/src/Gallery.tsx")
const gallery = code(source)
assert.deepEqual([...gallery.matchAll(/\{ id: "([a-z-]+)", render: /g)].map(match => match[1]), curated)
assert.deepEqual([...gallery.matchAll(/<Composition id="([a-z-]+)" \/>/g)].map(match => match[1]), curated, "each composition rendered once, in configuration order")
const region = side => { const start = gallery.indexOf(`<Region side="${side}"`); return [...gallery.slice(start, gallery.indexOf("</Region>", start)).matchAll(/<Composition id="([a-z-]+)" \/>/g)].map(match => match[1]) }
assert.deepEqual(region("left"), ["plan-usage", "quick-find", "productive-week", "support-request"])
assert.deepEqual(region("right"), ["revenue-overview", "upcoming-schedule", "recent-activity", "launch-board"])
assert.match(gallery, /<LocalGroup className="@lg:grid-cols-2">\s*<Composition id="upcoming-schedule" \/>\s*<Composition id="recent-activity" \/>\s*<\/LocalGroup>/)
assert.equal((gallery.match(/<LocalGroup /g) ?? []).length, 1)
for (const [id, name] of Object.entries(removed)) {
  assert.ok(!source.includes(id) && !source.includes(`compositions/${name}"`), "removed from the gallery: " + id)
  for (const file of [`${name}.tsx`, `${name}.stories.tsx`]) assert.ok(existsSync(`packages/ui/src/compositions/${file}`), "standalone module retained: " + file)
}
assert.equal((source.match(/from "@personal-ui\/ui\/compositions\//g) ?? []).length, 8)

// CGCR-06/07: accepted container architecture with gap-4 everywhere; only the local pair stretches.
assert.match(gallery, /data-gallery="cards"[^>]*className="@container\/gallery min-w-0"/)
assert.match(gallery, /<div className="grid grid-cols-1 items-start gap-4 @2xl\/gallery:grid-cols-12">/)
assert.match(gallery, /<Region side="left" className="@2xl\/gallery:col-span-6 @4xl\/gallery:col-span-5 @6xl\/gallery:col-span-4">/)
assert.match(gallery, /<Region side="right" className="@2xl\/gallery:col-span-6 @4xl\/gallery:col-span-7 @6xl\/gallery:col-span-8">/)
assert.match(gallery, /`@container flex min-w-0 flex-col gap-4 \$\{className\}`/)
assert.match(gallery, /`grid min-w-0 grid-cols-1 items-stretch gap-4 \[&>\[data-composition\]>\[data-slot=card\]\]:h-full \$\{className\}`/)
assert.doesNotMatch(gallery, /gap-(?!4\b)/, "only gap-4")
assert.equal((gallery.match(/h-full/g) ?? []).length, 1)
assert.doesNotMatch(gallery, /min-h-|\bh-\[|\bh-\d/)
assert.match(gallery, /\[&>\[data-slot=card\]\]:\[box-shadow:none\] \[&>form>\[data-slot=card\]\]:\[box-shadow:none\]/)
for (const text of [gallery, code(read("apps/workbench/src/styles.css"))]) {
  assert.doesNotMatch(text, /quiet-gallery|quiet-stack|PreviewLayout|data-layout|masonry|dense|aspect-|auto-rows|grid-auto-rows|\babsolute\b|gridColumn|gridRow|colSpan/)
}
assert.doesNotMatch(gallery, /(?<![@\w/-])(sm|md|lg|xl|2xl):(grid|col|flex|gap)/, "no viewport breakpoints in the gallery")

// CGCR-04: every interactive survivor renders its stable presentation in the gallery; defaults keep full behaviour.
for (const name of curated) {
  const call = gallery.slice(gallery.indexOf(`{ id: "${name}"`), gallery.indexOf("},", gallery.indexOf(`{ id: "${name}"`)))
  assert.equal(call.includes(" stable />"), stable.includes(name), "stable presentation: " + name)
}
for (const name of stable) {
  const module = read(`packages/ui/src/compositions/${name}.tsx`)
  assert.match(module, /stable = false/, "stable defaults off: " + name)
  assert.doesNotMatch(module, /\b(min-)?h-\[\d/, "no fixed-height shortcut: " + name)
  assert.match(read(`packages/ui/src/compositions/${name}.stories.tsx`), /export const Gallery: .*stable: true/)
  assert.doesNotMatch(read(`packages/ui/src/compositions/${name}.stories.tsx`), /function |<Card|<Input/)
}

// CGCR-05: Studio revenue leads with its tabs, one divided metric row, Revenue-only chart, no shared chart change.
const revenue = read("packages/ui/src/compositions/revenue-overview.tsx")
assert.doesNotMatch(revenue, /CardHeader|CardTitle|CardDescription|Income against costs|costs|Costs|strokeDasharray="4 4"/)
assert.match(revenue, /<CardContent className="@container grid gap-5">\s*<h2 className="sr-only">Studio revenue<\/h2>\s*<div className="flex"><SingleToggleGroup label="Revenue range"/)
assert.match(revenue, /<dl className="grid grid-cols-3 divide-x divide-border">/)
assert.equal((revenue.match(/<Area /g) ?? []).length, 1)
assert.match(revenue, /<XAxis dataKey="period"/)

// CGCR-08: token-only colour in every curated module; no network, credential, or provider surface.
const rawColour = /#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color-mix)\(|\b(bg|text|border|fill|stroke|ring|from|to|via)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white)\b|\[(#|rgb|hsl|oklch)/
for (const name of curated) {
  const module = read(`packages/ui/src/compositions/${name}.tsx`)
  assert.doesNotMatch(module, rawColour, "raw colour: " + name)
  assert.doesNotMatch(module, /\bfetch\(|XMLHttpRequest|localStorage|sessionStorage/, name)
}
for (const path of changed.filter(path => /^(apps\/workbench\/src|packages\/ui\/src)\/.*\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path))) {
  assert.doesNotMatch(read(path), /\bfetch\(|XMLHttpRequest|WebSocket|EventSource|navigator\.sendBeacon|TYPESAFE_/, path)
}
const bundleFiles = readdirSync("apps/workbench/dist/assets").filter(name => name.endsWith(".js"))
assert.ok(bundleFiles.length > 0, "build the workbench first")
for (const file of bundleFiles) assert.doesNotMatch(read(`apps/workbench/dist/assets/${file}`), /TYPESAFE_|api\.typesafe\.ai|sk-[A-Za-z0-9]{20}/, file)

console.log(JSON.stringify({ ok: true, phase, base, changed: changed.length, frozen: frozen.length, operations: operations.length, registry: registry.items.length, compositions: curated.length }))
