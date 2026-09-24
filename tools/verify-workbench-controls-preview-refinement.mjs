// WCPR-01 / WCPR-09 / WCPR-17 frozen-boundary, catalog, dependency, terminology, bundle, credential, and network scan
// for workbench-controls-preview-refinement-v1-001. Run from the repository root after `pnpm build:workbench`.
// Reads candidate files (including uncommitted edits), named Git bases, and the local build. No network, no environment.
import { readFileSync, readdirSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import assert from "node:assert/strict"

const accepted = "d1db3ab3af931aa66b02119dfe37c2b6dcce7736"
const prepared = "c68c8a2fd4eec0e78ba9e4a82c5fa4353a0413d9"
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
const list = (base, ...paths) => git("ls-tree", "-r", "--name-only", base, "--", ...paths).trim().split("\n").filter(Boolean)
const same = (base, file) => assert.equal(readFileSync(file, "utf8"), git("show", `${base}:${file}`), `Frozen boundary changed since ${base.slice(0, 7)}: ${file}`)

// Scope includes the full handoff plus this continuation, not just committed HEAD.
const changed = [...new Set([
  ...git("diff", "--name-only", prepared).trim().split("\n"),
  ...git("ls-files", "--others", "--exclude-standard").trim().split("\n"),
])].filter(Boolean).sort()
const admitted = [
  /^apps\/workbench\/src\/(App\.tsx|LiveControls\.tsx|controls\.ts|lifecycle\.ts|lifecycle\.test\.ts|styles\.css|main\.tsx)$/,
  /^e2e\/[a-z0-9-]+\.(spec\.)?ts$/,
  /^packages\/ui\/src\/components\/(select|combobox|chart)(\.stories)?\.tsx$/,
  /^packages\/ui\/src\/(fonts|foundation)\.test\.ts$/,
  /^packages\/ui\/src\/lib\/(fonts|font-faces)\.ts$/,
  /^packages\/ui\/src\/compositions\/productive-week\.tsx$/,
  /^packages\/core\/README\.md$/,
  /^packages\/core\/src\/constraints\/(component-state(\.test)?\.ts|fixtures\/(valid|invalid)\.json)$/,
  /^packages\/core\/src\/context\/(context\.[a-z0-9.-]+\.test\.ts|evaluator\.ts|provenance\.ts)$/,
  /^packages\/core\/src\/contracts\/(catalog\.ts|contracts\.test\.ts|data\/(select|combobox|chart)\.ts)$/,
  /^registry\.json$/,
  /^docs\/WORKBENCH_CONTROLS_PREVIEW_REFINEMENT_(CHECKPOINT|CONTRACT)\.md$/,
  /^tools\/verify-workbench-controls-preview-refinement\.mjs$/,
]
for (const file of changed) assert.ok(admitted.some(pattern => pattern.test(file)), `Outside admitted scope: ${file}`)

// Frozen canonical state, transport and pre-existing resources. The three additions are the only resource expansion.
const frozen = list(prepared,
  "packages/core/src/theme", "packages/core/src/mutations", "packages/core/src/jev-design",
  "packages/core/src/rules", "packages/core/src/contracts/schema.ts",
  "apps/workbench/src/server", "apps/workbench/src/designCommand.ts",
  "apps/workbench/src/messages.ts", "apps/workbench/src/persistence.ts",
  "apps/workbench/src/PreviewFrame.tsx", "apps/workbench/src/Gallery.tsx", "apps/workbench/src/layout.ts",
  "apps/workbench/index.html", "apps/workbench/vite.config.ts",
  "packages/ui/src/styles", "packages/ui/.storybook", "tools/loop/jev",
  "playwright.config.ts", "playwright.workbench.config.ts", "playwright.designcommand.config.ts",
  "vitest.config.ts", "e2e/fixtures"
)
const priorComponents = list(prepared, "packages/ui/src/components")
frozen.push(...priorComponents, ...list(prepared, "packages/ui/src/compositions").filter(f => !f.endsWith("/productive-week.tsx")))
for (const file of frozen) same(prepared, file)
const additions = ["select", "combobox", "chart"].flatMap(name => [`${name}.tsx`, `${name}.stories.tsx`])
assert.deepEqual(readdirSync("packages/ui/src/components").sort(), [...priorComponents.map(f => f.split("/").at(-1)), ...additions].sort())
// Handoff's closed catalog and local-face imports cannot drift during continuation.
for (const file of ["packages/ui/src/lib/fonts.ts", "packages/ui/src/lib/font-faces.ts"]) same("628d1af11843ee661384b424585cdda6edaf515f", file)

const registry = JSON.parse(readFileSync("registry.json", "utf8"))
assert.equal(registry.items.length, 16)
const previousRegistry = JSON.parse(git("show", `${prepared}:registry.json`))
assert.deepEqual(registry.items.map(i => i.name).sort(), [...previousRegistry.items.map(i => i.name), "select", "combobox", "chart"].sort())
const catalog = readFileSync("packages/core/src/contracts/catalog.ts", "utf8")
const catalogIds = [...catalog.matchAll(/^\s+"?([a-z-]+)"?: \(\) => import/gm)].map(m => m[1]).sort()
assert.deepEqual(catalogIds, registry.items.map(i => i.name).sort())

// Dependencies and lockfile: exactly the prepared base's.
for (const file of ["package.json", "packages/core/package.json", "packages/ui/package.json", "apps/workbench/package.json", "pnpm-lock.yaml"]) same(prepared, file)

// The closed operation union is unchanged (core is frozen above; this names it in the receipt).
const mutation = readFileSync("packages/core/src/mutations/mutation.ts", "utf8")
const ops = [...mutation.matchAll(/^\s+\["(set[A-Za-z]+)", new Set/gm)].map((m) => m[1])
assert.deepEqual(ops, ["setColor", "setRadius", "setDensity", "setSansFamily", "setShadowBlur", "setMotionDuration", "setFontFamily", "setTracking", "setRadiusBase", "setSpacingBase", "setShadowProfile"])

// WCPR-09 / WCPR-10: no fixed preview width, device selector, Fork, or baseline-diff UI remains in the
// Workbench presentation source; manual colour edits still build only `setColor`.
const app = readFileSync("apps/workbench/src/App.tsx", "utf8")
const presentationUi = ["apps/workbench/src/App.tsx", "apps/workbench/src/LiveControls.tsx", "apps/workbench/src/styles.css", "apps/workbench/src/layout.ts"]
for (const file of presentationUi) {
  assert.doesNotMatch(readFileSync(file, "utf8"), /\bfork|baseline|Preview width|Mobile 390|Desktop 1024|WIDTHS|initialPreviewWidth|SingleToggleGroup|(?<!proposal-)diff-(?:list|count|empty)/i, `Removed UI or terminology remains: ${file}`)
}
for (const file of ["apps/workbench/src/App.tsx", "apps/workbench/src/lifecycle.ts"]) {
  assert.doesNotMatch(readFileSync(file, "utf8"), /Mutation proposal|Proposal JSON|Stage proposal|Insert example|proposal-log|proposalText|parseProposalJson|exampleProposalJson|>Proposal<|theme-meta/)
}
assert.match(app, /<Select items=\{themeSelectItems\} value=\{current.id\}/)
assert.match(app, /FIELD_LABEL_CLASS/)
assert.match(app, /applyProposal\(session, current/)
assert.match(app, /discardProposal\(session, current/)
assert.match(app, /stageProposal\(session, current/)
assert.match(app, /<Switch\b/)
// Proposal candidate diffs remain.
assert.match(app, /data-testid="proposal-diff-list"/)
assert.match(app, /op: "setColor", mode, token, value: raw/)
assert.equal((app.match(/<ResizableHandle\b/g) ?? []).length, 1)
assert.doesNotMatch(readFileSync("apps/workbench/src/LiveControls.tsx", "utf8"), /onPointer|onKeyDown|addEventListener/, "No bespoke interaction handlers")

// Client bundle and presentation sources: no credential, product-AI transport, or new network surface.
const bundleFiles = readdirSync("apps/workbench/dist/assets").filter((n) => /\.(js|css)$/.test(n))
assert.ok(bundleFiles.length > 0, "build the workbench first")
for (const file of bundleFiles) {
  const source = readFileSync(`apps/workbench/dist/assets/${file}`, "utf8")
  if (file.endsWith(".css")) {
    const faces = [...source.matchAll(/@font-face\s*\{[^}]*\}/g)].map(match => match[0])
    assert.ok(faces.length > 0, "Local font faces must be in the Workbench CSS")
    // Vite may inline small pinned Fontsource fallbacks as data URLs; these make no runtime request.
    for (const face of faces) assert.doesNotMatch(face, /url\(\s*["']?(?:https?:|\/\/)/i, "Font source must be a local or embedded build asset")
  }
  assert.doesNotMatch(
    readFileSync(`apps/workbench/dist/assets/${file}`, "utf8"),
    /TYPESAFE_(?:PERSONAL_UI_SYSTEM_API_KEY|LOOP_ENGINEERING_API_KEY|API_KEY)|api\.typesafe\.ai|@loop-engineering\/jev-core|loop-sentinel-must-never-be-read|generic-sentinel-must-never-be-read|fonts\.googleapis\.com|fonts\.gstatic\.com/
  )
}
for (const file of ["apps/workbench/src/App.tsx", "apps/workbench/src/LiveControls.tsx", "apps/workbench/src/controls.ts", "apps/workbench/src/lifecycle.ts", "apps/workbench/src/layout.ts"]) {
  assert.doesNotMatch(readFileSync(file, "utf8"), /\bfetch\s*\(|XMLHttpRequest|WebSocket|process\.env|import\.meta\.env|TYPESAFE_/, `New network/credential surface: ${file}`)
}
// App.tsx keeps its single pre-existing product API call path (designCommand.ts), not a new one.
assert.equal((app.match(/evaluateDesignCommandClient\(/g) ?? []).length, 1)

const hash = (files) => createHash("sha256").update(files.map((file) => `${file}\0${readFileSync(file, "utf8")}`).join("\0")).digest("hex")
console.log(
  JSON.stringify(
    {
      observedAt: new Date().toISOString(),
      acceptedBase: accepted,
      preparedBase: prepared,
      head: git("rev-parse", "HEAD").trim(),
      candidateState: git("status", "--porcelain").trim() ? "uncommitted" : "clean",
      candidateSha256: hash(changed),
      result: "pass",
      changedFiles: changed,
      frozenFileCount: frozen.length,
      frozenSha256: hash(frozen),
      preservedComponentFiles: priorComponents.length,
      registryCount: registry.items.length,
      registrySha256: createHash("sha256").update(readFileSync("registry.json")).digest("hex"),
      operationCount: ops.length,
      clientBundlesScanned: bundleFiles,
      credentialAndNetworkScan: "pass",
      note: "Producer boundary scan only; no acceptance or protected verification. No credential values or environment variables read.",
    },
    null,
    2
  )
)
