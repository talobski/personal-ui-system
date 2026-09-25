# Workbench Sidebar System Polish — Producer Checkpoint

Phase: `workbench-sidebar-system-polish-v1-001`
Branch: `loop/workbench-sidebar-system-polish-v1-001`
Tickets: PUI-25 through PUI-30. Criteria: WSSP-01 through WSSP-15.
Accepted product base: `b2952d17f240abb2bf1e7e87f20f14281399015d`
Prepared base: `a243830a3f5ab9daf8c67a08e65d337240298f80`
Contract: `docs/WORKBENCH_SIDEBAR_SYSTEM_POLISH_CONTRACT.md`
Producer route: Claude Opus 5.5, STRONG, medium effort.
Candidate implementation commit: `818d85274d337061087ffdb89ff473ec873a85dd` (this checkpoint is committed on top of it
and changes no product, test, or tool file).

Status: PRODUCER-COMPLETE. This is not acceptance or promotion. Protected fresh Codex STANDARD verification and
Lead-owned browser evidence are still required.

## What changed

1. **Sidebar and Avatar resources (PUI-25, WSSP-02).** `packages/ui/src/components/sidebar.tsx` derives from the
   official shadcn new-york-v4 Sidebar; the mobile sheet follows the shadcn Base UI Sidebar. `avatar.tsx` derives from
   the new-york-v4 Avatar and exports `avatarInitial`. Both have stories, compact contracts
   (`packages/core/src/contracts/data/{sidebar,avatar}.ts`), deterministic `sidebar.*` and `avatar.*` constraints with
   valid/invalid fixtures, retrieval kinds (`sidebar` is a pattern, `avatar` a component), provenance hashes, and
   registry items. The registry now has exactly 18 items and `shadcn build` emits all 18.
   Recorded source adaptations:
   - sidebar colours map to the existing semantic tokens (card, card-foreground, accent, accent-foreground, border,
     ring). There are no sidebar Theme v2 tokens and no parallel theme layer;
   - the mobile sheet uses the pinned `@base-ui/react@1.8.0` Dialog, composed inline (see the risks below for why);
   - closing the mobile sheet returns focus to the `SidebarTrigger`;
   - no cookie is written, the `tooltip` prop is omitted, and the menu skeleton width is deterministic;
   - `useIsMobile` reads the 768px media query through `useSyncExternalStore`;
   - `AvatarFallback` adds `text-muted-foreground`.
2. **Workbench shell (PUI-26, WSSP-03/04/12).** `App.tsx` renders one `SidebarProvider` (`--sidebar-width: 22rem`)
   containing one `Sidebar` (`SidebarHeader` with the theme Select, and `SidebarContent` with the Colors / Typography /
   Other / Command tabs and their existing controls) and one `SidebarInset` (the toolbar with `SidebarTrigger`, Dark
   mode, Export JSON, and Save; the staged status and review; and the edge-to-edge preview). These are removed: the old
   top header, the Workbench's `ResizablePanel`, `ResizablePanelGroup`, and `ResizableHandle` usage,
   `apps/workbench/src/layout.ts`, the mobile Controls/Preview tabs, and the ≤359px category NativeSelect. The public
   `resizable-panel` resource (source, story, contract, and registry item) is byte-identical to the accepted base.
   `SidebarFooter` is optional and not used. There is no `<header>` element; a screen-reader-only
   `<h1>` stays in the inset.
3. **Theme selector and deletion (PUI-27, WSSP-05/06).** The trigger and every row show primary, accent, secondary,
   and border swatches in the current mode. Swatches are `aria-hidden`, and each row shows its own theme's colours.
   Trigger and rows use a pointer cursor and accent hover. Built-in and Custom grouping is unchanged. A sibling
   `SidebarMenuAction` ("Delete {name}") renders only when the active theme is a saved custom theme. It opens the
   existing `ResponsiveDialog`, and confirming it calls the new `deleteTheme()` in `persistence.ts`. That removes the
   saved theme and its base record and persists `activeId: "default"`, keeping the same `{themes, activeId, bases}`
   format. Built-ins and unknown ids are rejected with `workbench.delete.not-custom`, and nothing is written. The Select
   ignores a change to the already-active id, so the Default fallback notice survives deletion.
4. **Scoped scrollbars (PUI-28, WSSP-07).** `.quiet-scroll` in `apps/workbench/src/styles.css` sets
   `scrollbar-width: thin` and a muted-foreground `scrollbar-color` at 30%, raised to 70% on hover, active, or
   focus-within. It falls back to WebKit pseudo-elements under `@supports not (scrollbar-color: auto)` and otherwise
   leaves the platform default. It applies only to `SidebarContent` and the preview document root (`PreviewFrame` adds
   the class to its `<html>`). There are no touch-action, overscroll, or pointer-event overrides, and `globals.css` is
   unchanged.
5. **Avatars (PUI-29, WSSP-08).** Account Profile (compact) and Team Access now use `Avatar` / `AvatarFallback` with
   `avatarInitial(name)`: one character, the first letter or digit, upper-cased when that stays one character, and "?"
   otherwise. They use `bg-muted` / `text-muted-foreground` with no literal colours. The "AL" and "GH" initials are
   gone.
6. **Field spacing (PUI-30, WSSP-09).** `fieldVariants` moved the gap from the base into the orientations: vertical
   is `gap-2`, and horizontal and responsive keep `gap-3`. FieldSet, FieldGroup, FieldContent, checkbox/radio, and
   inter-field spacing are unchanged. A new `Pilot/Field` Spacing story and browser test prove the 2:3:7 spacing
   ratios.
7. **Density (WSSP-10).** Only the manual Density row was removed from the Other → Spacing section. The schema,
   renderer, v1 migration, `setDensity`, `NUMERIC_CONTROLS.density`, persistence, proposal validation, and Design
   Command density all remain, with unit coverage in `lifecycle.test.ts` and existing browser coverage in
   `proposal-preview.spec.ts`.
8. **Preservation (WSSP-11/14).** The Theme v2 schema, operation union (11 operations), persistence format,
   Design Command/Jev, credentials, network, `controls.ts`, `lifecycle.ts`, `LiveControls.tsx`, server,
   package manifests, and lockfile are unchanged. The phase verifier checks all of these.

## Exact changed files (vs prepared base)

```text
M apps/workbench/src/App.tsx
M apps/workbench/src/PreviewFrame.tsx
D apps/workbench/src/layout.ts
M apps/workbench/src/lifecycle.test.ts
M apps/workbench/src/persistence.ts
M apps/workbench/src/styles.css
A docs/WORKBENCH_SIDEBAR_SYSTEM_POLISH_CHECKPOINT.md
A e2e/avatar.spec.ts
M e2e/field-native-select.spec.ts
M e2e/quiet-workspace.spec.ts
A e2e/sidebar.spec.ts
M e2e/theme-v2-live-controls.spec.ts
M e2e/workbench-navigation.ts
M packages/core/README.md
M packages/core/src/constraints/component-state.ts
M packages/core/src/constraints/fixtures/invalid.json
M packages/core/src/constraints/fixtures/valid.json
M packages/core/src/context/context.acr11-fresh-agent-path.test.ts
M packages/core/src/context/context.get.test.ts
M packages/core/src/context/context.list.test.ts
M packages/core/src/context/evaluator.ts
M packages/core/src/context/provenance.ts
M packages/core/src/contracts/catalog.ts
M packages/core/src/contracts/contracts.test.ts
A packages/core/src/contracts/data/avatar.ts
A packages/core/src/contracts/data/sidebar.ts
A packages/ui/src/avatar.test.ts
A packages/ui/src/components/avatar.stories.tsx
A packages/ui/src/components/avatar.tsx
M packages/ui/src/components/field.stories.tsx
M packages/ui/src/components/field.tsx
A packages/ui/src/components/sidebar.stories.tsx
A packages/ui/src/components/sidebar.tsx
M packages/ui/src/compositions/account-profile.tsx
M packages/ui/src/compositions/team-access.tsx
M packages/ui/src/foundation.test.ts
M packages/ui/src/quiet-workspace.test.ts
M registry.json
A tools/verify-workbench-sidebar-system-polish.mjs
```

`package.json`, `pnpm-lock.yaml`, and every package manifest are unchanged. `pnpm install` was not run.

## Commands and results (producer, this worktree, 2026-09-25)

`pnpm -r typecheck` fails here before running any task: pnpm refuses the prepared `node_modules` symlink as its
task-state directory (`ERR_PNPM_UNSAFE_TASK_RUN_STATE_PATH`). No install or resolution ran. The same tools were run
directly:

| Command | Result |
|---|---|
| `node_modules/.bin/vitest run` | 37 files, 666 tests passed |
| `tsc --noEmit` in `packages/core`, `packages/ui`, `apps/workbench`; `tsc -p e2e`; `tsc -p tools/loop/jev` | all passed |
| `node_modules/.bin/shadcn build` (`registry:build`) | passed; 18 items emitted to `public/r` (ignored) |
| `vite build` in `apps/workbench` (`build:workbench`) | passed (existing >500 kB chunk warning only) |
| `storybook build -c packages/ui/.storybook -o storybook-static` | passed |
| `node tools/verify-workbench-sidebar-system-polish.mjs` | `result: pass`; registry 18; 140 frozen files; 11 operations; bundle, credential, and network scan pass |

Localhost binding worked in this worktree, so the producer smoke-ran the browser definitions. These runs are
producer smoke evidence only; the Lead owns exact-candidate browser evidence and axe decoding.

| Command | Producer smoke result |
|---|---|
| `playwright test` (Storybook, 390×844 + 1440×900) | 88 passed |
| `WORKBENCH_PORT=5199 playwright test -c playwright.workbench.config.ts` | 90 passed, 2 skipped (viewport-specific tests: the desktop shell test skips on mobile and the mobile sheet test skips on desktop) |
| `WORKBENCH_PORT=5198 playwright test -c playwright.designcommand.config.ts` | 1 passed (credential forced empty; no outbound request) |

New and updated browser definitions:

- `e2e/sidebar.spec.ts`: shell width, semantic token colours, active/hover accent, keyboard activation, the sibling
  menu action, pointer collapse and Ctrl+B, and the mobile sheet (open, focus inside, Escape, focus return), with axe.
- `e2e/avatar.spec.ts`: one initial and muted/muted-foreground colours in the Avatar stories and in both
  compositions, with axe, in light and dark.
- `e2e/field-native-select.spec.ts`: vertical, horizontal, responsive, and group spacing ratios, in light and dark.
- `e2e/quiet-workspace.spec.ts`: the desktop shell (22rem, fill, collapse, Ctrl+B, Enter/Space, reduced motion,
  1024px containment); the mobile sheet (focus trap, all four sections, Escape, overlay, keyboard open, reduced
  motion, axe); scoped scrollbars; swatches with pointer and accent hover; custom-theme deletion (built-ins hidden,
  cancel, keyboard confirm, persistence, reload, axe); and the updated Select-anchoring and mobile draft paths.
- `e2e/theme-v2-live-controls.spec.ts`: Density absent from the manual UI; the remaining controls unchanged.
- `e2e/workbench-navigation.ts`: `workspaceMode` now opens and dismisses the mobile sheet (`settledSheet` waits for
  the slide-in to finish).

## Criteria status (producer view)

| Criterion | Producer status |
|---|---|
| WSSP-01 bounded batch | Done; enforced by the verifier's admitted-scope list |
| WSSP-02 public resources (18) | Done; unit, retrieval, registry, and Storybook coverage |
| WSSP-03 desktop shell | Done; unit and browser definitions |
| WSSP-04 mobile shell | Done; browser definitions |
| WSSP-05 theme selector | Done; browser definitions |
| WSSP-06 custom deletion | Done; unit and browser definitions |
| WSSP-07 scoped scrollbars | Done; unit and browser definitions |
| WSSP-08 avatars | Done; unit and Storybook definitions |
| WSSP-09 field spacing | Done; story and browser definition |
| WSSP-10 density boundary | Done; unit and browser definitions |
| WSSP-11 functional preservation | Existing matrices green in the producer smoke run |
| WSSP-12 responsive containment | Definitions at 390, 1024, and 1440, light and dark |
| WSSP-13 accessibility/browser | Remaining: Lead-owned exact-candidate execution and decoded axe evidence |
| WSSP-14 frozen boundaries | Done; phase verifier |
| WSSP-15 verification/closeout | Remaining: protected fresh Codex STANDARD verification, then Lead acceptance and promotion |

## Risks and notes for the Lead and verifier

1. **Mobile sheet primitive.** The official new-york-v4 sheet is a Radix modal Dialog. With it, the Workbench's
   Base UI font Combobox popup (portalled to `<body>`) was blocked on mobile: Radix's pointer lock intercepted clicks,
   and its focus trap pulled focus out of the portalled search field. Fixing that inside the frozen Combobox resource
   was not admitted. The sheet therefore uses the Base UI Dialog, following the official shadcn Base UI Sidebar. Nested
   Base UI popups then mount inside it and take part in its focus and Escape handling. The nested Radix
   `ResponsiveDialog` delete confirmation also works from inside the sheet in the smoke runs. The registry item declares
   `@base-ui/react@1.8.0`, which is already pinned.
2. **Mobile draft retention.** The official sheet unmounts its content when closed. A rejected, never-active draft in
   a mobile field is therefore discarded when the sheet closes, and the field shows the active value again. Desktop
   keeps the sidebar mounted and retains drafts. `quiet-workspace.spec.ts` asserts both behaviors. No draft ever
   becomes active state.
3. **Workspace symlinks resolve to the canonical checkout.** `packages/ui/node_modules` and
   `apps/workbench/node_modules` are symlinks into `/Users/emmantalob/dev/personal-ui-system`. As a result,
   `@personal-ui/core` imported from those packages, including by Workbench unit tests and the Workbench bundle,
   resolves to the canonical checkout's `packages/core`, not this worktree's. `@personal-ui/ui` is aliased by Vite and
   tsconfig, so it does resolve to this worktree. This phase changes core only additively (constraints, contracts,
   retrieval) and nothing the Workbench runtime imports, and the new cross-package test (`avatar.test.ts`) imports
   core relatively. Protected verification should still run from an environment whose links point at the candidate,
   or confirm that the canonical `packages/core` matches the prepared base.
4. **`pnpm` scripts.** The `pnpm` script wrappers fail on the symlinked `node_modules` (see above). All checks were
   run through the same binaries directly.
5. **Official source fidelity.** The Sidebar and Avatar sources were reproduced from the official shadcn
   new-york-v4 (and Base UI sheet) patterns without a network fetch, as the envelope requires. The verifier should
   compare them against the recorded official references.

## Next action

Lead: run the exact-candidate Storybook, Workbench, and live Design Command matrices and decode the axe attachments.
Then dispatch the protected fresh Codex STANDARD verifier against the clean candidate HEAD, including
`node tools/verify-workbench-sidebar-system-polish.mjs` after `build:workbench`.
