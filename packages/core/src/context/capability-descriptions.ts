import { OPERATION_KEYS } from "../mutations/mutation"
import type { MutationOperationCapability } from "./types"

/**
 * Human-readable value constraints per mutation operation. Field/operation names themselves come from
 * `OPERATION_KEYS` (the mutation module's own closed set), never duplicated here; `context.capabilities.test.ts`
 * asserts this map's key set equals `OPERATION_KEYS`'s, so an operation added to the mutation union without an
 * entry here fails the suite instead of leaving capabilities silently inaccurate.
 */
export const VALUE_CONSTRAINT_DESCRIPTIONS: Readonly<Record<string, string>> = {
  setColor: "oklch(L C H [/ A]) string matching the theme color grammar",
  setRadius: "non-negative rem/px/em dimension",
  setDensity: "number from 0.5 to 2",
  setSansFamily: "single font name matching the theme font-name grammar",
  setShadowBlur: "non-negative rem/px/em dimension",
  setMotionDuration: "non-negative ms/s duration",
}

export function mutationOperationCapabilities(): MutationOperationCapability[] {
  return [...OPERATION_KEYS.entries()]
    .map(([name, fields]) => ({
      name,
      fields: [...fields].sort(),
      valueConstraint: VALUE_CONSTRAINT_DESCRIPTIONS[name] ?? "undescribed",
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export const UNSUPPORTED_ESCAPE_HATCHES = [
  "arbitrary CSS declarations, selectors, or raw stylesheet text",
  "arbitrary or caller-supplied filesystem paths",
  "generic set-any-path or JSON-pointer style operations",
  "bulk or multi-target operations beyond the declared per-proposal operation limit",
  "new mutation operations, themes, components, or contracts beyond the closed catalog",
  "natural-language command interpretation or model-provider configuration",
  "network access, credentials, or MCP/tool coordination",
] as const
