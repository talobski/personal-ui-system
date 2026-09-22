import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { SingleToggleGroup } from "@personal-ui/ui/components/single-toggle-group"

const PLAN_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const

function Example({ disabled = false }: { disabled?: boolean }) {
  const [plan, setPlan] = useState<(typeof PLAN_OPTIONS)[number]["value"]>("monthly")
  return (
    <fieldset disabled={disabled} className="border-0 p-0">
      <SingleToggleGroup label="Plan" value={plan} onValueChange={setPlan} options={PLAN_OPTIONS} />
    </fieldset>
  )
}

const meta = {
  title: "Pilot/Single Toggle Group",
  component: Example,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Example>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Disabled: Story = { args: { disabled: true } }
