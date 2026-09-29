# Workbench performance — producer checkpoint (PUI-118)

Phase `workbench-performance-v1-001`. This is producer evidence only. Lead owns exact-candidate browser acceptance, and
a fresh protected verifier audits later.

## Lineage

- Prep: `1af3444e04152c789699187faa6d98c32ddf9587`. Parent control: `1fe35bb8…`. Accepted product: `be63bef2…`.
- Baseline checkpoint: `beb2224`, "docs(PUI-118): record Workbench performance baseline before product edits". It holds
  `docs/WORKBENCH_PERFORMANCE_BASELINE.md`, `docs/evidence/workbench-performance-v1/{baseline,harness}/` and no
  product or source change.
- The product change follows in the next commit. Packet hashes are unchanged:
  `docs/WORKBENCH_PERFORMANCE_CONTRACT.md` is sha256 `f02d6a0d…0e367` and `linear/PUI-118.json` is
  `64fe7e3a…cba5b`.

## Change (H1 only)

The baseline hotspot H1 is that the preview iframe re-rendered its whole force-mounted tree, about 1,300 components, on
every posted state and every preview view switch. This change adds memo boundaries around the preview subtrees that do
not read posted state:

- `apps/workbench/src/PreviewFrame.tsx`: `CardsView = React.memo(Gallery)` and `AppShellsView = React.memo(AppShells)`.
  The States samples move unchanged into a memoized `StatesView`, defined after `PreviewFrame` and rendered as a
  fragment, so the DOM, `TabsList` order and the `states` panel are identical. It owns its own
  `buttonActivations` counter.
- `apps/workbench/src/DesignSystemPreview.tsx`: the export is `React.memo` over the same function. It still re-renders
  whenever `source` (mode plus CSS) changes, and it bails out on view switches and value-identical reposts (H4).

Unchanged: the parent → iframe message and its CSS/mode payload, post frequency (10 posts for 10 radius steps, 10 for 5
picker gestures, same as base), iframe lifetime, force-mount, the Workbench App, gesture/history/debounce, Theme v3 and
core, registry, dependencies and public components. There is no debounce, deferral or state rewrite. H2 (Workbench
sidebar re-renders) and H3 (stylesheet recalc/layout/paint) were deliberately not addressed.

## Before/after method

The `after/` evidence uses the same harness, build mode, browser, host, warmup and repeats as the baseline. The base build
(`.worker-tmp/dist-base`, `index-Cc4zSKGl.js`, `1af3444`) and the candidate build (`.worker-tmp/dist-cand`,
`index-BOkWF95k.js`) were served at the same time on `127.0.0.1:5199` and `:5197`. They were measured back to back per
variant by `harness/compare.sh`. Raw per-sample data is in `docs/evidence/workbench-performance-v1/after/{base,cand}-*.json`.

## Results

### 1440×900 light, ×1 CPU (5 runs × 20)

| Scenario | Base p50 per run (ms) | Candidate p50 per run (ms) | Task/action base → cand | Script base → cand | Preview renders base → cand |
|---|---|---|---|---|---|
| colour text | 29.7, 30.5, 30.7, 30.5, 29.6 | 29.9, 24.7, 24.7, 23.0, 23.6 | 33.0 → 26.8 | 15.3 → 8.2 | 1303 → 177 |
| radius slider key | 33.7, 35.3, 34.7, 34.8, 34.9 | 32.9, 33.7, 32.4, 33.6, 33.4 | 38.0 → 36.7 | 18.3 → 11.7 | 1303 → 177 |
| undo/redo | 32.8, 33.1, 33.1, 32.8, 32.8 | 33.2, 33.1, 32.8, 33.3, 33.1 | 33.5 → 28.6 | 15.3 → 10.0 | 1144 → 177 |
| picker move (+120 ms by design) | 162.3–166.5 | 144.7–158.8 | 72.9 → 52.5 | 40.3 → 21.4 | 2560 → 262 |
| preview tab switch | 18.1, 15.3, 16.0, 16.3, 16.0 | 15.3, 14.9, 14.2, 14.7, 14.9 | 24.2 → 19.7 | 10.6 → 5.1 | 1236 → 183 |
| mode toggle | 69.5, 56.0, 63.0, 64.8, 63.9 | 56.6, 69.4, 53.3, 64.7, 69.4 | 96.4 → 102.6 (noise) | 19.5 → 12.1 | 1349 → 177 |
| theme switch | 47.5–50.9 | 36.4–49.8 | 93.2 → 89.1 | 23.3 → 18.5 | 1144 → 177 |
| sidebar category switch | 15.9–16.7 | 16.2–16.7 | 19.1 → 18.5 | 7.1 → 6.8 | 0 → 0 (parent only) |

### 1440×900 light, ×4 CPU (3 runs × 12)

| Scenario | Base p50 per run (ms) | Candidate p50 per run (ms) | Pooled p50 base → cand |
|---|---|---|---|
| preview tab switch | 75.1, 67.1, 80.0 | 37.0, 38.9, 43.5 | 71.0 → 35.3 |
| colour text | 147.5, 145.4, 145.4 | 107.8, 104.6, 128.1 | 145.1 → 108.9 |
| undo/redo | 123.2, 118.5, 118.4 | 84.1, 93.8, 105.1 | 118.9 → 94.4 |
| radius slider key | 159.0, 166.1, 166.3 | 155.7, 156.2, 156.4 | 164.0 → 154.3 |
| mode toggle | 194.4, 192.8, 196.6 | 191.2, 178.5, 198.6 | 194.0 → 189.0 (neutral) |
| sidebar category switch | 39.1, 38.7, 37.1 | 40.7, 36.6, 43.5 | 37.1 → 39.0 (neutral; parent only) |

### Other variants (pooled p50, base → candidate)

- 1440×900 dark: colour text 32.8 → 28.9, radius 36.4 → 33.1, tab switch 15.4 → 15.3, undo/redo 32.8 → 32.7, and mode
  toggle 81.4 → 63.8 (style-dominated and noisy). Script per edit fell by about 7 ms in every edit scenario.
- 390×844 light: colour text 27.3 → 19.1 (run ranges 27.4–27.6 vs 18.6–20.4), radius 32.6 → 31.9, mode toggle
  37.5 → 36.3, tab switch 14.7 → 14.2.

### Interpretation

- **Meaningful improvement beyond run noise.** Colour text entry is clearly faster: run ranges do not overlap at ×1
  except one candidate run, and under ×4 CPU and at narrow width they do not overlap. Preview tab switching is about 2×
  faster under ×4 CPU (non-overlapping), and at ×1 its script time halves inside the 16.7 ms frame quantum. Undo/Redo
  under ×4 CPU and picker main-thread cost (−20 ms per action) also improve. Preview React work falls about 86% per
  edit and per view switch in every variant.
- **Neutral, with a disclosed tradeoff: the radius slider.** Its script time falls by 6.6 ms, but preview style/layout
  rises. Traces (`after/trace-attribution.json`) show preview style going from 2.8 to 6.6 ms and preview layout from 9.0
  to 10.7 ms, with total traced task time 68.1 → 68.5 ms. CDP style time goes 9.1 → 11.6 ms at ×1 and 45.8 → 64.2 ms
  at ×4, while recalc counts stay the same. Latency still improves slightly at ×1 (34.7 → 33.1, non-overlapping run
  ranges) and at ×4 (164.0 → 154.3), but total main-thread work is unchanged. The cause of the shifted style cost is
  not determined.
- **Neutral as expected.** Mode toggle and theme switch are dominated by stylesheet/class recalculation (H3). Sidebar
  category switches are Workbench-only (H2).

## Equivalence and verification (producer self-checks, not acceptance)

| Check | Result |
|---|---|
| `pnpm typecheck` | pass |
| `pnpm test` | 47 files, 899 tests passed; no test edited |
| `pnpm build:workbench`, `pnpm build:storybook`, `pnpm registry:build` | pass; registry has 23 items |
| Pixel equality (`harness/visual.mjs`) | 20/20 byte-identical PNG pairs, base vs candidate. Covers the Workbench plus Design system, App shells, States and Cards at 1440×900 and 390×844, light and dark |
| Behaviour probes | States activations after 2 clicks are identical; preview posts per action match base; iframe never remounted |
| Focused Workbench specs, 9 files, both projects, default workers | 161 passed, 7 skipped, 2 failed: the Bitcoin width sweep `:126` and WCN `:18` (desktop, light, no-preference) |
| Bitcoin width sweep `:126`, repeat ×5 | candidate 5/5 and base 5/5 desktop passes in the repeat run; failed once in the focused run above. This is the documented inherited instability, not a clean pass |
| WCN `:18`, alternated, desktop, `--workers=4`, ×15 × 4 variants × 2 rounds | candidate 117/120 (3 × light-reduce), base 120/120 |
| WCN `:18`, both projects, ×5, default workers | candidate desktop 18/20 (dark ×2), mobile 20/20; base 40/40 |
| WCN `:18`, candidate serial (`--workers=1`), ×15 × 4 | 60/60 |

Tallies are in `after/wcn-comparison.json`.

## Open risk for Lead: WCN `:18` intermittency

The failing step is always the same. After `editor.press("PageDown")`, a second `Home` on the Workbench's own editor
ScrollArea is not applied, and `scrollTop` stays 728 (spec lines 42–43). Candidate tallies under parallel workers are
5/140 desktop failures plus 1 in the focused run; base is 0/140 (Fisher's exact p ≈ 0.06). Serially the candidate
passes 60/60. The prior accepted phase already recorded this test as intermittent under `--workers=4` with serial
passes (`docs/TACTILE_UI_EFFECTS_CHECKPOINT.md:162`). That is context, not a waiver.

Diagnosis so far (`after/visual-and-behaviour.json`):

- A standalone repro of the sequence (`harness/wcn.mjs`) passes 25/25 on both builds unthrottled.
- Under ×4 CPU, both builds sometimes drop a keyboard scroll: `PageDown` ignored 4/20 on candidate and 1/20 on base.
- Neither preview does idle work (about 1 ms per 3 s on both).
- The change touches no Workbench keyboard, focus or ScrollArea code.
- The most plausible link is a change in load-phase timing, since the test interacts before preview readiness: the
  candidate spends about 81 ms of task time in the first 300 ms after ready against about 67 ms on base. This is not
  proven.

The test was not changed, skipped or weakened. Lead should compare it in the full exact-candidate run.

## Residuals

- H2: Workbench sidebar re-renders about 1,240 components (10–11 ms) per edit and category switch. Not addressed.
- H3: stylesheet replacement style/layout/paint dominates mode and theme switching. Architectural, not addressed.
- The radius slider's shifted style cost is unexplained.
- The WCN `:18` parallel-load intermittency above.
- The inherited Bitcoin width-sweep instability.
- The full Workbench, Storybook browser, Design Command live, axe and responsive gates were not run by the producer
  beyond the focused specs listed; they are Lead-owned.
