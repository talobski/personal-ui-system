export type ProvenanceEntry = { sourceId: string; sha256: string }

/**
 * Stable product provenance for every theme/resource the retrieval surface can serve. Each `sha256` is the SHA-256 of
 * the exact committed source file bytes at `sourceId` (a fixed, repo-relative path — never an absolute worktree or
 * environment path). Runtime code only reads this static manifest; it never opens `sourceId` from disk. A dedicated
 * test recomputes every hash from the live file and asserts equality, so a source edit without a manifest update
 * fails the suite instead of silently drifting. The manifest and every entry are deep-frozen: these object
 * references are embedded directly (not copied) into every `get` result, so without freezing a caller mutating one
 * result's `provenance` field could permanently corrupt this singleton for every later, unrelated call.
 */
const RAW_PROVENANCE_MANIFEST = {
  "theme:quiet-editorial": {
    sourceId: "packages/core/src/theme/fixtures/valid.json",
    sha256: "1a1f7e1bd4b8846b686ca39736613f6d690827f9ee292107767bf78c81b025e9",
  },
  "resource:button": {
    sourceId: "packages/core/src/contracts/data/button.ts",
    sha256: "0a4030b97deb63fbf396fb5542a7f1386a1d40fc1e753286e7b640f6ba23bb32",
  },
  "resource:input": {
    sourceId: "packages/core/src/contracts/data/input.ts",
    sha256: "13037e75e5da76b04dc2e84f05f2c8c9dae05458dba00edf0736504fcd82eeb8",
  },
  "resource:responsive-dialog": {
    sourceId: "packages/core/src/contracts/data/responsive-dialog.ts",
    sha256: "3d3a00d5a2b5350980f1eec86fee801fc9907c96b636047b443b5c68c059eb65",
  },
} as const satisfies Record<string, ProvenanceEntry>

export const PROVENANCE_MANIFEST = Object.freeze(
  Object.fromEntries(Object.entries(RAW_PROVENANCE_MANIFEST).map(([key, entry]) => [key, Object.freeze({ ...entry })]))
) as typeof RAW_PROVENANCE_MANIFEST

export type ProvenanceKey = keyof typeof PROVENANCE_MANIFEST

export const themeProvenanceKey = (themeId: string): ProvenanceKey => `theme:${themeId}` as ProvenanceKey
export const resourceProvenanceKey = (resourceId: string): ProvenanceKey => `resource:${resourceId}` as ProvenanceKey
