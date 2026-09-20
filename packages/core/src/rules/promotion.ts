import { z } from "zod"

export const RULE_SCHEMA_VERSION = "1.0"

const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const text = z.string().min(1).max(800)
const timestamp = z.iso.datetime({ offset: true })

export const ruleProvenanceSchema = z.strictObject({
  source: z.string().min(1).max(200),
  observedAt: timestamp,
  example: text,
  correction: text,
})

const candidateShape = {
  schemaVersion: z.literal(RULE_SCHEMA_VERSION),
  kind: z.literal("personal-ui-rule"),
  id,
  title: z.string().min(1).max(120),
  proposedRule: text,
  occurrenceCount: z.number().int().min(1),
  provenance: z.array(ruleProvenanceSchema).min(1).max(50),
}

/** A candidate records observations but has no authority to change active design language. */
export const ruleCandidateSchema = z
  .strictObject({ ...candidateShape, status: z.literal("candidate") })
  .superRefine((candidate, context) => {
    if (candidate.occurrenceCount !== candidate.provenance.length) {
      context.addIssue({
        code: "custom",
        path: ["occurrenceCount"],
        message: "occurrenceCount must equal the number of provenance records",
      })
    }
  })

/** V1 receipt: explicit owner authority, exact response text, and its timestamp. */
export const ownerApprovalReceiptSchema = z.strictObject({
  authority: z.literal("owner"),
  decision: z.literal("approved"),
  response: text,
  respondedAt: timestamp,
})

export const activeRuleSchema = z
  .strictObject({
    ...candidateShape,
    status: z.literal("active"),
    approval: ownerApprovalReceiptSchema,
  })
  .superRefine((rule, context) => {
    if (rule.occurrenceCount !== rule.provenance.length) {
      context.addIssue({
        code: "custom",
        path: ["occurrenceCount"],
        message: "occurrenceCount must equal the number of provenance records",
      })
    }
  })

export const ruleRecordSchema = z.union([ruleCandidateSchema, activeRuleSchema])

export const promotionRequestSchema = z.strictObject({
  schemaVersion: z.literal(RULE_SCHEMA_VERSION),
  operation: z.literal("promoteRule"),
  candidateId: id,
  approval: ownerApprovalReceiptSchema,
})

export type RuleCandidate = z.infer<typeof ruleCandidateSchema>
export type OwnerApprovalReceipt = z.infer<typeof ownerApprovalReceiptSchema>
export type ActiveRule = z.infer<typeof activeRuleSchema>
export type RuleRecord = z.infer<typeof ruleRecordSchema>

export type PromotionRuleId =
  | "promotion.invalid-candidate"
  | "promotion.invalid-record"
  | "promotion.invalid-request"
  | "promotion.approval-required"
  | "promotion.invalid-approval"
  | "promotion.candidate-mismatch"

export type PromotionError = { ruleId: PromotionRuleId; path: string }

const pathOf = (path: readonly PropertyKey[]) =>
  path.reduce<string>((out, part) => (typeof part === "number" ? `${out}[${part}]` : out ? `${out}.${String(part)}` : String(part)), "")

export type RuleRecordValidation = { ok: true; record: RuleRecord } | { ok: false; errors: PromotionError[] }

/** Active records fail closed without a complete, schema-valid owner receipt. */
export function validateRuleRecord(input: unknown): RuleRecordValidation {
  const parsed = ruleRecordSchema.safeParse(input)
  if (parsed.success) return { ok: true, record: parsed.data }
  const record = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : undefined
  if (record?.status === "active" && !("approval" in record)) {
    return { ok: false, errors: [{ ruleId: "promotion.approval-required", path: "approval" }] }
  }
  return {
    ok: false,
    errors: parsed.error.issues.map((issue) => ({ ruleId: "promotion.invalid-record", path: pathOf(issue.path) })),
  }
}

export type PromotionResult = { ok: true; rule: ActiveRule } | { ok: false; errors: PromotionError[] }

/**
 * The only V1 candidate-to-active transition. It cannot infer approval: a
 * complete owner receipt must be supplied and is preserved verbatim.
 */
export function promoteRuleCandidate(candidateInput: unknown, requestInput: unknown): PromotionResult {
  const candidate = ruleCandidateSchema.safeParse(candidateInput)
  if (!candidate.success) {
    return {
      ok: false,
      errors: candidate.error.issues.map((issue) => ({ ruleId: "promotion.invalid-candidate", path: pathOf(issue.path) })),
    }
  }

  const requestRecord =
    typeof requestInput === "object" && requestInput !== null ? (requestInput as Record<string, unknown>) : undefined
  if (!requestRecord || !("approval" in requestRecord)) {
    return { ok: false, errors: [{ ruleId: "promotion.approval-required", path: "approval" }] }
  }

  const request = promotionRequestSchema.safeParse(requestInput)
  if (!request.success) {
    return {
      ok: false,
      errors: request.error.issues.map((issue) => ({
        ruleId: pathOf(issue.path).startsWith("approval") ? "promotion.invalid-approval" : "promotion.invalid-request",
        path: pathOf(issue.path),
      })),
    }
  }
  if (request.data.candidateId !== candidate.data.id) {
    return { ok: false, errors: [{ ruleId: "promotion.candidate-mismatch", path: "candidateId" }] }
  }

  return {
    ok: true,
    rule: activeRuleSchema.parse({
      ...candidate.data,
      status: "active",
      approval: request.data.approval,
    }),
  }
}
