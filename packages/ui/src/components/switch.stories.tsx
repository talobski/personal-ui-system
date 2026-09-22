import type { Meta, StoryObj } from "@storybook/react-vite"

import { Field, FieldContent, FieldDescription, FieldTitle } from "@personal-ui/ui/components/field"
import { Switch } from "@personal-ui/ui/components/switch"

function Example({ checked = true, disabled = false }: { checked?: boolean; disabled?: boolean }) {
  return (
    <Field orientation="horizontal" className="w-80">
      <FieldContent>
        <FieldTitle>Email notifications</FieldTitle>
        <FieldDescription>Get an email for account activity.</FieldDescription>
      </FieldContent>
      <Switch id="email-notifications" aria-label="Email notifications" defaultChecked={checked} disabled={disabled} />
    </Field>
  )
}

const meta = {
  title: "Pilot/Switch",
  component: Example,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Example>

export default meta
type Story = StoryObj<typeof meta>

export const Checked: Story = {}
export const Unchecked: Story = { args: { checked: false } }
export const Disabled: Story = { args: { disabled: true } }
