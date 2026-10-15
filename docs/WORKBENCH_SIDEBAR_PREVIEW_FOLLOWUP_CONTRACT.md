# Workbench Sidebar Preview Follow-up v1 contract

Phase: `workbench-sidebar-preview-followup-v1-001`

Accepted product base: `90ea824027f71c8e9ef3e376d6c5c6263b56dee9`

Tickets: PUI-51, PUI-52, PUI-53, PUI-54, PUI-55.

## Scope

This is one bounded Workbench follow-up phase. It corrects sidebar category
navigation ownership and styling, adds the sidebar-header border, restores the
shared collapsible trigger's intended muted semantic pairing, ghosts the
preview view Select, tightens preview composition spacing, and establishes one
vertical shadcn ScrollArea inside the embedded PreviewFrame document.

The category navigation keeps official Tabs and the accepted ScrollArea. Its
ScrollArea owns the full sidebar width; a scrollable inner wrapper owns the
16px content alignment. Only category navigation scrolls horizontally. The
sidebar editor remains the existing vertical ScrollArea.

The visible preview scrollbar is owned by the embedded PreviewFrame document.
The iframe is not wrapped in an outer ScrollArea. PreviewFrame establishes one
vertical ScrollArea at its document root and suppresses competing document-root
overflow. The Workbench toolbar remains outside the iframe and fixed.

## Accessibility disposition

The shared collapsible trigger must use `bg-muted` with
`text-muted-foreground`. The current Default theme pairing is already known to
measure approximately 4.35:1 for this small text. This exact finding is
pre-approved, must be measured and reported truthfully, and is deferred
Default-theme product debt. It must not be hidden, suppressed, reclassified,
or locally worked around. Default-theme tokens are frozen in this phase. Zero
new serious or critical accessibility findings are allowed outside this exact
pairing, and receipts must state the exception rather than claim a universally
zero result.

## Acceptance criteria

- **WSPF-01 — Bounded delivery.** The diff is confined to PUI-51 through PUI-55, tests, and phase evidence; no unrelated redesign or abstraction is admitted.
- **WSPF-02 — Full-width category ScrollArea.** The category-navigation ScrollArea owns the full sidebar width. Its internal content keeps the 16px alignment, only the category row scrolls horizontally, and the sidebar itself does not gain horizontal scrolling.
- **WSPF-03 — Correct tab treatment.** TabsList is transparent and padding-free. Content-width, non-wrapping triggers use `px-3` and `cursor-pointer`; active tabs use secondary tokens with no shadow, while inactive tabs use muted foreground with text-only muted hover. Existing height, radius, vertical padding, focus, ARIA, and keyboard behavior remain.
- **WSPF-04 — Header divider.** SidebarHeader remains exactly 64px with existing alignment and gains only semantic `border-b`, with no shadow or padding change.
- **WSPF-05 — Semantic collapsible trigger.** Every shared ControlSection trigger uses `bg-muted text-muted-foreground ring-1 ring-border hover:bg-muted/80 rounded-sm px-2 py-0.5`, compact uppercase tracking, content width, and a `size-3` rotating chevron. No stronger local foreground workaround or Default-theme token change is present.
- **WSPF-06 — Honest contrast evidence.** The exact Default muted-pair contrast is measured and separately recorded as pre-approved deferred debt. No other new serious/critical accessibility finding is present.
- **WSPF-07 — Preview Select.** The existing official Select remains centered, state-preserving, responsive, and keyboard accessible; only Workbench/preview-scoped styling removes visible border/chrome while retaining semantic hover and focus affordances.
- **WSPF-08 — Preview spacing.** Preview composition spacing is `gap-4 p-4`; card structure, dimensions, padding, typography, content, and responsive grid remain otherwise unchanged.
- **WSPF-09 — Single preview scroll owner.** PreviewFrame owns exactly one vertical ScrollArea constrained to the iframe viewport. Competing document-root overflow is suppressed, the outer Workbench does not scroll the iframe, the toolbar stays fixed, and there is no double-scroll chain, reserved scrollbar width, layout shift, or scroll trap.
- **WSPF-10 — Input and responsive behavior.** Wheel, trackpad-equivalent pointer scrolling, keyboard scrolling, thumb drag, focus, mobile/off-canvas, light/dark, and reduced-motion behavior pass at 390x844 and 1440x900.
- **WSPF-11 — Regression.** Theme editing, persistence, save/export, staged proposal preview, Apply/Discard, stale handling, Design Command, iframe containment, and accepted sidebar behavior remain intact.
- **WSPF-12 — Frozen boundaries.** Registry remains exactly 19 resources and mutation operations remain 11. Theme v2 schema/tokens, persistence format, Jev behavior, credentials, network surfaces, dependencies, and lockfile remain unchanged.
- **WSPF-13 — Evidence and verification.** Lead-owned browser execution, full unit/typecheck/build regressions, phase boundary scan, diff checks, and a fresh exact-candidate protected offline/source/contract/evidence-integrity audit pass. No owner visual gate is required.

## Non-goals

No Default-theme color changes, broad contrast audit, new public resource,
public primitive redesign, schema/token/mutation/persistence expansion, preview
content redesign, Jev change, deployment, publishing, or runtime network use.
