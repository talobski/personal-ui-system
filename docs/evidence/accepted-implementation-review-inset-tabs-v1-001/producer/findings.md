# AIR-01 audit findings — accepted-implementation-review-inset-tabs-v1-001

Producer: Claude Opus 5.5 (bounded producer). Base: `4baca4f412124dab4fdf16736d67723db9044518` (accepted product
`b2f937a66508bb0a1978dc35c2a4b2bb89c46c83`). Checkpointed **before** any product source edit (AIR-01). The frozen
packet was re-hashed before reading: manifest SHA-256
`23f6a45866cfcb19414b6afc8d0548da00002cca01c471724285d4f30063fde2`, PUI-132
`3c18691af02fa9f26b09f689a5a89dc0b4b4c2ccaab36a3c74befcb7da3402f4`, PUI-133
`5cff65a70c87a462981c6d7451647467b4c2f02cae066e087a16236b3515ffc1`, all matching.

## Method

Read end to end and cross-checked by `git grep`:

- **Theme / UI Effects:** `packages/core/src/theme/render.ts`, `schema.ts` (UI effects, legacy normalization,
  `resolveUiEffects`), `diff.ts`, `mutations/mutation.ts` (`setUiEffects` validate/apply),
  `context/capability-descriptions.ts`.
- **Workbench / previews:** `apps/workbench/src/lifecycle.ts` (`previewVariablesCss`), `controls.ts`,
  `LiveControls.tsx` (`UiEffectsFields`, `ControlSection`, `LiveNumberField`), `PreviewFrame.tsx`, `workbenchTabs.ts`,
  `DesignSystemPreview.tsx`, UI Effects section of `App.tsx`.
- **Components / utilities:** `packages/ui/src/components/tabs.tsx`; export-usage scan of every non-test module in
  `apps/workbench/src` (exports never referenced outside their own file).
- **Tests:** `packages/core/src/theme/ui-effects.test.ts`, `apps/workbench/src/uiEffects.test.ts`,
  `e2e/tactile-ui-effects.spec.ts`, `e2e/amber-dusk-shell-refinement.spec.ts`, `e2e/ui-effects-showcase-polish.spec.ts`;
  every assertion on the TabsList ring (`git grep` for `tw-ring`, `0px 0px 0px 1px`, `ring-border`, `listRing`).
- **Types / contracts / guards:** `UiEffectsValue` / `LegacyUiEffectsValue` / field tuples, `tools/verify-*.mjs` for the
  two most recent phases (run at the clean base).

Scope was deliberately the accepted UI Effects / Tabs / Workbench-preview surface the recent ticket-by-ticket phases
touched; unrelated modules (jev-design, context, rules, compositions) were not re-audited beyond the export scan.

## Findings

| # | Area | Location / evidence | Issue | Current impact | Recommendation | Disposition |
|---|------|---------------------|-------|----------------|----------------|-------------|
| F1 | Theme/UI Effects (docs) | `packages/core/src/theme/schema.ts:226` — "whose recipe owns its fixed targets (Secondary Buttons and **active surface Tabs**)" | Stale since PUI-124: the Tabs target is the surface **TabsList**; triggers (active included) are explicitly untouched. | Misstates the accepted semantics at the schema's own doc comment; a future editor could reintroduce trigger styling. No runtime effect. | Comment-only correction to "surface TabsLists". Guard that comment-stripped code is byte-identical to base. | **refactor now** |
| F2 | Workbench/previews (docs) | `apps/workbench/src/PreviewFrame.tsx:113` — "its active trigger receives Tactile like the category tabs above (PUI-120)" | Same stale PUI-120 wording; contradicts `uiEffects.test.ts:203` ("its list is the Tabs target") and the render rule. | Misleading next to the exact sample the browser checks use. No runtime effect. | Comment-only correction. | **refactor now** |
| F3 | Workbench/previews (docs) | `apps/workbench/src/workbenchTabs.ts:2-3` — "so the active trigger is also the UI Effects surface-Tabs target" | Same stale PUI-120 wording. | Misleading; no runtime effect. | Comment-only correction (the list, not the trigger, is the target). | **refactor now** |
| F4 | Tests (brittle/redundant) | `e2e/tactile-ui-effects.spec.ts:27` `listRing = / 0px 0px 0px 1px/.test(\` ${s}\`) \|\| /0px 0px 0px 1px/.test(s)`; same bare `/0px 0px 0px 1px/` in `amber-dusk-shell-refinement.spec.ts:170,182` and `ui-effects-showcase-polish.spec.ts:136` | First disjunct is subsumed by the second (dead branch). None of the three distinguishes an outer ring from an inset one, so they cannot express PUI-133's inward requirement and would silently pass a regression to the outer ring. | Weak coverage of the exact behavior this phase changes. | Replace with one precise predicate for the inset 1px edge and assert no outer 1px ring; update only these directly superseded assertions. | **refactor now** (with PUI-133) |
| F5 | Theme/UI Effects (duplication) | `apps/workbench/src/lifecycle.ts:78-82` `previewVariablesCss` renders `renderShadcnTailwindCss` (which already calls `renderUiEffectsCss`), splits the effects block off with `@theme inline`, then calls `renderUiEffectsCss` again; each call re-runs `themeSchema.parse`. | Redundant render/parse (3 schema parses per call while Tactile, 2 while Off). | Small CPU cost on every edit for chrome + preview; PUI-118 measured color-edit medians ~116–121 ms without flagging this. No correctness issue. | A rework would touch the shared runtime CSS path used by chrome and preview and would need the broad browser matrix and a fresh perf comparison to justify it. Not clearly worthwhile inside this envelope. | **defer** |
| F6 | Theme/UI Effects (duplication) | `render.ts:112` `renderUiEffectsCss` re-parses via `themeSchema.parse` when called from `renderShadcnTailwindCss` which already parsed. | Double parse. | Same as F5; the re-parse is also the documented safety boundary for direct callers (and the legacy-normalization test at `ui-effects.test.ts:94` relies on it). | Keep: the parse is part of the public function's contract. | **no action** |
| F7 | Types/contracts (consistency) | `mutation.ts:175` validation treats a value as legacy if it has `outlineButtons` **or** `tabs`; `mutation.ts:267` apply branches on `"outlineButtons" in value`. | Two different discriminants for the same union. | None: validation requires all four legacy fields before apply runs, so both tests agree on every admitted value. | Could share `isLegacyUiEffectsInput`, but it is a mutation-pipeline edit with no current defect; risk/benefit does not justify touching the 13-operation mutation module. | **no action** |
| F8 | Design Command (docs) | `context/capability-descriptions.ts:26` — "surface tabs lists one fixed ring, independent of strength" | Still accurate after PUI-133 (an inset ring is still one fixed ring); wording is part of the Design Command capability output. | None. | Leave: changing it would alter Design Command-visible text, which AIR-05 forbids. | **no action** |
| F9 | Components/utilities (dead exports) | Export scan: `colorPicker.ts PickerOwner`, `controls.ts decimalsOf`, `designCommand.ts DesignCommandFetchResult`, `lifecycle.ts Outcome`, `DesignSystemPreview.tsx SIDEBAR_SWATCH_LABELS` are exported but referenced only inside their own module. | Unneeded `export` keywords. | None (all are used internally; types are harmless). Removing `export` is style-only. | Leave. | **no action** |
| F10 | Tests (brittle pattern) | `apps/workbench/src/uiEffects.test.ts` and many `tools/verify-*.mjs` assert exact source strings (class lists, JSX lines). | Source-text assertions encode implementation detail. | Established, accepted project convention; each phase's guard is intentionally frozen to its own base. Replacing them is broad and not behavior-driven. | Leave as the project pattern. | **no action** |
| F11 | Guards (stale) | `node tools/verify-tactile-border-designsystem-type.mjs` → `Out-of-scope change: BRIEF.md`; `node tools/verify-amber-dusk-shell-refinement.mjs` → `Outside admitted scope: BRIEF.md` — both at the clean base `4baca4f`. | Both prior phase guards are base-relative and already fail at this phase's base (the contract names the Amber Dusk one; the TBDS one fails the same way because `4baca4f`'s admission commit changed `BRIEF.md`). They also pin `ring-1` declarations that PUI-133 supersedes. | Historical evidence only; they cannot pass on any later lineage. | Do not edit or relabel them; this phase adds its own phase-local guard. | **no action** (recorded residual) |
| F12 | Theme/UI Effects (PUI-133 target) | `render.ts:90-100` `TABS_LIST_RING` = Tailwind `ring-1 ring-border/80` (outer `--tw-ring-shadow` slot). | Admitted change, not a refactor finding. | — | Replace with the locally verified `inset-ring-1 inset-ring-border/80` declarations in the `--tw-inset-ring-shadow` slot; keep the same composition, token and Strength independence. | **implement (PUI-133 / AIR-03)** |

## Selected for STEP 2

- PUI-133 / AIR-03 (F12) with its directly superseded unit and browser assertions.
- F4 (precise inset-edge predicate in the three browser specs, replacing the redundant/undiscriminating regexes).
- F1–F3 comment-only corrections of the stale "active trigger is the Tabs target" wording.

No runtime refactor was selected: the only runtime duplication found (F5/F6) touches the shared chrome+preview CSS
path, whose benefit is marginal and would require broadening verification. Deferred: F5. No product defect was found.

## Tailwind evidence for AIR-03

`tailwind-inset-ring-probe.mjs` (this directory) compiles the four utilities with the installed, symlinked
`tailwindcss@4.3.3` (`/Users/emmantalob/dev/personal-ui-system/node_modules/.pnpm/tailwindcss@4.3.3/…`) against the
committed rendered default theme (`@theme inline { --color-border: var(--border) }`), offline with
`COREPACK_ENABLE_NETWORK=0`. Output is in `tailwind-inset-ring-probe.txt`:

```css
.inset-ring-1 {
  --tw-inset-ring-shadow: inset 0 0 0 1px var(--tw-inset-ring-color, currentcolor);
  box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);
}
.inset-ring-border\/80 {
  --tw-inset-ring-color: var(--border);
  @supports (color: color-mix(in lab, red, red)) {
    --tw-inset-ring-color: color-mix(in oklab, var(--border) 80%, transparent);
  }
}
```

The accepted `ring-1 ring-border/80` translation used the `color-mix` branch and Tailwind's composition with
`0 0 #0000` fallbacks; the inset equivalent follows the same convention:
`--tw-inset-ring-shadow: inset 0 0 0 1px var(--tw-inset-ring-color, currentcolor);`,
`--tw-inset-ring-color: color-mix(in oklab, var(--border) 80%, transparent);`, and the unchanged composition. An inset
ring has no `--tw-ring-offset-width` term (unlike `ring-1`), and `--tw-inset-ring-shadow` is registered by Tailwind
with `initial-value: 0 0 #0000`, which the composition's fallback mirrors where Tailwind has not registered it.
