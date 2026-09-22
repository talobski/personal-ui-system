import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@personal-ui/ui/components/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@personal-ui/ui/components/card"
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@personal-ui/ui/components/field"
import { Input } from "@personal-ui/ui/components/input"
import { NativeSelect, NativeSelectOption } from "@personal-ui/ui/components/native-select"
import { Textarea } from "@personal-ui/ui/components/textarea"

function SupportRequest({ invalidMessage = false }: { invalidMessage?: boolean }) {
  const messageErrorId = "support-message-error"
  return (
    <Card className="w-[26rem]">
      <CardHeader>
        <CardTitle>Contact support</CardTitle>
        <CardDescription>We usually reply within one business day.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="support-subject">Subject</FieldLabel>
            <FieldContent>
              <Input id="support-subject" defaultValue="Billing question" />
            </FieldContent>
          </Field>
          <Field orientation="responsive">
            <FieldLabel htmlFor="support-topic">Topic</FieldLabel>
            <FieldContent>
              <FieldDescription>Helps us route your request.</FieldDescription>
              <NativeSelect id="support-topic" defaultValue="billing">
                <NativeSelectOption value="billing">Billing</NativeSelectOption>
                <NativeSelectOption value="technical">Technical issue</NativeSelectOption>
                <NativeSelectOption value="other">Other</NativeSelectOption>
              </NativeSelect>
            </FieldContent>
          </Field>
          <Field data-invalid={invalidMessage}>
            <FieldLabel htmlFor="support-message">Message</FieldLabel>
            <FieldContent>
              <Textarea
                id="support-message"
                aria-invalid={invalidMessage || undefined}
                aria-describedby={invalidMessage ? messageErrorId : undefined}
                defaultValue={invalidMessage ? "" : "I was charged twice for last month's invoice."}
              />
              {invalidMessage ? <FieldError id={messageErrorId}>Enter a message.</FieldError> : null}
            </FieldContent>
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t">
        <Button variant="outline">Save draft</Button>
        <Button>Send request</Button>
      </CardFooter>
    </Card>
  )
}

const meta = {
  title: "Composition/Support Request",
  component: SupportRequest,
  parameters: { layout: "centered" },
} satisfies Meta<typeof SupportRequest>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const InvalidMessage: Story = { args: { invalidMessage: true } }
