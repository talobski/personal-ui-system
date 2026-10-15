import type { ActiveMode } from "./state"
import type { DesignCategory, StrengthLevel } from "./questions"
import { STRENGTH_SCALE } from "./questions"
import type { ThemeOperation } from "../mutations/mutation"

export const RECIPE_CATALOG_VERSION = "design-command-recipes/2"

/**
 * One directional axis per existing theme category, each backed by an already-existing `ThemeOperation`
 * (`mutations/mutation.ts`). Every recipe is a pure `(category, direction, strength) -> ThemeOperation` lookup into
 * a closed preset table: no arithmetic on the current theme value, no arbitrary CSS, path, token name, or font name
 * from Jev. Numeric presets for radius/density/shadow/motion are directly within the existing schema bounds
 * (`theme/schema.ts`). Color and typography presets are producer-chosen product taste, since no TypeSafe
 * constraint determines them (flagged as such in `docs/JEV_DESIGN_COMMAND_RESEARCH.md` §12 risk 4).
 */

type Preset = Readonly<Record<StrengthLevel, string>>

const RADIUS: { positive: Preset; negative: Preset } = {
  positive: { subtle: "0.625rem", moderate: "0.75rem", strong: "1rem" },
  negative: { subtle: "0.375rem", moderate: "0.25rem", strong: "0.125rem" },
}

const DENSITY: { positive: Record<StrengthLevel, number>; negative: Record<StrengthLevel, number> } = {
  positive: { subtle: 1.1, moderate: 1.3, strong: 1.5 },
  negative: { subtle: 0.9, moderate: 0.8, strong: 0.65 },
}

const SHADOW_BLUR: { positive: Preset; negative: Preset } = {
  positive: { subtle: "6px", moderate: "10px", strong: "16px" },
  negative: { subtle: "3px", moderate: "2px", strong: "1px" },
}

const MOTION_DURATION: { positive: Preset; negative: Preset } = {
  positive: { subtle: "150ms", moderate: "100ms", strong: "60ms" },
  negative: { subtle: "250ms", moderate: "350ms", strong: "500ms" },
}

/** Fixed OKLCH targets for the `primary` token; strength selects how far from neutral the hue/chroma sit. */
const COLOR_PRIMARY: { positive: Preset; negative: Preset } = {
  positive: { subtle: "oklch(0.45 0.08 50)", moderate: "oklch(0.48 0.12 45)", strong: "oklch(0.52 0.16 40)" },
  negative: { subtle: "oklch(0.4 0.06 250)", moderate: "oklch(0.38 0.09 255)", strong: "oklch(0.35 0.12 260)" },
}

/**
 * Discrete Heading-role swap, independent of strength: strength is still asked/recorded per the catalog but ignored by
 * this recipe. Each value is exactly a local font-catalog stack (`packages/ui/src/lib/fonts.ts`), so the staged
 * candidate renders a self-hosted face and the Workbench font control recognizes it. Recipes v2 target the Theme v3
 * Heading role; v1 replaced the first family of the retired v2 `sans` stack.
 */
const TYPOGRAPHY_HEADING: { positive: readonly string[]; negative: readonly string[] } = {
  positive: ["Newsreader Variable", "Newsreader", "ui-serif", "Georgia", "serif"],
  negative: ["Inter Variable", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
}

export type RecipeDirection = "positive" | "negative"

/** Builds exactly one existing `ThemeOperation`; never a new operation, path, or raw value from Jev. */
export function buildOperation(category: DesignCategory, direction: RecipeDirection, strength: StrengthLevel, activeMode: ActiveMode): ThemeOperation {
  switch (category) {
    case "color":
      return { op: "setColor", mode: activeMode, token: "primary", value: COLOR_PRIMARY[direction][strength] }
    case "radius":
      return { op: "setRadius", value: RADIUS[direction][strength] }
    case "density":
      return { op: "setDensity", value: DENSITY[direction][strength] }
    case "typography":
      return { op: "setFontFamily", target: "heading", value: [...TYPOGRAPHY_HEADING[direction]] }
    case "shadow":
      return { op: "setShadowBlur", value: SHADOW_BLUR[direction][strength] }
    case "motion":
      return { op: "setMotionDuration", value: MOTION_DURATION[direction][strength] }
  }
}

export const isStrengthLevel = (value: string): value is StrengthLevel => (STRENGTH_SCALE as readonly string[]).includes(value)
