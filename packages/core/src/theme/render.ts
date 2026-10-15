import { BASE_COLOR_TOKENS, COLOR_TOKENS, FONT_FAMILY_TARGETS, MOTION_DURATION_TOKENS, RADIUS_SCALE_TOKENS, resolveUiEffects, SHADOW_TOKENS, SIDEBAR_COLOR_TOKENS, SIDEBAR_TOKEN_ALIASES, themeSchema, TYPE_ROLES, UI_EFFECT_STRENGTH_RANGE } from "./schema"
import type { ShadowLayer, ShadowToken, Theme } from "./schema"

/** CSS generic families and system-font keywords, emitted unquoted; every other family name is quoted. */
const KEYWORD_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math",
  "fangsong",
  "-apple-system",
  "BlinkMacSystemFont",
])

const cssFamily = (families: readonly string[]) =>
  families.map((name) => (KEYWORD_FAMILIES.has(name) ? name : `"${name}"`)).join(", ")

const cssShadow = (layers: readonly ShadowLayer[]) =>
  layers.map((l) => `${l.inset ? "inset " : ""}${l.offsetX} ${l.offsetY} ${l.blur} ${l.spread} ${l.color}`).join(", ")

const decl = (name: string, value: string) => `  ${name}: ${value};`

const motionVar = (name: (typeof MOTION_DURATION_TOKENS)[number]) =>
  `--motion-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`

/** The composed declarations of one semantic role: family, weight, and tracking only (never size or line height). */
const roleDecls = (role: (typeof TYPE_ROLES)[number]) => [
  decl("font-family", `var(--font-${role})`),
  decl("font-weight", `var(--font-weight-${role})`),
  decl("letter-spacing", `var(--tracking-${role})`),
]

/** Tailwind's bare `shadow` utility reads `--shadow`; every other tier is `--shadow-<tier>`. */
const shadowThemeVar = (tier: ShadowToken) => (tier === "default" ? "--shadow" : `--shadow-${tier}`)

/**
 * The accepted Secondary Button (PUI-121). `Button` emits `data-slot="button"`, `data-variant` and `data-size`; when it
 * is composed through an `asChild` trigger or close (Collapsible, Dialog, Drawer, ResponsiveDialog), the wrapper replaces
 * only `data-slot` (with a `*-trigger` / `*-close` slot), so the variant and size survive. No other variant can match,
 * and ToggleGroup items (`toggle-group-item`) or other components that reuse `data-variant` without a Button's size are
 * excluded. Outline, like every other variant, stays flat.
 */
export const TACTILE_SECONDARY_BUTTON_SELECTOR = '[data-variant="secondary"][data-size]:is([data-slot="button"], [data-slot$="-trigger"], [data-slot$="-close"])'
/**
 * A surface/pill Tabs list container (PUI-124); a line/minimal list is marked `data-variant="line"` and never matches.
 * Tactile gives it one fixed ring only; its triggers, including the active one, keep their ordinary shadcn styling.
 */
export const TACTILE_SURFACE_TABS_LIST_SELECTOR = '[data-slot="tabs-list"]:not([data-variant="line"])'

/**
 * The shared tactile recipe, as percentages at full strength. Every colour is a `color-mix()` of a semantic token with
 * `transparent`, resolved at the targeted element: `light` is the illuminating token and `shade` the shading one, swapped
 * in dark subtrees. Layers: a soft vertical wash, a 1px inner top highlight, a 1px inner lower shade, a 1px restrained
 * outer edge, and a small inset shade for the pressed state. Strength scales every alpha linearly, so 0 is flat.
 */
const TACTILE_RECIPE = {
  light: { light: "--background", shade: "--foreground", washTop: 60, washBottom: 5, highlight: 90, lower: 10, edge: 6, press: 12 },
  dark: { light: "--foreground", shade: "--background", washTop: 7, washBottom: 20, highlight: 14, lower: 45, edge: 35, press: 55 },
} as const

const mix = (token: string, percent: number) => `color-mix(in oklab, var(${token}) ${Number(percent.toFixed(2))}%, transparent)`

const tactileVars = (mode: keyof typeof TACTILE_RECIPE, k: number, indent: string) => {
  const r = TACTILE_RECIPE[mode]
  return [
    `${indent}--ui-tactile-wash-top: ${mix(r.light, r.washTop * k)};`,
    `${indent}--ui-tactile-wash-bottom: ${mix(r.shade, r.washBottom * k)};`,
    `${indent}--ui-tactile-highlight: ${mix(r.light, r.highlight * k)};`,
    `${indent}--ui-tactile-lower: ${mix(r.shade, r.lower * k)};`,
    `${indent}--ui-tactile-edge: ${mix(r.shade, r.edge * k)};`,
    `${indent}--ui-tactile-press: ${mix(r.shade, r.press * k)};`,
  ]
}

/**
 * Tailwind v4's own box-shadow composition, for targets that carry no shadow utility (a Secondary Button). A shadow or
 * focus/invalid ring utility sets the same composition in the later utilities layer, so it still wins and still renders
 * the inset slot; the fallbacks keep the list valid where Tailwind has not registered a variable.
 */
const TW_SHADOW_COMPOSITION = "var(--tw-inset-shadow), var(--tw-inset-ring-shadow, 0 0 #0000), var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow, 0 0 #0000)"

/**
 * The fixed surface Tabs treatment (PUI-124, PUI-129, PUI-133): exactly Tailwind's `inset-ring-1 inset-ring-border/80`
 * on the list container, written as the declarations those two utilities compile to (the runtime CSS is not processed
 * by Tailwind). The 1px edge is drawn inward, so the list's outer size is unchanged. It is decorative, so it reads the
 * semantic `--border`, never the focus `--ring`. It fills only Tailwind's own inset-ring slot and composition, so a
 * consumer ring/shadow utility (including a focus-visible ring) still wins. It takes no Strength input.
 */
const TABS_LIST_RING = [
  "--tw-inset-ring-shadow: inset 0 0 0 1px var(--tw-inset-ring-color, currentcolor);",
  "--tw-inset-ring-color: color-mix(in oklab, var(--border) 80%, transparent);",
  `box-shadow: ${TW_SHADOW_COMPOSITION};`,
] as const

/**
 * The optional UI-effects block (PUI-113), or `""` while the effect is Off, so a flat theme's CSS is unchanged. Tactile
 * owns its targets (PUI-119/PUI-121/PUI-124). Secondary Buttons take the tactile recipe, the only part Strength scales:
 * it fills only Tailwind's own `--tw-inset-shadow` slot (with the matching composition as a base), plus a
 * `background-image` wash over the target's own semantic fill, so utility `box-shadow`s keep rendering the theme Shadow
 * tier and focus/invalid rings. Surface Tabs lists take only the fixed `TABS_LIST_RING`, identical at every Strength;
 * their triggers are untouched. Everything lives in `@layer components`, so any consumer utility still overrides it. No
 * colour, radius, size, typography, layout, or motion value is set.
 */
export function renderUiEffectsCss(input: Theme): string {
  const theme = themeSchema.parse(input)
  const effects = resolveUiEffects(theme)
  if (effects.effect !== "tactile") return ""
  const k = effects.strength / UI_EFFECT_STRENGTH_RANGE.max
  const where = `:where(${TACTILE_SECONDARY_BUTTON_SELECTOR})`
  return [
    `/* UI effects: ${effects.effect}, strength ${effects.strength}. */`,
    "@layer components {",
    `  ${where} {`,
    ...tactileVars("light", k, "    "),
    "    background-image: linear-gradient(to bottom, var(--ui-tactile-wash-top), var(--ui-tactile-wash-bottom));",
    "    --tw-inset-shadow: inset 0 1px 0 0 var(--ui-tactile-highlight), inset 0 -1px 0 0 var(--ui-tactile-lower), 0 0 0 1px var(--ui-tactile-edge);",
    `    box-shadow: ${TW_SHADOW_COMPOSITION};`,
    "  }",
    `  ${where}:is(.dark *) {`,
    ...tactileVars("dark", k, "    "),
    "  }",
    `  ${where}:active:not(:disabled) {`,
    "    background-image: linear-gradient(to bottom, var(--ui-tactile-wash-bottom), var(--ui-tactile-wash-top));",
    "    --tw-inset-shadow: inset 0 1px 2px 0 var(--ui-tactile-press), 0 0 0 1px var(--ui-tactile-edge);",
    "  }",
    `  :where(${TACTILE_SURFACE_TABS_LIST_SELECTOR}) {`,
    ...TABS_LIST_RING.map((line) => `    ${line}`),
    "  }",
    "}",
    "",
  ].join("\n")
}

/**
 * The sole theme -> shadcn/Tailwind v4 mapping. `@theme inline` values are substituted literally into utilities at
 * build time, so every category that must change at runtime keeps its value in a plain `:root` custom property and the
 * inline entry only references it, as colour does. Output order comes from the closed token tables above, never from
 * input key order, and the input is re-validated so only schema-conforming canonical values reach the CSS text.
 *
 * Typography namespaces: `font-*` names font primitives (`--font-heading`, `--font-body`, `--font-mono` families and
 * `--font-weight-heading`, `--font-weight-body`), `tracking-*` the role tracking, and `type-*` the composed semantic
 * roles (`type-heading`, `type-body` utilities). `text-*` stays Tailwind's size/colour namespace: no size or line height
 * is emitted, so both stay component-owned. The role primitives are plain `:root` properties, not `@theme` entries, so
 * they create no competing `font-*` / `tracking-*` utilities; Tailwind's own `font-mono` utility already reads
 * `var(--font-mono)`, so code keeps following the theme's mono stack. The base-layer rule applies the Body role to the
 * document, so ordinary text inherits it from this CSS alone, without any Workbench-specific stylesheet.
 *
 * Sidebar source selection: with `sidebar.useDedicatedTokens` off, each `--sidebar*` variable is emitted in both the
 * `:root` and `.dark` blocks as `var(--<alias>)` of its base semantic (see `SIDEBAR_TOKEN_ALIASES`), so the Sidebar follows
 * the base theme in either mode and stored dedicated values are preserved but unapplied. With it on, the stored
 * dedicated values are emitted directly.
 *
 * UI effects: the targeted `@layer components` block from `renderUiEffectsCss` is appended only while Tactile is on.
 */
export function renderShadcnTailwindCss(input: Theme): string {
  const theme = themeSchema.parse(input)
  return `/* Generated by @personal-ui/core renderShadcnTailwindCss for theme "${theme.id}" revision ${theme.revision}. Do not edit. */\n${renderThemeCss(theme)}`
}

/**
 * The portable CSS export: exactly `renderShadcnTailwindCss` without its provenance header, so the output carries no
 * generator name, theme identity or revision and can be pasted into any project.
 */
export function renderPortableThemeCss(input: Theme): string {
  return renderThemeCss(themeSchema.parse(input))
}

/** The rendered theme stylesheet for an already-parsed canonical theme, starting at `:root {`. */
function renderThemeCss(theme: Theme): string {
  const light = theme.colors.light
  const dark = theme.colors.dark
  const dedicated = theme.sidebar.useDedicatedTokens.$value
  const effects = renderUiEffectsCss(theme)
  const fontStack = (name: (typeof FONT_FAMILY_TARGETS)[number]) => (name === "mono" ? theme.typography.mono : theme.typography[name].font).$value
  const colorDecls = (set: typeof light) => [
    ...BASE_COLOR_TOKENS.map((name) => decl(`--${name}`, set[name].$value)),
    ...SIDEBAR_COLOR_TOKENS.map((name) => decl(`--${name}`, dedicated ? set[name].$value : `var(--${SIDEBAR_TOKEN_ALIASES[name]})`)),
  ]

  const root = [
    ...colorDecls(light),
    ...FONT_FAMILY_TARGETS.map((name) => decl(`--font-${name}`, cssFamily(fontStack(name)))),
    ...TYPE_ROLES.map((role) => decl(`--font-weight-${role}`, String(theme.typography[role].weight.$value))),
    ...TYPE_ROLES.map((role) => decl(`--tracking-${role}`, theme.typography[role].tracking.$value)),
    ...SHADOW_TOKENS.map((name) => decl(`--shadow-layers-${name}`, cssShadow(theme.shadow[name].$value))),
    decl("--radius", theme.radius.base.$value),
    ...RADIUS_SCALE_TOKENS.map((name) => decl(`--radius-scale-${name}`, theme.radius[name].$value)),
    decl("--space-base", theme.space.base.$value),
    decl("--density", String(theme.space.density.$value)),
    ...MOTION_DURATION_TOKENS.map((name) => decl(motionVar(name), theme.motion[name].$value)),
  ]

  const inline = [
    ...COLOR_TOKENS.map((name) => decl(`--color-${name}`, `var(--${name})`)),
    ...RADIUS_SCALE_TOKENS.map((name) => decl(`--radius-${name}`, `var(--radius-scale-${name})`)),
    ...SHADOW_TOKENS.map((name) => decl(shadowThemeVar(name), `var(--shadow-layers-${name})`)),
    decl("--spacing", "calc(var(--space-base) * var(--density))"),
    decl("--default-transition-duration", "var(--motion-duration-base)"),
  ]

  const reduced = MOTION_DURATION_TOKENS.map((name) => `    ${motionVar(name)}: 0ms;`)

  return [
    ":root {",
    ...root,
    "}",
    "",
    ".dark {",
    ...colorDecls(dark),
    "}",
    "",
    "@theme inline {",
    ...inline,
    "}",
    "",
    ...TYPE_ROLES.flatMap((role) => [`@utility type-${role} {`, ...roleDecls(role), "}", ""]),
    "@layer base {",
    "  body {",
    ...roleDecls("body").map((line) => `  ${line}`),
    "  }",
    "}",
    "",
    "@media (prefers-reduced-motion: reduce) {",
    "  :root {",
    ...reduced,
    "  }",
    "}",
    "",
  ].join("\n") + (effects ? `\n${effects}` : "")
}
