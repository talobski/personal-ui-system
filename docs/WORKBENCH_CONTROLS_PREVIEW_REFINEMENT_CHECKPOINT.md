# Workbench Controls & Preview Refinement — Producer Checkpoint

Phase: `workbench-controls-preview-refinement-v1-001`
Prepared base: `c68c8a2fd4eec0e78ba9e4a82c5fa4353a0413d9`
Contract: `docs/WORKBENCH_CONTROLS_PREVIEW_REFINEMENT_CONTRACT.md`
Status: IN PROGRESS — producer candidate not yet complete. Not accepted, not promoted.

## Completed scope

- Baseline recorded at the prepared base: `pnpm test` 35 files / 597 tests pass.
- Unit 1 (committed): Select (shadcn Base UI variant; popup rendered in place — see Defects/decisions), Combobox
  (shadcn Base UI combobox; InputGroup inlined via Base UI `Combobox.InputGroup`), Chart (shadcn chart over
  Recharts 3.10.1) with stories, contracts, `select.*`/`combobox.*`/`chart.*` constraints + fixtures, context kinds,
  provenance hashes, registry items (16), foundation/context tests, and Storybook specs `e2e/{select,combobox,chart}.spec.ts`.
  Productive Week now renders the Chart resource with its original data and sr-only summary.

## Defects and decisions

- Radix Select (via `radix-ui`) was tried first: open-state axe reports serious `aria-hidden-focus` because Radix
  aria-hides the page while the focusable trigger remains inside it (axe exempts only modal dialogs). A portalled Base UI
  Select instead adds aria-hidden tabbable focus-guard sentinels (same rule). Resolution: Select uses the pinned
  `@base-ui/react@1.8.0` with the popup rendered in place (`positionMethod="fixed"`), which renders no guards; open-state
  axe passes in both colour modes and viewports.

## Remaining scope

- Unit 2: local font catalog (exact 24 families) + self-hosted Fontsource CSS.
- Unit 3: Workbench — full-region theme Select without metadata row, tab-copy removal, font Comboboxes,
  label convention, manual proposal UI removal, color group order, edge-to-edge preview.
- Unit 4: shadowless gallery card roots (preview only).
- Unit 5: e2e updates, phase verifier, full producer evidence.

## Next provider-neutral action

Continue at the first remaining unit above from the latest commit on branch
`loop/workbench-controls-preview-refinement-v1-001`.
