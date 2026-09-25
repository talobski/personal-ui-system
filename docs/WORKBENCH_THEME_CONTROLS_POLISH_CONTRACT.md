# Workbench Theme Controls Polish v1

Phase: `workbench-theme-controls-polish-v1-001`

Tickets: PUI-31, PUI-32, PUI-33, PUI-34, PUI-35, PUI-36, PUI-37

Accepted product base: `aac8372cb646ac2a89bb3f7bd17e9e408fc19c0d`

## Scope

This phase refines the accepted shadcn Sidebar Workbench without changing its
product architecture. Theme v2 remains the only theme model. Existing
persistence, validation, live manual editing, Design Command staging,
Apply/Discard, export, built-in immutability, custom-theme behavior, local font
catalog, and responsive Sidebar behavior remain in force.

The exact owner corrections are controlling:

- Swatches use explicit `h-2.5 w-2.5 rounded-sm`, a straight `gap-0.5` row,
  primary/accent/secondary/border order, and semantic `ring-border` styling.
- Collapsible triggers use a subtle `ring-1 ring-border/50` treatment rather
  than a normal border.
- Visible font copy is `Sans-serif font...`, `Serif font...`, and
  `Monospace font...`; catalog choices show their family names and genuinely
  custom stacks use a concise category-specific custom state.

## Implementation boundaries

- Set built-in Default radius base to `0.7rem`; preserve deterministic scale
  derivation (`0.45rem`, `0.575rem`, `0.7rem`, `0.95rem`).
- Set built-in Default spacing base to `0.25rem`.
- Preserve Quiet Editorial and persisted custom theme values.
- Preserve the historical imported source in conversion provenance while
  recording the owner-approved Default override explicitly.
- Refine only directly affected generic `quiet-*` shell/control naming; do not
  perform a broad cosmetic rename.
- Add no dependencies or public registry resources. Registry count remains 18.
- Theme schema, mutation union, persistence format, Jev, credentials, runtime
  network, deployment, and external effects are frozen.

## Evidence ownership

- Lead: executable browser matrix, responsive/computed layout, accessibility,
  reduced motion, and live interaction evidence.
- Fresh cross-provider protected verifier: exact-candidate unit/type/build,
  source/contract/boundary audit, Lead-evidence integrity, and candidate
  integrity. Browser execution is not assigned to that verifier.
- Owner visual review: not admitted and not required.

## Mandatory acceptance criteria

### WTCP-01 — Admitted batch

- assertion: The candidate implements PUI-31 through PUI-37 as one bounded
  phase and changes only admitted product, test, evidence, and documentation
  surfaces.
- method: code
- capability: Git diff and phase-boundary scanner.
- threshold: No file outside the declared scope changes; frozen boundaries pass.
- result + evidencePath: pending.

### WTCP-02 — Default baselines

- assertion: Built-in Default uses radius base `0.7rem`, the deterministic
  radius scale `0.45/0.575/0.7/0.95rem`, and spacing base `0.25rem`.
- method: code
- capability: Fixture, normalizer, renderer, and snapshot/unit tests.
- threshold: Exact canonical and rendered values pass; conversion provenance
  distinguishes the historical source from the owner override.
- result + evidencePath: pending.

### WTCP-03 — Theme compatibility

- assertion: Quiet Editorial and persisted custom themes retain their values;
  selecting persisted Default resolves to the updated built-in fixture.
- method: code
- capability: Persistence, migration, and fixture tests.
- threshold: Custom values are not overwritten, Quiet Editorial is unchanged,
  and valid saved selection behavior remains deterministic.
- result + evidencePath: pending.

### WTCP-04 — Theme swatches

- assertion: Active and option-row swatches use each theme's own primary,
  accent, secondary, and border values with the exact approved geometry.
- method: browser
- capability: Chromium computed geometry/style and interaction checks.
- threshold: Four explicit `h-2.5 w-2.5 rounded-sm` swatches, `gap-0.5`, no
  overlap/negative spacing, semantic border ring, exact order, and no selector
  header bottom divider at both admitted viewports.
- result + evidencePath: pending.

### WTCP-05 — Theme-neutral toolbar

- assertion: The preview toolbar uses theme-neutral styling, 16px padding, and
  official ghost Buttons with appropriate Lucide Export and Save icons.
- method: browser
- capability: DOM/source audit plus computed layout and action tests.
- threshold: Sidebar trigger and Dark mode remain left; Export and Save remain
  right, keyboard accessible, responsive, and behaviorally unchanged.
- result + evidencePath: pending.

### WTCP-06 — Numeric control rows

- assertion: Applicable Typography and Other numeric controls use one aligned
  label/slider/input/unit row where only the slider flexes.
- method: browser
- capability: Computed geometry, narrow-layout containment, keyboard, and
  pointer tests.
- threshold: Labels, fixed inputs, and fixed units do not grow/shrink; sliders
  fill remaining width; rows align vertically without horizontal overflow; the
  visible label is `Spacing` while the canonical property is unchanged.
- result + evidencePath: pending.

### WTCP-07 — Collapsible group treatment

- assertion: Shared control-group triggers are content-width, rounded, muted,
  small uppercase, tracking-wide, and use `ring-1 ring-border/50` with the
  approved inter/intra-group rhythm.
- method: browser
- capability: Computed styles, geometry, focus, pointer, and keyboard tests.
- threshold: No old full-width trigger or divider remains; expand/collapse,
  focus visibility, accessible state, and reduced motion all pass.
- result + evidencePath: pending.

### WTCP-08 — Balanced insets

- assertion: Theme selector, tabs, controls, and toolbar/preview surfaces share
  the intended 16px outer inset under Default without nested double-padding.
- method: browser
- capability: Desktop/mobile computed geometry and overflow checks.
- threshold: Main edges align within 1 CSS pixel at 1440x900 and 390x844;
  component-internal spacing remains intentional.
- result + evidencePath: pending.

### WTCP-09 — Concise font controls

- assertion: Font controls use the approved concise copy and remove verbose
  visible current-stack paragraphs while preserving exact canonical stacks.
- method: browser
- capability: Catalog and custom-stack interaction, accessibility, persistence,
  and source tests.
- threshold: The three approved ellipsis labels appear; selected catalog names
  render normally; custom values show a concise category-specific state and
  retain accessible exact-stack detail without visible `Current stack:` copy.
- result + evidencePath: pending.

### WTCP-10 — Existing behavior

- assertion: Live editing, validation, selection, custom Save/Save As/delete,
  export, light/dark mode, and proposal Apply/Discard/stale safety still work.
- method: browser
- capability: Existing Workbench regression and Design Command boundary suites.
- threshold: Exact-candidate browser suites and live boundary pass with only
  predeclared viewport-specific skips.
- result + evidencePath: pending.

### WTCP-11 — Accessibility and responsiveness

- assertion: Refined controls remain accessible and usable across supported
  viewports, input modes, color modes, and reduced motion.
- method: browser
- capability: Playwright plus decoded axe reports.
- threshold: 390x844 and 1440x900, light/dark, keyboard/pointer, reduced motion,
  no horizontal overflow, and zero serious/critical axe findings.
- result + evidencePath: pending.

### WTCP-12 — Frozen architecture

- assertion: Registry, Theme v2 schema, mutation operations, persistence format,
  Jev, credentials, and runtime-network boundaries do not expand.
- method: code
- capability: Registry build/count and phase boundary/security scanner.
- threshold: Exactly 18 resources, exactly 11 operations, no dependency change,
  and every frozen hash/security scan passes.
- result + evidencePath: pending.

### WTCP-13 — Full technical regression

- assertion: The exact candidate passes the complete admitted technical matrix.
- method: code
- capability: Unit tests, TypeScript, registry, Workbench and Storybook builds,
  browser suites, phase verifier, and whitespace checks.
- threshold: Every command exits zero; browser evidence is Lead-attributed and
  candidate-exact; non-failing known bundler advisories are recorded separately.
- result + evidencePath: pending.

### WTCP-14 — Protected verification and closeout

- assertion: A fresh cross-provider verifier independently validates the exact
  unchanged candidate's offline/source/contract/evidence integrity before
  automatic promotion.
- method: code
- capability: Isolated verifier worktree and deterministic pre/post integrity
  comparison.
- threshold: Protected verdict PASS, candidate HEAD/index/status unchanged, no
  repair performed, no owner gate remaining, then accepted-state-before-main,
  promotion, post-promotion checks, receipts, and phase closeout complete.
- result + evidencePath: pending.

## Envelope and routes

- Lifetime agent-run ceiling: 54; current usage before dispatch: 51.
- Phase hard ceiling: 3 runs; expected: 2.
- Execution time: 240 minutes total.
- Concurrency: 1.
- Paid spend: 0.
- Producer: exactly one owner-authorized `loop_worker_codex_max` dispatch,
  `codex/gpt-6-astra`, MAX, medium, auto, fast mode off.
- Verifier: fresh cross-provider STANDARD route, preferably
  `claude/claude-sonnet-5`, medium, logical read-only/no-repair.
- Remediation: same Astra agent first, deterministic Lead correction second,
  then at most one new normal STRONG producer dispatch if genuinely required.
  Another MAX dispatch requires new owner approval.
