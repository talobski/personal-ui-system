import { Button } from "../components/button"
import { useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@personal-ui/ui/components/card"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "@personal-ui/ui/components/field"
import { Input } from "@personal-ui/ui/components/input"
import { NativeSelect, NativeSelectOption } from "@personal-ui/ui/components/native-select"
import { SingleToggleGroup } from "@personal-ui/ui/components/single-toggle-group"
import { Switch } from "@personal-ui/ui/components/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@personal-ui/ui/components/tabs"

const DENSITY_OPTIONS = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
] as const

function GeneralPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle><span className="type-heading">General</span></CardTitle>
        <CardDescription>Workspace identity and defaults.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="workspace-name">Workspace name</FieldLabel>
            <FieldContent>
              <Input id="workspace-name" defaultValue="UI Theme Workbench" />
            </FieldContent>
          </Field>
          <Field orientation="responsive">
            <FieldLabel htmlFor="workspace-timezone">Timezone</FieldLabel>
            <FieldContent>
              <NativeSelect id="workspace-timezone" defaultValue="utc">
                <NativeSelectOption value="utc">UTC</NativeSelectOption>
                <NativeSelectOption value="pst">Pacific Time</NativeSelectOption>
              </NativeSelect>
            </FieldContent>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

function NotificationsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle><span className="type-heading">Notifications</span></CardTitle>
        <CardDescription>Workspace-wide alert defaults.</CardDescription>
      </CardHeader>
      <CardContent>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Weekly digest</FieldTitle>
            <FieldDescription>Send a weekly activity summary to admins.</FieldDescription>
          </FieldContent>
          <Switch id="workspace-digest" aria-label="Weekly digest" defaultChecked />
        </Field>
      </CardContent>
    </Card>
  )
}

function AppearancePanel() {
  const [density, setDensity] = useState<(typeof DENSITY_OPTIONS)[number]["value"]>("comfortable")
  return (
    <Card>
      <CardHeader>
        <CardTitle><span className="type-heading">Appearance</span></CardTitle>
        <CardDescription>Layout density for this workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <SingleToggleGroup label="Density" value={density} onValueChange={setDensity} options={DENSITY_OPTIONS} />
      </CardContent>
    </Card>
  )
}

export function WorkspaceSettings({ compact = false }: { compact?: boolean }) {
  const [draft, setDraft] = useState({ name: "Studio North", view: "board" })
  const [saved, setSaved] = useState<typeof draft | null>(null)
  if (compact) return (
    <form onSubmit={e => { e.preventDefault(); setSaved({ ...draft }) }}>
      <Card className="[&_[data-slot=native-select-wrapper]]:w-full">
        <CardHeader><CardTitle className="text-lg"><h2 className="type-heading">Workspace settings</h2></CardTitle><CardDescription>A space for focused work.</CardDescription></CardHeader>
        <CardContent className="grid gap-4" onChange={() => setSaved(null)}>
          <Field>
            <FieldLabel htmlFor="quiet-workspace-name">Workspace name</FieldLabel>
            <Input id="quiet-workspace-name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} required />
          </Field>
          <Field>
            <FieldLabel htmlFor="quiet-workspace-view">Default view</FieldLabel>
            <NativeSelect id="quiet-workspace-view" value={draft.view} onChange={e => setDraft({ ...draft, view: e.target.value })}>
              <NativeSelectOption value="board">Board</NativeSelectOption><NativeSelectOption value="list">List</NativeSelectOption>
            </NativeSelect>
          </Field>
          <p className="text-xs text-muted-foreground">A shared place for your next idea.</p>
          <Button type="submit">Save workspace</Button>
          {saved && <p role="status" className="text-sm">{saved.name} saved in this preview only. Default view: {saved.view}.</p>}
        </CardContent>
      </Card>
    </form>
  )
  return (
    <Tabs defaultValue="general" className="w-full max-w-md">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
      </TabsList>
      <TabsContent value="general">
        <GeneralPanel />
      </TabsContent>
      <TabsContent value="notifications">
        <NotificationsPanel />
      </TabsContent>
      <TabsContent value="appearance">
        <AppearancePanel />
      </TabsContent>
    </Tabs>
  )
}
