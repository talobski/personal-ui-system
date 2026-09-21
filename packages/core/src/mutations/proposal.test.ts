import { describe, expect, it } from "vitest"
import { applyProposal, createProposalSession, discardProposal, stageProposal, validateTheme } from "../index"
import type { ProposalSession } from "../index"
import validFixture from "../theme/fixtures/valid.json"

const parsed = validateTheme(validFixture)
if (!parsed.ok) throw new Error("fixture invalid")
const theme = parsed.theme

const NOW = "2026-09-21T11:00:00Z"
const LATER = "2026-09-21T11:05:00Z"
const provenance = { source: "agent", sourceId: "run-1", createdAt: "2026-09-21T10:00:00Z", intentSummary: "make it softer" }
const proposal = (operations: unknown[], overrides: Record<string, unknown> = {}) => ({
  schemaVersion: "1.0",
  proposalId: "p-1",
  base: { themeId: theme.id, revision: theme.revision },
  provenance,
  operations,
  ...overrides,
})
const setRadius = { op: "setRadius", value: "1rem" }
const setDensity = { op: "setDensity", value: 1.25 }
const setColor = { op: "setColor", mode: "light", token: "primary", value: "oklch(0.5 0.1 200)" }

const stage = (input: unknown, session: ProposalSession = createProposalSession(), active = theme) => stageProposal(session, active, input, NOW)
const status = (session: ProposalSession, id: string) => session.records.find((record) => record.proposalId === id)?.status
const staged = (input: unknown = proposal([setRadius])) => {
  const result = stage(input)
  if (!result.ok) throw new Error(`stage failed: ${JSON.stringify(result.errors)}`)
  return result.session
}
const errorsOf = (result: ReturnType<typeof stage>) => (result.ok ? [] : result.errors)

describe("proposal envelope (strict MutationProposalV1)", () => {
  it("stages a valid proposal without touching the active theme", () => {
    const before = JSON.stringify(theme)
    const result = stage(proposal([setColor]))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.staged.candidate.revision).toBe(theme.revision + 1)
    expect(result.staged.candidate.modes.light.color.primary.$value).toBe("oklch(0.5 0.1 200)")
    expect(result.staged.css).toContain("--primary: oklch(0.5 0.1 200);")
    expect(status(result.session, "p-1")).toBe("staged")
    expect(JSON.stringify(theme)).toBe(before)
  })

  it.each(["manual", "agent", "fixture"])("accepts provenance source %s", (source) => {
    expect(stage(proposal([setRadius], { provenance: { ...provenance, source } })).ok).toBe(true)
  })

  it("accepts identifiers of 1 to 128 characters from [A-Za-z0-9._:-], including a leading punctuation character", () => {
    for (const id of ["a", "_x", ".x", "-x", ":x", "A1._:-".repeat(21) + "ab", "a".repeat(128)]) {
      expect(stage(proposal([setRadius], { proposalId: id, provenance: { ...provenance, sourceId: id } })).ok, id).toBe(true)
    }
  })

  it("rejects proposalId outside that alphabet or length as proposal.invalid-id", () => {
    for (const id of ["", "a".repeat(129), "has space", "a/b", "a\u00e9", 7, null]) {
      expect(errorsOf(stage(proposal([setRadius], { proposalId: id }))), String(id)).toEqual([{ ruleId: "proposal.invalid-id", path: "proposalId" }])
    }
  })

  it("accepts base.revision 0 at the envelope and leaves matching to the mutation base check", () => {
    const errors = errorsOf(stage(proposal([setRadius], { base: { themeId: theme.id, revision: 0 } })))
    expect(errors).toEqual([{ ruleId: "mutation.stale-revision", path: "base.revision" }])
  })

  it("accepts a proposal without an intentSummary and offset timestamps", () => {
    const { intentSummary: _omitted, ...bare } = provenance
    expect(stage(proposal([setRadius], { provenance: { ...bare, createdAt: "2026-09-21T18:00:00.250+08:00" } })).ok).toBe(true)
  })

  it("rejects malformed input with stable rule IDs and paths", () => {
    const cases: Array<[string, unknown, { ruleId: string; path: string }]> = [
      ["not an object", [], { ruleId: "proposal.invalid-proposal", path: "" }],
      ["wrong schemaVersion", proposal([setRadius], { schemaVersion: "1.1" }), { ruleId: "proposal.unsupported-version", path: "schemaVersion" }],
      ["missing schemaVersion", (({ schemaVersion: _v, ...rest }) => rest)(proposal([setRadius])), { ruleId: "proposal.unsupported-version", path: "schemaVersion" }],
      ["legacy version key", proposal([setRadius], { version: "1.0" }), { ruleId: "proposal.unknown-field", path: "version" }],
      ["unknown top-level field", proposal([setRadius], { metadata: {} }), { ruleId: "proposal.unknown-field", path: "metadata" }],
      ["raw css field", proposal([setRadius], { css: "body{}" }), { ruleId: "proposal.unknown-field", path: "css" }],
      ["unknown base field", proposal([setRadius], { base: { themeId: theme.id, revision: 1, path: "x" } }), { ruleId: "proposal.unknown-field", path: "base.path" }],
      ["non-object base", proposal([setRadius], { base: "quiet-editorial" }), { ruleId: "proposal.invalid-base", path: "base" }],
      ["fractional revision", proposal([setRadius], { base: { themeId: theme.id, revision: 1.5 } }), { ruleId: "proposal.invalid-base", path: "base.revision" }],
      ["negative revision", proposal([setRadius], { base: { themeId: theme.id, revision: -1 } }), { ruleId: "proposal.invalid-base", path: "base.revision" }],
      ["missing provenance", proposal([setRadius], { provenance: undefined }), { ruleId: "proposal.invalid-provenance", path: "provenance" }],
      ["extensible provenance", proposal([setRadius], { provenance: { ...provenance, tags: [] } }), { ruleId: "proposal.unknown-field", path: "provenance.tags" }],
      ["arbitrary source", proposal([setRadius], { provenance: { ...provenance, source: "test-agent" } }), { ruleId: "proposal.invalid-provenance", path: "provenance.source" }],
      ["wrong-case source", proposal([setRadius], { provenance: { ...provenance, source: "Agent" } }), { ruleId: "proposal.invalid-provenance", path: "provenance.source" }],
      ["sourceId with space", proposal([setRadius], { provenance: { ...provenance, sourceId: "has space" } }), { ruleId: "proposal.invalid-provenance", path: "provenance.sourceId" }],
      ["129-character sourceId", proposal([setRadius], { provenance: { ...provenance, sourceId: "a".repeat(129) } }), { ruleId: "proposal.invalid-provenance", path: "provenance.sourceId" }],
      ["empty sourceId", proposal([setRadius], { provenance: { ...provenance, sourceId: "" } }), { ruleId: "proposal.invalid-provenance", path: "provenance.sourceId" }],
      ["date-only createdAt", proposal([setRadius], { provenance: { ...provenance, createdAt: "2026-09-21" } }), { ruleId: "proposal.invalid-created-at", path: "provenance.createdAt" }],
      ["createdAt without zone", proposal([setRadius], { provenance: { ...provenance, createdAt: "2026-09-21T10:00:00" } }), { ruleId: "proposal.invalid-created-at", path: "provenance.createdAt" }],
      ["impossible createdAt date", proposal([setRadius], { provenance: { ...provenance, createdAt: "2026-02-30T10:00:00Z" } }), { ruleId: "proposal.invalid-created-at", path: "provenance.createdAt" }],
      ["241-character intentSummary", proposal([setRadius], { provenance: { ...provenance, intentSummary: "x".repeat(241) } }), { ruleId: "proposal.invalid-intent-summary", path: "provenance.intentSummary" }],
      ["multiline intentSummary", proposal([setRadius], { provenance: { ...provenance, intentSummary: "a\nb" } }), { ruleId: "proposal.invalid-intent-summary", path: "provenance.intentSummary" }],
      ["empty intentSummary", proposal([setRadius], { provenance: { ...provenance, intentSummary: "" } }), { ruleId: "proposal.invalid-intent-summary", path: "provenance.intentSummary" }],
      ["no operations", proposal([]), { ruleId: "proposal.invalid-operations", path: "operations" }],
      ["operations not an array", proposal([], { operations: setRadius }), { ruleId: "proposal.invalid-operations", path: "operations" }],
      ["nine operations", proposal(Array.from({ length: 9 }, () => setRadius)), { ruleId: "proposal.invalid-operations", path: "operations" }],
    ]
    for (const [label, input, expected] of cases) {
      const errors = errorsOf(stage(input))
      expect(errors, label).toContainEqual(expected)
    }
  })

  it("accepts exactly 240 characters and exactly eight operations, and no more", () => {
    expect(stage(proposal([setRadius], { provenance: { ...provenance, intentSummary: "x".repeat(240) } })).ok).toBe(true)
    expect(stage(proposal(Array.from({ length: 8 }, () => setRadius))).ok).toBe(true)
  })

  it("rejects operations outside the closed union with the existing mutation rule IDs", () => {
    const bad: Array<[unknown, { ruleId: string; path: string }]> = [
      [{ op: "setCss", value: "body{}" }, { ruleId: "mutation.unknown-operation", path: "operations[0].op" }],
      [{ op: "setRadius", value: "1rem", path: "/etc/passwd" }, { ruleId: "mutation.unknown-field", path: "operations[0].path" }],
      [{ op: "setRadius", value: "red; } body { display: none" }, { ruleId: "mutation.invalid-value", path: "operations[0].value" }],
      [{ op: "setMany", operations: [] }, { ruleId: "mutation.unknown-operation", path: "operations[0].op" }],
      ["setRadius", { ruleId: "mutation.invalid-operation", path: "operations[0]" }],
    ]
    for (const [operation, expected] of bad) expect(errorsOf(stage(proposal([operation]))), JSON.stringify(operation)).toContainEqual(expected)
  })

  it("does not retain unrecognized envelope data on a staged proposal", () => {
    const result = stage(proposal([setRadius]))
    if (!result.ok) throw new Error("expected staged")
    expect(Object.keys(result.staged.proposal).sort()).toEqual(["base", "operations", "proposalId", "provenance", "schemaVersion"])
    expect(Object.keys(result.staged.proposal.provenance).sort()).toEqual(["createdAt", "intentSummary", "source", "sourceId"])
  })
})

describe("base identity", () => {
  it("rejects an initial themeId mismatch with mutation.base-mismatch", () => {
    const result = stage(proposal([setRadius], { base: { themeId: "other-theme", revision: theme.revision } }))
    expect(errorsOf(result)).toEqual([{ ruleId: "mutation.base-mismatch", path: "base.themeId" }])
    if (!result.ok) expect(status(result.session, "p-1")).toBe("rejected")
  })

  it("rejects an initial revision mismatch and stages nothing", () => {
    const result = stage(proposal([setRadius], { base: { themeId: theme.id, revision: theme.revision + 1 } }))
    expect(errorsOf(result)).toEqual([{ ruleId: "mutation.stale-revision", path: "base.revision" }])
    if (!result.ok) expect(result.session.staged).toBeNull()
  })
})

describe("atomic multi-operation transaction", () => {
  const operations = [setColor, setRadius, setDensity]

  it("N operations produce exactly base revision + 1 and one candidate", () => {
    const result = stage(proposal(operations))
    if (!result.ok) throw new Error("expected staged")
    expect(result.staged.candidate.revision).toBe(theme.revision + 1)
    expect(result.staged.candidate.modes.light.color.primary.$value).toBe("oklch(0.5 0.1 200)")
    expect(result.staged.candidate.radius.md.$value).toBe("1rem")
    expect(result.staged.candidate.space.density.$value).toBe(1.25)
  })

  it("one invalid operation rejects the whole proposal with no partial candidate", () => {
    const result = stage(proposal([setColor, { op: "setDensity", value: 99 }, setRadius]))
    expect(errorsOf(result)).toEqual([{ ruleId: "mutation.invalid-value", path: "operations[1].value" }])
    if (result.ok) return
    expect(result.session.staged).toBeNull()
    expect(status(result.session, "p-1")).toBe("rejected")
  })

  it("rejects the whole proposal when a schema-valid target is missing", () => {
    const empty = structuredClone(theme)
    empty.shadow.md.$value = []
    const result = stageProposal(createProposalSession(), empty, proposal([setRadius, { op: "setShadowBlur", value: "4px" }]), NOW)
    expect(errorsOf(result)).toEqual([{ ruleId: "mutation.missing-target", path: "operations[1]" }])
  })

  it("apply increments the active revision exactly once and returns a theme equal to the candidate", () => {
    const session = staged(proposal(operations))
    const candidate = session.staged!.candidate
    const before = JSON.stringify(theme)
    const applied = applyProposal(session, theme, "p-1", LATER)
    expect(applied.ok).toBe(true)
    if (!applied.ok) return
    expect(applied.theme).toEqual(candidate)
    expect(applied.theme!.revision).toBe(theme.revision + 1)
    expect(applied.session.staged).toBeNull()
    expect(status(applied.session, "p-1")).toBe("applied")
    expect(JSON.stringify(theme)).toBe(before)
  })

  it("applying a second time neither reapplies nor increments the revision", () => {
    const first = applyProposal(staged(), theme, "p-1", LATER)
    if (!first.ok) throw new Error("expected applied")
    const second = applyProposal(first.session, first.theme!, "p-1", LATER)
    expect(second).toEqual({ ok: false, session: first.session, errors: [{ ruleId: "proposal.not-staged", path: "proposalId" }] })
  })
})

describe("Apply equality guard", () => {
  it("fails closed with proposal.candidate-mismatch when the regenerated candidate differs from the staged one", () => {
    const session = staged(proposal([setRadius]))
    const tampered = structuredClone(session.staged!.candidate)
    tampered.radius.md.$value = "9rem"
    const result = applyProposal({ ...session, staged: { ...session.staged!, candidate: tampered } }, theme, "p-1", LATER)
    expect(result.ok).toBe(false)
    expect(errorsOf(result as ReturnType<typeof stage>)).toEqual([{ ruleId: "proposal.candidate-mismatch", path: "candidate" }])
    expect("theme" in result).toBe(false)
  })

  it("also fails closed when only the staged CSS differs, and leaves the proposal staged", () => {
    const session = staged(proposal([setRadius]))
    const result = applyProposal({ ...session, staged: { ...session.staged!, css: `${session.staged!.css}/* x */` } }, theme, "p-1", LATER)
    expect(errorsOf(result as ReturnType<typeof stage>)).toEqual([{ ruleId: "proposal.candidate-mismatch", path: "candidate" }])
    expect(result.session.staged).not.toBeNull()
    expect(status(result.session, "p-1")).toBe("staged")
  })

  it("fails closed when the active content changed under an unchanged id and revision", () => {
    const session = staged(proposal([setRadius]))
    const edited = structuredClone(theme)
    edited.space.density.$value = 1.5
    const result = applyProposal(session, edited, "p-1", LATER)
    expect(errorsOf(result as ReturnType<typeof stage>)).toEqual([{ ruleId: "proposal.candidate-mismatch", path: "candidate" }])
  })
})

describe("proposalId is single-use for the session", () => {
  const outcomes: Array<[string, () => ProposalSession]> = [
    ["rejected", () => stage(proposal([setRadius], { base: { themeId: "nope", revision: 1 } })).session],
    ["staged", () => staged()],
    ["applied", () => (applyProposal(staged(), theme, "p-1", LATER) as { session: ProposalSession }).session],
    ["discarded", () => discardProposal(staged(), theme, "p-1", LATER).session],
    ["stale", () => applyProposal(staged(), { ...theme, revision: theme.revision + 1 }, "p-1", LATER).session],
  ]

  it.each(outcomes)("refuses reuse of an id whose outcome is %s", (expected, makeSession) => {
    const session = makeSession()
    expect(status(session, "p-1")).toBe(expected)
    const reuse = stageProposal(session, theme, proposal([setRadius]), NOW)
    expect(reuse.ok).toBe(false)
    expect(errorsOf(reuse)).toEqual([{ ruleId: "proposal.duplicate-id", path: "proposalId" }])
    // Reuse changes nothing about the recorded outcome or the staged proposal.
    expect(reuse.session).toBe(session)
  })

  it("accepts a different id after any outcome and records each outcome independently", () => {
    const session = discardProposal(staged(), theme, "p-1", LATER).session
    const next = stageProposal(session, theme, proposal([setDensity], { proposalId: "p-2" }), NOW)
    expect(next.ok).toBe(true)
    expect(next.session.records.map((record) => [record.proposalId, record.status])).toEqual([
      ["p-1", "discarded"],
      ["p-2", "staged"],
    ])
  })

  it("is safe for ids that collide with inherited property names", () => {
    for (const id of ["constructor", "__proto__", "toString"]) {
      const first = stage(proposal([setRadius], { proposalId: id }))
      expect(first.ok, id).toBe(true)
      expect(errorsOf(stage(proposal([setRadius], { proposalId: id }), first.session)), id).toEqual([{ ruleId: "proposal.duplicate-id", path: "proposalId" }])
    }
  })

  it("cannot record an id that is missing or malformed, so it consumes nothing", () => {
    const session = createProposalSession()
    for (const proposalId of ["has space", undefined, ""]) {
      const result = stageProposal(session, theme, proposal([setRadius], { proposalId }), NOW)
      expect(result.session).toBe(session)
      expect(errorsOf(result)).toEqual([{ ruleId: "proposal.invalid-id", path: "proposalId" }])
    }
  })

  it("rejects a second valid proposal while one is staged and still consumes its id", () => {
    const session = staged()
    const second = stageProposal(session, theme, proposal([setDensity], { proposalId: "p-2" }), NOW)
    expect(errorsOf(second)).toEqual([{ ruleId: "proposal.staging-occupied", path: "" }])
    expect(status(second.session, "p-2")).toBe("rejected")
    expect(second.session.staged).toBe(session.staged)
  })
})

describe("post-stage stale behavior", () => {
  const staleCases: Array<[string, Parameters<typeof applyProposal>[1], { ruleId: string; path: string }]> = [
    ["active revision changed", { ...theme, revision: theme.revision + 1 }, { ruleId: "mutation.stale-revision", path: "base.revision" }],
    ["active themeId changed", { ...theme, id: "forked-theme" }, { ruleId: "mutation.base-mismatch", path: "base.themeId" }],
    ["active themeId and revision changed", { ...theme, id: "forked-theme", revision: 9 }, { ruleId: "mutation.base-mismatch", path: "base.themeId" }],
  ]

  it.each(staleCases)("%s: Apply is stale with the base rule, clears the candidate, and returns no theme", (_label, moved, rule) => {
    const session = staged()
    const before = JSON.stringify(moved)
    const result = applyProposal(session, moved, "p-1", LATER)
    expect(result.ok).toBe(false)
    expect(errorsOf(result as ReturnType<typeof stage>)).toEqual([rule])
    expect("theme" in result).toBe(false)
    expect(status(result.session, "p-1")).toBe("stale")
    expect(result.session.staged).toBeNull()
    expect(JSON.stringify(moved)).toBe(before)
  })

  it("does not auto-rebase: a stale proposal can never be applied afterwards", () => {
    const stale = applyProposal(staged(), { ...theme, revision: theme.revision + 1 }, "p-1", LATER)
    const again = applyProposal(stale.session, theme, "p-1", LATER)
    expect(again.ok).toBe(false)
    expect(again.session).toBe(stale.session)
  })

  it("is not affected by an unrelated identical copy of the active theme", () => {
    expect(applyProposal(staged(), structuredClone(theme), "p-1", LATER).ok).toBe(true)
  })
})

describe("discard", () => {
  it("clears the staged proposal, records discarded, and returns no theme", () => {
    const result = discardProposal(staged(), theme, "p-1", LATER)
    expect(result.ok).toBe(true)
    expect(result.session.staged).toBeNull()
    expect(status(result.session, "p-1")).toBe("discarded")
    expect("theme" in result).toBe(false)
  })

  it("refuses to resolve a proposal that is not the staged one", () => {
    expect(discardProposal(createProposalSession(), theme, "p-1", LATER).ok).toBe(false)
    expect(applyProposal(staged(), theme, "other", LATER).ok).toBe(false)
  })
})

describe("serializable records with retained provenance", () => {
  const roundTrip = <T>(value: T): T => JSON.parse(JSON.stringify(value))
  const operations = [setColor, setRadius, setDensity]
  const validated = { schemaVersion: "1.0", proposalId: "p-1", base: { themeId: theme.id, revision: theme.revision }, provenance, operations }

  it("keeps the whole session JSON-serializable with no loss", () => {
    const session = staged(proposal(operations))
    expect(roundTrip(session)).toEqual(session)
    const rejected = stage(proposal([setRadius], { proposalId: "r-1", base: { themeId: "nope", revision: 1 } }), session).session
    expect(roundTrip(rejected)).toEqual(rejected)
  })

  it("records evaluation at staging: times, revisions, and a sorted diff", () => {
    const record = staged(proposal(operations)).records[0]!
    expect(record).toMatchObject({ proposalId: "p-1", status: "staged", proposal: validated })
    if (record.status === "rejected") throw new Error("expected staged")
    expect(record.resolution).toBeUndefined()
    expect(record.evaluation).toEqual({
      evaluatedAt: NOW,
      activeRevision: theme.revision,
      candidateRevision: theme.revision + 1,
      diff: [
        { path: "modes.light.color.primary", before: theme.modes.light.color.primary.$value, after: "oklch(0.5 0.1 200)" },
        { path: "radius.md", before: theme.radius.md.$value, after: "1rem" },
        { path: "space.density", before: theme.space.density.$value, after: 1.25 },
      ],
    })
  })

  const terminal: Array<[string, () => ProposalSession, Record<string, unknown>]> = [
    [
      "applied",
      () => applyProposal(staged(proposal(operations)), theme, "p-1", LATER).session,
      { resolvedAt: LATER, outcome: "applied", activeRevisionBefore: theme.revision, activeRevisionAfter: theme.revision + 1 },
    ],
    [
      "discarded",
      () => discardProposal(staged(proposal(operations)), theme, "p-1", LATER).session,
      { resolvedAt: LATER, outcome: "discarded", activeRevisionBefore: theme.revision, activeRevisionAfter: theme.revision },
    ],
    [
      "stale",
      () => applyProposal(staged(proposal(operations)), { ...theme, revision: theme.revision + 3 }, "p-1", LATER).session,
      {
        resolvedAt: LATER,
        outcome: "stale",
        activeRevisionBefore: theme.revision + 3,
        activeRevisionAfter: theme.revision + 3,
        errors: [{ ruleId: "mutation.stale-revision", path: "base.revision" }],
      },
    ],
  ]

  it.each(terminal)("retains provenance, evaluation, and a resolution after %s, and survives JSON", (outcome, resolve, resolution) => {
    const session = resolve()
    const record = session.records[0]!
    expect(record.status).toBe(outcome)
    if (record.status === "rejected") throw new Error("expected a staged record")
    expect(record.proposal).toMatchObject(validated)
    expect(record.proposal.provenance).toEqual(provenance)
    expect(record.evaluation.evaluatedAt).toBe(NOW)
    expect(record.evaluation.diff.map((entry) => entry.path)).toEqual(["modes.light.color.primary", "radius.md", "space.density"])
    expect(record.resolution).toEqual(resolution)
    expect(session.staged).toBeNull()
    expect(roundTrip(session)).toEqual(session)
  })

  it("retains a serializable rejected outcome with its errors and consumes the id", () => {
    const result = stage(proposal([setRadius, { op: "setDensity", value: 99 }], { proposalId: "r-1" }))
    expect(result.ok).toBe(false)
    expect(result.session.records).toEqual([
      { proposalId: "r-1", status: "rejected", receivedAt: NOW, errors: [{ ruleId: "mutation.invalid-value", path: "operations[1].value" }] },
    ])
    expect(roundTrip(result.session)).toEqual(result.session)
  })

  it("records envelope rejections that have a usable id, but not ones without", () => {
    const withId = stage({ proposalId: "r-2", schemaVersion: "9" })
    expect(withId.session.records).toHaveLength(1)
    expect(withId.session.records[0]).toMatchObject({ proposalId: "r-2", status: "rejected" })
    expect(stage({ schemaVersion: "1.0" }).session.records).toHaveLength(0)
  })
})
