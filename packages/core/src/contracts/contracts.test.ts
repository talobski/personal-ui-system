import { describe, expect, it } from "vitest"
import { contractByteLength, contractSchema, CONTRACT_MAX_BYTES, getContract, listContractIds } from "../index"

const ALL_RESOURCE_IDS = [
  "button",
  "card",
  "chart",
  "collapsible",
  "combobox",
  "field",
  "input",
  "native-select",
  "resizable-panel",
  "responsive-dialog",
  "select",
  "single-toggle-group",
  "slider",
  "switch",
  "tabs",
  "textarea",
]

describe("contract lookup", () => {
  it("lists exactly the sixteen public resources", () => {
    expect(listContractIds().sort()).toEqual([...ALL_RESOURCE_IDS].sort())
  })

  it.each(ALL_RESOURCE_IDS)("returns only the %s contract, validated and within 8 KiB", async (id) => {
    const contract = await getContract(id)
    expect(contract?.id).toBe(id)
    expect(contractSchema.safeParse(contract).success).toBe(true)
    expect(Object.keys(contract!).sort()).toEqual(
      [
        "id", "purpose", "use", "avoid", "variants", "responsiveBehavior", "accessibility",
        "composition", "examples", "mistakes", "mobileReplacement", "constraints",
      ].sort()
    )
    expect(contractByteLength(contract!)).toBeLessThanOrEqual(CONTRACT_MAX_BYTES)
    // A single-item response must not embed any other pilot's id in its own payload.
    const others = listContractIds().filter((other) => other !== id)
    const serialized = JSON.stringify(contract)
    for (const other of others) expect(serialized).not.toContain(`"id":"${other}"`)
  })

  it("declares the mobile replacement for the responsive pattern", async () => {
    expect((await getContract("responsive-dialog"))?.mobileReplacement).toMatch(/Drawer/)
  })

  it("returns undefined for unknown or prototype-chain ids", async () => {
    for (const id of ["nope", "__proto__", "constructor", "toString", ""]) expect(await getContract(id)).toBeUndefined()
  })
})
