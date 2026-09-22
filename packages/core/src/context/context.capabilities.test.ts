import { describe, expect, it } from "vitest"
import { compareCodeUnits, evaluateContextRequest, OPERATION_MAX_BYTES, toCanonicalJson } from "../index"
import { describeOperations } from "../mutations/mutation"
import { VALUE_CONSTRAINT_DESCRIPTIONS } from "./capability-descriptions"

const operationNames = () => describeOperations().map((o) => o.name)
const fieldsFor = (name: string) => describeOperations().find((o) => o.name === name)!.fields

const CAPABILITIES = { version: "personal-ui-context/1", operation: "capabilities" } as const

const capabilities = async () => {
  const result = await evaluateContextRequest(CAPABILITIES)
  if (!result.ok) throw new Error("expected ok")
  if (result.operation !== "capabilities") throw new Error("expected capabilities")
  return result
}

describe("context capabilities (ACR-04)", () => {
  it("describes exactly the closed set of existing mutation operations", async () => {
    const result = await capabilities()
    expect(result.mutation.operations.map((o) => o.name).sort(compareCodeUnits)).toEqual(operationNames().sort(compareCodeUnits))
  })

  it("has an accurate, up-to-date value-constraint description for every operation mutation.ts declares", () => {
    expect(Object.keys(VALUE_CONSTRAINT_DESCRIPTIONS).sort(compareCodeUnits)).toEqual(operationNames().sort(compareCodeUnits))
  })

  it("declares each operation's exact allowlisted fields, sorted by code unit", async () => {
    const result = await capabilities()
    for (const operation of result.mutation.operations) {
      expect(operation.fields).toEqual([...fieldsFor(operation.name)].sort(compareCodeUnits))
    }
  })

  it("describes the proposal envelope's closed limits and lifecycle, not any wider capability", async () => {
    const result = await capabilities()
    expect(result.proposal).toEqual({
      schemaVersion: "1.0",
      maxOperationsPerProposal: 8,
      maxIntentSummaryLength: 240,
      provenanceSources: ["manual", "agent", "fixture"],
      lifecycle: { received: ["rejected", "staged"], staged: ["applied", "discarded", "stale"] },
    })
  })

  it("lists explicit unsupported escape hatches, including arbitrary CSS and filesystem paths", async () => {
    const result = await capabilities()
    expect(result.unsupported.some((line) => /CSS/.test(line))).toBe(true)
    expect(result.unsupported.some((line) => /filesystem path/.test(line))).toBe(true)
    expect(result.unsupported.length).toBeGreaterThan(0)
  })

  it("rejects an unknown field, adding no semantics via the request itself", async () => {
    const result = await evaluateContextRequest({ ...CAPABILITIES, verbose: true })
    expect(result).toEqual({ ok: false, errors: [{ ruleId: "context.unknown-field", path: "verbose" }] })
  })

  it("stays within the 8 KiB capabilities ceiling", async () => {
    const result = await capabilities()
    const bytes = new TextEncoder().encode(toCanonicalJson(result)).length
    expect(bytes).toBeLessThanOrEqual(OPERATION_MAX_BYTES.capabilities)
  })

  it("is byte-identical across repeated in-process evaluations", async () => {
    const first = toCanonicalJson(await evaluateContextRequest(CAPABILITIES))
    const second = toCanonicalJson(await evaluateContextRequest(CAPABILITIES))
    expect(first).toBe(second)
  })
})
