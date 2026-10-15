# Workbench showcase components and Geometry — phase contract

Phase: `workbench-showcase-components-geometry-v1-001`
Tickets: PUI-86 through PUI-94
Risk: Tier 3
Accepted product base: `1b6f9e17e305c42af04789a751f1227217f25711`
Accepted control base: `cbe6cad1b45b18fcbe4a049cf4dd782e0f7d9111`
Prepared dependency base: `be4eca8e13728d49fbcfef2c773705c59a4599ad`

The nine complete, verbatim admission-time Linear issue snapshots in `docs/evidence/workbench-showcase-components-geometry/linear/` are the worker's reference packet. The snapshots include issue metadata, descriptions, relations, attachment/document state, complete comment state and retrieval time. Their hashes are frozen in `snapshot-hashes.json`. Linear is planning and traceability context only. This reconciled contract governs any discrepancy. Later Linear edits cannot silently change this phase.

## Product boundaries

- No geolocation or runtime data fetching.

## Implementation order and product contract

1. Audit the current official shadcn Message/Bubble, Table/Data Table, Calendar and Signup sources against the existing Radix-oriented project foundation. New public resources must follow the official architecture and use existing Personal UI typed/theme contracts. The Lead-prepared direct dependency is exactly `react-day-picker@10.0.1`, with required transitive `date-fns@4.4.0` and `@date-fns/tz@1.5.0`; manifest and lockfile are pinned at the prepared base. Do not fetch or add any package.
2. PUI-86: remove the complete Storage Team plan / Upgrade CTA, including icon tile, copy, surface/shadow, button and now-unused local state. Keep title, renewal subtitle, 18.4/25 GB value, progress and four-category breakdown unchanged except natural spacing. No replacement promotion or shared primitive change.
3. PUI-87: locally remove the Revenue chart's visible Week/Month/Quarter x-axis labels and their reserved space. Retain range tabs, range-specific data, primary Revenue area/line, suitable grid/reference lines, and an accessible nonvisual description. No shared Chart change unless truly necessary.
4. PUI-89: repurpose A productive week into a weekly steps summary. No old title/subtitle/tasks label. Show a realistic four-digit average near 8–9k in semantic `type-heading`, concise average label and positive week-over-week comparison. Keep seven plausible daily-step bars, M/T/W/T/F/S/S labels, chart tokens and stable geometry.
5. PUI-88: replace This week in its gallery slot with a compact mostly static conversation built from official Message and Bubble resources, reusing Avatar. Use start/end alignment and only useful message slots. No MessageScroller, streaming, dynamic insertion, expanding threads or workflow-heavy chat. Keep the standalone schedule module/stories if independently used.
6. PUI-90: replace Launch checklist in its slot with a compact composition-local table recipe built from the official reusable Table resource. Table only: Status, Email, Amount and a small deterministic row set; an accessible visually hidden caption is permitted. Omit optional checkbox selection and row menu initially, and do not add TanStack Table, filtering, columns menu, selection summary, pagination or surrounding toolbar/footer.
7. PUI-91: replace the gallery support form in its slot with the official signup block's form portion adapted to one card: Create your account heading/supporting copy, Email, Password, Confirm Password, concise help, Create Account CTA, Or continue with divider, social buttons and sign-in footer. No full-page wrapper, media panel, real auth/network or geometry-changing validation. Preserve the standalone support module/stories if independently used.
8. PUI-92: add exactly one single-month official Calendar in `mode="range"` with deterministic visibly selected start/middle/end; one polished token-driven music card with lightweight local control state but no streaming; one token-driven location/weather card with deterministic illustrative data, no live-data claim, API, geolocation or credentials. These two creative cards are gallery compositions, not public resources.
9. Reconcile 11-card gallery balance within the accepted container-responsive architecture. Initial left stack: Storage, Quick find, Weekly steps, Signup, Music, Weather. Initial right stack: Studio revenue, Chat / Recent activity local pair, compact Data Table, range Calendar. Each composition appears exactly once. Bounded browser-led regrouping is permitted if it improves balance without losing intended replacement slots, logical DOM/focus order or responsive containment. Independent natural-height stacks; no masonry, dense packing, absolute positioning or global row coupling.
10. PUI-93: the Use sidebar tokens label becomes one text step smaller and `text-muted-foreground`; remove the exact inactive helper note, add a small trigger-to-toggle gap, and keep Switch semantics, field visibility/order, values and behavior. No dangling `aria-describedby`.
11. PUI-94: existing top-level Tabs become Colors / Typography / Geometry / Effects / Command. Geometry contains Radius and Spacing exactly once; Effects contains Shadow and Motion exactly once. Preserve existing control IDs/values, mutation semantics, shared tabs styling, keyboard/focus behavior, persistence, history and Design Command.

## Reconciliation and public boundary

- PUI-86/87/89 prohibit unilateral gallery reordering; PUI-92 permits final balance. Preserve the surviving relative placements and use only the bounded gallery-level balance authority above.
- The official Data Table page is an app-specific guide built on Table, not a single reusable Data Table primitive. The small gallery example uses official Table without introducing TanStack Table or a public generic data-grid abstraction.
- The official signup block is a composition, not a required public Signup primitive. Only its form portion is admitted.
- Registry baseline is exactly 19. Add only official reusable `message`, `bubble`, `calendar`, `table`, resulting in exactly **23**. Existing public resources remain; no new resource for signup, music, weather or data-grid management.
- Mutation union remains exactly **12**. Theme v3 schema, semantic Heading/Body/Mono roles, sidebar token model, persistence/import/export, Design Command staged Preview/Apply/Discard, and session-local history/recovery remain unchanged.
- The prepared dependency commit changes only `packages/ui/package.json` and `pnpm-lock.yaml`. No unrelated package version may change. `@base-ui/react` remains 1.8.0 while its optional peer snapshot resolves the new date-fns packages. `COREPACK_ENABLE_NETWORK=0` and offline frozen-lockfile installs are required thereafter.

## Acceptance criteria and evidence ownership

- **WSCG-01**: exact frozen nine-ticket packet, metadata/comment/attachment state, hashes and authoritative contract; accepted base and scope reconciled.
- **WSCG-02**: dependency/provenance boundary: exact direct/transitive packages, lock integrity, no unrelated upgrade, offline isolated install, no worker network.
- **WSCG-03–05**: Storage, Revenue and weekly steps meet PUI-86/87/89 respectively with retained accessible descriptions and token behavior.
- **WSCG-06–09**: Chat, compact Table, Signup and Calendar meet PUI-88/90/91/92, use only the approved official reusable resources and remain responsive/accessibly operable.
- **WSCG-10**: Music and Weather are polished token-driven, deterministic, geometry-stable, and have no external effects.
- **WSCG-11**: gallery has exactly 11 compositions, one instance each, acceptable balance, preserved container-query/independent-stack rules and coherent DOM/focus order at mobile, intermediate and wide widths.
- **WSCG-12–13**: Sidebar toggle polish and five-tab Geometry/Effects split meet PUI-93/94 without altering token or operation behavior.
- **WSCG-14**: full unit suite, typecheck, registry/resource-contract checks, manifest/lockfile/provenance/frozen-boundary checks, Workbench and Storybook builds and diff hygiene pass on exact candidate; no unrelated architecture or external effect.
- **WSCG-15**: Lead-owned real-browser Workbench integration/accessibility/layout/theme evidence covers the changed Cards gallery, new resources, control tabs, Sidebar switch, history and Design Command boundaries. Affected Storybook browser coverage for new resources and compositions also passes. No new serious/critical accessibility finding; prior accepted contrast debt is attributed separately and never described as universally zero.
- **WSCG-16**: fresh protected verifier independently checks exact clean candidate offline/source/contract/boundary/evidence integrity, with pre/post HEAD/status/index/evidence hashes unchanged, no repair and no browser-ownership claim.
- **WSCG-17**: only after WSCG-01–16 pass, Lead records acceptance before fast-forward promotion to `main`; runs post-promotion identity and proportional smoke checks, persists durable receipts, and closes the phase automatically.

The producer's self-checks are authoring evidence, not protected verification. A test-definition audit is not executable browser evidence. Any product/test mutation after browser or verifier evidence requires reconciliation against the new exact candidate; fail closed if integrity cannot be established.
