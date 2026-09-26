import { BASE_COLOR_TOKENS, COLOR_TOKENS, FONT_FAMILY_TARGETS, MOTION_DURATION_TOKENS, RADIUS_SCALE_TOKENS, SHADOW_TOKENS, SIDEBAR_COLOR_TOKENS, SIDEBAR_TOKEN_ALIASES, themeSchema, TYPE_ROLES } from "./schema"
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
 */
export function renderShadcnTailwindCss(input: Theme): string {
  const theme = themeSchema.parse(input)
  const light = theme.colors.light
  const dark = theme.colors.dark
  const dedicated = theme.sidebar.useDedicatedTokens.$value
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
    `/* Generated by @personal-ui/core renderShadcnTailwindCss for theme "${theme.id}" revision ${theme.revision}. Do not edit. */`,
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
  ].join("\n")
}
