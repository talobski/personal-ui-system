import { useState } from "react"

import { Button } from "@personal-ui/ui/components/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@personal-ui/ui/components/card"
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@personal-ui/ui/components/field"
import { Input } from "@personal-ui/ui/components/input"
import { NativeSelect, NativeSelectOption } from "@personal-ui/ui/components/native-select"
import { Textarea } from "@personal-ui/ui/components/textarea"

export function SupportRequest({ invalidMessage = false, compact = false }: { invalidMessage?: boolean; compact?: boolean }) {
  const [message, setMessage] = useState(invalidMessage ? "" : compact ? "I would like to learn more about the workspace." : "I was charged twice for last month's invoice.")
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(invalidMessage)
  const messageErrorId = "support-message-error"
  return (
    <Card className={compact ? "w-full [&_[data-slot=native-select-wrapper]]:w-full" : "w-full max-w-md"}>
      <CardHeader>
        <CardTitle className={compact ? "text-lg" : undefined}><h2>{compact ? "How can we help?" : "Contact support"}</h2></CardTitle>
        <CardDescription>Local preview only; no message will be sent.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className={compact ? "gap-4" : undefined}>
          {!compact && <Field>
            <FieldLabel htmlFor="support-subject">Subject</FieldLabel>
            <FieldContent>
              <Input id="support-subject" defaultValue="Billing question" />
            </FieldContent>
          </Field>}
          <Field orientation="responsive">
            <FieldLabel htmlFor="support-topic">Topic</FieldLabel>
            <FieldContent>
              {!compact && <FieldDescription>Helps us route your request.</FieldDescription>}
              <NativeSelect id="support-topic" defaultValue={compact ? "workspace" : "billing"}>
                {compact && <NativeSelectOption value="workspace">Using the workspace</NativeSelectOption>}
                <NativeSelectOption value="billing">Billing</NativeSelectOption>
                <NativeSelectOption value="technical">Technical issue</NativeSelectOption>
                <NativeSelectOption value="other">Other</NativeSelectOption>
              </NativeSelect>
            </FieldContent>
          </Field>
          <Field data-invalid={error}>
            <FieldLabel htmlFor="support-message">Message</FieldLabel>
            <FieldContent>
              <Textarea
                id="support-message"
                aria-invalid={error || undefined}
                aria-describedby={error ? messageErrorId : undefined}
                value={message}
                onChange={e => { setMessage(e.target.value); setSubmitted(false); setError(false) }}
              />
              {error ? <FieldError id={messageErrorId}>Enter a message.</FieldError> : null}
            </FieldContent>
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t">
        {!compact && <Button variant="outline" onClick={() => setSubmitted(true)}>Save draft</Button>}
        <Button className={compact ? "w-full" : undefined} onClick={() => { setError(!message.trim()); setSubmitted(Boolean(message.trim())) }}>{compact ? "Send message" : "Send request"}</Button>
      </CardFooter>
      {submitted && <p role="status" className="px-6 text-sm">Preview saved locally in this example. Nothing was sent.</p>}
    </Card>
  )
}

