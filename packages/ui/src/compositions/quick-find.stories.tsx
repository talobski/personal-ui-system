import type { Meta, StoryObj } from "@storybook/react-vite"
import { QuickFind } from "./quick-find"
export default { title: "Composition/Quick Find", component: QuickFind } satisfies Meta<typeof QuickFind>
export const Default: StoryObj<typeof QuickFind> = {}
export const Gallery: StoryObj<typeof QuickFind> = { args: { stable: true } }
