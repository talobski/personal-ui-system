# Workbench Sidebar System Polish v1

Phase: `workbench-sidebar-system-polish-v1-001`

Accepted product base: `b2952d17f240abb2bf1e7e87f20f14281399015d`

Tickets: PUI-25, PUI-26, PUI-27, PUI-28, PUI-29, PUI-30.

## Product scope

- Promote official shadcn-derived `sidebar` and `avatar` resources. The registry must contain exactly 18 resources.
- Replace the Workbench's custom header and resizable two-panel shell with one `SidebarProvider` / `Sidebar` / `SidebarInset` application shell. The desktop sidebar starts at `22rem`; the main preview consumes the remaining space.
- Use the official mobile off-canvas Sidebar behavior. Do not build a second nested sidebar or retain the old mobile Controls/Preview shell when Sidebar already supplies the control surface.
- Remove Workbench use of `ResizablePanel`, `ResizablePanelGroup`, and `ResizableHandle`; retain the accepted public `resizable-panel` resource unchanged.
- Put the active theme Select in `SidebarHeader`. Preserve the active theme's primary, accent, secondary, and border swatches and built-in/custom grouping.
- Expose a separate `SidebarMenuAction` only for the active custom theme. Confirm deletion with the accepted responsive dialog. Built-ins are immutable. Deleting the active custom theme removes its saved theme/base metadata and persists `Default` as active.
- Put Colors, Typography, Other, and Command navigation plus their existing editor controls in `SidebarContent`. Preserve canonical Theme v2 state, validation, persistence, save/export, manual live editing, and Design Command staged proposal Apply/Discard semantics.
- Apply subtle native scrollbar styling only to Workbench scroll regions (sidebar content and preview document): low contrast at rest, more visible on hover/active, with graceful browser/OS fallback and unchanged keyboard, pointer, trackpad, and touch scrolling.
- Promote the official shadcn-derived Avatar resource and use it for initials-style avatars across accepted compositions/examples/Storybook. Derive exactly one first meaningful character from the display name; use `muted` and `muted-foreground` tokens, never hard-coded avatar colors.
- Make `gap-2` the system default for ordinary vertically stacked Field label-to-control spacing. Preserve intentional horizontal, responsive, checkbox/radio, field-group, and inter-field spacing.
- Remove Density from the manual Workbench UI only. Keep the canonical density schema, renderer, migration, mutation, persistence, and Design Command capability because it remains active programmatic behavior.

## Provenance and dependencies

- Sidebar source pattern: `https://ui.shadcn.com/r/styles/new-york-v4/sidebar.json` and `https://ui.shadcn.com/docs/components/base/sidebar`.
- Avatar source pattern: `https://ui.shadcn.com/r/styles/new-york-v4/avatar.json`.
- The official source dependencies are already pinned in the accepted lockfile: `shadcn@4.21.0`, `radix-ui@1.6.7` (resolved), `class-variance-authority@0.7.1`, `lucide-react@1.47.0`, `cn`, React 19, and existing internal Button/Input/Separator/Dialog support.
- No dependency or lockfile change is expected. Adapt official source to the package's semantic tokens and existing component conventions; do not introduce sidebar-specific Theme v2 tokens or a parallel styling model.

## Acceptance criteria

- **WSSP-01 — Bounded batch:** the candidate implements only PUI-25 through PUI-30 plus required tests, stories, contracts, provenance, documentation, and phase verification.
- **WSSP-02 — Public resources:** official shadcn-derived Sidebar and Avatar resources have source, stories, contracts, constraints/provenance, deterministic retrieval, and valid registry entries; registry count is exactly 18.
- **WSSP-03 — Desktop shell:** the old top header and Workbench ResizablePanel shell are absent; SidebarProvider, Sidebar, SidebarHeader, SidebarContent, optional SidebarFooter, and SidebarInset form one full-height shell; desktop width starts at 22rem and preview fills the remainder without overflow or nested shell chrome.
- **WSSP-04 — Mobile shell:** at 390x844 the official off-canvas sidebar opens, traps/focuses/dismisses accessibly, exposes all editor sections, and leaves the preview usable edge-to-edge when closed. Keyboard, pointer, touch-sized targets, and reduced motion are covered.
- **WSSP-05 — Theme selector:** the compact SidebarHeader selector preserves built-in/custom grouping and displays primary, accent, secondary, and border swatches from each theme in trigger and rows. Trigger/rows use pointer and semantic accent hover/focus styling.
- **WSSP-06 — Custom deletion:** only an active custom theme exposes a sibling SidebarMenuAction; deletion uses ResponsiveDialog confirmation, cannot select a different theme accidentally, removes saved custom/base records, and persists Default as fallback. Built-ins never expose delete.
- **WSSP-07 — Scoped scrollbars:** only intended Workbench sidebar/preview scroll regions receive subtle native scrollbar styling with stronger hover/active visibility and graceful fallback; native scrolling modalities remain intact.
- **WSSP-08 — Avatars:** every initials-style avatar in accepted compositions/examples/Storybook uses Avatar, exactly one meaningful initial, and semantic muted/muted-foreground styling; no two-letter or hard-coded avatar color remains.
- **WSSP-09 — Field spacing:** ordinary vertical Field label-to-control spacing is `gap-2`; intentional specialized and inter-field spacing remains unchanged. Component stories/tests prove both behaviors.
- **WSSP-10 — Density boundary:** no manual Density control appears in the Workbench, while canonical schema, renderer, v1 migration, persistence, `setDensity`, proposal validation, and Design Command density behavior remain operational and covered.
- **WSSP-11 — Functional preservation:** Theme v2 live editing, color/font/radius/spacing/shadow controls, Save/Save As, export, valid saved selection, proposal preview/Apply/Discard/stale handling, and active-versus-staged isolation remain correct.
- **WSSP-12 — Responsive containment:** desktop and mobile layouts have no unintended page overflow; sidebar transitions, Select geometry, dialogs, controls, and preview remain contained at representative viewports and both color modes.
- **WSSP-13 — Accessibility/browser:** Lead-owned browser runs cover Sidebar/Avatar interactions, keyboard paths, pointer paths, scrolling, deletion, responsiveness, reduced motion, and decoded axe checks with zero critical/serious findings. Full Storybook, Workbench, and live Design Command matrices pass.
- **WSSP-14 — Frozen boundaries:** no Theme v2 schema, mutation-operation set, persistence format, Design Command/Jev behavior, credential, runtime-network, deployment, or unrelated public resource expansion occurs. `resizable-panel` remains published and unchanged.
- **WSSP-15 — Verification and closeout:** all unit/typecheck/build/registry/phase-scan/diff checks pass; a fresh Codex STANDARD verifier independently audits the exact clean candidate offline, source/boundary integrity, and Lead browser evidence provenance. Browser execution remains Lead-owned. No owner visual gate is admitted.

## Evidence ownership and closeout

Lead owns browser execution and its exact-candidate evidence. The protected fresh verifier owns independent offline execution, source and boundary audit, and evidence-integrity reconciliation; it does not need localhost capability and must not claim browser execution. There is no owner visual-review gate. When WSSP-01 through WSSP-15 pass, accept before moving main, fast-forward/promote normally, rerun post-promotion checks, persist receipts, and close automatically.

## Explicit non-goals

- No Theme v2 schema, token, mutation-operation, or persistence-format change.
- No deletion of the public `resizable-panel` resource.
- No general scrollbar restyling outside the Workbench.
- No runtime network, external font/service requests, credentials, deployment, public action, paid capacity, Jev expansion, or MAX worker.
- No owner visual gate.
