import { describe, expect, it } from "vitest"
import { buildComposerRegistry } from "./compose.ts"
import { digestQuestions, toWireQuestions, validatePacket } from "./packet.ts"
import { choiceQuestion, makePacket, noulQuestion, scoreQuestion } from "./testkit.ts"

const policy = { allowsBillingClass: (name: string) => name === "included-subscription" }
const registry = buildComposerRegistry()
const check = (packet: unknown) => validatePacket(packet, policy, registry, [])
const codeOf = (packet: unknown) => {
  const result = check(packet)
  return result.ok ? "ok" : result.reason.code
}
const withAuthority = (patch: Record<string, unknown>) => {
  const packet = makePacket()
  packet.admission.authority = { ...packet.admission.authority, ...patch }
  return packet
}
const requestion = (questions: any[], contract = "NEXT_ACTION", composition = { id: "accepted-batch", version: "1" }) =>
  makePacket({}, questions, contract, composition)

describe("valid packets", () => {
  it("accepts a direct Choice packet and returns the normalized packet and composer", () => {
    const result = check(makePacket())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.composer.id).toBe("direct-choice")
      expect(result.packet.questions).toHaveLength(1)
    }
  })
  it("accepts a shared-state batch of Choice, Score and Noul", () => {
    const outcome = choiceQuestion({ id: "outcome", options: [{ id: "CONTINUE", description: "Keep going." }, { id: "SYNTHESIZE", description: "Consolidate." }] } as any)
    const packet = requestion([outcome, scoreQuestion(), noulQuestion()], "CONVERGENCE")
    expect(codeOf(packet)).toBe("ok")
  })
  it("accepts COMPLETE only when completion preconditions passed", () => {
    const question = choiceQuestion({ options: [{ id: "COMPLETE", description: "Done." }, { id: "VERIFY", description: "Verify." }] } as any)
    expect(codeOf(makePacket({}, [question]))).toBe("packet.completion-waived")
    const passed = makePacket({}, [question])
    passed.admission.authority.completionPreconditionsPassed = true
    expect(codeOf(passed)).toBe("ok")
  })
  it("builds wire questions containing only admitted options, scale levels, and criteria", () => {
    const wire = toWireQuestions([choiceQuestion(), scoreQuestion(), noulQuestion()])
    expect(wire).toEqual({
      next_action: {
        type: "choice",
        instructions: "Pick the best next action.",
        criteria: { RESEARCH: "Gather evidence.", VERIFY: "Verify current work.", WAIT: "Wait." },
      },
      difficulty: { type: "score", instructions: "How difficult is the task?", criteria: ["Trivial", "Moderate", "Hard"] },
      human_pref: {
        type: "noul",
        instructions: "Would human preference materially change the choice?",
        criteria: { true: "A named preference is at stake.", false: "No preference is at stake." },
      },
    })
  })
})

describe("structural rejection", () => {
  it("rejects non-objects, wrong versions and unknown fields", () => {
    expect(codeOf(null)).toBe("packet.malformed")
    expect(codeOf([])).toBe("packet.malformed")
    expect(codeOf(makePacket({ schemaVersion: "loop-jev-admission/2" }))).toBe("packet.unsupported-version")
    expect(codeOf(makePacket({ permissions: ["write"] }))).toBe("packet.unknown-field")
    const extra = makePacket()
    extra.questions[0].extra = 1
    expect(codeOf(extra)).toBe("packet.unknown-field")
  })
  it("rejects unsafe or missing identifiers (path traversal)", () => {
    expect(codeOf(makePacket({ runId: "../escape" }))).toBe("packet.invalid-id")
    expect(codeOf(makePacket({ decisionId: "a/b" }))).toBe("packet.invalid-id")
    expect(codeOf(makePacket({ projectId: undefined }))).toBe("packet.invalid-id")
    const result = check(makePacket({ runId: "../escape" }))
    expect(result.ok === false && result.runId).toBe(null)
  })
  it("rejects empty question sets, option lists, scales and criteria", () => {
    expect(codeOf(makePacket({ questions: [] }))).toBe("packet.empty")
    expect(codeOf(makePacket({}, [choiceQuestion({ options: [] } as any)]))).toBe("packet.empty")
    expect(codeOf(requestion([{ ...scoreQuestion(), scale: [] }], "MODEL_CLASS"))).toBe("packet.empty")
    expect(codeOf(requestion([{ ...noulQuestion(), criteria: undefined }], "HUMAN_INTERRUPT"))).toBe("packet.empty")
  })
  it("rejects a Choice with a single admitted option (not a probabilistic decision)", () => {
    expect(codeOf(makePacket({}, [choiceQuestion({ options: [{ id: "WAIT", description: "Wait." }] } as any)]))).toBe("packet.single-option")
  })
  it("rejects duplicate questions, options and scale levels", () => {
    expect(codeOf(requestion([scoreQuestion("a"), scoreQuestion("a")], "MODEL_CLASS"))).toBe("packet.duplicate-question")
    const dupOption = choiceQuestion({ options: [{ id: "WAIT", description: "a" }, { id: "WAIT", description: "b" }] } as any)
    expect(codeOf(makePacket({}, [dupOption]))).toBe("packet.duplicate-option")
    expect(codeOf(requestion([{ ...scoreQuestion(), scale: ["Same", "Same"] }], "MODEL_CLASS"))).toBe("packet.duplicate-option")
  })
  it("rejects inconsistent digests, composers and fallbacks", () => {
    const tampered = makePacket()
    tampered.questions[0].options.push({ id: "PRODUCE", description: "Produce." })
    expect(codeOf(tampered)).toBe("packet.inconsistent")
    expect(codeOf(makePacket({}, [choiceQuestion()], "NEXT_ACTION", { id: "direct-noul", version: "1" }))).toBe("packet.inconsistent")
    expect(codeOf(makePacket({ fallback: { id: "fb", output: "COMPLETE" } }))).toBe("packet.inconsistent")
    expect(codeOf(makePacket({ fallback: { id: "fb", output: "WAIT" } }))).toBe("ok")
    expect(codeOf(makePacket({ fallback: "WAIT" }))).toBe("packet.malformed")
    expect(codeOf(requestion([noulQuestion("a"), { ...noulQuestion("b"), criteria: { true: "x" } as any }], "HUMAN_INTERRUPT"))).toBe("packet.inconsistent")
  })
  it("digest is stable under key order but sensitive to content", () => {
    const a = digestQuestions("NEXT_ACTION", [choiceQuestion()])
    const reordered = { type: "choice", options: choiceQuestion().type === "choice" ? (choiceQuestion() as any).options : [], instructions: "Pick the best next action.", id: "next_action" }
    expect(digestQuestions("NEXT_ACTION", [reordered as any])).toBe(a)
    expect(digestQuestions("MODEL_CLASS", [choiceQuestion()])).not.toBe(a)
  })
})

describe("authority rejection", () => {
  it("rejects unknown contracts and results outside the contract", () => {
    expect(codeOf(makePacket({ contract: "DO_ANYTHING" }))).toBe("packet.unauthorized")
    expect(codeOf(makePacket({ contract: "toString" }))).toBe("packet.unauthorized")
    const escalate = choiceQuestion({ options: [{ id: "GRANT_PERMISSIONS", description: "x" }, { id: "WAIT", description: "y" }] } as any)
    expect(codeOf(makePacket({}, [escalate]))).toBe("packet.unauthorized")
    expect(codeOf(makePacket({}, [scoreQuestion()]))).toBe("packet.unauthorized")
    expect(codeOf(makePacket({}, [choiceQuestion()], "NEXT_ACTION", { id: "made-up", version: "9" }))).toBe("packet.unauthorized")
  })
  it("rejects paid capacity in any form", () => {
    expect(codeOf(withAuthority({ paidCapacity: true }))).toBe("packet.paid-capacity")
    expect(codeOf(withAuthority({ paidCapacity: undefined }))).toBe("packet.paid-capacity")
    expect(codeOf(withAuthority({ billingClass: "automatic-overage" }))).toBe("packet.paid-capacity")
    expect(codeOf(withAuthority({ billingClass: undefined }))).toBe("packet.paid-capacity")
    const paidOption = choiceQuestion({ options: [{ id: "RESEARCH", description: "a" }, { id: "VERIFY", description: "b", billingClass: "purchased-credits" }] } as any)
    expect(codeOf(makePacket({}, [paidOption]))).toBe("packet.paid-capacity")
  })
  it("rejects permission escalation, verification waiver and completion waiver", () => {
    expect(codeOf(withAuthority({ permissionEscalation: true }))).toBe("packet.permission-escalation")
    expect(codeOf(withAuthority({ permissionEscalation: "no" }))).toBe("packet.permission-escalation")
    expect(codeOf(withAuthority({ verificationWaived: true }))).toBe("packet.verification-waived")
    expect(codeOf(withAuthority({ completionWaived: true }))).toBe("packet.completion-waived")
    expect(codeOf(withAuthority({ completionPreconditionsPassed: undefined }))).toBe("packet.malformed")
    expect(codeOf(withAuthority({ budgetOverride: 1000 }))).toBe("packet.unknown-field")
  })
})

describe("state and content bounds", () => {
  it("rejects over-deep, oversized, or non-JSON state", () => {
    let deep: Record<string, unknown> = { v: 1 }
    for (let i = 0; i < 12; i++) deep = { a: deep }
    expect(codeOf(makePacket({ state: deep }))).toBe("packet.state-invalid")
    expect(codeOf(makePacket({ state: { blob: "x".repeat(40_000) } }))).toBe("packet.state-invalid")
    expect(codeOf(makePacket({ state: [] }))).toBe("packet.state-invalid")
  })
  it("returns sanitized state only", () => {
    const result = check(makePacket({ state: { apiKey: "sk-live", nested: { password: "p" }, ok: 1 } }))
    expect(result.ok && result.packet.state).toEqual({ apiKey: "[REDACTED]", nested: { password: "[REDACTED]" }, ok: 1 })
  })
  it("rejects secret-shaped text in what Jev would see", () => {
    const leaky = choiceQuestion({ instructions: "Use Authorization: Bearer abcdefghijk to decide." } as any)
    expect(codeOf(makePacket({}, [leaky]))).toBe("packet.secret")
    const literal = validatePacket(makePacket({}, [choiceQuestion({ instructions: "key is HUNTER2SECRET" } as any)]), policy, registry, ["HUNTER2SECRET"])
    expect(literal.ok).toBe(false)
  })
})

describe("PROVIDER_FALLBACK contract enforcement", () => {
  const optionsOf = (options: any[]) => makePacket({}, [choiceQuestion({ id: "fallback", options } as any)], "PROVIDER_FALLBACK")
  const fixed = [
    { id: "ALTERNATE_SUBSCRIPTION", description: "Use another included subscription.", billingClass: "included-subscription" },
    { id: "WAIT", description: "Wait for reset." },
    { id: "PAUSE_ASK", description: "Pause and ask the owner." },
  ]
  const creditPolicy = { allowsBillingClass: (name: string) => ["included-subscription", "temporary-credit"].includes(name) }
  const creditRoute = { id: "codex-credit-route", description: "Approved temporary credit route.", billingClass: "temporary-credit" }

  it("accepts exactly the fixed result IDs", () => {
    expect(codeOf(optionsOf(fixed))).toBe("ok")
    expect(codeOf(optionsOf(fixed.slice(1)))).toBe("ok")
  })
  it("rejects arbitrary option IDs, with or without an included billing class", () => {
    expect(codeOf(optionsOf([...fixed, { id: "SUDO_ROUTE", description: "x" }]))).toBe("packet.unauthorized")
    expect(codeOf(optionsOf([...fixed, { id: "codex-credit-route", description: "x", billingClass: "included-subscription" }]))).toBe("packet.unauthorized")
    expect(codeOf(optionsOf([{ id: "route-a", description: "a" }, { id: "route-b", description: "b" }]))).toBe("packet.unauthorized")
  })
  it("rejects a temporary-credit route while policy disables temporary credits (V1)", () => {
    expect(codeOf(optionsOf([...fixed, creditRoute]))).toBe("packet.paid-capacity")
  })
  it("rejects other paid or overage classes even if a policy allowed them", () => {
    const all = { allowsBillingClass: () => true }
    for (const billingClass of ["purchased-credits", "automatic-overage", "separately-billed"]) {
      const result = validatePacket(optionsOf([...fixed, { ...creditRoute, billingClass }]), all, registry, [])
      expect(result.ok === false && result.reason.code).toBe("packet.unauthorized")
    }
  })
  it("allows an explicitly marked temporary-credit route only when policy enables that class", () => {
    const accepted = validatePacket(optionsOf([...fixed, creditRoute]), creditPolicy, registry, [])
    expect(accepted.ok).toBe(true)
    const smuggled = validatePacket(optionsOf([...fixed, { ...creditRoute, billingClass: "included-subscription" }]), creditPolicy, registry, [])
    expect(smuggled.ok === false && smuggled.reason.code).toBe("packet.unauthorized")
    const unmarked = validatePacket(optionsOf([...fixed, { id: "codex-credit-route", description: "x" }]), creditPolicy, registry, [])
    expect(unmarked.ok === false && unmarked.reason.code).toBe("packet.unauthorized")
  })
  it("does not let a fixed result ID carry the temporary-credit class", () => {
    const disguised = optionsOf([{ id: "WAIT", description: "w", billingClass: "temporary-credit" }, fixed[2]])
    const result = validatePacket(disguised, creditPolicy, registry, [])
    expect(result.ok === false && result.reason.code).toBe("packet.unauthorized")
  })
})
