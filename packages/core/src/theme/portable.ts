import { themeSchema } from "./schema"
import type { Theme } from "./schema"

/**
 * The portable theme: only the design data needed to reproduce a theme, with no Personal UI identity or runtime
 * bookkeeping. Dropped from canonical Theme v3: `$schema`, `schemaVersion`, `kind`, `id`, `name`, `revision`,
 * `$extensions` (the `personal-ui-system` display name) and `sidebar.dedicatedValuesInitialized` (internal Sidebar
 * state). Tokens keep their DTCG `$type`/`$value` shape. Not a Theme v3 document: `validateTheme` does not accept it.
 */
export type PortableTheme = {
  colors: Theme["colors"]
  typography: Theme["typography"]
  radius: Theme["radius"]
  space: Theme["space"]
  shadow: Theme["shadow"]
  motion: Theme["motion"]
  sidebar: { useDedicatedTokens: Theme["sidebar"]["useDedicatedTokens"] }
  uiEffects?: NonNullable<Theme["uiEffects"]>
}

/** Canonicalizes `input` through the Theme v3 schema, then keeps only its design data, in a fixed key order. */
export function toPortableTheme(input: Theme): PortableTheme {
  const theme = themeSchema.parse(input)
  return {
    colors: theme.colors,
    typography: theme.typography,
    radius: theme.radius,
    space: theme.space,
    shadow: theme.shadow,
    motion: theme.motion,
    sidebar: { useDedicatedTokens: theme.sidebar.useDedicatedTokens },
    ...(theme.uiEffects ? { uiEffects: theme.uiEffects } : {}),
  }
}
