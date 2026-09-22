/**
 * Product-owned TypeSafe wire contract for the Jev Design command MVP.
 *
 * This module intentionally duplicates nothing from `@loop-engineering/jev-core` and must never import it: per
 * `docs/JEV_PRODUCT_ARCHITECTURE.md`, `DESIGN_COMMAND` (`personal-ui-design-command/1`) is a product-owned contract,
 * separate from the Loop Engineering control plane. The wire shape below (`{model, state, questions}` request,
 * `{answers}` response) and the fixed endpoint/model/acceptance rules are the documented TypeSafe API/SDK contract
 * itself (`docs/JEV_OFFICIAL_SOURCE_PACKET.md` sources #15-16, restated for the control-plane adapter in
 * `docs/JEV_ADAPTER.md`), not control-plane policy, so reusing them here is not a boundary violation.
 */

/** Fixed TypeSafe endpoint and model; there is no per-call selection. */
export const TYPESAFE_API_URL = "https://api.typesafe.ai/v1/systemone"
export const TYPESAFE_MODEL = "jev-latest"

export type ChoiceQuestion = {
  id: string
  type: "choice"
  instructions: string
  options: readonly { id: string; description: string }[]
}

export type ScoreQuestion = {
  id: string
  type: "score"
  instructions: string
  scale: readonly string[]
}

export type NoulQuestion = {
  id: string
  type: "noul"
  instructions: string
  criteria: { true: string; false: string }
}

export type TypeSafeQuestion = ChoiceQuestion | ScoreQuestion | NoulQuestion

export type TypeSafeRequest = {
  model: typeof TYPESAFE_MODEL
  state: Record<string, unknown>
  questions: readonly TypeSafeQuestion[]
}

export type ChoiceAnswer = {
  type: "choice"
  selected: string
  probabilities: Record<string, number>
  confidence: number
}

export type ScoreAnswer = {
  type: "score"
  level: number
  legend: readonly string[]
  confidence: number
}

export type NoulAnswer = {
  type: "noul"
  value: number
}

export type TypeSafeAnswer = ChoiceAnswer | ScoreAnswer | NoulAnswer

export type TypeSafeResponse = {
  answers: Record<string, TypeSafeAnswer>
}
