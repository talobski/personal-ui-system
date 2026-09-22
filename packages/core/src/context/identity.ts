import { THEME_SCHEMA_VERSION } from "../theme/schema"
import { MUTATION_SCHEMA_VERSION } from "../mutations/mutation"
import { PROPOSAL_SCHEMA_VERSION } from "../mutations/proposal"

/** The versioned contract this module implements; unrelated to the theme/mutation/proposal schema versions below. */
export const CONTEXT_SCHEMA_VERSION = "personal-ui-context/1" as const

export type ContextIdentity = {
  system: "personal-ui-system"
  contextSchemaVersion: typeof CONTEXT_SCHEMA_VERSION
  themeSchemaVersion: typeof THEME_SCHEMA_VERSION
  mutationSchemaVersion: typeof MUTATION_SCHEMA_VERSION
  proposalSchemaVersion: typeof PROPOSAL_SCHEMA_VERSION
}

/** Static: no clock, environment, or filesystem read. Every field is a compile-time-known version literal. */
export const identity = (): ContextIdentity => ({
  system: "personal-ui-system",
  contextSchemaVersion: CONTEXT_SCHEMA_VERSION,
  themeSchemaVersion: THEME_SCHEMA_VERSION,
  mutationSchemaVersion: MUTATION_SCHEMA_VERSION,
  proposalSchemaVersion: PROPOSAL_SCHEMA_VERSION,
})
