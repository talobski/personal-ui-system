import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@personal-ui/ui/components/field"
import { Input } from "@personal-ui/ui/components/input"
import { NativeSelect as NativeSelectControl, NativeSelectOption } from "@personal-ui/ui/components/native-select"

function CountryField({ invalid = false, disabled = false }: { invalid?: boolean; disabled?: boolean }) {
  const errorId = "country-error"
  const helpId = "country-help"
  return (
    <FieldGroup className="max-w-md">
      <Field orientation="responsive" data-invalid={invalid} data-disabled={disabled}>
        <FieldLabel htmlFor="country">Country</FieldLabel>
        <FieldContent>
          <FieldDescription id={helpId}>Choose the country where you work.</FieldDescription>
          <NativeSelectControl
            id="country"
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? `${helpId} ${errorId}` : helpId}
            defaultValue="ph"
            disabled={disabled}
          >
            <NativeSelectOption value="ph">Philippines</NativeSelectOption>
            <NativeSelectOption value="jp">Japan</NativeSelectOption>
          </NativeSelectControl>
          {invalid ? <FieldError id={errorId}>Choose a country.</FieldError> : null}
        </FieldContent>
      </Field>
    </FieldGroup>
  )
}

function InputField() {
  return (
    <FieldGroup className="max-w-md">
      <Field orientation="vertical">
        <FieldLabel htmlFor="work-email">Work email</FieldLabel>
        <FieldContent>
          <Input id="work-email" type="email" autoComplete="email" />
          <FieldDescription>We only use this for account updates.</FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  )
}

const meta = {
  title: "Pilot/Field",
  component: CountryField,
  parameters: { layout: "centered" },
} satisfies Meta<typeof CountryField>

export default meta
type Story = StoryObj<typeof meta>

export const NativeSelect: Story = {}
export const Invalid: Story = { args: { invalid: true } }
export const Disabled: Story = { args: { disabled: true } }
export const WithInput: StoryObj<typeof InputField> = { render: () => <InputField /> }
