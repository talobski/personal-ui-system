# Workbench nested gallery interaction polish — producer checkpoint

Phase: `workbench-nested-gallery-interaction-polish-v1-001`

Accepted product base: `a33c3d025fe408593264b96f76f4f6054d83b758`

Prepared implementation base: `8d364b14ea70c4fb2192918033d21b5a0c6363d2`

Astra handoff commit: `c9cf88c13e7e7c95a4dd28ad511f160cdfca7937`

Producer candidate: the commit that contains this revision of the checkpoint on
branch `loop/workbench-nested-gallery-interaction-polish-v1-001`.

This is a producer checkpoint, not acceptance or verification. Formal browser
evidence, protected verification, promotion, and closeout remain Lead-owned.

## Handoff record

The sole authorized Astra MAX producer delivered most of the implementation and
was stopped for an owner-requested handoff to Claude STRONG (`claude-opus-5-5`,
medium). The replacement producer continued from `c9cf88c` on the same branch,
worktree, frozen packet, contract, criteria, and envelope. It preserved valid
Astra work and changed only demonstrated defects, stale assertions, and missing
evidence. No second MAX dispatch, subagent, or provider change occurred.

## Final gallery ownership model (PUI-65)

- Compositions own content only. `PREVIEW_COMPOSITIONS` is `{ id, render }`
  with no placement metadata. `PreviewLayout`, `data-layout`, and global span
  rules were **removed**, not adapted. Composition and resource sources are
  unchanged.
- `Gallery` owns the recipe as explicit JSX regions:
  - `.quiet-gallery`: outer flex column.
  - `.quiet-gallery-principal`: a grid holding two independent flex stacks,
    `activity` (Productive Week, Team Access) and `profile-actions`
    (Account Profile, Notifications, Support Request).
  - Workspace Settings: a full-region item.
  - `.quiet-gallery-pair` (`local-pair`): the one intentional side-by-side
    group (Recent Activity, Room to Think).
- Breakpoints use the preview document's own width:
  - below 40rem: one column;
  - from 40rem: only the local pair is two columns;
  - from 60rem: the principal stacks split `minmax(0, 7fr) minmax(0, 5fr)`,
    and every gap becomes 24px (16px below).
- DOM, reading, and focus order are activity stack, then profile/action
  stack, then Workspace Settings, then the pair. There is no visual
  reordering, masonry, dense packing, per-item grid placement, aspect ratio,
  or absolute positioning. Heights stay content-driven.
- The initial recipe was kept. Browser evidence showed no need for bounded
  regrouping.

## Criteria status (producer view)

| Criterion | Status | Evidence |
| --- | --- | --- |
| NGIP-01 frozen traceability | met | Verifier checks packet bytes vs `8d364b1`, per-ticket/index/manifest/contract/task hashes, retrieval timestamp, and comment/attachment arrays |
| NGIP-02 bounded delivery | met | Verifier admitted-path allowlist (35 changed paths), whitespace/EOF, no deletions, `.gitignore` adds only `.worker-tmp/` |
| NGIP-03 failure reproduction | met | `gallery.test.ts` row model; browser NGIP-03 renders the frozen `e2e/fixtures/flat-gallery-regression.ts` (324px Week→Team gap: 300px dead space plus the 24px gap), then measures the real gallery at exactly 24px |
| NGIP-04 nested gallery | met | Browser NGIP-04/05 at 390/1100/1440: region structure, stack packing (next card starts exactly one gap after its predecessor), natural heights, full-width Workspace Settings, local pair |
| NGIP-05 responsive order | met | Same test: containment, no overflow, `auto` placement, 7:5 ratio at wide, real Tab traversal equals DOM order over every composition with tabbable controls, axe light/dark |
| NGIP-06 metadata removal | met | Verifier and unit test: no `PreviewLayout`/span metadata in product source; compositions byte-frozen |
| NGIP-07 preview Tabs | met | Official shadcn Tabs with shared `CATEGORY_TRIGGER_CLASS`. Browser checks: computed style equals sidebar active/inactive tabs, left inset, ARIA/`aria-controls`, roving tabindex, Arrow/Home/End, focus ring, panel content, default and reduced motion |
| NGIP-08 Body trigger typography | met | `.quiet-section-trigger` inherits Body family/weight/tracking. Browser checks every visible trigger in both built-ins × both modes against computed Body; Body font change reaches triggers; manual serif Heading does not |
| NGIP-09 built-in sans Heading | met | Verifier: in both fixtures only `typography.heading.font` changed, and it equals Body; weights 600/400; generated CSS and provenance mirrors match. Browser: preview title family equals Body |
| NGIP-10 migration boundary | met | `migrate.ts` byte-frozen (serif → Heading); migrate tests; manual serif Heading exercised in browser |
| NGIP-11 toolbar | met | Browser: `Undo Redo Reset | Export Save`, 1×32px separator on the border token and centred in the 64px toolbar, default cursor and no pointer events when disabled, pointer when enabled, focus order Reset→Export→Save, JSON payload unchanged |
| NGIP-12 picker responsiveness | met (producer) | Controller unit tests. Browser: local swatch updates on every movement with no canonical write during movement; one write carries the latest value. Measured 131.9–137.6ms after the last movement (120ms timer plus render), so no retuning. `change`, `pointerup`, blur, and text focus each flush in under 60ms, with nothing landing later |
| NGIP-13 history integration | met (producer) | One revision and one Undo checkpoint for a gesture that pauses past the debounce; Undo/Redo and dirty status. Browser lifecycle tests: mode switch, theme switch, command evaluation/staging/lock/Apply, Export, Save, and the shadow picker |
| NGIP-14 frozen boundaries | met | Verifier: 354 tracked files byte-frozen, including package/lock/registry/components.json, public primitives, schema, mutations, migration, persistence, history, and compositions. Registry 19 and `public/r` matches it; exactly 12 operations; no network/credential surface in changed source or bundle |
| NGIP-15 Lead browser evidence | Lead-owned | Definitions complete and locally green (below) |
| NGIP-16 protected verification | Lead-owned | Not started by the producer |

## Audit of the Astra implementation

Preserved as correct: gallery recipe and CSS, `PreviewLayout` removal,
preview Tabs and shared class, trigger Body inheritance, built-in fixtures and
mirrors, toolbar separator/label/cursors, `ColorPickerController`, and its
tests.

`App.tsx` supporting changes were reviewed and kept, because each is required
by an invariant:

- The gesture-step revision clamp keeps the live revision monotonic when a
  continuous gesture returns to its base value after a debounced step has
  already reached the preview.
- `evaluateCommand`, `save`, Export, and mode switching call `endGesture()`
  first and then read `currentRef`. A flush can land a pending picker write
  synchronously, so the render-scoped `current` would be stale.
- Locking and unmount cancel the controller. A lock always starts inside
  `evaluateCommand`, after its flush.

Defects corrected by the replacement producer:

1. `LiveColorField` assigned its native `change` handler inside an effect that
   ran only on mount. Completion therefore used the first render's `value`
   (alpha), `disabled`, and `apply`/lock state. Now one render-fresh `move`
   handler serves both `onInput` and the native listener through a ref.
2. Focusing the colour text field flushed the picker, but the field marked
   itself focused first, so its draft kept showing the pre-flush value. Now
   only an actively typed draft is protected from canonical updates. This
   defect was demonstrated by the browser text-focus flush case.
3. `save` called `endGesture()` twice. The duplicate was removed.
4. `workbenchTabs.ts` and this checkpoint ended with an extra blank line. Both
   were normalized.

## Assertions migrated (coverage kept)

- The unit lifecycle test now requires enabled-only cursors, the exact
  separator, and no `Export JSON`.
- Old Select-based preview-view steps in quiet-workspace, rendering-controls,
  control-navigation, and sidebar-preview-followup now use the Tabs through
  the shared `previewView` helper. Keyboard, focus, state-retention, and
  left-alignment assertions replace the centred-Select checks.
- `Export JSON` became `Export` in every workbench spec and helper.
- WTCP-09 now expects the corrected sans Heading copy.
- STHG's section-label Heading check became a Body check (NGIP-08).
- WRCP/WTCP/WSPF trigger tracking checks changed from "positive local
  tracking" to "equals Body tracking", as the contract requires.
- STHG-13/14's flat-grid geometry test is superseded. Its order,
  natural-height, containment, focus-order, and axe coverage moved into
  `workbench-nested-gallery-interaction-polish.spec.ts` against the nested
  regions.

## Commands and results (exact candidate code)

Environment: `TMPDIR=.worker-tmp`, `COREPACK_HOME=$HOME/.cache/node/corepack`,
`COREPACK_ENABLE_NETWORK=0`.

```text
pnpm test                          42 files, 782/782 passed
pnpm typecheck                     pass (workspace packages, e2e, tools/loop/jev)
pnpm build:workbench               pass
pnpm registry:build                pass; 19 items; no tracked change
node tools/verify-workbench-nested-gallery-interaction-polish.mjs
                                   {"ok":true,"changed":35,"frozen":354,"operations":12,"registry":19}
git diff --check                   pass
playwright -c playwright.workbench.config.ts (local Chromium, 127.0.0.1 only)
                                   241 passed, 3 skipped (designed single-project cases)
```

Verifier negative checks were each caught: debounce changed to 150ms, a stray
file, a `package.json` byte change, an `Export JSON` label, and an injected
`grid-column: span 2`.

The producer's local browser runs are authoring checks only. They are not the
Lead's formal NGIP-15 evidence. The Storybook browser suite and the live
design-command config were not run.

## Envelope incident

During the first unit/typecheck runs, the producer redirected `XDG_CACHE_HOME`
and `COREPACK_HOME` into `.worker-tmp`. Corepack then could not see the
installed pnpm and **downloaded pnpm 12.5.1 from `registry.npmjs.org`**. This
was unintended network access outside the worker envelope. No credentials,
dependencies, lockfile, or tracked files were affected, and the downloaded
copies were deleted. Every later command used the existing Corepack home with
`COREPACK_ENABLE_NETWORK=0`, and no further download occurred. The Lead should
record this incident.

## Remaining risk

- Real native colour popups differ by browser and OS. In Chromium, a popup
  drag fires `input` events, and `change` fires when the popup closes. The
  producer drives native `input`/`change`/`pointerup`/blur events in page;
  manual confirmation with a real popup has not been done.
- If a gesture pauses and the user then uses a keyboard shortcut path that
  fires no completion event, the checkpoint is recorded at the next
  completion, blur, or `endGesture` call. The canonical value is already
  committed after 120ms.
- Earlier-phase verifiers (for example
  `tools/verify-semantic-typography-history-grid.mjs`) are byte-frozen and
  still assert their own phase's layout and labels, so they are not expected
  to pass on this candidate.
- Timing assertions allow a 110–220ms window for the debounced write and
  under 60ms for flushes. Heavily loaded CI hosts could need more slack.
