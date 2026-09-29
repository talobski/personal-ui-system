# Workbench performance — baseline (PUI-118)

Phase `workbench-performance-v1-001`. This baseline was measured and committed before any product or source edit.
It is producer profiling evidence, not acceptance.

## Identity and environment

- Code measured: exact prep commit `1af3444e04152c789699187faa6d98c32ddf9587`. Its product tree equals the accepted
  product `be63bef26f0f654a2c449533ee83d12f91a80454`; the prep commit adds only docs.
  Packet hashes were verified unchanged before measuring:
  `docs/WORKBENCH_PERFORMANCE_CONTRACT.md` is sha256 `f02d6a0d…0e367` and
  `linear/PUI-118.json` is sha256 `64fe7e3a…cba5b`, matching `snapshot-hashes.json`.
- Build: production `pnpm build:workbench` (Vite 8.3.0, React 19.3.0, minified). The bundle
  `assets/index-Cc4zSKGl.js` is sha256 `b995ddbd…1b5b`. It was copied unchanged to ignored `.worker-tmp/dist-base` and
  served by `vite preview` on `127.0.0.1:5199` only. There was no network or external effect.
- Browser: Playwright 1.63.0 with bundled Chromium headless shell 153.0.8010.12, fresh context per run, and no
  extensions.
- Host: Apple M2 Pro, 12 cores, 16 GB RAM, macOS 26.6.2, Node 22.22.2. CPU throttling is ×1 unless stated. The ×4
  variant uses CDP `Emulation.setCPUThrottlingRate` as a stand-in for slower hardware.
- Viewports and modes: 1440×900 light (primary) and dark; 390×844 light. On narrow, editor scenarios run with the
  mobile sidebar sheet open and preview scenarios with it closed.
- Unminified build: the same SHA built with `--minify false` into `.worker-tmp/dist-named`. It is used only to name
  re-rendered components and never for timing.

## Method

The harness is committed at `docs/evidence/workbench-performance-v1/harness/` (`harness.mjs`, `trace.mjs`,
`compact.mjs`, `posts.mjs`). It installs an init script in both documents (the Workbench and the same-origin preview iframe):

- **Latency (input → next frame):** the capture-phase `keydown`/`pointerdown`/`input`/`click` `event.timeStamp` in the
  document where the action happens. The end point is the first DOM mutation in the document that must visibly change,
  followed by `requestAnimationFrame` then `setTimeout(0)`, so it includes that frame's style, layout and paint.
  Theme edits end in the preview iframe; preview tab switches end in the iframe; sidebar category switches end in the
  Workbench. Headless frames quantize the result to about 16.7 ms steps.
- **Main-thread cost per action:** the CDP `Performance.getMetrics` delta of `TaskDuration`, `ScriptDuration`,
  `RecalcStyleDuration` and `LayoutDuration` across the measured repeats, divided by repeats. It covers both documents,
  which share one renderer main thread.
- **React work:** a production-safe `__REACT_DEVTOOLS_GLOBAL_HOOK__` shim counts commits and components that actually
  rendered. It counts a mount or a fiber with `PerformedWork`, and skips bailed-out subtrees the way React DevTools'
  `didFiberRender` does. Counts are per document.
- **Attribution:** a Chrome timeline trace (`devtools.timeline`) over 20 actions sums outermost JS entry points by
  frame, and style/layout/paint by frame. Tracing inflates absolute numbers, so traces are used only to split cost
  between documents.
- **Repeats:** each scenario runs 3 warmup actions, then 20 measured actions (12 under ×4 CPU). Desktop light uses
  5 fresh browser sessions; the other variants use 3. The results report each run's median and the pooled median.

Scenarios (all through real UI controls):

| Scenario | Action |
|---|---|
| `geometry-radius-slider-key` | Radius slider thumb, alternating ArrowRight/ArrowLeft: one committed edit and history checkpoint each |
| `color-primary-text` | `fill` on the Primary colour text input, alternating two valid HEX values |
| `color-primary-picker-move` | native picker `input` then `change` on Primary; latency includes the accepted 120 ms debounce by design |
| `mode-toggle` | toolbar Dark mode switch |
| `preview-tab-switch` | preview Cards → Design system → App shells → States tabs (inside the iframe) |
| `sidebar-category-switch` | editor Typography → Geometry → Effects → Colors tabs |
| `theme-switch` | built-in theme Select: option click, Default ↔ Quiet Editorial |
| `undo-redo` | toolbar Undo/Redo alternating after four radius edits |

## Raw results

The committed raw per-sample evidence lives in `docs/evidence/workbench-performance-v1/baseline/*.json`. It holds every
sample by run at 0.1 ms, per-run CDP breakdowns and React counts; the traces are in `trace-attribution.json`.

### 1440×900 light, ×1 CPU (5 runs × 20)

| Scenario | p50 per run (ms) | Pooled p50 | Task/action (ms) | Script / Style / Layout | Renders/action parent · preview |
|---|---|---|---|---|---|
| radius slider key | 36.7, 36.4, 36.3, 36.1, 34.8 | 36.1 | 39.7 | 18.8 / 9.7 / 2.4 | 1237 · 1303 |
| colour text | 31.5, 31.8, 31.7, 31.0, 30.3 | 31.2 | 34.5 | 15.6 / 9.3 / 3.0 | 1260 · 1303 |
| colour picker move (+120 ms debounce) | 160.0, 165.4, 163.8, 165.0, 162.3 | 163.1 | 71.5 | 39.3 / 13.1 / 4.4 | 2513 · 2560 |
| mode toggle | 70.2, 82.4, 65.2, 68.8, 84.8 | 79.3 | 110.0 | 20.9 / 60.6 / 2.4 | 1246 · 1349 |
| preview tab switch | 15.6, 15.7, 17.3, 15.4, 16.0 | 15.5 | 24.2 | 10.9 / 2.7 / 1.2 | 0 · 1236 |
| sidebar category switch | 16.8, 16.7, 16.6, 16.5, 15.9 | 16.5 | 19.5 | 7.5 / 2.9 / 0.9 | 1290 · 0 |
| theme switch | 52.5, 52.2, 41.3, 48.6, 48.7 | 49.8 | 94.0 | 23.9 / 44.8 / 1.2 | 1693 · 1144 |
| undo/redo | 33.0, 33.3, 33.0, 33.3, 33.1 | 33.1 | 34.6 | 15.5 / 7.6 / 0.8 | 1266 · 1144 |

### 1440×900 dark, ×1 CPU (3 runs × 20)

| Scenario | p50 per run (ms) | Pooled p50 | Task/action | Script / Style / Layout | Renders parent · preview |
|---|---|---|---|---|---|
| radius slider key | 34.4, 34.2, 35.1 | 34.4 | 38.3 | 18.0 / 9.3 / 2.3 | 1237 · 1303 |
| colour text | 31.2, 35.0, 31.2 | 31.4 | 34.1 | 15.5 / 9.4 / 2.8 | 1260 · 1303 |
| mode toggle | 68.4, 70.5, 68.5 | 68.8 | 108.9 | 20.7 / 60.5 / 2.2 | 1246 · 1349 |
| preview tab switch | 15.4, 15.5, 16.7 | 15.4 | 23.9 | 10.6 / 2.7 / 1.3 | 0 · 1236 |
| undo/redo | 33.3, 32.5, 33.3 | 33.2 | 35.1 | 15.3 / 7.8 / 1.0 | 1266 · 1144 |

### 1440×900 light, ×4 CPU (3 runs × 12)

| Scenario | p50 per run (ms) | Pooled p50 | Task/action | Script / Style / Layout | Renders parent · preview |
|---|---|---|---|---|---|
| radius slider key | 171.6, 166.4, 159.8 | 166.8 | 181.2 | 85.3 / 44.5 / 10.7 | 1237 · 1303 |
| colour text | 150.6, 144.7, 143.6 | 146.8 | 159.6 | 76.2 / 41.9 / 13.3 | 1260 · 1303 |
| mode toggle | 201.2, 204.4, 213.5 | 203.1 | 398.7 | 91.3 / 193.0 / 10.7 | 1246 · 1349 |
| preview tab switch | 77.2, 68.1, 77.6 | 71.7 | 117.5 | 54.5 / 12.9 / 7.6 | 0 · 1236 |
| undo/redo | 107.2, 124.4, 106.6 | 106.8 | 128.3 | 62.1 / 28.2 / 3.0 | 1266 · 1144 |

### 390×844 light, ×1 CPU (3 runs × 20)

| Scenario | p50 per run (ms) | Pooled p50 | Task/action | Script / Style / Layout | Renders parent · preview |
|---|---|---|---|---|---|
| radius slider key (sheet open) | 32.5, 32.2, 32.6 | 32.2 | 34.7 | 18.1 / 8.8 / 0.5 | 1262 · 1305 |
| colour text (sheet open) | 26.9, 27.7, 26.5 | 26.8 | 29.9 | 15.5 / 8.6 / 0.7 | 1285 · 1305 |
| mode toggle (sheet closed) | 37.3, 37.9, 37.4 | 37.7 | 43.0 | 14.4 / 15.6 / 1.2 | 79 · 1351 |
| preview tab switch (sheet closed) | 15.5, 16.0, 14.9 | 14.8 | 22.9 | 11.1 / 2.5 / 1.3 | 0 · 1238 |

### Trace attribution (1440×900 light, 20 actions, per action, tracing-inflated)

| Scenario | Preview JS (scheduler task) | Workbench JS (input handler) | Style (parent / preview) | Layout preview | Paint parent |
|---|---|---|---|---|---|
| radius slider key | 21.8 | 10.2 (`keydown`) | 5.0 / 2.8 | 8.7 | 16.8 |
| colour text | 21.6 | 11.4 (`input`) | 4.8 / 1.1 | 8.4 | 2.9 |
| mode toggle | 16.9 | 6.9 (`click`) + transition events | 78.3 / 27.3 | 7.1 | 22.3 |
| preview tab switch | 4.1 + 11.7 (iframe `mousedown`, sync Radix render) | 0 | — / 2.6 | 2.8 | 10.3 |

Named breakdown (unminified build, `render-names-unminified.json`): each edit re-renders every preview composition.
The top counts are 70 `Button`, 42 `Day` and 42 `CalendarDayButton` (Offsite calendar), 25 `TableCell`, 18
`SidebarMenuItem` (App shells) and so on. `Swatch` renders 64 times, which is 32 swatches × 2 because the Design
system sheet renders once for the new `source` and again after its effect reads computed values. Parent re-renders cover
every editor control on all five force-mounted category tabs: 54 `Field`, 46 `Input`, 38 `Collapsible`, 33
`LiveColorField` and so on.

Variability: across fresh sessions, run medians spread by at most about 2 ms for edit scenarios at ×1 (for example radius
34.8–36.7 ms). Mode toggle and theme switch spread by 10–20 ms because style/transition work dominates them. Under ×4
CPU the spread is about 12 ms on radius (159.8–171.6 ms).

## Findings and bottleneck hypotheses

1. **H1 (primary, materially improvable): the preview iframe re-renders its whole force-mounted React tree on every
   posted state and on every preview tab switch.** One radius step or colour edit renders about 1,303 preview components
   in 2 commits; one preview tab switch renders about 1,236. Only the `<style>` text, the root `data-*` attributes, the
   Tabs selection and the Design system sheet (via its `source` prop) depend on that state. The Cards gallery (12
   compositions), App shells, and most of the States samples take no props from the posted state. The trace makes
   preview JS the largest single JS cost per edit, about 22 ms against about 10–11 ms for the Workbench handler. It is
   also most of a preview tab switch (about 16 ms of JS). The ×4 CPU run turns this into about 167 ms per radius step
   and about 72 ms per tab switch. Hidden tabs are not the problem as DOM; the problem is their repeated React
   reconciliation. The expected smallest intervention is to stop re-rendering the prop-independent preview subtrees
   (a memo boundary around static content) without changing the message, CSS path, DOM, force-mount, or architecture.
2. **H2 (secondary, not targeted in this bounded change): the Workbench re-renders every editor control on every edit
   and category switch.** That is about 1,240 components and about 10–11 ms per edit. Avoiding it would require stable
   `apply`/`endGesture`/`build` callbacks and memoized `LiveColorField`/`LiveNumberField`/`ControlSection` across the
   manual-edit, gesture, and history path. That surface is larger and riskier than H1, and it is recorded as a residual.
3. **H3 (inherent to the accepted architecture): style, layout and paint after replacing the `:root` variable
   stylesheet in both documents.** That is about 9–10 ms of style and about 8 ms of preview layout per edit, and it
   dominates mode toggle (about 60 ms of style, 78 ms under trace in the parent) and theme switch. Reducing it would
   change the CSS propagation or preview architecture, which is out of scope.
4. **H4 (redundant update, subsumed by H1): picker completion reposts a value-identical preview state.** The native
   picker's `change` flushes the same value again, so one picker action costs 2 full preview renders (2,560) and 2
   Workbench renders. The 120 ms debounce is accepted behaviour and stays unchanged. Once H1 makes a redundant preview
   render cheap, this needs no separate change.

No duplicated message path, iframe remount, or listener accumulation showed up as a cost. `harness/posts.mjs` recorded
this in `baseline/preview-posts.json`: 10 radius steps posted exactly 10 states. 5 picker gestures posted 10 (H4). The
iframe document was the same object throughout.
