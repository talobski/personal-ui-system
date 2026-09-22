import { buildDesignCommandState, isCommandTextUsable } from "@personal-ui/core"
import type { ActiveMode, DesignCommandOutcome } from "@personal-ui/core"
import { evaluateDesignCommand } from "@personal-ui/core/jev-design/evaluate"

/**
 * The localhost product API: workbench browser -> this handler (server-side only) -> TypeSafe API. Only this
 * handler may read `TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY`; it never reads, aliases, or falls back to
 * `TYPESAFE_LOOP_ENGINEERING_API_KEY` or `TYPESAFE_API_KEY`. It never imports `@loop-engineering/jev-core` or
 * touches `.loop`. It is a pure `(Request, env, fetch) -> Response` function so it is testable without a real HTTP
 * server or process.env; `vite.config.ts` adapts it into a dev-server middleware.
 */
export const PRODUCT_CREDENTIAL_ENV_VAR = "TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY"
export const DESIGN_COMMAND_ROUTE = "/api/design-command/evaluate"

export type DesignCommandServerEnv = Readonly<Record<string, string | undefined>>

export type DesignCommandEvaluateRequestBody = { commandText: unknown; activeMode: unknown }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)
const isActiveMode = (value: unknown): value is ActiveMode => value === "light" || value === "dark"

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

const rejected = (code: string, status = 200): Response => json({ outcome: { kind: "rejected", reason: { code } } as DesignCommandOutcome }, status)

/**
 * Handles one `POST /api/design-command/evaluate` request. Reads only the product credential, and only from `env`
 * (never a real `process.env` lookup happens inside this pure function — the caller decides what `env` is). A
 * missing or empty credential returns a stable rejected outcome and makes zero fetches: `evaluateDesignCommand` is
 * never even called.
 */
export async function handleDesignCommandEvaluate(request: Request, env: DesignCommandServerEnv, fetchImpl: typeof fetch): Promise<Response> {
  if (request.method !== "POST") return json({ outcome: { kind: "rejected", reason: { code: "design-command.method-not-allowed" } } }, 405)

  const apiKey = env[PRODUCT_CREDENTIAL_ENV_VAR]
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) return rejected("transport.missing-credential")

  let body: unknown
  try {
    body = await request.json()
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
