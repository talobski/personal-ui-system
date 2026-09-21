import { describe, expect, it } from "vitest"
import { applyProposal, createProposalSession, discardProposal, stageProposal, validateTheme } from "../index"
import type { ProposalSession } from "../index"
import validFixture from "../theme/fixtures/valid.json"

const parsed = validateTheme(validFixture)
if (!parsed.ok) throw new Error("fixture invalid")
const theme = parsed.theme

const provenance = { source: "test-agent", sourceId: "run-1", createdAt: "2026-09-21T10:00:00Z", intentSummary: "make it softer" }
const proposal = (operations: unknown[], overrides: Record<string, unknown> = {}) => ({
  version: "1.0",
  proposalId: "p-1",
  base: { themeId: theme.id, revision: theme.revision },
  provenance,
  operations,
  ...overrides,
})
const setRadius = { op: "setRadius", value: "1rem" }
const setDensity = { op: "setDensity", value: 1.25 }
const setColor = { op: "setColor", mode: "light", token: "primary", value: "oklch(0.5 0.1 200)" }

const stage = (input: unknown, session: ProposalSession = createProposalSession(), active = theme) => stageProposal(session, active, input)
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
    expect(result.session.outcomes.get("p-1")).toBe("staged")
    expect(JSON.stringify(theme)).toBe(before)
  })

  it("accepts a proposal without an intentSummary and offset timestamps", () => {
    const { intentSummary: _omitted, ...bare } = provenance
    expect(stage(proposal([setRadius], { provenance: { ...bare, createdAt: "2026-09-21T18:00:00.250+08:00" } })).ok).toBe(true)
  })

  it("rejects malformed input with stable rule IDs and paths", () => {
    const cases: Array<[string, unknown, { ruleId: string; path: string }]> = [
      ["not an object", [], { ruleId: "proposal.invalid-proposal", path: "" }],
      ["wrong version", proposal([setRadius], { version: "1.1" }), { ruleId: "proposal.unsupported-version", path: "version" }],
      ["missing version", (({ version: _v, ...rest }) => rest)(proposal([setRadius])), { ruleId: "proposal.unsupported-version", path: "version" }],
      ["unknown top-level field", proposal([setRadius], { metadata: {} }), { ruleId: "proposal.unknown-field", path: "metadata" }],
      ["raw css field", proposal([setRadius], { css: "body{}" }), { ruleId: "proposal.unknown-field", path: "css" }],
      ["unknown base field", proposal([setRadius], { base: { themeId: theme.id, revision: 1, path: "x" } }), { ruleId: "proposal.unknown-field", path: "base.path" }],
      ["non-object base", proposal([setRadius], { base: "quiet-editorial" }), { ruleId: "proposal.invalid-base", path: "base" }],
      ["fractional revision", proposal([setRadius], { base: { themeId: theme.id, revision: 1.5 } }), { ruleId: "proposal.invalid-base", path: "base.revision" }],
      ["zero revision", proposal([setRadius], { base: { themeId: theme.id, revision: 0 } }), { ruleId: "proposal.invalid-base", path: "base.revision" }],
      ["missing provenance", proposal([setRadius], { provenance: undefined }), { ruleId: "proposal.invalid-provenance", path: "provenance" }],
      ["extensible provenance", proposal([setRadius], { provenance: { ...provenance, tags: [] } }), { ruleId: "proposal.unknown-field", path: "provenance.tags" }],
      ["bad source", proposal([setRadius], { provenance: { ...provenance, source: "has space" } }), { ruleId: "proposal.invalid-provenance", path: "provenance.source" }],
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
    expect(Object.keys(result.staged.proposal).sort()).toEqual(["base", "operations", "proposalId", "provenance", "version"])
    expect(Object.keys(result.staged.proposal.provenance).sort()).toEqual(["createdAt", "intentSummary", "source", "sourceId"])
  })
})

describe("base identity", () => {
  it("rejects an initial themeId mismatch with mutation.base-mismatch", () => {
    const result = stage(proposal([setRadius], { base: { themeId: "other-theme", revision: theme.revision } }))
    expect(errorsOf(result)).toEqual([{ ruleId: "mutation.base-mismatch", path: "base.themeId" }])
    if (!result.ok) expect(result.session.outcomes.get("p-1")).toBe("rejected")
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
    expect(result.session.outcomes.get("p-1")).toBe("rejected")
  })

  it("rejects the whole proposal when a schema-valid target is missing", () => {
    const empty = structuredClone(theme)
    empty.shadow.md.$value = []
    const result = stageProposal(createProposalSession(), empty, proposal([setRadius, { op: "setShadowBlur", value: "4px" }]))
    expect(errorsOf(result)).toEqual([{ ruleId: "mutation.missing-target", path: "operations[1]" }])
  })

  it("apply increments the active revision exactly once and returns a theme equal to the candidate", () => {
    const session = staged(proposal(operations))
    const candidate = session.staged!.candidate
    const before = JSON.stringify(theme)
    const applied = applyProposal(session, theme, "p-1")
    expect(applied.ok).toBe(true)
    if (!applied.ok) return
    expect(applied.theme).toEqual(candidate)
    expect(applied.theme!.revision).toBe(theme.revision + 1)
    expect(applied.session.staged).toBeNull()
    expect(applied.session.outcomes.get("p-1")).toBe("applied")
    expect(JSON.stringify(theme)).toBe(before)
  })

  it("applying a second time neither reapplies nor increments the revision", () => {
    const first = applyProposal(staged(), theme, "p-1")
    if (!first.ok) throw new Error("expected applied")
    const second = applyProposal(first.session, first.theme!, "p-1")
    expect(second).toEqual({ ok: false, session: first.session, errors: [{ ruleId: "proposal.not-staged", path: "proposalId" }] })
  })
})

describe("proposalId is single-use for the session", () => {
  const outcomes: Array<[string, () => ProposalSession]> = [
    ["rejected", () => stage(proposal([setRadius], { base: { themeId: "nope", revision: 1 } })).session],
    ["staged", () => staged()],
    ["applied", () => (applyProposal(staged(), theme, "p-1") as { session: ProposalSession }).session],
    ["discarded", () => discardProposal(staged(), "p-1").session],
    ["stale", () => applyProposal(staged(), { ...theme, revision: theme.revision + 1 }, "p-1").session],
  ]

  it.each(outcomes)("refuses reuse of an id whose outcome is %s", (status, makeSession) => {
    const session = makeSession()
    expect(session.outcomes.get("p-1")).toBe(status)
    const reuse = stageProposal(session, theme, proposal([setRadius]))
    expect(reuse.ok).toBe(false)
    expect(errorsOf(reuse)).toEqual([{ ruleId: "proposal.duplicate-id", path: "proposalId" }])
    // Reuse changes nothing about the recorded outcome or the staged proposal.
    expect(reuse.session).toBe(session)
  })

  it("accepts a different id after any outcome and records each outcome independently", () => {
    let session = staged()
    session = discardProposal(session, "p-1").session
    const next = stageProposal(session, theme, proposal([setDensity], { proposalId: "p-2" }))
    expect(next.ok).toBe(true)
    expect([...next.session.outcomes]).toEqual([
      ["p-1", "discarded"],
      ["p-2", "staged"],
    ])
  })

  it("is safe for ids that collide with inherited property names", () => {
    expect(stage(proposal([setRadius], { proposalId: "constructor" })).ok).toBe(true)
    expect(errorsOf(stage(proposal([setRadius], { proposalId: "__proto__" })))).toEqual([{ ruleId: "proposal.invalid-id", path: "proposalId" }])
  })

  it("cannot record an id that is missing or malformed, so it consumes nothing", () => {
    const session = createProposalSession()
    const result = stageProposal(session, theme, proposal([setRadius], { proposalId: "has space" }))
    expect(result.session).toBe(session)
    expect(errorsOf(result)).toEqual([{ ruleId: "proposal.invalid-id", path: "proposalId" }])
  })

  it("rejects a second valid proposal while one is staged and still consumes its id", () => {
    const session = staged()
    const second = stageProposal(session, theme, proposal([setDensity], { proposalId: "p-2" }))
    expect(errorsOf(second)).toEqual([{ ruleId: "proposal.staging-occupied", path: "" }])
    expect(second.session.outcomes.get("p-2")).toBe("rejected")
    expect(second.session.staged).toBe(session.staged)
  })
})

describe("stale detection on Apply", () => {
  it("goes stale when the active revision changed after staging, changing nothing else", () => {
    const session = staged()
    const moved = { ...theme, revision: theme.revision + 1 }
    const result = applyProposal(session, moved, "p-1")
    expect(result.ok).toBe(false)
    expect(errorsOf(result as ReturnType<typeof stage>)).toEqual([{ ruleId: "proposal.stale", path: "base" }])
    expect(result.session.outcomes.get("p-1")).toBe("stale")
    expect(result.session.staged).toBeNull()
    expect(moved.revision).toBe(theme.revision + 1)
  })

  it("goes stale when the active theme id changed after staging", () => {
    const result = applyProposal(staged(), { ...theme, id: "forked-theme" }, "p-1")
    expect(result.ok).toBe(false)
    expect(result.session.outcomes.get("p-1")).toBe("stale")
  })

  it("does not auto-rebase: a stale proposal can never be applied afterwards", () => {
    const stale = applyProposal(staged(), { ...theme, revision: theme.revision + 1 }, "p-1")
    expect(applyProposal(stale.session, theme, "p-1").ok).toBe(false)
    expect(applyProposal(stale.session, theme, "p-1").session).toBe(stale.session)
  })

  it("is not affected by an unrelated change to the active theme that keeps id and revision", () => {
    const same = structuredClone(theme)
    expect(applyProposal(staged(), same, "p-1").ok).toBe(true)
  })
})

describe("discard", () => {
  it("clears the staged proposal, records discarded, and takes no theme input", () => {
    const result = discardProposal(staged(), "p-1")
    expect(result.ok).toBe(true)
    expect(result.session.staged).toBeNull()
    expect(result.session.outcomes.get("p-1")).toBe("discarded")
    expect("theme" in result && result.theme).toBeFalsy()
  })

  it("refuses to resolve a proposal that is not the staged one", () => {
    expect(discardProposal(createProposalSession(), "p-1").ok).toBe(false)
    expect(applyProposal(staged(), theme, "other").ok).toBe(false)
  })
})
