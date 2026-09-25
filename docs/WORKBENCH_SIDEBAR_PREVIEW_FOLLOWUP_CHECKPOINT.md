# Workbench sidebar preview follow-up producer checkpoint

Phase: workbench-sidebar-preview-followup-v1-001 (PUI-51 through PUI-55, WSPF-01 through WSPF-13).
Accepted product: 90ea824027f71c8e9ef3e376d6c5c6263b56dee9.
Prepared base: a65c4ebd46d1e9ab63217645e05b18551b62ca37.
Status: producer candidate. Offline checks pass. Browser execution, fresh protected
verification, acceptance and promotion remain Lead-owned; none is claimed here.

## Product changes

| Ticket area | Change |
| --- | --- |
| Category navigation (WSPF-02) | `SidebarGroup` padding is `p-0`, so the accepted horizontal ScrollArea spans the full sidebar editor width. A `w-max p-4` wrapper inside the viewport carries the 16px inset, which scrolls with the content. The editor keeps its vertical ScrollArea; no other horizontal owner exists. |
| Category Tabs (WSPF-03) | Official Tabs. `TabsList` is `bg-transparent p-0` and keeps its 36px height. One shared trigger class: content width, `flex-none`, nowrap, `px-3`, `cursor-pointer`; active `bg-secondary text-secondary-foreground shadow-none` (dark included); inactive transparent `text-muted-foreground` with `hover:text-muted-foreground/80` and no hover fill. Radius, `py-1`, type, focus ring, ARIA and keyboard stay primitive-owned. The trigger keeps its accepted 29px height through `h-[calc(100%-7px)]`, because removing the list's 3px padding would otherwise stretch it to 35px. |
| Header (WSPF-04) | `SidebarHeader` adds `border-b` only. It stays `h-16` with `px-2 py-0`, and the border resolves to the global `--border`. |
| ControlSection (WSPF-05) | The shared trigger uses `bg-muted text-muted-foreground ring-1 ring-border hover:bg-muted/80 hover:text-muted-foreground dark:hover:bg-muted/80 rounded-sm px-2 py-0.5`, compact uppercase tracking, `w-fit`, and the rotating `size-3` chevron. `text-foreground/75` is gone. The hover text override only keeps the ghost variant's accent foreground from replacing the pair. |
| Preview Select (WSPF-07) | The official Select is unchanged. Only the preview trigger adds `border-transparent bg-transparent shadow-none`, semantic `hover:bg-accent hover:text-accent-foreground`, `data-[popup-open]:bg-accent` and `cursor-pointer`. The primitive `focus-visible` border and ring remain. The border stays 1px (transparent), so geometry does not shift. |
| Preview spacing (WSPF-08) | The preview root `main` is `grid gap-4 p-4`. The States inner grid, gallery grid and cards are untouched. |
| Preview scroll owner (WSPF-09) | `PreviewFrame` returns one vertical `ScrollArea` (`quiet-scroll-area h-dvh w-full`, `type="auto"`) at its document root. Its focusable viewport is named by `role="group"` and `aria-label="Preview document"`, which avoids nesting `main` inside a landmark. A layout effect adds `quiet-preview-document` to the iframe `<html>`, and styles.css gives that root and its body `height: 100%; overflow: hidden`. The Workbench iframe container is byte-identical, so no outer ScrollArea exists. The toolbar stays outside the iframe. Radix overlay bars reserve no width, and no scroll handlers were added. |

The only product files changed are App.tsx, LiveControls.tsx, PreviewFrame.tsx and
styles.css. Public components, registry, Theme v2 schema and tokens, mutations,
persistence, the proposal lifecycle, Design Command, Jev, credentials, network code,
dependencies and the lockfile are byte-frozen, and the phase verifier enforces this.

## Accessibility disposition (WSPF-06)

These measurements are offline and come from the frozen fixture CSS. Raw values are in
docs/evidence/workbench-sidebar-preview-followup/contrast.json.

| Theme / mode | Section trigger at rest (muted-fg on muted) | Trigger hover | Inactive tab | Active tab |
| --- | --- | --- | --- | --- |
| Default light | **4.349:1** (#737373 on #f5f5f5) | 4.426:1 | 4.742:1 | 16.444:1 |
| Default dark | 5.857:1 | 6.083:1 | 6.939:1 | 14.499:1 |
| Quiet Editorial light | 6.611:1 | 6.769:1 | 7.423:1 | 13.821:1 |
| Quiet Editorial dark | 6.777:1 | 7.065:1 | 8.148:1 | 13.404:1 |

The Default light section-trigger pair is the single pre-approved deferred debt. It is
not suppressed, hidden, reclassified or worked around, and Default tokens are unchanged.
Receipts must name this exception; no result may be described as universally zero.

How the exception is handled in tests:

- e2e/known-contrast-debt.ts separates only color-contrast nodes that meet every one of
  these conditions:
  - the node is in the top Workbench document;
  - it matches `[data-testid^="section-"] > h3 > button`;
  - axe reports fgColor `#737373` and bgColor `#f5f5f5`;
  - the reported ratio is between 4.3 and 4.4.
- Separated nodes are attached as `known-contrast-debt-*.json` and annotated as
  `known-contrast-debt`. Every other serious or critical node still fails, including
  the same rule on any other element, pair or ratio.
- Every Workbench spec that runs axe goes through this one helper. The verifier rejects
  any remaining ad hoc impact filter and any AxeBuilder include/exclude/rule/tag options.
- The phase spec also measures every trigger with the renderer and attaches
  `wspf-06-contrast-*.json`. In light mode it requires the debt nodes to be present at
  about 4.35:1. In dark mode it requires none, so the exception can neither widen nor
  quietly disappear.

Separate observation, not suppressed and not an axe finding at rest: the owner-specified
inactive-tab hover `text-muted-foreground/80` computes to about 3.23:1 in Default light
and 4.47:1 in Quiet Editorial light. It is a transient hover state, and axe runs after
the pointer settles. The Lead should decide whether to record it as further debt.

## Tests

- Unit: the WRCP-05 foreground-step test is replaced by a WSPF-05/06 measurement test.
  It asserts that the only sub-4.5 pair is default/light, between 4.3 and 4.4, and that
  the Default token values are frozen. New source-contract tests cover WSPF-02, 03, 04,
  07, 08 and 09. The WCN-04/05 ownership test in quiet-workspace.test.ts now expects
  exactly one preview ScrollArea and none around the iframe.
- New e2e spec: e2e/workbench-sidebar-preview-followup.spec.ts has 10 tests per
  viewport, 20 in total:
  - light/dark × both reduced-motion settings, for the sidebar/preview matrix and for
    the preview-scroll matrix;
  - touch-equivalent scrolling with the mobile sheet;
  - live editing with view state and scroll position preserved.
  It is registered in playwright.workbench.config.ts and ignored by the Storybook config.
- Superseded assertions were updated in place with comments; no test was deleted or
  skipped:
  - WTCP: header border 0px → 1px, and trigger `text-foreground/75` →
    `text-muted-foreground`;
  - WRCP: the trigger class, and native preview-document scrolling → viewport scrolling
    with the document root fixed at 0;
  - WCN: preview ScrollArea count 0 → 1;
  - quiet-workspace: the preview document can no longer be scrolled programmatically,
    and its viewport can.

## Commands (offline, worker-run)

TMPDIR was set to the worktree scratch directory. Logs are in
docs/evidence/workbench-sidebar-preview-followup/.

- `pnpm test`: 38 files, 684 tests passed.
- `pnpm typecheck`: passed (packages, e2e, Jev).
- `pnpm registry:build`: passed; registry.json and public/r are byte-unchanged (19 items).
- `pnpm build:workbench`: passed, with the existing large-chunk warning. The built CSS
  contains every new utility.
- `STORYBOOK_DISABLE_TELEMETRY=1 pnpm build:storybook`: passed.
- `node tools/verify-workbench-sidebar-preview-followup.mjs`: passed. 305 frozen files,
  registry 19, operations 11, client bundle credential/network scan (boundary.json).
- Playwright collection: Workbench 144 definitions in 10 files (124 prior + 20 WSPF),
  Storybook 94 in 20 files, Design Command 1.
- `git diff --check`: passed.

Evidence logs were normalized for trailing whitespace and blank lines at EOF only, so
that `git diff --check` passes. No log content changed.

No browser, localhost server, network, credentials or escalation was used. Browser
results are not claimed.

## Criterion mapping

| Criterion | Evidence | Producer status |
| --- | --- | --- |
| WSPF-01 | Verifier allowlist against the prepared base; no deletions | Offline pass |
| WSPF-02 | App.tsx group/inset; unit source test; spec geometry, inset, overflow and containment | Source pass; browser pending |
| WSPF-03 | Shared trigger class; verifier exact token list; spec computed state, hover, keyboard and focus | Source pass; browser pending |
| WSPF-04 | Header class exactly prior plus `border-b`; spec border, height, padding and toolbar alignment | Source pass; browser pending |
| WSPF-05 | Exact trigger class; LiveControls otherwise byte-identical; spec computed pair, geometry and chevron | Source/unit pass; browser pending |
| WSPF-06 | contrast.json; unit measurement; helper, attachments and annotations; spec presence/absence check | Offline measured (4.349:1); browser/axe pending |
| WSPF-07 | Preview trigger classes; spec rest, hover, focus, keyboard, centring and state | Source pass; browser pending |
| WSPF-08 | `grid gap-4 p-4`; inner grids unchanged; spec gap, padding and gallery columns | Source pass; browser pending |
| WSPF-09 | One root ScrollArea, root overflow suppression, outer container byte-identical; spec ownership, no reserved width, no trap | Source/unit pass; browser pending |
| WSPF-10 | Spec wheel, small delta, keyboard, thumb drag, touch, focus reveal, both viewports, light/dark, reduced motion | Definitions/typecheck only |
| WSPF-11 | App logic byte-identical; iframe transport byte-identical; full unit suite; WSPF-11 spec; existing regression suites | Unit pass; browser pending |
| WSPF-12 | Frozen-file hashes, registry deep-equal 19, 11 operations, package/lock frozen | Offline pass |
| WSPF-13 | This record and the Lead-run browser matrix; fresh verifier | Lead-owned; not performed |

## Residual risks

- Renderer geometry is unmeasured in this worker. That includes the exact 29px trigger
  height, the scroll-extent inset, and axe's hex rounding for oklch. If axe rounds
  differently from `#737373`/`#f5f5f5`, the helper fails closed and reports the node as
  blocking; it does not widen the exception.
- The exception matches only the resting trigger. An axe run taken while the pointer
  still rests on a trigger would measure the hover fill (about 4.43:1) and fail.
  Existing suites move the pointer away before analysing.
- Radix measurement wrapper: `.quiet-scroll-area` forces `display:block` on it. That
  keeps the preview gallery width-bound, which is intended.
- Keyboard scrolling from a non-focusable click target inside the iframe relies on
  Chromium's scroll-target heuristics. The focusable viewport is the guaranteed path.
- Earlier phase verifiers (for example
  tools/verify-workbench-control-navigation-scroll.mjs) encode superseded assertions
  such as the native preview and the `text-foreground/75` trigger. They are historical
  and are expected to fail against this candidate.

## Next safe Lead action

Build the Workbench at the exact candidate commit, then run:

    pnpm build:workbench
    pnpm exec playwright test -c playwright.workbench.config.ts workbench-sidebar-preview-followup.spec.ts
    pnpm test:browser:workbench
    pnpm test:browser:storybook
    node tools/verify-workbench-sidebar-preview-followup.mjs

Keep the `known-contrast-debt-*.json` and `wspf-06-contrast-*.json` attachments as
WSPF-06 receipts. After that, the fresh protected verifier reviews the exact candidate.
