# Quiet workspace — owner review

One proposed direction for `workbench-visual-direction-v1-001`, based only on accepted commit `13981eb7cebea50e16db6d3337d2060091a02672` and the two supplied images. This is an unaccepted design study, not an implementation or project-completion claim.

Open [review.html](review.html) locally, or inspect [desktop.svg](desktop.svg), [mobile.svg](mobile.svg), and the complete [gallery.svg](gallery.svg) directly. The mobile board contains three separate 390×844 views; enlarge it to native size to judge text. All controls are inert drawings. No server, network, fonts download, or build is needed. The HTML only presents the SVGs and review notes.

## VISUAL_READINESS: PASS

Both images were genuinely visible before substantive work. Approximate pixel observations:

- Desktop, 2048×1189: the editor divider sits around x=412 (20% of width), starting below the y≈77 product header. A second horizontal boundary at y≈144 separates preset/actions from editor/gallery navigation. Gallery cards begin around y=220, aligned with the search field rather than the editor tabs. The first two cards are about 420px wide; the calendar is narrower at about 297px. A wide exercise chart spans the two right-hand tracks, beginning below the calendar/goal pair. Color rows put a square swatch before the label, then a dark monospace value field and a separate compact trailing action. PRIMARY and SECONDARY are open; the remaining group labels are tightly stacked rounded chips.
- Mobile, 990×2022: the Controls/Preview band spans y≈146–228, above a tall preset row ending near y=357. “Other” is a filled pill within a separate four-tab strip. Ten paired light/dark swatches span one line around y=556. Adjustment labels begin near x=40, tracks near x=184, numeric boxes near x=800, and units sit outside those boxes. The radius value is visibly cramped, unlike the short HSL values. Collapsed Spacing and Shadow chips end around y=1162, leaving roughly 800px of mostly empty space. There is no miniature side-by-side preview.

These are visual readings, not automated pixel measurements. No reference site, shadcn/create, or abandoned candidate was browsed or inspected.

## Validation and challenge

Carry forward the application's edge-to-edge structure, persistent editing context, distinct editor/preview regions, and varied card heights. The strongest transferable pattern is the hierarchy: identity → theme/actions → editor or preview navigation → content. The reference's small dividers and tone differences do more organizational work than oversized headings.

Do not transfer its account/social/export chrome, duplicate navigation categories, monetization, calendar interaction, HSL sliders, or collapsible color taxonomy. Those imply capabilities this system does not have. Dense swatch/value rows are useful for browsing many tokens, but this Workbench edits one selected token through validation; an explicit labeled select and full-width value preserve that behavior and avoid cramped values. A decorative six-swatch strip offers palette context without becoming a second token picker.

The direction uses the accepted Quiet Editorial light palette. The dark reference supplies layout principles, not replacement token values. Quiet Studio is an illustrative fork at revision 3 with one unsaved radius change, not a new theme file. Gallery content is fictional local demonstration content.

Missed principles worth retaining: unsaved is different from staged; a staged preview is different from the active theme; a gallery needs a stable reading order; theme editing must not hide validation; palette changes can also affect the editor's legibility; fixed iframe width differs from available workspace width. Resizing cannot silently change theme tokens or pretend the accepted frame is fluid.

## Information architecture and sizing

| Region | Contents and behavior |
|---|---|
| Product header | 56px high, identity and GitHub link only. Link destination must come from the repository's established URL; none was established during this read, so the drawing is not a fabricated link. |
| Theme context | Active-theme NativeSelect, revision, saved/unsaved status. Fork opens a short ResponsiveDialog form with the existing id/name fields and validation. |
| Editor | Colors: all existing COLOR_TOKENS in NativeSelect, selected mode, value, Apply edit, error. Typography: existing first sans family value and Apply setting. Other: select radius/density/shadow/motion, one value and Apply setting. Command: full heading “Design command,” existing input, Evaluate, pending/outcome/evidence, proposal JSON and history. |
| Preview toolbar | Light/Dark, 390/1024 width, Proposal JSON, Export JSON, Save theme. Proposal JSON focuses the existing proposal section in Command; it is not a file importer. On mobile this also selects Controls. |
| Preview views | Cards (new demonstration composition) and States (accepted pilot preview intact). Proposed initial Cards view is a presentation choice for owner review; retain the current 390 width default in implementation. Desktop drawing intentionally shows the user-selected 1024 state. |
| Baseline | Compact changed-token summary below editor. “View baseline diff” reveals/focuses the full existing diff section in the editor flow, not a modal containing an arbitrarily long list. |
| Candidate | Persistent staged summary before preview, full provenance/base/operations/diff and Apply/Discard. Mobile may show compact summary with the detailed review in the same scroll flow; no sticky footer may conceal errors. |

Desktop at ≥1024px: viewport-filling shell; 352px minimum/default editor, maximum `min(480px, viewportWidth - 640px)`. At 1600px the editor is 22% of the shell. A visible divider offers an 8px hit region; the drawing's narrow grip is decorative. Clamp a restored width after resize. Keyboard separator semantics and Arrow/Home/End behavior need a reviewed reusable primitive, not custom pointer code in Workbench. Do not persist panel width into theme state.

The header stays fixed. Editor and preview have independent vertical scroll regions; retain the native focusable horizontal preview scroller. Toolbar wraps at intermediate widths. Retain exact 390/1024 iframe widths and accepted 720px frame height unless a separately approved implementation change establishes a new height contract. The desktop SVG shows an expanded viewport *direction* (779px visible gallery area); it does not claim that change already exists. At 1024–1439px a 1024 frame requires horizontal scrolling. No CSS transform should shrink text to disguise it.

Below 1024px: Controls and Preview replace the split layout. Preserve input drafts, outcomes, iframe state, mode, and scroll positions across mode changes; use accepted Tabs, keeping the inactive iframe mounted as needed. The 390px study has 16px horizontal padding. Below 360px replace the four editor-category tabs with a labeled NativeSelect; this is an explicit composition-level responsive choice, not behavior built into Tabs. Keep the two outer mode tabs. At 320px the 390px iframe remains horizontally scrollable; shell controls themselves must fit. Inputs/selects/textarea retain ≥16px text below md. Drawer replacement stays at its independent, accepted ≤640px breakpoint.

## Action/functionality reconciliation

Evidence: `apps/workbench/src/App.tsx`, `PreviewFrame.tsx`, `settings.ts`, `lifecycle.ts`, and public UI sources at the accepted base.

| Action | Accepted behavior | Proposed placement / preservation |
|---|---|---|
| Light/Dark | `setMode`, document class, preview state; allowed while locked | One SingleToggleGroup in preview toolbar. Colors explicitly names edited mode. Mobile users switch to Preview to change mode. |
| Mobile/Desktop width | WIDTHS = 390 / 1024; initial mobile | One SingleToggleGroup; labels expose exact px in accessible names. No Fit action. |
| Undo / Redo | No implementation/history navigation | Omit entirely. Proposal records are not undo history. |
| Reset | No reset handler | Omit. Loading canonical remains an explicit selection; do not relabel Discard proposal as Reset. |
| Import | No theme import | Do not label any action Import. “Proposal JSON” locates the existing paste/stage flow. |
| Save theme | Local persistence; canonical id rejected, fork first; storage errors reported | Toolbar primary action, original handler and notices. Disabled while staged/evaluating. Do not silently auto-fork or imply file save/cloud sync. |
| Export JSON | Blob download of current theme | Outline action beside Save; preserve download, lock and filename semantics. |
| Select/load theme | Canonical + saved + unsaved-fork placeholder | Theme context select; preserve exact load behavior and locked state. |
| Fork theme | Validated id and name; not saved yet | Editor footer trigger → accepted ResponsiveDialog/Drawer; same handler/errors, no auto-save. |
| Apply edit/setting | Explicit commit through mutation validation | Per-tab primary action; retain rejected draft and associated error, never live-apply typing. Only the five accepted non-color targets. |
| Evaluate | Existing localhost Design Command path and typed outcomes | Command tab; same pending guard, text, outcome and typed evidence. No evaluation was invoked for this study. |
| Stage / Insert example | Parse one proposal, 1–8 operations; example generation | Command's proposal section with Textarea. Preserve example insertion and proposal text editing availability even when Stage is locked, as in accepted App. |
| Apply / Discard | Proposal session transition; stale detection | Persistent candidate review; separate from Save; show source, sourceId, createdAt, intent, base id/revision, operation count, candidate revision, full before/after diff, result and history. |
| Baseline diff | Canonical vs current active theme | Editor summary + full list. Staged diff stays separate and is explicitly labeled candidate. |
| Existing preview | Button variants, sizes, activation output; Input states; elevation; responsive dialog | Retain all in States, same behavior and selectors. Cards supplements rather than replaces these fixtures. |
| GitHub | Owner-requested navigation, no established href inspected | Native anchor / Button asChild link after target confirmed from accepted repo configuration. No API integration. |

Global invariant: `locked = staged !== null || commandEvaluating`. Preserve every original disabled condition, not just visual dimming. Mode/width remain usable. Pending, rejected, unsupported, clarification-required, staged, stale, discarded, applied-but-unsaved, reserved-id, and persistence failures stay distinguishable. Mobile must surface pending/candidate status in both modes, with a route to review; the third drawing shows the expanded candidate state.

## Eight-card inventory

The complete visual is [gallery.svg](gallery.svg). Three stable column stacks produce the staggered rhythm; each stack preserves DOM order. At the 390px frame use one column ordered 1–8. At 1024px use three columns (320px cards, 24px column gaps; 16px stack gaps), with no dense grid packing or CSS `order` that makes keyboard focus jump unpredictably.

| # | Composition | Main system exposure | Demonstration interaction contract for later implementation |
|---|---|---|---|
| 1 | A productive week, 240px | Card, display type, chart-2/3, semantic figure | Static seven-bar figure with text equivalent; no chart tooltip dependency. |
| 2 | Account profile, 368px | Card, Field, Input, Button | Local draft + explicit Save profile, local status; no account service. |
| 3 | Team access, 244px | Card, semantic list, Button, ResponsiveDialog | Manage access opens a titled/described sample dialog/drawer; use NativeSelect for a role, not a custom menu. |
| 4 | Workspace settings, 340px | Card, Field, Input, NativeSelect, Button | Local draft + explicit Save workspace. |
| 5 | Notifications, 280px | Card, horizontal Field, Switch, Button | Both switches update pending local state; Save preferences commits both together. |
| 6 | Support request, 320px | Card, Field, NativeSelect, Textarea, Button | Local validation and simulated success only, clearly identified as a preview; never send a message. |
| 7 | Recent activity, 280px | Card, list, foreground/muted hierarchy | Static dated list; decorative markers are not controls. |
| 8 | Room to think, 356px | Card, typography, readable prose, inset surface | Static reading composition. Keep existing shadow-md elevation sample in States so editable blur remains observable. |

All eight belong to one fictional personal workspace; no mismatched payment, health, and auth services. Cards have one title and at most one CardAction; action groups have one primary Button. SVG card contents are review illustrations, not promises that these demo handlers are already implemented.

## Accepted component mapping

Public import prefix: `@personal-ui/ui/components/`. Implementations: `packages/ui/src/components/`; contracts: `packages/core/src/contracts/data/`. Study drawings approximate these surfaces; later implementation must instantiate the imports, never copy SVG shapes into interactive controls.

| Entry point | Use and interface constraints |
|---|---|
| `button` → Button | Apply, save, fork, export, stage, discard and gallery actions. `variant` default/outline/secondary/ghost/link, `size` default/sm as appropriate; native disabled; one primary per action group. GitHub uses `asChild` with anchor. |
| `card` → Card/Header/Title/Description/Content/Footer/Action | Eight coherent gallery surfaces and focused review block; shell uses semantic layout, not nested Cards. CardTitle contains a real heading. One optional header action. |
| `field` → Field/Label/Content/Description/Error/Group | All editable controls. `orientation="horizontal"` for switches, vertical for editor values. Exactly one accepted control per Field; id/htmlFor and aria-describedby for errors. |
| `input` → Input | Token value, font/setting value, fork id/name, profile/workspace. Native props, `aria-invalid`, associated errors; preserve drafts. Input does not provide color-picker semantics. |
| `native-select` → NativeSelect/Option | Active theme, token, Other target, gallery choices, narrow category replacement. Text-only options, unique stable values. Default size on mobile; wrapper is w-fit, so check composition width instead of assuming select class stretches its wrapper. |
| `responsive-dialog` → ResponsiveDialog* | Fork and gallery access form; Header/Title/Description/Content/Footer/Close. Root controlled via `open/onOpenChange` if needed. Trigger/Close `asChild`. Built-in Drawer at ≤640px; never import Dialog/Drawer to recreate switching. |
| `single-toggle-group` → SingleToggleGroup | Mode and frame width. Required `label`, `value`, `onValueChange`, `options`; exactly one selected. Public wrapper has no className/size prop: position using a layout wrapper; do not invent those props. Depiction must use outlined group treatment, not Tabs treatment. |
| `switch` → Switch | Gallery notification booleans with `checked/onCheckedChange`; visible associated labels, one consistent explicit-save model. Not the global color-mode chooser. |
| `tabs` → Tabs/List/Trigger/Content | Editor categories; Cards/States; mobile Controls/Preview. Stable matching values, one active enabled tab; Radix keyboard behavior. Short labels, no wrap/overflow assumed. Retain inactive state intentionally. |
| `textarea` → Textarea | Command, proposal JSON, support message. Replace existing raw textarea presentation only in a later implementation while retaining behavior. Native rows/value/onChange, ≥16px mobile, associated errors. |

Ordinary HTML supplies header/aside/main/sections, headings, figures, lists, paragraphs, output/status, and existing native details/summary for typed evidence. Decorative initials and chart bars need no Avatar or Chart interactive primitive.

## Semantic token mapping

Authority: `packages/core/src/theme/fixtures/valid.json`, generated `quiet-editorial.css`, `theme/render.ts`, and `packages/ui/src/styles/globals.css`. The SVG generator converts the accepted light OKLCH colors to sRGB for portable SVG viewing. It does not create new theme data. Both production modes must consume their respective accepted variables.

| Tokens / utilities | Consumers |
|---|---|
| `--background`, `--foreground` | Workspace, base text, outlined actions. |
| `--card`, `--card-foreground` | Gallery/editor surfaces and their text. |
| `--popover`, `--popover-foreground` | Dialog/drawer floating surfaces as supplied by primitives; not a newly invented popover. |
| `--primary`, `--primary-foreground` | Primary buttons, selected switches, activity markers. |
| `--secondary`, `--secondary-foreground` | Candidate summary and decorative initials. |
| `--muted`, `--muted-foreground` | Tabs rail, descriptions, timestamps and inset quote. |
| `--accent`, `--accent-foreground` | Existing component hover/selected states; decorative palette swatch. |
| `--destructive` | Rejected input/proposal errors and accepted destructive Button in States. Never repurpose as arbitrary accent. |
| `--border`, `--input`, `--ring` | Dividers/Card borders, field strokes and all keyboard focus states. Focus uses accepted border-ring + 3px ring/50. |
| `--chart-2`, `--chart-3` | Weekly figure emphasis/ordinary bars. Chart-1/4/5 remain editable via color token select; no need to force all five into the gallery. |
| `--font-family-sans`, `--font-family-mono` | UI and prose / token values, JSON and diffs. Local fallback permitted; no font fetch. 12/14/16/18/24/36px roles use Tailwind's accepted type scale; exact display drawing is approximate. There are no mutable font-size tokens. |
| `--space-base`, `--density` → `--spacing` | Layout gaps and padding using existing scale: 4/8/12/16/24px at density 1. Frame widths, panel bounds and hit targets are layout constraints, not new tokens. |
| `--radius-scale-sm/md/lg`, `--radius` | Existing rounded-sm/md/lg; Button/Input md track the fork's md value. Card's accepted rounded-xl is the existing Tailwind utility, not a newly mutable xl token. |
| `--shadow-layers-sm/md/lg` | Existing component shadows; specifically preserve shadow-md sample in States. SVG uses a subtle sm-like depiction, not proof of CSS equivalence. Input's existing shadow-xs remains a foundation utility rather than a fabricated theme token. |
| `--motion-duration-fast/base` | Existing transitions; reduced-motion CSS makes durations zero. Static artifacts have no motion. Do not add a new motion toggle: only durationBase is editable. |

The schema does not expose arbitrary typography scales, HSL transforms, every shadow parameter, or every radius as mutations. Settings stay restricted to radius.md, density, first sans family, first shadow.md layer blur, and durationBase. The fork's illustrative md value is 0.75rem; production components must resolve it rather than use literal drawing radii.

## Missing primitives and handoff risks

**Required gap: accessible resizable panels/separator.** No accepted public entry point exists. Obtain a separately scoped reusable primitive with keyboard and pointer/touch behavior, min/max constraints, focus treatment, and teardown before enabling dragging. The static divider does not implement it. Until admitted, a fixed 352px panel is an honest temporary implementation but does not satisfy the owner's resizing intent.

No slider/color picker, menu, tooltip, or collapsible-group primitive is required for this direction: labeled Inputs/NativeSelect handle editing, text buttons identify actions, and flat tabs remove the need for collapsible token groups. Do not add them solely to resemble tweakcn. Native details already covers typed evidence. New undo/redo/reset/import capabilities are behavior gaps, not missing visual primitives.

Implementation risks: iframe height adjustment needs explicit acceptance; nested scroll focus must stay predictable; parent mode tabs must not reset the iframe or lose proposal/draft state; arbitrary theme edits may reduce editor contrast; long token values/ids/diffs need wrapping without clipped error text; staged proposals may contain up to eight operations, so the compact two-operation illustration is not a height limit. Avoid saving the staged candidate through the active-theme save handler. Avoid duplicate toolbar instances remaining keyboard-focusable in hidden mobile content. Confirm real GitHub destination before adding navigation.

Recommended later acceptance: owner approves the hierarchy and light direction first. Implementation verification should cover 320/390/768/1024/1440/1600 widths, both modes, minimum/default/maximum panel widths, keyboard resizing, 200% zoom and reduced motion. Exercise every reconciliation-table action, pending and staged locks, invalid values, canonical save refusal, fork/save/reload/export, stale proposal and full diff. Confirm all ten component contracts and original States behaviors remain intact; no production API or mutation changes. Use a real renderer and accessibility checks in that later authorized phase. No such runtime verification is claimed here.

## Owner review sequence

1. Desktop: assess editor/preview balance, quiet header, toolbar clarity and gallery cohesion.
2. Mobile: inspect Controls, Preview and candidate review at 1:1. Confirm whether moving mode/save actions to Preview is acceptable.
3. Gallery: inspect all eight complete compositions, especially the amount of form content versus static reading/activity content.
4. Handoff: accept or refine the 352–480px bounds, Cards/States split, omitted unsupported actions, and the required resizable primitive. Any approval is for this direction only, not reusable rule promotion or product completion.

One bounded refinement may follow in the same session. Stopped for owner review.
