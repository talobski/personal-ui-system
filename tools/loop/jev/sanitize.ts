import type { Json } from "./types.ts"

export const REDACTED = "[REDACTED]"
export const MAX_DEPTH = 8
export const MAX_STATE_BYTES = 32 * 1024

const SENSITIVE_SEGMENTS = new Set([
  "password",
  "passwords",
  "passwd",
  "pwd",
  "passphrase",
  "secret",
  "secrets",
  "token",
  "tokens",
  "cookie",
  "cookies",
  "authorization",
  "auth",
  "credential",
  "credentials",
  "apikey",
  "key",
  "keys",
  "bearer",
])

/** Names like `tokenBudget` or `tokens: 5000` are counters, not credentials; numeric/boolean values survive. */
const COUNTER_SEGMENTS = new Set(["token", "tokens"])

export const isSensitiveKey = (key: string): boolean =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .some((segment) => SENSITIVE_SEGMENTS.has(segment))

const isCounterKey = (key: string): boolean =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .every((segment) => !SENSITIVE_SEGMENTS.has(segment) || COUNTER_SEGMENTS.has(segment))

const STRING_PATTERNS: [RegExp, string][] = [
  [/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{6,}/gi, `Bearer ${REDACTED}`],
  [
    /\b(api[_-]?key|token|secret|password|passwd|authorization|cookie)(\s*[=:]\s*)(?:(?:Bearer|Basic)\s+)?\S+/gi,
    `$1$2${REDACTED}`,
  ],
  [/\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s@]+@/gi, `://${REDACTED}@`],
  [/\b(?:sk|pk|rk)-[A-Za-z0-9_-]{16,}/g, REDACTED],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/g, REDACTED],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/g, REDACTED],
  [/\bAKIA[0-9A-Z]{16}\b/g, REDACTED],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, REDACTED],
]

/** Redacts known secret literals and secret-shaped substrings. */
export function redactString(value: string, secrets: readonly string[] = []): string {
  let out = value
  for (const secret of secrets) if (secret.length > 0) out = out.split(secret).join(REDACTED)
  for (const [pattern, replacement] of STRING_PATTERNS) out = out.replace(pattern, replacement)
  return out
}

export type SanitizeResult =
  | { ok: true; value: Json; bytes: number }
  | { ok: false; message: string }

export type SanitizeOptions = { secrets?: readonly string[]; maxDepth?: number; maxBytes?: number }

/**
 * Recursively copies JSON-compatible data, redacting credential-named keys and
 * secret-shaped strings. Fails (rather than truncating) on non-JSON values,
 * excessive depth, or excessive serialized size so callers can fail closed.
 */
export function sanitize(input: unknown, options: SanitizeOptions = {}): SanitizeResult {
  const secrets = options.secrets ?? []
  const maxDepth = options.maxDepth ?? MAX_DEPTH
  const maxBytes = options.maxBytes ?? MAX_STATE_BYTES
  let failure: string | null = null
  const fail = (message: string): Json => {
    failure ??= message
    return null
  }

  const walk = (value: unknown, depth: number): Json => {
    if (failure !== null) return null
    if (depth > maxDepth) return fail(`nesting deeper than ${maxDepth}`)
    if (value === null || typeof value === "boolean") return value
    if (typeof value === "number") return Number.isFinite(value) ? value : fail("non-finite number")
    if (typeof value === "string") return redactString(value, secrets)
    if (Array.isArray(value)) return value.map((item) => walk(item, depth + 1))
    if (typeof value === "object") {
      const proto = Object.getPrototypeOf(value)
      if (proto !== Object.prototype && proto !== null) return fail("non-plain object")
      const out: Record<string, Json> = {}
      for (const [key, child] of Object.entries(value)) {
        const safeKey = redactString(key, secrets)
        const redact =
          isSensitiveKey(key) && !(isCounterKey(key) && (typeof child === "number" || typeof child === "boolean"))
        Object.defineProperty(out, safeKey, {
          value: redact ? REDACTED : walk(child, depth + 1),
          enumerable: true,
          writable: true,
          configurable: true,
        })
      }
      return out
    }
    return fail(`unsupported ${typeof value} value`)
  }

  const value = walk(input, 0)
  if (failure !== null) return { ok: false, message: failure }
  const bytes = Buffer.byteLength(JSON.stringify(value), "utf8")
  if (bytes > maxBytes) return { ok: false, message: `serialized size ${bytes} exceeds ${maxBytes} bytes` }
  return { ok: true, value, bytes }
}
