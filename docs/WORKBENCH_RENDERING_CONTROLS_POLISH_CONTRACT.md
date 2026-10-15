# Workbench rendering and controls polish v1 — phase contract

Phase: `workbench-rendering-controls-polish-v1-001`

Tickets: PUI-38, PUI-39, PUI-40, PUI-41, PUI-42, PUI-43.

Accepted product base: `473372c92ad23478c41cc151a79fb8274fea7d9f`.

## Scope

- Apply Tailwind `antialiased` to the Workbench application root and isolated preview document root without changing typography tokens, font families, weights, tracking, or line heights.
- Reuse the Colors-tab picker/text interaction for Shadow color while preserving canonical OKLCH mutation and validation. Remove the visible stored-value helper and shorten only the approved Other-tab labels.
- Update the shared sidebar `ControlSection` trigger to be content-width, rounded, `bg-muted`, `ring-1 ring-border`, `hover:bg-muted/80`, `px-2 py-0.5`, smaller uppercase text with `tracking-wide`, and the minimum stronger semantic foreground that independently passes normal-text contrast. Do not restore `bg-muted/50`, `ring-border/50`, accent hover, or a hard-coded color.
- Keep scoped native scroll regions. Make thumbs transparent at rest and reveal them from container hover, focus-within, or active state without changing scrollbar width, overflow mode, or layout geometry. Use platform overlay behavior where available and stable native fallback elsewhere; do not use deprecated `overflow: overlay` or a custom scrollbar library.
- Make the sidebar header and preview toolbar deterministic 64px flex rows. Use `px-2` on the sidebar header and theme selector surface, `px-4` on the preview toolbar, and verify aligned bottom edges.
- Reconcile the two Workbench tab groups to the existing sidebar `text-xs` reference without changing the public Tabs primitive or either group's geometry and interaction.
- Keep affected Workbench editable controls at `text-sm` at both admitted viewports. Scope this to the Workbench and preserve public component defaults. The accepted product tradeoff is that iOS Safari may focus-zoom sub-16px editable text; no hidden 16px mobile override is admitted.

No public resource, Theme v2 schema, mutation operation, persistence format, dependency, credential, network path, Design Command behavior, or Jev behavior may be added or changed.

## Evidence ownership

- The Lead owns executable browser evidence at 390x844 and 1440x900, in light/dark and normal/reduced-motion conditions.
- The fresh protected verifier owns exact-candidate offline tests, builds, source/contract/boundary review, and Lead-evidence integrity. It has no browser responsibility and no repair authority.
- No owner visual-review gate is admitted.

## Acceptance criteria

- **WRCP-01 — Bounded scope:** every changed file is admitted and frozen product boundaries remain unchanged.
- **WRCP-02 — Antialiasing:** Workbench and preview roots use Tailwind antialiasing; typography tokens and authored type choices are unchanged.
- **WRCP-03 — Shadow color:** Shadow color uses the shared picker/text interaction, canonical OKLCH validation, and no stored-value helper.
- **WRCP-04 — Other labels:** visible labels are exactly Opacity, Blur, Spread, Offset X, Offset Y, and Duration; internal properties and operations are unchanged.
- **WRCP-05 — Shared triggers:** all applicable sidebar sections use the approved shared trigger treatment and meet normal-text contrast in both modes.
- **WRCP-06 — Native scrollbars:** thumbs are transparent at rest and reveal on container hover/focus/active where supported, with native input methods and stable layout preserved.
- **WRCP-07 — Top geometry:** sidebar header and preview toolbar are exactly 64px and their desktop bottom edges align within one device pixel.
- **WRCP-08 — Insets:** selector content resolves to the same 16px inner edge as sidebar content; toolbar retains 16px horizontal inset.
- **WRCP-09 — Tabs:** sidebar and preview tab labels have the same computed font size; geometry, states, and accessibility remain intact.
- **WRCP-10 — Controls:** affected Workbench editable controls compute to 14px at both admitted viewports while containment, validation, focus, and keyboard behavior remain intact.
- **WRCP-11 — Responsive and motion:** the shell, controls, scroll regions, and preview remain contained and usable at both viewports and both motion preferences.
- **WRCP-12 — Accessibility:** keyboard paths pass and the declared axe matrix has zero serious or critical findings.
- **WRCP-13 — Product regressions:** theme editing, proposal staging, persistence, export, Design Command, and responsive Sidebar behavior pass unchanged.
- **WRCP-14 — Frozen catalog/runtime:** registry remains exactly 18 resources, mutation operations remain exactly 11, and credential/network scans pass.
- **WRCP-15 — Technical matrix:** unit, typecheck, registry, Workbench build, Storybook build, browser suites, Design Command boundary, phase verifier, and diff checks pass.
- **WRCP-16 — Protected verification and closeout:** a fresh verifier passes the exact clean candidate offline/source/contract/boundary/evidence-integrity audit; with no owner gate, the Lead automatically accepts, promotes, performs post-promotion checks, records receipts, and closes.
