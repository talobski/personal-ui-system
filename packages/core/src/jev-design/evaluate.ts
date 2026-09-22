import { acceptAnswers } from "./accept"
import { composeDesignCommandOutcome } from "./compose"
import type { DesignCommandOutcome } from "./compose"
import { buildQuestionCatalog, buildTypeSafeRequest } from "./questions"
import { isCommandTextUsable } from "./state"
import type { DesignCommandState } from "./state"
import { TYPESAFE_API_URL } from "./wire"
import type { TypeSafeResponse } from "./wire"

/** Response bodies larger than this are rejected unread; a legitimate 9-answer batch is well under this. */
const MAX_RESPONSE_BYTES = 32 * 1024
const DEFAULT_TIMEOUT_MS = 60000

export type EvaluateDesignCommandDeps = {
  /** Server-side product credential. Never read from `process.env` by this function; the caller owns that boundary. */
  apiKey: string
  /** Injected fetch seam; production code passes the platform `fetch`. */
  fetch: typeof fetch
  timeoutMs?: number
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)

function isTypeSafeResponse(value: unknown): value is TypeSafeResponse {
  return isRecord(value) && isRecord(value.answers)
}

/**
 * One bounded HTTP attempt against the fixed TypeSafe endpoint. No silent retry. A missing or empty `apiKey` makes
 * zero fetches. Every transport, shape, or acceptance failure returns `{kind:"rejected"}` and never partially
 * resolves a proposal. This function never reads `process.env`; the server-side caller owns reading the product
 * credential and passes it in.
 */
export async function evaluateDesignCommand(state: DesignCommandState, deps: EvaluateDesignCommandDeps): Promise<DesignCommandOutcome> {
  if (!isCommandTextUsable(state)) return { kind: "rejected", reason: { code: "design-command.empty-text" } }
  if (!deps.apiKey || deps.apiKey.trim().length === 0) return { kind: "rejected", reason: { code: "transport.missing-credential" } }

  const questions = buildQuestionCatalog()
  const request = buildTypeSafeRequest(state)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), deps.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  let response: Response
  try {
    response = await deps.fetch(TYPESAFE_API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${deps.apiKey}` },
      body: JSON.stringify(request),
      signal: controller.signal,
    })
  } catch (error) {
    return { kind: "rejected", reason: { code: error instanceof Error && error.name === "AbortError" ? "transport.timeout" : "transport.network" } }
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const code =
      response.status === 401 || response.status === 403
        ? "transport.unauthorized"
        : response.status === 429
          ? "transport.rate-limited"
          : response.status === 529
            ? "transport.overloaded"
            : "transport.http-error"
    return { kind: "rejected", reason: { code, path: String(response.status) } }
  }

  let text: string
  try {
    text = await response.text()
  } catch {
    return { kind: "rejected", reason: { code: "transport.malformed-response" } }
  }
  if (text.length > MAX_RESPONSE_BYTES) return { kind: "rejected", reason: { code: "transport.oversized-response" } }

  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return { kind: "rejected", reason: { code: "transport.malformed-response" } }
  }
  if (!isTypeSafeResponse(body)) return { kind: "rejected", reason: { code: "transport.malformed-response" } }

  const accepted = acceptAnswers(questions, body)
  if (!accepted.ok) return { kind: "rejected", reason: { code: accepted.errors[0]!.ruleId, path: accepted.errors[0]!.path } }

  return composeDesignCommandOutcome(accepted.answers, state.activeMode)
}
