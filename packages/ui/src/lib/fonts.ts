/**
 * The closed, self-hosted font catalog: exactly 24 families, each served from a pinned local Fontsource package (see
 * `./font-faces.ts`). A choice is only a canonical Theme v2 font stack — the registered local face, the family's plain
 * name for consumers that have it installed, then deterministic generic fallbacks. No runtime font service is used.
 */

export type FontCategory = "sans" | "serif" | "mono"

export type FontOption = {
  /** Stable catalog id, e.g. `inter`. */
  id: string
  /** Visible family name, e.g. `Inter`. */
  label: string
  category: FontCategory
  /** The canonical Theme v2 stack written through `setFontFamily`. */
  stack: readonly string[]
}

/** Generic fallbacks appended to every stack in a category, in order. */
export const FONT_FALLBACKS: Readonly<Record<FontCategory, readonly string[]>> = {
  sans: ["ui-sans-serif", "system-ui", "sans-serif"],
  serif: ["ui-serif", "Georgia", "serif"],
  mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
}

/** Families served from static (non-variable) Fontsource packages register under their plain name. */
const STATIC_FAMILIES = new Set(["Lato", "Poppins", "IBM Plex Mono"])

const CATALOG: Readonly<Record<FontCategory, readonly string[]>> = {
  sans: ["Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "DM Sans", "Outfit", "Work Sans", "Space Grotesk", "Google Sans", "Poppins", "IBM Plex Sans", "Zalando Sans", "Manrope"],
  serif: ["Playfair Display", "Merriweather", "Lora", "Fraunces", "Newsreader"],
  mono: ["JetBrains Mono", "Roboto Mono", "Source Code Pro", "IBM Plex Mono", "Geist Mono"],
}

const option = (category: FontCategory, label: string): FontOption => {
  const face = STATIC_FAMILIES.has(label) ? label : `${label} Variable`
  return {
    id: label.toLowerCase().replace(/ /g, "-"),
    label,
    category,
    stack: [...new Set([face, label]), ...FONT_FALLBACKS[category]],
  }
}

export const FONT_OPTIONS: Readonly<Record<FontCategory, readonly FontOption[]>> = {
  sans: CATALOG.sans.map((label) => option("sans", label)),
  serif: CATALOG.serif.map((label) => option("serif", label)),
  mono: CATALOG.mono.map((label) => option("mono", label)),
}

const GENERIC = new Set(["serif", "sans-serif", "monospace", "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace"])

/** A stack as a CSS `font-family` value (generic keywords unquoted), for rendering an option in its own face. */
export const cssFontStack = (stack: readonly string[]) => stack.map((name) => (GENERIC.has(name) ? name : `"${name}"`)).join(", ")

/** The catalog option whose exact stack a theme currently holds, if any. A differing stack is not a catalog choice. */
export function findFontOption(category: FontCategory, stack: readonly string[]): FontOption | undefined {
  return FONT_OPTIONS[category].find((entry) => entry.stack.length === stack.length && entry.stack.every((name, i) => name === stack[i]))
}
