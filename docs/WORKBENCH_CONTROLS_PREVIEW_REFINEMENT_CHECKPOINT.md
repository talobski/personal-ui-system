# Workbench Controls & Preview Refinement — Candidate Checkpoint

Phase: `workbench-controls-preview-refinement-v1-001`
Branch: `loop/workbench-controls-preview-refinement-v1-001`
Prepared base: `c68c8a2fd4eec0e78ba9e4a82c5fa4353a0413d9`
Contract: `docs/WORKBENCH_CONTROLS_PREVIEW_REFINEMENT_CONTRACT.md`
Status: LEAD-GREEN — implementation and bounded corrections complete; awaiting
protected fresh verification and owner visual review. Not accepted or promoted.
Producer handoff HEAD: `628d1af11843ee661384b424585cdda6edaf515f`.
Initial Astra candidate: `5c2041dd8bef8d55a20e1e2dedfcfbebbb42f592`.

## Lead reconciliation — final candidate preparation (2026-09-25 Asia/Manila)

The Lead preserved both producer commits, executed the complete browser workload,
and corrected only defects demonstrated by that workload. The final implementation:

- uses Base UI's native grouped item model for Select keyboard navigation, with no
  bespoke event handling in the public primitive;
- uses the supported trigger-outside/search-inside Combobox structure, eliminating
  the open-state `aria-hidden-focus` violation;
- keeps the full-region theme selector aligned after panel resizing;
- gives the panel divider a real 9px hit target with a centered 1px visual rule and
  suppresses iframe pointer capture only during an active drag;
- removes shadows from all eight gallery roots, including form-wrapped Cards; and
- preserves the approved edge-to-edge preview, 24 local fonts, Theme v2 mutation
  path, and Design Command staging lifecycle.

Final Lead evidence on the exact candidate tree:

| Check | Result |
| --- | --- |
| `pnpm test` | 36 files / **630 tests passed** |
| `pnpm typecheck` | pass (all packages, e2e, Jev) |
| `pnpm registry:build` | pass; exactly **16 resources** |
| `pnpm build:workbench` | pass; non-failing bundle-size advisory |
| `pnpm build:storybook` | pass; non-failing directive/bundle advisories |
| `pnpm test:browser:storybook` | **80/80 passed** |
| `WORKBENCH_PORT=5199 pnpm test:browser:workbench` | **79 passed, 1 intentional mobile-only skip** |
| `pnpm test:browser:design-command-live` | **1/1 passed**; missing credential fails closed |
| `node tools/verify-workbench-controls-preview-refinement.mjs` | pass |
| `git diff --check` | pass |

The first unprivileged attempts to write linked dependency caches/build outputs
were sandbox-denied; the same commands passed through the admitted local execution
route. A parallel browser invocation briefly collided on port 5173; the Workbench
matrix then passed on isolated local port 5199. Neither was an artifact failure.

The candidate still requires the reserved fresh Codex STANDARD verifier and final
owner desktop/mobile visual review. Lead browser evidence remains Lead-attributed.

## Superseded Astra continuation handoff (2026-09-25 Asia/Manila)

The exact handoff audit found HEAD `628d1af11843ee661384b424585cdda6edaf515f`,
branch `loop/workbench-controls-preview-refinement-v1-001`, and a clean worktree.
AGENTS, BRIEF, the Loop specification, local supplied task, contract, and this
checkpoint were read before editing. The handoff diff was inspected. Baseline
`pnpm typecheck` passed; `pnpm test` passed **632 tests / 36 files** after
setting TMPDIR inside this writable worktree. Its first invocation failed before
running tests because the system temporary directory is not writable.

**Current status: implementation and test port preserved, browser execution and
commit blocked by the worker sandbox. HEAD has NOT moved. The candidate is
uncommitted and is NOT clean, accepted, or promoted.** No escalation was requested.

### Continuation changes

- `apps/workbench/src/App.tsx`: full-region grouped Base UI Select with Built-in
  and Custom groups, canonical selection/persistence and disabled state retained;
  nonvisual status hook on the shell; metadata row removed. Removed repeating
  tab headings and intros. Command uses FIELD_LABEL_CLASS and an associated
  safety description. Removed manual JSON authoring, toolbar Proposal action,
  parser state, example insertion, and rendered proposal log. Retained session
  records, Design Command staging, errors/result, candidate review, Apply/Discard,
  stale handling, validation, locking, and active/candidate isolation.
- `apps/workbench/src/styles.css`: zero preview-body padding, zero border/radius
  on the viewport, flex fill with min-height zero, full selector-region styling,
  inset focus indicator, and gallery-only eight-root shadow suppression.
- `apps/workbench/src/lifecycle.ts` and `lifecycle.test.ts`: removed only the
  unused manual JSON parser/example helper and their two tests. Remaining
  proposal lifecycle tests still exercise duplicate IDs, mismatched bases,
  stale Apply, atomic validation and persistence.
- `e2e/design-command-fixture.ts`: deterministic intercepted product API
  responses with no provider call; real client, proposal construction and gate.
- Ported `design-command.spec.ts`, `design-command-live-boundary.spec.ts`,
  `proposal-preview.spec.ts`, `theme-v2-live-controls.spec.ts`,
  `workbench.spec.ts`, `workbench-navigation.ts`, and
  `quiet-workspace.spec.ts`. Metadata assertions now use canonical style
  attributes/shell status. Font search replaces free-text stacks. Removed
  unreachable arbitrary-envelope browser cases; frozen core/lifecycle tests
  retain those guarantees, and browser tests now reject invalid, oversized and
  unknown command operations. Keyboard Evaluate/Discard/Evaluate/Apply and
  computed changes in all six categories remain covered.
- Added exact color-order, ordinary label style, removed UI, eight shadowless
  roots and retained elevation-sample assertions. Added desktop/mobile flush
  geometry, Select keyboard/persistence/groups and post-resize popup alignment
  plus option hit-testing, and open-state axe checks. Added all 24 fonts'
  registered local-face loading in shell/iframe, canonical export, Save/reload
  per option, keyboard/pointer/search and same-origin font request audit.
- `tools/verify-workbench-controls-preview-refinement.mjs`: scans committed and
  uncommitted candidate paths against prepared base; freezes existing resources,
  schemas/tokens/mutations/persistence/server/Jev, dependencies, lockfile and
  handoff font catalog; checks 16 exact registry/catalog IDs, 11 operations,
  absent manual authoring, preserved proposal calls and bundle/font/network/
  credential boundaries. This is a producer scan, not protected verification.

### Current producer evidence

Local raw evidence is under `test-results/wcpr-evidence/` (gitignored; preserve
it before a browser run cleans test-results). The final manifest records file
SHA-256 values, environment, criterion coverage and limitations.

| Command | Observed result | Raw evidence |
| --- | --- | --- |
| `TMPDIR="$PWD/test-results/tmp" pnpm test` | 36 files / **630 tests pass**; minus exactly 2 removed authoring-helper tests | unit.log |
| `pnpm typecheck` | pass, includes e2e and Jev typechecks | typecheck.log |
| `pnpm registry:build` | pass, 16 resources | registry.log |
| `TMPDIR="$PWD/test-results/tmp" pnpm build:workbench` | pass; existing large-bundle warning | workbench-build.log |
| `TMPDIR="$PWD/test-results/tmp" STORYBOOK_DISABLE_TELEMETRY=1 pnpm build:storybook` | pass; build directive warnings | storybook-build.log |
| `pnpm test:browser:storybook --list` | 80 tests / 17 files collected | storybook-collection.log |
| `pnpm test:browser:workbench --list` | 80 tests / 6 files collected (includes expected desktop-only mobile skip) | workbench-collection.log |
| `pnpm test:browser:design-command-live --list` | 1 test collected | boundary-collection.log |
| `node tools/verify-workbench-controls-preview-refinement.mjs` | pass on uncommitted candidate; frozen hashes in report | verifier.json |
| `git diff --check` | pass | diff-check.log |

Verifier correction: the added font URL scan initially rejected Vite's embedded
`data:font/woff` fallback from pinned Lato. This was a verifier false positive:
embedded local font bytes make no runtime request. The scan now allows local/
embedded assets while rejecting HTTP/protocol-relative font URLs. Final scan passes.

Recovery files: `test-results/wcpr-evidence/continuation.patch` contains the tracked
diff plus both new files; `manifest.json` records source/report hashes and blockers.
Do not apply that patch over this already-modified worktree.

Browser attempt:
`TMPDIR="$PWD/test-results/tmp" pnpm test:browser:workbench --grep 'fills' --workers=1`
exited 1 before launching tests: `listen EPERM: operation not permitted
127.0.0.1:5173` from Vite preview. Full browser matrices and real middleware
execution were not retried through the same denied server capability.
Collection is not execution; **no current runtime geometry, font request,
screenshot, or decoded axe pass is claimed**.

Commit attempt: `git diff --check && git add apps/workbench/src/App.tsx
apps/workbench/src/styles.css apps/workbench/src/lifecycle.ts
apps/workbench/src/lifecycle.test.ts && git commit -m
'Refine Workbench controls and edge-to-edge preview'` stopped at git add:
`Unable to create .../.git/worktrees/workbench-controls-preview-refinement-v1-001/index.lock:
Operation not permitted`. The Git metadata directory is read-only in the supplied
worker profile. No commit was created; no index lock or canonical runtime state
was modified.

### Remaining work and unresolved risks

1. Lead must preserve/review the uncommitted files and commit from an authorized
   Git-write environment; this worker cannot fulfill the clean-committed-candidate
   requirement under the supplied profile.
2. Execute all three collected browser suites in an authorized local renderer
   environment, decode axe attachments, and retain desktop/mobile screenshots.
   The added browser assertions are typechecked and collected but unexecuted.
   Any test/product correction must be justified by concrete failing evidence.
3. **Special Select risk remains unresolved:** the existing in-place fixed popup
   implementation is unchanged. New tests compare its rect with the full trigger
   before/after resizing and hit-test an option to detect clipping. No actual
   browser geometry was available, so no portal/positioning correction was made.
4. Runtime font loading, all-option persistence/export, gallery shadow scope,
   reduced motion, responsive accessibility and edge-to-edge geometry still need
   those browser measurements. Build/static/unit evidence does not substitute.
5. Re-run the phase scan on the exact clean committed candidate, then hand it to
   the Lead. WCPR-18 protected fresh verification and owner visual review remain
   reserved, outside producer authority.

No dependencies, font catalog, public resources, frozen product boundaries,
credentials, external network, agents, canonical .loop runtime state, deployment,
acceptance or promotion were added or invoked.

---

The sections below are the **historical Claude handoff at 628d1af**, retained for
provenance. Their “remaining scope” and “next safe action” lists are superseded by
the current continuation state above.
## Completed scope

- **Unit 1: resources (commit `9daaea6`). Covers WCPR-04, WCPR-05 (resource side), WCPR-11, WCPR-15 (Storybook
  side), and WCPR-17 (registry count).**
  - `packages/ui/src/components/select.tsx`: the shadcn Select, Base UI variant over `@base-ui/react@1.8.0`. Its popup
    renders in place with `positionMethod="fixed"` instead of through a portal. See Decisions.
  - `combobox.tsx`: the shadcn Combobox over Base UI. shadcn's InputGroup is replaced by Base UI
    `Combobox.InputGroup` with the Input styling inlined. The trigger has the accessible name "Show options".
  - `chart.tsx`: the shadcn Chart over `recharts@3.10.1`.
  - Stories for all three.
  - Contracts in `packages/core/src/contracts/data/{select,combobox,chart}.ts`.
  - Constraint kinds `select`, `combobox`, and `chart`, with rules `select.accessible-name|option-values|group-label`,
    `combobox.accessible-name|option-values|empty-state|searchable-size`, and
    `chart.text-summary|accessibility-layer|theme-colors|series-labels`, plus valid and invalid fixtures.
  - Also updated: the catalog, context kinds, provenance hashes, the README, context/contract/foundation tests, and
    `registry.json`, which now has **16 items**.
  - Storybook specs: `e2e/select.spec.ts`, `e2e/combobox.spec.ts`, `e2e/chart.spec.ts`.
  - Productive Week (PUI-23 chart part) now uses ChartContainer + BarChart with `accessibilityLayer`. It keeps the same
    data (2,4,3,6,5,7,5), the sr-only summary, and fills `var(--chart-3)` with `var(--chart-2)` for Sunday.
- **Unit 2: local fonts (this commit). Covers WCPR-06, catalog and delivery side.**
  - `packages/ui/src/lib/fonts.ts` holds the closed 24-family catalog.
    - Each stack is the local face, then the plain name, then generic fallbacks. The face is `<Family> Variable`, or
      the plain name for Lato, Poppins, and IBM Plex Mono.
    - Fallbacks: sans `ui-sans-serif, system-ui, sans-serif`; serif `ui-serif, Georgia, serif`; mono
      `ui-monospace, SFMono-Regular, Menlo, monospace`.
  - `packages/ui/src/lib/font-faces.ts` imports the 24 pinned Fontsource packages. The static packages load these
    weights: Lato 400/700; Poppins and IBM Plex Mono 400/500/600/700.
  - The Workbench imports these faces in `apps/workbench/src/main.tsx`, so both the chrome and the preview iframe
    load them.
  - `packages/ui/src/fonts.test.ts` checks:
    - exactly 24 families, in order;
    - every stack is admitted by `setFontFamily`;
    - every face matches the family registered in its package CSS;
    - the CSS references only `./files/*.woff2?`.
- **Unit 3: Workbench controls. PARTIAL (this commit).**
  - PUI-24 / WCPR-13 (source side): `COLOR_GROUPS` follows the exact approved order Primary, Secondary, Accent, Base,
    Card, Popover, Muted, Destructive, "Border, Input & Ring", Charts. All 24 tokens appear exactly once (unit test).
  - PUI-21 (partial): `FIELD_LABEL_CLASS` (`text-xs font-normal text-muted-foreground`) is applied to the colour,
    numeric, text, and font labels. Colour labels are readable (`colorTokenLabel`: `Card foreground`, `Chart 1`). The
    picker is still named `<Label> picker`.
  - PUI-20 (partial): `LiveFontField` in `LiveControls.tsx` is a Combobox over the catalog.
    - It writes the full stack through `buildFontOperation` → `setFontFamily` → `applyManual`.
    - A stack that is not in the catalog is shown as "Current stack: …" and linked with aria-describedby.
    - It is wired into the Typography tab as "Sans font", "Serif font", and "Mono font". The free-text font stack
      fields are gone.

## Checks run (all local, offline)

| Check | Result |
| --- | --- |
| `pnpm test` at the prepared base | 35 files / 597 tests pass |
| `pnpm test` at HEAD | 36 files / 632 tests pass |
| `pnpm typecheck` (all packages, e2e, jev) at HEAD | pass |
| `pnpm registry:build` | pass; 16 items built |
| `pnpm build:storybook` (after unit 1) | pass |
| Playwright Storybook specs `select`, `combobox`, `chart` (unit 1) | pass on both mobile-390x844 and desktop-1440x900. Covers keyboard, pointer, disabled, reduced motion, narrow viewport, and open-state axe with zero serious/critical findings in light and dark |
| `pnpm build:workbench` at HEAD | pass |
| Static audit of the build | 160 woff2 files under `/assets`; no `fonts.googleapis`/`gstatic` or external font URL in CSS/JS |

Not yet run:

- the full Storybook matrix;
- the Workbench browser matrix;
- the Design Command live boundary;
- the phase verifier (not yet written);
- a runtime network audit of font requests.

The Workbench e2e specs are **expected to fail** until unit 3 is finished. Details are in "Known failures and risks".

## Known failures and risks

- The Workbench e2e specs still use the old UI:
  - the `theme-id` / `theme-revision` / `theme-status` testids;
  - the "Proposal JSON" / "Stage proposal" / "Insert example" controls;
  - `proposal-log`;
  - old colour label text such as `card-foreground`;
  - the "Sans font stack" text fields;
  - the old group title "Surfaces";
  - the Panel headings, e.g. `getByRole("heading", { name: "Design command" })`.

  Affected specs: `workbench.spec.ts`, `quiet-workspace.spec.ts`, `theme-v2-live-controls.spec.ts`,
  `proposal-preview.spec.ts`, `design-command.spec.ts`, `design-command-live-boundary.spec.ts`,
  `default-equivalence.spec.ts`, and `workbench-navigation.ts`. Colour-label and font-field locators are already
  stale at HEAD.
- **Decision (Select):** Radix Select was tried first. With the listbox open, axe reported serious
  `aria-hidden-focus`: the page is aria-hidden but the trigger stays focusable, and axe exempts only modal dialogs. A
  portalled Base UI Select fails the same rule, because of its aria-hidden, tabbable focus-guard spans. The in-place
  Base UI popup renders no guards and passes. **Risk to check in the Workbench:** an ancestor with
  transform/filter/contain would clip the fixed popup or move its containing block. The theme Select sits in the
  editor panel, so verify its geometry.
- Base UI lets keyboard users reach disabled Select options, but they cannot be selected. This is valid under the APG,
  and the spec asserts it.
- The ChartTooltip/Legend content types are a Recharts 3 adaptation of the shadcn chart, typed with
  `Partial<TooltipContentProps>`.
- Axe on the Chart story: the focused state passes. The Productive Week story passes.

## Remaining scope (exact)

1. **PUI-16/18, WCPR-03:** in `App.tsx`, replace the active-theme `NativeSelect` with `Select`.
   - Use `aria-label="Active theme"`, `modal` left at default, and `disabled={locked}`.
   - Add `items` or a SelectValue children function for the display names.
   - Use grouped `SelectGroup`/`SelectLabel` sections "Built-in" and "Custom". A richer option (for example a small
     aria-hidden light-mode swatch row of primary/accent/background) is optional.
   - Make the trigger fill the `.quiet-theme` region with no border, radius, or nested pill, and an inset focus ring.
   - Delete the `theme-meta` row and the `.quiet-theme-meta` CSS.
   - Keep test hooks non-visual. The `<style id="workbench-active-theme" data-theme-id data-revision>` element already
     exists; optionally add `data-theme-status` on `.quiet-shell` so the status assertions can migrate.
2. **PUI-19, WCPR-07:** replace the `<Panel title=…>` wrappers of the Colors/Typography/Other/Design command tab panels
   with untitled containers.
   - Remove the introductory `<p>` descriptions.
   - Keep `manualLockNote`, errors, and status text. Keep one short safety instruction for Design command, e.g. a
     FieldDescription: "Changes are staged for review; nothing applies automatically."
   - Radix TabsContent keeps its accessible names through aria-labelledby.
3. **PUI-22, WCPR-09/10:** delete the manual proposal authoring UI.
   - Remove the "Mutation proposal" Panel (`#proposal-editor`), `proposalText`, `proposalTextId`, `stage()`, Insert
     example, the Stage button, the `proposal-log` list, and the toolbar "Proposal" button.
   - Remove `parseProposalJson` and `exampleProposalJson` from `lifecycle.ts` and their tests in `lifecycle.test.ts`.
   - Keep `proposalIssues`/`proposalResult`, rendered in the Command tab under the same testids `proposal-error` and
     `proposal-result`.
   - Keep the Design Command staging, the `#candidate-review` "Staged proposal" panel, Apply/Discard, stale handling,
     and locking.
4. **PUI-21 (rest):** apply `FIELD_LABEL_CLASS` to the Command textarea label. Keep the Save As dialog label as it is.
5. **PUI-11, WCPR-02:** in `styles.css`, change `.quiet-preview-body` to padding 0, `flex: 1 1 0`, `min-height: 0`.
   - In `App.tsx`, drop `rounded-md border` from `.quiet-viewport` and use an inset focus ring.
   - Verify that the iframe's rect equals the panel area below the toolbar/status bar, on desktop and in mobile Preview
     mode.
6. **PUI-23 (gallery), WCPR-12:** add `.quiet-gallery [data-composition] > [data-slot=card] { box-shadow: none; }` to
   the Workbench `styles.css`. Do not change `card.tsx`.
   - Verify that all eight roots compute `box-shadow: none` and that `[data-testid=elevation-sample]` still casts a
     shadow.
7. **e2e:** port the Workbench specs.
   - Move theme id/revision assertions to the `#workbench-active-theme` attributes.
   - Stage proposals by stubbing `**/api/design-command/evaluate` with `page.route`, following the existing staged
     outcome in `design-command.spec.ts`. This replaces the manual JSON path in `proposal-preview.spec.ts`,
     `design-command.spec.ts`, and `theme-v2-live-controls.spec.ts`.
   - Update colour labels ("Card foreground") and groups.
   - Add coverage for:
     - the font Combobox: search, keyboard, pointer, disabled while locked, persist/export/reload of the stack;
     - a runtime font request audit: every request to a font resource must be same-origin;
     - the edge-to-edge geometry;
     - the theme Select: keyboard, grouping, persistence, and locked state;
     - absence of the Proposal UI, the metadata row, and the tab headings.
8. **Verifier:** write `tools/verify-workbench-controls-preview-refinement.mjs`, modelled on
   `tools/verify-workbench-theme-editor-polish.mjs`.
   - Admitted changed paths are relative to `c68c8a2`.
   - Frozen: Theme v2 schema, tokens, fixtures, mutation ops (the same 11), persistence, `server/`, and Jev.
   - Exactly 16 registry items, matching the catalog.
   - Dependencies and lockfile are identical to `c68c8a2`.
   - No proposal-authoring strings.
   - Bundle credential and network scan.
9. Run the full evidence set:
   - `pnpm test`, `pnpm typecheck`, `pnpm registry:build`, `pnpm build:workbench`, `pnpm build:storybook`;
   - `pnpm test:browser:storybook`, `pnpm test:browser:workbench`, `pnpm test:browser:design-command-live`;
   - the verifier;
   - `git diff --check`.

## Dependency and font provenance

- All dependencies were pinned by the prepared base `c68c8a2` in `packages/ui/package.json` and `pnpm-lock.yaml`.
  This phase changed neither file.
- UI primitives:
  - `@base-ui/react@1.8.0` provides Select and Combobox.
  - `recharts@3.10.1` provides Chart.
  - `radix-ui@^1.6.7` is unchanged and no longer used by Select.
- Fonts come from 21 `@fontsource-variable/*` packages at 5.3.0 (google-sans at 5.3.1), plus the static packages
  `@fontsource/lato`, `@fontsource/poppins`, and `@fontsource/ibm-plex-mono` at 5.3.0.
- No network was used. No credentials, paid capacity, agents, or canonical `.loop` state were touched.

## Next safe action (provider-neutral / Astra continuation)

1. Check out branch `loop/workbench-controls-preview-refinement-v1-001` at its tip.
2. Run `pnpm install --offline` only if `node_modules` is missing.
3. Confirm the baseline: `pnpm test` gives 632 passing tests, and `pnpm typecheck` passes.
4. Implement "Remaining scope" items 1–6 in `apps/workbench/src/App.tsx` and `styles.css`.
5. Then do item 7 (e2e), item 8 (verifier), and item 9 (evidence).
6. Update this checkpoint. Do not claim acceptance. WCPR-18 remains protected verification plus owner review.
