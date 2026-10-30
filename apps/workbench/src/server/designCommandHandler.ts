import { buildDesignCommandState, isCommandTextUsable } from "@personal-ui/core"
import type { ActiveMode, DesignCommandOutcome } from "@personal-ui/core"
import { evaluateDesignCommand } from "@personal-ui/core/jev-design/evaluate"

/**
 * The localhost product API: workbench browser -> this handler (server-side only) -> TypeSafe API. Only this
 * handler may read `TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY`; it never reads, aliases, or falls back to
 * `TYPESAFE_API_KEY`. It is a pure `(Request, env, fetch, trustedOrigins) -> Response` function so it is testable
 * without a real HTTP server or process.env; `vite.config.ts` adapts it into a dev-server middleware
 * (`./designCommandMiddleware.ts`) that passes the original request headers through.
 */
export const PRODUCT_CREDENTIAL_ENV_VAR = "TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY"
export const DESIGN_COMMAND_ROUTE = "/api/design-command/evaluate"
/** `commandText` is capped at 280 characters plus a short `activeMode` field; this is generous headroom over any
 * legitimate request and rejects an oversized body before it is even parsed as JSON. */
export const MAX_REQUEST_BODY_BYTES = 8 * 1024

export type DesignCommandServerEnv = Readonly<Record<string, string | undefined>>

export type DesignCommandEvaluateRequestBody = { commandText: unknown; activeMode: unknown }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)
const isActiveMode = (value: unknown): value is ActiveMode => value === "light" || value === "dark"

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

const rejected = (code: string, status = 200): Response => json({ outcome: { kind: "rejected", reason: { code } } as DesignCommandOutcome }, status)

/**
 * Only the Workbench itself may spend the credential. Checked before the credential or the body is read, so another
 * site can neither trigger an upstream call nor learn whether a credential is configured:
 * - `Origin` is required and must be one of `trustedOrigins`. Browsers send it on every POST, so a request without
 *   it did not come from the Workbench page.
 * - `Sec-Fetch-Site` is optional, for browsers that send no fetch metadata, but when present it must be
 *   `same-origin`; any other value conflicts with a trusted `Origin`.
 * - The body must be declared `application/json`. That rules out the `text/plain` and form posts a page can send
 *   cross-origin without a CORS preflight.
 */
function rejectUntrustedRequest(request: Request, trustedOrigins: readonly string[]): Response | null {
  const origin = request.headers.get("origin")
  if (origin === null) return rejected("design-command.missing-origin", 403)
  if (!trustedOrigins.includes(origin)) return rejected("design-command.untrusted-origin", 403)
  const site = request.headers.get("sec-fetch-site")
  if (site !== null && site !== "same-origin") return rejected("design-command.cross-site-request", 403)
  const mediaType = request.headers.get("content-type")?.split(";")[0]!.trim().toLowerCase()
  if (mediaType !== "application/json") return rejected("design-command.unsupported-media-type", 415)
  return null
}

/**
 * Handles one `POST /api/design-command/evaluate` request. Reads only the product credential, and only from `env`
 * (never a real `process.env` lookup happens inside this pure function — the caller decides what `env` is). An
 * untrusted request (see `rejectUntrustedRequest`) or a missing or empty credential returns a stable rejected outcome
 * and makes zero fetches: `evaluateDesignCommand` is never even called.
 */
export async function handleDesignCommandEvaluate(
  request: Request,
  env: DesignCommandServerEnv,
  fetchImpl: typeof fetch,
  trustedOrigins: readonly string[]
): Promise<Response> {
  if (request.method !== "POST") return json({ outcome: { kind: "rejected", reason: { code: "design-command.method-not-allowed" } } }, 405)

  const untrusted = rejectUntrustedRequest(request, trustedOrigins)
  if (untrusted) return untrusted

  const apiKey = env[PRODUCT_CREDENTIAL_ENV_VAR]
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) return rejected("transport.missing-credential")

  let text: string
  try {
    text = await request.text()
  } catch {
    return rejected("design-command.invalid-request-body", 400)
  }
  if (text.length > MAX_REQUEST_BODY_BYTES) return rejected("design-command.request-too-large", 413)

  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return rejected("design-command.invalid-request-body", 400)
  }
  if (!isRecord(body) || typeof body.commandText !== "string" || !isActiveMode(body.activeMode)) {
    return rejected("design-command.invalid-request-body", 400)
  }

  const state = buildDesignCommandState(body.commandText, body.activeMode)
  if (!isCommandTextUsable(state)) return rejected("design-command.empty-text")

  const outcome = await evaluateDesignCommand(state, { apiKey, fetch: fetchImpl })
  return json({ outcome })
}
