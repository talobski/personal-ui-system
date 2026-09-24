import { MANUAL_CONTROL_BOUNDS, parseCanonicalOklch, parseLength, readShadowProfile } from "@personal-ui/core"
import type { ColorToken, FontFamilyToken, ShadowProfile, Theme, ThemeOperation } from "@personal-ui/core"

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

/** One searchable control per canonical stack; a choice writes the catalog option's full stack through `setFontFamily`. */
export const FONT_CONTROLS: readonly { family: FontFamilyToken; label: string }[] = [
  { family: "sans", label: "Sans font" },
  { family: "serif", label: "Serif font" },
  { family: "mono", label: "Mono font" },
]

export const formatFontStack = (families: readonly string[]) => families.join(", ")

export const buildFontOperation = (family: FontFamilyToken, stack: readonly string[]): ThemeOperation => ({ op: "setFontFamily", family, value: [...stack] })

export const readShadowColor = (theme: Theme) => readShadowProfile(theme).color

export const buildShadowColorOperation = (raw: string, theme: Theme): ThemeOperation => ({ op: "setShadowProfile", value: { ...pxProfile(theme), color: raw } })

/**
 * The grouped colour editor: every canonical colour token appears in exactly one group, in this order. `Base` is only a
 * UI group for the page background and foreground pair; no token is added or renamed.
 */
export const COLOR_GROUPS: readonly { id: string; title: string; tokens: readonly ColorToken[] }[] = [
  { id: "primary", title: "Primary", tokens: ["primary", "primary-foreground"] },
  { id: "secondary", title: "Secondary", tokens: ["secondary", "secondary-foreground"] },
  { id: "accent", title: "Accent", tokens: ["accent", "accent-foreground"] },
  { id: "base", title: "Base", tokens: ["background", "foreground"] },
  { id: "card", title: "Card", tokens: ["card", "card-foreground"] },
  { id: "popover", title: "Popover", tokens: ["popover", "popover-foreground"] },
  { id: "muted", title: "Muted", tokens: ["muted", "muted-foreground"] },
  { id: "destructive", title: "Destructive", tokens: ["destructive", "destructive-foreground"] },
  { id: "border", title: "Border, Input & Ring", tokens: ["border", "input", "ring"] },
  { id: "charts", title: "Charts", tokens: ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"] },
]

/** A token's readable sentence-case field label: `card-foreground` -> `Card foreground`, `chart-1` -> `Chart 1`. */
export const colorTokenLabel = (token: ColorToken) => {
  const words = token.replace(/-/g, " ")
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const toSrgbChannel = (linear: number) => {
  const encoded = linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055
  return Math.round(Math.min(1, Math.max(0, encoded)) * 255)
}

/**
 * Display-only: the nearest opaque sRGB `#rrggbb` for a canonical OKLCH value, because the native colour picker only
 * speaks sRGB hex. Out-of-sRGB channels are clipped. Never stored: picked values re-enter through `setColor`.
 */
export function pickerHex(canonical: string): string {
  const parsed = parseCanonicalOklch(canonical)
  if (!parsed) return "#000000"
  const hue = (parsed.h * Math.PI) / 180
  const a = parsed.c * Math.cos(hue)
  const b = parsed.c * Math.sin(hue)
  const l = (parsed.l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (parsed.l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (parsed.l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const channels = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return `#${channels.map((channel) => toSrgbChannel(channel).toString(16).padStart(2, "0")).join("")}`
}

/**
 * A picked `#rrggbb` as `setColor` input. The picker has no alpha channel, so the token's current alpha is kept by
 * sending `rgb(r g b / alpha)`; core normalizes either form to canonical OKLCH.
 */
export function pickedColorInput(hex: string, canonical: string): string {
  const alpha = parseCanonicalOklch(canonical)?.alpha ?? 1
  if (alpha === 1 || !/^#[0-9a-f]{6}$/i.test(hex)) return hex
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgb(${r} ${g} ${b} / ${alpha})`
}
