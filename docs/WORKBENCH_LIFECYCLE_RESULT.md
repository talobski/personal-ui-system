# Workbench lifecycle slice — worker result (run workbench-lifecycle-001)

A bounded worker result, not a verification of AC-06 or the project. Branch
`loop/workbench-lifecycle-001`.

## What exists

- `apps/workbench` (Vite 8 / React 19 / Tailwind 4): loads `valid.json` through
  core (`validateTheme`), previews Button, Input, and ResponsiveDialog states,
  switches light/dark and Mobile 390 / Desktop 1024 preview widths, edits color
  tokens only via `applyMutation` (`setColor`), forks with id/name validation,
  saves named themes to `localStorage`, exports portable JSON, and shows a compact
  structured diff against the canonical baseline.
- The preview is this app loaded in an iframe (`/?preview=1`), so the frame width
  is a real viewport and the ResponsiveDialog media query switches Drawer/Dialog.
  The parent posts only the mode and the `:root`/`.dark` variable blocks of
  `renderShadcnTailwindCss`.
- Logic lives in `src/lifecycle.ts` and `src/persistence.ts` (pure, storage
  injected) and is unit-tested in `src/lifecycle.test.ts`.

## Decisions

- Baseline is always the committed canonical fixture, not the last save.
- The canonical id is reserved: saving requires a fork first
  (`workbench.save.reserved-id`). Fork ids must also be unused
  (`workbench.fork.duplicate-id`).
- Saved themes are re-validated on load; invalid or id-mismatched entries are dropped.
- Workbench chrome uses the committed theme CSS; only the preview iframe gets the
  edited theme, so an edited color cannot make the editor unreadable.

## Limitations

- Only color tokens are editable; the preview applies `:root`/`.dark` variables at
  runtime, while radius/shadow/font/spacing come from the compiled fixture CSS
  (identical for forks, since only colors can change).
- Mode and preview width are not persisted across reloads.
- No theme delete/import; export only.
- No contrast/constraint gate on edits (no constraints package yet); axe covers the
  tested values only.
- `react`/`react-dom` 19.3.0 were added to the workbench manifest; the lockfile
  gained only those importer entries (offline, nothing downloaded).
- `@personal-ui/core` gained a `./theme/fixtures/*.json` export so the fixture loads
  through the package boundary; no core source changed.
- `test:browser` now runs Storybook and workbench configs (`playwright.config.ts`
  ignores `workbench.spec.ts`; `playwright.workbench.config.ts` serves the
  production build with `vite preview`).
