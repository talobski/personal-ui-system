import { z } from "zod"

import { normalizeColor, normalizeLength, parseLength } from "./color"
import { migrateThemeV1 } from "./migrate"
import { themeV1Schema, THEME_V1_SCHEMA_VERSION } from "./schema-v1"

export const COLOR_TOKENS = [
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
export type ColorToken = (typeof COLOR_TOKENS)[number]

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

const colorSet = z.strictObject(
  Object.fromEntries(COLOR_TOKENS.map((name) => [name, token("color", colorSchema)])) as {
    [K in ColorToken]: ReturnType<typeof token<"color", typeof colorSchema>>
  }
)

const fontFamily = token("fontFamily", fontStackSchema)
const radius = token("dimension", nonNegativeDimensionSchema)
const shadow = token("shadow", z.array(shadowLayerSchema).min(1).max(8))

export const THEME_SCHEMA_VERSION = "2.0" as const
export const THEME_SCHEMA_URI = "https://personal-ui.local/schema/theme-2.json" as const

/** Canonical `personal-ui-theme/2`. Parsing normalizes every colour and length leaf; output is always canonical. */
export const themeSchema = z.strictObject({
  $schema: z.literal(THEME_SCHEMA_URI),
  schemaVersion: z.literal(THEME_SCHEMA_VERSION),
  kind: z.literal("personal-ui-theme"),
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(80).regex(/^[A-Za-z0-9 ]+$/),
  revision: z.number().int().min(1),
  colors: z.strictObject({ light: colorSet, dark: colorSet }),
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
  $extensions: z
    .strictObject({
      "personal-ui-system": z.strictObject({ displayName: z.string().min(1).max(80) }),
    })
    .optional(),
})

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
 * Accepts strict v1 (`schemaVersion: "1.0"`) or v2 (`"2.0"`) input and returns canonical v2. v1 input is validated
 * against the frozen v1 schema first, then migrated with the declared defaults in `migrate.ts` and validated as v2, so
 * a v1 value that v2 cannot represent (e.g. an out-of-gamut colour) is reported, never dropped.
 */
export function validateTheme(input: unknown): ThemeValidation {
  if (typeof input === "object" && input !== null && (input as { schemaVersion?: unknown }).schemaVersion === THEME_V1_SCHEMA_VERSION) {
    const legacy = themeV1Schema.safeParse(input)
    if (!legacy.success) return { ok: false, issues: toIssues(legacy.error) }
    const migrated = themeSchema.safeParse(migrateThemeV1(legacy.data))
    return migrated.success ? { ok: true, theme: migrated.data } : { ok: false, issues: toIssues(migrated.error) }
  }
  const parsed = themeSchema.safeParse(input)
  return parsed.success ? { ok: true, theme: parsed.data } : { ok: false, issues: toIssues(parsed.error) }
}
