# Tactile UI effects — reconciled phase contract

Phase: `tactile-ui-effects-v1-001`
Ticket: PUI-113 only; PUI-118 belongs solely to a later, independently admitted performance phase.
Classification: Tier 3 because the strict, persisted, public Theme v3 shape and closed mutation union change.
Accepted product base: `54849dcbda47f72d3fa9cdec34256b77677d4743`
Accepted control base: `ebf05360527af1769eac97acafc29f9da08c5817`

`docs/evidence/tactile-ui-effects-v1/linear/PUI-113.json` freezes the complete admission-time issue and comment/attachment/reference state. `snapshot-hashes.json` pins its bytes. Linear is planning context; this contract governs execution and later ticket edits cannot silently change it. No PUI-118 work, packet, profiling, or implementation is admitted here.

## Product boundaries

- No runtime data fetching or public/external effects.

## Product contract

1. Add a compact **UI EFFECTS** section between Shadow and Motion in the existing Effects tab. Use accepted Select/dropdown, switches or toggles, and one bounded Strength control. Tactile is the only selectable effect. Show independent Outline buttons and Tabs controls. Shadow and Motion keep their existing meanings.
2. Extend the existing Theme v3 schema with a small closed UI-effects value. An older v3 theme without it, and migrated v1/v2 themes, render flat and import successfully. New exports, local saves, and reloads retain effect, both target toggles, and Strength. Keep `schemaVersion: "3.0"`; no Theme v4, separate file format, migration machinery, generalized material engine, or unused effect family.
3. The existing Workbench manual-edit architecture routes each UI-effects change through **one** new bounded `setUiEffects` mutation operation, bringing the closed union from 12 to 13. The value cannot carry raw CSS, selectors, arbitrary paths, or extra targets. Existing operations and Design Command's staged Preview/Apply/Discard vocabulary and locks retain their behavior. Token diff, dirty state, history, Undo/Redo, Reset and baseline comparisons must count UI-effects design values consistently; absence must behave as the documented flat default.
4. Target only accepted Outline Buttons and active surface/pill-style Tabs when their respective toggles are on. All non-outline Button variants, inactive tabs, line/minimal Tabs, Inputs, Card, Slider, Switch, Dialog and Sidebar stay flat. Preserve public Button/Tabs APIs if existing data attributes, classes and theme-driven CSS can express the treatment; any unavoidable public API change needs Lead reconciliation before implementation. The 23-resource registry stays unchanged.
5. Outline Buttons and selected surface Tabs share a coherent subtle tactile family: soft neutral illumination, restrained inner highlights/shadows and edge definition, minimal visible outer drop shadow, bounded pressed/selected depth. Preserve semantic surface/color tokens, radius, typography, size, layout, focus-visible rings, keyboard, disabled and selected semantics, light/dark and reduced-motion behavior. The producer may tune the exact recipe through browser evidence; this contract does not freeze a specific shadow formula.
6. Do not add dependencies, worker network, new effects, textural assets, lighting controls, raw per-property editors, or unrelated changes. The accepted Select, Switch, Slider, Radix-backed Button/Tabs and CSS capabilities are sufficient at admission. A demonstrated need outside this boundary requires Lead reconciliation and, if authority expands, owner approval.

Likely product surfaces: `packages/core/src/theme/{schema,render,diff}.ts`, `packages/core/src/mutations/mutation.ts`, built-in/legacy theme fixtures only where compatibility requires, `apps/workbench/src/{App,controls,lifecycle,history,persistence,styles,PreviewFrame,workbenchTabs}.tsx?`, and tightly scoped `packages/ui` Button/Tabs styling. Change only files required by the contract and explain any additional path. Tests, Storybook stories and e2e specs may be added or updated without weakening accepted assertions.

## Acceptance and verification

- **TUE-01:** Exact frozen PUI-113 snapshot, metadata/comment/attachment state, hash manifest and authoritative contract match admission; PUI-118 is absent.
- **TUE-02:** Theme v3 remains version 3.0; older v3 and v1/v2 inputs import flat; new settings survive export, save/reload and validation. No broad migration or format change.
- **TUE-03:** The one closed `setUiEffects` operation validates bounds and allowed fields; the pre-existing 12 operations retain semantics. No raw CSS or arbitrary target path.
- **TUE-04:** UI EFFECTS controls have Tactile only, two independent target toggles and one shared bounded Strength; live preview, history, Undo/Redo, Reset and dirty state behave correctly.
- **TUE-05:** Outline Button alone receives tactile styling when enabled; default, secondary, ghost, destructive, link and other non-outline variants remain flat; size, disabled, focus and keyboard behavior hold.
- **TUE-06:** Active surface/pill Tabs alone receive the same effect family when enabled; inactive and line/minimal Tabs stay flat; keyboard, focus and selected semantics hold.
- **TUE-07:** Light/dark, narrow/wide, Strength bounds and accessible contrast/decoded axe evidence support the intended restrained appearance without broadening prior accepted contrast debt.
- **TUE-08:** Theme rendering, persistence/import/export, staged Design Command, 23 public registry resources, Sidebar boundaries, dependency/lockfile, credential/network and unrelated behavior remain intact.
- **TUE-09:** Lead executes exact-candidate real-browser Workbench and affected Storybook interactions, visual captures, keyboard/focus and decoded axe; producer checks are not acceptance.
- **TUE-10:** Offline unit, typecheck, Workbench/Storybook builds, registry, phase guards and relevant Design Command browser boundary pass; tests are not deleted, skipped or weakened to pass.
- **TUE-11:** A fresh protected verifier audits the exact clean candidate, frozen packet, source, contract, Lead evidence and pre/post Git identity without browser substitution or candidate repair.
- **TUE-12:** Lead records acceptance before fast-forward promotion, then confirms promoted identity and focused smoke, writes durable receipts, updates BRIEF and closes only this phase. PUI-118 admission follows only after closeout.

Previously documented Bitcoin gallery height, narrow Type scale ellipsis and Default-theme contrast token debt remain separately attributed. They do not authorize new failures.
