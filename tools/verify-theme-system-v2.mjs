// TSV2-14 / TSV2-15 frozen-boundary, catalog, dependency, bundle, credential, and network scan for
// theme-system-v2-default-live-controls-001. Run from the repository root after `pnpm build:workbench`.
// Reads only committed files, git objects of the named bases, and the local workbench build. No network, no environment.
import { readFileSync, readdirSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import assert from "node:assert/strict"

const accepted = "2ffaf6d4d13d2b334f198b8df40d10988673924d"
const prepared = "f3f1812df8090638567f665a85e56225d9afdfe9"
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
const list = (base, ...paths) => git("ls-tree", "-r", "--name-only", base, "--", ...paths).trim().split("\n").filter(Boolean)
const same = (base, file) => assert.equal(readFileSync(file, "utf8"), git("show", `${base}:${file}`), `Frozen boundary changed since ${base.slice(0, 7)}: ${file}`)

// Design Command/Jev/LLM protocol, proposal lifecycle, product API, preview messaging, Loop control plane: unchanged.
const frozen = list(
  accepted,
  "packages/core/src/jev-design",
  "packages/core/src/mutations/proposal.ts",
  "packages/core/src/rules",
  "packages/core/src/context/identity.ts",
  "packages/core/src/context/serialize.ts",
  "packages/core/src/context/types.ts",
  "packages/core/src/contracts/contract.ts",
  "packages/core/src/theme/fixtures/valid.json",
  "packages/core/src/theme/fixtures/invalid.json",
  "apps/workbench/src/server",
  "apps/workbench/src/designCommand.ts",
  "apps/workbench/src/messages.ts",
  "apps/workbench/vite.config.ts",
  "packages/ui/src/compositions",
  "packages/ui/src/styles",
  "tools/loop/jev",
  "playwright.designcommand.config.ts"
)
for (const file of frozen) same(accepted, file)

// Every accepted component is byte-identical; only slider/collapsible (+ their stories) are new.
const priorComponents = list(accepted, "packages/ui/src/components")
for (const file of priorComponents) same(accepted, file)
const components = readdirSync("packages/ui/src/components").map((n) => `packages/ui/src/components/${n}`)
assert.deepEqual(
  components.filter((f) => !priorComponents.includes(f)).sort(),
  ["collapsible.stories.tsx", "collapsible.tsx", "slider.stories.tsx", "slider.tsx"].map((n) => `packages/ui/src/components/${n}`)
)

// Exactly 13 public resources: the accepted 11, unchanged, plus slider and collapsible.
const registry = JSON.parse(readFileSync("registry.json", "utf8"))
const priorRegistry = JSON.parse(git("show", `${accepted}:registry.json`))
assert.equal(priorRegistry.items.length, 11)
assert.equal(registry.items.length, 13)
assert.deepEqual(registry.items.slice(0, 11), priorRegistry.items)
assert.deepEqual(registry.items.slice(11).map((i) => i.name), ["slider", "collapsible"])
const catalog = readFileSync("packages/core/src/contracts/catalog.ts", "utf8")
const catalogIds = [...catalog.matchAll(/^\s+"?([a-z-]+)"?: \(\) => import/gm)].map((m) => m[1]).sort()
assert.deepEqual(catalogIds, [...registry.items.map((i) => i.name)].sort())

// Dependencies: exactly the prepared base's pins; the lockfile is the prepared base's.
for (const file of ["package.json", "packages/core/package.json", "packages/ui/package.json", "apps/workbench/package.json", "pnpm-lock.yaml"]) same(prepared, file)
assert.equal(JSON.parse(readFileSync("packages/core/package.json", "utf8")).dependencies.culori, "4.0.2")
const ui = JSON.parse(readFileSync("packages/ui/package.json", "utf8")).dependencies
assert.equal(ui["@radix-ui/react-slider"], "1.4.7")
assert.equal(ui["@radix-ui/react-collapsible"], "1.1.20")

// Operation union grows by exactly the five contracted operations.
const mutation = readFileSync("packages/core/src/mutations/mutation.ts", "utf8")
const ops = [...mutation.matchAll(/^\s+\["(set[A-Za-z]+)", new Set/gm)].map((m) => m[1])
assert.deepEqual(ops, ["setColor", "setRadius", "setDensity", "setSansFamily", "setShadowBlur", "setMotionDuration", "setFontFamily", "setTracking", "setRadiusBase", "setSpacingBase", "setShadowProfile"])

// Client bundle and presentation sources: no credential, product-AI transport, or new network surface.
const bundleFiles = readdirSync("apps/workbench/dist/assets").filter((n) => n.endsWith(".js"))
assert.ok(bundleFiles.length > 0, "build the workbench first")
for (const file of bundleFiles) {
  assert.doesNotMatch(
    readFileSync(`apps/workbench/dist/assets/${file}`, "utf8"),
    /TYPESAFE_(?:PERSONAL_UI_SYSTEM_API_KEY|LOOP_ENGINEERING_API_KEY|API_KEY)|api\.typesafe\.ai|@loop-engineering\/jev-core|loop-sentinel-must-never-be-read|generic-sentinel-must-never-be-read/
  )
}
const presentation = [
  "apps/workbench/src/App.tsx",
  "apps/workbench/src/LiveControls.tsx",
  "apps/workbench/src/controls.ts",
  "apps/workbench/src/lifecycle.ts",
  "apps/workbench/src/persistence.ts",
  "apps/workbench/src/PreviewFrame.tsx",
  "packages/ui/src/components/slider.tsx",
  "packages/ui/src/components/collapsible.tsx",
  ...list("HEAD", "packages/core/src/theme").filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts")),
]
for (const file of presentation) {
  assert.doesNotMatch(readFileSync(file, "utf8"), /\bfetch\s*\(|XMLHttpRequest|WebSocket|process\.env|import\.meta\.env|TYPESAFE_/, `New network/credential surface: ${file}`)
}
// App.tsx keeps its single pre-existing product API call path (designCommand.ts), not a new one.
assert.equal((readFileSync("apps/workbench/src/App.tsx", "utf8").match(/evaluateDesignCommandClient\(/g) ?? []).length, 1)

const hash = (files) => createHash("sha256").update(files.map((file) => `${file}\0${readFileSync(file, "utf8")}`).join("\0")).digest("hex")
console.log(
  JSON.stringify(
    {
      observedAt: new Date().toISOString(),
      acceptedBase: accepted,
      preparedBase: prepared,
      result: "pass",
      frozenFileCount: frozen.length,
      frozenSha256: hash(frozen),
      preservedComponentFiles: priorComponents.length,
      registryCount: registry.items.length,
      addedResources: registry.items.slice(11).map((i) => i.name),
      operationCount: ops.length,
      clientBundlesScanned: bundleFiles,
      credentialAndNetworkScan: "pass",
      note: "No credential values or environment variables read.",
    },
    null,
    2
  )
)
