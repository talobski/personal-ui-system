import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@personal-ui/ui/components/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@personal-ui/ui/components/card"
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@personal-ui/ui/components/field"
import { Input } from "@personal-ui/ui/components/input"
import { NativeSelect, NativeSelectOption } from "@personal-ui/ui/components/native-select"
import { Textarea } from "@personal-ui/ui/components/textarea"

function AccountProfile({ invalidEmail = false }: { invalidEmail?: boolean }) {
  const emailErrorId = "profile-email-error"
  return (
    <Card className="w-[26rem]">
      <CardHeader>
        <CardTitle>Account profile</CardTitle>
        <CardDescription>Keep your account details current.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="profile-name">Display name</FieldLabel>
            <FieldContent>
              <Input id="profile-name" autoComplete="name" defaultValue="Ada Lovelace" />
            </FieldContent>
          </Field>
          <Field data-invalid={invalidEmail}>
            <FieldLabel htmlFor="profile-email">Email</FieldLabel>
            <FieldContent>
              <Input
                id="profile-email"
                type="email"
                autoComplete="email"
                aria-invalid={invalidEmail || undefined}
                aria-describedby={invalidEmail ? emailErrorId : undefined}
                defaultValue={invalidEmail ? "not-an-email" : "ada@example.com"}
              />
              {invalidEmail ? <FieldError id={emailErrorId}>Enter a valid email address.</FieldError> : null}
            </FieldContent>
          </Field>
          <Field orientation="responsive">
            <FieldLabel htmlFor="profile-country">Country</FieldLabel>
            <FieldContent>
              <FieldDescription>Used for billing and locale defaults.</FieldDescription>
              <NativeSelect id="profile-country" defaultValue="ph">
                <NativeSelectOption value="ph">Philippines</NativeSelectOption>
                <NativeSelectOption value="jp">Japan</NativeSelectOption>
              </NativeSelect>
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-bio">Bio</FieldLabel>
            <FieldContent>
              <Textarea id="profile-bio" defaultValue="Mathematician and writer." />
              <FieldDescription>Shown on your public profile.</FieldDescription>
            </FieldContent>
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t">
        <Button variant="outline">Cancel</Button>
        <Button>Save changes</Button>
      </CardFooter>
    </Card>
  )
}

const meta = {
  title: "Composition/Account Profile",
  component: AccountProfile,
  parameters: { layout: "centered" },
} satisfies Meta<typeof AccountProfile>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const InvalidEmail: Story = { args: { invalidEmail: true } }
