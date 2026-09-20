import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@personal-ui/ui/components/button"

const meta = {
  title: "Pilot/Button",
  component: Button,
  args: { children: "Save changes" },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Secondary: Story = { args: { variant: "secondary" } }
export const Outline: Story = { args: { variant: "outline" } }
export const Ghost: Story = { args: { variant: "ghost" } }
export const Destructive: Story = { args: { variant: "destructive", children: "Delete project" } }
export const Disabled: Story = { args: { disabled: true } }
