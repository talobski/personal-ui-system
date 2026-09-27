# Workbench showcase components and Geometry — producer checkpoint

Phase: `workbench-showcase-components-geometry-v1-001` (PUI-86 through PUI-94)
Implementation base: `0dcf890431eca3c720b842f34cacb884879e4bd8`
Producer: Claude (`claude-opus-5-5`). This is authoring evidence only. It is not Lead browser evidence,
protected verification, acceptance or promotion.

## Preflight

- Base HEAD was `0dcf890` and the worktree was clean.
- The contract, source audit and nine ticket snapshot SHA-256 values matched `snapshot-hashes.json` before any edit.
- No dependency was added or updated. All pnpm invocations ran with `COREPACK_ENABLE_NETWORK=0` and `--offline`. No
  install was needed because the prepared `react-day-picker@10.0.1` tree was already present. The worker used no
  network, credentials, subagents or canonical `.loop` state.

## Commits

1. `f1eea6d`: the official Message, Bubble, Calendar and Table resources, with contracts, closed state constraints,
   provenance, registry entries (23), stories and tests.
2. `4d2f149`: the eleven-card gallery (PUI-86 to PUI-92).
3. `19564e1`: Sidebar toggle polish (PUI-93), the Geometry tab (PUI-94), a compact-table overflow fix and migrated
   browser definitions.
4. This commit: the phase verifier and this checkpoint.

## Criterion map (producer view)

| Criterion | Delivery | Authoring evidence |
| --- | --- | --- |
| WSCG-03 | Storage has no CTA, button, state or stable variant. It ends after the breakdown. | `gallery.test.ts` WSCG-03 and the browser spec. |
| WSCG-04 | Revenue uses `<XAxis dataKey="period" hide …>`: no tick row and no reserved height. The figcaption summary is retained. | Unit test, plus browser checks in all three ranges. |
| WSCG-05 | The weekly steps card has a visually hidden `Weekly steps` h2, an 8,357 `type-heading` average, a label and `+12.4% vs last week`. It keeps seven chart-token bars labelled M–S. | Unit test, `chart.spec.ts` and the browser spec. |
| WSCG-06 | `team-chat` uses Message, Bubble and Avatar. The turns are start/end aligned, each sender is named, and the card is static. | Unit test, the browser spec and `showcase-resources.spec.ts`. |
| WSCG-07 | `recent-payments` is a Table-only recipe (Status, Email, Amount; five rows; visually hidden caption) with no TanStack. It uses a fixed layout with truncating cells. | Unit test and the browser spec, including the doubled-spacing overflow check. |
| WSCG-08 | `signup-form` is the block's form portion only: no wrapper or media panel, `noValidate`, and a visually hidden status. | Unit test and the browser spec. |
| WSCG-09 | `offsite-calendar` is one official Calendar with `mode="range"`, one month, `fixedWeeks`, deterministic dates and a pinned `today`. | Unit SSR range test and browser keyboard checks. |
| WSCG-10 | `now-playing` (local state only) and `local-weather` (static sample data, stated as not live) use tokens only. | Unit external-effect scan and the browser spec. |
| WSCG-11 | The gallery has eleven compositions, each once. Music was moved to the end of the right region by measurement. | Unit test, migrated gallery specs and the balance browser test. |
| WSCG-12 | The toggle label is text-xs and muted, with an `mt-2` gap. The inactive note is removed and `aria-describedby` is only set while active. | `lifecycle.test.ts` and the browser spec. |
| WSCG-13 | The tabs are Colors / Typography / Geometry / Effects / Command. Geometry holds Radius and Spacing; Effects holds Shadow and Motion. | `lifecycle.test.ts` and the browser spec. |
| WSCG-14 | See the checks below. | `tools/verify-workbench-showcase-components-geometry.mjs`. |

Authoring gallery measurement, at 1440x900 with the sidebar open (gallery 960px, regions 391/553px): the contract's
initial layout put Music in the left region and measured left 2138px against right 1678px. After moving Music to the
end of the right region, the regions measure 1894px and 1922px. At 1920px wide they measure 1894px and 1853px. The
replacement slots are unchanged: Signup is fourth on the left, Chat is in the local pair, and the Table follows the
pair.

## Producer checks on the candidate tree

- `vitest run`: 43 files, 837 tests passed.
- `pnpm typecheck`: passed (packages, e2e, Jev).
- `pnpm registry:build`: built all 23 items.
- `pnpm build:workbench` and `pnpm build:storybook`: both passed.
- `node tools/verify-workbench-showcase-components-geometry.mjs`: `ok`, with 68 changed paths, 12 operations and
  23 registry items.
- `git diff --check` against the base: clean.
- Local authoring browser smoke (localhost only):
  - Workbench config: 302 passed and 10 skipped by design.
  - Storybook config: 110 passed.
  - Design-command live config: 1 passed.

These local runs are authoring smoke, not Lead evidence.

## Residual risks

- The workers had no network access, so the Message and Bubble sources were rebuilt from the Lead's architecture audit
  rather than copied byte-for-byte. The Bubble reaction parts are omitted and documented as such. The Calendar and Table
  sources were written from the official new-york-v4 files as the producer knows them, not from a fresh fetch.
- The Music move is a bounded balance regrouping measured by the producer. The Lead's browser evidence should confirm
  it.
- The compact Table truncates its cells under extreme spacing and narrow widths, by design. The full text stays in the
  DOM.
- The Calendar pins `today` to the range start, so the real date never appears in the fixture.
- The Workbench shell still has the pre-existing large-bundle warning.
