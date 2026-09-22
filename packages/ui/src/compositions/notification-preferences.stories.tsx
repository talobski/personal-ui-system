import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@personal-ui/ui/components/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@personal-ui/ui/components/card"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldSeparator, FieldTitle } from "@personal-ui/ui/components/field"
import { Switch } from "@personal-ui/ui/components/switch"

function NotificationRow({ id, title, description, defaultChecked = true, disabled = false }: { id: string; title: string; description: string; defaultChecked?: boolean; disabled?: boolean }) {
  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldTitle>{title}</FieldTitle>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
      <Switch id={id} aria-label={title} defaultChecked={defaultChecked} disabled={disabled} />
    </Field>
  )
}

function NotificationPreferences() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Notification preferences</CardTitle>
        <CardDescription>Choose which updates reach you and how.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <NotificationRow id="notif-email" title="Email notifications" description="Get an email for account activity." />
          <FieldSeparator />
          <NotificationRow id="notif-push" title="Push notifications" description="Get a push alert on this device." defaultChecked={false} />
          <FieldSeparator />
          <NotificationRow id="notif-sms" title="SMS alerts" description="Reserved for critical security events." defaultChecked={false} disabled />
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end border-t">
        <Button>Save preferences</Button>
      </CardFooter>
    </Card>
  )
}

const meta = {
  title: "Composition/Notification Preferences",
  component: NotificationPreferences,
  parameters: { layout: "centered" },
} satisfies Meta<typeof NotificationPreferences>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
