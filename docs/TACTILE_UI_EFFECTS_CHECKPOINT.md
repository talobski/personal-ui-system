# Tactile UI effects — producer checkpoint

Phase: `tactile-ui-effects-v1-001` (PUI-113 only; PUI-118 excluded)
Base: `8d06f7d7c4ffae39e8c2bbb71aa508b42d4d2b99`
Governing contract: `docs/TACTILE_UI_EFFECTS_CONTRACT.md` (unchanged). Frozen snapshot
`docs/evidence/tactile-ui-effects-v1/linear/PUI-113.json` hashes to the manifest value
`0d77dad2…c9c3a`; neither file is edited.

This is a producer record. It is not acceptance; Lead owns browser evidence and a fresh protected verifier audits the
exact candidate.

## Checkpoint 1 — architecture (before styling)

### Schema: one optional closed Theme v3 field

`themeSchema` (still `schemaVersion: "3.0"`, same URI) gains an **optional** `uiEffects` object that follows the
existing `$type`/`$value` token convention:

```json
"uiEffects": {
  "effect":         { "$type": "string",  "$value": "tactile" },
  "outlineButtons": { "$type": "boolean", "$value": true },
  "tabs":           { "$type": "boolean", "$value": false },
  "strength":       { "$type": "number",  "$value": 50 }
}
```

- `effect` is the closed enum `["tactile"]`; `strength` is an integer 0–100. The object is `strictObject`, so no extra
  target, selector, CSS text or path can be stored.
- No Theme v4, new URI, migration step or file format. v1/v2.0/v2.1 migration is untouched and never produces the field.
- **Flat default.** Absence means `UI_EFFECTS_FLAT = { effect: tactile, outlineButtons: false, tabs: false,
  strength: 50 }` (`resolveUiEffects(theme)`). An older v3 theme, a migrated v1/v2 theme and both built-in fixtures
  have no field, parse unchanged, export unchanged and render **byte-identical CSS** to the base commit.
- The field is kept optional in the parsed output (not defaulted) so committed fixtures, saved themes and exports of
  untouched themes stay byte-stable. Only a theme edited through `setUiEffects` carries it; export, Save and reload
  then round-trip all four values through the existing `themeSchema`/`validateTheme` path.

### Mutation: exactly one new closed operation (12 → 13)

`{ op: "setUiEffects", value: { effect, outlineButtons, tabs, strength } }` — all four value fields required, each
validated against the same schema pieces; unknown value keys fail as `mutation.unknown-field` at
`operations[i].value.<key>`, bad values as `mutation.invalid-value` at `operations[i].value.<field>` (the
`setShadowProfile` pattern). It replaces the whole `uiEffects` object; no other field, target or path can be
addressed. The 12 existing operations, their validators and application are unchanged. `describeOperations()` and
`VALUE_CONSTRAINT_DESCRIPTIONS` gain the one entry. The Design Command recipes (`jev-design`) do not emit it, so the
staged Preview/Apply/Discard vocabulary and locks are unchanged; a staged candidate that happens to carry
`uiEffects` still previews through the same iframe CSS path.

### Diff, dirty, history, Reset

`diffThemeTokens` reads `uiEffects` through `resolveUiEffects`, so an absent field and an explicit flat default are
the same design (no spurious dirty state, no empty history entry), while any change to effect, either toggle, or
strength is a `uiEffects.*` token difference. Because `history.ts`/`App.tsx` already derive `sameDesign`, `isDirty`,
`record`, Undo/Redo and Reset from that diff, and `restoreContent` clones the snapshot (so a baseline without the
field restores to no field), no history code changes are needed. The Strength slider uses the existing gesture path
(one history checkpoint per drag/typing session); Effect and the two toggles are single committed edits.

### Rendering and surface targeting

`renderShadcnTailwindCss` appends one `@layer components` block **only when** `outlineButtons` or `tabs` is on.
Flat themes emit nothing new. The block targets exactly:

- Outline Button: `[data-slot="button"][data-variant="outline"]` — `Button` already emits `data-slot`/`data-variant`,
  so non-outline variants (`default`, `secondary`, `ghost`, `destructive`, `link`) cannot match. `ToggleGroup`
  items (`data-slot="toggle-group-item"`) and `buttonVariants()`-only class usages (no `data-slot`) are not matched.
- Active surface/pill Tab: `[data-slot="tabs-list"]:not([data-variant="line"]) > [data-slot="tabs-trigger"][data-state="active"]`.
  Inactive triggers never match (`data-state="inactive"`).
- **Line/minimal Tabs exclusion.** The accepted `Tabs` component has no variant prop, so its public API is not
  changed. A line/minimal list is marked at its usage site with the ordinary pass-through attribute
  `data-variant="line"` (the attribute name upstream shadcn uses for its line tabs). The two transparent Workbench
  category lists (editor categories and preview views, `quiet-categories`) receive it; the surface usages
  (`workspace-settings`, Tabs stories) are unmarked surface/pill lists.

The recipe sets Tailwind v4's own `--tw-inset-shadow` slot plus a `background-image` wash, inside
`@layer components`. Consequences:

- The element's existing utility `box-shadow` composition (`shadow-xs` on Outline, `data-[state=active]:shadow-sm` on
  the active tab) still renders the theme Shadow tier, focus-visible rings (`--tw-ring-shadow`) and `aria-invalid`
  rings, so general Shadow semantics and focus treatment are untouched.
- Consumer utilities still win (utilities layer > components layer), so a local `shadow-none`/`bg-*` override keeps
  working and no public class contract changes.
- All colours are `color-mix()` of semantic `--background`/`--foreground` resolved **at the element**, with a
  `:is(.dark *)` variant that swaps the light/shade sources, so the recipe follows light/dark and any `.dark` subtree.
  No raw colours, radius, size, typography or layout properties are set. Strength scales every layer linearly from 0
  (visually flat) to a capped maximum; `:active` swaps to a slightly inset pressed layer. No motion is added.

### Where the effect renders

- Preview iframe: `previewThemeCss(theme)` = the existing `:root`/`.dark` variables plus the effects block, used for
  the posted preview state (active theme or staged candidate).
- Workbench chrome keeps using the unchanged `previewVariablesCss`, so the editor's own toolbar/dialog Outline buttons
  and category tabs stay flat and never restyle while the effect is edited (chrome continues to follow colours and
  typography as before). This is a producer choice within "Sidebar stays flat / unrelated behaviour unchanged"; Lead
  may reconcile if chrome should follow.
- Portable consumers get the same block from `renderShadcnTailwindCss`. Storybook compiles the static flat
  `quiet-editorial.css` fixture, so existing stories stay flat and unchanged.

### Controls

A `UI Effects` `ControlSection` between Shadow and Motion in the Effects tab: an Effect `Select` with the single item
`Tactile`, two `Switch` rows (`Outline buttons`, `Tabs`) and one `Strength` slider/number row (0–100) built on the
existing `LiveNumberField`. Every control emits `setUiEffects` with the full resolved value, through `applyManual`,
and is disabled with the other manual controls while a proposal is staged or a command is evaluating.

### Unchanged boundaries

23 registry resources (`registry.json` untouched), no dependency/lockfile change, no public Button/Tabs prop change,
no Input/Card/Slider/Switch/Dialog/Sidebar/non-outline styling, no network, credential or `.loop` access.
