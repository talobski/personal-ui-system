export const DESIGN_COMMAND_STATE_VERSION = "design-command-state/1"
export const MAX_COMMAND_TEXT_LENGTH = 280

export type ActiveMode = "light" | "dark"

/**
 * Compact state sent to Jev. No `Theme` object, token `$value`, revision, id, credential, or prior-proposal history
 * is ever included: numeric/OKLCH/dimension values must never be the semantic judgment, and identity/versioning is a
 * code-only concern (`docs/JEV_OFFICIAL_SOURCE_PACKET.md`, "Filter state before sending it").
 */
export type DesignCommandState = {
  schemaVersion: typeof DESIGN_COMMAND_STATE_VERSION
  /** Raw user input, trimmed, control characters stripped, capped at `MAX_COMMAND_TEXT_LENGTH` characters. */
  commandText: string
  /** Informational only; Jev derives no category, dimension, or color value from it. */
  activeMode: ActiveMode
}

// eslint-disable-next-line no-control-regex -- deliberately stripping control characters from user input
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g

/** Builds the compact state from raw workbench input. Always returns a valid, bounded state; never throws. */
export function buildDesignCommandState(rawCommandText: string, activeMode: ActiveMode): DesignCommandState {
  const stripped = rawCommandText.replace(CONTROL_CHARACTERS, "").trim()
  const commandText = Array.from(stripped).slice(0, MAX_COMMAND_TEXT_LENGTH).join("")
  return { schemaVersion: DESIGN_COMMAND_STATE_VERSION, commandText, activeMode }
}

/** An empty command can never resolve to any category; code rejects it before building a packet or calling Jev. */
export const isCommandTextUsable = (state: DesignCommandState): boolean => state.commandText.length > 0
