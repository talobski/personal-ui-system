import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { PROVENANCE_MANIFEST } from "./provenance"
import { principlesFor } from "./principles"

// Only this test touches the filesystem; the runtime manifest/principle modules never do (requirement 6/9).
const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url))
const sha256 = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex")

describe("context provenance (ACR-09)", () => {
  it.each(Object.entries(PROVENANCE_MANIFEST))("%s manifest hash matches the live source file", (_key, entry) => {
    const bytes = readFileSync(`${repoRoot}${entry.sourceId}`)
    expect(sha256(bytes)).toBe(entry.sha256)
  })

  it("carries no dynamic timestamp, worktree path, environment, or secret-shaped field", () => {
    for (const entry of Object.values(PROVENANCE_MANIFEST)) {
      expect(Object.keys(entry).sort()).toEqual(["sha256", "sourceId"])
      expect(entry.sourceId).not.toMatch(/^\//)
      expect(entry.sourceId).not.toContain(".loop")
      expect(entry.sourceId).not.toMatch(/\/worktrees\//)
    }
  })

  it("every sourced principle's text is hashed correctly and appears verbatim in the live BRIEF.md", () => {
    const brief = readFileSync(`${repoRoot}BRIEF.md`, "utf8")
    const seen = new Set<string>()
    for (const resource of ["button", "input", "responsive-dialog"]) {
      const principles = principlesFor(resource)
      expect(principles).toBeDefined()
      for (const principle of principles ?? []) {
        expect(sha256(principle.text)).toBe(principle.sha256)
        expect(brief).toContain(principle.text)
        seen.add(principle.id)
      }
    }
    expect(seen.size).toBeGreaterThan(0)
  })
})
