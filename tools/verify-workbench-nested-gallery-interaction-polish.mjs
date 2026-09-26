// Offline NGIP boundary scan. No credentials, network, browser, or canonical runtime state.
// Run after `pnpm build:workbench` and `pnpm registry:build`: node tools/verify-workbench-nested-gallery-interaction-polish.mjs
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"

const phase = "workbench-nested-gallery-interaction-polish-v1-001"
const accepted = "a33c3d025fe408593264b96f76f4f6054d83b758"
const admitted = "a775794"
const base = "8d364b14ea70c4fb2192918033d21b5a0c6363d2"
const run = `.loop/runs/${phase}`
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trimEnd()
const read = path => readFileSync(path, "utf8")
const at = (rev, path) => execFileSync("git", ["show", rev + ":" + path], { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
const prior = path => at(accepted, path).toString("utf8")
const lines = value => value.split("\n").filter(Boolean)
const hash = value => createHash("sha256").update(value).digest("hex")
const code = source => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

// NGIP-01: the admission commits only add the packet, contract, and brief; the frozen packet is byte-identical and
// every recorded hash still matches.
const packet = [
  `${run}/admission.json`, `${run}/linear-ticket-snapshots.md`, `${run}/preflight.json`, `${run}/snapshot-hashes.json`, `${run}/task.md`,
  ...["PUI-65", "PUI-66", "PUI-67", "PUI-68", "PUI-69", "PUI-70"].map(id => `${run}/linear/${id}.json`),
]
const admissionRecords = [...packet, "BRIEF.md", "docs/WORKBENCH_NESTED_GALLERY_INTERACTION_POLISH_CONTRACT.md"].sort()
assert.deepEqual(lines(git("diff", "--name-only", accepted, base)).sort(), admissionRecords)
assert.deepEqual(lines(git("diff", "--name-only", admitted, base)).sort(), [`${run}/admission.json`, `${run}/preflight.json`, `${run}/task.md`].sort())
// Lead-owned artifact recovery: these four admission records differed from the accepted base only by an extra EOF
// blank line. Admit exactly the one-byte cleanup while proving every substantive admission-time byte is unchanged.
const eofOnly = [`${run}/admission.json`, `${run}/linear-ticket-snapshots.md`, `${run}/task.md`, "docs/WORKBENCH_NESTED_GALLERY_INTERACTION_POLISH_CONTRACT.md"]
for (const path of admissionRecords) {
  const before = at(base, path), after = readFileSync(path)
  if (eofOnly.includes(path)) assert.ok(before.subarray(-2).equals(Buffer.from("\n\n")) && after.equals(before.subarray(0, -1)), "Only one EOF blank-line removal admitted: " + path)
  else assert.equal(hash(after), hash(before), "Admission record changed: " + path)
}
const hashes = JSON.parse(read(`${run}/snapshot-hashes.json`))
for (const [id, sha] of Object.entries(hashes.tickets)) {
  assert.equal(hash(readFileSync(`${run}/linear/${id}.json`)), sha, "Ticket snapshot hash: " + id)
  const snapshot = JSON.parse(read(`${run}/linear/${id}.json`))
  assert.equal(snapshot.issue.id, id)
  assert.equal(snapshot.retrievedAt, "2026-09-26T18:01:03.075Z")
  assert.ok(Array.isArray(snapshot.comments) && Array.isArray(snapshot.issue.attachments), "comments/attachments recorded: " + id)
}
assert.equal(hash(at(base, `${run}/linear-ticket-snapshots.md`)), hashes.index)
const admission = JSON.parse(read(`${run}/admission.json`))
const preflight = JSON.parse(read(`${run}/preflight.json`))
assert.equal(admission.acceptedProductBase, accepted)
assert.equal(hash(readFileSync(`${run}/snapshot-hashes.json`)), admission.linearPacket.ticketPayloadHashManifestSha256)
assert.equal(hash(at(base, "docs/WORKBENCH_NESTED_GALLERY_INTERACTION_POLISH_CONTRACT.md")), admission.linearPacket.contractSha256)
assert.equal(hash(at(base, `${run}/task.md`)), preflight.taskSha256)
for (const flag of ["networkAllowed", "credentialsAllowed", "externalActionsAllowed", "paidFallbackAllowed"]) assert.equal(admission[flag], false, flag)

// NGIP-02: bounded delivery. Every change since the admitted base is inside the admitted surfaces.
const admittedPaths = new Set([
  ".gitignore",
  // Gallery, preview Tabs, shared trigger typography, toolbar, and picker scheduling/history.
  ...["App.tsx", "Gallery.tsx", "LiveControls.tsx", "PreviewFrame.tsx", "styles.css", "workbenchTabs.ts", "colorPicker.ts",
    "colorPicker.test.ts", "gallery.test.ts", "history.test.ts", "lifecycle.test.ts"].map(name => `apps/workbench/src/${name}`),
  // Built-in fixtures, their generated CSS and provenance mirrors, and fixture/migration tests.
  "packages/core/src/theme/fixtures/default.json", "packages/core/src/theme/fixtures/valid.json",
  "packages/core/src/theme/fixtures/default.css", "packages/core/src/theme/fixtures/quiet-editorial.css",
  "packages/core/src/context/provenance.ts", "packages/core/src/theme/default.test.ts", "packages/core/src/theme/migrate.test.ts",
  "packages/core/src/theme/theme.test.ts",
  // Browser definitions (Lead-executed).
  "e2e/workbench-nested-gallery-interaction-polish.spec.ts", "e2e/fixtures/flat-gallery-regression.ts", "e2e/workbench-navigation.ts",
  ...["quiet-workspace", "semantic-typography-history-grid", "theme-v2-live-controls", "workbench-control-navigation-scroll",
    "workbench-rendering-controls-polish", "workbench-sidebar-preview-followup", "workbench-sidebar-theme-polish",
    "workbench-theme-controls-polish", "workbench"].map(name => `e2e/${name}.spec.ts`),
  "playwright.config.ts", "playwright.workbench.config.ts",
  // Phase evidence.
  "tools/verify-workbench-nested-gallery-interaction-polish.mjs", "docs/WORKBENCH_NESTED_GALLERY_INTERACTION_POLISH_CHECKPOINT.md",
  ...eofOnly,
])
const tracked = lines(git("ls-tree", "-r", "--name-only", base))
const changed = [...new Set([...lines(git("diff", "--name-only", base)), ...lines(git("ls-files", "--others", "--exclude-standard"))])].sort()
for (const path of changed) {
  assert.ok(admittedPaths.has(path), "Outside admitted scope: " + path)
  assert.doesNotMatch(read(path), /[ \t]+$/m, "Trailing whitespace: " + path)
  const eof = text => (text.endsWith("\n\n") ? "blank" : text.endsWith("\n") ? "newline" : "none")
  const was = tracked.includes(path) ? eof(at(base, path).toString("utf8")) : "newline"
  assert.ok(eof(read(path)) === "newline" || eof(read(path)) === was, "Final newline: " + path)
}
assert.equal(git("diff", "--name-only", "--diff-filter=D", base), "", "No file deletions")
assert.deepEqual(read(".gitignore").split("\n").filter(line => !prior(".gitignore").split("\n").includes(line)), [".worker-tmp/"])

// NGIP-14: everything else is byte-frozen: dependencies, lockfile, registry, public primitives, schema, mutations,
// persistence, migration, proposals, Jev transport, compositions, and every earlier phase verifier.
const frozen = tracked.filter(path => !admittedPaths.has(path))
for (const path of frozen) assert.equal(hash(readFileSync(path)), hash(at(base, path)), "Frozen file changed: " + path)
for (const path of ["package.json", "pnpm-lock.yaml", "registry.json", "packages/ui/components.json", "packages/ui/package.json", "apps/workbench/package.json",
  "packages/core/package.json", "packages/ui/src/components/tabs.tsx", "packages/ui/src/components/button.tsx", "packages/ui/src/components/select.tsx",
  "packages/ui/src/components/collapsible.tsx", "packages/core/src/theme/schema.ts", "packages/core/src/theme/migrate.ts", "packages/core/src/theme/render.ts",
  "packages/core/src/mutations/mutation.ts", "packages/core/src/mutations/proposal.ts", "packages/core/src/theme/fixtures/default.conversion.json",
  "apps/workbench/src/persistence.ts", "apps/workbench/src/history.ts", "apps/workbench/src/lifecycle.ts", "apps/workbench/src/controls.ts",
  "apps/workbench/src/designCommand.ts", "apps/workbench/src/server/designCommandHandler.ts", "packages/core/src/jev-design/wire.ts",
  "tools/verify-semantic-typography-history-grid.mjs",
  ...["account-profile", "notification-preferences", "productive-week", "recent-activity", "room-to-think", "support-request", "team-access", "workspace-settings"].map(name => `packages/ui/src/compositions/${name}.tsx`)]) {
  assert.ok(frozen.includes(path), "Expected frozen: " + path)
}
const registry = JSON.parse(read("registry.json"))
assert.equal(registry.items.length, 19)
assert.deepEqual(readdirSync("public/r").filter(p => p.endsWith(".json") && p !== "registry.json").sort(), registry.items.map(item => item.name + ".json").sort())
const operationNames = source => [...source.matchAll(/^\s+\["(set[A-Za-z]+)", new Set\(/gm)].map(match => match[1])
const operations = operationNames(read("packages/core/src/mutations/mutation.ts"))
assert.equal(operations.length, 12)
assert.deepEqual(operations, ["setColor", "setRadius", "setDensity", "setFontWeight", "setShadowBlur", "setMotionDuration", "setFontFamily", "setTracking", "setRadiusBase", "setSpacingBase", "setShadowProfile", "setSidebarTokensEnabled"])

// NGIP-03/04/05/06: explicit gallery-owned regions; no global span metadata, masonry, dense packing, or placement.
const gallery = code(read("apps/workbench/src/Gallery.tsx"))
assert.doesNotMatch(gallery, /PreviewLayout|data-layout|layout:|"wide"|gridColumn|gridRow|colSpan|span/)
assert.deepEqual([...gallery.matchAll(/\{ id: "([a-z-]+)", render: /g)].map(match => match[1]), [
  "productive-week", "team-access", "account-profile", "notifications", "support-request", "workspace-settings", "recent-activity", "room-to-think",
])
assert.match(gallery, /<div className="quiet-gallery-principal">\s*<div className="quiet-stack" data-gallery-region="activity">\s*<Composition id="productive-week" \/>\s*<Composition id="team-access" \/>\s*<\/div>\s*<div className="quiet-stack" data-gallery-region="profile-actions">\s*<Composition id="account-profile" \/>\s*<Composition id="notifications" \/>\s*<Composition id="support-request" \/>\s*<\/div>\s*<\/div>\s*<Composition id="workspace-settings" \/>\s*<div className="quiet-gallery-pair" data-gallery-region="local-pair">\s*<Composition id="recent-activity" \/>\s*<Composition id="room-to-think" \/>\s*<\/div>/)
const styles = code(read("apps/workbench/src/styles.css"))
assert.match(styles, /\.quiet-gallery, \.quiet-stack \{ display: flex; flex-direction: column; gap: 16px; \}/)
assert.match(styles, /@media \(min-width: 60rem\) \{\s*\.quiet-gallery-principal \{ grid-template-columns: minmax\(0, 7fr\) minmax\(0, 5fr\); \}/)
assert.match(styles, /@media \(min-width: 40rem\) \{\s*\.quiet-gallery-pair \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/)
assert.doesNotMatch(styles, /dense|masonry|aspect-ratio|grid-auto-rows|grid-column|grid-row|position: absolute|data-layout/)
assert.match(read("e2e/fixtures/flat-gallery-regression.ts"), /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)[\s\S]*grid-column:span 2/)
for (const path of lines(git("ls-files", "apps", "packages"))) {
  if (/\.(tsx?|css)$/.test(path) && !/\.test\.tsx?$/.test(path)) assert.doesNotMatch(read(path), /\bPreviewLayout\b/, "PreviewLayout remains: " + path)
}

// NGIP-07: official shadcn Tabs replace the preview Select, sharing the sidebar trigger class.
const preview = read("apps/workbench/src/PreviewFrame.tsx")
const app = read("apps/workbench/src/App.tsx")
assert.match(preview, /import \{ Tabs, TabsList, TabsTrigger, TabsContent \} from "@personal-ui\/ui\/components\/tabs"/)
assert.doesNotMatch(preview, /components\/select|<Select|quiet-preview-view|justify-center/)
assert.match(preview, /<TabsList className="quiet-categories w-max flex-nowrap justify-start bg-transparent p-0" aria-label="Preview views">\s*<TabsTrigger value="cards" className=\{CATEGORY_TRIGGER_CLASS\}>Cards<\/TabsTrigger>\s*<TabsTrigger value="states" className=\{CATEGORY_TRIGGER_CLASS\}>States<\/TabsTrigger>/)
assert.match(app, /<TabsList className="quiet-categories w-max flex-nowrap justify-start bg-transparent p-0" aria-label="Editor categories">/)
for (const source of [preview, app]) assert.match(source, /import \{ CATEGORY_TRIGGER_CLASS \} from "\.\/workbenchTabs"/)
assert.doesNotMatch(app, /const CATEGORY_TRIGGER_CLASS/)
assert.doesNotMatch(styles, /quiet-preview-view/)

// NGIP-08: the shared ControlSection trigger inherits Body family, weight, and tracking, with no Heading role or
// competing local weight/tracking; approved size, uppercase, colours, ring, radius, and chevron remain.
const controls = read("apps/workbench/src/LiveControls.tsx")
const section = controls.slice(controls.indexOf("export function ControlSection"), controls.indexOf("</Collapsible>", controls.indexOf("export function ControlSection")))
assert.match(section, /<h3 className="text-sm">/)
assert.doesNotMatch(section, /type-heading|font-medium|font-semibold|tracking-/)
assert.match(section, /className="h-auto w-fit cursor-pointer rounded-sm bg-muted px-2 py-0\.5 quiet-section-trigger text-\[0\.6875rem\] uppercase text-muted-foreground ring-1 ring-border /)
assert.match(styles, /\.quiet-section-trigger \{ font-family: inherit; font-weight: inherit; letter-spacing: inherit; \}/)

// NGIP-09: both built-ins use their own Body sans stack for Heading; everything else is the accepted value.
for (const [name, css] of [["default", "default.css"], ["valid", "quiet-editorial.css"]]) {
  const path = `packages/core/src/theme/fixtures/${name}.json`
  const now = JSON.parse(read(path)), was = JSON.parse(prior(path))
  assert.deepEqual(now.typography.heading.font, now.typography.body.font, name + ": Heading uses the Body stack")
  assert.equal(now.typography.body.font.$value.at(-1) === "sans-serif" || now.typography.body.font.$value.includes("sans-serif"), true)
  assert.deepEqual(now.typography.body, was.typography.body)
  assert.deepEqual(now.typography.mono, was.typography.mono)
  assert.deepEqual([now.typography.heading.weight, now.typography.heading.tracking], [was.typography.heading.weight, was.typography.heading.tracking])
  assert.equal(now.typography.heading.weight.$value, 600)
  assert.equal(now.typography.body.weight.$value, 400)
  assert.deepEqual({ ...now, typography: null }, { ...was, typography: null }, name + ": only typography.heading.font changed")
  const sheet = read(`packages/core/src/theme/fixtures/${css}`)
  const variable = key => sheet.match(new RegExp(`^  --${key}: ([^;]+);$`, "m"))[1]
  assert.equal(variable("font-heading"), variable("font-body"), css)
  assert.deepEqual(lines(git("diff", "-U0", accepted, "--", `packages/core/src/theme/fixtures/${css}`)).filter(line => /^[-+] /.test(line)).map(line => line.slice(0, 17)), ["-  --font-heading", "+  --font-heading"])
}
const provenance = read("packages/core/src/context/provenance.ts")
for (const [id, path] of [["theme:default", "default.json"], ["theme:quiet-editorial", "valid.json"]]) {
  const entry = provenance.match(new RegExp(`"${id}": \\{\\s*sourceId: "packages/core/src/theme/fixtures/${path}",\\s*sha256: "([0-9a-f]{64})"`))
  assert.ok(entry, id)
  assert.equal(entry[1], hash(readFileSync(`packages/core/src/theme/fixtures/${path}`)), "provenance mirror: " + id)
}

// NGIP-10: arbitrary legacy migration still maps serif to Heading (the migration source is frozen above).
assert.match(read("packages/core/src/theme/migrate.ts"), /heading: role\(serif, V3_MIGRATION_DEFAULTS\.headingWeight\),\s*body: role\(sans, V3_MIGRATION_DEFAULTS\.bodyWeight\),/)
assert.match(read("packages/ui/src/lib/fonts.ts"), /serif: \["ui-serif", "Georgia", "serif"\]/)

// NGIP-11: recovery | file grouping, a short semantic separator, enabled-only pointers, and the Export label.
const toolbar = app.slice(app.indexOf('data-testid="workbench-toolbar"'))
const order = ['aria-label="Undo"', 'aria-label="Redo"', 'aria-label="Reset"', 'role="separator"', 'title="Export"', 'title="Save"'].map(needle => toolbar.indexOf(needle))
assert.ok(order.every((index, i) => index > 0 && (i === 0 || index > order[i - 1])), "Undo Redo Reset | Export Save")
assert.match(toolbar, /<\/div>\s*<div role="separator" aria-orientation="vertical" className="h-8 w-px shrink-0 bg-border" \/>/)
for (const name of ["Undo", "Redo", "Reset"]) assert.match(toolbar, new RegExp(`className="size-8 enabled:cursor-pointer disabled:cursor-default" aria-label="${name}" title="${name}"`))
assert.match(toolbar, /<span className="max-sm:sr-only">Export<\/span>/)
assert.match(toolbar, /download\(exportThemeJson\(currentRef\.current\)\)/)
assert.doesNotMatch(app, /Export JSON/)

// NGIP-12/13: one shared 120ms controller for semantic and shadow pickers; text entry stays immediate; lifecycle
// boundaries flush or cancel before they read or replace the active theme.
const picker = read("apps/workbench/src/colorPicker.ts")
assert.match(picker, /export const PICKER_DEBOUNCE_MS = 120\n/)
assert.match(picker, /if \(generation !== this\.generation \|\| !this\.active\(owner\)\) return/)
assert.equal((app.match(/picker=\{picker\}/g) ?? []).length, 2)
assert.match(app, /const \[picker\] = React\.useState\(\(\) => new ColorPickerController\(/)
assert.match(app, /React\.useEffect\(\(\) => \(\) => picker\.cancel\(\), \[picker\]\)/)
assert.match(app, /React\.useLayoutEffect\(\(\) => \{ if \(locked\) picker\.cancel\(\) \}, \[locked, picker\]\)/)
assert.match(app, /const evaluateCommand = async \(\) => \{\s*\/\/[^\n]*\n\s*endGesture\(\)\s*const commandBase = currentRef\.current/)
assert.match(app, /const load = \(id: string\) => \{\s*endGesture\(\)/)
assert.match(app, /onCheckedChange=\{\(checked\) => \{ endGesture\(\); setMode/)
assert.match(app, /const save = \(event: React\.MouseEvent\) => \{\s*endGesture\(\)/)
assert.match(app, /saveTheme\(window\.localStorage, saved, currentRef\.current,/)
const field = controls.slice(controls.indexOf("export function LiveColorField"), controls.indexOf("export function LiveFontField"))
assert.match(field, /onInput=\{\(event\) => move\(event\.currentTarget\.value\)\}/)
assert.match(field, /latestMove\.current = move/)
assert.match(field, /input\.addEventListener\("change", change\)/)
assert.match(field, /onPointerUp=\{\(\) => picker\.finish\(owner\)\}\s*onBlur=\{\(\) => picker\.finish\(owner\)\}/)
assert.match(field, /onFocus=\{\(\) => picker\.finish\(\)\}/)
assert.match(field, /commit\(event\.target\.value\.trim\(\), id\)/)
assert.equal((field.match(/picker\.move\(/g) ?? []).length, 1, "only picker movement is scheduled")

// NGIP-14: no network, credential, or provider surface in changed product code or the client bundle.
for (const path of changed.filter(path => /^apps\/workbench\/src\/.*\.tsx?$/.test(path) && !path.endsWith(".test.ts"))) {
  assert.doesNotMatch(read(path), /\bfetch\(|XMLHttpRequest|WebSocket|EventSource|navigator\.sendBeacon|localStorage\.[a-zA-Z]+\([^)]*history/i, path)
}
const bundleFiles = readdirSync("apps/workbench/dist/assets").filter(name => name.endsWith(".js"))
assert.ok(bundleFiles.length > 0, "build the workbench first")
for (const file of bundleFiles) assert.doesNotMatch(read(`apps/workbench/dist/assets/${file}`), /TYPESAFE_|api\.typesafe\.ai|sk-[A-Za-z0-9]{20}/, file)

console.log(JSON.stringify({ ok: true, phase, changed: changed.length, frozen: frozen.length, operations: operations.length, registry: registry.items.length }))
