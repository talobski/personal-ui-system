/**
 * Canonical serialization for the context surface: no whitespace, and callers build every payload object with
 * explicit, literal key order (never spread from an untrusted or iteration-order-dependent source) so
 * `JSON.stringify`'s insertion-order behavior is deterministic and tested, not incidental.
 */
export const toCanonicalJson = (value: unknown): string => JSON.stringify(value)

export const byteLength = (json: string): number => new TextEncoder().encode(json).length

/** UTF-8 output ceilings (requirement 8), keyed by operation. */
export const OPERATION_MAX_BYTES = { list: 8 * 1024, get: 32 * 1024, capabilities: 8 * 1024 } as const
export type CeilingOperation = keyof typeof OPERATION_MAX_BYTES

/** Fails closed (no emitted JSON) rather than truncating or streaming a partial result. */
export function serializeWithCeiling(operation: CeilingOperation, payload: unknown): { ok: true; json: string } | { ok: false } {
  const json = toCanonicalJson(payload)
  return byteLength(json) > OPERATION_MAX_BYTES[operation] ? { ok: false } : { ok: true, json }
}
