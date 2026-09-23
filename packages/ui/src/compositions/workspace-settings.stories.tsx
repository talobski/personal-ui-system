import type { Meta, StoryObj } from "@storybook/react-vite"
import { WorkspaceSettings } from "./workspace-settings"

const meta = {
  title: "Composition/Workspace Settings",
  component: WorkspaceSettings,
  parameters: { layout: "centered" },
} satisfies Meta<typeof WorkspaceSettings>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const QuietWorkspace: Story = { args: { compact: true } }
