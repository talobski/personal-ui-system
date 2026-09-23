import type { Meta, StoryObj } from "@storybook/react-vite"
import { NotificationPreferences } from "./notification-preferences"

const meta = {
  title: "Composition/Notification Preferences",
  component: NotificationPreferences,
  parameters: { layout: "centered" },
} satisfies Meta<typeof NotificationPreferences>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const QuietWorkspace: Story = { args: { compact: true } }
