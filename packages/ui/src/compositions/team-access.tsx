import { useId, useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/card"
import { Button } from "../components/button"
import { Field, FieldLabel } from "../components/field"
import { NativeSelect, NativeSelectOption } from "../components/native-select"
import { ResponsiveDialog, ResponsiveDialogTrigger, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogClose } from "../components/responsive-dialog"

export function TeamAccess() {
  const id = useId()
  const [role, setRole] = useState("Editor")
  const [draft, setDraft] = useState(role)
  return <Card><CardHeader><CardTitle className="text-lg"><h2>Team access</h2></CardTitle><CardDescription>The right people, the right access.</CardDescription></CardHeader>
    <CardContent><ul className="grid gap-4">{[["AL", "Ada Lovelace", "Owner"], ["GH", "Grace Hopper", role]].map(([initials, name, access]) => <li key={name} className="flex items-center gap-3 text-sm"><span aria-hidden="true" className="rounded-full bg-secondary p-2 text-xs">{initials}</span><span className="flex-1">{name}</span><span className="text-xs text-muted-foreground">{access}</span></li>)}</ul></CardContent>
    <CardFooter><ResponsiveDialog><ResponsiveDialogTrigger asChild><Button className="w-full" variant="outline" onClick={() => setDraft(role)}>Manage access</Button></ResponsiveDialogTrigger>
      <ResponsiveDialogContent><ResponsiveDialogHeader><ResponsiveDialogTitle>Manage team access</ResponsiveDialogTitle><ResponsiveDialogDescription>Fictional workspace preview. Changes stay in this example.</ResponsiveDialogDescription></ResponsiveDialogHeader>
        <Field className="px-4 sm:px-0"><FieldLabel htmlFor={id}>Grace Hopper’s role</FieldLabel><NativeSelect id={id} value={draft} onChange={e => setDraft(e.target.value)}><NativeSelectOption>Editor</NativeSelectOption><NativeSelectOption>Viewer</NativeSelectOption></NativeSelect></Field>
        <ResponsiveDialogFooter><ResponsiveDialogClose asChild><Button onClick={() => setRole(draft)}>Save access</Button></ResponsiveDialogClose><ResponsiveDialogClose asChild><Button variant="outline">Cancel</Button></ResponsiveDialogClose></ResponsiveDialogFooter>
      </ResponsiveDialogContent></ResponsiveDialog></CardFooter></Card>
}
