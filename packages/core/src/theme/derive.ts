import { formatLength, normalizeColor, parseCanonicalOklch, parseLength, withAlpha } from "./color"
import type { ParsedLength } from "./color"
import { SHADOW_TOKENS } from "./schema"
import type { ShadowLayer, ShadowToken, Theme } from "./schema"

/**
 * Deterministic derivations used by the manual-control operations. There is exactly one stored representation of
 * radius and shadow — the canonical theme tokens — and these functions compute a full, canonical token set from one
 * editable value. Nothing here keeps a parallel profile; `readShadowProfile` reads the profile back from the tokens.
 */

/** Bounds shared by mutation admissibility and the Workbench controls. Lengths are expressed in the listed unit. */
export const MANUAL_CONTROL_BOUNDS = Object.freeze({
  tracking: Object.freeze({ min: -0.25, max: 0.25, step: 0.005, unit: "em" }),
  radiusBase: Object.freeze({ min: 0, max: 2.5, step: 0.025, unit: "rem" }),
  spacingBase: Object.freeze({ min: 0.1, max: 0.5, step: 0.005, unit: "rem" }),
  shadowOpacity: Object.freeze({ min: 0, max: 1, step: 0.01, unit: "" }),
  shadowBlur: Object.freeze({ min: 0, max: 64, step: 1, unit: "px" }),
  shadowSpread: Object.freeze({ min: -32, max: 32, step: 1, unit: "px" }),
  shadowOffset: Object.freeze({ min: -32, max: 32, step: 1, unit: "px" }),
})

const PX_PER_REM = 16
const toRem = ({ value, unit }: ParsedLength) => (unit === "px" ? value / PX_PER_REM : value)
const within = (value: number, { min, max }: { min: number; max: number }) => value >= min && value <= max

/** Canonical rem/px length within `bounds` (checked in rem); `null` when inadmissible. */
export function admitRemLength(value: unknown, bounds: { min: number; max: number }): string | null {
  const parsed = parseLength(value, ["rem", "px"])
  return parsed && within(toRem(parsed), bounds) ? formatLength(parsed) : null
}

/** Canonical px length within `bounds`; `null` when inadmissible. */
export function admitPxLength(value: unknown, bounds: { min: number; max: number }): string | null {
  const parsed = parseLength(value, ["px"])
  return parsed && within(parsed.value, bounds) ? formatLength(parsed) : null
}

// Radius scale: sm = base - step, md = base - step/2, lg = base, xl = base + step, where step is 0.25rem (4px).
const RADIUS_STEP: Record<ParsedLength["unit"], number> = { rem: 0.25, em: 0.25, px: 4 }

export type RadiusScale = { base: string; sm: string; md: string; lg: string; xl: string }

export function deriveRadiusScale(base: string): RadiusScale {
  const parsed = parseLength(base)
  if (!parsed || parsed.value < 0) throw new Error(`not a non-negative length: ${base}`)
  const step = RADIUS_STEP[parsed.unit]
  const at = (offset: number) => formatLength({ value: Math.max(0, parsed.value + offset), unit: parsed.unit })
  return { base: at(0), sm: at(-step), md: at(-step / 2), lg: at(0), xl: at(step) }
}

/** The one editable shadow profile. Lengths are px; `color` is canonical OKLCH without alpha; `opacity` is 0..1. */
export type ShadowProfile = { color: string; opacity: number; blur: string; spread: string; offsetX: string; offsetY: string }
export const SHADOW_PROFILE_FIELDS = ["color", "opacity", "blur", "spread", "offsetX", "offsetY"] as const

/** Per-tier alpha multiplier and optional fixed secondary layer (offsetY, blur); spread is profile spread - 1px. */
const TIERS: Record<ShadowToken, { opacity: number; secondary?: readonly [number, number] }> = {
  "2xs": { opacity: 0.5 },
  xs: { opacity: 0.5 },
  sm: { opacity: 1, secondary: [1, 2] },
  default: { opacity: 1, secondary: [1, 2] },
  md: { opacity: 1, secondary: [2, 4] },
  lg: { opacity: 1, secondary: [4, 6] },
  xl: { opacity: 1, secondary: [8, 10] },
  "2xl": { opacity: 2.5 },
}

const px = (value: number) => formatLength({ value, unit: "px" })

/** Derives all eight canonical shadow tiers from one admitted profile. */
export function deriveShadowTiers(profile: ShadowProfile): Record<ShadowToken, ShadowLayer[]> {
  const spread = parseLength(profile.spread, ["px"])
  if (!spread) throw new Error(`not a px length: ${profile.spread}`)
  return Object.fromEntries(
    SHADOW_TOKENS.map((tier) => {
      const { opacity, secondary } = TIERS[tier]
      const color = withAlpha(profile.color, Math.min(1, profile.opacity * opacity))
      const layers: ShadowLayer[] = [
        { inset: false, offsetX: profile.offsetX, offsetY: profile.offsetY, blur: profile.blur, spread: profile.spread, color },
      ]
      if (secondary) layers.push({ inset: false, offsetX: profile.offsetX, offsetY: px(secondary[0]), blur: px(secondary[1]), spread: px(spread.value - 1), color })
      return [tier, layers]
    })
  ) as Record<ShadowToken, ShadowLayer[]>
}

export type ShadowProfileAdmission = { ok: true; profile: ShadowProfile } | { ok: false; invalid: (typeof SHADOW_PROFILE_FIELDS)[number][] }

/** Validates and canonicalizes a profile. The colour accepts any supported input but must be opaque. */
export function admitShadowProfile(value: Record<string, unknown>): ShadowProfileAdmission {
  const b = MANUAL_CONTROL_BOUNDS
  const color = normalizeColor(value.color)
  const opaque = color.ok && parseCanonicalOklch(color.value)!.alpha === 1 ? color.value : null
  const opacity = typeof value.opacity === "number" && Number.isFinite(value.opacity) && within(value.opacity, b.shadowOpacity) ? value.opacity : null
  const fields = {
    color: opaque,
    opacity,
    blur: admitPxLength(value.blur, b.shadowBlur),
    spread: admitPxLength(value.spread, b.shadowSpread),
    offsetX: admitPxLength(value.offsetX, b.shadowOffset),
    offsetY: admitPxLength(value.offsetY, b.shadowOffset),
  }
  const invalid = SHADOW_PROFILE_FIELDS.filter((field) => fields[field] === null)
  if (invalid.length > 0) return { ok: false, invalid }
  return { ok: true, profile: { ...(fields as ShadowProfile), opacity: Math.round(fields.opacity! * 1e6) / 1e6 } }
}

/** Reads the profile back from the first layer of the canonical `shadow.default` tier. */
export function readShadowProfile(theme: Theme): ShadowProfile {
  const layer = theme.shadow.default.$value[0]!
  const color = parseCanonicalOklch(layer.color)!
  return {
    color: withAlpha(layer.color, 1),
    opacity: color.alpha,
    blur: layer.blur,
    spread: layer.spread,
    offsetX: layer.offsetX,
    offsetY: layer.offsetY,
  }
}
