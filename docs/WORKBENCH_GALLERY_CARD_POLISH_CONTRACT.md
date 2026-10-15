# Workbench gallery card polish — phase contract

Phase: `workbench-gallery-card-polish-v1-001`
Tickets: PUI-103 through PUI-107
Risk: Tier 2; not the LOOP-16 Tier 1 shadow pilot
Accepted product base: `304486c4aaf0f276287398075c3a7b25d311bca3`
Accepted control base: `40c20450b619e17dabd40395263904fd7663720f`

The five complete admission-time Linear JSON snapshots in `docs/evidence/workbench-gallery-card-polish/linear/` are the verbatim worker reference packet. Each records the complete description and metadata, relations, attachment/document state, complete comments response, and retrieval time. The hash manifest pins these bytes. Linear is planning/status context only; this reconciled contract is authoritative. Later Linear edits do not mutate the executing phase. All five were Todo with no comments, attachments, documents, or issue relations at admission. No owner visual-review gate is required.

## Scope

- One coherent Cards-gallery polish phase, PUI-103–107 only. Preserve the accepted gallery order and container-responsive independent-stack architecture.

## Product implementation

1. **PUI-103.** Storage: remove plan/renewal subtitle and per-category numeric values, keep title, primary usage, progress and category dots/names; close dead space naturally. Quick find: remove title and subtitle, making the existing search field first visible while retaining keyboard/search interaction and accessible naming. Recent activity: remove subtitle and right-aligned timestamps; preserve title, Today/Yesterday groups and activity content. Weekly steps: remove weekday labels and their reserved chart space while retaining the value, supporting copy, comparison and seven bars. Chat: remove the entire avatar/contact header and its dedicated divider, keep current Message/Bubble order and alignment, and place a disabled, muted, accessible icon-only send button *inside* the composer field at far right. Keep exact placeholder `Type your message...`. No message insertion or geometry-changing interaction.
2. **PUI-104.** In the existing compact Table, use semantic `border-input` (or current equivalent) for unchecked header/select-all and row checkbox borders. Preserve checked, indeterminate, focus, size, selection and column geometry. Amount values use Body/Sans, not Mono; retain values, formatting, alignment and all other columns and padding.
3. **PUI-105.** Weather's current temperature and Lisbon/location use Body/Sans family while retaining current size and weight; the composition should use Body/Sans throughout without a new typography role. Calendar/Weather alone must use independent natural heights side-by-side and stacked, with the compact Calendar / wider Weather proportion retained. Use local `items-start` or equivalent and remove local stretch/`h-full` only where needed. Other intentional paired rows, including Chat/Recent activity, retain equal-height behavior. No fixed heights.
4. **PUI-106.** Set the Music slider thumb's visible fill to semantic primary while preserving contrast, border/focus, track and interaction. Remove Play/Pause's special oversized filled-circle treatment. Shuffle / Previous / Play-Pause / Next / Repeat have one visual treatment, equal target dimensions and even distribution. **No owner-required 40px size**: use an established system control size and tune exact geometry from browser evidence, not an arbitrary new constant. Audit the existing icon library: use legitimate solid variants if actually present; otherwise retain its official icons, without fabricated filled SVGs or a new dependency. Retain local playback behavior, metadata, placement and stable geometry.
5. **PUI-107.** Studio revenue Card has no uniform outer padding. Keep tabs and three metrics in intentionally padded inner wrappers. Place the unchanged Revenue chart outside that padding so it reaches left, right and bottom inside the existing border/radius; clip cleanly as needed. Prefer structural wrappers over negative margins. Preserve range switching, data/series, order, tokens, light/dark and focus behavior.

Ticket/repository reconciliation: these tickets refine the currently accepted PUI-95–102 compositions. Older browser assertions for now-removed labels, the enabled Chat send affordance, equal Calendar/Weather heights, Mono Amount values, and filled Play/Pause may need narrow replacement with assertions for the new contract; tests must not simply be deleted/skipped or broadly weakened. PUI-106's equal sizing does not authorize an exact 40px target unless an existing system standard supplies it.

## Frozen boundaries

- Theme v3, Heading/Body/Mono model, dedicated Sidebar tokens, history/recovery, persistence/import/export, Design Command staging, Jev, 12 mutation operations and 23 public registry resources are unchanged.
- No dependency, lockfile, public component/resource, new token, credential, runtime network or external-effect change is admitted.
- No gallery reorder, replacement card, new composition, global paired-row rule, masonry, dense flow, absolute positioning or global row coupling.

## Acceptance criteria and evidence ownership

- **WGCP-01**: Five verbatim frozen ticket snapshots, full metadata/comments/attachments/references, retrieval time and hashes, plus this authoritative contract, match the accepted base and approved owner wording.
- **WGCP-02**: Candidate diff stays within admitted compositions, focused tests/stories and phase evidence; forbidden product/public/runtime boundaries remain frozen; diff hygiene and no test deletion/skip/weakening.
- **WGCP-03**: PUI-103's five composition changes meet exact retained/removed content, accessibility, stable geometry and theme behavior.
- **WGCP-04**: PUI-104 unchecked semantic checkbox border and Body/Sans Amount values pass without state, formatting or Table-layout regressions.
- **WGCP-05**: PUI-105 Body/Sans Weather and natural Calendar/Weather heights pass while other intentional pair stretching stays unchanged.
- **WGCP-06**: PUI-106 primary thumb, uniform five-control rhythm and legitimate-icon rule pass with keyboard/focus, light/dark and local playback state intact; no universal 40px assertion.
- **WGCP-07**: PUI-107 chart reaches the card's left/right/bottom inner edges without stale inset or border-radius overflow, and the padded tabs/metrics and range data remain intact.
- **WGCP-08**: Lead-owned exact-candidate browser verification covers narrow and wide gallery containers, light/dark, stable geometry, both pair rules, chart edge measurements, checkbox/musical control/Chat focus and accessibility, plus affected Storybook presentations. No new serious/critical axe finding beyond separately documented accepted contrast debt.
- **WGCP-09**: Full unit tests, typecheck, affected Workbench/Storybook builds, registry/resource checks (23), operation union (12), frozen-boundary checks and `git diff --check` pass offline.
- **WGCP-10**: Fresh protected opposite-family verifier independently checks exact clean candidate offline/source/contract/evidence integrity; pre/post HEAD, index, tracked and nonignored-untracked state and supplied hashes unchanged. Producer smoke is not Lead evidence; source review is not browser execution.
- **WGCP-11**: Only after WGCP-01–10 pass, Lead records acceptance, promotes exact candidate to `main`, performs proportionate post-promotion identity/smoke checks, writes durable receipts and closes the phase. A modified candidate invalidates affected evidence.

The Lead may correct only mechanical/unambiguous defects within the same contract; substantive remediation returns to the same producer where possible and remains within the three-run ceiling. Fail closed when verification capability or exact-candidate identity is missing.
