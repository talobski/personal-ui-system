import { useState } from "react"

import { Button } from "@personal-ui/ui/components/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@personal-ui/ui/components/card"
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@personal-ui/ui/components/field"
import { Input } from "@personal-ui/ui/components/input"
import { NativeSelect, NativeSelectOption } from "@personal-ui/ui/components/native-select"
import { Textarea } from "@personal-ui/ui/components/textarea"

export function AccountProfile({ invalidEmail = false, compact = false }: { invalidEmail?: boolean; compact?: boolean }) {
  const [saved, setSaved] = useState(false)
  const [emailInvalid, setEmailInvalid] = useState(invalidEmail)
  const emailErrorId = "profile-email-error"
  return (
    <form onSubmit={e => { e.preventDefault(); setSaved(true) }}>
    <Card className={compact ? "w-full [&_[data-slot=native-select-wrapper]]:w-full" : "w-full max-w-md"}>
      <CardHeader>
        <CardTitle className={compact ? "text-lg" : undefined}><h2>Account profile</h2></CardTitle>
        <CardDescription>A familiar face for your workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className={compact ? "gap-4" : undefined} onChange={() => setSaved(false)}>
          {compact && <p className="text-sm"><span aria-hidden="true" className="mr-3 rounded-full bg-secondary p-3">AL</span>Ada Lovelace</p>}
          <Field>
            <FieldLabel htmlFor="profile-name">Display name</FieldLabel>
            <FieldContent>
              <Input id="profile-name" autoComplete="name" defaultValue="Ada Lovelace" required />
            </FieldContent>
          </Field>
          <Field data-invalid={emailInvalid}>
            <FieldLabel htmlFor="profile-email">Email</FieldLabel>
            <FieldContent>
              <Input
                id="profile-email"
                type="email"
                autoComplete="email"
                required
                onInvalid={() => setEmailInvalid(true)}
                onChange={e => setEmailInvalid(!e.target.validity.valid)}
                aria-invalid={emailInvalid || undefined}
                aria-describedby={emailInvalid ? emailErrorId : undefined}
                defaultValue={invalidEmail ? "not-an-email" : "ada@example.com"}
              />
              {emailInvalid ? <FieldError id={emailErrorId}>Enter a valid email address.</FieldError> : null}
            </FieldContent>
          </Field>
          {!compact && <><Field orientation="responsive">
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
        </>}
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t">
        {!compact && <Button type="reset" variant="outline" onClick={() => setSaved(false)}>Cancel</Button>}
        <Button type="submit" className={compact ? "w-full" : undefined}>{compact ? "Save profile" : "Save changes"}</Button>
      </CardFooter>
      {saved && <p role="status" className="px-6 text-sm">Profile saved in this preview only.</p>}
    </Card>
    </form>
  )
}
