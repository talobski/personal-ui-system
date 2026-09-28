# Workbench gallery card polish — producer checkpoint

Phase: `workbench-gallery-card-polish-v1-001` (PUI-103 through PUI-107)
Implementation base: `58c694d401f514a005d872fad854e5813c7582b9` (accepted product `304486c`, accepted control `40c2045`)
Producer: Claude (`claude-opus-5-5`), run 1 of the phase. This is authoring evidence only. It is not Lead browser
evidence, protected verification, acceptance or promotion.

## Preflight

- Base HEAD was `58c694d` and the worktree was clean.
- Before any edit, the producer read `BRIEF.md`, the whole contract, all five snapshots, `index.md` and
  `snapshot-hashes.json`. The SHA-256 of the contract (`03a88840…`), the index (`64a4c690…`) and every ticket snapshot
  matched the manifest. Every snapshot has status Todo, 0 comments (`hasNextPage: false`), 0 attachments, 0 documents
  and empty relations. Linear was not re-fetched, and the packet and contract are byte-unchanged.
- Every pnpm invocation ran with `COREPACK_ENABLE_NETWORK=0` against the dependencies already provisioned offline.
  Nothing was installed, updated or downloaded. No network, credentials, subagents, Paseo agents or canonical `.loop`
  state were used. Optional local browser smoke used `127.0.0.1` only: `WORKBENCH_PORT=5391` for the Workbench config
  and the Storybook config's fixed port 6006.

## Commits

1. `e1a5fa407c019019c64b8889b2f3689cfffa0b8a`: product changes (PUI-103 to PUI-107), unit definitions, and migrated
   plus new browser definitions.
2. The commit containing this file: the read-only phase verifier and this checkpoint. That commit is the candidate. It
   cannot record its own SHA, so the Lead records it (`git rev-parse HEAD` on
   `loop/workbench-gallery-card-polish-v1-001`).

## Changed files (24 including this file, all inside the verifier's admitted set)

- Product:
  - `packages/ui/src/compositions/plan-usage.tsx`, `quick-find.tsx`, `recent-activity.tsx`, `productive-week.tsx`,
    `team-chat.tsx`, `recent-payments.tsx`, `local-weather.tsx`, `now-playing.tsx` and `revenue-overview.tsx`.
  - `apps/workbench/src/Gallery.tsx`: `LocalGroup` gains a local `natural` option, used only by Calendar / Weather.
- Unit definitions: `apps/workbench/src/gallery.test.ts` and `packages/ui/src/avatar.test.ts`. The Avatar-user
  inventory drops `team-chat.tsx` because its header avatar was removed.
- Browser definitions (Lead-executed):
  - New: `e2e/workbench-gallery-card-polish.spec.ts` (WGCP-03 to WGCP-07).
  - Migrated to the new exact expectations: `e2e/workbench-gallery-preview-expansion.spec.ts`,
    `workbench-cards-gallery-curation.spec.ts`, `workbench-nested-gallery-interaction-polish.spec.ts`,
    `workbench-container-gallery-showcase.spec.ts`, `workbench-showcase-components-geometry.spec.ts`,
    `semantic-typography-history-grid.spec.ts` and `chart.spec.ts`.
  - `playwright.config.ts` and `playwright.workbench.config.ts`, which register the new spec.
- Evidence: `tools/verify-workbench-gallery-card-polish.mjs` and this file.

No test was deleted or skipped, no axe suppression was broadened, and every superseded assertion was replaced in place
with the new contract expectation. The verifier enforces this: per changed test file, the test-case count never drops,
no declaration skip/only/fixme marker is added, and the number of conditional viewport skips is unchanged. The replaced
assertions are:

| Superseded assertion | Replacement |
|---|---|
| Storage shows `Pro plan · renews October 31`, and list items carry values | Subtitle and values absent; items are exactly the four names; the header is exactly the title height |
| Weekly steps ticks are `M T W T F S S`, with `tickFormatter` in the source | No `.recharts-xAxis`/tick nodes; bars reach the chart bottom; `<XAxis dataKey="day" hide />`; the keyboard tooltip names the day |
| Chat has one header avatar and a visible `Maya Chen` heading | No card header or avatar; the heading is sr-only and the log is still named |
| Chat send is enabled: `send.click()`, and Tab lands on send | Send is `disabled`, inside `[data-slot=chat-composer]`, and skipped by Tab; Enter still inserts nothing |
| Chat composer probe for radius/spacing is the `input` | The probe is the composer field, which now carries the chrome (`pl-3`, `rounded-md`) |
| Select-all is the first `<input>` in its header cell | The input sits inside the checkbox's `inline-grid` wrapper |
| Every music button has `size-10`, and `b.w >= 40` | Every button is `data-variant="ghost"` and `data-size="icon-lg"`, with equal measured size and rhythm and `>= 24` (the WCAG 2.2 minimum), not 40 |
| Weather `p.type-heading` and `h2.type-heading` | Temperature and place are Body family at `font-semibold`, and no `type-heading` remains |
| Both local pairs `align: stretch` with equal heights | Chat / Recent activity stretch and are equal; Calendar / Weather `align: flex-start` at natural height |
| `groups[]` without the `natural` flag | Explicit `{ natural: true }` only for Calendar / Weather |
| Revenue `XAxis padding={{ left: 12, right: 12 }}` | `<XAxis dataKey="period" hide />` plus chart margin `0` at left, right and bottom |
| `font-mono` count `>= 5` and `type-heading text-4xl/5xl` count `>= 3` | Exactly 2 each; the remaining Mono is the Quick find keycaps |
| Recent activity Body probe `card-description` | Activity row text (`li p`) |

## Criterion map (producer view)

| Criterion | Delivery | Authoring evidence |
|---|---|---|
| WGCP-01 | Packet untouched | Preflight hashes. The verifier re-checks manifest, index and snapshot hashes, each snapshot's status, 0/0/0 counts and empty relations, byte identity with the base for the packet, contract, `BRIEF.md` and `AGENTS.md`, and ancestry `304486c → 40c2045 → 58c694d → HEAD` |
| WGCP-02 | 24 files, all admitted | Verifier: admitted-path set, no deletions, whitespace/final-newline hygiene, 432 frozen files byte-identical to base (every component, all composition stories, Theme v3 schema/fixtures/CSS, mutations, persistence, history, Design Command, Jev, earlier verifiers), dependency files and lockfile unchanged, no `.loop` change, and the test non-weakening counts |
| WGCP-03 | Storage: the subtitle and category values are removed, and `CardHeader grid-rows-none` closes the phantom second-row gap. Quick find: the header is removed and an sr-only `h2` precedes the search field. Recent activity: no subtitle and no `time` column. Weekly steps: the day axis is `hide`. Chat: the header and divider are removed, and the Quick-find-style field holds the borderless `Input` and a `disabled` ghost `icon-sm` Button with `text-muted-foreground`, `aria-label="Send message"` and `type="submit"`; `preventDefault` is kept | Unit: `WGCP-03` block and the updated Storage and Chat blocks. Browser: `WGCP-03` Storage/Quick find/Recent activity/Weekly steps and Chat tests, both modes |
| WGCP-04 | `TableCheckbox` is a native `input type=checkbox`, `appearance-none`, with `border-input`, `checked:`/`indeterminate:` `bg-primary border-primary`, and the official lucide `Check`/`Minus` glyphs stacked in the same grid cell. It keeps `size-4` and the existing `outline-ring` focus outline. Amount is `truncate text-right tabular-nums` (Body; Mono and `text-xs` removed) | Unit: `WGCP-04` plus the amount-class checks. Browser: computed border = `--input`; checked/indeterminate background = `--primary`; ring outline on keyboard focus; 16px size; Amount family = body family, right-aligned; column widths and card heights unchanged; both modes |
| WGCP-05 | Weather temperature and place: `type-heading` → `font-semibold` (Default and Quiet Editorial heading weight are both 600). The CardContent stretch helpers (`flex-1 justify-evenly`) are removed. `<LocalGroup natural>` → `items-start` with no card `h-full`, only for Calendar / Weather | Unit: `WGCP-05` and the pair shape. Browser: family = body and weight 600 at 48px/16px; container sweep 360–1600 where both cards end with their content (slack ≈ 0) side by side and stacked; side-by-side heights differ; Chat / Recent activity still equal; a taller Calendar leaves Weather unchanged |
| WGCP-06 | `<Slider className="[&_[data-slot=slider-thumb]]:bg-primary">`: the official Slider is unchanged and its `border-primary`, ring and track stay. All five controls spread one `CONTROL = { variant: "ghost", size: "icon-lg" }`, with no `rounded-full`, `fill-current` or extra size class. Icon audit: lucide-react 1.47.0 has no solid/filled `shuffle`, `skip-back`, `skip-forward`, `play`, `pause` or `repeat` (verifier-checked), so the official outline icons are used unfilled; no SVG is fabricated and no dependency is added | Unit: `WGCP-06`. Browser: thumb background and border = `--primary`, track = `--muted`, 4px ring on keyboard focus; five buttons with equal size, radius, border and transparent background, `fill: none` icons, equal centre spacing and symmetric outer margins; Play → Pause focus ring; toggle colours; stable heights; both modes |
| WGCP-07 | Card `gap-0 overflow-hidden py-0`; tabs and metrics in `CardContent @container grid gap-5 pt-6 pb-5`; `figure` after it, outside the padding; chart margin left/right/bottom `0` (top 8 kept as the separation); XAxis padding removed. `SERIES`/`config` are byte-identical to base (verifier) | Unit: `WGCP-07`. Browser: card padding `0` and overflow hidden with radius kept; chart container, SVG surface and area fill within 1px of the inner left, right and bottom edges in Week, Quarter and Month; tabs/metrics inset ≥ 16px; height stable across ranges; keyboard roving and focus ring; both modes |
| WGCP-08 | Lead-owned | Definitions provided (new spec plus migrations). Producer smoke below is not Lead evidence |
| WGCP-09 | — | Commands below |
| WGCP-10/11 | Not producer-owned | — |

## Commands and results (offline, final tree)

| Command | Result |
|---|---|
| `shasum -a 256` over the contract, index and five snapshots (preflight) | All match `snapshot-hashes.json` |
| `COREPACK_ENABLE_NETWORK=0 pnpm typecheck` | exit 0 |
| `COREPACK_ENABLE_NETWORK=0 pnpm test` | exit 0: 44 files, 858 tests passed (848 at base, with 10 superseded tests replaced in place, plus 10 new tests; no test removed) |
| `COREPACK_ENABLE_NETWORK=0 pnpm registry:build` | exit 0, `✔ Building registry.` (23 items; `public/r` is gitignored) |
| `COREPACK_ENABLE_NETWORK=0 pnpm build:workbench` | exit 0 (only the existing >500 kB chunk-size warning) |
| `COREPACK_ENABLE_NETWORK=0 pnpm build:storybook` | exit 0, `Storybook build completed successfully` |
| `node tools/verify-workbench-gallery-card-polish.mjs` | exit 0: `{"ok":true,…,"changed":23,"frozen":432,"operations":12,"registry":23,"compositions":11,"naturalPairs":1}` (run before this file existed; 24 with it) |
| Verifier negative checks (temporary edits, reverted) | A byte appended to `components/slider.tsx` gives `Outside admitted scope`; `size-10` on a transport button gives the transport regex failure |
| `git diff --check 58c694d` | exit 0 (also with the new files intent-added) |

## Optional producer browser smoke (not Lead evidence)

Local Chromium 1243, `127.0.0.1` only, against the builds above. Commands, all with `COREPACK_ENABLE_NETWORK=0`:

- `WORKBENCH_PORT=5391 pnpm exec playwright test -c playwright.workbench.config.ts workbench-gallery-card-polish.spec.ts`:
  25 passed, 1 skipped (the designed desktop-only sweep on mobile).
- The same config with `workbench-gallery-preview-expansion`, `workbench-cards-gallery-curation`,
  `workbench-nested-gallery-interaction-polish`, `workbench-container-gallery-showcase`,
  `workbench-showcase-components-geometry` and `semantic-typography-history-grid` (`--workers=4`): 145 passed,
  9 skipped (the existing viewport skips).
- The same config with `quiet-workspace.spec.ts`: 28 passed, 2 skipped.
- `pnpm exec playwright test chart.spec.ts composition-gallery-presentations.spec.ts avatar.spec.ts` (Storybook):
  18 passed.

Every axe run in these specs is decoded against the known-debt helper, and no new serious or critical finding
appeared. The first smoke run exposed defects in the new spec's own definitions, which were corrected before the final
run: `items-start` computes as `flex-start`; 1px `sr-only` text counts as Playwright-visible; programmatic focus after
a click is not `:focus-visible`; frame and page coordinates were mixed; and a colour was sampled mid-transition. No
product change was needed. The remaining Workbench specs (for example `workbench.spec.ts`, `theme-v2-live-controls`
and the Design Command live config) were not run by the producer; their sources do not reference the changed content.

## Residuals and risks

- WGCP-08 browser evidence, WGCP-10 protected verification and WGCP-11 acceptance and promotion are outstanding and
  owned by the Lead and verifier. The producer smoke above is only a signal that the definitions are executable.
- PUI-104's semantic unchecked border needs a custom-drawn native checkbox: a UA checkbox ignores `border-color`, and
  the Checkbox resource is not admitted. The input stays a native, focusable, labelled `type=checkbox` with its
  indeterminate wiring. The glyphs are official lucide icons, stacked by grid (not absolute positioning) and hidden from
  assistive technology. The Lead should visually confirm checkbox rendering in both modes and on both themes.
- Amount drops its old `text-xs` together with Mono, so amounts match the Table's Body text size (like Status and
  Email). The contract retains values, formatting, alignment, columns and padding, all of which are unchanged. The
  Lead can decide whether it wants the smaller size back.
- The Weather weight uses `font-semibold` (600), which equals both built-in themes' Heading weight. A custom theme with
  a different Heading weight would no longer change these two Weather elements. That follows from moving them to Body,
  which has no role weight of its own at this size.
- The transport controls keep the system `icon-lg` Button size, the size already used before this phase, so card
  geometry is unchanged. No test asserts a pixel dimension. The size can be tuned from Lead browser evidence without
  touching a public component.
- `WSCG-11` region balance (≤200px) was re-run in the smoke and passed at 1440. Chat, Studio revenue, Storage, Quick
  find and Recent activity all became shorter, so balance at other gallery widths depends on the Lead's evidence.
- The Weekly steps chart keeps its `h-28` height, so the bars now use the space the tick row freed. No fixed height
  was added.
- The earlier phase verifier (`tools/verify-workbench-gallery-preview-expansion.mjs`) is byte-frozen historical
  evidence bound to its own base and admitted set. It is not expected to pass against this candidate.
- Phase 2 (PUI-108 to PUI-110) was not touched and remains planning-only.
