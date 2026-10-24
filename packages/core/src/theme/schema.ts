import { z } from "zod"

import { normalizeColor, normalizeLength, parseLength } from "./color"
import { migrateThemeV1, migrateThemeV2_0, migrateThemeV2_1 } from "./migrate"
import { themeV1Schema, THEME_V1_SCHEMA_VERSION } from "./schema-v1"

/** The Theme v2.0 colour set, unchanged in v2.1. */
export const BASE_COLOR_TOKENS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
] as const
export type BaseColorToken = (typeof BASE_COLOR_TOKENS)[number]

/**
 * Theme v2.1 dedicated Sidebar colours. They are ordinary canonical colours in both modes; whether the Sidebar renders
 * them or the base aliases below is selected by `sidebar.useDedicatedTokens`. There is deliberately no `sidebar-input`
 * or `sidebar-card`: inputs inside a Sidebar keep the ordinary `input` token.
 */
export const SIDEBAR_COLOR_TOKENS = [
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
] as const
export type SidebarColorToken = (typeof SIDEBAR_COLOR_TOKENS)[number]

/** The exact base semantic each Sidebar token renders from while dedicated tokens are off. */
export const SIDEBAR_TOKEN_ALIASES: Readonly<Record<SidebarColorToken, BaseColorToken>> = Object.freeze({
  sidebar: "background",
  "sidebar-foreground": "foreground",
  "sidebar-primary": "primary",
  "sidebar-primary-foreground": "primary-foreground",
  "sidebar-accent": "accent",
  "sidebar-accent-foreground": "accent-foreground",
  "sidebar-border": "border",
  "sidebar-ring": "ring",
})

export const COLOR_TOKENS = [...BASE_COLOR_TOKENS, ...SIDEBAR_COLOR_TOKENS] as const
export type ColorToken = (typeof COLOR_TOKENS)[number]

export const isSidebarColorToken = (token: string): token is SidebarColorToken => (SIDEBAR_COLOR_TOKENS as readonly string[]).includes(token)

/**
 * Optional identity tones (a closed Theme v3 extension). Six background/foreground pairs that express identity or
 * category, primarily initials-based avatar fallbacks, never status, severity, or branding. `tone-<name>` is the soft
 * background and `tone-<name>-foreground` the text or icon colour placed on it. Names are ordinal (`1` to `6`), not
 * colour words, so a theme can recolour a tone without its name contradicting its value. They are not part of
 * `COLOR_TOKENS`: they live in the optional `tones` field, whose absence is the shared `TONE_DEFAULTS`.
 */
export const TONE_NAMES = ["1", "2", "3", "4", "5", "6"] as const
export type ToneName = (typeof TONE_NAMES)[number]
export const TONE_TOKENS = [
  "tone-1",
  "tone-1-foreground",
  "tone-2",
  "tone-2-foreground",
  "tone-3",
  "tone-3-foreground",
  "tone-4",
  "tone-4-foreground",
  "tone-5",
  "tone-5-foreground",
  "tone-6",
  "tone-6-foreground",
] as const
export type ToneToken = (typeof TONE_TOKENS)[number]

export const isToneToken = (token: unknown): token is ToneToken => (TONE_TOKENS as readonly unknown[]).includes(token)

/**
 * The shared tone values every theme renders while it stores no `tones`: the owner-approved Figma sRGB HEX palette,
 * normalized to canonical OKLCH (source, normalization, and measured contrast in `fixtures/tones.conversion.json`).
 */
export const TONE_DEFAULTS: Readonly<Record<"light" | "dark", Readonly<Record<ToneToken, string>>>> = Object.freeze({
  light: Object.freeze({
    "tone-1": "oklch(0.954575 0.023017 246.036983)",
    "tone-1-foreground": "oklch(0.519638 0.109374 250.062766)",
    "tone-2": "oklch(0.954447 0.024541 53.693888)",
    "tone-2-foreground": "oklch(0.560618 0.119963 55.385707)",
    "tone-3": "oklch(0.954118 0.024725 317.720731)",
    "tone-3-foreground": "oklch(0.520469 0.110152 317.831829)",
    "tone-4": "oklch(0.95529 0.025058 341.826242)",
    "tone-4-foreground": "oklch(0.450479 0.095224 343.246042)",
    "tone-5": "oklch(0.955967 0.025153 199.784145)",
    "tone-5-foreground": "oklch(0.530537 0.090253 201.788765)",
    "tone-6": "oklch(0.954111 0.022738 285.960919)",
    "tone-6-foreground": "oklch(0.519222 0.110057 285.091506)",
  }),
  dark: Object.freeze({
    "tone-1": "oklch(0.320862 0.049065 248.554392)",
    "tone-1-foreground": "oklch(0.819769 0.090567 249.952038)",
    "tone-2": "oklch(0.320198 0.04913 56.089672)",
    "tone-2-foreground": "oklch(0.819821 0.089667 55.006628)",
    "tone-3": "oklch(0.318188 0.050165 317.87645)",
    "tone-3-foreground": "oklch(0.819902 0.089787 318.258574)",
    "tone-4": "oklch(0.320342 0.051431 342.552036)",
    "tone-4-foreground": "oklch(0.739886 0.079665 343.070017)",
    "tone-5": "oklch(0.318937 0.0499 201.104966)",
    "tone-5-foreground": "oklch(0.820021 0.089715 200.032658)",
    "tone-6": "oklch(0.319589 0.049439 284.86901)",
    "tone-6-foreground": "oklch(0.81897 0.090969 284.911132)",
  }),
})

/**
 * Theme v3 typography. `heading` and `body` are the two composed semantic roles (`type-heading` / `type-body`), each a
 * font stack, weight, and tracking. `mono` is a preserved font-family primitive for code and preformatted content, not
 * a third role. Font size and line height stay component-owned.
 */
export const TYPE_ROLES = ["heading", "body"] as const
export type TypeRole = (typeof TYPE_ROLES)[number]
/** Every font-family primitive a theme stores: the two role stacks plus mono. */
export const FONT_FAMILY_TARGETS = ["heading", "body", "mono"] as const
export type FontFamilyTarget = (typeof FONT_FAMILY_TARGETS)[number]
export const isTypeRole = (value: unknown): value is TypeRole => (TYPE_ROLES as readonly unknown[]).includes(value)
export const isFontFamilyTarget = (value: unknown): value is FontFamilyTarget => (FONT_FAMILY_TARGETS as readonly unknown[]).includes(value)
/** `radius.base` is the rendered `--radius`; the scale tokens below render as `--radius-{sm,md,lg,xl}`. */
export const RADIUS_SCALE_TOKENS = ["sm", "md", "lg", "xl"] as const
export const SHADOW_TOKENS = ["2xs", "xs", "sm", "default", "md", "lg", "xl", "2xl"] as const
export type ShadowToken = (typeof SHADOW_TOKENS)[number]
export const MOTION_DURATION_TOKENS = ["durationFast", "durationBase"] as const

export const MAX_FONT_STACK_LENGTH = 16
export const TRACKING_RANGE_EM = { min: -0.25, max: 0.25 } as const
/** Admitted role weights: the nine CSS numeric weights, 100 to 900 in steps of 100. */
export const FONT_WEIGHT_RANGE = { min: 100, max: 900, step: 100 } as const

// Value grammars are anchored and closed so a valid theme cannot carry CSS declarations, selectors, or comments into
// rendered output. Colour and length leaves normalize to one canonical spelling (see `color.ts`).
const DURATION = /^\d*\.?\d+(?:ms|s)$/
const FONT_NAME = /^-?[A-Za-z0-9][A-Za-z0-9 -]*$/

/** Any supported colour input (HEX, RGB(A), HSL(A), OKLCH); the parsed value is canonical OKLCH. */
export const colorSchema = z
  .string()
  .refine((value) => normalizeColor(value).ok, "expected a HEX, rgb(a), hsl(a), or oklch colour inside the Display P3 gamut")
  .transform((value) => (normalizeColor(value) as { ok: true; value: string }).value)
/** A rem/px/em length; the parsed value is canonical. */
export const dimensionSchema = z
  .string()
  .refine((value) => parseLength(value) !== null, "expected rem/px/em dimension")
  .transform((value) => normalizeLength(value)!)
export const nonNegativeDimensionSchema = dimensionSchema.refine((value) => !value.startsWith("-"), "expected a non-negative dimension")
export const trackingSchema = z
  .string()
  .refine((value) => {
    const parsed = parseLength(value, ["em"])
    return parsed !== null && parsed.value >= TRACKING_RANGE_EM.min && parsed.value <= TRACKING_RANGE_EM.max
  }, `expected an em value from ${TRACKING_RANGE_EM.min}em to ${TRACKING_RANGE_EM.max}em`)
  .transform((value) => normalizeLength(value, ["em"])!)
export const fontWeightSchema = z
  .number()
  .int()
  .min(FONT_WEIGHT_RANGE.min)
  .max(FONT_WEIGHT_RANGE.max)
  .refine((value) => value % FONT_WEIGHT_RANGE.step === 0, `expected a multiple of ${FONT_WEIGHT_RANGE.step}`)
export const durationSchema = z.string().regex(DURATION, "expected ms/s duration")
export const densitySchema = z.number().min(0.5).max(2)
export const fontNameSchema = z.string().max(64).regex(FONT_NAME)
export const fontStackSchema = z.array(fontNameSchema).min(1).max(MAX_FONT_STACK_LENGTH)

const token = <T extends string, V extends z.ZodType>(type: T, value: V) => z.strictObject({ $type: z.literal(type), $value: value })

export const shadowLayerSchema = z.strictObject({
  inset: z.boolean(),
  offsetX: dimensionSchema,
  offsetY: dimensionSchema,
  blur: nonNegativeDimensionSchema,
  spread: dimensionSchema,
  color: colorSchema,
})

const colorSetOf = <T extends string>(tokens: readonly T[]) =>
  z.strictObject(
    Object.fromEntries(tokens.map((name) => [name, token("color", colorSchema)])) as {
      [K in T]: ReturnType<typeof token<"color", typeof colorSchema>>
    }
  )
const colorSet = colorSetOf(COLOR_TOKENS)

const fontFamily = token("fontFamily", fontStackSchema)
const radius = token("dimension", nonNegativeDimensionSchema)
const shadow = token("shadow", z.array(shadowLayerSchema).min(1).max(8))

export const THEME_SCHEMA_VERSION = "3.0" as const
export const THEME_V2_1_SCHEMA_VERSION = "2.1" as const
export const THEME_V2_0_SCHEMA_VERSION = "2.0" as const
/** The URI names the major version; `schemaVersion` selects the exact shape within it. */
export const THEME_SCHEMA_URI = "https://personal-ui.local/schema/theme-3.json" as const
/** The frozen v2 URI shared by the input-only v2.0 and v2.1 shapes. */
export const THEME_V2_SCHEMA_URI = "https://personal-ui.local/schema/theme-2.json" as const

const identityFields = {
  kind: z.literal("personal-ui-theme"),
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(80).regex(/^[A-Za-z0-9 ]+$/),
  revision: z.number().int().min(1),
}

const typeRole = z.strictObject({
  font: fontFamily,
  weight: token("fontWeight", fontWeightSchema),
  tracking: token("dimension", trackingSchema),
})

/** Theme v3 typography (see `TYPE_ROLES`). */
const typographyV3 = z.strictObject({ heading: typeRole, body: typeRole, mono: fontFamily })

/** The frozen v2.x typography: three stacks and one global tracking value. Input-only. */
const typographyV2 = z.strictObject({
  sans: fontFamily,
  serif: fontFamily,
  mono: fontFamily,
  tracking: token("dimension", trackingSchema),
})

/** Every non-colour, non-typography category, identical in v2.0, v2.1, and v3. */
const valueFields = {
  radius: z.strictObject({ base: radius, sm: radius, md: radius, lg: radius, xl: radius }),
  space: z.strictObject({
    base: token("dimension", nonNegativeDimensionSchema),
    density: token("number", densitySchema),
  }),
  shadow: z.strictObject(
    Object.fromEntries(SHADOW_TOKENS.map((name) => [name, shadow])) as { [K in ShadowToken]: typeof shadow }
  ),
  motion: z.strictObject({
    durationFast: token("duration", durationSchema),
    durationBase: token("duration", durationSchema),
    // Only the reduced-motion-respecting policy is admitted.
    reducedMotion: token("string", z.literal("reduce")),
  }),
}

const extensionsField = {
  $extensions: z
    .strictObject({
      "personal-ui-system": z.strictObject({ displayName: z.string().min(1).max(80) }),
    })
    .optional(),
}

/**
 * Sidebar source state. `useDedicatedTokens` is the user-facing mode (a boolean token, so it appears in token diffs).
 * `dedicatedValuesInitialized` is internal bookkeeping, deliberately a bare boolean rather than a `$value` token so it
 * never appears in token diffs, controls, or Design Command vocabulary. An uninitialized set is always off: the first
 * activation (or first dedicated colour edit) initializes it.
 */
const sidebarState = z
  .strictObject({
    useDedicatedTokens: token("boolean", z.boolean()),
    dedicatedValuesInitialized: z.boolean(),
  })
  .refine((state) => state.dedicatedValuesInitialized || !state.useDedicatedTokens.$value, {
    message: "dedicated sidebar tokens cannot be in use before they are initialized",
    path: ["useDedicatedTokens", "$value"],
  })

/**
 * Optional component-targeted UI effects (PUI-113, simplified by PUI-119). A closed Theme v3 extension: `effect` is
 * `off` (flat) or `tactile`, the interaction-depth system for interactive controls. `strength` scales its depth from 0
 * to 100, and strength 0 renders exactly like Off. The canonical object is strict, so it cannot carry
 * CSS, selectors, paths, or targets. Absence is the documented default (`UI_EFFECTS_FLAT`, Off at the default strength):
 * older v3 themes and migrated v1/v2 themes have no field and render exactly as before.
 */
export const UI_EFFECTS = ["off", "tactile"] as const
export type UiEffect = (typeof UI_EFFECTS)[number]
export const UI_EFFECT_STRENGTH_RANGE = { min: 0, max: 100 } as const
export const uiEffectSchema = z.enum(UI_EFFECTS)
export const uiEffectStrengthSchema = z.number().int().min(UI_EFFECT_STRENGTH_RANGE.min).max(UI_EFFECT_STRENGTH_RANGE.max)
const uiEffectsCanonicalState = z.strictObject({
  effect: token("string", uiEffectSchema),
  strength: token("number", uiEffectStrengthSchema),
})
/** The two UI-effects design values, as `setUiEffects` canonically carries them. */
export type UiEffectsValue = { effect: UiEffect; strength: number }
export const UI_EFFECTS_FIELDS = ["effect", "strength"] as const satisfies readonly (keyof UiEffectsValue)[]
/** What an absent `uiEffects` means: the effect is Off at the default strength. */
export const UI_EFFECTS_FLAT: Readonly<UiEffectsValue> = Object.freeze({ effect: "off", strength: 50 })

/**
 * The exact previously accepted PUI-113 value: effect `tactile` (its only admitted value), the two target toggles, and
 * strength. It is admitted only as input, at the Theme v3 and `setUiEffects` boundaries, and is normalized by one rule:
 * either target on is Tactile, both off is Off; strength is kept. Mixed, partial, or extended shapes are not legacy.
 */
export type LegacyUiEffectsValue = { effect: "tactile"; outlineButtons: boolean; tabs: boolean; strength: number }
export const LEGACY_UI_EFFECTS_FIELDS = ["effect", "outlineButtons", "tabs", "strength"] as const satisfies readonly (keyof LegacyUiEffectsValue)[]
const legacyUiEffectsState = z.strictObject({
  effect: token("string", z.literal("tactile")),
  outlineButtons: token("boolean", z.boolean()),
  tabs: token("boolean", z.boolean()),
  strength: token("number", uiEffectStrengthSchema),
})

/** The deterministic legacy -> canonical rule shared by theme ingress and the `setUiEffects` compatibility bridge. */
export const normalizeLegacyUiEffects = (value: LegacyUiEffectsValue): UiEffectsValue => ({
  effect: value.outlineButtons || value.tabs ? "tactile" : "off",
  strength: value.strength,
})

/**
 * Theme ingress normalization: an exact legacy four-field stored value becomes the canonical token object; anything
 * else passes through unchanged so the strict canonical schema accepts or rejects it (nothing is silently dropped).
 */
const uiEffectsState = z.preprocess((input) => {
  const legacy = legacyUiEffectsState.safeParse(input)
  if (!legacy.success) return input
  const d = legacy.data
  return uiEffectsTokens(normalizeLegacyUiEffects({ effect: d.effect.$value, outlineButtons: d.outlineButtons.$value, tabs: d.tabs.$value, strength: d.strength.$value }))
}, uiEffectsCanonicalState)

/** The canonical token object for a UI-effects value. */
export const uiEffectsTokens = (value: UiEffectsValue) => ({
  effect: { $type: "string" as const, $value: value.effect },
  strength: { $type: "number" as const, $value: value.strength },
})

/** A theme's effective UI-effects values; an absent field resolves to the Off default. */
export function resolveUiEffects(theme: { uiEffects?: z.output<typeof uiEffectsCanonicalState> }): UiEffectsValue {
  const state = theme.uiEffects
  if (!state) return { ...UI_EFFECTS_FLAT }
  return { effect: state.effect.$value, strength: state.strength.$value }
}

/**
 * The optional tones field: when present it is a complete override of all twelve tones in both modes, so a partial set
 * or an unknown key is rejected rather than merged with the defaults.
 */
const toneSetsCanonical = z.strictObject({ light: colorSetOf(TONE_TOKENS), dark: colorSetOf(TONE_TOKENS) })
export type ToneSets = z.output<typeof toneSetsCanonical>

/**
 * The earlier colour-word tone names, in ordinal order: `tone-blue` was `tone-1`, `tone-orange` `tone-2`, and so on.
 * Admitted only as stored input and renamed by `renameLegacyToneSets`; the mutation API takes the ordinal names only.
 */
export const LEGACY_TONE_NAMES = ["blue", "orange", "purple", "pink", "teal", "violet"] as const
export const LEGACY_TONE_TOKEN_RENAMES: Readonly<Record<string, ToneToken>> = Object.freeze(
  Object.fromEntries(
    LEGACY_TONE_NAMES.flatMap((legacy, i) => [
      [`tone-${legacy}`, `tone-${TONE_NAMES[i]}`],
      [`tone-${legacy}-foreground`, `tone-${TONE_NAMES[i]}-foreground`],
    ])
  ) as Record<string, ToneToken>
)

const isPlainRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)
const hasExactlyLegacyToneKeys = (set: unknown) => {
  if (!isPlainRecord(set)) return false
  const keys = Object.keys(set)
  return keys.length === TONE_TOKENS.length && keys.every((key) => Object.hasOwn(LEGACY_TONE_TOKEN_RENAMES, key))
}

/**
 * Theme ingress normalization: a stored tones value whose two modes each hold exactly the twelve colour-word names is
 * renamed to the ordinal names with every value kept; the strict canonical schema then validates the values as usual.
 * Anything else, including a mix of old and new names, passes through unchanged and is accepted or rejected as is.
 */
export function renameLegacyToneSets(input: unknown): unknown {
  if (!isPlainRecord(input) || Object.keys(input).length !== 2 || !hasExactlyLegacyToneKeys(input.light) || !hasExactlyLegacyToneKeys(input.dark)) return input
  const rename = (set: Record<string, unknown>) => Object.fromEntries(Object.entries(set).map(([key, value]) => [LEGACY_TONE_TOKEN_RENAMES[key], value]))
  return { light: rename(input.light as Record<string, unknown>), dark: rename(input.dark as Record<string, unknown>) }
}

const toneSets = z.preprocess(renameLegacyToneSets, toneSetsCanonical)

/** The canonical tones token object for the shared defaults. */
export const defaultToneSets = (): ToneSets => {
  const set = (mode: "light" | "dark") =>
    Object.fromEntries(TONE_TOKENS.map((name) => [name, { $type: "color" as const, $value: TONE_DEFAULTS[mode][name] }])) as ToneSets["light"]
  return { light: set("light"), dark: set("dark") }
}

/** A theme's effective tones; an absent field resolves to the shared defaults. */
export function resolveTones(theme: { tones?: ToneSets }): ToneSets {
  return theme.tones ? structuredClone(theme.tones) : defaultToneSets()
}

type ColorSets = { light: Record<ColorToken, { $type: "color"; $value: string }>; dark: Record<ColorToken, { $type: "color"; $value: string }> }

/**
 * While the dedicated set is uninitialized its values are generated defaults, so they are canonicalized to the current
 * base aliases in both modes. This keeps the visible controls truthful and makes first activation a visual no-op.
 */
export function syncUninitializedSidebarColors<T extends { colors: ColorSets; sidebar: { dedicatedValuesInitialized: boolean } }>(theme: T): T {
  if (theme.sidebar.dedicatedValuesInitialized) return theme
  for (const mode of ["light", "dark"] as const) {
    for (const name of SIDEBAR_COLOR_TOKENS) theme.colors[mode][name] = { $type: "color", $value: theme.colors[mode][SIDEBAR_TOKEN_ALIASES[name]].$value }
  }
  return theme
}

/**
 * Canonical `personal-ui-theme` v3. Parsing normalizes every colour and length leaf and re-synchronizes uninitialized
 * Sidebar defaults; output is always canonical.
 */
export const themeSchema = z
  .strictObject({
    $schema: z.literal(THEME_SCHEMA_URI),
    schemaVersion: z.literal(THEME_SCHEMA_VERSION),
    ...identityFields,
    colors: z.strictObject({ light: colorSet, dark: colorSet }),
    tones: toneSets.optional(),
    typography: typographyV3,
    ...valueFields,
    sidebar: sidebarState,
    uiEffects: uiEffectsState.optional(),
    ...extensionsField,
  })
  .transform((theme) => syncUninitializedSidebarColors(theme))

/** The frozen, accepted v2.1 shape (Sidebar state, v2 typography). Input-only: `validateTheme` migrates it to v3. */
export const themeV2_1Schema = z
  .strictObject({
    $schema: z.literal(THEME_V2_SCHEMA_URI),
    schemaVersion: z.literal(THEME_V2_1_SCHEMA_VERSION),
    ...identityFields,
    colors: z.strictObject({ light: colorSet, dark: colorSet }),
    typography: typographyV2,
    ...valueFields,
    sidebar: sidebarState,
    ...extensionsField,
  })
  .transform((theme) => syncUninitializedSidebarColors(theme))
export type ThemeV2_1 = z.output<typeof themeV2_1Schema>

/** The frozen, accepted v2.0 shape (24 colours, no Sidebar state). Input-only: `validateTheme` migrates it to v3. */
export const themeV2_0Schema = z.strictObject({
  $schema: z.literal(THEME_V2_SCHEMA_URI),
  schemaVersion: z.literal(THEME_V2_0_SCHEMA_VERSION),
  ...identityFields,
  colors: z.strictObject({ light: colorSetOf(BASE_COLOR_TOKENS), dark: colorSetOf(BASE_COLOR_TOKENS) }),
  typography: typographyV2,
  ...valueFields,
  ...extensionsField,
})
export type ThemeV2_0 = z.output<typeof themeV2_0Schema>

export type Theme = z.output<typeof themeSchema>
export type ShadowLayer = z.output<typeof shadowLayerSchema>

export type ThemeIssue = { ruleId: "theme.invalid"; path: string; message: string }

export type ThemeValidation = { ok: true; theme: Theme } | { ok: false; issues: ThemeIssue[] }

export function formatPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>(
    (acc, part) => (typeof part === "number" ? `${acc}[${part}]` : acc ? `${acc}.${String(part)}` : String(part)),
    ""
  )
}

const toIssues = (error: z.ZodError): ThemeIssue[] =>
  error.issues.map((issue) => ({ ruleId: "theme.invalid", path: formatPath(issue.path), message: issue.message }))

const parseWith = <T extends z.ZodType>(schema: T, input: unknown): { ok: true; data: z.output<T> } | { ok: false; issues: ThemeIssue[] } => {
  const parsed = schema.safeParse(input)
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, issues: toIssues(parsed.error) }
}

/**
 * Accepts strict v1 (`schemaVersion: "1.0"`), v2.0 (`"2.0"`), v2.1 (`"2.1"`), or v3 (`"3.0"`) input and returns
 * canonical v3. Older input is validated against its own frozen schema first, then migrated through the declared steps
 * in `migrate.ts` (v1 -> v2.0 -> v2.1 -> v3) and validated at each step, so a value a later version cannot represent
 * (e.g. an out-of-gamut colour) is reported, never dropped.
 */
export function validateTheme(input: unknown): ThemeValidation {
  const version = typeof input === "object" && input !== null ? (input as { schemaVersion?: unknown }).schemaVersion : undefined
  let current: unknown = input
  if (version === THEME_V1_SCHEMA_VERSION) {
    const legacy = parseWith(themeV1Schema, current)
    if (!legacy.ok) return legacy
    current = migrateThemeV1(legacy.data)
  }
  if (version === THEME_V1_SCHEMA_VERSION || version === THEME_V2_0_SCHEMA_VERSION) {
    const legacy = parseWith(themeV2_0Schema, current)
    if (!legacy.ok) return legacy
    current = migrateThemeV2_0(legacy.data)
  }
  if (version === THEME_V1_SCHEMA_VERSION || version === THEME_V2_0_SCHEMA_VERSION || version === THEME_V2_1_SCHEMA_VERSION) {
    const legacy = parseWith(themeV2_1Schema, current)
    if (!legacy.ok) return legacy
    current = migrateThemeV2_1(legacy.data)
  }
  const parsed = parseWith(themeSchema, current)
  return parsed.ok ? { ok: true, theme: parsed.data } : parsed
}
