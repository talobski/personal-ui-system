import type { Meta, StoryObj } from "@storybook/react-vite"
import { SupportRequest } from "./support-request"

const meta = {
  title: "Composition/Support Request",
  component: SupportRequest,
  parameters: { layout: "centered" },
} satisfies Meta<typeof SupportRequest>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const InvalidMessage: Story = { args: { invalidMessage: true } }

export const QuietWorkspace: Story = { args: { compact: true } }
export const Gallery: Story = { args: { compact: true, stable: true } }
