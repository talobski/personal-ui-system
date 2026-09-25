// WSSP-01 / WSSP-02 / WSSP-14 / WSSP-15 admitted-scope, frozen-boundary, catalog, dependency, shell, token, bundle,
// credential, and network scan for workbench-sidebar-system-polish-v1-001. Run from the repository root after
// `pnpm build:workbench`. Reads candidate files (including uncommitted edits), named Git bases, and the local build.
// No network, no environment variables, no credential values.
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import assert from "node:assert/strict"

const accepted = "b2952d17f240abb2bf1e7e87f20f14281399015d"
const prepared = "a243830a3f5ab9daf8c67a08e65d337240298f80"
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
const list = (base, ...paths) => git("ls-tree", "-r", "--name-only", base, "--", ...paths).trim().split("\n").filter(Boolean)
const read = (file) => readFileSync(file, "utf8")
const same = (base, file) => assert.equal(read(file), git("show", `${base}:${file}`), `Frozen boundary changed since ${base.slice(0, 7)}: ${file}`)

// The prepared base differs from the accepted product base only by the phase admission (brief and contract).
assert.deepEqual(git("diff", "--name-only", accepted, prepared).trim().split("\n").sort(), ["BRIEF.md", "docs/WORKBENCH_SIDEBAR_SYSTEM_POLISH_CONTRACT.md"])

// WSSP-01: every candidate change (committed, staged, unstaged, or untracked) is inside the admitted batch.
const changed = [...new Set([
  ...git("diff", "--name-only", prepared).trim().split("\n"),
  ...git("ls-files", "--others", "--exclude-standard").trim().split("\n"),
])].filter(Boolean).sort()
const admitted = [
  /^apps\/workbench\/src\/(App\.tsx|PreviewFrame\.tsx|persistence\.ts|lifecycle\.test\.ts|styles\.css|layout\.ts)$/,
  /^e2e\/[a-z0-9-]+\.(spec\.)?ts$/,
  /^packages\/ui\/src\/components\/(sidebar|avatar)(\.stories)?\.tsx$/,
  /^packages\/ui\/src\/components\/field(\.stories)?\.tsx$/,
  /^packages\/ui\/src\/compositions\/(account-profile|team-access)\.tsx$/,
  /^packages\/ui\/src\/(foundation|quiet-workspace|avatar)\.test\.ts$/,
  /^packages\/core\/README\.md$/,
  /^packages\/core\/src\/constraints\/(component-state(\.test)?\.ts|fixtures\/(valid|invalid)\.json)$/,
  /^packages\/core\/src\/context\/(context\.[a-z0-9.-]+\.test\.ts|evaluator\.ts|provenance\.ts)$/,
  /^packages\/core\/src\/contracts\/(catalog\.ts|contracts\.test\.ts|data\/(sidebar|avatar)\.ts)$/,
  /^registry\.json$/,
  /^docs\/WORKBENCH_SIDEBAR_SYSTEM_POLISH_(CHECKPOINT|CONTRACT)\.md$/,
  /^tools\/verify-workbench-sidebar-system-polish\.mjs$/,
]
for (const file of changed) assert.ok(admitted.some((pattern) => pattern.test(file)), `Outside admitted scope: ${file}`)
// The only deletion is the Workbench-only resizable layout helper.
const deleted = git("diff", "--name-only", "--diff-filter=D", prepared).trim().split("\n").filter(Boolean)
assert.deepEqual(deleted, ["apps/workbench/src/layout.ts"])

// WSSP-14: frozen canonical state, transport, Design Command, persistence format helpers, and unrelated resources.
const frozen = list(prepared,
  "packages/core/src/theme", "packages/core/src/mutations", "packages/core/src/jev-design", "packages/core/src/rules",
  "packages/core/src/contracts/contract.ts", "packages/core/src/context/cli.ts", "packages/core/src/context/types.ts",
  "packages/core/src/context/serialize.ts", "packages/core/src/context/themes.ts", "packages/core/src/index.ts",
  "apps/workbench/src/server", "apps/workbench/src/designCommand.ts", "apps/workbench/src/messages.ts",
  "apps/workbench/src/Gallery.tsx", "apps/workbench/src/controls.ts", "apps/workbench/src/lifecycle.ts",
  "apps/workbench/src/LiveControls.tsx", "apps/workbench/src/main.tsx",
  "apps/workbench/index.html", "apps/workbench/vite.config.ts",
  "packages/ui/src/styles", "packages/ui/src/lib", "packages/ui/.storybook", "tools/loop/jev",
  "playwright.config.ts", "playwright.workbench.config.ts", "playwright.designcommand.config.ts",
  "vitest.config.ts", "e2e/fixtures"
)
const priorComponents = list(prepared, "packages/ui/src/components")
frozen.push(...priorComponents.filter((file) => !/\/field(\.stories)?\.tsx$/.test(file)))
frozen.push(...list(prepared, "packages/ui/src/compositions").filter((file) => !/\/(account-profile|team-access)\.tsx$/.test(file)))
const priorContracts = list(prepared, "packages/core/src/contracts/data")
frozen.push(...priorContracts)
for (const file of frozen) same(prepared, file)
const additions = ["sidebar", "avatar"].flatMap((name) => [`${name}.tsx`, `${name}.stories.tsx`])
assert.deepEqual(readdirSync("packages/ui/src/components").sort(), [...priorComponents.map((f) => f.split("/").at(-1)), ...additions].sort())
assert.deepEqual(readdirSync("packages/core/src/contracts/data").sort(), [...priorContracts.map((f) => f.split("/").at(-1)), "avatar.ts", "sidebar.ts"].sort())

// WSSP-02: exactly eighteen registry items; the two additions are the only new public resources.
const registry = JSON.parse(read("registry.json"))
const previousRegistry = JSON.parse(git("show", `${prepared}:registry.json`))
assert.equal(registry.items.length, 18)
assert.deepEqual(registry.items.map((i) => i.name).sort(), [...previousRegistry.items.map((i) => i.name), "sidebar", "avatar"].sort())
for (const item of previousRegistry.items) assert.deepEqual(registry.items.find((i) => i.name === item.name), item, `Registry item changed: ${item.name}`)
const catalog = read("packages/core/src/contracts/catalog.ts")
const catalogIds = [...catalog.matchAll(/^\s+"?([a-z-]+)"?: \(\) => import/gm)].map((m) => m[1]).sort()
assert.deepEqual(catalogIds, registry.items.map((i) => i.name).sort())
const evaluator = read("packages/core/src/context/evaluator.ts")
assert.match(evaluator, /  sidebar: "pattern",\n  avatar: "component",\n\} as const\)/)
const provenance = read("packages/core/src/context/provenance.ts")
for (const name of ["sidebar", "avatar"]) {
  const sha = createHash("sha256").update(readFileSync(`packages/core/src/contracts/data/${name}.ts`)).digest("hex")
  assert.ok(provenance.includes(`sourceId: "packages/core/src/contracts/data/${name}.ts",\n    sha256: "${sha}"`), `Provenance hash for ${name}`)
}
// resizable-panel stays published and byte-for-byte unchanged (source, story, contract, registry item).
for (const file of ["packages/ui/src/components/resizable-panel.tsx", "packages/ui/src/components/resizable-panel.stories.tsx", "packages/core/src/contracts/data/resizable-panel.ts"]) same(accepted, file)
assert.ok(registry.items.some((i) => i.name === "resizable-panel"))

// Dependencies and lockfile are exactly the prepared base's; the new sources use only pinned families.
for (const file of ["package.json", "packages/core/package.json", "packages/ui/package.json", "apps/workbench/package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"]) same(prepared, file)
const sidebar = read("packages/ui/src/components/sidebar.tsx")
const avatar = read("packages/ui/src/components/avatar.tsx")
const imports = (source) => [...source.matchAll(/^import [^"]*"([^"]+)"/gm)].map((m) => m[1]).sort()
assert.deepEqual(imports(sidebar), ["@base-ui/react/dialog", "@personal-ui/ui/components/button", "@personal-ui/ui/components/input", "@personal-ui/ui/components/separator", "class-variance-authority", "cn", "lucide-react", "radix-ui", "react"])
assert.deepEqual(imports(avatar), ["cn", "radix-ui", "react"])
// Semantic tokens only: no sidebar-specific tokens, literal colours, cookies, storage, or remote URLs.
for (const [name, source] of [["sidebar", sidebar], ["avatar", avatar]]) {
  assert.doesNotMatch(source, /(?:bg|text|border|ring|outline|shadow)-sidebar|--sidebar-(?:background|foreground|accent|border|ring|primary)|hsl\(|#[0-9a-f]{3,8}\b|document\.cookie|localStorage|sessionStorage|https?:\/\//i, `${name} token/storage/network boundary`)
}

// The closed operation union is unchanged (core mutations are frozen above; this names it in the receipt).
const mutation = read("packages/core/src/mutations/mutation.ts")
const ops = [...mutation.matchAll(/^\s+\["(set[A-Za-z]+)", new Set/gm)].map((m) => m[1])
assert.deepEqual(ops, ["setColor", "setRadius", "setDensity", "setSansFamily", "setShadowBlur", "setMotionDuration", "setFontFamily", "setTracking", "setRadiusBase", "setSpacingBase", "setShadowProfile"])

// WSSP-03 / WSSP-04: one Sidebar shell, no top header, no Workbench resizable split, no mobile mode tabs.
const app = read("apps/workbench/src/App.tsx")
const styles = read("apps/workbench/src/styles.css")
assert.equal((app.match(/<SidebarProvider\b/g) ?? []).length, 1)
assert.equal((app.match(/<Sidebar\b[ >]/g) ?? []).length, 1)
for (const part of ["<SidebarHeader", "<SidebarContent", "<SidebarInset", "<SidebarTrigger", '"--sidebar-width": "22rem"']) assert.ok(app.includes(part), `Shell part missing: ${part}`)
assert.ok(app.indexOf("<SidebarHeader") < app.indexOf("<Select items={themeSelectItems}") && app.indexOf("<Select items={themeSelectItems}") < app.indexOf("<SidebarContent"), "Theme Select lives in SidebarHeader")
assert.doesNotMatch(app, /Resizable|resizable-panel|editorBounds|<header\b|quiet-header|Workspace mode|mobileMode|"Editor category"/)
assert.doesNotMatch(styles, /quiet-header|quiet-split|quiet-handle|quiet-mobile-tabs|quiet-modes|quiet-category-select/)
assert.ok(!existsSync("apps/workbench/src/layout.ts"))
// WSSP-05 / WSSP-06: swatches, sibling delete action for the active custom theme only, ResponsiveDialog confirmation.
assert.match(app, /const SWATCH_TOKENS = \["primary", "accent", "secondary", "border"\] as const/)
assert.equal((app.match(/<ThemeSwatches\b/g) ?? []).length, 3)
assert.match(app, /const activeCustom = !builtInCopy && Object\.hasOwn\(saved\.themes, current\.id\)/)
assert.match(app, /\{activeCustom && \(\s*<ResponsiveDialog open=\{deleteOpen\}/)
assert.ok(!app.slice(app.indexOf("<SelectTrigger"), app.indexOf("</Select>")).includes("SidebarMenuAction"), "Delete action is not inside the Select")
assert.match(read("apps/workbench/src/persistence.ts"), /return write\(storage, \{ themes, activeId: fallbackId, bases \}\)/)
// WSSP-07: scrollbar styling is scoped to .quiet-scroll, applied to the sidebar content and the preview document only.
for (const rule of styles.split("}").filter((block) => /scrollbar/.test(block))) assert.match(rule.split("{")[0], /\.quiet-scroll|@supports/, `Unscoped scrollbar rule: ${rule.trim().slice(0, 60)}`)
assert.equal((app.match(/quiet-scroll/g) ?? []).length, 1)
assert.match(read("apps/workbench/src/PreviewFrame.tsx"), /document\.documentElement\.classList\.add\("quiet-scroll"\)/)
assert.doesNotMatch(read("packages/ui/src/styles/globals.css"), /scrollbar/)
// WSSP-08: every initials-style avatar uses Avatar with avatarInitial; no two-letter initials remain.
for (const file of [...list(prepared, "packages/ui/src/compositions"), ...readdirSync("packages/ui/src/components").map((f) => `packages/ui/src/components/${f}`)]) {
  const source = read(file)
  assert.doesNotMatch(source, /rounded-full[^>]*>\s*(?:[A-Z]{2,3}|\{initials\})\s*</, `Hand-rolled initials remain: ${file}`)
  if (/<AvatarFallback/.test(source)) assert.match(source, /<AvatarFallback[^>]*>\{avatarInitial\(/, `Avatar fallback must use avatarInitial: ${file}`)
}
for (const file of ["packages/ui/src/compositions/account-profile.tsx", "packages/ui/src/compositions/team-access.tsx"]) assert.match(read(file), /<Avatar aria-hidden="true"/)
// WSSP-09: vertical Field is gap-2; horizontal and responsive keep gap-3; the base carries no gap.
const field = read("packages/ui/src/components/field.tsx")
assert.match(field, /"group\/field flex w-full data-\[invalid=true\]:text-destructive"/)
assert.match(field, /vertical: \["flex-col gap-2 /)
assert.match(field, /"flex-row items-center gap-3"/)
assert.match(field, /"gap-3 flex-col @md\/field-group:flex-row/)
const priorField = git("show", `${prepared}:packages/ui/src/components/field.tsx`)
const fieldOutsideVariants = (source) => {
  const start = source.search(/(?:\/\/ Ordinary vertical[^\n]*\n)?const fieldVariants/)
  return source.slice(0, start) + source.slice(source.indexOf("function Field("))
}
assert.equal(fieldOutsideVariants(field), fieldOutsideVariants(priorField), "Only the Field orientation variants changed")
// WSSP-10: manual Density control removed; programmatic density is intact (schema, renderer, mutation, controls frozen).
assert.doesNotMatch(app, /numeric\("density"\)|"Density"/)
assert.match(read("apps/workbench/src/controls.ts"), /density: \{/)
assert.match(read("packages/core/src/theme/schema.ts"), /density/)
// WSSP-11: the proposal lifecycle and manual edit path are still wired through core.
for (const pattern of [/applyProposal\(session, current/, /discardProposal\(session, current/, /stageProposal\(session, current/, /op: "setColor", mode, token, value: raw/, /data-testid="proposal-diff-list"/, /<Switch\b/, /exportThemeJson\(current\)/]) assert.match(app, pattern)
assert.equal((app.match(/evaluateDesignCommandClient\(/g) ?? []).length, 1)

// Client bundle and presentation sources: no credential, product-AI transport, or new network surface.
const bundleFiles = readdirSync("apps/workbench/dist/assets").filter((n) => /\.(js|css)$/.test(n))
assert.ok(bundleFiles.length > 0, "build the workbench first")
for (const file of bundleFiles) {
  const source = read(`apps/workbench/dist/assets/${file}`)
  if (file.endsWith(".css")) {
    for (const face of [...source.matchAll(/@font-face\s*\{[^}]*\}/g)].map((m) => m[0])) assert.doesNotMatch(face, /url\(\s*["']?(?:https?:|\/\/)/i, "Font source must be local or embedded")
  }
  assert.doesNotMatch(source, /TYPESAFE_(?:PERSONAL_UI_SYSTEM_API_KEY|LOOP_ENGINEERING_API_KEY|API_KEY)|api\.typesafe\.ai|@loop-engineering\/jev-core|loop-sentinel-must-never-be-read|generic-sentinel-must-never-be-read|fonts\.googleapis\.com|fonts\.gstatic\.com/)
}
for (const file of ["apps/workbench/src/App.tsx", "apps/workbench/src/PreviewFrame.tsx", "apps/workbench/src/persistence.ts", "packages/ui/src/components/sidebar.tsx", "packages/ui/src/components/avatar.tsx"]) {
  assert.doesNotMatch(read(file), /\bfetch\s*\(|XMLHttpRequest|WebSocket|process\.env|import\.meta\.env|TYPESAFE_/, `New network/credential surface: ${file}`)
}

const existing = changed.filter((file) => existsSync(file))
const hash = (files) => createHash("sha256").update(files.map((file) => `${file}\0${read(file)}`).join("\0")).digest("hex")
console.log(
  JSON.stringify(
    {
      observedAt: new Date().toISOString(),
      phase: "workbench-sidebar-system-polish-v1-001",
      acceptedBase: accepted,
      preparedBase: prepared,
      head: git("rev-parse", "HEAD").trim(),
      candidateState: git("status", "--porcelain").trim() ? "uncommitted" : "clean",
      candidateSha256: hash(existing),
      result: "pass",
      changedFiles: changed,
      deletedFiles: deleted,
      frozenFileCount: frozen.length,
      frozenSha256: hash(frozen),
      registryCount: registry.items.length,
      registrySha256: createHash("sha256").update(readFileSync("registry.json")).digest("hex"),
      operationCount: ops.length,
      clientBundlesScanned: bundleFiles,
      credentialAndNetworkScan: "pass",
      note: "Producer boundary scan only; no acceptance, protected verification, or browser evidence. No credential values or environment variables read.",
    },
    null,
    2
  )
)
