import { normalizeColor, parseLength } from "../theme/color"
import { admitRemLength, admitShadowProfile, deriveRadiusScale, deriveShadowTiers, MANUAL_CONTROL_BOUNDS, SHADOW_PROFILE_FIELDS } from "../theme/derive"
import type { ShadowProfile } from "../theme/derive"
import { COLOR_TOKENS, densitySchema, durationSchema, fontStackSchema, fontWeightSchema, isFontFamilyTarget, isSidebarColorToken, isTypeRole, SHADOW_TOKENS, syncUninitializedSidebarColors, themeSchema, LEGACY_UI_EFFECTS_FIELDS, normalizeLegacyUiEffects, trackingSchema, UI_EFFECTS_FIELDS, uiEffectSchema, uiEffectStrengthSchema, uiEffectsTokens } from "../theme/schema"
import type { ColorToken, FontFamilyTarget, LegacyUiEffectsValue, Theme, TypeRole, UiEffectsValue } from "../theme/schema"
import { renderShadcnTailwindCss } from "../theme/render"

export const MUTATION_SCHEMA_VERSION = "1.0"

const MODES = ["light", "dark"] as const
type Mode = (typeof MODES)[number]

/**
 * Closed operation union. There is no raw-CSS, path, file, bulk, or set-any-path operation. `setColor` selects a mode
 * and token from closed lists; the three typography operations select a `target` from a closed list (`heading | body |
 * mono` for font stacks, `heading | body` for the role-only weight and tracking); every other operation edits one fixed
 * target (documented per operation), so it carries no token or path field to select anything else.
 *
 * `setColor` accepts HEX, RGB(A), HSL(A), or OKLCH input; the stored value is canonical OKLCH. Its token list includes
 * the eight dedicated Sidebar colours; the first edit of one of them initializes the dedicated set (see below).
 */
export type SetColorOperation = { op: "setColor"; mode: Mode; token: ColorToken; value: string }
/** Sets `radius.md` alone (rendered `--radius-md`); the rest of the scale is kept. Non-negative dimension. */
export type SetRadiusOperation = { op: "setRadius"; value: string }
/** Sets `space.density`, the spacing multiplier. Number within the schema range. */
export type SetDensityOperation = { op: "setDensity"; value: number }
/** Sets `typography.<role>.weight`: an integer from 100 to 900 in steps of 100. Replaces the v2 `setSansFamily`. */
export type SetFontWeightOperation = { op: "setFontWeight"; target: TypeRole; value: number }
/** Sets the blur of the first layer of `shadow.md`. Non-negative dimension. */
export type SetShadowBlurOperation = { op: "setShadowBlur"; value: string }
/** Sets `motion.durationBase`, the default transition duration. */
export type SetMotionDurationOperation = { op: "setMotionDuration"; value: string }
/** Replaces a whole font stack: `typography.heading.font`, `typography.body.font`, or the `typography.mono` primitive. */
export type SetFontFamilyOperation = { op: "setFontFamily"; target: FontFamilyTarget; value: readonly string[] }
/** Sets `typography.<role>.tracking`, an em value within the tracking bounds. */
export type SetTrackingOperation = { op: "setTracking"; target: TypeRole; value: string }
/** Sets `radius.base` and derives the full `sm`/`md`/`lg`/`xl` scale from it (`theme/derive.ts`). */
export type SetRadiusBaseOperation = { op: "setRadiusBase"; value: string }
/** Sets `space.base`, the length the spacing scale is built on. */
export type SetSpacingBaseOperation = { op: "setSpacingBase"; value: string }
/** Derives all eight shadow tiers from one profile (`theme/derive.ts`); no profile is stored beside the tiers. */
export type SetShadowProfileOperation = { op: "setShadowProfile"; value: ShadowProfile }
/**
 * Sets `sidebar.useDedicatedTokens`: on, the Sidebar renders the dedicated Sidebar colours; off, their base aliases.
 * Stored dedicated values are kept either way. The first activation initializes the dedicated set from the current
 * resolved aliases in both modes, so switching on causes no visual change.
 */
export type SetSidebarTokensEnabledOperation = { op: "setSidebarTokensEnabled"; value: boolean }
/**
 * Replaces the whole optional `uiEffects` value (PUI-113, simplified by PUI-119): the closed effect (`off | tactile`)
 * and the integer strength 0..100. Both fields are required; no other field, target, selector, or CSS can be addressed.
 * Applying it to a theme without `uiEffects` creates the field. The exact prior four-field value (`effect: "tactile"`,
 * `outlineButtons`, `tabs`, `strength`, all required) is still admitted and normalized: either target on is Tactile,
 * both off is Off. Mixed, partial, or extended values are rejected.
 */
export type SetUiEffectsOperation = { op: "setUiEffects"; value: UiEffectsValue | LegacyUiEffectsValue }
export type ThemeOperation =
  | SetColorOperation
  | SetRadiusOperation
  | SetDensityOperation
  | SetFontWeightOperation
  | SetShadowBlurOperation
  | SetMotionDurationOperation
  | SetFontFamilyOperation
  | SetTrackingOperation
  | SetRadiusBaseOperation
  | SetSpacingBaseOperation
  | SetShadowProfileOperation
  | SetSidebarTokensEnabledOperation
  | SetUiEffectsOperation

export type MutationRequest = {
  schemaVersion: typeof MUTATION_SCHEMA_VERSION
  requestId: string
  base: { themeId: string; revision: number }
  operations: readonly ThemeOperation[]
}

export type MutationRuleId =
  | "mutation.invalid-request"
  | "mutation.unsupported-version"
  | "mutation.invalid-operations"
  | "mutation.invalid-operation"
  | "mutation.unknown-operation"
  | "mutation.unknown-field"
  | "mutation.invalid-mode"
  | "mutation.invalid-target"
  | "mutation.unknown-token"
  | "mutation.invalid-value"
  | "mutation.missing-target"
  | "mutation.base-mismatch"
  | "mutation.stale-revision"

export type MutationError = { ruleId: MutationRuleId; path: string }

export type MutationValidation =
  | { ok: true; request: MutationRequest }
  | { ok: false; errors: MutationError[] }

export type MutationResult =
  | { ok: true; theme: Theme; css: string }
  | { ok: false; errors: MutationError[] }

/**
 * Allowlisted keys per operation; also the closed set of operation names. Deliberately not exported: a Map is
 * mutable at runtime regardless of a `ReadonlyMap` type annotation (the annotation only blocks the compiler, not a
 * caller who narrows or casts around it), and this is the live allowlist `validateMutation` checks every request
 * against. External read access goes only through `describeOperations`, which returns an independent copy.
 */
const OPERATION_KEYS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["setColor", new Set(["op", "mode", "token", "value"])],
  ["setRadius", new Set(["op", "value"])],
  ["setDensity", new Set(["op", "value"])],
  ["setFontWeight", new Set(["op", "target", "value"])],
  ["setShadowBlur", new Set(["op", "value"])],
  ["setMotionDuration", new Set(["op", "value"])],
  ["setFontFamily", new Set(["op", "target", "value"])],
  ["setTracking", new Set(["op", "target", "value"])],
  ["setRadiusBase", new Set(["op", "value"])],
  ["setSpacingBase", new Set(["op", "value"])],
  ["setShadowProfile", new Set(["op", "value"])],
  ["setSidebarTokensEnabled", new Set(["op", "value"])],
  ["setUiEffects", new Set(["op", "value"])],
])
const REQUEST_KEYS = new Set(["schemaVersion", "requestId", "base", "operations"])

export type MutationOperationDescriptor = { name: string; fields: readonly string[] }

/**
 * A fresh, independent copy of the closed operation/field allowlist on every call — every array is newly allocated,
 * so mutating a returned descriptor (or the array it lives in) can never reach, and can never affect, the internal
 * `OPERATION_KEYS` map that `validateMutation` actually consults.
 */
export function describeOperations(): MutationOperationDescriptor[] {
  return [...OPERATION_KEYS.entries()].map(([name, fields]) => ({ name, fields: [...fields] }))
}

/** Radius and blur render straight into CSS, where a negative length is invalid. */
const nonNegativeDimension = (value: unknown) => {
  const parsed = parseLength(value)
  return parsed !== null && parsed.value >= 0
}

/** Value validators for the single-value operations. */
const VALUE_CHECKS: Record<string, (value: unknown) => boolean> = {
  setColor: (value) => normalizeColor(value).ok,
  setRadius: nonNegativeDimension,
  setDensity: (value) => densitySchema.safeParse(value).success,
  setFontWeight: (value) => fontWeightSchema.safeParse(value).success,
  setShadowBlur: nonNegativeDimension,
  setMotionDuration: (value) => durationSchema.safeParse(value).success,
  setFontFamily: (value) => fontStackSchema.safeParse(value).success,
  setTracking: (value) => trackingSchema.safeParse(value).success,
  setRadiusBase: (value) => admitRemLength(value, MANUAL_CONTROL_BOUNDS.radiusBase) !== null,
  setSpacingBase: (value) => admitRemLength(value, MANUAL_CONTROL_BOUNDS.spacingBase) !== null,
  setSidebarTokensEnabled: (value) => typeof value === "boolean",
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** Per-field checks for the closed canonical `setUiEffects` value; every field is required. */
const UI_EFFECTS_CHECKS: Record<(typeof UI_EFFECTS_FIELDS)[number], (value: unknown) => boolean> = {
  effect: (value) => uiEffectSchema.safeParse(value).success,
  strength: (value) => uiEffectStrengthSchema.safeParse(value).success,
}
/** Per-field checks for the exact prior four-field value; every field is required and `effect` must be `tactile`. */
const LEGACY_UI_EFFECTS_CHECKS: Record<(typeof LEGACY_UI_EFFECTS_FIELDS)[number], (value: unknown) => boolean> = {
  effect: (value) => value === "tactile",
  outlineButtons: (value) => typeof value === "boolean",
  tabs: (value) => typeof value === "boolean",
  strength: (value) => uiEffectStrengthSchema.safeParse(value).success,
}
/** A value naming either prior target field is validated as the whole legacy shape, never as a mixed one. */
const isLegacyUiEffectsInput = (value: Record<string, unknown>) => Object.hasOwn(value, "outlineButtons") || Object.hasOwn(value, "tabs")

/**
 * Validation order: request envelope, operation shape/allowlist, then values,
 * then base identity. Every failure carries a stable rule ID and canonical path.
 */
export function validateMutation(input: unknown, base: Pick<Theme, "id" | "revision">): MutationValidation {
  const errors: MutationError[] = []
  const fail = (ruleId: MutationRuleId, path: string) => errors.push({ ruleId, path })

  if (!isRecord(input)) return { ok: false, errors: [{ ruleId: "mutation.invalid-request", path: "" }] }

  for (const key of Object.keys(input)) if (!REQUEST_KEYS.has(key)) fail("mutation.unknown-field", key)
  if (input.schemaVersion !== MUTATION_SCHEMA_VERSION) fail("mutation.unsupported-version", "schemaVersion")
  if (typeof input.requestId !== "string" || input.requestId.length === 0) fail("mutation.invalid-request", "requestId")

  if (!isRecord(input.base) || typeof input.base.themeId !== "string" || !Number.isInteger(input.base.revision)) {
    fail("mutation.invalid-request", "base")
  } else {
    if (input.base.themeId !== base.id) fail("mutation.base-mismatch", "base.themeId")
    else if (input.base.revision !== base.revision) fail("mutation.stale-revision", "base.revision")
  }

  if (!Array.isArray(input.operations) || input.operations.length === 0) {
    fail("mutation.invalid-operations", "operations")
  } else {
    input.operations.forEach((operation: unknown, index) => {
      const at = `operations[${index}]`
      if (!isRecord(operation)) return fail("mutation.invalid-operation", at)
      const keys = typeof operation.op === "string" ? OPERATION_KEYS.get(operation.op) : undefined
      if (!keys) return fail("mutation.unknown-operation", `${at}.op`)
      for (const key of Object.keys(operation)) if (!keys.has(key)) fail("mutation.unknown-field", `${at}.${key}`)
      if (operation.op === "setColor") {
        if (!MODES.includes(operation.mode as Mode)) fail("mutation.invalid-mode", `${at}.mode`)
        if (!COLOR_TOKENS.includes(operation.token as ColorToken)) fail("mutation.unknown-token", `${at}.token`)
      }
      if (operation.op === "setFontFamily" && !isFontFamilyTarget(operation.target)) fail("mutation.invalid-target", `${at}.target`)
      if ((operation.op === "setFontWeight" || operation.op === "setTracking") && !isTypeRole(operation.target)) fail("mutation.invalid-target", `${at}.target`)
      if (operation.op === "setShadowProfile") {
        const value = operation.value
        if (!isRecord(value)) return fail("mutation.invalid-value", `${at}.value`)
        const allowed = new Set<string>(SHADOW_PROFILE_FIELDS)
        for (const key of Object.keys(value)) if (!allowed.has(key)) fail("mutation.unknown-field", `${at}.value.${key}`)
        const admission = admitShadowProfile(value)
        if (!admission.ok) for (const field of admission.invalid) fail("mutation.invalid-value", `${at}.value.${field}`)
      } else if (operation.op === "setUiEffects") {
        const value = operation.value
        if (!isRecord(value)) return fail("mutation.invalid-value", `${at}.value`)
        const [fields, checks] = isLegacyUiEffectsInput(value)
          ? [LEGACY_UI_EFFECTS_FIELDS, LEGACY_UI_EFFECTS_CHECKS as Record<string, (value: unknown) => boolean>]
          : [UI_EFFECTS_FIELDS, UI_EFFECTS_CHECKS as Record<string, (value: unknown) => boolean>]
        const allowed = new Set<string>(fields)
        for (const key of Object.keys(value)) if (!allowed.has(key)) fail("mutation.unknown-field", `${at}.value.${key}`)
        for (const field of fields) if (!checks[field]!(value[field])) fail("mutation.invalid-value", `${at}.value.${field}`)
      } else if (!VALUE_CHECKS[operation.op as string]!(operation.value)) {
        fail("mutation.invalid-value", `${at}.value`)
      }
    })
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, request: input as MutationRequest }
}

/**
 * Snapshots the dedicated Sidebar set: while uninitialized, copies the current resolved base aliases into it in both
 * modes (so earlier operations of the same request are reflected) and marks it initialized. Idempotent afterwards.
 */
function initializeSidebarColors(theme: Theme) {
  if (theme.sidebar.dedicatedValuesInitialized) return
  syncUninitializedSidebarColors(theme)
  theme.sidebar.dedicatedValuesInitialized = true
}

/** Pure: returns the next-revision candidate theme and its CSS; the input theme is never mutated. */
export function applyMutation(theme: Theme, input: unknown): MutationResult {
  const validation = validateMutation(input, theme)
  if (!validation.ok) return validation

  const next: Theme = structuredClone(theme)
  const missing: MutationError[] = []
  validation.request.operations.forEach((operation, index) => {
    switch (operation.op) {
      case "setColor":
        if (isSidebarColorToken(operation.token)) initializeSidebarColors(next)
        next.colors[operation.mode][operation.token].$value = (normalizeColor(operation.value) as { ok: true; value: string }).value
        break
      case "setSidebarTokensEnabled":
        if (operation.value) initializeSidebarColors(next)
        next.sidebar.useDedicatedTokens.$value = operation.value
        break
      case "setUiEffects": {
        const value = operation.value
        next.uiEffects = uiEffectsTokens("outlineButtons" in value ? normalizeLegacyUiEffects(value) : { effect: value.effect, strength: value.strength })
        break
      }
      case "setRadius":
        next.radius.md.$value = operation.value
        break
      case "setDensity":
        next.space.density.$value = operation.value
        break
      case "setFontWeight":
        next.typography[operation.target].weight.$value = operation.value
        break
      case "setShadowBlur": {
        // v2 tiers are non-empty, so this is defensive only: with no layer there is nothing to edit.
        const layer = next.shadow.md.$value[0]
        if (layer) layer.blur = operation.value
        else missing.push({ ruleId: "mutation.missing-target", path: `operations[${index}]` })
        break
      }
      case "setMotionDuration":
        next.motion.durationBase.$value = operation.value
        break
      case "setFontFamily":
        if (operation.target === "mono") next.typography.mono.$value = [...operation.value]
        else next.typography[operation.target].font.$value = [...operation.value]
        break
      case "setTracking":
        next.typography[operation.target].tracking.$value = trackingSchema.parse(operation.value)
        break
      case "setRadiusBase": {
        const scale = deriveRadiusScale(admitRemLength(operation.value, MANUAL_CONTROL_BOUNDS.radiusBase)!)
        for (const key of ["base", "sm", "md", "lg", "xl"] as const) next.radius[key].$value = scale[key]
        break
      }
      case "setSpacingBase":
        next.space.base.$value = admitRemLength(operation.value, MANUAL_CONTROL_BOUNDS.spacingBase)!
        break
      case "setShadowProfile": {
        const admission = admitShadowProfile(operation.value as unknown as Record<string, unknown>)
        if (!admission.ok) break
        const tiers = deriveShadowTiers(admission.profile)
        for (const tier of SHADOW_TOKENS) next.shadow[tier].$value = tiers[tier]
        break
      }
    }
  })
  if (missing.length > 0) return { ok: false, errors: missing }
  next.revision = theme.revision + 1

  // Defense in depth: the candidate must still be a schema-valid theme. Parsing also re-synchronizes an uninitialized
  // dedicated Sidebar set to the (possibly edited) base aliases.
  const checked = themeSchema.parse(next)
  return { ok: true, theme: checked, css: renderShadcnTailwindCss(checked) }
}
