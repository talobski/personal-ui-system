import { describe, expect, it } from "vitest"
import {
  promoteRuleCandidate,
  ruleCandidateSchema,
  validateRuleRecord,
} from "../index"

const candidate = {
  schemaVersion: "1.0",
  kind: "personal-ui-rule",
  id: "prefer-dense-tables",
  title: "Prefer dense tables",
  proposedRule: "Use compact row spacing for operational data tables unless scanning needs require more space.",
  status: "candidate",
  occurrenceCount: 2,
  provenance: [
    {
      source: "project-alpha/review-2",
      observedAt: "2026-09-18T09:30:00+08:00",
      example: "The first table used generous card spacing.",
      correction: "Reduce row padding and remove card treatment.",
    },
    {
      source: "project-beta/review-1",
      observedAt: "2026-09-20T14:00:00+08:00",
      example: "The activity table was too airy for frequent scanning.",
      correction: "Use compact rows for operational tables.",
    },
  ],
} as const

const approval = {
  authority: "owner",
  decision: "approved",
  response: "Approved for operational data tables; keep editorial tables outside this rule.",
  respondedAt: "2026-09-21T01:00:00+08:00",
} as const

describe("rule candidates", () => {
  it("records repeated corrections as a non-active candidate with auditable provenance", () => {
    const parsed = ruleCandidateSchema.parse(candidate)
    expect(parsed.status).toBe("candidate")
    expect(parsed.occurrenceCount).toBe(parsed.provenance.length)
  })

  it("rejects a candidate whose occurrence count does not match its provenance", () => {
    expect(ruleCandidateSchema.safeParse({ ...candidate, occurrenceCount: 3 }).success).toBe(false)
  })
})

describe("human-controlled promotion", () => {
  it("rejects direct candidate-to-active mutation without an approval receipt", () => {
    expect(validateRuleRecord({ ...candidate, status: "active" })).toEqual({
      ok: false,
      errors: [{ ruleId: "promotion.approval-required", path: "approval" }],
    })
  })

  it("rejects the promotion operation when approval is omitted", () => {
    expect(
      promoteRuleCandidate(candidate, {
        schemaVersion: "1.0",
        operation: "promoteRule",
        candidateId: candidate.id,
      })
    ).toEqual({ ok: false, errors: [{ ruleId: "promotion.approval-required", path: "approval" }] })
  })

  it("rejects malformed approval and mismatched candidate identity", () => {
    const malformed = promoteRuleCandidate(candidate, {
      schemaVersion: "1.0",
      operation: "promoteRule",
      candidateId: candidate.id,
      approval: { ...approval, authority: "agent" },
    })
    expect(malformed.ok).toBe(false)
    if (!malformed.ok) expect(malformed.errors).toContainEqual({ ruleId: "promotion.invalid-approval", path: "approval.authority" })

    expect(
      promoteRuleCandidate(candidate, {
        schemaVersion: "1.0",
        operation: "promoteRule",
        candidateId: "another-rule",
        approval,
      })
    ).toEqual({ ok: false, errors: [{ ruleId: "promotion.candidate-mismatch", path: "candidateId" }] })
  })

  it("promotes only with owner approval and preserves provenance, response, and timestamp", () => {
    const result = promoteRuleCandidate(candidate, {
      schemaVersion: "1.0",
      operation: "promoteRule",
      candidateId: candidate.id,
      approval,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rule.status).toBe("active")
    expect(result.rule.provenance).toEqual(candidate.provenance)
    expect(result.rule.approval.response).toBe(approval.response)
    expect(result.rule.approval.respondedAt).toBe(approval.respondedAt)
    expect(validateRuleRecord(result.rule)).toEqual({ ok: true, record: result.rule })
    expect(validateRuleRecord({ ...result.rule, occurrenceCount: 3 }).ok).toBe(false)
  })
})
