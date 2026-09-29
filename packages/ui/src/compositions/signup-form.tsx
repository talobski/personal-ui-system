import { useId, useState } from "react"

import { Button } from "../components/button"
import { Card, CardContent } from "../components/card"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from "../components/field"
import { Input } from "../components/input"

/** Monochrome provider marks drawn in the current text colour, as in the official block. */
const PROVIDERS = [
  { name: "GitHub", path: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" },
  { name: "Google", path: "M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" },
] as const

/**
 * PUI-91: the form portion of the official shadcn signup block, adapted to one gallery card: no page wrapper, media
 * panel, or real authentication. Submitting only announces a preview notice in an always-present sr-only status, so
 * the card never grows; there is no validation region.
 */
export function SignupForm() {
  const id = useId()
  const [submitted, setSubmitted] = useState(false)
  return (
    <Card>
      <CardContent>
        <form noValidate onSubmit={event => { event.preventDefault(); setSubmitted(true) }}>
          <FieldGroup className="gap-5">
            <div className="grid gap-1 text-center">
              <h2 className="type-heading text-xl">Create your account</h2>
              <p className="text-sm text-balance text-muted-foreground">Fill in the form below to create your account</p>
            </div>
            <Field>
              <FieldLabel htmlFor={`${id}-email`}>Email</FieldLabel>
              <Input id={`${id}-email`} type="email" autoComplete="email" placeholder="m@example.com" />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-password`}>Password</FieldLabel>
              <Input id={`${id}-password`} type="password" autoComplete="new-password" aria-describedby={`${id}-password-help`} />
              <FieldDescription id={`${id}-password-help`}>Must be at least 8 characters long.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-confirm`}>Confirm Password</FieldLabel>
              <Input id={`${id}-confirm`} type="password" autoComplete="new-password" />
            </Field>
            <Field>
              <Button type="submit" className="cursor-pointer">Create Account</Button>
            </Field>
            <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">Or continue with</FieldSeparator>
            <div className="grid grid-cols-2 gap-3">
              {PROVIDERS.map(provider => (
                <Button key={provider.name} variant="secondary" type="button" className="cursor-pointer">
                  <svg aria-hidden="true" viewBox="0 0 24 24"><path d={provider.path} fill="currentColor" /></svg>
                  {provider.name}
                </Button>
              ))}
            </div>
            <FieldDescription className="text-center">Already have an account? <a href="#sign-in" onClick={event => event.preventDefault()}>Sign in</a></FieldDescription>
          </FieldGroup>
          <p role="status" className="sr-only">{submitted ? "Preview only. No account was created." : ""}</p>
        </form>
      </CardContent>
    </Card>
  )
}
