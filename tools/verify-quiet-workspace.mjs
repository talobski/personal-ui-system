import { readFileSync, readdirSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import assert from "node:assert/strict"

const base = "61b70fffae1941493055cbff94cfae043fefccdd"
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
const frozen = [
  "packages/core/src/theme", "packages/core/src/mutations", "packages/core/src/jev-design",
  "apps/workbench/src/server", "apps/workbench/src/designCommand.ts", "apps/workbench/src/lifecycle.ts",
  "apps/workbench/src/persistence.ts", "apps/workbench/src/messages.ts", "apps/workbench/src/settings.ts",
  "tools/loop/jev", "pnpm-lock.yaml",
]
const frozenFiles = git("ls-tree", "-r", "--name-only", base, "--", ...frozen).trim().split("\n")
for (const file of frozenFiles) assert.equal(readFileSync(file, "utf8"), git("show", `${base}:${file}`), `Frozen boundary changed: ${file}`)
const priorComponents = git("ls-tree", "-r", "--name-only", base, "--", "packages/ui/src/components").trim().split("\n")
for (const file of priorComponents) assert.equal(readFileSync(file, "utf8"), git("show", `${base}:${file}`), `Accepted component changed: ${file}`)
const registry = JSON.parse(readFileSync("registry.json", "utf8"))
const priorRegistry = JSON.parse(git("show", `${base}:registry.json`))
assert.equal(registry.items.length, 11)
assert.deepEqual(registry.items.slice(0, 10), priorRegistry.items)
assert.equal(registry.items[10].name, "resizable-panel")
assert.equal(JSON.parse(readFileSync("packages/ui/package.json", "utf8")).dependencies["react-resizable-panels"], "4.13.2")
const modules = readdirSync("packages/ui/src/compositions").filter(n => n.endsWith(".tsx") && !n.includes(".stories."))
assert.equal(modules.length, 8)
const bundleFiles = readdirSync("apps/workbench/dist/assets").filter(n => n.endsWith(".js"))
for (const file of bundleFiles) {
  const bundle = readFileSync(`apps/workbench/dist/assets/${file}`, "utf8")
  assert.doesNotMatch(bundle, /TYPESAFE_(?:PERSONAL_UI_SYSTEM_API_KEY|LOOP_ENGINEERING_API_KEY|API_KEY)|api\.typesafe\.ai|@loop-engineering\/jev-core|loop-sentinel-must-never-be-read|generic-sentinel-must-never-be-read/)
}
const presentationFiles = ["apps/workbench/src/App.tsx", "apps/workbench/src/Gallery.tsx", "packages/ui/src/components/resizable-panel.tsx", ...modules.map(n => `packages/ui/src/compositions/${n}`)]
for (const file of presentationFiles) {
  assert.doesNotMatch(readFileSync(file, "utf8"), /\bfetch\s*\(|XMLHttpRequest|WebSocket|process\.env|import\.meta\.env|TYPESAFE_/, `New network/credential surface: ${file}`)
}
const hash = files => createHash("sha256").update(files.map(file => `${file}\0${readFileSync(file, "utf8")}`).join("\0")).digest("hex")
console.log(JSON.stringify({
  observedAt: new Date().toISOString(), base, result: "pass",
  frozenFileCount: frozenFiles.length, frozenSha256: hash(frozenFiles),
  preservedComponentFiles: priorComponents.length, acceptedComponentsSha256: hash(priorComponents),
  registryCount: registry.items.length, addedResource: registry.items[10].name,
  sharedModules: modules.sort(), presentationSha256: hash(presentationFiles),
  clientBundlesScanned: bundleFiles, credentialAndNetworkScan: "pass",
  note: "No credential values or environment variables read. Frozen comparison uses only the supplied prepared base.",
}, null, 2))
