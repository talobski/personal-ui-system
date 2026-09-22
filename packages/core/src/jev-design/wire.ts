/**
 * Product-owned TypeSafe wire contract for the Jev Design command MVP.
 *
 * This module intentionally duplicates nothing from `@loop-engineering/jev-core` and must never import it: per
 * `docs/JEV_PRODUCT_ARCHITECTURE.md`, `DESIGN_COMMAND` (`personal-ui-design-command/1`) is a product-owned contract,
 * separate from the Loop Engineering control plane.
 *
 * These types are the *raw* `POST /v1/systemone` wire shapes, audited against the official TypeSafe API/SDK
 * contract (not the Loop adapter's normalized internal representation, which differs from the wire in several
 * fields — see the Lead correction on run `jev-design-command-producer-001`):
 *
 * - `questions` in the request is an object keyed by question id, not an array; a question body carries `type`,
 *   `instructions`, and `criteria` (a Choice option-id -> description map, a Score ordered scale array, or a Noul
 *   `{true, false}` object). Question ids are the object keys, never a field inside the question body.
 * - A Choice answer is `{choice, probabilities, confidence}` (not `selected`).
 * - A Score answer is `{score, legend, probabilities, confidence}`, where `score` may be fractional and `legend`
 *   is an object keyed by numeric-string indices ("0", "1", ...), not an ordered array or an integer `level`.
 * - A Noul answer is `{noul}` (not `value`).
 *
 * `questions.ts` keeps a clean product-owned internal catalog representation (with an explicit `id` field per
 * question, for ergonomic code); `toWireRequest` in `questions.ts` is the one audited conversion point from that
 * internal shape to the wire shape below. `accept.ts` validates raw wire answers directly against this contract.
 */

/** Fixed TypeSafe endpoint and model; there is no per-call selection. */
export const TYPESAFE_API_URL = "https://api.typesafe.ai/v1/systemone"
export const TYPESAFE_MODEL = "jev-latest"

export type WireChoiceQuestion = {
  type: "choice"
  instructions: string
  /** Option id -> description. */
  criteria: Record<string, string>
}

export type WireScoreQuestion = {
  type: "score"
  instructions: string
  /** Ordered scale labels, lowest to highest. */
  criteria: readonly string[]
}

export type WireNoulQuestion = {
  type: "noul"
  instructions: string
  criteria: { true: string; false: string }
}

export type WireQuestion = WireChoiceQuestion | WireScoreQuestion | WireNoulQuestion

export type TypeSafeRequest = {
  model: typeof TYPESAFE_MODEL
  state: Record<string, unknown>
  /** Keyed by question id. */
  questions: Record<string, WireQuestion>
}

/** Raw wire answer shapes. There is no `type` discriminator field on the wire; the caller knows the expected
 * primitive from the question it asked and validates the raw object against that primitive's exact field set. */
export type RawChoiceAnswer = { choice: unknown; probabilities: unknown; confidence: unknown }
export type RawScoreAnswer = { score: unknown; legend: unknown; probabilities: unknown; confidence: unknown }
export type RawNoulAnswer = { noul: unknown }

export type TypeSafeResponse = {
  /** Keyed by question id. Each value's shape is validated per-question by `accept.ts`, not by this type alone. */
  answers: Record<string, unknown>
}
