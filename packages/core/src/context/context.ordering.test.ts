import { describe, expect, it } from "vitest"
import { compareCodeUnits } from "./ordering"

describe("context sort ordering (ACR-05)", () => {
  it("orders by UTF-16 code unit, independent of locale collation", () => {
    // Default localeCompare collation typically interleaves case ("a" before "B"); code-unit order never does,
    // because uppercase letters (0x41-0x5A) are all below lowercase letters (0x61-0x7A) in UTF-16.
    expect(["b", "A", "a", "B"].sort(compareCodeUnits)).toEqual(["A", "B", "a", "b"])
  })

  it("is a strict total order (antisymmetric, equal strings compare 0)", () => {
    expect(compareCodeUnits("a", "a")).toBe(0)
    expect(compareCodeUnits("a", "b")).toBeLessThan(0)
    expect(compareCodeUnits("b", "a")).toBeGreaterThan(0)
  })
})
