# Producer checkpoint — workbench-rendering-controls-polish-v1-001

Start (control commit): `9a11b0ee65885ab8fc3a3afe37aaa338e11d441f`.
Accepted product base: `473372c92ad23478c41cc151a79fb8274fea7d9f` (ancestor; the intervening
commits add only phase-admission records).
Branch: `loop/workbench-rendering-controls-polish-v1-001`.
Implementation commit: `7f01b0a636ab52e65df5091a0fe343590339049f`. The candidate is the commit that
adds this checkpoint; resolve it with `git rev-parse HEAD`.
Scope: PUI-38–PUI-43 / WRCP-01–WRCP-16. Producer candidate only; no acceptance, promotion,
protected verdict, or phase completion claimed.

## Implementation

- **Antialiasing (WRCP-02):** `main.tsx` adds Tailwind `antialiased` to `document.documentElement`. The same
  entry runs the Workbench and the isolated preview iframe, so both document roots, portalled popups, and the
  mobile sidebar sheet inherit it. No type token, family, weight, tracking, or line-height changed.
- **Shadow color (WRCP-03):** Shadow color now renders through the shared `LiveColorField` (native picker plus
  canonical text field) used by the Colors tab. `build` receives the latest active theme, so the shadow colour
  still enters through `buildShadowColorOperation` → `setShadowProfile`, and core normalizes it to canonical OKLCH.
  The opaque-colour hint is kept. The visible "Stored as" helper is gone. `LiveTextField` had no other callers,
  so it was removed.
- **Labels (WRCP-04):** the visible labels are now Opacity, Blur, Spread, Offset X, Offset Y, and Duration. Control ids,
  bounds, reads, and operations are byte-identical apart from the six label strings. The verifier checks this.
- **Shared trigger (WRCP-05):** `ControlSection` trigger is `h-auto w-fit rounded-md bg-muted px-2 py-0.5
  text-[0.6875rem] font-medium uppercase tracking-wide text-foreground/75 ring-1 ring-border hover:bg-muted/80
  hover:text-foreground/75 dark:hover:bg-muted/80 has-[>svg]:px-2`. The explicit hover and dark-hover
  classes replace the ghost variant's accent hover. `has-[>svg]:px-2` makes the computed inline padding 8px.
  Foreground choice: `muted-foreground` on full `muted` is 4.35:1 in Default light, so it fails. Foreground
  /60–/70 pass 4.5:1 but are weaker than `muted-foreground` in Quiet Editorial light (for example, /70 gives
  6.35 vs 6.61). **/75 is the minimum step** that is stronger than `muted-foreground` and ≥4.5:1, both at rest
  (`muted` over card) and on hover (`muted/80` over card), for both built-ins in both modes. The lowest of those
  ratios is 7.54:1. A unit test derives this minimum from the canonical theme values.
- **Scrollbars (WRCP-06):** the scoped `.quiet-scroll` thumb is `transparent` at rest. It uses the existing 70%
  `muted-foreground` mix on `:hover`, `:active`, and `:focus-within`, with the same colour logic in the WebKit
  pseudo-element fallback. Scrollbar width (`thin`/8px), overflow mode, and layout are unchanged. There is no
  overlay overflow value and no scrollbar library.
- **Top geometry and insets (WRCP-07/08):** `SidebarHeader` is `h-16 shrink-0 flex-row items-center px-2 py-0`.
  The theme selector is `px-2`, so its content sits 16px from the sidebar edge. The toolbar is
  `flex h-16 shrink-0 items-center gap-2 border-b px-4`, with wrapping removed so the row stays exactly 64px.
- **Tabs (WRCP-09):** the preview's Cards/States triggers take the sidebar's existing `text-xs`. The public
  `Tabs` primitive is frozen.
- **Controls (WRCP-10):** the numeric, colour, and Shadow color inputs, the Command textarea, the Save As name,
  and the font search input pass `text-sm`. The font search uses a scoped descendant variant on its input
  group. All compute to 14px at 390 and 1440. Public Input/Textarea/Combobox defaults are frozen.
  **Accepted tradeoff:** iOS Safari may zoom on focus of sub-16px editable text. There is no hidden 16px mobile
  override. This is documented in `LiveControls.tsx`.

## Criteria mapping

| Criteria | Evidence |
| --- | --- |
| WRCP-01, 14 | Phase verifier checks: exact path allowlist, 280 frozen files (schema, operations, persistence, Design Command, Jev, registry, public components, globals/type tokens, manifests, lockfile), no deletions, registry 18, operations 11, and source/bundle network and credential scans |
| WRCP-02 | Verifier (exact `main.tsx` delta, type-utility counts unchanged, built CSS contains `.antialiased`); browser spec checks both roots' class and computed `-webkit-font-smoothing` |
| WRCP-03, 04 | Unit tests: labels, operations, and picker → canonical OKLCH / translucent rejection. Browser tests: shared row structure equal to a Colors row, picker and keyboard entry, normalization, local rejection, forced-open section, axe. Updated `theme-v2-live-controls` flow. Verifier checks exact source. |
| WRCP-05 | Unit contrast-minimum test; verifier exact class and forbidden list; browser computed padding/size/case/tracking/ring/hover/focus/keyboard per section, and axe color-contrast in light/dark |
| WRCP-06 | Browser: sidebar content and preview document are transparent at rest and revealed on hover/focus-within, with width, overflow, and clientWidth unchanged and wheel scrolling working. Existing WSSP-07 suite. Verifier checks the CSS block. |
| WRCP-07, 08 | Browser: header and toolbar are exactly 64px flex/center. Desktop bottom edges are within 1/devicePixelRatio. Selector swatches, tabs, and rows sit at 16px; toolbar 16px inset with contained children at 390. Updated WTCP assertions. |
| WRCP-09 | Browser: sidebar and preview tabs are 12px; both lists are 36px high; aria-selected and arrow-key navigation work in both groups |
| WRCP-10 | Browser: every visible editable input or textarea in all four tabs, plus the font search and Save As, is 14px, contained, and focus-visible, and the invalid state works |
| WRCP-11, 12 | Browser matrix: 390x844 and 1440x900 × light/dark × no-preference/reduce. Axe runs on four editor tabs, the preview, and Shadow color, with 0 serious/critical findings. Document/iframe containment, reduced-motion chevrons, screenshots attached. |
| WRCP-13 | Full Workbench, Storybook, and Design Command live suites pass unchanged apart from the admitted label, class, and geometry expectation updates |
| WRCP-15 | Commands below |
| WRCP-16 | Excluded from producer claim. Owned by the protected verifier and Lead. |

## Commands and results (worker environment, candidate tree at `7f01b0a`)

- `TMPDIR="$PWD/dist/tmp" pnpm test`: PASS, 37 files / 674 tests.
- `pnpm typecheck`: PASS (core, UI, Workbench, e2e, Jev).
- `TMPDIR="$PWD/dist/tmp" pnpm registry:build`: PASS; tracked outputs unchanged.
- `TMPDIR="$PWD/dist/tmp" pnpm build:workbench`: PASS. The existing >500kB chunk advisory remains.
- `TMPDIR="$PWD/dist/tmp" STORYBOOK_DISABLE_TELEMETRY=1 pnpm build:storybook`: PASS.
- `WORKBENCH_PORT=5199 pnpm exec playwright test -c playwright.workbench.config.ts`: PASS, 110 passed, 2 skipped.
  The skips are the pre-existing intentional cross-viewport ones. The count includes the new phase spec's 10 cases.
- `pnpm exec playwright test` (Storybook): PASS, 88/88.
- `pnpm test:browser:design-command-live`: PASS, 1/1.
- `node tools/verify-workbench-rendering-controls-polish.mjs`: PASS, 280 frozen files, registry 18, operations 11.
- `git diff --check`: PASS.

Browser note: in this worker environment, localhost binding and headless Chromium worked without any
permission escalation, so the suites above actually ran. They are producer evidence, not Lead acceptance
evidence. The Lead still owns the attributed exact-candidate browser matrix.

During the run, the new spec needed three test-only corrections before its first full pass. It had a mistargeted
font-variable assertion, it used a Colors control after switching tabs, and it did not set focus-visible modality
before the focus-ring checks. Two comment-only product edits also came up. The phase verifier caught a literal banned
string in a CSS comment, and `/65` was replaced by `/75` after the stronger-than-muted analysis.

## Exact changed files

1. `apps/workbench/src/App.tsx`
2. `apps/workbench/src/LiveControls.tsx`
3. `apps/workbench/src/PreviewFrame.tsx`
4. `apps/workbench/src/controls.ts`
5. `apps/workbench/src/lifecycle.test.ts`
6. `apps/workbench/src/main.tsx`
7. `apps/workbench/src/styles.css`
8. `e2e/theme-v2-live-controls.spec.ts`
9. `e2e/workbench-navigation.ts`
10. `e2e/workbench-rendering-controls-polish.spec.ts` (new)
11. `e2e/workbench-theme-controls-polish.spec.ts`
12. `playwright.config.ts`
13. `playwright.workbench.config.ts`
14. `tools/verify-workbench-rendering-controls-polish.mjs` (new)
15. `docs/WORKBENCH_RENDERING_CONTROLS_POLISH_CHECKPOINT.md` (new)

## Known risks

- The prior-phase verifier `tools/verify-workbench-theme-controls-polish.mjs` is historical and pins that phase's
  exact source strings. It is expected to fail on this candidate and is superseded by this phase's verifier.
- The earlier WTCP browser assertions for 16px vertical toolbar padding, the 16px selector-trigger offset, and the
  half-strength trigger classes are updated to the admitted WRCP values. No assertion count dropped.
- Chromium and headless platform scrollbars are classic, not overlay. Overlay behavior on macOS or mobile
  platforms is platform-owned and not asserted.
- Contrast was verified for the two built-ins only. Custom themes can choose any `foreground`/`muted` pair.
- The toolbar no longer wraps. At 390px its contents fit with the 16px inset (asserted), but much longer
  localized labels would need a revisit.
- Edits were made with the harness's exact-string edit and write tools. `apply_patch` is not available in this
  environment. The result is equivalent reviewed patches.

## Safe handoff

The Lead runs the exact-candidate browser matrix and attributes its reports. A fresh protected verifier then
performs the offline/source/contract/boundary/evidence-integrity audit. No acceptance or promotion is
authorized by this checkpoint.
