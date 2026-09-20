import { z } from "zod"

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

export const TYPOGRAPHY_TOKENS = ["sans", "mono"] as const
export const RADIUS_TOKENS = ["sm", "md", "lg"] as const
export const SHADOW_TOKENS = ["sm", "md", "lg"] as const
export const MOTION_DURATION_TOKENS = ["durationFast", "durationBase"] as const

// Value grammars are anchored and closed so a valid theme cannot carry CSS
// declarations, selectors, or comments into rendered output.
const OKLCH = /^oklch\(\d*\.?\d+%? \d*\.?\d+ \d*\.?\d+(?: \/ \d*\.?\d+%?)?\)$/
const DIMENSION = /^-?\d*\.?\d+(?:rem|px|em)$/
const DURATION = /^\d*\.?\d+(?:ms|s)$/
const FONT_NAME = /^[A-Za-z0-9][A-Za-z0-9 -]*$/

export const oklchSchema = z.string().regex(OKLCH, "expected oklch(L C H [/ A])")
export const dimensionSchema = z.string().regex(DIMENSION, "expected rem/px/em dimension")
export const durationSchema = z.string().regex(DURATION, "expected ms/s duration")

const token = <T extends string, V extends z.ZodType>(type: T, value: V) =>
  z.strictObject({ $type: z.literal(type), $value: value })

const shadowLayer = z.strictObject({
  offsetX: dimensionSchema,
  offsetY: dimensionSchema,
  blur: dimensionSchema,
  spread: dimensionSchema,
  color: oklchSchema,
})

const colorSet = z.strictObject(
  Object.fromEntries(COLOR_TOKENS.map((name) => [name, token("color", oklchSchema)])) as {
    [K in ColorToken]: ReturnType<typeof token<"color", typeof oklchSchema>>
  }
)

const fontFamily = token("fontFamily", z.array(z.string().regex(FONT_NAME)).min(1))

export const themeSchema = z.strictObject({
  $schema: z.literal("https://personal-ui.local/schema/theme-1.json"),
  schemaVersion: z.literal("1.0"),
  kind: z.literal("personal-ui-theme"),
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(80).regex(/^[A-Za-z0-9 ]+$/),
  revision: z.number().int().min(1),
  modes: z.strictObject({ light: z.strictObject({ color: colorSet }), dark: z.strictObject({ color: colorSet }) }),
  typography: z.strictObject({ sans: fontFamily, mono: fontFamily }),
  radius: z.strictObject({
    sm: token("dimension", dimensionSchema),
    md: token("dimension", dimensionSchema),
    lg: token("dimension", dimensionSchema),
  }),
  space: z.strictObject({
    base: token("dimension", dimensionSchema),
    density: token("number", z.number().min(0.5).max(2)),
  }),
  shadow: z.strictObject({
    sm: token("shadow", z.array(shadowLayer)),
    md: token("shadow", z.array(shadowLayer)),
    lg: token("shadow", z.array(shadowLayer)),
  }),
  motion: z.strictObject({
    durationFast: token("duration", durationSchema),
    durationBase: token("duration", durationSchema),
    // V1 admits only the reduced-motion-respecting policy.
    reducedMotion: token("string", z.literal("reduce")),
  }),
  $extensions: z
    .strictObject({
      "personal-ui-system": z.strictObject({ displayName: z.string().min(1).max(80) }),
    })
    .optional(),
})

export type Theme = z.infer<typeof themeSchema>

export type ThemeIssue = { ruleId: "theme.invalid"; path: string; message: string }

export type ThemeValidation = { ok: true; theme: Theme } | { ok: false; issues: ThemeIssue[] }

export function formatPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>(
    (acc, part) => (typeof part === "number" ? `${acc}[${part}]` : acc ? `${acc}.${String(part)}` : String(part)),
    ""
  )
}

export function validateTheme(input: unknown): ThemeValidation {
  const parsed = themeSchema.safeParse(input)
  if (parsed.success) return { ok: true, theme: parsed.data }
  return {
    ok: false,
    issues: parsed.error.issues.map((issue) => ({
      ruleId: "theme.invalid",
      path: formatPath(issue.path),
      message: issue.message,
    })),
  }
}
