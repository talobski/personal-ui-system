# Workbench Container Gallery Showcase v1 — authoritative phase contract

Phase: `workbench-container-gallery-showcase-v1-001`
Tickets: PUI-78, PUI-79, PUI-80.
Accepted product base: `b15380fd2ad1f221055af382841a9045bbdd84de`.
Implementation branch starts at clean `main` `3e59f1ff4a8fd52b525ba359696f27e878db7ca5`, whose later changes are accepted control and current-doc cleanup.
Authority: this reconciled contract prevails over the frozen admission-time Linear snapshots if there is a conflict. Later Linear edits do not mutate this phase.

## Product reconciliation and order

Theme v3 remains the only active theme model. Per-theme session history, reset baselines, Design Command Preview/Apply/Discard, local persistence, export, and the 120 ms color-picker debounce remain unchanged. The accepted PUI-65 nested gallery removed flat-grid row coupling; PUI-78 refines its layout rather than restoring global spans. Cards/States remain accessible left-aligned tabs. The accepted toolbar already has Undo/Redo/Reset | Export/Save and a short separator. PUI-80 adds the toggle to this right-side grouping without changing action semantics.

Implement in order: PUI-78 layout, PUI-79 composition design, PUI-80 toggle, then integrated regression. PUI-78's instruction to preserve the current eight compositions is the layout-refactor baseline. PUI-79 may curate the final gallery composition set/content within this same phase; any such change must preserve public component/resource contracts and be documented. The exact region grouping is gallery presentation configuration, not product taxonomy. Do not restore `PreviewLayout`, global-span metadata, masonry, dense packing, absolute positioning, or a page-layout DSL. No owner visual-review gate is admitted.

## PUI-78 — container-responsive nested gallery

Use Tailwind 4's supported `@container` and container-query variants on the actual Cards gallery. Start with a single column; introduce two major regions when gallery width allows; at wide sizes use explicit grid tracks/spans with the LEFT region smaller and RIGHT region larger. Span ratios may rebalance at a wider gallery width based on browser evidence. The outer grid must be a structural frame, not a shared row model for unrelated cards. Each major region is an independent natural-height vertical flow. Intentional local groups may independently switch between stack, grid, and full-region width from their own container width. Preserve coherent DOM/read/focus order, one instance per chosen composition, responsive containment, and no horizontal overflow.

Prefer direct `grid`, `flex flex-col`, `min-w-0`, `items-start`, `gap-*`, named-container and `@*` utilities. Remove obsolete `.quiet-gallery-principal`, `.quiet-stack`, `.quiet-gallery-pair` layout rules and equivalent one-off semantic layout wrappers when utilities suffice. A stable data/test marker may remain if it names the gallery surface rather than encoding layout taxonomy. Retain custom CSS only with documented necessity. Document measured final gallery-width breakpoints, track/span changes, and local-group behavior. Prove it changes when container width changes while the browser viewport stays fixed, and that a tall card does not hold down an unrelated card.

## PUI-79 — expressive token-driven showcase

The producer has meaningful creative freedom over the exact composition set and visual direction. Deliver a curated gallery of visually varied, useful and polished UI compositions rather than a repeated component test matrix. Possible subject matter is inspiration, not a checklist. Reuse shadcn primitives where they help; custom composition/layout UI is permitted when it improves the result. No new public resource solely for one card. Keep styling driven by Personal UI semantic colors, Theme v3 Heading/Body/Mono roles, radius, spacing, border and shadow tokens where used. Light/dark and live Workbench edits must visibly propagate. Avoid arbitrary raw colors, inaccessible decorative noise, filler, generic repetitive cards, and nonresponsive one-off aesthetics. Preserve accepted interactive composition behaviors and public resource contracts or document a demonstrated compatibility reason for a bounded change. Gallery roots currently omit shadow as accepted presentation; this does not prohibit token-driven elevation within a composition.

Lead visual evidence should use screenshots at multiple gallery widths and both modes plus a short predeclared rubric: hierarchy, meaningful structural variety, content utility, responsive fit, semantic-token responsiveness, light/dark coherence, and interaction/accessibility. This is Lead technical/visual evidence, not an implicit owner gate.

## PUI-80 — toolbar Switch polish

Group the right-side actions as `[ theme toggle ] | [ undo / redo / reset ] | [ export / save ]`; keep SidebarTrigger on the left. Remove visible `Dark mode` text. Keep a stable accessible name such as `Toggle dark mode`, switch role/checked-state announcement, keyboard operability, focus-visible behavior, light/dark semantics, and mode persistence. Show sun in the thumb for light mode and moon for dark mode, using the existing icon infrastructure and semantic tokens. Add a separator after the toggle that matches the accepted Reset/Export separator treatment; neither should span the full toolbar height. Do not hard-code `h-8` as an independent new requirement. Preserve 64px toolbar height, alignment, action order, Undo/Redo/Reset/Export/Save behavior, export payload, and Save semantics.

Inspect the accepted shadcn Switch first. Prefer a Workbench-local composition/customization if clean and robust. An optional backward-compatible thumb-content capability on the shared Switch is admissible only if inspection shows it is the cleanest reusable solution; if used, update its contract/stories/tests and preserve all existing uses. Do not create a new public resource or registry item.

## Criteria and evidence owners

- **CGS-01 — Packet/admission (code):** all three complete verbatim Linear issue records, comments state and attachment metadata are frozen with retrieval time and SHA-256; the reconciled contract, mapping and authority rule are in the worker packet. Lead verifies hashes before dispatch.
- **CGS-02 — Bounded diff (code):** changed files are confined to Workbench gallery/toolbar/preview, relevant UI compositions and optional narrow Switch extension, associated stories/tests/docs/verifier. No unrelated schema, persistence, Jev, credential, network, dependency or lockfile change.
- **CGS-03 — Container geometry (browser):** fixed browser viewport with varying actual gallery widths crosses at least two layout thresholds; wide left region is measurably narrower than right; spans/local groups recompute from container widths.
- **CGS-04 — Independent flow (browser):** tall content in one region does not create a dead gap before the next card in an unrelated stack; natural heights, readable order and intentional local side-by-side placement remain.
- **CGS-05 — Responsive containment (browser):** 390×844 mobile, 1440×900 desktop, and at least one intermediate/narrowed-preview width have one coherent instance of each final composition, no clipped controls/horizontal overflow, and logical keyboard/focus order.
- **CGS-06 — Tailwind layout ownership (source):** simple layout expressed with supported container/Tailwind utilities; obsolete one-off semantic layout CSS removed; final breakpoint/span recipe documented. No masonry/dense/absolute/global-span metadata.
- **CGS-07 — Showcase quality (browser/rubric):** Lead records screenshots and itemized hierarchy, variety, usefulness, theme responsiveness and visual balance findings; no repetitive filler. No owner visual gate is implied.
- **CGS-08 — Theme responsiveness (browser):** Default and Quiet Editorial light/dark, plus representative live edits to semantic color, type role, radius, spacing and elevation where shown, visibly affect applicable compositions without raw-color bypass.
- **CGS-09 — Composition behavior/accessibility (browser):** existing meaningful interactions and labels remain operable; responsive and reduced-motion paths pass; no new serious/critical axe findings outside the two precisely documented pre-existing theme-token debts.
- **CGS-10 — Toolbar structure (browser):** right-side toggle, short matching separators and exact group order; no visible `Dark mode` label; 64px toolbar and small-screen containment preserved.
- **CGS-11 — Toggle semantics (browser):** sun/thumb when light, moon/thumb when dark; accessible name, role, checked state, Space activation, focus-visible and persistence work; history/export/save unchanged.
- **CGS-12 — Regression (code/browser):** full unit, typecheck, registry, Workbench/Storybook builds, Workbench and Storybook browser suites, and Design Command boundary pass on the exact candidate. No deleted/skipped/weakened test to mask a new failure.
- **CGS-13 — Frozen boundaries (code):** exactly 19 registry resources and 12 mutation operations; Theme v3, staging/history, persistence, credentials and product runtime-network boundaries unchanged. If the shared Switch gains a thumb slot, it remains one backward-compatible resource.
- **CGS-14 — Protected verification (code):** fresh Codex STANDARD verifier audits exact candidate offline/source/contract/boundary/evidence integrity, logical read-only/no repair with pre/post HEAD/tree/index/status/hash checks. Browser execution is Lead-owned, not assigned to the verifier.
- **CGS-15 — Closeout (code):** only after all criteria pass and no owner gate remains, Lead accepts the exact clean candidate, promotes without rewriting history, runs post-promotion checks, persists receipts and closes the phase.

The two previously accepted theme-token contrast debts remain separately attributed, never silently treated as universally zero axe findings: Default-light compact ControlSection muted pair approximately 4.349:1, and inactive-tab hover muted opacity in the built-ins. No new serious/critical finding is admitted.

## Envelope and routing

Producer: `loop_worker_claude_strong`, `claude/claude-opus-5-5`, STRONG, medium, included subscription only. Its creative showcase/design and responsive restructuring justify STRONG. No silent provider/model switch. Fresh verifier: `loop_worker_codex_standard`, `codex/gpt-5.6-terra`, STANDARD, medium, logical read-only/no repair. Lead owns browser execution. Lifetime agent-run ceiling 66→69; phase hard ceiling 3, expected 2, third reserved only for bounded recovery/reverification; cumulative execution time 360 minutes; concurrency 1; paid spend $0. No worker network, credentials, external actions, API fallback, or new public publishing/deployment authority. If Claude becomes unavailable or materially blocked, preserve the candidate and request owner authorization before a replacement producer.
