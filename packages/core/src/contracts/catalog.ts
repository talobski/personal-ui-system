import { contractByteLength, contractSchema, CONTRACT_MAX_BYTES } from "./contract"
import type { Contract } from "./contract"

/**
 * The catalog is an index of IDs to loaders only. A lookup imports exactly one
 * contract module, so retrieving one item never loads the others.
 */
const loaders = {
  button: () => import("./data/button").then((m) => m.button),
  input: () => import("./data/input").then((m) => m.input),
  "responsive-dialog": () => import("./data/responsive-dialog").then((m) => m.responsiveDialog),
} as const satisfies Record<string, () => Promise<unknown>>

export type ContractId = keyof typeof loaders

export const listContractIds = (): ContractId[] => Object.keys(loaders) as ContractId[]

export async function getContract(id: string): Promise<Contract | undefined> {
  if (!Object.hasOwn(loaders, id)) return undefined
  const contract = contractSchema.parse(await loaders[id as ContractId]())
  if (contract.id !== id) throw new Error(`contract file for "${id}" declares id "${contract.id}"`)
  if (contractByteLength(contract) > CONTRACT_MAX_BYTES) throw new Error(`contract "${id}" exceeds ${CONTRACT_MAX_BYTES} bytes`)
  return contract
}
