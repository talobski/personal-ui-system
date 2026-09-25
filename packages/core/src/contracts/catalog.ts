import { contractByteLength, contractSchema, CONTRACT_MAX_BYTES } from "./contract"
import type { Contract } from "./contract"

/**
 * The catalog is an index of IDs to loaders only. A lookup imports exactly one
 * contract module, so retrieving one item never loads the others.
 */
const loaders = {
  "resizable-panel": () => import("./data/resizable-panel").then((m) => m.resizablePanel),
  button: () => import("./data/button").then((m) => m.button),
  field: () => import("./data/field").then((m) => m.field),
  input: () => import("./data/input").then((m) => m.input),
  "native-select": () => import("./data/native-select").then((m) => m.nativeSelect),
  "responsive-dialog": () => import("./data/responsive-dialog").then((m) => m.responsiveDialog),
  card: () => import("./data/card").then((m) => m.card),
  tabs: () => import("./data/tabs").then((m) => m.tabs),
  switch: () => import("./data/switch").then((m) => m.switchContract),
  textarea: () => import("./data/textarea").then((m) => m.textarea),
  "single-toggle-group": () => import("./data/single-toggle-group").then((m) => m.singleToggleGroup),
  slider: () => import("./data/slider").then((m) => m.slider),
  collapsible: () => import("./data/collapsible").then((m) => m.collapsible),
  select: () => import("./data/select").then((m) => m.select),
  combobox: () => import("./data/combobox").then((m) => m.combobox),
  chart: () => import("./data/chart").then((m) => m.chart),
  sidebar: () => import("./data/sidebar").then((m) => m.sidebar),
  avatar: () => import("./data/avatar").then((m) => m.avatar),
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
