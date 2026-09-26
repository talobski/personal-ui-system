# Frozen Linear ticket snapshots

Phase: `workbench-sidebar-theme-polish-v1-001`

Captured directly from Linear at admission on 2026-09-26. These snapshots are
immutable planning references. The reconciled phase contract is authoritative
if any conflict exists. Later Linear edits do not mutate the executing phase.

All seven issues were `Todo`, priority `High`, in team `Personal UI System` and
project `personal-ui-system`. The direct reads returned no comments,
attachments, documents, releases, customer needs, or issue relations.

## PUI-56 — Refine shadcn ScrollArea thickness and thumb color

- UUID: `8c7c5ab5-6199-4831-9f5e-d92ecba215d7`
- URL: https://linear.app/emman-systems/issue/PUI-56/refine-shadcn-scrollarea-thickness-and-thumb-color
- Updated at capture: `2026-09-26T10:50:59.987Z`

### Verbatim description

Polish the shared shadcn ScrollArea visual treatment so scrollbars feel lighter and less visually heavy across the Personal UI Workbench.

Owner direction:

* Keep the current accepted shadcn/Radix ScrollArea architecture.
* Make the scrollbar thinner.
* Keep the thumb gray/neutral, but use a lighter semantic treatment than the current appearance.
* Preserve the transparent/floating track feel.
* Apply this through the shared ScrollArea styling so appropriate Workbench scroll regions stay visually consistent.

Desired visual behavior:

* Vertical scrollbar width should be reduced from the current treatment to a slimmer size.
* Horizontal scrollbar height should be reduced correspondingly.
* Thumb remains neutral gray in appearance, but lighter / lower-contrast.
* Track remains transparent or visually minimal.
* Preserve rounded thumb treatment if already present.
* Hover/active state may increase contrast slightly, but should still remain subtle.

Implementation guidance:

* Prefer semantic/theme-aware tokens and opacity over hard-coded gray values.
* Suitable directions may include a lighter `muted-foreground`, `border`, or equivalent semantic neutral treatment.
* Worker should inspect the current ScrollBar / Thumb classes and choose the smallest shared change.
* Do not create region-specific scrollbar styles unless a clear exception is necessary.
* Do not alter the underlying Radix ScrollArea ownership, scrolling behavior, or accessibility semantics.

Scope:

* Shared public shadcn ScrollArea / ScrollBar visual styling.
* Vertical and horizontal scrollbar thickness.
* Scrollbar thumb color/opacity and hover/active treatment.
* Relevant Storybook/Workbench tests and visual fixtures.

Constraints:

* Do not change scroll ownership or introduce new scroll containers.
* Do not reintroduce native reserved-width scrollbars.
* Preserve overlay/non-reserving behavior.
* Preserve wheel, trackpad, keyboard, pointer-drag, and touch scrolling.
* Preserve light/dark theme compatibility.
* Avoid hard-coded literal gray colors where semantic tokens can achieve the same result.

Acceptance:

* Shared ScrollArea scrollbar is visibly thinner than the current implementation.
* Thumb remains gray/neutral but is visibly lighter/subtler than before.
* Horizontal and vertical scrollbars use consistent thickness logic.
* Track remains transparent/minimal.
* Hover/active treatment remains subtle and theme-aware.
* All existing ScrollArea consumers inherit the refined styling unless intentionally exempted.
* No layout shift, scroll trap, reserved-width regression, or accessibility regression is introduced.

## PUI-57 — Increase Workbench sidebar width to 28rem

- UUID: `72ef0ce3-3663-4976-8516-5e2ca68c4898`
- URL: https://linear.app/emman-systems/issue/PUI-57/increase-workbench-sidebar-width-to-28rem
- Updated at capture: `2026-09-26T10:51:03.251Z`

### Verbatim description

Increase the Workbench sidebar width to 28rem while staying aligned with the official shadcn Sidebar architecture and configuration model.

Owner direction:

* Target desktop sidebar width: `28rem`.
* Before changing implementation, audit the current shadcn Sidebar setup and determine the intended/official way to configure sidebar width.
* Prefer shadcn's supported sidebar width variable/configuration mechanism over one-off width overrides.

Worker should check:

* whether the current Sidebar implementation exposes or uses a variable such as `--sidebar-width`;
* whether the official shadcn Sidebar pattern expects width to be configured through SidebarProvider/root CSS variables or another supported API;
* whether mobile/off-canvas width uses a separate variable such as `--sidebar-width-mobile`;
* whether changing desktop width requires any corresponding updates to inset/content calculations, collapsible behavior, or responsive breakpoints.

Implementation preference:

* Use the smallest official/shadcn-aligned configuration change possible.
* If `--sidebar-width` is the accepted mechanism, set the desktop value to `28rem`.
* Do not hard-code widths across multiple nested elements if one canonical sidebar-width variable controls the system.
* Keep mobile width unchanged unless the audit shows it must be adjusted for correctness.
* Preserve the current SidebarProvider / Sidebar / SidebarInset architecture.

Scope:

* Workbench desktop sidebar width.
* Official shadcn Sidebar configuration/variables.
* Any directly dependent layout calculations or tests required by the width change.
* Relevant responsive/browser fixtures.

Constraints:

* Do not redesign the sidebar structure.
* Do not alter control typography, spacing tokens, or preview content.
* Do not change mobile/off-canvas width unless technically required and documented.
* Avoid custom width hacks that fight shadcn's built-in sidebar behavior.
* Preserve collapsible/off-canvas behavior, keyboard interaction, accessibility, and preview containment.

Acceptance:

* Desktop Workbench sidebar resolves to 28rem.
* The implementation uses the official or intended shadcn width-configuration mechanism where available.
* SidebarInset/main preview correctly consumes the remaining width with no overflow or layout shift.
* Existing sidebar header, category navigation, ScrollArea, controls, and footer remain correctly aligned.
* Mobile/off-canvas behavior remains intact.
* Worker documents the shadcn-supported mechanism used and any reason for deviating from it.

## PUI-58 — Refine typography controls and shared label widths

- UUID: `19747bae-9e50-43d7-bc54-331a1246b756`
- URL: https://linear.app/emman-systems/issue/PUI-58/refine-typography-controls-and-shared-label-widths
- Updated at capture: `2026-09-26T10:51:07.097Z`

### Verbatim description

Refine the Workbench Typography controls so Font families use explicit left-side labels, Letter spacing terminology is simplified, and shared control-row label widths are revisited to free more space for sliders and inputs.

Owner direction:

1. Font families — add explicit row labels

* Update the Font families group so each control follows the same left-label / right-control layout used elsewhere in the Workbench.
* Use concise visible labels:
  * Sans
  * Serif
  * Mono
* Keep the existing official Select/Combobox implementation and font-family behavior.
* Preserve the current font catalog, custom-stack support, persistence, Theme v2 semantics, and accessibility.
* The control itself should continue to show the selected family/placeholder; the new left-side label provides the category context.

2. Simplify Letter spacing terminology

* Rename the collapsible group trigger:
  * `LETTER SPACING` -> `SPACING`
* Rename the field label:
  * `Letter spacing` -> `Tracking`
* Keep the underlying theme/property/mutation names unchanged unless there is a separate technical reason to change them.
* This is a visible-copy/UX simplification only.

3. Revisit shared label-column width

* Now that labels are shorter across Typography and Other, audit the fixed label width used by shared sidebar control rows.
* Reduce the label column width where safely possible so sliders and value/text inputs receive more horizontal space.
* Prefer changing the shared row abstraction rather than patching individual controls.
* Apply to the existing shared row pattern across Typography, Other, and equivalent sidebar controls that use the same layout.
* Keep the label column stable and independent of the user-editable spacing token.
* Worker should audit actual visible labels and choose the smallest stable fixed width that avoids awkward wrapping/clipping.
* Preserve the existing layout contract:
  * fixed/non-shrinking label;
  * flexible middle control/slider;
  * intrinsic/non-shrinking value/unit or input area.

Scope:

* Typography -> Font families group.
* Typography -> Letter spacing/Tracking group.
* Shared numeric/control row abstraction used across Typography, Other, and equivalent sidebar controls.
* Relevant tests/fixtures/browser coverage.

Constraints:

* Do not change underlying theme schema, mutation operation names, persistence format, or Design Command semantics.
* Do not change unrelated field labels outside the shared row audit.
* Do not reduce label width so far that intended labels wrap or clip under normal supported sidebar widths.
* Preserve keyboard/focus behavior, responsive containment, and accessibility.

Acceptance:

* Font family controls display explicit left-side labels: Sans, Serif, Mono.
* Font family rows use the same aligned left-label/right-control rhythm as other Workbench controls.
* The collapsible trigger reads `SPACING`.
* The field label reads `Tracking`.
* Underlying theme/property semantics remain unchanged.
* Shared label-column width is reduced from the current value if the audit confirms it can be safely tightened.
* Sliders and text/value controls gain additional usable horizontal space.
* Label width remains stable across spacing-token changes.
* No intended labels wrap or clip at supported sidebar widths.
* Existing font selection, tracking editing, numeric-row behavior, persistence, keyboard interaction, and accessibility remain intact.

## PUI-59 — Set theme selector labels to font-medium

- UUID: `22be2aff-0eea-4d2c-88d3-9cd244f70eae`
- URL: https://linear.app/emman-systems/issue/PUI-59/set-theme-selector-labels-to-font-medium
- Updated at capture: `2026-09-26T10:51:11.549Z`

### Verbatim description

Increase the theme selector label weight from the current regular treatment to 500 / `font-medium`.

Owner direction:

* Active/current theme name in the compact theme selector should use `font-medium`.
* Theme names inside the theme dropdown/list should also use `font-medium`.
* Target font weight: 500.

Scope:

* Active theme label in the sidebar header selector.
* Theme names shown in the selector dropdown/menu.
* Relevant focused tests/fixtures if needed.

Constraints:

* Do not change font family, font size, line-height, tracking, or text color.
* Do not change swatches, chevron size, spacing, hover states, selected states, delete actions, or dropdown behavior.
* Do not change unrelated labels or menu items elsewhere in the Workbench.
* Preserve keyboard navigation, focus-visible behavior, selection semantics, and accessibility.

Acceptance:

* Active/current theme name renders with `font-medium` / 500 weight.
* All theme names in the selector dropdown render with `font-medium` / 500 weight.
* No unrelated typography or interaction behavior changes.

## PUI-60 — Rename Other tab to Effects and tighten tab padding

- UUID: `cc50ede6-056e-4eda-a5f9-ba4b95a19407`
- URL: https://linear.app/emman-systems/issue/PUI-60/rename-other-tab-to-effects-and-tighten-tab-padding
- Updated at capture: `2026-09-26T10:51:14.320Z`

### Verbatim description

Refine the Workbench sidebar category tabs with a clearer label and slightly tighter horizontal spacing.

Owner direction:

1. Rename the "Other" tab

* Rename the visible sidebar category label:
  * `Other` -> `Effects`
* This tab continues to contain the existing control groups:
  * Radius
  * Spacing
  * Shadow
  * Motion
* Keep underlying tab IDs/state keys/routes unchanged unless a technical rename is clearly safe and worthwhile.
* Prefer a visible-label-only change if that avoids unnecessary state/contract churn.

2. Tighten tab trigger padding

* Reduce sidebar category tab horizontal padding:
  * `px-3` -> `px-2`
* Preserve current vertical padding, height, radius, font size, cursor behavior, active/inactive semantic colors, horizontal scrolling, and content-width sizing.

Scope:

* Sidebar editor category tabs:
  * Colors
  * Typography
  * Effects (formerly Other)
  * Command
* Relevant Workbench tests/fixtures.

Constraints:

* Keep official shadcn Tabs primitives.
* Do not change tab ordering.
* Do not alter the contents or behavior of the renamed category.
* Do not change right-panel preview controls.
* Preserve keyboard navigation, ARIA semantics, focus-visible behavior, and horizontal ScrollArea behavior.

Acceptance:

* The sidebar label reads `Effects` instead of `Other`.
* Radius, Spacing, Shadow, and Motion remain under the renamed category.
* Sidebar tab triggers use `px-2` instead of `px-3`.
* Existing active/inactive styling, content-width behavior, horizontal scrolling, keyboard/focus behavior, and accessibility remain intact.

## PUI-61 — Add pointer cursor to interactive Workbench controls

- UUID: `a353d43e-3f96-45fe-8997-5222e6eb823b`
- URL: https://linear.app/emman-systems/issue/PUI-61/add-pointer-cursor-to-interactive-workbench-controls
- Updated at capture: `2026-09-26T10:51:17.386Z`

### Verbatim description

Standardize pointer-cursor affordance on clearly clickable Workbench controls that currently do not show it.

Owner direction:

* Add `cursor-pointer` to the interactive controls shown in the current Workbench UI, including:
  * collapsible control-group trigger buttons such as Radius, Spacing, Shadow, Typography groups, and equivalent shared ControlSection triggers;
  * text+icon action buttons such as Export JSON and Save;
  * the sidebar trigger / sidebar toggle icon button;
  * equivalent directly-clickable Workbench buttons that use the same shared patterns and currently lack pointer cursor feedback.
* Apply the change through shared primitives/abstractions where appropriate instead of patching every instance individually.

Behavior:

* Pointer cursor should appear on hover-capable pointer devices for enabled clickable controls.
* Disabled controls should preserve their disabled cursor/interaction semantics and must not falsely imply interactivity.
* Do not add pointer cursor to non-clickable labels, decorative icons, static text, sliders/tracks, or other non-button surfaces.

Scope:

* Shared collapsible ControlSection trigger.
* Workbench toolbar text+icon action buttons.
* Sidebar trigger/toggle button.
* Equivalent Workbench button patterns discovered during the focused audit.
* Relevant tests/fixtures if needed.

Constraints:

* Preserve existing hover/focus/active styling.
* Preserve button dimensions, icon sizing, spacing, typography, semantic colors, and accessibility.
* Do not globally force `cursor-pointer` onto every element with a click handler or every shadcn primitive unless the shared behavior is clearly correct for all consumers.
* Keep disabled-state behavior accurate.

Acceptance:

* Applicable collapsible trigger buttons show pointer cursor when enabled.
* Export JSON and Save show pointer cursor when enabled.
* Sidebar trigger/toggle shows pointer cursor when enabled.
* Equivalent shared Workbench button instances inherit the same affordance where appropriate.
* Disabled controls do not misleadingly show an interactive pointer cursor.
* No unrelated non-interactive elements receive pointer cursor styling.
* Keyboard/focus/accessibility behavior remains unchanged.

## PUI-62 — Add optional dedicated sidebar theme tokens

- UUID: `927c2340-de0b-4384-a773-fd56d79cd793`
- URL: https://linear.app/emman-systems/issue/PUI-62/add-optional-dedicated-sidebar-theme-tokens
- Updated at capture: `2026-09-26T10:51:20.741Z`

### Verbatim description

Add first-class optional Sidebar theme tokens to Personal UI, while keeping the default sidebar behavior derived from the existing base semantic tokens.

Context:

* Personal UI currently does not store dedicated sidebar colors canonically in Theme v2.
* Earlier phases intentionally deferred sidebar tokens until an accepted Sidebar resource and real editor use case existed.
* The Workbench now has an accepted shadcn Sidebar and a clear UX need for optional sidebar-specific colors.

Owner direction:

1. Default sidebar should use base semantic tokens
   When dedicated sidebar tokens are not active, the sidebar should derive from existing base semantics rather than card colors.

Use this default aliasing model:

* sidebar background -> `background`
* sidebar foreground -> `foreground`
* sidebar primary -> `primary`
* sidebar primary foreground -> `primary-foreground`
* sidebar accent -> `accent`
* sidebar accent foreground -> `accent-foreground`
* sidebar border -> `border`
* sidebar ring -> `ring`

Important:

* The immediate visual correction is that the sidebar background should follow base `background`, not `card`.
* Do not introduce a sidebar-specific input token; inputs inside the sidebar should continue to use the normal `input` semantic token unless a future requirement proves otherwise.

2. Promote dedicated sidebar tokens into Theme v2
   Add canonical dedicated sidebar tokens for both light and dark modes:

* sidebar
* sidebar-foreground
* sidebar-primary
* sidebar-primary-foreground
* sidebar-accent
* sidebar-accent-foreground
* sidebar-border
* sidebar-ring

These should be stored as normal canonical theme colors and participate in:

* validation;
* persistence;
* export;
* import/compatibility reporting;
* theme diffs/proposals where appropriate;
* preview rendering;
* custom-theme save/load;
* relevant retrieval/context metadata.

Preserve canonical color normalization rules already used by Theme v2.

3. Add a persistent "Use sidebar tokens" mode
   Use an official shadcn `Switch` labeled:

`Use sidebar tokens`

This is a persistent mode, not a one-time sync/copy action.

Behavior:

* Switch OFF:
  * live sidebar uses the base semantic aliases listed above;
  * dedicated sidebar token fields remain visible and editable;
  * editing sidebar token values does not affect the live sidebar while the mode is off;
  * saved dedicated sidebar token values are preserved for later use.
* Switch ON:
  * live sidebar uses the dedicated sidebar token values;
  * changes to those token fields affect the live sidebar immediately.

Do not hide or disable the dedicated sidebar token controls based on switch state.

4. Keep sidebar token controls always visible
   Add a dedicated collapsible Sidebar color group in the Colors tab using the same shared color-control pattern as the rest of the Workbench.

Controls remain visible in both switch states.

Suggested visible token labels:

* Background
* Foreground
* Primary
* Primary foreground
* Accent
* Accent foreground
* Border
* Ring

Use existing shared color picker / value-input behavior.

5. State helper copy
   Keep the mode clear with concise helper/status text near the switch.

When OFF:

* `Sidebar tokens are currently not applied.`

When ON:

* `Sidebar tokens are active.`

The worker may refine wording slightly if needed, but the distinction must remain explicit.

6. First-enable behavior
   When a theme has no previously stored dedicated sidebar values and "Use sidebar tokens" is enabled for the first time:

* initialize the dedicated sidebar tokens from the current resolved base aliases;
* enabling the switch should therefore cause no sudden visual change at the moment of activation;
* subsequent sidebar-token edits become independent.

If canonical migration/import rules require a different deterministic initialization model, document it and preserve the no-surprise visual behavior.

7. Existing themes and migration

* Existing Theme v2 themes without sidebar tokens must continue to load safely.
* Add a deterministic migration/defaulting strategy for themes created before this feature.
* Existing custom themes must not lose values.
* Quiet Editorial and Default should remain visually stable when the switch is OFF.
* Dedicated sidebar tokens should only affect rendering when the mode is ON.

8. Design-system boundary

* Component semantics and theme-token quality remain separate concerns.
* The Sidebar component should consume the correct semantic source selected by this mode.
* Do not hard-code colors into Sidebar components.
* Do not create Workbench-only shadow state that duplicates canonical theme data.
* Keep the feature canonical, typed, persisted, deterministic, and reusable by downstream consumers.

UX placement:

* Colors tab -> dedicated Sidebar collapsible group.
* Place the `Use sidebar tokens` shadcn Switch prominently within that group, above or alongside the sidebar token fields.
* Keep token fields visible regardless of switch state.
* Avoid shadcn/tweakcn-style one-time "Sync" behavior; this feature is mode-based instead.

Scope:

* Theme v2 schema/model as required.
* Migration/defaulting.
* Color mutation support if required for the new token family.
* Workbench Colors tab.
* Sidebar rendering/token aliasing.
* Persistence/export/import/diff/proposal/context surfaces as required.
* Relevant tests, Storybook/Workbench fixtures, browser verification, and documentation.

Constraints:

* Do not add unrelated theme tokens.
* Do not add sidebar-input or sidebar-card tokens.
* Do not redesign the Sidebar shell.
* Do not alter unrelated base semantic token behavior.
* Preserve Design Command staging semantics and existing authority boundaries.
* Preserve light/dark support.
* Use official shadcn Switch and existing shared color controls rather than inventing new primitives.

Acceptance:

* Sidebar background uses base `background` rather than `card` when dedicated sidebar tokens are not active.
* Theme v2 supports the eight dedicated sidebar tokens for light/dark modes.
* Workbench Colors tab exposes a Sidebar group with all eight token controls.
* The controls remain visible and editable whether the mode is ON or OFF.
* An official shadcn Switch labeled `Use sidebar tokens` controls which source is active.
* OFF state uses the base semantic aliases and preserves stored sidebar-token values without applying them.
* ON state uses dedicated sidebar-token values immediately.
* First activation can initialize from resolved base aliases without a visual jump.
* Existing themes migrate/load deterministically without data loss.
* Persistence, export/import, preview rendering, theme selection, custom themes, and relevant proposal/diff behavior remain coherent.
* No hard-coded Sidebar colors are introduced.
* Existing keyboard/focus/accessibility behavior remains intact.
* Worker documents the final canonical schema/defaulting strategy and source-selection logic.
