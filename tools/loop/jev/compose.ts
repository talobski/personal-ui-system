import type { AcceptedAnswer, Composer, Json, Question } from "./types.ts"

/**
 * Smallest versioned composition surface. Built-ins only restate accepted
 * typed answers; any weighting/mapping (for example CONVERGENCE thresholds)
 * belongs in gate code that injects its own versioned Composer.
 */

const onlyType = (questions: readonly Question[], type: Question["type"], label: string): string | null =>
  questions.length === 1 && questions[0]?.type === type ? null : `${label} requires exactly one ${type} question`

const describe = (answer: AcceptedAnswer): Json => {
  if (answer.type === "choice") return { type: "choice", selected: answer.choice }
  if (answer.type === "score") return { type: "score", score: answer.score }
  return { type: "noul", value: answer.noul, interpretation: answer.interpretation }
}

export const directChoice: Composer = {
  id: "direct-choice",
  version: "1",
  validate: (questions) => onlyType(questions, "choice", "direct-choice/1"),
  compose(answers, questions) {
    const id = (questions[0] as Question).id
    const answer = answers[id]
    if (answer?.type !== "choice") throw new Error("direct-choice/1 received a non-choice answer")
    return { kind: "choice", questionId: id, selected: answer.choice }
  },
}

export const directNoul: Composer = {
  id: "direct-noul",
  version: "1",
  validate: (questions) => onlyType(questions, "noul", "direct-noul/1"),
  compose(answers, questions) {
    const id = (questions[0] as Question).id
    const answer = answers[id]
    if (answer?.type !== "noul") throw new Error("direct-noul/1 received a non-noul answer")
    return { kind: "noul", questionId: id, value: answer.noul, interpretation: answer.interpretation }
  },
}

export const acceptedBatch: Composer = {
  id: "accepted-batch",
  version: "1",
  validate: (questions) => (questions.length >= 1 ? null : "accepted-batch/1 requires at least one question"),
  compose(answers, questions) {
    const out: Record<string, Json> = {}
    for (const question of questions) {
      const answer = answers[question.id]
      if (answer === undefined) throw new Error(`accepted-batch/1 is missing an answer for "${question.id}"`)
      out[question.id] = describe(answer)
    }
    return { kind: "batch", answers: out }
  },
}

export const BUILTIN_COMPOSERS: readonly Composer[] = [directChoice, directNoul, acceptedBatch]

export const composerKey = (id: string, version: string): string => `${id}/${version}`

export function buildComposerRegistry(extra: readonly Composer[] = []): Map<string, Composer> {
  const registry = new Map<string, Composer>()
  for (const composer of [...BUILTIN_COMPOSERS, ...extra]) {
    const key = composerKey(composer.id, composer.version)
    if (registry.has(key)) throw new Error(`duplicate composer ${key}`)
    registry.set(key, composer)
  }
  return registry
}
