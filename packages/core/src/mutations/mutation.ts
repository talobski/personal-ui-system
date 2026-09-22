import { COLOR_TOKENS, densitySchema, dimensionSchema, durationSchema, fontNameSchema, oklchSchema, themeSchema } from "../theme/schema"
import type { ColorToken, Theme } from "../theme/schema"
import { renderShadcnTailwindCss } from "../theme/render"

export const MUTATION_SCHEMA_VERSION = "1.0"

const MODES = ["light", "dark"] as const
type Mode = (typeof MODES)[number]

/**
 * Closed operation union: one typed operation per token category. There is no raw-CSS, path, file, bulk, or
 * set-any-path operation. Apart from `setColor`, each operation edits exactly one fixed, representative target
 * (documented per operation), so it carries no token or path field to select anything else.
 */
export type SetColorOperation = { op: "setColor"; mode: Mode; token: ColorToken; value: string }
/** Sets `radius.md`, the token behind the rendered `--radius`. Non-negative dimension. */
export type SetRadiusOperation = { op: "setRadius"; value: string }
/** Sets `space.density`, the spacing multiplier. Number within the schema range. */
export type SetDensityOperation = { op: "setDensity"; value: number }
/** Replaces the primary (first) family of the `typography.sans` stack; the fallbacks are kept. */
export type SetSansFamilyOperation = { op: "setSansFamily"; value: string }
/** Sets the blur of the first layer of `shadow.md`. Non-negative dimension. */
export type SetShadowBlurOperation = { op: "setShadowBlur"; value: string }
/** Sets `motion.durationBase`, the default transition duration. */
export type SetMotionDurationOperation = { op: "setMotionDuration"; value: string }
export type ThemeOperation =
  | SetColorOperation
  | SetRadiusOperation
  | SetDensityOperation
  | SetSansFamilyOperation
  | SetShadowBlurOperation
  | SetMotionDurationOperation

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
  ["setSansFamily", new Set(["op", "value"])],
  ["setShadowBlur", new Set(["op", "value"])],
  ["setMotionDuration", new Set(["op", "value"])],
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
const nonNegativeDimension = (value: unknown) =>
  dimensionSchema.safeParse(value).success && !(value as string).startsWith("-")

/** Value validators for the single-value operations. */
const VALUE_CHECKS: Record<string, (value: unknown) => boolean> = {
  setRadius: nonNegativeDimension,
  setDensity: (value) => densitySchema.safeParse(value).success,
  setSansFamily: (value) => fontNameSchema.safeParse(value).success,
  setShadowBlur: nonNegativeDimension,
  setMotionDuration: (value) => durationSchema.safeParse(value).success,
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

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
        if (!oklchSchema.safeParse(operation.value).success) fail("mutation.invalid-value", `${at}.value`)
      } else if (!VALUE_CHECKS[operation.op as string]!(operation.value)) {
        fail("mutation.invalid-value", `${at}.value`)
      }
    })
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, request: input as MutationRequest }
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
        next.modes[operation.mode].color[operation.token].$value = operation.value
        break
      case "setRadius":
        next.radius.md.$value = operation.value
        break
      case "setDensity":
        next.space.density.$value = operation.value
        break
      case "setSansFamily":
        next.typography.sans.$value[0] = operation.value
        break
      case "setShadowBlur": {
        // The schema admits an empty layer list; there is then nothing to edit.
        const layer = next.shadow.md.$value[0]
        if (layer) layer.blur = operation.value
        else missing.push({ ruleId: "mutation.missing-target", path: `operations[${index}]` })
        break
      }
      case "setMotionDuration":
        next.motion.durationBase.$value = operation.value
        break
    }
  })
  if (missing.length > 0) return { ok: false, errors: missing }
  next.revision = theme.revision + 1

  // Defense in depth: the candidate must still be a schema-valid theme.
  const checked = themeSchema.parse(next)
  return { ok: true, theme: checked, css: renderShadcnTailwindCss(checked) }
}
