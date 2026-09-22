import type { DesignCommandOutcome, ThemeOperation } from "@personal-ui/core"

export const DESIGN_COMMAND_ROUTE = "/api/design-command/evaluate"
const MAX_INTENT_SUMMARY_LENGTH = 240

export type DesignCommandFetchResult = { ok: true; outcome: DesignCommandOutcome } | { ok: false; outcome: { kind: "rejected"; reason: { code: string } } }

/** Calls the localhost product API. One request; the browser never sees or sends any credential. */
export async function evaluateDesignCommandClient(commandText: string, activeMode: "light" | "dark", fetchImpl: typeof fetch = fetch): Promise<DesignCommandFetchResult> {
  try {
    const response = await fetchImpl(DESIGN_COMMAND_ROUTE, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ commandText, activeMode }),
    })
    if (!response.ok) return { ok: false, outcome: { kind: "rejected", reason: { code: "design-command.client-http-error" } } }
    const body = (await response.json()) as { outcome: DesignCommandOutcome }
    return { ok: true, outcome: body.outcome }
  } catch {
    return { ok: false, outcome: { kind: "rejected", reason: { code: "design-command.client-network-error" } } }
  }
}

/** Builds a normal MutationProposalV1 input for the existing, unchanged `stageProposal` pipeline. */
export function buildDesignCommandProposal(
  commandText: string,
  operations: readonly ThemeOperation[],
  base: { themeId: string; revision: number },
  proposalId: string,
  now: string
) {
  const intentSummary = commandText.trim().slice(0, MAX_INTENT_SUMMARY_LENGTH) || undefined
  return {
    schemaVersion: "1.0",
    proposalId,
    base,
    provenance: { source: "agent", sourceId: "jev-design-command/1", createdAt: now, ...(intentSummary ? { intentSummary } : {}) },
    operations,
  }
}
