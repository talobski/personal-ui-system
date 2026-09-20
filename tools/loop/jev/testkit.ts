import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { digestQuestions } from "./packet.ts"
import { nodeFs } from "./store.ts"
import { TimeoutError } from "./types.ts"
import type { Clock, FetchLike, JevFs, Question } from "./types.ts"

export const API_KEY = "tsk_live_SECRETVALUE1234567890"

export const POLICY = {
  schemaVersion: 1,
  ownerCeilings: { paidBudget: 0, maxCallsPerProject: 80 },
  routingPolicy: {
    billingClasses: { includedSubscription: true, temporaryCredit: false, separatelyBilled: false, automaticOverage: false, purchasedCredits: false },
  },
}

export const STATE = { projectId: "proj", phase: "EXECUTING", counters: { agentRuns: 0, calls: 0, attemptsByTask: {} }, pause: null }

export type Fixture = { dir: string; policyPath: string; statePath: string; eventsPath: string; loopDir: string }

export async function makeProject(overrides: { policy?: unknown; state?: unknown } = {}): Promise<Fixture> {
  const dir = await mkdtemp(join(tmpdir(), "jev-adapter-"))
  const loopDir = join(dir, ".loop")
  await mkdir(loopDir, { recursive: true })
  const policyPath = join(dir, "policy.json")
  await writeFile(policyPath, JSON.stringify(overrides.policy ?? POLICY))
  await writeFile(join(loopDir, "state.json"), JSON.stringify(overrides.state ?? STATE))
  return { dir, policyPath, statePath: join(loopDir, "state.json"), eventsPath: join(loopDir, "events.jsonl"), loopDir }
}

export const readState = async (fx: Fixture) => JSON.parse(await readFile(fx.statePath, "utf8"))
export const readEvents = async (fx: Fixture): Promise<Record<string, any>[]> => {
  try {
    return (await readFile(fx.eventsPath, "utf8")).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line))
  } catch {
    return []
  }
}
export const readDecision = async (fx: Fixture, runId = "run-1", decisionId = "dec-1") =>
  JSON.parse(await readFile(join(fx.loopDir, "runs", runId, "decisions", `${decisionId}.json`), "utf8"))

export const choiceQuestion = (over: Partial<Question> = {}): Question =>
  ({
    id: "next_action",
    type: "choice",
    instructions: "Pick the best next action.",
    options: [
      { id: "RESEARCH", description: "Gather evidence." },
      { id: "VERIFY", description: "Verify current work." },
      { id: "WAIT", description: "Wait." },
    ],
    ...over,
  }) as Question

export const scoreQuestion = (id = "difficulty"): Question => ({
  id,
  type: "score",
  instructions: "How difficult is the task?",
  scale: ["Trivial", "Moderate", "Hard"],
})

export const noulQuestion = (id = "human_pref"): Question => ({
  id,
  type: "noul",
  instructions: "Would human preference materially change the choice?",
  criteria: { true: "A named preference is at stake.", false: "No preference is at stake." },
})

export function makePacket(
  over: Record<string, unknown> = {},
  questions: Question[] = [choiceQuestion()],
  contract = "NEXT_ACTION",
  composition = { id: "direct-choice", version: "1" },
) {
  return {
    schemaVersion: "loop-jev-admission/1",
    projectId: "proj",
    runId: "run-1",
    decisionId: "dec-1",
    contract,
    composition,
    admission: {
      gate: "deterministic-gate/1",
      questionsDigest: digestQuestions(contract, questions),
      authority: {
        billingClass: "included-subscription",
        paidCapacity: false,
        permissionEscalation: false,
        verificationWaived: false,
        completionWaived: false,
        completionPreconditionsPassed: false,
      },
    },
    state: { round: 2, openCritiques: { blocker: 0, major: 1 } },
    questions,
    ...over,
  } as Record<string, any>
}

export const choiceAnswer = (choice = "RESEARCH", over: Record<string, unknown> = {}) => ({
  type: "choice",
  choice,
  confidence: 0.8,
  probabilities: { RESEARCH: 0.6, VERIFY: 0.3, WAIT: 0.1 },
  ...over,
})

export const scoreAnswer = (over: Record<string, unknown> = {}) => ({
  type: "score",
  score: 1.4,
  confidence: 0.7,
  legend: { "0": "Trivial", "1": "Moderate", "2": "Hard" },
  probabilities: { "0": 0.1, "1": 0.6, "2": 0.3 },
  ...over,
})

export const noulAnswer = (noul = 0.8) => ({ type: "noul", noul })

export type Recorded = { url: string; init: Parameters<FetchLike>[1] }

/** Mock transport. `respond` returns the JSON body (or a raw Response-like) for each request. */
export function mockFetch(respond: (body: any, call: number) => unknown) {
  const calls: Recorded[] = []
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, init })
    const result = respond(JSON.parse(init.body), calls.length) as { __raw?: { status: number; text: string } }
    if (result && result.__raw) return { ok: result.__raw.status >= 200 && result.__raw.status < 300, status: result.__raw.status, text: async () => result.__raw!.text }
    return { ok: true, status: 200, text: async () => JSON.stringify(result) }
  }
  return { fetch, calls }
}

export const answersResponse = (answers: Record<string, unknown>) => ({ answers })

export type FakeClock = Clock & { fireTimeout(): void; sleeps: number[] }

export function fakeClock(start = "2026-09-20T10:00:00.000Z"): FakeClock {
  let ms = Date.parse(start)
  let rejectTimer: ((error: Error) => void) | null = null
  const sleeps: number[] = []
  return {
    sleeps,
    now: () => new Date((ms += 10)),
    sleep: async (delay: number) => {
      sleeps.push(delay)
    },
    timeout() {
      const promise = new Promise<never>((_, reject) => {
        rejectTimer = (error) => reject(error)
      })
      promise.catch(() => {})
      return { promise, cancel: () => (rejectTimer = null) }
    },
    fireTimeout() {
      rejectTimer?.(new TimeoutError(0))
    },
  }
}

/** Records every path the adapter touches and can inject failures by operation + path substring. */
export function spyFs(fail: Partial<Record<keyof JevFs, string>> = {}) {
  const touched: { op: string; path: string }[] = []
  const wrap = <K extends keyof JevFs>(op: K): JevFs[K] =>
    (async (...args: any[]) => {
      touched.push({ op, path: String(args[0]) })
      const needle = fail[op]
      if (needle !== undefined && String(args[0]).includes(needle)) throw Object.assign(new Error(`injected ${op} failure`), { code: "EIO" })
      return (nodeFs[op] as any)(...args)
    }) as JevFs[K]
  const fs = Object.fromEntries((Object.keys(nodeFs) as (keyof JevFs)[]).map((op) => [op, wrap(op)])) as JevFs
  return { fs, touched }
}
