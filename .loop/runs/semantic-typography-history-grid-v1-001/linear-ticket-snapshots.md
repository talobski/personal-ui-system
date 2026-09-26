# Frozen Linear ticket packet

Phase: `semantic-typography-history-grid-v1-001`

Frozen at admission on 2026-09-26 (Asia/Manila). These records are immutable
planning references. The reconciled phase contract is authoritative if any
conflict exists. Later Linear edits do not mutate this phase.

## PUI-3 — Manual editing history and recovery

Linear UUID: `4158e066-ff2a-4426-a776-21651ac85d39`

Status at admission: Todo. Priority: High. Labels: Polish, Feature.

URL: https://linear.app/emman-systems/issue/PUI-3/manual-editing-history-and-recovery

Description (verbatim):

> Add a safe history/recovery model for live theme editing.
>
> Problem / opportunity:
> Live editing is immediate, but repeated adjustments can create many revisions and there is no accepted undo/redo/reset behavior.
>
> Scope:
>
> * undo and redo for manual theme edits;
> * reset to a clearly defined saved or built-in baseline;
> * coalesce continuous slider drags into sensible history entries;
> * clarify dirty-state behavior;
> * define exact behavior across theme switches, fork/save, persistence, and staged Design Command proposals.
>
> Constraints:
>
> * preserve the existing live-edit lifecycle;
> * do not weaken staged Preview/Apply/Discard semantics;
> * avoid ambiguous reset targets;
> * keep interaction behavior deterministic where possible.
>
> Owner review is required for toolbar placement and reset semantics.

Comments: none. Attachments: none. Documents: none. Relations: none.

## PUI-63 — Adopt semantic heading and body typography roles

Linear UUID: `32f2ec1b-d525-47ef-9e91-f7fb9f4a6164`

Status at admission: Todo. Priority: High. Labels: Polish, Feature, Improvement.

URL: https://linear.app/emman-systems/issue/PUI-63/adopt-semantic-heading-and-body-typography-roles

Description (verbatim):

> Restructure Personal UI typography around semantic roles instead of separate global Sans / Serif / Mono family slots.
>
> Owner direction:
>
> * Replace the current typography-editing model with two primary semantic roles:
>   * Heading
>   * Body
> * Each role exposes:
>   * Font family
>   * Weight
>   * Tracking
> * The current standalone Letter spacing / Tracking group is removed because tracking becomes part of each semantic role.
> * Font size and line-height remain component-owned for now and are not added to this phase.
>
> Why:
>
> * The current Sans / Serif / Mono model is too low-level and does not meaningfully affect the preview when most compositions use only sans.
> * The semantic model should let a user define the visual character of headings and body text directly.
> * The system should remain useful to agent-generated interfaces by expressing intent such as "heading typography" and "body typography" rather than leaving unrelated font stacks available without usage rules.
>
> 1. Typography UI model
>
> Replace the current typography groups with:
>
> Heading
>
> * Font
> * Weight
> * Tracking
>
> Body
>
> * Font
> * Weight
> * Tracking
>
> Use the same font-family picker for both roles so users can freely choose any supported family from the catalog.
>
> Do not constrain Heading to serif or Body to sans.
>
> Preferred visible labels:
>
> * Heading
>   * Font
>   * Weight
>   * Tracking
> * Body
>   * Font
>   * Weight
>   * Tracking
>
> Use "Body" rather than "Paragraphs" so the role can cover normal interface/content text beyond paragraph elements.
>
> 2. Semantic role behavior
>
> Heading typography should apply to semantic heading/title surfaces across preview compositions where appropriate.
>
> Body typography should apply to normal interface/content text such as:
>
> * paragraph/body copy;
> * labels;
> * helper/descriptive text;
> * navigation;
> * buttons;
> * form values;
> * equivalent non-heading UI text.
>
> Do not force code/preformatted content into Body if the existing mono/code behavior is more appropriate.
>
> A separate Code semantic role is explicitly deferred unless a later product need justifies it.
>
> 3. Workbench shell adoption
>
> The Workbench UI itself should consume the Body semantic typography role by default.
>
> Preferred implementation:
>
> * apply the Body role at an appropriate Workbench root/shell level so ordinary UI text inherits it consistently;
> * avoid manually adding `type-body` to every leaf component if root inheritance can express the rule cleanly;
> * semantic headings/titles inside the Workbench should opt into the Heading role;
> * code/preformatted/mono-specific content may retain mono treatment where appropriate.
>
> This means changing Body typography in the Workbench should update the Workbench chrome itself, including normal controls and interface copy, while heading surfaces continue to use the Heading role.
>
> Do not use this as permission to override component-specific font sizing, semantic colors, or accessibility behavior.
>
> 4. Internal/export naming
>
> Use "type" for composed semantic typography roles and reserve "font" terminology for font-family primitives.
>
> Preferred exported/internal naming:
>
> Primitive variables:
>
> * `--font-heading`
> * `--font-body`
> * `--font-weight-heading`
> * `--font-weight-body`
> * `--tracking-heading`
> * `--tracking-body`
>
> Optional/internal mono fallback may remain available as a font primitive, e.g. `--font-mono`, for code-oriented content.
>
> Composed semantic utilities:
>
> * `type-heading`
> * `type-body`
>
> Intended conceptual namespace:
>
> * `font-*` = font-family / weight primitives
> * `type-*` = composed semantic typography roles
> * `text-*` = Tailwind size/color conventions
>
> Avoid introducing a `text-heading` / `text-body` namespace because Tailwind already overloads `text-*` for size and color.
>
> 5. Export behavior
>
> The exported theme CSS should provide semantic typography variables and utilities so downstream apps can consume roles directly.
>
> Example intent:
>
> `@utility type-heading`
>
> * font-family: var(--font-heading)
> * font-weight: var(--font-weight-heading)
> * letter-spacing: var(--tracking-heading)
>
> `@utility type-body`
>
> * font-family: var(--font-body)
> * font-weight: var(--font-weight-body)
> * letter-spacing: var(--tracking-body)
>
> Component-level size remains separate, e.g.:
>
> * heading component: `type-heading text-2xl`
> * paragraph/helper: `type-body text-sm`
>
> The exact exporter syntax should be audited against the project's current Tailwind 4/shadcn export architecture, but the semantic separation above is normative.
>
> 6. Canonical theme model
>
> Evolve the canonical typography model so Heading and Body roles are first-class, typed, persisted theme data.
>
> The worker/Lead should assess the cleanest schema evolution from the current Theme v2/v2.1 model.
>
> Requirements:
>
> * deterministic migration from existing themes;
> * preserve existing saved themes without data loss;
> * preserve the existing font catalog/stacks internally;
> * do not keep a parallel canonical "sans/serif/mono + heading/body" system unless required for migration compatibility;
> * if legacy sans/serif/mono fields must remain readable, normalize them deterministically into the new semantic roles.
>
> Suggested migration behavior for legacy themes:
>
> * Heading family defaults from the existing primary/sans family unless an approved better deterministic rule exists;
> * Body family defaults from existing sans family;
> * existing global tracking should map deterministically into both Heading and Body tracking initially;
> * weight defaults should be chosen deterministically and documented.
>
> The Lead should propose the exact migration values rather than guessing silently.
>
> 7. Preview/component adoption
>
> Update representative preview compositions so semantic Heading and Body roles are actually visible and useful.
>
> Examples:
>
> * card titles / section headings -> Heading role
> * paragraph/helper/body copy -> Body role
> * labels/buttons/form text -> Body role unless a more specific existing component contract should prevail
> * code/mono content can retain dedicated mono behavior
>
> Do not globally override every component blindly. Apply roles through shared composition/component conventions where appropriate.
>
> 8. Design-system boundaries
>
> * Font size and line-height scales are not part of this ticket.
> * No separate Code role yet.
> * No unrelated typography scale expansion.
> * No arbitrary component-specific typography tokens.
> * Preserve semantic color roles independently from typography roles.
> * Keep the system compatible with shadcn/Tailwind conventions while making Personal UI more semantic and agent-usable.
>
> Scope:
>
> * Canonical theme typography schema/model and migration as required.
> * Typography mutations/operations as required.
> * Renderer/exporter.
> * Workbench Typography tab.
> * Workbench root/shell typography inheritance.
> * Preview/composition typography role adoption.
> * Persistence/import/export/diff/proposal/context surfaces as required.
> * Tests, browser verification, and documentation.
>
> Acceptance:
>
> * Workbench Typography UI presents Heading and Body as the primary typography roles.
> * Each role exposes Font, Weight, and Tracking.
> * Standalone Font Families and Letter Spacing groups are removed/replaced by the new model.
> * Heading and Body can each select any supported font family.
> * Heading and Body weight are independently editable.
> * Heading and Body tracking are independently editable.
> * Font size and line-height remain component-owned and unchanged by this feature.
> * Workbench chrome/default UI typography consumes the Body semantic role at an appropriate shared root/shell level.
> * Semantic Workbench headings/titles consume the Heading role where appropriate.
> * Semantic preview surfaces visibly consume Heading and Body roles.
> * Canonical theme data persists the semantic roles deterministically.
> * Existing themes migrate/load without data loss.
> * Exported CSS exposes semantic heading/body typography variables and composed `type-heading` / `type-body` behavior or the exact current-stack equivalent.
> * `font-*`, `type-*`, and `text-*` namespaces remain conceptually distinct as described.
> * Existing Design Command staging, persistence, export, import, theme selection, custom themes, keyboard behavior, and accessibility remain coherent.
> * Worker documents the final schema migration, default weights, legacy mapping, Workbench inheritance strategy, and exporter contract.

Comments: none. Attachments: none. Documents: none. Relations: none.

## PUI-64 — Adopt responsive mixed-span composition grid

Linear UUID: `611f6f6a-dfbd-49ed-9b95-e16f1cc78ee4`

Status at admission: Todo. Priority: High. Labels: Polish, Feature, Improvement.

URL: https://linear.app/emman-systems/issue/PUI-64/adopt-responsive-mixed-span-composition-grid

Description (verbatim):

> Restructure the Workbench preview composition layout into a responsive mixed-span grid that supports both standard and horizontally wide compositions while keeping composition height flexible and content-driven.
>
> Owner direction:
>
> * Wide desktop preview uses a 3-column base grid.
> * Standard/default compositions occupy 1 column.
> * Wide compositions occupy 2 columns when space allows.
> * Composition height must remain flexible; cards must not be forced into square or equal-height cells.
> * Responsive behavior should collapse cleanly to fewer columns without horizontal overflow.
>
> Why:
>
> * The current preview layout limits compositions to relatively uniform card shapes.
> * Some compositions, especially charts, tables, dashboards, metrics, and horizontally structured forms, benefit from a wider rectangular footprint.
> * Some compositions also need more vertical room than others.
> * The preview should feel like a realistic application/composition canvas rather than a uniform card gallery.
>
> 1. Desktop / wide grid model
>
> Use a 3-column base grid on wide desktop.
>
> Normative layout grammar:
>
> ```
> ┌──────────┬──────────┬──────────┐
> │ default  │ default  │ default  │
> ├──────────┼─────────────────────┤
> │ default  │        wide         │
> ├──────────┼─────────────────────┤
> │ default  │        wide         │
> └──────────┴─────────────────────┘
> ```
>
> Where:
>
> * default = 1-column span
> * wide = 2-column span
>
> Do not use a 4-column desktop base for this feature.
>
> 2. Composition width contract
>
> Introduce a small semantic composition footprint contract rather than arbitrary per-card pixel widths.
>
> Preferred model:
>
> ```ts
> type PreviewLayout = "default" | "wide";
> ```
>
> Semantics:
>
> * `default` -> span 1 grid column
> * `wide` -> span 2 grid columns when supported by the current responsive layout
>
> The exact internal name may differ if the existing registry/composition architecture has a stronger convention, but the semantic contract should remain constrained to these two states for this phase.
>
> Do not introduce arbitrary `colSpan`, freeform grid coordinates, or a large matrix of size variants unless required by an existing architectural constraint.
>
> 3. Flexible height
>
> Width span and height are separate concerns.
>
> A default composition occupying one column must not be interpreted as a literal square.
>
> Requirements:
>
> * no forced `aspect-ratio: 1 / 1`;
> * no global equal-height requirement across a row;
> * composition/card height should be natural/content-driven;
> * compositions may be vertically short or tall as their content requires;
> * preserve sensible minimum sizing where necessary for usability, but do not normalize every composition to the same height.
>
> Example intent:
>
> ```
> ┌──────────┬──────────┬──────────┐
> │ default  │ default  │ default  │
> ├──────────┼─────────────────────┤
> │          │                     │
> │ tall     │        wide         │
> │ default  │                     │
> │          │                     │
> └──────────┴─────────────────────┘
> ```
>
> Do not add a `tall` token/variant in this phase unless implementation evidence shows it is actually required. Height should remain content-driven by default.
>
> 4. Responsive behavior
>
> Expected behavior:
>
> Wide desktop:
>
> * 3 equal base columns
> * default -> span 1
> * wide -> span 2
>
> Medium:
>
> * 2 columns
> * default -> span 1
> * wide -> span 2 when room allows
>
> Small/mobile:
>
> * 1 column
> * both default and wide -> span 1
>
> Wide is a preferred footprint, not a guarantee at narrow widths.
>
> The grid must avoid horizontal scrolling caused by preview card spans.
>
> 5. Layout engine
>
> Prefer a structured CSS Grid implementation.
>
> Conceptual direction:
>
> ```css
> .preview-grid {
>   display: grid;
>   grid-template-columns: repeat(3, minmax(0, 1fr));
> }
>
> .preview-card[data-layout="wide"] {
>   grid-column: span 2;
> }
> ```
>
> The exact implementation must fit the existing Workbench architecture and Tailwind conventions.
>
> Do not implement Pinterest-style masonry.
>
> The Lead/worker should audit whether `grid-auto-flow: dense` is appropriate. It may be used only if it does not create problematic visual/DOM reading-order divergence, keyboard-order confusion, or accessibility issues. Preserving understandable source order is more important than aggressively filling every visual gap.
>
> 6. Composition ownership
>
> The width footprint belongs to the composition, not to the underlying component/resource.
>
> Examples:
>
> * Chart as a resource is not inherently wide.
> * An "Exercise Minutes" composition using Chart may declare itself wide.
> * A compact stat composition using the same underlying primitives may remain default.
>
> Keep the distinction:
>
> * component/resource
> * composition
> * composition preview footprint
>
> 7. Initial adoption
>
> Update representative existing preview compositions so the mixed-span system is visibly exercised.
>
> Good candidates include:
>
> * charts;
> * tables;
> * horizontally structured forms;
> * dashboards / metric groups;
> * other compositions that materially benefit from horizontal space.
>
> Do not make every large-looking composition wide by default. Choose wide only when the composition benefits from the footprint.
>
> 8. Boundaries
>
> * No full masonry engine.
> * No arbitrary drag-and-drop grid placement.
> * No user-facing grid editor.
> * No arbitrary per-card pixel widths.
> * No forced uniform aspect ratio.
> * No new vertical size taxonomy unless a concrete implementation need emerges.
> * Do not change component semantics merely to fit the grid.
> * Preserve responsive behavior, keyboard navigation, focus order, and accessibility.
>
> Scope:
>
> * Workbench preview grid/layout container.
> * Composition metadata/registry footprint as required.
> * Representative preview composition adoption.
> * Responsive styles/breakpoints.
> * Tests and browser verification.
> * Documentation of the final composition footprint contract.
>
> Acceptance:
>
> * Wide desktop preview uses a 3-column base grid.
> * Default compositions occupy 1 column.
> * Wide compositions occupy 2 columns when space allows.
> * Medium layout collapses coherently to 2 columns.
> * Small/mobile layout collapses to 1 column.
> * Wide compositions gracefully become 1-column when required.
> * Cards are not forced into square/equal-height layouts.
> * Composition height is content-driven and can be vertically tall.
> * Representative charts/tables/forms or equivalent compositions demonstrate the wide footprint.
> * Underlying component/resource definitions are not globally made wide; footprint remains composition-level.
> * No horizontal overflow is introduced by the grid.
> * DOM/read/focus order remains coherent.
> * Existing Workbench preview interactions and accessibility continue to pass.
> * Worker documents the final responsive breakpoints, span implementation, and whether dense packing was used or intentionally avoided.

Comments: none. Attachments: none. Documents: none. Relations: none.

## Owner decisions approved at admission

The following admission decisions reconcile PUI-3's explicit owner-review
boundary and are authoritative:

1. Undo / Redo
   - Use compact icon buttons in the preview toolbar.
   - Place them immediately before Export and Save.
2. Reset
   - Place Reset in the same recovery group.
   - Use the existing responsive confirmation pattern.
3. Reset semantics
   - Reset targets the active theme's durable baseline.
   - Built-in themes reset to their immutable canonical built-in fixture.
   - Custom themes reset to their last saved snapshot.
   - Reset itself is undoable.
4. History boundaries
   - Keep separate session-local history per theme.
   - Switching themes preserves each theme's in-memory history.
   - Saving a custom theme re-baselines the durable snapshot without clearing session history.
   - Undo after Save is allowed and should make the theme dirty again.
   - Save As creates/selects a clean custom-theme history track.
   - Design Command Apply becomes one atomic undoable history checkpoint.
   - Preview/Discard do not create active history.
   - Reload clears session history.
