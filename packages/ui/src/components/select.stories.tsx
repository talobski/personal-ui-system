import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"

import { Field, FieldDescription, FieldLabel } from "@personal-ui/ui/components/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@personal-ui/ui/components/select"

const items = { default: "Default", "quiet-editorial": "Quiet Editorial", studio: "Studio", archive: "Archive" }

function Example({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = React.useState("default")
  return (
    <Field className="w-80">
      <FieldLabel htmlFor="theme-select">Theme</FieldLabel>
      <Select items={items} value={value} onValueChange={(next) => next !== null && setValue(next)} disabled={disabled}>
        <SelectTrigger id="theme-select" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Built-in</SelectLabel>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="quiet-editorial">Quiet Editorial</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Custom</SelectLabel>
            <SelectItem value="studio">Studio</SelectItem>
            <SelectItem value="archive" disabled>
              Archive
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldDescription data-testid="select-value">Selected: {value}</FieldDescription>
    </Field>
  )
}

const meta = {
  title: "Pilot/Select",
  component: Example,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Example>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Disabled: Story = { args: { disabled: true } }
