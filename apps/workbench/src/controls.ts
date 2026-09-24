import { MANUAL_CONTROL_BOUNDS, parseLength, readShadowProfile } from "@personal-ui/core"
import type { FontFamilyToken, ShadowProfile, Theme, ThemeOperation } from "@personal-ui/core"

/**
 * Manual-control models. Every control reads its value from the canonical active theme and turns a new value into one
 * typed `ThemeOperation`; the Workbench applies it through core's mutation boundary immediately (no Apply step).
 * Nothing here stores a second copy of any theme value.
 */

export type NumericControlId =
  | "tracking"
  | "radius"
  | "spacing"
  | "density"
  | "motion"
  | "shadowOpacity"
  | "shadowBlur"
  | "shadowSpread"
  | "shadowOffsetX"
  | "shadowOffsetY"

export type NumericControl = {
  label: string
  /** Visible unit text; empty for unitless values. */
  unit: string
  min: number
  max: number
  step: number
  read: (theme: Theme) => number
  build: (value: number, theme: Theme) => ThemeOperation
}

const PX_PER_REM = 16

/** A length in the requested unit (rem <-> px converted at 16px), for display in a control. */
function lengthIn(value: string, unit: "rem" | "px" | "em"): number {
  const parsed = parseLength(value)
  if (!parsed) return Number.NaN
  if (parsed.unit === unit) return parsed.value
  if (parsed.unit === "px" && unit === "rem") return parsed.value / PX_PER_REM
  if (parsed.unit !== "px" && unit === "px") return parsed.value * PX_PER_REM
  return parsed.value
}

/** Decimal places implied by a step, used to keep slider arithmetic free of float noise. */
export const decimalsOf = (step: number) => (String(step).split(".")[1] ?? "").length

export const roundToStep = (value: number, step: number) => Number(value.toFixed(decimalsOf(step)))

/** The shadow profile with every length in px, as the profile controls edit it. */
function pxProfile(theme: Theme): ShadowProfile {
  const profile = readShadowProfile(theme)
  const px = (value: string) => `${roundToStep(lengthIn(value, "px"), 0.0001)}px`
  return { ...profile, blur: px(profile.blur), spread: px(profile.spread), offsetX: px(profile.offsetX), offsetY: px(profile.offsetY) }
}

const shadowField = (field: "blur" | "spread" | "offsetX" | "offsetY", label: string, bounds: { min: number; max: number; step: number }): NumericControl => ({
  ...bounds,
  label,
  unit: "px",
  read: (theme) => lengthIn(readShadowProfile(theme)[field], "px"),
  build: (value, theme) => ({ op: "setShadowProfile", value: { ...pxProfile(theme), [field]: `${value}px` } }),
})

const durationMs = (value: string) => (value.endsWith("ms") ? Number(value.slice(0, -2)) : Number(value.slice(0, -1)) * 1000)

const B = MANUAL_CONTROL_BOUNDS

export const NUMERIC_CONTROLS: Record<NumericControlId, NumericControl> = {
  tracking: {
    ...B.tracking,
    label: "Letter spacing",
    unit: "em",
    read: (theme) => lengthIn(theme.typography.tracking.$value, "em"),
    build: (value) => ({ op: "setTracking", value: `${value}em` }),
  },
  radius: {
    ...B.radiusBase,
    label: "Radius",
    unit: "rem",
    read: (theme) => lengthIn(theme.radius.base.$value, "rem"),
    build: (value) => ({ op: "setRadiusBase", value: `${value}rem` }),
  },
  spacing: {
    ...B.spacingBase,
    label: "Spacing base",
    unit: "rem",
    read: (theme) => lengthIn(theme.space.base.$value, "rem"),
    build: (value) => ({ op: "setSpacingBase", value: `${value}rem` }),
  },
  density: {
    label: "Density",
    unit: "×",
    min: 0.5,
    max: 2,
    step: 0.05,
    read: (theme) => theme.space.density.$value,
    build: (value) => ({ op: "setDensity", value }),
  },
  motion: {
    label: "Base motion duration",
    unit: "ms",
    min: 0,
    max: 1000,
    step: 10,
    read: (theme) => durationMs(theme.motion.durationBase.$value),
    build: (value) => ({ op: "setMotionDuration", value: `${value}ms` }),
  },
  shadowOpacity: {
    ...B.shadowOpacity,
    label: "Shadow opacity",
    unit: "",
    read: (theme) => readShadowProfile(theme).opacity,
    build: (value, theme) => ({ op: "setShadowProfile", value: { ...pxProfile(theme), opacity: value } }),
  },
  shadowBlur: shadowField("blur", "Shadow blur", B.shadowBlur),
  shadowSpread: shadowField("spread", "Shadow spread", B.shadowSpread),
  shadowOffsetX: shadowField("offsetX", "Shadow offset X", B.shadowOffset),
  shadowOffsetY: shadowField("offsetY", "Shadow offset Y", B.shadowOffset),
}

/** A numeric draft is admissible only as a finite number inside the control's bounds; anything else stays local. */
export function parseNumericDraft(control: NumericControl, raw: string): number | null {
  const text = raw.trim()
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(text)) return null
  const value = Number(text)
  return Number.isFinite(value) && value >= control.min && value <= control.max ? value : null
}

export const FONT_CONTROLS: readonly { family: FontFamilyToken; label: string }[] = [
  { family: "sans", label: "Sans font stack" },
  { family: "serif", label: "Serif font stack" },
  { family: "mono", label: "Mono font stack" },
]

/** Comma-separated family names; surrounding matching quotes on a name are removed. Core validates each name. */
export function parseFontStack(raw: string): string[] {
  return raw.split(",").map((part) => part.trim().replace(/^(["'])(.*)\1$/, "$2"))
}

export const formatFontStack = (families: readonly string[]) => families.join(", ")

export const buildFontOperation = (family: FontFamilyToken, raw: string): ThemeOperation => ({ op: "setFontFamily", family, value: parseFontStack(raw) })

export const readShadowColor = (theme: Theme) => readShadowProfile(theme).color

export const buildShadowColorOperation = (raw: string, theme: Theme): ThemeOperation => ({ op: "setShadowProfile", value: { ...pxProfile(theme), color: raw } })
