// Offline AIR producer boundary scan (read-only). No credentials, network, browser, or canonical runtime state.
// Run from the repository root: node tools/verify-accepted-implementation-review-inset-tabs.mjs
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"

const phase = "accepted-implementation-review-inset-tabs-v1-001"
const base = "4baca4f412124dab4fdf16736d67723db9044518"
const acceptedProduct = "b2f937a66508bb0a1978dc35c2a4b2bb89c46c83"
const packetDir = `docs/evidence/${phase}/linear`
const producerDir = `docs/evidence/${phase}/producer`
const contract = "docs/ACCEPTED_IMPLEMENTATION_REVIEW_INSET_TABS_CONTRACT.md"
const tickets = ["PUI-132", "PUI-133"]
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trimEnd()
const read = path => readFileSync(path, "utf8")
const at = (rev, path) => execFileSync("git", ["show", `${rev}:${path}`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
const hash = value => createHash("sha256").update(value).digest("hex")
const code = source => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

// AIR-07: the frozen packet manifest carries its pinned hash, each snapshot matches the manifest, and the packet and
// contract are byte-identical to the admission base.
assert.equal(hash(readFileSync(`${packetDir}/snapshot-hashes.json`)), "23f6a45866cfcb19414b6afc8d0548da00002cca01c471724285d4f30063fde2")
const manifest = JSON.parse(read(`${packetDir}/snapshot-hashes.json`))
assert.equal(manifest.phase, phase)
assert.deepEqual(manifest.tickets.map(ticket => ticket.id), tickets)
for (const ticket of manifest.tickets) assert.equal(hash(readFileSync(ticket.path)), ticket.sha256, `${ticket.id} snapshot hash`)
for (const path of [contract, ...git("ls-files", packetDir).split("\n")]) assert.equal(read(path), at(base, path), `${path} changed`)
execFileSync("git", ["merge-base", "--is-ancestor", acceptedProduct, "HEAD"])
execFileSync("git", ["merge-base", "--is-ancestor", base, "HEAD"])

// AIR-05: only the PUI-133 source, three comment-only corrections, their directly superseded assertions, producer
// evidence and this guard change; no document, dependency, registry, schema, mutation, or public component changes.
const commentOnly = ["packages/core/src/theme/schema.ts", "apps/workbench/src/PreviewFrame.tsx", "apps/workbench/src/workbenchTabs.ts"]
const allowed = new Set([
  "packages/core/src/theme/render.ts",
  ...commentOnly,
  "packages/core/src/theme/ui-effects.test.ts",
  "e2e/tactile-ui-effects.spec.ts",
  "e2e/amber-dusk-shell-refinement.spec.ts",
  "e2e/ui-effects-showcase-polish.spec.ts",
  "tools/verify-accepted-implementation-review-inset-tabs.mjs",
])
const changed = git("diff", "--name-only", base, "HEAD").split("\n").filter(Boolean)
for (const path of changed) assert.ok(allowed.has(path) || path.startsWith(`${producerDir}/`), `Out-of-scope change: ${path}`)
assert.ok(git("ls-files", `${producerDir}/findings.md`), "AIR-01 findings artifact missing")
for (const path of commentOnly) assert.equal(code(read(path)), code(at(base, path)), `${path} has a non-comment change`)
assert.equal(JSON.parse(read("registry.json")).items.length, 23)
assert.match(code(read("packages/core/src/theme/schema.ts")), /THEME_SCHEMA_VERSION = "3\.0" as const/)
assert.equal([...code(read("packages/core/src/mutations/mutation.ts")).matchAll(/^\s+\["(set[A-Za-z]+)", new Set\(\[([^\]]*)\]\)\],$/gm)].length, 13)

// AIR-03 (PUI-133): the decorative surface TabsList edge is exactly Tailwind 4.3.3's `inset-ring-1 inset-ring-border/80`
// (see producer/tailwind-inset-ring-probe.txt), in the inset-ring slot only, Strength-free and never the focus token.
const render = read("packages/core/src/theme/render.ts")
const ring = code(render).match(/const TABS_LIST_RING = \[([\s\S]*?)\] as const/)[1]
assert.deepEqual([...ring.matchAll(/^\s+(\S.*),$/gm)].map(m => m[1]), [
  '"--tw-inset-ring-shadow: inset 0 0 0 1px var(--tw-inset-ring-color, currentcolor);"',
  '"--tw-inset-ring-color: color-mix(in oklab, var(--border) 80%, transparent);"',
  "`box-shadow: ${TW_SHADOW_COMPOSITION};`",
])
assert.doesNotMatch(ring, /--tw-ring-|var\(--ring\)|strength|\bk\b/)
const probe = read(`${producerDir}/tailwind-inset-ring-probe.txt`)
assert.match(probe, /^tailwindcss 4\.3\.3 /)
assert.ok(probe.includes("--tw-inset-ring-shadow: inset 0 0 0 1px var(--tw-inset-ring-color, currentcolor);"))
assert.ok(probe.includes("--tw-inset-ring-color: color-mix(in oklab, var(--border) 80%, transparent);"))
assert.match(render, /TACTILE_SURFACE_TABS_LIST_SELECTOR = '\[data-slot="tabs-list"\]:not\(\[data-variant="line"\]\)'/)
assert.match(render, /if \(effects\.effect !== "tactile"\) return ""/)

// AIR-04: outside `TABS_LIST_RING`, the render module (Secondary recipe, selectors, composition, effects block and the
// theme renderer) is byte-identical to the base once comments are removed; the public Tabs and Button are unchanged.
const withoutRing = source => code(source).replace(/const TABS_LIST_RING = \[[\s\S]*?\] as const/, "")
assert.equal(withoutRing(render), withoutRing(at(base, "packages/core/src/theme/render.ts")), "render.ts changed outside TABS_LIST_RING")
for (const path of ["packages/ui/src/components/tabs.tsx", "packages/ui/src/components/button.tsx", "package.json", "pnpm-lock.yaml"]) assert.equal(read(path), at(base, path), `${path} changed`)

console.log(`${phase} boundary scan: OK (${changed.length} changed paths)`)
