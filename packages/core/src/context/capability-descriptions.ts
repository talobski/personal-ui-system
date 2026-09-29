import { describeOperations } from "../mutations/mutation"
import { compareCodeUnits } from "./ordering"
import type { MutationOperationCapability } from "./types"

/**
 * Human-readable value constraints per mutation operation. Operation/field names come from `describeOperations()`
 * (a fresh copy of the mutation module's own closed set on every call), never duplicated here; `context.capabilities
 * .test.ts` asserts this map's key set equals that set, so an operation added to the mutation union without an entry
 * here fails the suite instead of leaving capabilities silently inaccurate. Frozen: this is a shared singleton read
 * on every `capabilities` call.
 */
export const VALUE_CONSTRAINT_DESCRIPTIONS: Readonly<Record<string, string>> = Object.freeze({
  setColor:
    "HEX, rgb(a), hsl(a), or oklch colour inside the Display P3 gamut; stored as canonical oklch(L C H [/ A]); tokens include the eight dedicated sidebar colours (sidebar, sidebar-foreground, sidebar-primary, sidebar-primary-foreground, sidebar-accent, sidebar-accent-foreground, sidebar-border, sidebar-ring)",
  setRadius: "non-negative rem/px/em dimension for radius.md",
  setDensity: "number from 0.5 to 2",
  setFontWeight: "target heading|body and an integer font weight from 100 to 900 in steps of 100",
  setShadowBlur: "non-negative rem/px/em dimension",
  setMotionDuration: "non-negative ms/s duration",
  setFontFamily: "target heading|body|mono and an ordered array of 1 to 16 font names; heading and body are the semantic typography roles, mono the code font primitive",
  setTracking: "target heading|body and an em value from -0.25em to 0.25em",
  setRadiusBase: "rem/px length from 0 to 2.5rem; derives radius sm/md/lg/xl",
  setSpacingBase: "rem/px length from 0.1rem to 0.5rem",
  setShadowProfile: "{ color: opaque colour, opacity: 0..1, blur: 0..64px, spread/offsetX/offsetY: -32..32px }; derives all eight shadow tiers",
  setSidebarTokensEnabled: "boolean; true renders the dedicated sidebar colours, false renders their base semantic aliases; stored dedicated values are kept either way",
  setUiEffects: "{ effect: \"off\" | \"tactile\", strength: integer 0..100 }, both required; replaces the optional uiEffects value; tactile gives Secondary buttons a strength-scaled recipe and surface tabs lists one fixed ring, independent of strength; absent uiEffects is off; the exact prior { effect: \"tactile\", outlineButtons, tabs, strength } value is normalized (either target on is tactile, both off is off)",
})

/** Builds a fresh array/object graph every call; safe to return directly without additional copying or freezing. */
export function mutationOperationCapabilities(): MutationOperationCapability[] {
  return describeOperations()
    .map(({ name, fields }) => ({
      name,
      fields: [...fields].sort(compareCodeUnits),
      valueConstraint: VALUE_CONSTRAINT_DESCRIPTIONS[name] ?? "undescribed",
    }))
    .sort((a, b) => compareCodeUnits(a.name, b.name))
}

/** Frozen: a shared singleton read on every `capabilities` call. */
export const UNSUPPORTED_ESCAPE_HATCHES = Object.freeze([
  "arbitrary CSS declarations, selectors, or raw stylesheet text",
  "arbitrary or caller-supplied filesystem paths",
  "generic set-any-path or JSON-pointer style operations",
  "bulk or multi-target operations beyond the declared per-proposal operation limit",
  "new mutation operations, themes, components, or contracts beyond the closed catalog",
  "natural-language command interpretation or model-provider configuration",
  "network access, credentials, or MCP/tool coordination",
] as const)
