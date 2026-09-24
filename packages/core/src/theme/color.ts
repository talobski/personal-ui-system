/// <reference path="./culori.d.ts" />
import { modeHsl, modeLrgb, modeOklab, modeOklch, modeP3, modeRgb, modeXyz65, useMode } from "culori/fn"

/**
 * Colour input normalization for Theme v2. Four input families are accepted — HEX, RGB/RGBA, HSL/HSLA, and OKLCH —
 * and every accepted value is stored as one canonical OKLCH string. Parsing is done here with closed, anchored
 * grammars and explicit range checks; culori is used only for the colour-space arithmetic, never as the parser, because
 * its parser silently clamps out-of-range components (e.g. `oklch(1.2 0 0)` or `rgb(300 0 0)`) instead of rejecting.
 *
 * Canonical form (the precision policy):
 * - `oklch(L C H)` or `oklch(L C H / A)`, single spaces, no units or percentages.
 * - L, C, H, and A are rounded half-up to 6 decimal places; trailing zeros and `-0` are removed.
 * - H is normalized to [0, 360); when the rounded chroma is 0 the hue is 0 (achromatic).
 * - A is omitted when it is 1.
 * - The colour must lie inside the Display P3 gamut (tolerance `GAMUT_EPSILON` per encoded channel). OKLCH input is
 *   validated and rounded only — it is never round-tripped through another space, so canonical input is a fixed point.
 */

export type ColorNormalization = { ok: true; value: string } | { ok: false; reason: ColorRejection }
export type ColorRejection = "syntax" | "range" | "non-finite" | "out-of-gamut"

export type OklchComponents = { l: number; c: number; h: number; alpha: number }

export const COLOR_PRECISION_DECIMALS = 6
export const GAMUT_EPSILON = 1e-4
/** CSS Color 4: 100% chroma in `oklch()` is 0.4. */
const CHROMA_PERCENT_REFERENCE = 0.4

const NUMBER = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?`
const NUMBER_RE = new RegExp(`^${NUMBER}$`, "i")
const PERCENT_RE = new RegExp(`^(${NUMBER})%$`, "i")
const DEG_RE = new RegExp(`^(${NUMBER})(?:deg)?$`, "i")
const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const FUNCTION_RE = /^(rgba?|hsla?|oklch)\(\s*([^()]*?)\s*\)$/i

type Component = { value: number; percent: boolean }

// The tree-shakeable entry: register only the spaces on the conversion paths used here (rgb/hsl -> oklch, oklch -> p3).
for (const mode of [modeRgb, modeLrgb, modeHsl, modeOklab, modeXyz65]) useMode(mode)
const toOklch = useMode(modeOklch)
const toP3 = useMode(modeP3)

const round = (value: number, decimals = COLOR_PRECISION_DECIMALS) => {
  const factor = 10 ** decimals
  const rounded = Math.round(value * factor) / factor
  return Object.is(rounded, -0) ? 0 : rounded
}

/** Plain decimal text: `String` never yields exponent notation for values rounded to 6 decimals within range. */
const num = (value: number) => String(value)

function component(token: string): Component | null {
  const percent = PERCENT_RE.exec(token)
  if (percent) return { value: Number(percent[1]), percent: true }
  if (NUMBER_RE.test(token)) return { value: Number(token), percent: false }
  return null
}

function hue(token: string): number | null {
  const match = DEG_RE.exec(token)
  return match ? Number(match[1]) : null
}

/** Splits the inside of a colour function into three components and an optional alpha (modern or legacy syntax). */
function splitArguments(inner: string, allowLegacy: boolean): { parts: string[]; alpha?: string } | null {
  if (inner.includes(",")) {
    if (!allowLegacy || inner.includes("/")) return null
    const parts = inner.split(",").map((part) => part.trim())
    if (parts.some((part) => part === "" || /\s/.test(part))) return null
    if (parts.length === 3) return { parts }
    if (parts.length === 4) return { parts: parts.slice(0, 3), alpha: parts[3]! }
    return null
  }
  const [main, alpha, ...rest] = inner.split("/").map((part) => part.trim())
  if (rest.length > 0 || main === undefined) return null
  const parts = main.split(/\s+/)
  if (parts.length !== 3 || alpha === "") return null
  return alpha === undefined ? { parts } : { parts, alpha }
}

function parseAlpha(token: string | undefined): number | ColorRejection {
  if (token === undefined) return 1
  const parsed = component(token)
  if (!parsed) return "syntax"
  const value = parsed.percent ? parsed.value / 100 : parsed.value
  if (!Number.isFinite(value)) return "non-finite"
  return value < 0 || value > 1 ? "range" : value
}

const finite = (...values: number[]) => values.every(Number.isFinite)

/** Parses one supported input into OKLCH components (unrounded), or the reason it is rejected. */
function parseToOklch(input: string): OklchComponents | ColorRejection {
  const text = input.trim()
  if (HEX_RE.test(text)) {
    const hex = text.slice(1)
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join("") : hex
    const channel = (i: number) => parseInt(full.slice(i * 2, i * 2 + 2), 16) / 255
    const alpha = full.length === 8 ? channel(3) : 1
    const oklch = toOklch({ mode: "rgb", r: channel(0), g: channel(1), b: channel(2) })
    return { l: oklch.l, c: oklch.c, h: oklch.h ?? 0, alpha }
  }

  const match = FUNCTION_RE.exec(text)
  if (!match) return "syntax"
  const fn = match[1]!.toLowerCase()
  const args = splitArguments(match[2]!, fn !== "oklch")
  if (!args) return "syntax"
  const alpha = parseAlpha(args.alpha)
  if (typeof alpha === "string") return alpha
  const [a, b, c] = args.parts as [string, string, string]

  if (fn === "rgb" || fn === "rgba") {
    const channels = [a, b, c].map(component)
    if (channels.some((ch) => ch === null)) return "syntax"
    const values = (channels as Component[]).map((ch) => (ch.percent ? ch.value / 100 : ch.value / 255))
    if (!finite(...values)) return "non-finite"
    if (values.some((v) => v < 0 || v > 1)) return "range"
    const oklch = toOklch({ mode: "rgb", r: values[0]!, g: values[1]!, b: values[2]! })
    return { l: oklch.l, c: oklch.c, h: oklch.h ?? 0, alpha }
  }

  if (fn === "hsl" || fn === "hsla") {
    const h = hue(a)
    const s = component(b)
    const l = component(c)
    if (h === null || !s || !l) return "syntax"
    if (!finite(h, s.value, l.value)) return "non-finite"
    if (s.value < 0 || s.value > 100 || l.value < 0 || l.value > 100) return "range"
    const oklch = toOklch({ mode: "hsl", h: ((h % 360) + 360) % 360, s: s.value / 100, l: l.value / 100 })
    return { l: oklch.l, c: oklch.c, h: oklch.h ?? 0, alpha }
  }

  // oklch
  const l = component(a)
  const ch = component(b)
  const h = hue(c)
  if (!l || !ch || h === null) return "syntax"
  const lightness = l.percent ? l.value / 100 : l.value
  const chroma = ch.percent ? (ch.value / 100) * CHROMA_PERCENT_REFERENCE : ch.value
  if (!finite(lightness, chroma, h)) return "non-finite"
  if (lightness < 0 || lightness > 1 || chroma < 0) return "range"
  return { l: lightness, c: chroma, h, alpha }
}

function inP3Gamut({ l, c, h }: OklchComponents): boolean {
  const p3 = toP3({ mode: "oklch", l, c, h })
  return [p3.r, p3.g, p3.b].every((v) => v >= -GAMUT_EPSILON && v <= 1 + GAMUT_EPSILON)
}

/** Rounds components to the canonical precision and formats them. Assumes finite, in-range components. */
export function formatOklch({ l, c, h, alpha }: OklchComponents): string {
  const L = round(Math.min(1, Math.max(0, l)))
  const C = round(Math.max(0, c))
  let H = C === 0 ? 0 : round(((h % 360) + 360) % 360)
  if (H === 360) H = 0
  const A = round(Math.min(1, Math.max(0, alpha)))
  return A === 1 ? `oklch(${num(L)} ${num(C)} ${num(H)})` : `oklch(${num(L)} ${num(C)} ${num(H)} / ${num(A)})`
}

/** Normalizes one HEX, RGB(A), HSL(A), or OKLCH input to canonical OKLCH. Never throws. */
export function normalizeColor(input: unknown): ColorNormalization {
  if (typeof input !== "string" || input.length > 128) return { ok: false, reason: "syntax" }
  const parsed = parseToOklch(input)
  if (typeof parsed === "string") return { ok: false, reason: parsed }
  if (!finite(parsed.l, parsed.c, parsed.h, parsed.alpha)) return { ok: false, reason: "non-finite" }
  const canonical = formatOklch(parsed)
  const rounded = parseCanonicalOklch(canonical)!
  if (!inP3Gamut(rounded)) return { ok: false, reason: "out-of-gamut" }
  return { ok: true, value: canonical }
}

const CANONICAL_RE = /^oklch\((\d+(?:\.\d+)?) (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)(?: \/ (\d+(?:\.\d+)?))?\)$/

/** Reads the components of a canonical OKLCH string (as produced by `normalizeColor`); `null` for anything else. */
export function parseCanonicalOklch(value: string): OklchComponents | null {
  const match = CANONICAL_RE.exec(value)
  if (!match) return null
  return { l: Number(match[1]), c: Number(match[2]), h: Number(match[3]), alpha: match[4] === undefined ? 1 : Number(match[4]) }
}

/** The same canonical colour with a different alpha (rounded to the canonical precision). */
export function withAlpha(canonical: string, alpha: number): string {
  const parsed = parseCanonicalOklch(canonical)
  if (!parsed) throw new Error(`not a canonical oklch colour: ${canonical}`)
  return formatOklch({ ...parsed, alpha })
}

/**
 * Canonical length: `<number><unit>` with the number rounded to 4 decimal places, trailing zeros and `-0` removed,
 * and a leading `0` before the decimal point. The accepted units are supplied by the caller.
 */
export const LENGTH_PRECISION_DECIMALS = 4
const LENGTH_RE = new RegExp(`^(${NUMBER})(rem|px|em)$`, "i")

export type ParsedLength = { value: number; unit: "rem" | "px" | "em" }

export function parseLength(input: unknown, units: readonly ParsedLength["unit"][] = ["rem", "px", "em"]): ParsedLength | null {
  if (typeof input !== "string" || input.length > 32) return null
  const match = LENGTH_RE.exec(input.trim())
  if (!match) return null
  const unit = match[2]!.toLowerCase() as ParsedLength["unit"]
  const value = Number(match[1])
  if (!Number.isFinite(value) || !units.includes(unit)) return null
  return { value: round(value, LENGTH_PRECISION_DECIMALS), unit }
}

export const formatLength = ({ value, unit }: ParsedLength) => `${num(round(value, LENGTH_PRECISION_DECIMALS))}${unit}`

export function normalizeLength(input: unknown, units?: readonly ParsedLength["unit"][]): string | null {
  const parsed = parseLength(input, units)
  return parsed ? formatLength(parsed) : null
}
