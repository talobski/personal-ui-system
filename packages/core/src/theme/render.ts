import { BASE_COLOR_TOKENS, COLOR_TOKENS, FONT_FAMILY_TARGETS, MOTION_DURATION_TOKENS, RADIUS_SCALE_TOKENS, resolveTones, resolveUiEffects, SHADOW_TOKENS, SIDEBAR_COLOR_TOKENS, SIDEBAR_TOKEN_ALIASES, themeSchema, TONE_TOKENS, TYPE_ROLES, UI_EFFECT_STRENGTH_RANGE, UI_EFFECTS_FLAT } from "./schema"
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
 * A Button with the given `data-variant`. `Button` emits `data-slot="button"`, `data-variant` and `data-size`; when it is
 * composed through an `asChild` trigger or close (Collapsible, Dialog, Drawer, ResponsiveDialog), the wrapper replaces
 * only `data-slot` (with a `*-trigger` / `*-close` slot), so the variant and size survive. ToggleGroup items and other
 * components that reuse `data-variant` without a Button's slot never match.
 */
const button = (variant: string) => `[data-variant="${variant}"][data-size]:is([data-slot="button"], [data-slot$="-trigger"], [data-slot$="-close"])`

/** The accepted Secondary Button (PUI-121). */
export const TACTILE_SECONDARY_BUTTON_SELECTOR = button("secondary")
/** A surface/pill Tabs list container (PUI-124); a line list is marked `data-variant="line"` and never matches. */
export const TACTILE_SURFACE_TABS_LIST_SELECTOR = '[data-slot="tabs-list"]:not([data-variant="line"])'
/** A wrapper that owns a grouped field's surface: shadcn's InputGroup (and Combobox's), or any parent of a group control. */
const FIELD_GROUP = ':is([data-slot$="input-group"], :has(> [data-slot="input-group-control"]))'

/**
 * Every Tactile target, by the stable shadcn hooks it reads: `data-slot`, `data-variant`, and Radix/Base UI state
 * attributes. Ghost, link and destructive Buttons, cards, tables, badges, overlays, Slider and Sidebar are not targets.
 */
export const TACTILE_TARGETS = {
  primaryButton: button("default"),
  secondaryButton: TACTILE_SECONDARY_BUTTON_SELECTOR,
  outlineButton: button("outline"),
  outlineToggle: '[data-variant="outline"]:is([data-slot="toggle"], [data-slot="toggle-group-item"])',
  // A field nested in a group leaves the surface to its group, so the recess is never doubled.
  field: `:is([data-slot="input"], [data-slot="textarea"], [data-slot="select-trigger"], [data-slot="native-select"]):not(${FIELD_GROUP} *)`,
  fieldGroup: FIELD_GROUP,
  checkbox: '[data-slot="checkbox"]',
  radio: '[data-slot="radio-group-item"]',
  switch: '[data-slot="switch"]',
  switchThumb: '[data-slot="switch-thumb"]',
  tabsList: TACTILE_SURFACE_TABS_LIST_SELECTOR,
} as const
type Target = keyof typeof TACTILE_TARGETS

/** State hooks, each listing the Radix and Base UI spellings of one state. */
const CHECKED = ':is([data-state="checked"], [data-state="indeterminate"], [data-checked], [aria-checked="true"], [aria-checked="mixed"])'
const SELECTED = ':is([data-state="on"], [data-pressed], [aria-pressed="true"], [aria-checked="true"])'
const OPEN = ':is([data-state="open"], [data-popup-open], [aria-expanded="true"])'
/** Disabled (a field group counts as disabled with its control), or opted out with `data-tactile="flat"` on it or an ancestor. */
const FLAT = ':is(:disabled, [data-disabled], [aria-disabled="true"], :has(> [data-slot="input-group-control"]:disabled), [data-tactile="flat"], [data-tactile="flat"] *)'

/**
 * The tactile palette, as percentages at full strength. Every colour is a `color-mix()` of a semantic token with
 * `transparent`: `light` is the illuminating token and `shade` the shading one, swapped in dark mode, so each palette
 * derives its own depth colours. Strength scales every alpha linearly, so the theme's own colours never change identity.
 */
const TACTILE_PALETTE = {
  light: { light: "--background", shade: "--foreground", washTop: 60, washBottom: 5, highlight: 90, lower: 10, edge: 6, recess: 14, press: 16, fillHighlight: 36, fillShade: 24 },
  dark: { light: "--foreground", shade: "--background", washTop: 7, washBottom: 20, highlight: 14, lower: 45, edge: 35, recess: 50, press: 60, fillHighlight: 24, fillShade: 50 },
} as const

/** `token` (a custom property name, or with `literal` a colour value) at `percent` alpha. */
const mix = (token: string, percent: number, literal = false) => `color-mix(in oklab, ${literal ? token : `var(${token})`} ${Number(percent.toFixed(2))}%, transparent)`
/** How far, at full strength, a hovered border or Primary fill moves toward `--foreground`. */
const HOVER_MIX = { border: 30, primary: 20 } as const
const toward = (token: string, percent: number) => `color-mix(in oklab, var(${token}), var(--foreground) ${Number(percent.toFixed(2))}%)`

const paletteVars = (mode: keyof typeof TACTILE_PALETTE, k: number) => {
  const p = TACTILE_PALETTE[mode]
  return [
    `--ui-tactile-highlight: ${mix(p.light, p.highlight * k)};`,
    `--ui-tactile-shade: ${mix(p.shade, p.lower * k)};`,
    `--ui-tactile-edge: ${mix(p.shade, p.edge * k)};`,
    `--ui-tactile-recess: ${mix(p.shade, p.recess * k)};`,
    `--ui-tactile-press: ${mix(p.shade, p.press * k)};`,
    `--ui-tactile-fill-highlight: ${mix(p.light, p.fillHighlight * k)};`,
    `--ui-tactile-fill-shade: ${mix(p.shade, p.fillShade * k)};`,
    `--ui-tactile-wash-top: ${mix(p.light, p.washTop * k)};`,
    `--ui-tactile-wash-bottom: ${mix(p.shade, p.washBottom * k)};`,
  ]
}

/**
 * How much of a theme-token contribution (the surface TabsList edge, the outer elevation) Tactile applies at strength
 * `k`: it fades in linearly up to the default strength (50), where it is exactly the theme's own value, and holds there
 * above it, so stronger depth never exaggerates the theme's elevation.
 */
const themeReach = (k: number) => Math.min(1, k / (UI_EFFECTS_FLAT.strength / UI_EFFECT_STRENGTH_RANGE.max))

/**
 * Tactile's outer elevation: the theme's own `xs` shadow, each layer's colour faded by `reach`. At full reach it is
 * `var(--shadow-layers-xs)` itself, so it follows the theme token exactly; below it keeps every layer's offset, blur,
 * spread and colour and scales only the alpha.
 */
const elevation = (theme: Theme, reach: number) =>
  reach >= 1
    ? "var(--shadow-layers-xs)"
    : theme.shadow.xs.$value.map((l) => `${l.inset ? "inset " : ""}${l.offsetX} ${l.offsetY} ${l.blur} ${l.spread} ${mix(l.color, reach * 100, true)}`).join(", ")

/**
 * The semantic depth roles, composed from the palette. They are declared with the palette on `:root` and `.dark`, so a
 * dark subtree recomposes them from its own colours. The hover colours are captured here too: a hovered control then
 * redefines `--border`, `--input` or `--primary` from them without referring to itself.
 */
const roleVars = (theme: Theme, k: number) => [
  "--ui-tactile-raised: inset 0 1px 0 0 var(--ui-tactile-highlight), inset 0 -1px 0 0 var(--ui-tactile-shade);",
  "--ui-tactile-filled: inset 0 1px 0 0 var(--ui-tactile-fill-highlight), inset 0 -1px 0 0 var(--ui-tactile-fill-shade);",
  "--ui-tactile-recessed: inset 0 1px 2px 0 var(--ui-tactile-recess);",
  "--ui-tactile-pressed: inset 0 1px 2px 0 var(--ui-tactile-press);",
  `--ui-tactile-hover-border: ${toward("--border", HOVER_MIX.border * k)};`,
  `--ui-tactile-hover-input: ${toward("--input", HOVER_MIX.border * k)};`,
  `--ui-tactile-hover-primary: ${toward("--primary", HOVER_MIX.primary * k)};`,
  `--ui-tactile-track-edge: ${mix("--border", TRACK_EDGE * themeReach(k))};`,
  `--ui-tactile-elevation: ${elevation(theme, themeReach(k))};`,
]

/**
 * Tailwind v4's own box-shadow composition, for targets that carry no shadow utility (Primary and Secondary Buttons). A
 * shadow or focus/invalid ring utility sets the same composition in the later utilities layer, so it still wins and
 * still renders the inset slot; the fallbacks keep the list valid where Tailwind has not registered a variable.
 */
const TW_SHADOW_COMPOSITION = "var(--tw-inset-shadow), var(--tw-inset-ring-shadow, 0 0 #0000), var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow, 0 0 #0000)"

/**
 * The surface Tabs track edge (PUI-124, PUI-129, PUI-133): Tailwind's `inset-ring-1 inset-ring-border/80` at the default
 * strength, written as the declarations those two utilities compile to (the runtime CSS is not processed by Tailwind).
 * The 1px edge is drawn inward, so the list's outer size is unchanged. It is decorative, so it reads the semantic
 * `--border`, never the focus `--ring`. Its alpha follows `themeReach`, so strength 0 has no edge.
 */
const TRACK_EDGE = 80
const TABS_LIST_EDGE = [
  "--tw-inset-ring-shadow: inset 0 0 0 1px var(--tw-inset-ring-color, currentcolor);",
  "--tw-inset-ring-color: var(--ui-tactile-track-edge);",
] as const

/** One zero-specificity rule: each `[targets, state]` pair becomes `:is(targets)state` inside one `:where()`, so source order decides. */
const rule = (pairs: readonly (readonly [readonly Target[], string])[], declarations: readonly string[]) => {
  const selectors = pairs.map(([targets, state]) => {
    const list = targets.map((target) => TACTILE_TARGETS[target])
    return `${list.length === 1 ? list[0] : `:is(${list.join(", ")})`}${state}`
  })
  return [`  :where(${selectors.join(", ")}) {`, ...declarations.map((line) => `    ${line}`), "  }"]
}
const at = (targets: readonly Target[], state = "") => [[targets, state]] as const

const BUTTON_LIKE: readonly Target[] = ["primaryButton", "secondaryButton", "outlineButton", "outlineToggle", "checkbox", "radio"]
const ALL_TARGETS = Object.keys(TACTILE_TARGETS) as Target[]

/**
 * The control rules, in precedence order (every selector has zero specificity, so a later rule wins): resting roles,
 * hover, checked/selected, pressed/open, and finally Flat. Focus and invalid rings are never touched: they live in
 * Tailwind's ring slot and `focus-visible:` / `aria-invalid:` border utilities, which sit above this layer. Tactile
 * fills the `--tw-inset-shadow` slot, the surface TabsList's inset-ring slot and, for the borderless Buttons and the
 * Switch thumb, `--tw-shadow` with `--ui-tactile-elevation`. Pressed removes the outer elevation, including a
 * `shadow-xs` utility's, by zeroing `--ui-tactile-elevation` and `--shadow-layers-xs` on the control itself.
 */
const CONTROL_RULES = [
  // Raised: a top highlight and lower shade. Secondary keeps its accepted wash and faint edge (it has no border).
  ...rule(at(["secondaryButton"]), [
    "background-image: linear-gradient(to bottom, var(--ui-tactile-wash-top), var(--ui-tactile-wash-bottom));",
    "--tw-inset-shadow: var(--ui-tactile-raised), 0 0 0 1px var(--ui-tactile-edge);",
    "--tw-shadow: var(--ui-tactile-elevation);",
    `box-shadow: ${TW_SHADOW_COMPOSITION};`,
  ]),
  // Tabs triggers are not targets: the active one already rises on its own `shadow-sm` past a transparent 1px border, so
  // an inner lower shade would stack a dark, light, dark band along its bottom edge.
  ...rule(at(["outlineButton", "outlineToggle"]), ["--tw-inset-shadow: var(--ui-tactile-raised);", `box-shadow: ${TW_SHADOW_COMPOSITION};`]),
  // Filled: the semantic fill is kept; light catches its top edge and its lower edge darkens.
  ...rule(at(["primaryButton"]), ["--tw-inset-shadow: var(--ui-tactile-filled);", "--tw-shadow: var(--ui-tactile-elevation);", `box-shadow: ${TW_SHADOW_COMPOSITION};`]),
  // Recessed: fields, field groups, the surface tabs track and unchecked selection controls.
  ...rule(at(["field", "fieldGroup", "tabsList", "checkbox", "radio", "switch"]), ["--tw-inset-shadow: var(--ui-tactile-recessed);", `box-shadow: ${TW_SHADOW_COMPOSITION};`]),
  ...rule(at(["tabsList"]), TABS_LIST_EDGE),
  ...rule(at(["switchThumb"]), ["--tw-shadow: var(--ui-tactile-elevation);", `box-shadow: ${TW_SHADOW_COMPOSITION};`]),
  // Button-like controls settle on the theme's fast duration; fields keep the base duration.
  ...rule(at(BUTTON_LIKE), ["--tw-duration: var(--motion-duration-fast);"]),
  // Hover strengthens a border or the Primary fill toward the foreground; focus and invalid borders still win.
  ...rule(at(["outlineButton", "outlineToggle", "field", "fieldGroup"], ":hover"), ["--border: var(--ui-tactile-hover-border);", "--input: var(--ui-tactile-hover-input);"]),
  ...rule(at(["primaryButton"], ":hover"), ["--primary: var(--ui-tactile-hover-primary);"]),
  // Checked selection controls fill.
  ...rule(at(["checkbox", "radio", "switch"], CHECKED), ["--tw-inset-shadow: var(--ui-tactile-filled);"]),
  // Pressed: depth reverses to an inset and the outer elevation is removed. Secondary keeps its edge and flips its wash.
  ...rule(
    [[["primaryButton", "outlineButton", "outlineToggle", "checkbox", "radio"], ":active"], [["primaryButton", "outlineButton"], '[aria-pressed="true"]'], [["outlineButton"], OPEN], [["outlineToggle"], SELECTED]],
    ["--tw-inset-shadow: var(--ui-tactile-pressed);", "--ui-tactile-elevation: 0 0 #0000;", "--shadow-layers-xs: 0 0 #0000;"],
  ),
  ...rule(at(["secondaryButton"], ':is(:active, [aria-pressed="true"])'), [
    "background-image: linear-gradient(to bottom, var(--ui-tactile-wash-bottom), var(--ui-tactile-wash-top));",
    "--tw-inset-shadow: var(--ui-tactile-pressed), 0 0 0 1px var(--ui-tactile-edge);",
    "--ui-tactile-elevation: 0 0 #0000;",
    "--shadow-layers-xs: 0 0 #0000;",
  ]),
  // Flat: disabled or opted-out controls lose every tactile layer and keep their own fill, border, rings and geometry. A
  // shadow or ring utility still sets its own composition above this layer, so `box-shadow: none` removes only Tactile's.
  ...rule(at(ALL_TARGETS, FLAT), [
    "box-shadow: none;",
    "background-image: none;",
    "--tw-inset-shadow: 0 0 #0000;",
    "--tw-inset-ring-shadow: 0 0 #0000;",
    "--tw-shadow: 0 0 #0000;",
    "--tw-duration: initial;",
    "--ui-tactile-elevation: inherit;",
    "--shadow-layers-xs: inherit;",
    "--border: inherit;",
    "--input: inherit;",
    "--primary: inherit;",
  ]),
]

/**
 * The optional UI-effects block (PUI-113), or `""` while the effect is Off, so a flat theme's CSS is unchanged. Tactile
 * is one interaction-depth system with five semantic roles: Raised (Secondary and Outline Buttons, outline Toggles),
 * Filled (Primary Buttons, checked selection controls), Recessed (fields, field groups, the surface
 * tabs track, unchecked selection controls), Pressed (active, open and selected states) and Flat (disabled, or
 * `data-tactile="flat"`). Static surfaces, overlays, Tabs triggers, line Tabs and the remaining Button variants are never
 * targets.
 *
 * Strength scales the palette's alphas and hover mix linearly and never a semantic colour; the theme-token contributions
 * (the TabsList edge and the outer elevation) fade in up to the default strength and then hold at the theme's value.
 * Strength 0 renders `""`, exactly like Off, so it leaves no residual styling. Everything lives in `@layer components`, so any
 * consumer utility still overrides it, and no colour token, radius, size, typography, layout or motion token value is
 * set. The block is the same text in the live preview and in the exported Theme Code CSS.
 */
export function renderUiEffectsCss(input: Theme): string {
  const theme = themeSchema.parse(input)
  const effects = resolveUiEffects(theme)
  if (effects.effect !== "tactile" || effects.strength === 0) return ""
  const k = effects.strength / UI_EFFECT_STRENGTH_RANGE.max
  const indent = (lines: readonly string[]) => lines.map((line) => `    ${line}`)
  return [
    `/* UI effects: ${effects.effect}, strength ${effects.strength}. */`,
    "@layer components {",
    "  :root {",
    ...indent(paletteVars("light", k)),
    "  }",
    "  .dark {",
    ...indent(paletteVars("dark", k)),
    "  }",
    "  :root, .dark {",
    ...indent(roleVars(theme, k)),
    "  }",
    ...CONTROL_RULES,
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
 * Tones: the resolved `--tone-*` pairs (the stored `tones`, else the shared `TONE_DEFAULTS`) are always emitted after
 * the Sidebar colours in both blocks, with `--color-tone-*` inline entries, so `bg-tone-1` /
 * `text-tone-1-foreground` utilities exist in every theme.
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
  const tones = resolveTones(theme)
  const effects = renderUiEffectsCss(theme)
  const fontStack = (name: (typeof FONT_FAMILY_TARGETS)[number]) => (name === "mono" ? theme.typography.mono : theme.typography[name].font).$value
  const colorDecls = (set: typeof light, toneSet: (typeof tones)["light"]) => [
    ...BASE_COLOR_TOKENS.map((name) => decl(`--${name}`, set[name].$value)),
    ...SIDEBAR_COLOR_TOKENS.map((name) => decl(`--${name}`, dedicated ? set[name].$value : `var(--${SIDEBAR_TOKEN_ALIASES[name]})`)),
    ...TONE_TOKENS.map((name) => decl(`--${name}`, toneSet[name].$value)),
  ]

  const root = [
    ...colorDecls(light, tones.light),
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
    ...[...COLOR_TOKENS, ...TONE_TOKENS].map((name) => decl(`--color-${name}`, `var(--${name})`)),
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
    ...colorDecls(dark, tones.dark),
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
