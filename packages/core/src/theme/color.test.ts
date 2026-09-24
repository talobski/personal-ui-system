import { describe, expect, it } from "vitest"
import { normalizeColor, normalizeLength } from "./color"

const ok = (input: string) => {
  const result = normalizeColor(input)
  if (!result.ok) throw new Error(`${input} rejected: ${result.reason}`)
  return result.value
}

describe("normalizeColor: four input families to canonical OKLCH", () => {
  it.each([
    ["#fff", "oklch(1 0 0)"],
    ["#FFFFFF", "oklch(1 0 0)"],
    ["#000", "oklch(0 0 0)"],
    ["#e7000b", "oklch(0.583043 0.238666 28.476475)"],
    ["#0000001a", "oklch(0 0 0 / 0.101961)"],
    ["#fff8", "oklch(1 0 0 / 0.533333)"],
    ["rgb(231 0 11)", "oklch(0.583043 0.238666 28.476475)"],
    ["rgb(231, 0, 11)", "oklch(0.583043 0.238666 28.476475)"],
    ["rgba(0, 0, 0, 0.1)", "oklch(0 0 0 / 0.1)"],
    ["rgb(0 0 0 / 10%)", "oklch(0 0 0 / 0.1)"],
    ["rgb(100% 100% 100%)", "oklch(1 0 0)"],
    ["hsl(0 0% 100%)", "oklch(1 0 0)"],
    ["hsl(0, 100%, 50%)", "oklch(0.627955 0.257683 29.23388)"],
    ["hsl(360deg 100% 50%)", "oklch(0.627955 0.257683 29.23388)"],
    ["hsla(0, 0%, 0%, .25)", "oklch(0 0 0 / 0.25)"],
    ["hsl(0 0% 0% / 50%)", "oklch(0 0 0 / 0.5)"],
    ["oklch(0.583043 0.238666 28.47648)", "oklch(0.583043 0.238666 28.47648)"],
    ["oklch(50% 0.1 20)", "oklch(0.5 0.1 20)"],
    ["oklch(0.5 25% 20deg)", "oklch(0.5 0.1 20)"],
    ["oklch(0.5 0.1 380)", "oklch(0.5 0.1 20)"],
    ["oklch(0.5 0.1 -20)", "oklch(0.5 0.1 340)"],
    ["oklch(0.5000000001 0 123)", "oklch(0.5 0 0)"],
    ["oklch(1 0 0 / 10%)", "oklch(1 0 0 / 0.1)"],
    ["oklch(1 0 0 / 1)", "oklch(1 0 0)"],
    ["  oklch(0.2 0.01 250)  ", "oklch(0.2 0.01 250)"],
    ["OKLCH(0.2 0.01 250)", "oklch(0.2 0.01 250)"],
  ])("%s -> %s", (input, expected) => {
    expect(ok(input)).toBe(expected)
  })

  it("is idempotent: every canonical output is a fixed point", () => {
    for (const input of ["#e7000b", "rgba(12, 34, 56, 0.3)", "hsl(210 40% 50% / 0.5)", "oklch(0.7 0.19 22)", "#abcdef80"]) {
      const once = ok(input)
      expect(ok(once)).toBe(once)
    }
  })

  it("round-trips HEX through OKLCH within 8-bit precision", async () => {
    const { useMode, modeRgb } = await import("culori/fn")
    const toRgb = useMode(modeRgb) as (c: Record<string, unknown>) => { r: number; g: number; b: number }
    for (const hex of ["#e7000b", "#0a7cff", "#123456", "#fefefe", "#808080"]) {
      const [, l, c, h] = /^oklch\((\S+) (\S+) (\S+)\)$/.exec(ok(hex))!.map(Number) as number[]
      const rgb = toRgb({ mode: "oklch", l, c, h })
      const back = [rgb.r, rgb.g, rgb.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("")
      expect(`#${back}`).toBe(hex)
    }
  })

  it.each([
    ["red", "syntax"],
    ["transparent", "syntax"],
    ["#ff", "syntax"],
    ["#ggg", "syntax"],
    ["rgb(1 2)", "syntax"],
    ["rgb(1, 2 3)", "syntax"],
    ["rgb(1,2,3,4,5)", "syntax"],
    ["rgb(1, 2, 3 / 0.5)", "syntax"],
    ["oklch(0.5, 0.1, 20)", "syntax"],
    ["oklch(none 0.1 20)", "syntax"],
    ["oklch(from red l c h)", "syntax"],
    ["oklch(calc(0.5) 0.1 20)", "syntax"],
    ["lab(50% 20 20)", "syntax"],
    ["oklch(0.5 0.1 20); } body { display: none", "syntax"],
    ["", "syntax"],
    ["rgb(300 0 0)", "range"],
    ["rgb(-1 0 0)", "range"],
    ["hsl(0 120% 50%)", "range"],
    ["oklch(1.2 0 0)", "range"],
    ["oklch(0.5 -0.1 20)", "range"],
    ["oklch(0.5 0.1 20 / 1.5)", "range"],
    ["rgba(0, 0, 0, -0.1)", "range"],
    ["oklch(1e999 0 0)", "non-finite"],
    ["oklch(0.5 0.1 1e999)", "non-finite"],
    ["oklch(0.7 0.4 150)", "out-of-gamut"],
    ["oklch(0.99 0.3 30)", "out-of-gamut"],
    ["oklch(0.5 1e308 20)", "out-of-gamut"],
    ["oklch(0.5 1e21 20)", "out-of-gamut"],
  ])("rejects %s (%s) deterministically", (input, reason) => {
    expect(normalizeColor(input)).toEqual({ ok: false, reason })
    expect(normalizeColor(input)).toEqual(normalizeColor(input))
  })

  it("rejects non-strings and oversize input without throwing", () => {
    for (const input of [null, undefined, 1, {}, [], "#fff".padEnd(200, " ")]) expect(normalizeColor(input).ok).toBe(false)
  })
})

describe("normalizeLength", () => {
  it.each([
    ["0.3rem", "0.3rem"],
    [".3rem", "0.3rem"],
    ["1.4750rem", "1.475rem"],
    ["-0px", "0px"],
    ["0.123456em", "0.1235em"],
    ["10PX", "10px"],
  ])("%s -> %s", (input, expected) => expect(normalizeLength(input)).toBe(expected))

  it("rejects other units, expressions, and non-finite numbers", () => {
    for (const input of ["1", "1pt", "calc(1rem)", "1e999rem", "1e308px", "-1e308px", "1 rem", "var(--x)"]) expect(normalizeLength(input)).toBeNull()
    expect(normalizeLength("1px", ["rem"])).toBeNull()
  })
})
