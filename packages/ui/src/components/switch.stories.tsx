import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { Moon, Sun } from "lucide-react"

import { Field, FieldContent, FieldDescription, FieldTitle } from "@personal-ui/ui/components/field"
import { Switch } from "@personal-ui/ui/components/switch"

function Example({ checked = true, disabled = false, thumbIcon = false }: { checked?: boolean; disabled?: boolean; thumbIcon?: boolean }) {
  const [dark, setDark] = useState(checked)
  // Optional thumbContent: an icon-only colour-mode toggle whose glyph mirrors the state; the name stays aria-label.
  if (thumbIcon) return (
    <Switch aria-label="Toggle dark mode" checked={dark} onCheckedChange={setDark} disabled={disabled}
      thumbContent={dark ? <Moon aria-hidden="true" data-icon="moon" className="size-2.5" /> : <Sun aria-hidden="true" data-icon="sun" className="size-2.5" />} />
  )
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
export const ThumbIcon: Story = { args: { checked: false, thumbIcon: true } }
