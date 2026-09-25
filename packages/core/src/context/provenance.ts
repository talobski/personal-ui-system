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
  "resource:resizable-panel": {
    sourceId: "packages/core/src/contracts/data/resizable-panel.ts",
    sha256: "41688d427b0cad180bad7fd73883241aeaca26cd18935f497c610922a2c182c3",
  },
  "theme:default": {
    sourceId: "packages/core/src/theme/fixtures/default.json",
    sha256: "93fc2887f5ee7a355df8c3ca52a0adb005e7ac526942a5f3a0b2563521944282",
  },
  "theme:quiet-editorial": {
    sourceId: "packages/core/src/theme/fixtures/valid.json",
    sha256: "1a1f7e1bd4b8846b686ca39736613f6d690827f9ee292107767bf78c81b025e9",
  },
  "resource:button": {
    sourceId: "packages/core/src/contracts/data/button.ts",
    sha256: "0a4030b97deb63fbf396fb5542a7f1386a1d40fc1e753286e7b640f6ba23bb32",
  },
  "resource:field": {
    sourceId: "packages/core/src/contracts/data/field.ts",
    sha256: "3c3194d68934daae69b489a4cdcaef6494ff6d48f107f478bfd042881fd1f047",
  },
  "resource:input": {
    sourceId: "packages/core/src/contracts/data/input.ts",
    sha256: "13037e75e5da76b04dc2e84f05f2c8c9dae05458dba00edf0736504fcd82eeb8",
  },
  "resource:native-select": {
    sourceId: "packages/core/src/contracts/data/native-select.ts",
    sha256: "52f1969b405b1d6b03033e007d6844fc89f5bf684e2f73538f24d9b056caa83a",
  },
  "resource:responsive-dialog": {
    sourceId: "packages/core/src/contracts/data/responsive-dialog.ts",
    sha256: "3d3a00d5a2b5350980f1eec86fee801fc9907c96b636047b443b5c68c059eb65",
  },
  "resource:card": {
    sourceId: "packages/core/src/contracts/data/card.ts",
    sha256: "bff3ff48a4843735d7d2f1cd5cd932a3398d7f565acbad66a31143893020c9da",
  },
  "resource:tabs": {
    sourceId: "packages/core/src/contracts/data/tabs.ts",
    sha256: "2f585e332480fa960d2b167adb84e1551391190604bb60cc4b47936f0818d7a2",
  },
  "resource:switch": {
    sourceId: "packages/core/src/contracts/data/switch.ts",
    sha256: "3ad20183f435d069e6b499ba11abf65adf899772e61b72f0c8f8e58d8e9dc0d5",
  },
  "resource:textarea": {
    sourceId: "packages/core/src/contracts/data/textarea.ts",
    sha256: "2bfcaf9968692955a0633aed5d7dfeea3632e366c3ad4c20b0f55cf4e6d24c15",
  },
  "resource:single-toggle-group": {
    sourceId: "packages/core/src/contracts/data/single-toggle-group.ts",
    sha256: "2735628ebca773adac5aa8e783385025db0eac0ad29330a020a5db1aa4bdfe3b",
  },
  "resource:slider": {
    sourceId: "packages/core/src/contracts/data/slider.ts",
    sha256: "35f09d3a12bdf8b249ff641d8c6aad08306cb9fe484483b6a81f183936bc3f28",
  },
  "resource:collapsible": {
    sourceId: "packages/core/src/contracts/data/collapsible.ts",
    sha256: "35b1c3f91d64d2c11435402fb6abe9f032e32693049d54e26e14c67a83eb687f",
  },
  "resource:select": {
    sourceId: "packages/core/src/contracts/data/select.ts",
    sha256: "75ae41ac95d672d91de268b815885ba28ad3a0321ede38518dfa38e18a6d4918",
  },
  "resource:combobox": {
    sourceId: "packages/core/src/contracts/data/combobox.ts",
    sha256: "b054496aa01928f8a83bbb9cc1ed91dfb70fd13923cf3cf0e5f01eb513c33a3b",
  },
  "resource:chart": {
    sourceId: "packages/core/src/contracts/data/chart.ts",
    sha256: "a06e9027d87589e4e7c6c32df94b72e7058eeb25f640f3a3749cf9baaf892fb1",
  },
  "resource:sidebar": {
    sourceId: "packages/core/src/contracts/data/sidebar.ts",
    sha256: "ea0cea03cf4e438af8d88eb7646d93f682685e5d20b3f80d76a382567e16f209",
  },
  "resource:avatar": {
    sourceId: "packages/core/src/contracts/data/avatar.ts",
    sha256: "d701b6941df858b637bb193064db1fc8cfd07a36a8cedbaf12d1db18ad0c5544",
  },
} as const satisfies Record<string, ProvenanceEntry>

export const PROVENANCE_MANIFEST = Object.freeze(
  Object.fromEntries(Object.entries(RAW_PROVENANCE_MANIFEST).map(([key, entry]) => [key, Object.freeze({ ...entry })]))
) as typeof RAW_PROVENANCE_MANIFEST

export type ProvenanceKey = keyof typeof PROVENANCE_MANIFEST

export const themeProvenanceKey = (themeId: string): ProvenanceKey => `theme:${themeId}` as ProvenanceKey
export const resourceProvenanceKey = (resourceId: string): ProvenanceKey => `resource:${resourceId}` as ProvenanceKey
