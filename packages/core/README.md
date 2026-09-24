# `@personal-ui/core` public consumption guide

`@personal-ui/core` is the public package for deterministic design-system retrieval, component-state validation, and non-committing theme proposals. Use its public barrel (`@personal-ui/core`) only; consumers do not need an internal module import or the workbench.

## Retrieve the available context

The read-only context CLI accepts exactly these commands:

```sh
node packages/core/src/context/bootstrap.mjs list --version personal-ui-context/1
node packages/core/src/context/bootstrap.mjs get --version personal-ui-context/1 --theme quiet-editorial --resource field
node packages/core/src/context/bootstrap.mjs capabilities --version personal-ui-context/1
```

`list` discovers the closed theme and resource ids. `get` returns the selected theme and resource contract. `capabilities` describes the closed theme-token operation union; it does not add operations. In a package-manager workspace, the equivalent public script is `pnpm context -- <same arguments>`.

Two built-in themes are served: `default` (the fresh-state theme) and `quiet-editorial` (the accepted v1 theme,
served migrated). Every theme is canonical `personal-ui-theme` v2 (`schemaVersion: "2.0"`): colours live at
`colors.{light,dark}.<token>` as canonical OKLCH, typography has `sans`/`serif`/`mono` stacks and an em `tracking`,
radius has `base`/`sm`/`md`/`lg`/`xl`, and shadows have eight layered tiers (`2xs` to `2xl`). `validateTheme` also
accepts v1 input and returns migrated v2; `normalizeColor` turns HEX, rgb(a), hsl(a), or oklch into canonical OKLCH.
The operation union adds `setFontFamily`, `setTracking`, `setRadiusBase` (derives the radius scale),
`setSpacingBase`, and `setShadowProfile` (derives all shadow tiers); `setColor` accepts the same four colour families.

The catalog contains sixteen resources. `slider` (single-thumb, forwards its name and value text to the Radix
thumb) and `collapsible` (one named disclosure region) are components; retrieve either with
`get --version personal-ui-context/1 --theme default --resource slider`. `select` (grouped rich single choice over
Base UI Select), `combobox` (searchable single choice over `@base-ui/react@1.8.0`), and `chart` (Recharts 3 with theme
chart tokens, the accessibility layer, and a required text summary) are components with deterministic
`select.*`, `combobox.*`, and `chart.*` state constraints; NativeSelect remains for native single choice. `resizable-panel` is the desktop layout
pattern backed by `react-resizable-panels@4.13.2`; retrieve it with
`get --version personal-ui-context/1 --theme quiet-editorial --resource resizable-panel`.
Its UI entry point exports `ResizablePanelGroup`, `ResizablePanel`, and
`ResizableHandle` from `@personal-ui/ui/components/resizable-panel`.
Numeric bounds are pixels. Use the library separator with an accessible name
and visible focus; replace the desktop split with full-width Tabs on mobile.
Example admissibility state:

```json
{"kind":"resizable-panel","minPx":352,"defaultPx":352,"maxPx":480,"separatorName":"Resize editor","primitiveSeparator":true,"visibleFocus":true}
```

## Public API

```ts
import { createProposalSession, evaluateContextRequest, stageProposal, validateComponentState } from "@personal-ui/core"
import type { MutationProposalV1 } from "@personal-ui/core"
```

Retrieve the theme before creating a proposal:

```ts
const retrieved = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "get", theme: "quiet-editorial", resource: "field" })
if (!retrieved.ok || retrieved.operation !== "get") throw new Error("context retrieval failed")
const activeTheme = retrieved.theme
```

### Validate a component composition

This complete Field composition is valid. The JSON is intentionally executable as a documentation contract.

<!-- afc09:field-state:start -->
```json
{
  "kind": "field-composition",
  "orientation": "responsive",
  "label": { "kind": "visible", "text": "Country", "htmlFor": "country" },
  "descriptionId": null,
  "control": {
    "kind": "native-select",
    "id": "country",
    "disabled": false,
    "invalid": true,
    "error": { "id": "country-error", "message": "Choose a country." },
    "ariaDescribedBy": ["country-error"],
    "mobileTextPx": 16,
    "options": [{ "label": "Philippines", "value": "ph" }],
    "value": "ph"
  }
}
```
<!-- afc09:field-state:end -->

```ts
const fieldState = /* JSON above */
const validation = validateComponentState(fieldState)
if (!validation.ok) throw new Error(JSON.stringify(validation.issues))
```

Component-state validation only admits or rejects structured component state. It does not mutate a theme.

### Stage a closed theme-token proposal

`stageProposal` has the exact signature:

```ts
stageProposal(session, activeTheme, proposal, now)
```

- `session` is the `ProposalSession` returned by `createProposalSession()` (or the session returned by a prior lifecycle call).
- `activeTheme` is the retrieved current `Theme`; its id and revision must match `proposal.base`.
- `proposal` is an unknown input validated as `MutationProposalV1` and then against the closed theme-token operation union.
- `now` is the RFC-3339 timestamp recorded for receipt and evaluation.

The following is a complete valid `MutationProposalV1`. Its `base` values come from the retrieved `activeTheme` above (`activeTheme.id` and `activeTheme.revision`); for the currently retrieved `quiet-editorial` fixture, those values are `quiet-editorial` and `1`.

<!-- afc09:valid-proposal:start -->
```json
{
  "schemaVersion": "1.0",
  "proposalId": "docs-valid-color",
  "base": { "themeId": "quiet-editorial", "revision": 1 },
  "provenance": { "source": "agent", "sourceId": "docs-guide", "createdAt": "2026-01-01T00:00:00Z" },
  "operations": [
    { "op": "setColor", "mode": "light", "token": "primary", "value": "oklch(0.4 0.05 260)" }
  ]
}
```
<!-- afc09:valid-proposal:end -->

```ts
const session = createProposalSession()
const proposal: MutationProposalV1 = /* JSON above */
const staged = stageProposal(session, activeTheme, proposal, "2026-01-01T00:00:00Z")
if (!staged.ok) throw new Error(JSON.stringify(staged.errors))
```

Staging mutates only the closed theme-token operation union into a candidate in the returned session. It never applies that candidate as the active theme; application is a later lifecycle step.

### Unsupported CSS/path escape attempt

Arbitrary CSS and arbitrary paths are not operations in the closed union. This complete proposal-shaped attempt is passed through the same lifecycle and is deterministically rejected with `mutation.unknown-operation` at `operations[0].op`.

<!-- afc09:set-css-attempt:start -->
```json
{
  "schemaVersion": "1.0",
  "proposalId": "docs-set-css-rejection",
  "base": { "themeId": "quiet-editorial", "revision": 1 },
  "provenance": { "source": "agent", "sourceId": "docs-guide", "createdAt": "2026-01-01T00:00:00Z" },
  "operations": [
    { "op": "setCss", "path": "/any/arbitrary/path.css", "value": "body { color: rebeccapurple; }" }
  ]
}
```
<!-- afc09:set-css-attempt:end -->

```ts
const rejected = stageProposal(createProposalSession(), activeTheme, /* JSON above */, "2026-01-01T00:00:00Z")
if (rejected.ok) throw new Error("unexpectedly staged")
// rejected.errors is [{ ruleId: "mutation.unknown-operation", path: "operations[0].op" }]
```
