import { useState } from "react"

import { Button } from "@personal-ui/ui/components/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@personal-ui/ui/components/card"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from "@personal-ui/ui/components/field"
import { Switch } from "@personal-ui/ui/components/switch"

function NotificationRow({ id, title, description, checked, onCheckedChange, disabled = false }: { id: string; title: string; description: string; checked: boolean; onCheckedChange?: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor={id}>{title}</FieldLabel>
        <FieldDescription id={`${id}-description`}>{description}</FieldDescription>
      </FieldContent>
      <Switch id={id} aria-label={title} aria-describedby={`${id}-description`} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </Field>
  )
}

export function NotificationPreferences({ compact = false }: { compact?: boolean }) {
  const [saved, setSaved] = useState(false)
  const [draft, setDraft] = useState({ email: true, push: false })
  const [committed, setCommitted] = useState(draft)
  const change = (key: "email" | "push", value: boolean) => { setDraft(previous => ({ ...previous, [key]: value })); setSaved(false) }
  return (
    <Card className={compact ? "w-full [&_[data-slot=native-select-wrapper]]:w-full" : "w-full max-w-md"}>
      <CardHeader>
        <CardTitle className={compact ? "text-lg" : undefined}><h2>{compact ? "Notifications" : "Notification preferences"}</h2></CardTitle>
        <CardDescription>Choose which updates reach you and how.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className={compact ? "gap-4" : undefined} onChange={() => setSaved(false)}>
          <NotificationRow id="notif-email" title={compact ? "Weekly digest" : "Email notifications"} description={compact ? "A thoughtful summary." : "Get an email for account activity."} checked={draft.email} onCheckedChange={value => change("email", value)} />
          {!compact && <FieldSeparator />}
          <NotificationRow id="notif-push" title={compact ? "Product updates" : "Push notifications"} description={compact ? "News from the team." : "Get a push alert on this device."} checked={draft.push} onCheckedChange={value => change("push", value)} />
          {!compact && <><FieldSeparator />
          <NotificationRow id="notif-sms" title="SMS alerts" description="Reserved for critical security events." checked={false} disabled /></>}
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end border-t">
        <Button className={compact ? "w-full" : undefined} onClick={() => { setCommitted({ ...draft }); setSaved(true) }}>Save preferences</Button>
      </CardFooter>
      {saved && <p role="status" className="px-6 text-sm">Preferences saved in this preview only. {committed.email ? "Digest on." : "Digest off."} {committed.push ? "Updates on." : "Updates off."}</p>}
    </Card>
  )
}
