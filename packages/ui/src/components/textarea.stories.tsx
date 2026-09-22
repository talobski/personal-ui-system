import type { Meta, StoryObj } from "@storybook/react-vite"

import { Field, FieldContent, FieldError, FieldLabel } from "@personal-ui/ui/components/field"
import { Textarea } from "@personal-ui/ui/components/textarea"

function Example({ invalid = false, disabled = false }: { invalid?: boolean; disabled?: boolean }) {
  const errorId = "message-error"
  return (
    <Field className="w-80" data-invalid={invalid} data-disabled={disabled}>
      <FieldLabel htmlFor="message">Message</FieldLabel>
      <FieldContent>
        <Textarea
          id="message"
          placeholder="Tell us what's going on."
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
          disabled={disabled}
          defaultValue={invalid || disabled ? "" : "Everything is working well."}
        />
        {invalid ? <FieldError id={errorId}>Enter a message.</FieldError> : null}
      </FieldContent>
    </Field>
  )
}

const meta = {
  title: "Pilot/Textarea",
  component: Example,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Example>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Invalid: Story = { args: { invalid: true } }
export const Disabled: Story = { args: { disabled: true } }
