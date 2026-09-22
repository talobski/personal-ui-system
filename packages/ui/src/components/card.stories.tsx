import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@personal-ui/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@personal-ui/ui/components/card"

function Example() {
  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update your public profile.</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm">
            Reset
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Card content sits here, flush with the header and footer padding.</p>
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t">
        <Button variant="outline">Cancel</Button>
        <Button>Save changes</Button>
      </CardFooter>
    </Card>
  )
}

const meta = {
  title: "Pilot/Card",
  component: Example,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Example>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
