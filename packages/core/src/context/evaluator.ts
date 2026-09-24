import { getContract, listContractIds } from "../contracts/catalog"
import { MUTATION_SCHEMA_VERSION } from "../mutations/mutation"
import { MAX_PROPOSAL_OPERATIONS, MAX_INTENT_SUMMARY_LENGTH, PROPOSAL_SCHEMA_VERSION, PROPOSAL_LIFECYCLE_TRANSITIONS, PROVENANCE_SOURCES } from "../mutations/proposal"
import { mutationOperationCapabilities, UNSUPPORTED_ESCAPE_HATCHES } from "./capability-descriptions"
import { CONTEXT_SCHEMA_VERSION, identity } from "./identity"
import { compareCodeUnits } from "./ordering"
import { principlesFor } from "./principles"
import { PROVENANCE_MANIFEST, resourceProvenanceKey, themeProvenanceKey } from "./provenance"
import { deepFreeze, serializeWithCeiling } from "./serialize"
import { getValidatedTheme, listThemeSummaries } from "./themes"
import type { ContextError, ContextPayload, ContextResult, GetResult, ListResult, CapabilitiesResult } from "./types"

const OPERATIONS = new Set(["list", "get", "capabilities"])
const KEYS_BY_OPERATION: Readonly<Record<string, ReadonlySet<string>>> = {
  list: new Set(["version", "operation"]),
  get: new Set(["version", "operation", "theme", "resource"]),
  capabilities: new Set(["version", "operation"]),
}
const RESOURCE_KINDS = Object.freeze({
  "resizable-panel": "pattern",
  button: "component",
  field: "pattern",
  input: "component",
  "native-select": "component",
  "responsive-dialog": "pattern",
  card: "component",
  tabs: "component",
  switch: "component",
  textarea: "component",
  "single-toggle-group": "pattern",
  slider: "component",
  collapsible: "component",
} as const)

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)

const fail = (errors: ContextError[]): ContextResult => ({ ok: false, errors })

/** The exact object shape returned to a caller and printed by the CLI: `ok: true` first, then the payload's own keys. */
export const buildSuccessEnvelope = <T extends ContextPayload>(payload: T): { ok: true } & T => ({ ok: true, ...payload })

/**
 * Measures and freezes the *exact* envelope that will be returned/emitted (including `ok: true`, not the bare
 * payload) against its operation's ceiling, and fails closed before anything is returned if it does not fit.
 */
function finalize(payload: ContextPayload): ContextResult {
  const envelope = buildSuccessEnvelope(payload)
  const serialized = serializeWithCeiling(payload.operation, envelope)
  if (!serialized.ok) return fail([{ ruleId: "context.oversize-result", path: "" }])
  return deepFreeze(envelope)
}

async function buildListPayload(): Promise<ListResult> {
  const ids = listContractIds().slice().sort(compareCodeUnits)
  const resources = await Promise.all(
    ids.map(async (id) => {
      const contract = await getContract(id)
      if (!contract) throw new Error(`contract "${id}" is in the catalog but failed to load`)
      return { id, kind: RESOURCE_KINDS[id], purpose: contract.purpose }
    })
  )
  return {
    version: CONTEXT_SCHEMA_VERSION,
    operation: "list",
    identity: identity(),
    themes: listThemeSummaries(),
    resources,
  }
}

function buildCapabilitiesPayload(): CapabilitiesResult {
  return {
    version: CONTEXT_SCHEMA_VERSION,
    operation: "capabilities",
    identity: identity(),
    mutation: { schemaVersion: MUTATION_SCHEMA_VERSION, operations: mutationOperationCapabilities() },
    proposal: {
      schemaVersion: PROPOSAL_SCHEMA_VERSION,
      maxOperationsPerProposal: MAX_PROPOSAL_OPERATIONS,
      maxIntentSummaryLength: MAX_INTENT_SUMMARY_LENGTH,
      provenanceSources: [...PROVENANCE_SOURCES],
      lifecycle: PROPOSAL_LIFECYCLE_TRANSITIONS,
    },
    unsupported: UNSUPPORTED_ESCAPE_HATCHES,
  }
}

/**
 * Pure, deterministic core evaluator: same request in, same result out. `get` awaits exactly one dynamic import (the
 * requested contract module, via the existing catalog), never the full catalog, so a single lookup stays targeted;
 * `list` awaits one dynamic import per pilot to source each resource's `purpose` from its own validated contract.
 */
export async function evaluateContextRequest(input: unknown): Promise<ContextResult> {
  if (!isRecord(input)) return fail([{ ruleId: "context.invalid-request", path: "" }])

  const errors: ContextError[] = []
  if (input.version !== CONTEXT_SCHEMA_VERSION) errors.push({ ruleId: "context.unsupported-version", path: "version" })

  const operation = input.operation
  if (typeof operation !== "string" || !OPERATIONS.has(operation)) {
    errors.push({ ruleId: "context.unsupported-operation", path: "operation" })
    return fail(errors)
  }

  const allowedKeys = KEYS_BY_OPERATION[operation]!
  for (const key of Object.keys(input)) if (!allowedKeys.has(key)) errors.push({ ruleId: "context.unknown-field", path: key })

  if (operation === "get") {
    if (typeof input.theme !== "string" || input.theme.length === 0) errors.push({ ruleId: "context.invalid-request", path: "theme" })
    if (typeof input.resource !== "string" || input.resource.length === 0) errors.push({ ruleId: "context.invalid-request", path: "resource" })
  }

  if (errors.length > 0) return fail(errors)

  if (operation === "list") return finalize(await buildListPayload())
  if (operation === "capabilities") return finalize(buildCapabilitiesPayload())

  const themeId = input.theme as string
  const resourceId = input.resource as string

  const theme = getValidatedTheme(themeId)
  if (!theme) return fail([{ ruleId: "context.unknown-theme", path: "theme" }])

  if (!listContractIds().includes(resourceId as never)) return fail([{ ruleId: "context.unknown-resource", path: "resource" }])
  const contract = await getContract(resourceId)
  if (!contract) return fail([{ ruleId: "context.unknown-resource", path: "resource" }])

  const principles = principlesFor(contract.id)
  const payload: GetResult = {
    version: CONTEXT_SCHEMA_VERSION,
    operation: "get",
    identity: identity(),
    theme,
    resource: {
      id: contract.id,
      purpose: contract.purpose,
      use: contract.use,
      avoid: contract.avoid,
      variants: contract.variants,
      responsiveBehavior: contract.responsiveBehavior,
      accessibility: contract.accessibility,
      composition: contract.composition,
      examples: contract.examples,
      mistakes: contract.mistakes,
      mobileReplacement: contract.mobileReplacement,
      constraints: contract.constraints,
    },
    ...(principles ? { principles } : {}),
    provenance: {
      theme: PROVENANCE_MANIFEST[themeProvenanceKey(theme.id)],
      resource: PROVENANCE_MANIFEST[resourceProvenanceKey(contract.id)],
    },
    capabilitiesSummary: {
      mutationSchemaVersion: MUTATION_SCHEMA_VERSION,
      proposalSchemaVersion: PROPOSAL_SCHEMA_VERSION,
      operationCount: mutationOperationCapabilities().length,
      maxProposalOperations: MAX_PROPOSAL_OPERATIONS,
    },
  }
  return finalize(payload)
}
