import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { rm, writeFile } from "node:fs/promises"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { runDecision } from "./adapter.ts"
import type { AdapterOptions } from "./adapter.ts"
import {
  API_KEY,
  POLICY,
  STATE,
  answersResponse,
  choiceAnswer,
  choiceQuestion,
  fakeClock,
  makePacket,
  makeProject,
  mockFetch,
  noulAnswer,
  noulQuestion,
  readDecision,
  readEvents,
  readState,
  scoreAnswer,
  scoreQuestion,
  spyFs,
} from "./testkit.ts"
import type { Fixture } from "./testkit.ts"
import { JEV_ENDPOINT } from "./types.ts"
import type { Composer, JevFs } from "./types.ts"

type Respond = Parameters<typeof mockFetch>[0]

async function run(fx: Fixture, packet: unknown, respond: Respond, extra: Partial<AdapterOptions> = {}) {
  const transport = mockFetch(respond)
  const clock = fakeClock()
  const outcome = await runDecision(packet, {
    projectDir: fx.dir,
    policyPath: fx.policyPath,
    apiKey: API_KEY,
    fetch: transport.fetch,
    clock,
    lockRetries: 3,
    lockRetryMs: 1,
    ...extra,
  })
  return { outcome, calls: transport.calls, clock }
}

const okChoice = () => answersResponse({ next_action: choiceAnswer() })

describe("successful decisions", () => {
  it("runs a direct Choice against the fixed endpoint with only admitted content", async () => {
    const fx = await makeProject()
    const { outcome, calls } = await run(fx, makePacket(), okChoice)
    expect(outcome).toMatchObject({
      accepted: true,
      status: "accepted",
      reason: null,
      output: { kind: "choice", questionId: "next_action", selected: "RESEARCH" },
      composition: { id: "direct-choice", version: "1" },
      fallback: null,
      pause: null,
      attempt: 1,
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]!.url).toBe(JEV_ENDPOINT)
    expect(calls[0]!.url).toBe("https://api.typesafe.ai/v1/systemone")
    expect(calls[0]!.init.method).toBe("POST")
    expect(calls[0]!.init.headers).toMatchObject({ Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" })
    expect(JSON.parse(calls[0]!.init.body)).toEqual({
      model: "jev-latest",
      state: { round: 2, openCritiques: { blocker: 0, major: 1 } },
      questions: {
        next_action: {
          type: "choice",
          instructions: "Pick the best next action.",
          criteria: { RESEARCH: "Gather evidence.", VERIFY: "Verify current work.", WAIT: "Wait." },
        },
      },
    })
  })

  it("accepts a direct Noul in both directions", async () => {
    for (const [value, interpretation] of [[0.9, "yes"], [0.1, "no"]] as const) {
      const fx = await makeProject()
      const packet = makePacket({}, [noulQuestion()], "HUMAN_INTERRUPT", { id: "direct-noul", version: "1" })
      const { outcome } = await run(fx, packet, () => answersResponse({ human_pref: noulAnswer(value) }))
      expect(outcome).toMatchObject({ accepted: true, output: { kind: "noul", questionId: "human_pref", value, interpretation } })
    }
  })

  it("accepts a shared-state Choice+Score+Noul batch as one call", async () => {
    const fx = await makeProject()
    const outcomeQuestion = choiceQuestion({ id: "outcome", options: [{ id: "CONTINUE", description: "Go." }, { id: "SYNTHESIZE", description: "Consolidate." }] } as any)
    const packet = makePacket({}, [outcomeQuestion, scoreQuestion(), noulQuestion()], "CONVERGENCE", { id: "accepted-batch", version: "1" })
    const { outcome, calls } = await run(fx, packet, () =>
      answersResponse({
        outcome: choiceAnswer("CONTINUE", { probabilities: { CONTINUE: 0.7, SYNTHESIZE: 0.3 } }),
        difficulty: scoreAnswer(),
        human_pref: noulAnswer(0.2),
      }),
    )
    expect(calls).toHaveLength(1)
    expect(Object.keys(JSON.parse(calls[0]!.init.body).questions)).toEqual(["outcome", "difficulty", "human_pref"])
    expect(outcome.accepted).toBe(true)
    expect(outcome.output).toEqual({
      kind: "batch",
      answers: {
        outcome: { type: "choice", selected: "CONTINUE" },
        difficulty: { type: "score", score: 1.4 },
        human_pref: { type: "noul", value: 0.2, interpretation: "no" },
      },
    })
    expect((await readState(fx)).counters.calls).toBe(1)
  })

  it("supports injected versioned composers without letting them replace built-ins", async () => {
    const fx = await makeProject()
    const convergence: Composer = {
      id: "convergence-thresholds",
      version: "1",
      validate: () => null,
      compose: (answers) => ({ continue: (answers.difficulty as any).score >= 1.5 }),
    }
    const packet = makePacket({}, [scoreQuestion()], "MODEL_CLASS", { id: "convergence-thresholds", version: "1" })
    const { outcome } = await run(fx, packet, () => answersResponse({ difficulty: scoreAnswer({ score: 1.6 }) }), { composers: [convergence] })
    expect(outcome).toMatchObject({ accepted: true, output: { continue: true } })
    await expect(run(fx, makePacket(), okChoice, { composers: [{ ...convergence, id: "direct-choice" }] })).rejects.toThrow(/duplicate composer/)
  })
})

describe("audit records", () => {
  it("writes a complete decision record and request/result events under project .loop", async () => {
    const fx = await makeProject()
    const packet = makePacket({ state: { round: 2, apiKey: "sk-should-not-appear", nested: { password: "hunter2" } } })
    const { outcome } = await run(fx, packet, okChoice)
    expect(outcome.decisionPath).toBe(join(fx.loopDir, "runs", "run-1", "decisions", "dec-1.json"))

    const record = await readDecision(fx)
    expect(record).toMatchObject({
      schemaVersion: "loop-jev-decision/1",
      projectId: "proj",
      runId: "run-1",
      decisionId: "dec-1",
      contract: "NEXT_ACTION",
      outputContract: { contract: "NEXT_ACTION", composition: { id: "direct-choice", version: "1" } },
      status: "completed",
      accepted: true,
      reason: null,
      fallback: null,
      pause: null,
      state: { round: 2, apiKey: "[REDACTED]", nested: { password: "[REDACTED]" } },
      attempt: { number: 1, httpStatus: 200, endpoint: JEV_ENDPOINT, model: "jev-latest" },
      composition: { id: "direct-choice", version: "1", output: { kind: "choice", questionId: "next_action", selected: "RESEARCH" } },
    })
    expect(record.questions[0]).toMatchObject({ id: "next_action", type: "choice", options: [{ id: "RESEARCH" }, { id: "VERIFY" }, { id: "WAIT" }] })
    expect(record.answers.next_action).toMatchObject({
      primitive: "choice",
      accepted: true,
      typed: { type: "choice", choice: "RESEARCH", confidence: 0.8, probabilities: { RESEARCH: 0.6, VERIFY: 0.3, WAIT: 0.1 } },
    })
    expect(record.admission.authority.paidCapacity).toBe(false)

    const events = await readEvents(fx)
    expect(events.map((event) => event.type)).toEqual(["jev.decision.requested", "jev.decision.resolved"])
    expect(events[0]).toMatchObject({ runId: "run-1", decisionId: "dec-1", contract: "NEXT_ACTION", attempt: 1, questions: [{ id: "next_action", primitive: "choice" }] })
    expect(events[1]).toMatchObject({ accepted: true, reason: null, attempt: 1, decisionPath: "runs/run-1/decisions/dec-1.json" })
    for (const event of events) expect(event.schemaVersion).toBe("loop-jev-event/1")
  })

  it("logs Score legends, probabilities and Noul values for accepted batches", async () => {
    const fx = await makeProject()
    const packet = makePacket({}, [scoreQuestion(), noulQuestion()], "WORKER_FAN_OUT", { id: "accepted-batch", version: "1" })
    await run(fx, packet, () => answersResponse({ difficulty: scoreAnswer(), human_pref: noulAnswer(0.75) }))
    const record = await readDecision(fx)
    expect(record.answers.difficulty.typed).toMatchObject({ score: 1.4, confidence: 0.7, legend: { "0": "Trivial", "1": "Moderate", "2": "Hard" }, probabilities: { "1": 0.6 } })
    expect(record.answers.human_pref.typed).toMatchObject({ noul: 0.75, interpretation: "yes" })
    expect(record.questions.map((q: any) => q.type)).toEqual(["score", "noul"])
  })

  it("never writes credentials anywhere under .loop, including via error messages and raw answers", async () => {
    const fx = await makeProject()
    const packet = makePacket({ state: { note: `token=${API_KEY}`, headers: { Authorization: `Bearer ${API_KEY}` }, cookie: "sid=1" } })
    await run(fx, packet, () => {
      throw new Error(`connect failed for Bearer ${API_KEY}`)
    })
    const fx2 = await makeProject()
    await run(fx2, makePacket(), () => answersResponse({ next_action: { ...choiceAnswer(), confidence: 0.1, leak: API_KEY, token: "abc" } }))
    for (const root of [fx.loopDir, fx2.loopDir]) {
      for (const file of walk(root)) {
        const text = readFileSync(file, "utf8")
        expect(text, file).not.toContain(API_KEY)
        expect(text, file).not.toContain("sid=1")
      }
    }
    expect(JSON.stringify((await readDecision(fx2)).answers)).toContain("[REDACTED]")
  })

  it("only touches project-local .loop files and the policy, never a research log", async () => {
    const fx = await makeProject()
    const spy = spyFs()
    await run(fx, makePacket(), okChoice, { fs: spy.fs })
    await run(fx, makePacket({ decisionId: "dec-2" }), () => ({ __raw: { status: 500, text: "boom" } }), { fs: spy.fs })
    expect(spy.touched.length).toBeGreaterThan(0)
    for (const { path } of spy.touched) {
      const inside = path === fx.policyPath || relative(fx.loopDir, path).split("/")[0] !== ".."
      expect(inside, path).toBe(true)
      expect(path).not.toMatch(/research|jev-log/)
    }
    expect(spy.touched.some((entry) => entry.op === "appendFile" && entry.path === fx.eventsPath)).toBe(true)
  })

  it("adapter source never references the research log or research directory", () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const sources = readdirSync(here).filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    expect(sources.length).toBeGreaterThan(5)
    for (const name of sources) {
      const text = readFileSync(join(here, name), "utf8")
      expect(text, name).not.toMatch(/jev-log/)
      expect(text, name).not.toMatch(/research\//)
    }
  })
})

describe("budget and authority before transport", () => {
  const denied = async (fx: Fixture, code: string, packet: unknown = makePacket()) => {
    const before = await readState(fx)
    const { outcome, calls } = await run(fx, packet, okChoice)
    expect(calls).toHaveLength(0)
    expect(outcome).toMatchObject({ accepted: false, output: null, reason: { code } })
    expect(await readState(fx)).toEqual(before)
    const events = await readEvents(fx)
    expect(events.at(-1)).toMatchObject({ accepted: false, reason: { code } })
    expect(existsSync(join(fx.loopDir, "runs"))).toBe(false)
    return outcome
  }

  it("denies when the global call ceiling is exhausted", async () => {
    const fx = await makeProject({ state: { ...STATE, counters: { ...STATE.counters, calls: 80 } } })
    await denied(fx, "denied.call-budget")
  })
  it("denies when the project call budget is lower than the global one", async () => {
    const fx = await makeProject({ state: { ...STATE, counters: { ...STATE.counters, calls: 3 }, budgets: { maxCalls: 3 } } })
    await denied(fx, "denied.call-budget")
  })
  it("allows the last call within budget and denies the next", async () => {
    const fx = await makeProject({ state: { ...STATE, counters: { ...STATE.counters, calls: 2 }, budgets: { maxCalls: 3 } } })
    expect((await run(fx, makePacket(), okChoice)).outcome.accepted).toBe(true)
    expect((await readState(fx)).counters.calls).toBe(3)
    const second = await run(fx, makePacket({ decisionId: "dec-2" }), okChoice)
    expect(second.calls).toHaveLength(0)
    expect(second.outcome.reason?.code).toBe("denied.call-budget")
  })
  it("denies a non-zero paidBudget in policy or project state", async () => {
    await denied(await makeProject({ policy: { ...POLICY, ownerCeilings: { ...POLICY.ownerCeilings, paidBudget: 5 } } }), "denied.paid-budget")
    await denied(await makeProject({ state: { ...STATE, budgets: { paidBudget: 1 } } }), "denied.paid-budget")
  })
  it("denies on unreadable or malformed policy and state", async () => {
    await denied(await makeProject({ policy: { ownerCeilings: {} } }), "denied.paid-budget")
    await denied(await makeProject({ policy: { ownerCeilings: { paidBudget: 0 } } }), "denied.policy-unavailable")
    await denied(await makeProject({ policy: { ownerCeilings: { paidBudget: 0, maxCallsPerProject: 5 } } }), "denied.policy-unavailable")
    await denied(await makeProject({ policy: [] }), "denied.policy-unavailable")
    await denied(await makeProject({ state: { ...STATE, counters: {} } }), "denied.state-unavailable")
    await denied(await makeProject({ state: { ...STATE, counters: { calls: -1 } } }), "denied.state-unavailable")
    await denied(await makeProject({ state: { ...STATE, budgets: { maxCalls: "many" } } }), "denied.state-unavailable")
    await denied(await makeProject({ state: [] }), "denied.state-unavailable")
    const missing = await makeProject()
    const transport = mockFetch(okChoice)
    const outcome = await runDecision(makePacket(), { projectDir: missing.dir, policyPath: join(missing.dir, "nope.json"), apiKey: API_KEY, fetch: transport.fetch, clock: fakeClock(), lockRetries: 1, lockRetryMs: 1 })
    expect(outcome.reason?.code).toBe("denied.policy-unavailable")
    expect(transport.calls).toHaveLength(0)
  })
  it("denies when .loop/state.json is absent or not JSON", async () => {
    for (const contents of [null, "not json"]) {
      const fx = await makeProject()
      if (contents === null) await rm(fx.statePath)
      else await writeFile(fx.statePath, contents)
      const { outcome, calls } = await run(fx, makePacket(), okChoice)
      expect(calls).toHaveLength(0)
      expect(outcome).toMatchObject({ accepted: false, status: "denied", reason: { code: "denied.state-unavailable" } })
    }
  })
  it("rejects a packet for another project", async () => {
    const fx = await makeProject()
    const outcome = await denied(fx, "packet.unauthorized", makePacket({ projectId: "other" }))
    expect(outcome.status).toBe("rejected")
  })
  it("denies a missing or empty API key without charging", async () => {
    for (const apiKey of [undefined, ""]) {
      const fx = await makeProject()
      const before = await readState(fx)
      const transport = mockFetch(okChoice)
      const outcome = await runDecision(makePacket(), { projectDir: fx.dir, policyPath: fx.policyPath, apiKey, fetch: transport.fetch, clock: fakeClock(), lockRetries: 1, lockRetryMs: 1 })
      expect(outcome).toMatchObject({ accepted: false, status: "denied", reason: { code: "denied.missing-api-key" } })
      expect(transport.calls).toHaveLength(0)
      expect(await readState(fx)).toEqual(before)
    }
  })
  it("rejects every unsafe packet before transport, without charging", async () => {
    const auth = (patch: Record<string, unknown>) => {
      const packet = makePacket()
      packet.admission.authority = { ...packet.admission.authority, ...patch }
      return packet
    }
    const cases: [string, unknown][] = [
      ["packet.empty", makePacket({ questions: [] })],
      ["packet.inconsistent", (() => { const p = makePacket(); p.questions[0].options.pop(); return p })()],
      ["packet.duplicate-option", makePacket({}, [choiceQuestion({ options: [{ id: "A1", description: "a" }, { id: "A1", description: "b" }] } as any)], "PROVIDER_FALLBACK")],
      ["packet.duplicate-question", makePacket({}, [scoreQuestion("a"), scoreQuestion("a")], "MODEL_CLASS", { id: "accepted-batch", version: "1" })],
      ["packet.unauthorized", makePacket({ contract: "SUDO" })],
      ["packet.paid-capacity", auth({ paidCapacity: true })],
      ["packet.permission-escalation", auth({ permissionEscalation: true })],
      ["packet.verification-waived", auth({ verificationWaived: true })],
      ["packet.completion-waived", auth({ completionWaived: true })],
      ["packet.state-invalid", makePacket({ state: { blob: "x".repeat(40_000) } })],
    ]
    for (const [code, packet] of cases) {
      const fx = await makeProject()
      const before = await readState(fx)
      const { outcome, calls } = await run(fx, packet, okChoice)
      expect(calls, code).toHaveLength(0)
      expect(outcome, code).toMatchObject({ accepted: false, status: "rejected", reason: { code } })
      expect(await readState(fx), code).toEqual(before)
      expect((await readEvents(fx)).at(-1), code).toMatchObject({ type: "jev.packet.rejected", reason: { code } })
    }
  })
  it("rejects a reused decision id without a second charge or call", async () => {
    const fx = await makeProject()
    const first = await run(fx, makePacket(), okChoice)
    expect(first.outcome.accepted).toBe(true)
    const second = await run(fx, makePacket(), okChoice)
    expect(second.calls).toHaveLength(0)
    expect(second.outcome.reason?.code).toBe("packet.duplicate-decision")
    expect((await readState(fx)).counters.calls).toBe(1)
    expect((await readDecision(fx)).status).toBe("completed")
  })
})

describe("charging", () => {
  it("charges the call and opens the decision record before the network is touched", async () => {
    const fx = await makeProject({ state: { ...STATE, counters: { ...STATE.counters, calls: 4 } } })
    let seen: any
    await run(fx, makePacket(), () => {
      seen = {
        counters: JSON.parse(readFileSync(fx.statePath, "utf8")).counters,
        decision: JSON.parse(readFileSync(join(fx.loopDir, "runs/run-1/decisions/dec-1.json"), "utf8")),
        events: readFileSync(fx.eventsPath, "utf8"),
      }
      return okChoice()
    })
    expect(seen.counters).toMatchObject({ calls: 5, jevCalls: 1 })
    expect(seen.decision).toMatchObject({ status: "requested", accepted: false, attempt: { number: 5 } })
    expect(seen.events).toContain("jev.decision.requested")
    expect(seen.events).not.toContain("jev.decision.resolved")
  })
  it("preserves unrelated state fields and increments existing counters", async () => {
    const fx = await makeProject({ state: { ...STATE, tasks: [{ id: "t1" }], counters: { agentRuns: 2, calls: 7, jevCalls: 3, attemptsByTask: { t1: 1 } } } })
    await run(fx, makePacket(), okChoice)
    const state = await readState(fx)
    expect(state).toMatchObject({ projectId: "proj", phase: "EXECUTING", tasks: [{ id: "t1" }], counters: { agentRuns: 2, calls: 8, jevCalls: 4, attemptsByTask: { t1: 1 } } })
  })
  it("charges every attempted call including failures, with no silent retry", async () => {
    const fx = await makeProject()
    const responses: Respond[] = [() => ({ __raw: { status: 503, text: "down" } }), () => ({ __raw: { status: 200, text: "{}" } }), okChoice]
    for (const [index, respond] of responses.entries()) {
      const { calls } = await run(fx, makePacket({ decisionId: `dec-${index + 1}` }), respond)
      expect(calls).toHaveLength(1)
    }
    expect((await readState(fx)).counters).toMatchObject({ calls: 3, jevCalls: 3 })
  })
})

describe("fail-closed live failures", () => {
  const failing: [string, string, Respond][] = [
    ["failed.http", "HTTP 500", () => ({ __raw: { status: 500, text: "{}" } })],
    ["failed.http", "HTTP 401", () => ({ __raw: { status: 401, text: JSON.stringify(okChoice()) } })],
    ["failed.malformed-response", "invalid JSON", () => ({ __raw: { status: 200, text: "<html>" } })],
    ["failed.malformed-response", "no answers key", () => ({ nope: 1 })],
    ["failed.malformed-response", "answers not an object", () => ({ answers: [1] })],
    ["failed.malformed-response", "JSON array body", () => ({ __raw: { status: 200, text: "[]" } })],
    ["failed.malformed-response", "oversized body", () => ({ __raw: { status: 200, text: "x".repeat(300_000) } })],
    ["failed.answer-set", "missing question", () => answersResponse({})],
    ["failed.answer-set", "unexpected question", () => answersResponse({ next_action: choiceAnswer(), extra: noulAnswer() })],
    ["failed.answer-set", "renamed question", () => answersResponse({ other: choiceAnswer() })],
    ["failed.primitive-mismatch", "wrong primitive", () => answersResponse({ next_action: noulAnswer() })],
    ["failed.malformed-answer", "answer is a string", () => answersResponse({ next_action: "RESEARCH" })],
    ["failed.choice-not-offered", "option not offered", () => answersResponse({ next_action: choiceAnswer("COMPLETE", { probabilities: { COMPLETE: 1 } }) })],
    ["failed.choice-not-max", "not the maximum", () => answersResponse({ next_action: choiceAnswer("WAIT") })],
    ["failed.confidence", "low confidence", () => answersResponse({ next_action: choiceAnswer("RESEARCH", { confidence: 0.49 }) })],
    ["failed.probabilities", "bad probability", () => answersResponse({ next_action: choiceAnswer("RESEARCH", { probabilities: { RESEARCH: 2 } }) })],
  ]
  it.each(failing)("%s: %s", async (code, _label, respond) => {
    const fx = await makeProject()
    const { outcome, calls } = await run(fx, makePacket(), respond)
    expect(calls).toHaveLength(1)
    expect(outcome).toMatchObject({ accepted: false, status: "failed", output: null, answers: null, reason: { code }, fallback: null })
    expect(outcome.pause).toEqual({ state: "PAUSED(capability)", unblock: ["wait for Jev", "ask human"] })
    expect((await readState(fx)).counters.calls).toBe(1)
    const record = await readDecision(fx)
    expect(record).toMatchObject({ status: "failed", accepted: false, reason: { code }, composition: null, pause: { state: "PAUSED(capability)" } })
    expect((await readEvents(fx)).at(-1)).toMatchObject({ type: "jev.decision.resolved", accepted: false, reason: { code } })
  })

  it("logs a bounded, sanitized snippet of an unparseable response", async () => {
    const fx = await makeProject()
    await run(fx, makePacket(), () => ({ __raw: { status: 200, text: `oops Bearer ${API_KEY} ${"x".repeat(2000)}` } }))
    const record = await readDecision(fx)
    expect(record.responseSnippet.length).toBeLessThanOrEqual(520)
    expect(record.responseSnippet).not.toContain(API_KEY)
  })

  it("fails on timeout and aborts the request", async () => {
    const fx = await makeProject()
    const clock = fakeClock()
    let signal: AbortSignal | undefined
    const outcome = await runDecision(makePacket(), {
      projectDir: fx.dir,
      policyPath: fx.policyPath,
      apiKey: API_KEY,
      clock,
      lockRetries: 1,
      lockRetryMs: 1,
      timeoutMs: 1234,
      fetch: (_url, init) => {
        signal = init.signal
        queueMicrotask(() => clock.fireTimeout())
        return new Promise(() => {})
      },
    })
    expect(outcome).toMatchObject({ accepted: false, reason: { code: "failed.timeout" } })
    expect(signal?.aborted).toBe(true)
    expect((await readState(fx)).counters.calls).toBe(1)
  })

  it("fails when the body read times out", async () => {
    const fx = await makeProject()
    const clock = fakeClock()
    const outcome = await runDecision(makePacket(), {
      projectDir: fx.dir,
      policyPath: fx.policyPath,
      apiKey: API_KEY,
      clock,
      lockRetries: 1,
      lockRetryMs: 1,
      fetch: async () => ({
        ok: true,
        status: 200,
        text: () => {
          queueMicrotask(() => clock.fireTimeout())
          return new Promise<string>(() => {})
        },
      }),
    })
    expect(outcome.reason?.code).toBe("failed.timeout")
  })

  it("fails on network errors and redacts the key from the recorded message", async () => {
    const fx = await makeProject()
    const { outcome } = await run(fx, makePacket(), () => {
      throw new Error(`ECONNRESET talking to host with ${API_KEY}`)
    })
    expect(outcome).toMatchObject({ accepted: false, reason: { code: "failed.network" } })
    expect(outcome.reason?.message).not.toContain(API_KEY)
  })

  it("marks the whole composite unusable when any required answer fails, keeping per-question verdicts", async () => {
    const fx = await makeProject()
    const packet = makePacket({}, [scoreQuestion(), noulQuestion()], "WORKER_FAN_OUT", { id: "accepted-batch", version: "1" })
    const { outcome } = await run(fx, packet, () => answersResponse({ difficulty: scoreAnswer(), human_pref: noulAnswer(0.5) }))
    expect(outcome).toMatchObject({ accepted: false, output: null, answers: null, reason: { code: "failed.noul-unresolved" } })
    const record = await readDecision(fx)
    expect(record.answers.difficulty.accepted).toBe(true)
    expect(record.answers.human_pref).toMatchObject({ accepted: false, failure: { code: "failed.noul-unresolved" } })
  })

  it("rejects Score legend, range and confidence failures end to end", async () => {
    const cases: [string, Record<string, unknown>][] = [
      ["failed.legend-mismatch", { legend: { "0": "Trivial", "1": "Moderate", "2": "Severe" } }],
      ["failed.score-range", { score: 3 }],
      ["failed.confidence", { confidence: 0.2 }],
    ]
    for (const [code, patch] of cases) {
      const fx = await makeProject()
      const packet = makePacket({}, [scoreQuestion()], "MODEL_CLASS", { id: "accepted-batch", version: "1" })
      const { outcome } = await run(fx, packet, () => answersResponse({ difficulty: scoreAnswer(patch) }))
      expect(outcome.reason?.code).toBe(code)
      expect(outcome.accepted).toBe(false)
    }
  })

  it("fails closed when composition throws", async () => {
    const fx = await makeProject()
    const broken: Composer = { id: "broken", version: "1", validate: () => null, compose: () => { throw new Error("boom") } }
    const packet = makePacket({}, [choiceQuestion()], "NEXT_ACTION", { id: "broken", version: "1" })
    const { outcome } = await run(fx, packet, okChoice, { composers: [broken] })
    expect(outcome).toMatchObject({ accepted: false, output: null, reason: { code: "failed.composition" } })
  })

  it("applies only a declared deterministic fallback, and never marks the outcome accepted", async () => {
    const fx = await makeProject()
    const { outcome } = await run(fx, makePacket({ fallback: { id: "safe-wait", output: "WAIT" } }), () => ({ __raw: { status: 500, text: "" } }))
    expect(outcome).toMatchObject({ accepted: false, output: null, fallback: { id: "safe-wait", output: "WAIT" }, pause: null })
    expect(await readDecision(fx)).toMatchObject({ accepted: false, fallback: { id: "safe-wait", output: "WAIT", applied: true }, pause: null })
  })
})

describe("write failures fail closed", () => {
  const failOn = (op: keyof JevFs, needle: string, nth = 1): { fs: JevFs; count: () => number } => {
    const { fs } = spyFs()
    let seen = 0
    const wrapped = { ...fs, [op]: async (...args: any[]) => {
      if (String(args[0]).includes(needle) && ++seen === nth) throw Object.assign(new Error(`injected ${op} failure`), { code: "EIO" })
      return (fs[op] as any)(...args)
    } } as JevFs
    return { fs: wrapped, count: () => seen }
  }

  it("does not call Jev when the counter cannot be persisted", async () => {
    const fx = await makeProject()
    const { outcome, calls } = await run(fx, makePacket(), okChoice, { fs: failOn("rename", "state.json").fs })
    expect(calls).toHaveLength(0)
    expect(outcome).toMatchObject({ accepted: false, reason: { code: "failed.charge-write" } })
    expect((await readState(fx)).counters.calls).toBe(0)
  })
  it("does not call Jev when the decision record cannot be created", async () => {
    const fx = await makeProject()
    const { outcome, calls } = await run(fx, makePacket(), okChoice, { fs: failOn("rename", "dec-1.json").fs })
    expect(calls).toHaveLength(0)
    expect(outcome.reason?.code).toBe("failed.charge-write")
  })
  it("does not call Jev when the request event cannot be appended", async () => {
    const fx = await makeProject()
    const { outcome, calls } = await run(fx, makePacket(), okChoice, { fs: failOn("appendFile", "events.jsonl").fs })
    expect(calls).toHaveLength(0)
    expect(outcome.reason?.code).toBe("failed.charge-write")
    expect((await readState(fx)).counters.calls).toBe(1)
  })
  it("rejects otherwise-valid answers when the result record cannot be written", async () => {
    const fx = await makeProject()
    const { outcome, calls } = await run(fx, makePacket(), okChoice, { fs: failOn("rename", "dec-1.json", 2).fs })
    expect(calls).toHaveLength(1)
    expect(outcome).toMatchObject({ accepted: false, status: "failed", output: null, answers: null, reason: { code: "failed.log-write" } })
    expect((await readDecision(fx)).status).toBe("requested")
    expect((await readState(fx)).counters.calls).toBe(1)
  })
  it("rejects otherwise-valid answers when the result event cannot be appended", async () => {
    const fx = await makeProject()
    const { outcome } = await run(fx, makePacket(), okChoice, { fs: failOn("appendFile", "events.jsonl", 2).fs })
    expect(outcome).toMatchObject({ accepted: false, reason: { code: "failed.log-write" }, output: null })
  })
  it("leaves no partial temp files behind after a failed atomic write", async () => {
    const fx = await makeProject()
    await run(fx, makePacket(), okChoice, { fs: failOn("rename", "state.json").fs })
    expect(walk(fx.loopDir).filter((file) => file.endsWith(".tmp"))).toEqual([])
  })
})

describe("project lock", () => {
  it("denies without charging or calling when the lock is held", async () => {
    const fx = await makeProject()
    await writeFile(join(fx.loopDir, "jev.lock"), "someone-else")
    const { outcome, calls, clock } = await run(fx, makePacket(), okChoice)
    expect(calls).toHaveLength(0)
    expect(outcome).toMatchObject({ accepted: false, status: "denied", reason: { code: "denied.lock" } })
    expect(clock.sleeps.length).toBeGreaterThan(0)
    expect((await readState(fx)).counters.calls).toBe(0)
    expect(readFileSync(join(fx.loopDir, "jev.lock"), "utf8")).toBe("someone-else")
  })
  it("releases the lock after success and failure", async () => {
    const fx = await makeProject()
    await run(fx, makePacket(), okChoice)
    await run(fx, makePacket({ decisionId: "dec-2" }), () => ({ __raw: { status: 500, text: "" } }))
    expect(existsSync(join(fx.loopDir, "jev.lock"))).toBe(false)
  })
  it("serializes concurrent decisions so counters and events stay consistent", async () => {
    const fx = await makeProject()
    const transport = mockFetch(() => answersResponse({ next_action: choiceAnswer() }))
    const options = { projectDir: fx.dir, policyPath: fx.policyPath, apiKey: API_KEY, fetch: transport.fetch, lockRetries: 500, lockRetryMs: 1 }
    const outcomes = await Promise.all(Array.from({ length: 8 }, (_, i) => runDecision(makePacket({ decisionId: `dec-${i}` }), options)))
    expect(outcomes.every((outcome) => outcome.accepted)).toBe(true)
    expect(new Set(outcomes.map((outcome) => outcome.attempt)).size).toBe(8)
    expect((await readState(fx)).counters).toMatchObject({ calls: 8, jevCalls: 8 })
    const events = await readEvents(fx)
    expect(events).toHaveLength(16)
    expect(events.filter((event) => event.type === "jev.decision.resolved")).toHaveLength(8)
  })
  it("never exceeds the call budget under concurrency", async () => {
    const fx = await makeProject({ state: { ...STATE, budgets: { maxCalls: 2 } } })
    const transport = mockFetch(() => answersResponse({ next_action: choiceAnswer() }))
    const options = { projectDir: fx.dir, policyPath: fx.policyPath, apiKey: API_KEY, fetch: transport.fetch, lockRetries: 500, lockRetryMs: 1 }
    const outcomes = await Promise.all(Array.from({ length: 6 }, (_, i) => runDecision(makePacket({ decisionId: `dec-${i}` }), options)))
    expect(outcomes.filter((outcome) => outcome.accepted)).toHaveLength(2)
    expect(outcomes.filter((outcome) => outcome.reason?.code === "denied.call-budget")).toHaveLength(4)
    expect(transport.calls).toHaveLength(2)
    expect((await readState(fx)).counters.calls).toBe(2)
  })
})

function walk(root: string): string[] {
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}
