import type { Meta, StoryObj } from "@storybook/react-vite"
import { LaunchBoard } from "./launch-board"
export default { title: "Composition/Launch Board", component: LaunchBoard } satisfies Meta<typeof LaunchBoard>
export const Default: StoryObj<typeof LaunchBoard> = {}
export const Gallery: StoryObj<typeof LaunchBoard> = { args: { stable: true } }
