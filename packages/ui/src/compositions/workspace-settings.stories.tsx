import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

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
        <CardTitle>General</CardTitle>
        <CardDescription>Workspace identity and defaults.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="workspace-name">Workspace name</FieldLabel>
            <FieldContent>
              <Input id="workspace-name" defaultValue="Personal UI System" />
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
        <CardTitle>Notifications</CardTitle>
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
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Layout density for this workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <SingleToggleGroup label="Density" value={density} onValueChange={setDensity} options={DENSITY_OPTIONS} />
      </CardContent>
    </Card>
  )
}

function WorkspaceSettings() {
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

const meta = {
  title: "Composition/Workspace Settings",
  component: WorkspaceSettings,
  parameters: { layout: "centered" },
} satisfies Meta<typeof WorkspaceSettings>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
