import type { Meta, StoryObj } from "@storybook/react-vite"
import { BitcoinPrice } from "./bitcoin-price"
export default { title: "Composition/Bitcoin Price", component: BitcoinPrice } satisfies Meta<typeof BitcoinPrice>
export const Default: StoryObj<typeof BitcoinPrice> = {}
