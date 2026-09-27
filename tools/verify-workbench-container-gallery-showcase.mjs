// Offline CGS boundary scan. No credentials, network, browser, or canonical runtime state.
// Run after `pnpm build:workbench` and `pnpm registry:build`: node tools/verify-workbench-container-gallery-showcase.mjs
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"

const phase = "workbench-container-gallery-showcase-v1-001"
const accepted = "b15380fd2ad1f221055af382841a9045bbdd84de"
const prepared = "3e59f1ff4a8fd52b525ba359696f27e878db7ca5"
const base = "6f99c15bccb141f942e4d2615c6a3a40c99ec836"
const run = `.loop/runs/${phase}`
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trimEnd()
const read = path => readFileSync(path, "utf8")
const at = (rev, path) => execFileSync("git", ["show", rev + ":" + path], { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
const lines = value => value.split("\n").filter(Boolean)
const hash = value => createHash("sha256").update(value).digest("hex")
const code = source => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

// CGS-01: the frozen packet and authoritative contract are byte-identical to the admitted base and every recorded
// hash still matches.
const packet = [
  `${run}/admission.json`, `${run}/linear-ticket-snapshots.md`, `${run}/preflight.json`, `${run}/snapshot-hashes.json`, `${run}/task.md`,
  ...["PUI-78", "PUI-79", "PUI-80"].map(id => `${run}/linear/${id}.json`),
]
const contract = "docs/WORKBENCH_CONTAINER_GALLERY_SHOWCASE_CONTRACT.md"
for (const path of [...packet, contract, "BRIEF.md", "AGENTS.md"]) assert.equal(hash(readFileSync(path)), hash(at(base, path)), "Frozen admission record changed: " + path)
assert.ok(lines(git("diff", "--name-only", accepted, base)).every(path => path.startsWith(run + "/") || ["BRIEF.md", contract, "docs/RESEARCH_FINDINGS.md"].includes(path)), "admission diff")
assert.ok(git("merge-base", "--is-ancestor", prepared, base) === "", "prepared base is an ancestor")
const hashes = JSON.parse(read(`${run}/snapshot-hashes.json`))
for (const [id, sha] of Object.entries(hashes.tickets)) {
  assert.equal(hash(readFileSync(`${run}/linear/${id}.json`)), sha, "Ticket snapshot hash: " + id)
  const snapshot = JSON.parse(read(`${run}/linear/${id}.json`))
  assert.equal(snapshot.issue.id, id)
  assert.equal(snapshot.retrievedAt, "2026-09-27T08:02:08Z")
  assert.ok(Array.isArray(snapshot.comments) && Array.isArray(snapshot.issue.attachments), "comments/attachments recorded: " + id)
}
assert.equal(hash(readFileSync(`${run}/linear-ticket-snapshots.md`)), hashes.index)
assert.equal(hash(readFileSync(contract)), hashes.contract)
const admission = JSON.parse(read(`${run}/admission.json`))
assert.equal(admission.acceptedProductBase, accepted)
assert.equal(admission.preparedImplementationBase, prepared)
assert.equal(hash(readFileSync(`${run}/snapshot-hashes.json`)), admission.linearPacket.ticketPayloadHashManifestSha256)
assert.equal(hash(readFileSync(contract)), admission.linearPacket.contractSha256)
for (const flag of ["networkAllowed", "credentialsAllowed", "externalActionsAllowed", "paidFallbackAllowed", "ownerVisualReviewRequired"]) assert.equal(admission[flag], false, flag)

// CGS-02: bounded delivery. Every change since the admitted base is inside the admitted surfaces.
const compositions = ["account-profile", "notification-preferences", "productive-week", "recent-activity", "room-to-think", "support-request", "team-access", "workspace-settings"]
const showcase = ["revenue-overview", "upcoming-schedule", "plan-usage", "launch-board", "quick-find"]
const admittedPaths = new Set([
  // Workbench gallery, toolbar, and their unit tests.
  ...["App.tsx", "Gallery.tsx", "styles.css", "gallery.test.ts", "lifecycle.test.ts"].map(name => `apps/workbench/src/${name}`),
  // Showcase compositions (new modules with thin stories, and the two refreshed accepted modules).
  ...showcase.flatMap(name => [`packages/ui/src/compositions/${name}.tsx`, `packages/ui/src/compositions/${name}.stories.tsx`]),
  "packages/ui/src/compositions/recent-activity.tsx", "packages/ui/src/compositions/room-to-think.tsx",
  "packages/ui/src/quiet-workspace.test.ts",
  // Optional backward-compatible Switch thumb slot with its contract, provenance mirror, story, and tests.
  "packages/ui/src/components/switch.tsx", "packages/ui/src/components/switch.stories.tsx", "packages/ui/src/foundation.test.ts",
  "packages/core/src/contracts/data/switch.ts", "packages/core/src/context/provenance.ts", "packages/ui/src/lib/workbench-icons.ts",
  // Browser definitions (Lead-executed).
  "e2e/workbench-container-gallery-showcase.spec.ts", "e2e/switch.spec.ts",
  ...["quiet-workspace", "semantic-typography-history-grid", "workbench-nested-gallery-interaction-polish", "workbench-sidebar-preview-followup"].map(name => `e2e/${name}.spec.ts`),
  "playwright.config.ts", "playwright.workbench.config.ts",
  // Phase evidence.
  "tools/verify-workbench-container-gallery-showcase.mjs", "docs/WORKBENCH_CONTAINER_GALLERY_SHOWCASE_CHECKPOINT.md",
])
const tracked = lines(git("ls-tree", "-r", "--name-only", base))
const changed = [...new Set([...lines(git("diff", "--name-only", base)), ...lines(git("ls-files", "--others", "--exclude-standard"))])].sort()
for (const path of changed) {
  assert.ok(admittedPaths.has(path), "Outside admitted scope: " + path)
  assert.doesNotMatch(read(path), /[ \t]+$/m, "Trailing whitespace: " + path)
  assert.ok(read(path).endsWith("\n") && !read(path).endsWith("\n\n"), "Exactly one final newline: " + path)
}
assert.equal(git("diff", "--name-only", "--diff-filter=D", base), "", "No file deletions")

// CGS-13: everything else is byte-frozen: dependencies, lockfile, registry, schema, mutations, persistence, history,
// migration, proposals, Jev transport, colour picker, accepted fixture compositions, and earlier phase verifiers.
const frozen = tracked.filter(path => !admittedPaths.has(path))
for (const path of frozen) assert.equal(hash(readFileSync(path)), hash(at(base, path)), "Frozen file changed: " + path)
for (const path of ["package.json", "pnpm-lock.yaml", "registry.json", "packages/ui/package.json", "apps/workbench/package.json", "packages/core/package.json",
  "packages/core/src/theme/schema.ts", "packages/core/src/theme/migrate.ts", "packages/core/src/theme/render.ts", "packages/core/src/mutations/mutation.ts",
  "packages/core/src/mutations/proposal.ts", "packages/core/src/theme/fixtures/default.json", "packages/core/src/theme/fixtures/valid.json",
  "apps/workbench/src/persistence.ts", "apps/workbench/src/history.ts", "apps/workbench/src/lifecycle.ts", "apps/workbench/src/colorPicker.ts",
  "apps/workbench/src/LiveControls.tsx", "apps/workbench/src/PreviewFrame.tsx", "apps/workbench/src/designCommand.ts",
  "apps/workbench/src/server/designCommandHandler.ts", "packages/core/src/jev-design/wire.ts",
  "tools/verify-workbench-nested-gallery-interaction-polish.mjs",
  ...compositions.filter(name => !["recent-activity", "room-to-think"].includes(name)).map(name => `packages/ui/src/compositions/${name}.tsx`),
  ...compositions.map(name => `packages/ui/src/compositions/${name}.stories.tsx`)]) {
  assert.ok(frozen.includes(path), "Expected frozen: " + path)
}
const registry = JSON.parse(read("registry.json"))
assert.equal(registry.items.length, 19)
assert.deepEqual(readdirSync("public/r").filter(p => p.endsWith(".json") && p !== "registry.json").sort(), registry.items.map(item => item.name + ".json").sort())
const operationNames = source => [...source.matchAll(/^\s+\["(set[A-Za-z]+)", new Set\(/gm)].map(match => match[1])
const operations = operationNames(read("packages/core/src/mutations/mutation.ts"))
assert.deepEqual(operations, ["setColor", "setRadius", "setDensity", "setFontWeight", "setShadowBlur", "setMotionDuration", "setFontFamily", "setTracking", "setRadiusBase", "setSpacingBase", "setShadowProfile", "setSidebarTokensEnabled"])

// CGS-03/04/06: a named-container frame with rebalancing spans and independent region stacks, expressed as direct
// Tailwind utilities; the obsolete semantic gallery CSS is gone.
const gallery = code(read("apps/workbench/src/Gallery.tsx"))
const styles = code(read("apps/workbench/src/styles.css"))
const ids = ["productive-week", "quick-find", "account-profile", "notifications", "plan-usage", "support-request", "revenue-overview", "upcoming-schedule", "recent-activity", "launch-board", "team-access", "workspace-settings", "room-to-think"]
assert.deepEqual([...gallery.matchAll(/\{ id: "([a-z-]+)", render: /g)].map(match => match[1]), ids)
assert.deepEqual([...gallery.matchAll(/<Composition id="([a-z-]+)" \/>/g)].map(match => match[1]), ids, "each composition rendered once, in configuration order")
assert.match(gallery, /data-gallery="cards"[^>]*className="@container\/gallery min-w-0"/)
assert.match(gallery, /<div className="grid grid-cols-1 items-start gap-4 @2xl\/gallery:grid-cols-12 @4xl\/gallery:gap-6">/)
assert.match(gallery, /<Region side="left" className="@2xl\/gallery:col-span-6 @4xl\/gallery:col-span-5 @6xl\/gallery:col-span-4">/)
assert.match(gallery, /<Region side="right" className="@2xl\/gallery:col-span-6 @4xl\/gallery:col-span-7 @6xl\/gallery:col-span-8">/)
assert.match(gallery, /`@container flex min-w-0 flex-col gap-4 @4xl\/gallery:gap-6 \$\{className\}`/)
assert.match(gallery, /`grid min-w-0 grid-cols-1 items-start gap-4 @4xl\/gallery:gap-6 \$\{className\}`/)
assert.ok((gallery.match(/<LocalGroup className="@(lg|xl):grid-cols-2">/g) ?? []).length >= 2, "local groups")
assert.match(gallery, /\[&>\[data-slot=card\]\]:\[box-shadow:none\] \[&>form>\[data-slot=card\]\]:\[box-shadow:none\]/)
for (const source of [gallery, styles]) {
  assert.doesNotMatch(source, /quiet-gallery|quiet-stack|PreviewLayout|data-layout|masonry|dense|aspect-|auto-rows|grid-auto-rows|\babsolute\b|gridColumn|gridRow|colSpan/)
}
assert.doesNotMatch(gallery, /(?<![@\w/-])(sm|md|lg|xl|2xl):(grid|col|flex|gap)/, "no viewport breakpoints in the gallery")
assert.doesNotMatch(styles, /data-gallery|data-composition|@media \(min-width/)

// CGS-07/08: curated showcase modules are token-driven with Theme v3 roles and thin shared stories.
const rawColour = /#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color-mix)\(|\b(bg|text|border|fill|stroke|ring|from|to|via)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white)\b|\[(#|rgb|hsl|oklch)/
for (const name of [...compositions, ...showcase]) {
  const source = read(`packages/ui/src/compositions/${name}.tsx`)
  assert.doesNotMatch(source, rawColour, "raw colour: " + name)
  assert.match(source, /<h2 className="type-heading">/, "Heading role: " + name)
  assert.doesNotMatch(source, /\bfetch\(|XMLHttpRequest|localStorage|sessionStorage/, name)
}
for (const name of showcase) {
  const story = read(`packages/ui/src/compositions/${name}.stories.tsx`)
  assert.match(story, new RegExp(`from "\\./${name}"`))
  assert.doesNotMatch(story, /function |<Card|<Input/)
}
assert.deepEqual(readdirSync("packages/ui/src/compositions").filter(file => !file.endsWith(".stories.tsx")).map(file => file.replace(/\.tsx$/, "")).sort(), [...compositions, ...showcase].sort())

// CGS-10/11: Switch | history | export/save with one shared short separator; no visible label; icon-only thumb.
const app = read("apps/workbench/src/App.tsx")
assert.match(app, /function ToolbarSeparator\(\) \{\n  return <div role="separator" aria-orientation="vertical" className="h-8 w-px shrink-0 bg-border" \/>\n\}/)
assert.equal((app.match(/role="separator"/g) ?? []).length, 1, "one separator definition")
const toolbar = app.slice(app.indexOf('data-testid="workbench-toolbar"'), app.indexOf("</ResponsiveDialog>", app.indexOf('title="Save"')))
const order = ["<SidebarTrigger", 'className="ml-auto flex items-center gap-2"', 'id="color-mode-switch"', "<ToolbarSeparator />", 'data-testid="history-controls"', 'aria-label="Undo"', 'aria-label="Redo"', 'aria-label="Reset"', 'title="Export"', 'title="Save"'].map(needle => toolbar.indexOf(needle))
assert.ok(order.every((index, i) => index >= 0 && (i === 0 || index > order[i - 1])), "toolbar order")
assert.equal((toolbar.match(/<ToolbarSeparator \/>/g) ?? []).length, 2)
assert.match(toolbar, /aria-label="Toggle dark mode"/)
assert.match(toolbar, /thumbContent=\{mode === "dark" \? <Moon aria-hidden="true" data-icon="moon" className="size-2\.5" \/> : <Sun aria-hidden="true" data-icon="sun" className="size-2\.5" \/>\}/)
assert.match(toolbar, /onCheckedChange=\{\(checked\) => \{ endGesture\(\); setMode\(checked \? "dark" : "light"\) \}\}/)
assert.doesNotMatch(app, />\s*Dark mode\s*</)
assert.doesNotMatch(app, /components\/label"|htmlFor="color-mode-switch"/)
assert.match(toolbar, /download\(exportThemeJson\(currentRef\.current\)\)/)
assert.match(read("packages/ui/src/lib/workbench-icons.ts"), /export \{ Download, Moon, Redo2, RotateCcw, Save, Sun, Undo2 \} from "lucide-react"/)

// CGS-13: the Switch remains one backward-compatible resource; only the optional thumb slot was added.
const switchNow = read("packages/ui/src/components/switch.tsx"), switchWas = at(base, "packages/ui/src/components/switch.tsx").toString("utf8")
const added = lines(git("diff", "-U0", base, "--", "packages/ui/src/components/switch.tsx")).filter(line => /^\+[^+]/.test(line)).map(line => line.slice(1).trim())
const removed = lines(git("diff", "-U0", base, "--", "packages/ui/src/components/switch.tsx")).filter(line => /^-[^-]/.test(line)).map(line => line.slice(1).trim())
assert.deepEqual(removed, [
  "}: React.ComponentProps<typeof SwitchPrimitive.Root>) {",
  '"data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"',
  "/>",
])
assert.ok(added.includes("thumbContent,") && added.includes("}: React.ComponentProps<typeof SwitchPrimitive.Root> & { thumbContent?: React.ReactNode }) {") && added.includes("{thumbContent}"))
assert.ok(switchNow.includes('thumbContent != null && "grid place-items-center text-foreground"'))
for (const kept of ['"peer inline-flex h-[1.15rem] w-8', '"pointer-events-none block size-4 rounded-full bg-background ring-0 transition-transform",', 'data-slot="switch-thumb"']) assert.ok(switchWas.includes(kept) && switchNow.includes(kept), kept)
assert.equal(registry.items.filter(item => item.name === "switch").length, 1)
const provenance = read("packages/core/src/context/provenance.ts")
const entry = provenance.match(/"resource:switch": \{\s*sourceId: "packages\/core\/src\/contracts\/data\/switch\.ts",\s*sha256: "([0-9a-f]{64})"/)
assert.equal(entry[1], hash(readFileSync("packages/core/src/contracts/data/switch.ts")), "switch provenance mirror")
assert.deepEqual(lines(git("diff", "-U0", base, "--", "packages/core/src/context/provenance.ts")).filter(line => /^[-+] /.test(line)).length, 2)

// CGS-13: no network, credential, or provider surface in changed product code or the client bundle.
for (const path of changed.filter(path => /^(apps\/workbench\/src|packages\/ui\/src)\/.*\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path))) {
  assert.doesNotMatch(read(path), /\bfetch\(|XMLHttpRequest|WebSocket|EventSource|navigator\.sendBeacon|TYPESAFE_/, path)
}
const bundleFiles = readdirSync("apps/workbench/dist/assets").filter(name => name.endsWith(".js"))
assert.ok(bundleFiles.length > 0, "build the workbench first")
for (const file of bundleFiles) assert.doesNotMatch(read(`apps/workbench/dist/assets/${file}`), /TYPESAFE_|api\.typesafe\.ai|sk-[A-Za-z0-9]{20}/, file)

console.log(JSON.stringify({ ok: true, phase, changed: changed.length, frozen: frozen.length, operations: operations.length, registry: registry.items.length, compositions: ids.length }))
