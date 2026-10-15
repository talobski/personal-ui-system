# Workbench Control Navigation Scroll v1

Phase: `workbench-control-navigation-scroll-v1-001`

Accepted product base: `b70c6df8b5286eb0f1141bf92066d8d93b763f4e`

Tickets: PUI-44, PUI-45, PUI-46, PUI-47, PUI-48, PUI-49, PUI-50.

## Scope

- Promote one official Radix-backed shadcn ScrollArea resource. Registry count becomes exactly 19.
- Standardize applicable Workbench Input, numeric/color Input, Select, Combobox, Textarea, and equivalent editable-control typography without flattening semantic state colors or changing public primitive defaults.
- Use one shared numeric-row grid: `6rem minmax(0, 1fr) max-content`; fixed columns use explicit rem geometry independent of the editable theme spacing token.
- Apply explicit `size-3.5` only to applicable Workbench text+icon actions. Under Default spacing `0.25rem` this computes to 14px; other spacing bases scale naturally.
- Keep shadcn Tabs for sidebar category navigation, with content-width non-wrapping triggers and horizontal ScrollArea overflow.
- Replace preview Cards/States Tabs with the accepted shadcn Select while preserving view state and content.
- Change shared control-section triggers to `rounded-sm` with a `size-3` chevron while preserving behavior and accepted styling.
- Migrate appropriate persistent Workbench-owned scroll regions to ScrollArea, remove redundant native-scrollbar CSS, and document intentionally native regions.

## Scroll ownership

ScrollArea is the standard for persistent Workbench-owned app regions: the sidebar editor, sidebar category navigation, and appropriate right-panel status/proposal overflow below the fixed toolbar. The embedded preview document, browser/document scrolling, Select and Combobox listboxes, one-dimensional code overflow, and dialogs/drawers/sheets without an independent persistent scroll region stay native. The implementation must avoid double scrolling, scroll traps, reserved scrollbar width, and layout shift while preserving wheel, trackpad, keyboard, pointer, touch, focus, mobile sheet, and nested-scroll behavior.

## Acceptance criteria

- WCN-01: The diff remains within the admitted seven-ticket scope and one continuous phase.
- WCN-02: One official Radix-backed shadcn ScrollArea is promoted with source, story, contract, constraints, provenance, retrieval, and registry coverage.
- WCN-03: Registry generation is deterministic and contains exactly 19 resources; no unapproved dependency, schema, token, operation, persistence, Jev, credential, or network expansion occurs.
- WCN-04: Migrated and intentionally-native scroll regions are documented and match the approved ownership model.
- WCN-05: Migrated regions use overlay/non-reserving ScrollArea geometry with no layout shift and subtle semantic reveal behavior.
- WCN-06: Wheel, trackpad-equivalent wheel, keyboard, pointer drag, touch/mobile, focus, and nested-scroll behavior remain usable without traps.
- WCN-07: Applicable Workbench controls share sans, size, weight, line-height, tracking, and responsive typography while filled, placeholder, selected, disabled, and invalid colors retain their semantic distinctions.
- WCN-08: Shared numeric rows use `6rem | minmax(0,1fr) | max-content`; label and value/unit columns remain stable and the slider remains usable across supported spacing values.
- WCN-09: Applicable Workbench text+icon actions use the explicit Tailwind class `size-3.5`; at Default spacing `0.25rem` it resolves to 14px, at other spacing bases it scales proportionally, and excluded icon-only/unrelated surfaces remain unchanged.
- WCN-10: Sidebar navigation remains accessible shadcn Tabs with transparent list, content-width `shrink-0` triggers, one-line horizontal overflow, approved semantic states, and one-step-larger typography.
- WCN-11: Preview Cards/States uses official Select/SelectTrigger/SelectContent/SelectItem, stays compact and centered, and preserves view state/content.
- WCN-12: Shared collapsible triggers use `rounded-sm` and a `size-3` chevron with preserved rotation, focus, keyboard, and accessibility behavior.
- WCN-13: Theme editing, validation, persistence, Save/Save As, export, proposal staging, Apply/Discard, stale handling, and Design Command behavior remain intact.
- WCN-14: Both admitted viewports, light/dark, reduced motion, containment, keyboard/pointer/touch-equivalent paths, and accessibility checks pass with zero serious/critical axe findings.
- WCN-15: Full unit, typecheck, registry, Workbench build, Storybook build, browser, Design Command boundary, frozen-scope, credential/network, and diff checks pass.
- WCN-16: A fresh protected verifier passes the exact clean candidate through offline/source/contract/boundary/evidence-integrity review; browser evidence remains Lead-owned and no owner visual gate is admitted.
