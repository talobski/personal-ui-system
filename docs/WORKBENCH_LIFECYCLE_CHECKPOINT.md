# Workbench lifecycle checkpoint

Status: admitted as the first V1 product slice on 2026-09-20.

The local workbench now loads the schema-validated canonical theme and previews the Button, Input, and ResponsiveDialog pilots. It supports light/dark modes, 390 px and 1024 px preview widths, structured color-token edits, validation-before-activation, theme forking, local save/reload, portable JSON export, and a sorted token diff against the canonical baseline.

The design-system packages remain independent of the workbench. Theme edits use the core `setColor` mutation; saved and exported themes pass the core theme schema. The workbench does not expose arbitrary CSS or filesystem mutation.

## Lead verification

Fresh verification ran against merged commit `bc49f09442247b933d321ad34c55c5cd76bbd523`:

- 168 unit tests passed across 10 files.
- TypeScript checks passed for all packages, browser tests, and the Jev adapter.
- The shadcn registry, workbench production bundle, and Storybook bundle built successfully.
- Four Storybook responsive-dialog browser tests passed.
- Four workbench lifecycle browser tests passed: 390×844 and 1440×900, each in light and dark mode.
- The lifecycle path covers both preview widths, pilot states, valid and invalid edits, fork validation, save/reload persistence, baseline diff, export, and closed/open responsive-dialog states.
- Axe reported zero critical or serious violations in every state asserted by that matrix.
- A separate production-build capture produced mobile/light and desktop/dark screenshots and observed zero non-local runtime requests.

Full machine-readable evidence is project-local at `.loop/runs/workbench-lifecycle-001/evidence/ac-06.json`.

## Deliberate limits

- Only color tokens are editable in this slice.
- The baseline is the canonical fixture, not the last save.
- Mode and preview-width controls do not persist across reloads.
- Theme import and deletion are not included.
- On a 390 px outer viewport, the exact 390 px inner preview requires horizontal inspection because workbench chrome also consumes width. This is recorded as a polish limitation, not treated as full responsive-workbench completion.
- AC-07 is not claimed by this checkpoint; keyboard, responsive, and accessibility evidence must be evaluated against its complete criterion separately.
- The promotion state machine, remaining deterministic constraints, final spacing/motion decisions, and animation utility resolution remain future V1 units.

This checkpoint does not mark the project complete.
