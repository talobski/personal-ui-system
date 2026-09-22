import type { Meta, StoryObj } from "@storybook/react-vite"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@personal-ui/ui/components/tabs"

function Example({ disabledBilling = false }: { disabledBilling?: boolean }) {
  return (
    <Tabs defaultValue="profile" className="w-80">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="billing" disabled={disabledBilling}>
          Billing
        </TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">Profile settings panel.</TabsContent>
      <TabsContent value="billing">Billing settings panel.</TabsContent>
      <TabsContent value="security">Security settings panel.</TabsContent>
    </Tabs>
  )
}

const meta = {
  title: "Pilot/Tabs",
  component: Example,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Example>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const DisabledTab: Story = { args: { disabledBilling: true } }
