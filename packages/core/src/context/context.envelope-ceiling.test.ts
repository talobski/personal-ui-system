import { describe, expect, it } from "vitest"
import { OPERATION_MAX_BYTES, serializeWithCeiling } from "./serialize"
import { buildSuccessEnvelope, evaluateContextRequest } from "./evaluator"

/**
 * ACR-06 regression: the ceiling must be measured against the exact envelope that gets returned/emitted, including
 * the `"ok":true,` prefix `buildSuccessEnvelope` adds — not the bare payload before that prefix exists. This test
 * constructs a payload whose bare-JSON size lands exactly on the ceiling (so it "fits" on its own) but whose
 * envelope exceeds it once `ok: true` is added, proving the envelope — not the payload — is what must be checked.
 */
describe("context envelope ceiling (ACR-06)", () => {
  it.each(["list", "get", "capabilities"] as const)("rejects a %s payload that only exceeds its ceiling once wrapped in the success envelope", (operation) => {
    const ceiling = OPERATION_MAX_BYTES[operation]
    const bareOverhead = JSON.stringify({ operation, v: "" }).length
    const padded = "x".repeat(ceiling - bareOverhead)
    const payload = { operation, v: padded } as never

    // The bare payload fits exactly at the ceiling on its own.
    const bareCheck = serializeWithCeiling(operation, payload)
    expect(bareCheck.ok).toBe(true)

    // Wrapping it in the real success envelope (`{ ok: true, ...payload }`) adds bytes and must now be rejected.
    const envelope = buildSuccessEnvelope(payload)
    expect(JSON.stringify(envelope).length).toBeGreaterThan(JSON.stringify(payload).length)
    const envelopeCheck = serializeWithCeiling(operation, envelope)
    expect(envelopeCheck.ok).toBe(false)
  })

  it.each(["list", "get", "capabilities"] as const)("no real %s success result ever exceeds its ceiling, envelope included", async (operation) => {
    const request =
      operation === "get"
        ? { version: "personal-ui-context/1", operation, theme: "quiet-editorial", resource: "button" }
        : { version: "personal-ui-context/1", operation }
    const result = await evaluateContextRequest(request)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const bytes = new TextEncoder().encode(JSON.stringify(result)).length
    expect(bytes).toBeLessThanOrEqual(OPERATION_MAX_BYTES[operation])
  })
})
