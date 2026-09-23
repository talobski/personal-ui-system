import type { Meta, StoryObj } from "@storybook/react-vite"
import { AccountProfile } from "./account-profile"

const meta = {
  title: "Composition/Account Profile",
  component: AccountProfile,
  parameters: { layout: "centered" },
} satisfies Meta<typeof AccountProfile>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const InvalidEmail: Story = { args: { invalidEmail: true } }

export const QuietWorkspace: Story = { args: { compact: true } }
