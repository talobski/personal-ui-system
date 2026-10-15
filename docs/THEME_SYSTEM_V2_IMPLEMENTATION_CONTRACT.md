# Theme System v2 + Default + live controls

Phase: `theme-system-v2-default-live-controls-001`

Accepted product/control base: `2ffaf6d4d13d2b334f198b8df40d10988673924d`

This is the provider-neutral implementation contract for TSV2-01 through
TSV2-15. It is also the handoff source of truth if the owner later pauses the
Claude producer and explicitly authorizes an Astra continuation. Completed
work must be continued, not replayed.

## Product scope

- Migrate the canonical theme model to `personal-ui-theme/2`.
- Add the built-in `Default` theme and make it the initial selection for fresh
  Workbench state.
- Preserve `Quiet Editorial` as a selectable built-in theme and preserve a
  valid persisted user selection.
- Normalize HEX, RGB/RGBA, HSL/HSLA, and OKLCH color inputs to canonical OKLCH.
- Add live manual controls for sans, serif, mono, tracking, radius, spacing,
  and shadow color/opacity/blur/spread/offset X/offset Y.
- Promote Slider and Collapsible as the only new public resources. They must
  be shadcn/Radix-derived and include contracts, deterministic constraints,
  retrieval metadata, provenance, stories, registry entries, accessibility,
  and browser evidence.
- Preserve Design Command proposal staging, preview, Apply, Discard, stale
  handling, and active-versus-staged clarity. Manual edits are direct and do
  not use proposal Apply/Discard.

No raw-CSS parallel theme representation is permitted.

## Canonical Theme v2

The strict canonical output is version 2. `validateTheme` accepts supported v1
and v2 input and returns normalized v2. The existing
`personal-ui-context/1` envelope remains; its identity reports theme schema
version 2.

- `colors.light` and `colors.dark`: the accepted semantic color set plus
  `destructive-foreground`; every stored value is canonical OKLCH.
- `typography.sans`, `typography.serif`, `typography.mono`: non-empty ordered
  font-family arrays.
- `typography.tracking`: canonical `em` value.
- `radius`: `base`, `sm`, `md`, `lg`, `xl` canonical lengths.
- `space`: `base` canonical length and existing `density` multiplier.
- `shadow`: exact tiers `2xs`, `xs`, `sm`, `default`, `md`, `lg`, `xl`, `2xl`.
  Every tier is an ordered non-empty layer array; every layer has `inset`,
  `offsetX`, `offsetY`, `blur`, `spread`, and canonical OKLCH `color` with
  alpha.
- `motion`: existing canonical duration/easing/reduced-motion representation.

Font sizes, weights, line heights, sidebar colors, raw CSS, and arbitrary
theme variables are not added in this phase.

## Exact built-in Default values

All color values below are canonical OKLCH. Alpha is 1 unless shown.

### Light

| Token | Value |
| --- | --- |
| background, card, popover | `oklch(1 0 0)` |
| foreground, card-foreground, popover-foreground | `oklch(0.144788 0 0)` |
| primary | `oklch(0.204627 0 0)` |
| primary-foreground | `oklch(0.985104 0 0)` |
| secondary, muted, accent | `oklch(0.970151 0 0)` |
| secondary-foreground, accent-foreground | `oklch(0.204627 0 0)` |
| muted-foreground | `oklch(0.555527 0 0)` |
| destructive | `oklch(0.583043 0.238666 28.47648)` |
| destructive-foreground | `oklch(1 0 0)` |
| border, input | `oklch(0.921906 0 0)` |
| ring | `oklch(0.709 0 0)` |
| chart-1 | `oklch(0.808777 0.09905 251.753276)` |
| chart-2 | `oklch(0.620689 0.189427 259.935809)` |
| chart-3 | `oklch(0.549483 0.220236 263.091662)` |
| chart-4 | `oklch(0.48933 0.220186 264.040459)` |
| chart-5 | `oklch(0.421042 0.179192 266.009449)` |

### Dark

| Token | Value |
| --- | --- |
| background | `oklch(0.144788 0 0)` |
| foreground | `oklch(0.985104 0 0)` |
| card | `oklch(0.204627 0 0)` |
| card-foreground | `oklch(0.985104 0 0)` |
| popover, secondary, muted | `oklch(0.268618 0 0)` |
| popover-foreground, secondary-foreground | `oklch(0.985104 0 0)` |
| muted-foreground | `oklch(0.709 0 0)` |
| primary | `oklch(0.921906 0 0)` |
| primary-foreground | `oklch(0.204627 0 0)` |
| accent | `oklch(0.371495 0 0)` |
| accent-foreground | `oklch(0.985104 0 0)` |
| destructive | `oklch(0.702184 0.189226 22.227873)` |
| destructive-foreground | `oklch(0.985104 0 0)` |
| border | `oklch(0.276848 0 0)` |
| input | `oklch(0.325037 0 0)` |
| ring | `oklch(0.555527 0 0)` |
| chart-1 through chart-5 | same values as light |

Sidebar values from the source export are deliberately omitted.

### Typography, dimensions, shadows, and motion

- Sans: `ui-sans-serif`, `system-ui`, `-apple-system`,
  `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `Helvetica Neue`, `Arial`,
  `Noto Sans`, `sans-serif`, `Apple Color Emoji`, `Segoe UI Emoji`,
  `Segoe UI Symbol`, `Noto Color Emoji`.
- Serif: `ui-serif`, `Georgia`, `Cambria`, `Times New Roman`, `Times`, `serif`.
- Mono: `ui-monospace`, `SFMono-Regular`, `Menlo`, `Monaco`, `Consolas`,
  `Liberation Mono`, `Courier New`, `monospace`.
- Tracking: `0em`.
- Radius: base/lg `1.475rem`, sm `1.225rem`, md `1.35rem`, xl `1.725rem`.
- Spacing base: `0.3rem`; density: `1`.
- Motion: use the accepted canonical defaults because the source supplied no
  motion values: fast `150ms`, normal `200ms`, reduced-motion behavior
  preserved.
- Shadow color: canonical black; source profile offset X `0px`, offset Y
  `1px`, blur `3px`, spread `0px`, opacity `0.1`.
- Exact shadow tiers:
  - `2xs`, `xs`: `0 1px 3px 0px` black at 0.05.
  - `sm`, `default`: `0 1px 3px 0px` black at 0.10 plus
    `0 1px 2px -1px` black at 0.10.
  - `md`: first layer above plus `0 2px 4px -1px` black at 0.10.
  - `lg`: first layer above plus `0 4px 6px -1px` black at 0.10.
  - `xl`: first layer above plus `0 8px 10px -1px` black at 0.10.
  - `2xl`: `0 1px 3px 0px` black at 0.25.
  - Every listed layer has `inset: false`.

## Mutation and interaction contract

Preserve existing operations and add only:

- `setFontFamily { family: "sans" | "serif" | "mono", value: string[] }`
- `setTracking { value: <canonical em> }`
- `setRadiusBase { value: <canonical length> }`
- `setSpacingBase { value: <canonical length> }`
- `setShadowProfile { value: { color, opacity, blur, spread, offsetX, offsetY } }`

The existing color mutation/input boundary accepts the four supported input
families and stores canonical OKLCH. Invalid or non-finite/out-of-gamut input
fails deterministically without changing active state.

Manual controls use the same typed mutation/validation path as the product:
control change -> canonical mutation -> validation -> active in-memory theme ->
immediate preview. A valid manual change may update ordinary local persistence,
but must not silently Save a built-in theme or bypass fork/save rules. Invalid
numeric drafts remain local to the field and do not mutate theme state.

When a Design Command proposal is staged, proposal preview and Apply/Discard
remain authoritative. Manual controls must be disabled or otherwise prevented
from ambiguously mutating the active theme until the proposal is applied or
discarded. Generated proposals never become direct manual edits.

## TSV2 acceptance criteria

- **TSV2-01**: v2 is strict, canonical, deterministic, rejects unknown keys,
  and accepted v1 input migrates to v2 without silent semantic loss.
- **TSV2-02**: Default matches every in-scope value above; the conversion
  report records source, normalized value, precision policy, declared defaults,
  and unsupported sidebar/export boilerplate.
- **TSV2-03**: Quiet Editorial remains selectable and deterministically migrates
  to v2 with its accepted visual character preserved.
- **TSV2-04**: fresh Workbench state selects Default; a valid persisted theme
  selection remains selected; invalid/removed state falls back safely.
- **TSV2-05**: HEX, RGB(A), HSL(A), and OKLCH inputs normalize to canonical
  OKLCH with deterministic precision, alpha, rejection, and round-trip tests.
- **TSV2-06**: typography canonically supports sans/serif/mono arrays and
  tracking; renderer and export use those values without Workbench-only CSS.
- **TSV2-07**: radius/spacing/shadow tiers render canonically, and the editable
  shadow profile deterministically derives the full tier scale without a
  parallel shadow representation.
- **TSV2-08**: Slider is the sole new slider resource and passes contract,
  registry, keyboard, pointer, focus, disabled, mobile, dark/light, and axe
  coverage.
- **TSV2-09**: Collapsible is the sole new disclosure resource and passes
  contract, registry, keyboard, focus, state, mobile, dark/light, and axe
  coverage.
- **TSV2-10**: Workbench exposes the approved Typography and Other controls via
  accepted components/tokens, with slider + numeric field + visible units where
  applicable and no manual Apply button.
- **TSV2-11**: each valid manual change updates canonical active state and
  rendered computed styles immediately; invalid drafts do not mutate state.
- **TSV2-12**: persistence, built-in fork/save/export, validation, theme
  selection, reload, and v1 migration remain correct.
- **TSV2-13**: Design Command proposal stage/preview/Apply/Discard/stale and
  active-versus-staged behavior is unchanged and unambiguous alongside manual
  live editing.
- **TSV2-14**: public catalog is exactly 13 resources: the accepted 11 plus
  Slider and Collapsible. No other public component, schema family, token
  category, AI behavior, credential path, or network behavior is added.
- **TSV2-15**: full unit/type/build/registry/context/provenance/browser/bundle/
  credential/frozen-boundary regression passes. Browser evidence covers
  390x844 and 1440x900, light/dark, pointer and keyboard, reduced motion,
  containment, and decoded critical/serious axe results.

## Verification

Executable browser matrices and computed-style evidence cover the criteria above. The owner owns subjective visual acceptance of grouping, density, units, drag feedback, and active-versus-staged clarity.

## Frozen boundaries

- No public resources except Slider and Collapsible.
- No font-size, weight, line-height, sidebar-token, raw-CSS, arbitrary-token,
  new chart-control, or color-control UI expansion.
- No Design Command/Jev/LLM/MCP protocol expansion.
- No credentials, paid/API fallback, deployment, publishing, or external action.
- Do not inspect or reuse the abandoned WCP candidate.
