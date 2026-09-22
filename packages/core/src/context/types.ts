import type { Contract } from "../contracts/contract"
import type { Theme } from "../theme/schema"
import type { ContextIdentity } from "./identity"
import type { Principle } from "./principles"
import type { ProvenanceEntry } from "./provenance"

export { CONTEXT_SCHEMA_VERSION } from "./identity"

export type ContextRuleId =
  | "context.invalid-request"
  | "context.unknown-field"
  | "context.unsupported-version"
  | "context.unsupported-operation"
  | "context.unknown-theme"
  | "context.unknown-resource"
  | "context.oversize-result"

export type ContextError = { ruleId: ContextRuleId; path: string }

export type ListRequest = { version: string; operation: "list" }
export type GetRequest = { version: string; operation: "get"; theme: string; resource: string }
export type CapabilitiesRequest = { version: string; operation: "capabilities" }
export type ContextRequest = ListRequest | GetRequest | CapabilitiesRequest

export type ThemeSummary = { id: string; name: string; revision: number }
export type ResourceSummary = { id: string; kind: "component" | "pattern" }

export type ListResult = {
  version: string
  operation: "list"
  identity: ContextIdentity
  themes: readonly ThemeSummary[]
  resources: readonly ResourceSummary[]
}

export type ResourceDetail = {
  id: string
  purpose: Contract["purpose"]
  use: Contract["use"]
  avoid: Contract["avoid"]
  variants: Contract["variants"]
  responsiveBehavior: Contract["responsiveBehavior"]
  accessibility: Contract["accessibility"]
  composition: Contract["composition"]
  examples: Contract["examples"]
  mistakes: Contract["mistakes"]
  mobileReplacement: Contract["mobileReplacement"]
  constraints: Contract["constraints"]
}

export type CapabilitiesSummary = {
  mutationSchemaVersion: string
  proposalSchemaVersion: string
  operationCount: number
  maxProposalOperations: number
}

export type GetResult = {
  version: string
  operation: "get"
  identity: ContextIdentity
  theme: Theme
  resource: ResourceDetail
  principles?: readonly Principle[]
  provenance: { theme: ProvenanceEntry; resource: ProvenanceEntry }
  capabilitiesSummary: CapabilitiesSummary
}

export type MutationOperationCapability = { name: string; fields: readonly string[]; valueConstraint: string }

export type CapabilitiesResult = {
  version: string
  operation: "capabilities"
  identity: ContextIdentity
  mutation: { schemaVersion: string; operations: readonly MutationOperationCapability[] }
  proposal: {
    schemaVersion: string
    maxOperationsPerProposal: number
    maxIntentSummaryLength: number
    provenanceSources: readonly string[]
    lifecycle: Readonly<Record<string, readonly string[]>>
  }
  unsupported: readonly string[]
}

export type ContextPayload = ListResult | GetResult | CapabilitiesResult

export type ContextResult = ({ ok: true } & ContextPayload) | { ok: false; errors: ContextError[] }
