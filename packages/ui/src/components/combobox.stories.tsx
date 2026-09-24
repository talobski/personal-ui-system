import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"

import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@personal-ui/ui/components/combobox"
import { Field, FieldDescription, FieldLabel } from "@personal-ui/ui/components/field"

type Option = { value: string; label: string }

const options: Option[] = [
  { value: "inter", label: "Inter" },
  { value: "roboto", label: "Roboto" },
  { value: "open-sans", label: "Open Sans" },
  { value: "lato", label: "Lato" },
  { value: "montserrat", label: "Montserrat" },
  { value: "dm-sans", label: "DM Sans" },
  { value: "outfit", label: "Outfit" },
  { value: "work-sans", label: "Work Sans" },
]

function Example({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = React.useState<Option | null>(options[0]!)
  return (
    <Field className="w-80">
      <FieldLabel htmlFor="sans-font">Sans font</FieldLabel>
      <Combobox items={options} value={value} onValueChange={setValue} disabled={disabled} isItemEqualToValue={(item, selected) => item.value === selected.value}>
        <ComboboxInput id="sans-font" placeholder="Search fonts" disabled={disabled} />
        <ComboboxContent>
          <ComboboxEmpty>No fonts found.</ComboboxEmpty>
          <ComboboxList>
            {(option: Option) => (
              <ComboboxItem key={option.value} value={option}>
                {option.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <FieldDescription data-testid="combobox-value">Selected: {value?.label ?? "none"}</FieldDescription>
    </Field>
  )
}

const meta = {
  title: "Pilot/Combobox",
  component: Example,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Example>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Disabled: Story = { args: { disabled: true } }
