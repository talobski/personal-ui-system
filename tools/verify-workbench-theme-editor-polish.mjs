// WTEP-01 / WTEP-07 / WTEP-14 frozen-boundary, catalog, dependency, terminology, bundle, credential, and network scan
// for workbench-theme-editor-polish-v1-001. Run from the repository root after `pnpm build:workbench`.
// Reads only committed files, git objects of the named bases, and the local workbench build. No network, no environment.
import { readFileSync, readdirSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import assert from "node:assert/strict"

const accepted = "89b74d821e2e3dad9733c8a39131633e27a852a8"
const prepared = "f366fad60da41d6c379b2546847eb5b50eb66a3f"
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
const list = (base, ...paths) => git("ls-tree", "-r", "--name-only", base, "--", ...paths).trim().split("\n").filter(Boolean)
const same = (base, file) => assert.equal(readFileSync(file, "utf8"), git("show", `${base}:${file}`), `Frozen boundary changed since ${base.slice(0, 7)}: ${file}`)

// WTEP-01: the batch touches only the Workbench presentation layer, its tests, and this phase's docs/tooling.
const changed = git("diff", "--name-only", prepared, "HEAD").trim().split("\n").filter(Boolean)
const admitted = [
  /^apps\/workbench\/src\/(App\.tsx|LiveControls\.tsx|controls\.ts|layout\.ts|lifecycle\.ts|lifecycle\.test\.ts|styles\.css)$/,
  /^e2e\/[a-z0-9-]+\.(spec\.)?ts$/,
  /^packages\/ui\/src\/quiet-workspace\.test\.ts$/,
  /^docs\/WORKBENCH_THEME_EDITOR_POLISH_CHECKPOINT\.md$/,
  /^docs\/WORKBENCH_THEME_EDITOR_POLISH_CONTRACT\.md$/,
  /^tools\/verify-workbench-theme-editor-polish\.mjs$/,
]
for (const file of changed) assert.ok(admitted.some((pattern) => pattern.test(file)), `Outside admitted scope: ${file}`)

// WTEP-12 / WTEP-14: core (schema, tokens, mutations, proposals, Design Command/Jev, context), every public
// component and composition, styles, preview messaging, persistence, product API, and the Loop control plane: unchanged.
const frozen = list(
  accepted,
  "packages/core",
  "packages/ui/src/components",
  "packages/ui/src/compositions",
  "packages/ui/src/styles",
  "packages/ui/.storybook",
  "apps/workbench/src/server",
  "apps/workbench/src/designCommand.ts",
  "apps/workbench/src/messages.ts",
  "apps/workbench/src/persistence.ts",
  "apps/workbench/src/PreviewFrame.tsx",
  "apps/workbench/src/Gallery.tsx",
  "apps/workbench/src/main.tsx",
  "apps/workbench/index.html",
  "apps/workbench/vite.config.ts",
  "tools/loop/jev",
  "registry.json",
  "playwright.config.ts",
  "playwright.workbench.config.ts",
  "playwright.designcommand.config.ts",
  "vitest.config.ts",
  "e2e/fixtures"
)
for (const file of frozen) same(accepted, file)
const priorComponents = list(accepted, "packages/ui/src/components")
assert.deepEqual(readdirSync("packages/ui/src/components").map((n) => `packages/ui/src/components/${n}`).sort(), [...priorComponents].sort(), "No public component may be added or removed")

// Exactly 13 public resources, byte-identical to the accepted base, and the catalog matches them.
const registry = JSON.parse(readFileSync("registry.json", "utf8"))
assert.equal(registry.items.length, 13)
const catalog = readFileSync("packages/core/src/contracts/catalog.ts", "utf8")
const catalogIds = [...catalog.matchAll(/^\s+"?([a-z-]+)"?: \(\) => import/gm)].map((m) => m[1]).sort()
assert.deepEqual(catalogIds, [...registry.items.map((i) => i.name)].sort())

// Dependencies and lockfile: exactly the prepared base's.
for (const file of ["package.json", "packages/core/package.json", "packages/ui/package.json", "apps/workbench/package.json", "pnpm-lock.yaml"]) same(prepared, file)

// The closed operation union is unchanged (core is frozen above; this names it in the receipt).
const mutation = readFileSync("packages/core/src/mutations/mutation.ts", "utf8")
const ops = [...mutation.matchAll(/^\s+\["(set[A-Za-z]+)", new Set/gm)].map((m) => m[1])
assert.deepEqual(ops, ["setColor", "setRadius", "setDensity", "setSansFamily", "setShadowBlur", "setMotionDuration", "setFontFamily", "setTracking", "setRadiusBase", "setSpacingBase", "setShadowProfile"])

// WTEP-02 / WTEP-07 / WTEP-11: no fixed preview width, device selector, Fork, or baseline-diff UI remains in the
// Workbench presentation source; manual colour edits still build only `setColor`.
const app = readFileSync("apps/workbench/src/App.tsx", "utf8")
const presentationUi = ["apps/workbench/src/App.tsx", "apps/workbench/src/LiveControls.tsx", "apps/workbench/src/styles.css", "apps/workbench/src/layout.ts"]
for (const file of presentationUi) {
  assert.doesNotMatch(readFileSync(file, "utf8"), /\bfork|baseline|Preview width|Mobile 390|Desktop 1024|WIDTHS|initialPreviewWidth|SingleToggleGroup|(?<!proposal-)diff-(?:list|count|empty)/i, `Removed UI or terminology remains: ${file}`)
}
assert.match(app, /<Switch\b/)
// Proposal candidate diffs remain.
assert.match(app, /data-testid="proposal-diff-list"/)
assert.match(app, /op: "setColor", mode, token, value: raw/)
assert.equal((app.match(/<ResizableHandle\b/g) ?? []).length, 1)
assert.doesNotMatch(readFileSync("apps/workbench/src/LiveControls.tsx", "utf8"), /onPointer|onKeyDown|addEventListener/, "No bespoke interaction handlers")

// Client bundle and presentation sources: no credential, product-AI transport, or new network surface.
const bundleFiles = readdirSync("apps/workbench/dist/assets").filter((n) => n.endsWith(".js"))
assert.ok(bundleFiles.length > 0, "build the workbench first")
for (const file of bundleFiles) {
  assert.doesNotMatch(
    readFileSync(`apps/workbench/dist/assets/${file}`, "utf8"),
    /TYPESAFE_(?:PERSONAL_UI_SYSTEM_API_KEY|LOOP_ENGINEERING_API_KEY|API_KEY)|api\.typesafe\.ai|@loop-engineering\/jev-core|loop-sentinel-must-never-be-read|generic-sentinel-must-never-be-read/
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
      note: "No credential values or environment variables read.",
    },
    null,
    2
  )
)
