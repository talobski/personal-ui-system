import { z } from "zod"

import { normalizeColor, normalizeLength, parseLength } from "./color"
import { migrateThemeV1, migrateThemeV2_0 } from "./migrate"
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

export const FONT_FAMILY_TOKENS = ["sans", "serif", "mono"] as const
export type FontFamilyToken = (typeof FONT_FAMILY_TOKENS)[number]
/** `radius.base` is the rendered `--radius`; the scale tokens below render as `--radius-{sm,md,lg,xl}`. */
export const RADIUS_SCALE_TOKENS = ["sm", "md", "lg", "xl"] as const
export const SHADOW_TOKENS = ["2xs", "xs", "sm", "default", "md", "lg", "xl", "2xl"] as const
export type ShadowToken = (typeof SHADOW_TOKENS)[number]
export const MOTION_DURATION_TOKENS = ["durationFast", "durationBase"] as const

export const MAX_FONT_STACK_LENGTH = 16
export const TRACKING_RANGE_EM = { min: -0.25, max: 0.25 } as const

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

export const THEME_SCHEMA_VERSION = "2.1" as const
export const THEME_V2_0_SCHEMA_VERSION = "2.0" as const
/** The URI names the major version, so v2.0 and v2.1 share it; `schemaVersion` selects the exact shape. */
export const THEME_SCHEMA_URI = "https://personal-ui.local/schema/theme-2.json" as const

const identityFields = {
  kind: z.literal("personal-ui-theme"),
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(80).regex(/^[A-Za-z0-9 ]+$/),
  revision: z.number().int().min(1),
}

const valueFields = {
  typography: z.strictObject({
    sans: fontFamily,
    serif: fontFamily,
    mono: fontFamily,
    tracking: token("dimension", trackingSchema),
  }),
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
 * Canonical `personal-ui-theme` v2.1. Parsing normalizes every colour and length leaf and re-synchronizes uninitialized
 * Sidebar defaults; output is always canonical.
 */
export const themeSchema = z
  .strictObject({
    $schema: z.literal(THEME_SCHEMA_URI),
    schemaVersion: z.literal(THEME_SCHEMA_VERSION),
    ...identityFields,
    colors: z.strictObject({ light: colorSet, dark: colorSet }),
    ...valueFields,
    sidebar: sidebarState,
    ...extensionsField,
  })
  .transform((theme) => syncUninitializedSidebarColors(theme))

/** The frozen, accepted v2.0 shape (24 colours, no Sidebar state). Input-only: `validateTheme` migrates it to v2.1. */
export const themeV2_0Schema = z.strictObject({
  $schema: z.literal(THEME_SCHEMA_URI),
  schemaVersion: z.literal(THEME_V2_0_SCHEMA_VERSION),
  ...identityFields,
  colors: z.strictObject({ light: colorSetOf(BASE_COLOR_TOKENS), dark: colorSetOf(BASE_COLOR_TOKENS) }),
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

/**
 * Accepts strict v1 (`schemaVersion: "1.0"`), v2.0 (`"2.0"`), or v2.1 (`"2.1"`) input and returns canonical v2.1.
 * Older input is validated against its own frozen schema first, then migrated through the declared steps in
 * `migrate.ts` (v1 -> v2.0 -> v2.1) and validated at each step, so a value a later version cannot represent (e.g. an
 * out-of-gamut colour) is reported, never dropped.
 */
export function validateTheme(input: unknown): ThemeValidation {
  const version = typeof input === "object" && input !== null ? (input as { schemaVersion?: unknown }).schemaVersion : undefined
  if (version === THEME_V1_SCHEMA_VERSION) {
    const legacy = themeV1Schema.safeParse(input)
    if (!legacy.success) return { ok: false, issues: toIssues(legacy.error) }
    return validateTheme(migrateThemeV1(legacy.data))
  }
  if (version === THEME_V2_0_SCHEMA_VERSION) {
    const legacy = themeV2_0Schema.safeParse(input)
    if (!legacy.success) return { ok: false, issues: toIssues(legacy.error) }
    const migrated = themeSchema.safeParse(migrateThemeV2_0(legacy.data))
    return migrated.success ? { ok: true, theme: migrated.data } : { ok: false, issues: toIssues(migrated.error) }
  }
  const parsed = themeSchema.safeParse(input)
  return parsed.success ? { ok: true, theme: parsed.data } : { ok: false, issues: toIssues(parsed.error) }
}
