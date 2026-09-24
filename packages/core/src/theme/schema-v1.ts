import { z } from "zod"

/**
 * The frozen, accepted `personal-ui-theme` v1 schema (`schemaVersion: "1.0"`). It is input-only: `validateTheme`
 * accepts it and migrates to v2 (`migrate.ts`); nothing in the system produces v1 any more. Do not edit — changing it
 * would change which previously valid themes are accepted.
 */
export const THEME_V1_SCHEMA_VERSION = "1.0" as const

const V1_COLOR_TOKENS = [
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
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
] as const

const OKLCH = /^oklch\(\d*\.?\d+%? \d*\.?\d+ \d*\.?\d+(?: \/ \d*\.?\d+%?)?\)$/
const DIMENSION = /^-?\d*\.?\d+(?:rem|px|em)$/
const DURATION = /^\d*\.?\d+(?:ms|s)$/
const FONT_NAME = /^[A-Za-z0-9][A-Za-z0-9 -]*$/

const oklch = z.string().regex(OKLCH, "expected oklch(L C H [/ A])")
const dimension = z.string().regex(DIMENSION, "expected rem/px/em dimension")
const duration = z.string().regex(DURATION, "expected ms/s duration")

const token = <T extends string, V extends z.ZodType>(type: T, value: V) => z.strictObject({ $type: z.literal(type), $value: value })

const shadowLayer = z.strictObject({ offsetX: dimension, offsetY: dimension, blur: dimension, spread: dimension, color: oklch })

const colorSet = z.strictObject(
  Object.fromEntries(V1_COLOR_TOKENS.map((name) => [name, token("color", oklch)])) as {
    [K in (typeof V1_COLOR_TOKENS)[number]]: ReturnType<typeof token<"color", typeof oklch>>
  }
)
const fontFamily = token("fontFamily", z.array(z.string().regex(FONT_NAME)).min(1))

export const themeV1Schema = z.strictObject({
  $schema: z.literal("https://personal-ui.local/schema/theme-1.json"),
  schemaVersion: z.literal(THEME_V1_SCHEMA_VERSION),
  kind: z.literal("personal-ui-theme"),
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(80).regex(/^[A-Za-z0-9 ]+$/),
  revision: z.number().int().min(1),
  modes: z.strictObject({ light: z.strictObject({ color: colorSet }), dark: z.strictObject({ color: colorSet }) }),
  typography: z.strictObject({ sans: fontFamily, mono: fontFamily }),
  radius: z.strictObject({
    sm: token("dimension", dimension),
    md: token("dimension", dimension),
    lg: token("dimension", dimension),
  }),
  space: z.strictObject({
    base: token("dimension", dimension),
    density: token("number", z.number().min(0.5).max(2)),
  }),
  shadow: z.strictObject({
    sm: token("shadow", z.array(shadowLayer)),
    md: token("shadow", z.array(shadowLayer)),
    lg: token("shadow", z.array(shadowLayer)),
  }),
  motion: z.strictObject({
    durationFast: token("duration", duration),
    durationBase: token("duration", duration),
    reducedMotion: token("string", z.literal("reduce")),
  }),
  $extensions: z
    .strictObject({
      "personal-ui-system": z.strictObject({ displayName: z.string().min(1).max(80) }),
    })
    .optional(),
})

export type ThemeV1 = z.output<typeof themeV1Schema>
