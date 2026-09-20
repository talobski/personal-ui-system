import { COLOR_TOKENS, oklchSchema, themeSchema } from "../theme/schema"
import type { ColorToken, Theme } from "../theme/schema"
import { renderShadcnTailwindCss } from "../theme/render"

export const MUTATION_SCHEMA_VERSION = "1.0"

const MODES = ["light", "dark"] as const
type Mode = (typeof MODES)[number]

/** Closed operation union. V1 admits exactly one operation; there is no raw-CSS, path, or file operation. */
export type SetColorOperation = { op: "setColor"; mode: Mode; token: ColorToken; value: string }
export type ThemeOperation = SetColorOperation

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
  | "mutation.base-mismatch"
  | "mutation.stale-revision"

export type MutationError = { ruleId: MutationRuleId; path: string }

export type MutationValidation =
  | { ok: true; request: MutationRequest }
  | { ok: false; errors: MutationError[] }

export type MutationResult =
  | { ok: true; theme: Theme; css: string }
  | { ok: false; errors: MutationError[] }

const SET_COLOR_KEYS = new Set(["op", "mode", "token", "value"])
const REQUEST_KEYS = new Set(["schemaVersion", "requestId", "base", "operations"])

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
      if (operation.op !== "setColor") return fail("mutation.unknown-operation", `${at}.op`)
      for (const key of Object.keys(operation)) if (!SET_COLOR_KEYS.has(key)) fail("mutation.unknown-field", `${at}.${key}`)
      if (!MODES.includes(operation.mode as Mode)) fail("mutation.invalid-mode", `${at}.mode`)
      if (!COLOR_TOKENS.includes(operation.token as ColorToken)) fail("mutation.unknown-token", `${at}.token`)
      if (!oklchSchema.safeParse(operation.value).success) fail("mutation.invalid-value", `${at}.value`)
    })
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, request: input as MutationRequest }
}

/** Pure: returns the next-revision candidate theme and its CSS; the input theme is never mutated. */
export function applyMutation(theme: Theme, input: unknown): MutationResult {
  const validation = validateMutation(input, theme)
  if (!validation.ok) return validation

  const next: Theme = structuredClone(theme)
  for (const operation of validation.request.operations) {
    next.modes[operation.mode].color[operation.token].$value = operation.value
  }
  next.revision = theme.revision + 1

  // Defense in depth: the candidate must still be a schema-valid theme.
  const checked = themeSchema.parse(next)
  return { ok: true, theme: checked, css: renderShadcnTailwindCss(checked) }
}
