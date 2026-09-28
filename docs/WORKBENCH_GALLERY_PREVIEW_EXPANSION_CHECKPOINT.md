# Workbench gallery and preview expansion — producer checkpoint

Phase: `workbench-gallery-preview-expansion-v1-001` (PUI-95 through PUI-102)
Implementation base: `9a1e247503b051f80ed0af4a1d7f03384bd189eb` (accepted product `8e40581`, accepted control `0bb51e9`)
Producer: Claude (`claude-opus-5-5`), run 1 of the phase. This is authoring evidence only. It is not Lead browser
evidence, protected verification, acceptance or promotion.

## Preflight

- Base HEAD was `9a1e247` and the worktree was clean.
- Before any edit, the producer read `BRIEF.md`, the contract and all eight snapshots plus `index.md`. The SHA-256 of
  the contract, the index and every ticket snapshot matched `snapshot-hashes.json`. Every snapshot has 0 comments
  (`hasNextPage: false`), 0 attachments and 0 documents, as the index records. Linear was not re-fetched.
- All pnpm invocations ran with `COREPACK_ENABLE_NETWORK=0` and `--offline`; nothing was installed or downloaded. No
  network, credentials, geolocation, subagents, Paseo agents or canonical `.loop` state were used. Local browser smoke
  used `127.0.0.1` only; port 5173 was occupied by another process, so the Workbench runs used `WORKBENCH_PORT=5391`
  (and 5392 for the Design Command config) through the configs' existing variable.

## Commits

1. `5fed443`: product changes (PUI-95 to PUI-102), unit definitions and migrated plus new browser definitions.
2. This commit: the read-only phase verifier and this checkpoint.

## Changed files (28 including this file, all inside the verifier's admitted set)

- Product:
  - `packages/ui/src/compositions/team-chat.tsx`, `recent-payments.tsx`, `now-playing.tsx`, `offsite-calendar.tsx`
    and `local-weather.tsx`.
  - New: `packages/ui/src/compositions/app-shells.tsx` and `app-shells.stories.tsx`.
  - `apps/workbench/src/Gallery.tsx`, `LiveControls.tsx` and `PreviewFrame.tsx`.
  - New: `apps/workbench/src/DesignSystemPreview.tsx`.
- Unit definitions:
  - `apps/workbench/src/gallery.test.ts` and `lifecycle.test.ts`.
  - New: `apps/workbench/src/previewViews.test.ts`.
  - `packages/ui/src/quiet-workspace.test.ts`.
- Browser definitions (Lead-executed):
  - New: `e2e/workbench-gallery-preview-expansion.spec.ts`.
  - Migrated to the new exact expectations: `e2e/workbench-showcase-components-geometry.spec.ts`,
    `workbench-cards-gallery-curation.spec.ts`, `workbench-container-gallery-showcase.spec.ts`,
    `workbench-sidebar-theme-polish.spec.ts`, `quiet-workspace.spec.ts`,
    `workbench-nested-gallery-interaction-polish.spec.ts` and `workbench-sidebar-preview-followup.spec.ts`.
  - `e2e/workbench-navigation.ts` (`previewView` accepts the two new views).
  - `playwright.config.ts` and `playwright.workbench.config.ts` (register the new spec).
- Evidence: `tools/verify-workbench-gallery-preview-expansion.mjs` and this file.

No test was deleted or skipped, no assertion was weakened, and axe suppression was not broadened. Each stale assertion
was replaced with the new exact contract expectation. For example: the log name `Conversation with Maya Chen`; column
headers `["", "Status", "Email", "Amount", ""]` with 6 checkboxes and 5 row buttons; `Favorite` in place of `Like`;
the new region order and two local pairs; four preview tabs, with `End`/`Home` where two tabs used `ArrowRight`/`ArrowLeft`;
the Sidebar active note absent with no `aria-describedby`; and the radius/spacing probe moved from the removed weather
hourly strip to the chat composer's official Input.

The public components (`packages/ui/src/components/*`, including Sidebar, Switch, Table, Calendar, Message, Bubble and
Input) are unchanged. So are the dependency manifests and lockfile, `registry.json` (23), the 12-operation mutation
union, Theme v3, persistence, history, the Design Command, `messages.ts`, `App.tsx`, `styles.css`, the frozen packet,
`BRIEF.md`, `AGENTS.md`, and every earlier verifier.

## Criterion map (producer view)

| Criterion | Delivery | Authoring evidence |
| --- | --- | --- |
| WGPE-01 | Packet, index and contract hashes verified; bases' ancestry checked. | Verifier WGPE-01 block. |
| WGPE-02 | Admitted paths only; manifests, lockfile, registry, operations and public components byte-frozen; no `.loop` change. | Verifier WGPE-02 block and the frozen-file sweep (417 files). |
| WGPE-03 | One `Maya Chen` header with one avatar (`aria-hidden`) and an h2 name. Four Maya/You turns with start/end alignment and sr-only sender names. No per-message avatar, header, footer, time, title/subtitle, email, duplicate bubble or Read/Delivered. A `CardFooter` form holds an sr-only labelled `Input` (`Type your message...`) and a far-right `size="icon"` `Send message` Button; `onSubmit` prevents default, so nothing is inserted. | `gallery.test.ts` WGPE-03 and `workbench-gallery-preview-expansion.spec.ts` WGPE-03: pointer, Enter and Tab sends leave the message count and all card heights unchanged; axe light/dark. |
| WGPE-04 | `<Card className="overflow-hidden py-0">` and `<CardContent className="px-0">` only; cells keep Table padding (edge cells gain `pl-4`/`pr-3` breathing room). Status dots removed. A native select-all checkbox (with an indeterminate mixed state) and five named row checkboxes use `accent-primary` and a ring focus outline. A far-right `Actions for <email>` ghost `Ellipsis` Button sits in data rows under an empty `<th>`. No filter, columns, summary, pagination, public Checkbox or dependency. `overflow-hidden` keeps the last row's hover inside the card radius. | Unit WGPE-04 and browser WGPE-04: flush edges, select-all and mixed state, keyboard Space, stable heights, no scroll region under doubled spacing; axe light/dark. |
| WGPE-05 | The queue has only title, artist, duration and position for all three tracks. The h2 title, artist and far-right `Favorite` remain. Body-role times sit above the Slider, elapsed left and remaining right. The row is `grid-cols-5` with five `size-10`/`icon-lg` buttons: Shuffle (pressed state), Previous, Play/Pause (default variant, round), Next and Repeat. | Unit WGPE-05 and browser WGPE-05 across all three tracks in light and dark: order, equal 40px targets, equal centre steps, symmetric row margins, Body font family, stable heights. |
| WGPE-06 | The Calendar card is only the official range Calendar (sr-only h2), `fixedWeeks`, with navigation and keyboard. Music is last in the left region. The new `LocalGroup className="@2xl:grid-cols-[auto_minmax(0,1fr)]"` holds Calendar then Weather: the calendar gets its natural width and Weather the residual track. It stacks below a 42rem region. | Unit WGPE-06/11, the verifier and browser WGPE-06: range, navigation, keyboard, stable height; container sweep 360–1600px (stacked below 672px region, paired above, calendar constant width, Weather growing). |
| WGPE-07 | Top zone: `CloudSun` icon, `text-5xl` Heading temperature (sr-only "Now"), stacked `H`/`L` and a right-aligned h2 place with its condition. Bottom zone: a five-column `ol` (Wed–Sun) of day, icon, high and low. No pin, sample copy, floating icon, hourly strip, Wind/Humidity/Sunset or dividers. Local data only, with no live claim. Stretched in the pair, the zones spread `justify-evenly`. | Unit WGPE-07 and browser WGPE-07: geometry of both zones, five equal columns, token colours light/dark, no external request recorded. |
| WGPE-08 | The `FieldDescription` and `aria-describedby` were removed from `SidebarTokensSwitch`. The label, `mt-2 gap-1.5`, the mutation path and the validation error are unchanged. | `lifecycle.test.ts`, migrated `workbench-sidebar-theme-polish` and `showcase-components-geometry` specs, and browser WGPE-08 (OFF/ON/OFF: no note, no description, fields enabled). |
| WGPE-09 | `DesignSystemPreview` has no state other than a snapshot of `getComputedStyle(document.documentElement)` and the rendered `workbench-theme` rule for the active mode. Swatches paint `var(--token)`. It shows 24 base tokens in Base / Surfaces / Intent / Boundaries / Charts, plus the 8 Sidebar tokens (`= <alias>` when OFF, "dedicated" when ON), and Heading (4xl/2xl/lg), Body (base/sm), muted Body and Mono samples with resolved family · weight · tracking. `source` is the posted mode + CSS, and a class observer catches the light/dark switch. It has no controls and no message or schema change. | `previewViews.test.ts` and browser WGPE-09 in light and dark: values equal the iframe's computed properties; primary, Sidebar ON and dedicated edits and a Heading font edit update live; mode switch; axe. |
| WGPE-10 | `AppShells` has three shells (Classic workspace, Inset project, Compact utility) on the official Sidebar parts. Each uses `collapsible="none"` (in normal flow, never the fixed desktop branch or mobile sheet) under one `SidebarProvider open`. Wrapper-only differences: width clamp, surface (border, inset `bg-sidebar` with a raised main, top utility bar), density (`size="sm"`) and badges. Named `nav` per shell, local `aria-current` selection, and aria-hidden abstract blocks for main content. | `previewViews.test.ts` and browser WGPE-10 in light and dark: containment, no fixed element, keyboard with focus-visible, Ctrl/Cmd+B no-op, OFF alias to ON dedicated background and accent, live radius and Heading font, no forms or tables; axe. |
| WGPE-11 | Preview tabs Cards / Design system / App shells / States (all `forceMount`, shared trigger class); 11 cards once in the contract order. | Unit and verifier tab/order checks; browser WGPE-11 and migrated NGIP-07/WSPF/WCN tab specs (roving keys, one ScrollArea, States state kept). |
| WGPE-12 | Lead-owned. Producer smoke below. | — |

Authoring measurements with the Sidebar open (region widths and heights in px):

| Viewport | Sidebar | Left region | Right region | Calendar / Weather pair |
| --- | --- | --- | --- | --- |
| 1440 | open | 391 wide, 1748 tall | 553 wide, 1763 tall | Stacked. Weather needs its two zones; the pair splits only at a 672px region. |
| 1440 | collapsed | 459 wide | 933 wide | Side by side: calendar 274 wide, Weather 643, both 357 tall. |
| 1920 | open | — | 955 wide | Side by side: calendar 274 wide, Weather 665. |
| 1920 | collapsed | — | — | Side by side: calendar 274 wide, Weather 963. |

At 390px everything stacks.

## Producer checks on the candidate tree

- `vitest run`: 44 files, 848 tests passed.
- `pnpm typecheck`: passed (packages, e2e, Jev).
- `pnpm registry:build`: built 23 items.
- `pnpm build:workbench` and `pnpm build:storybook`: both passed. The existing large-chunk warning remains.
- `node tools/verify-workbench-gallery-preview-expansion.mjs`: `ok`, with 28 changed paths (including this checkpoint), 417 frozen, 12 operations,
  23 registry items, 11 compositions and 4 preview views.
- `git diff --check 9a1e247`: clean.
- Local authoring browser smoke (localhost only):
  - Workbench config: 326 passed, 11 skipped by design, and 1 failure.
    - The failure was `workbench-control-navigation-scroll.spec.ts:18` (desktop light, no-preference, at line 43, a
      Workbench editor `Home` key scroll-to-top). That spec file and the editor are unchanged by this phase. The test
      passed in the preceding full run, and a repeat of that spec passed 60/60 (`--repeat-each=5`). The Lead should
      treat it as an intermittent unrelated timing case unless it reproduces.
  - Phase spec: 23 passed and 1 skipped by design (the container sweep runs in the desktop project only). With
    `--repeat-each=3` it passed 69 times, with 3 skipped by design.
  - Storybook config: 110 passed.
  - Design Command live config: 1 passed.

## Known risks and residuals

- Doubled spacing under the WGPE-04 stress probe: Quick find and Studio revenue (unchanged) and the official Calendar
  overflow a 390px column. The Calendar's `--cell-size` is `--spacing(8)`, and this card now uses less padding than
  before. That check is therefore scoped to the table, as the prior phase's probe was. The default theme is contained
  at 390, 1100 and 1440.
- The Design system view shows raw computed OKLCH strings, which can be long. They truncate, and each keeps a `title`.
  Values are Chromium's serialised computed custom properties, so `var()` aliases resolve to the base value.
- One held-open `SidebarProvider` inside the preview document registers the official Ctrl/Cmd+B listener on the iframe
  window only. It has no visible effect (collapsible `none`, `open` fixed) and never reaches the Workbench window. It
  still calls `preventDefault` for that chord while focus is inside the preview.
- Inset project: with Sidebar tokens OFF in the default themes, `sidebar` aliases `background`. The inset's distinction
  then comes from its border and shadow; ON makes it a distinct surface.
- The browser specs' dedicated-token edit values are low-chroma and mode-aware. Out-of-gamut values are rejected by
  the existing validation, and mid-tone Sidebar surfaces would fail contrast of the Workbench's own muted chrome.
  This is not a product change.
- Existing accepted Default muted-pair contrast debt (the ControlSection triggers) remains separately attributed by
  `known-contrast-debt.ts`. No new serious or critical axe finding appeared in any producer run.
- Earlier phase verifiers are byte-frozen here and pin their own phase's bases and anchors. They describe historical
  candidates and are not expected to pass on this tree. For example, `tools/verify-workbench-showcase-components-geometry.mjs`
  already exits 1 at its first check (`Frozen admission record changed: BRIEF.md`, from the accepted control commit),
  and it also encodes the PUI-93 active note and the prior card order.

## Handoff

Candidate is the commit containing this file on `loop/workbench-gallery-preview-expansion-v1-001`. The Lead owns:

- the exact-candidate WGPE-12 unit, typecheck, registry, build and browser matrix;
- the reserved fresh Codex STANDARD protected verification (WGPE-13);
- acceptance and promotion (WGPE-14).
