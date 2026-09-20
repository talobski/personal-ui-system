import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@personal-ui/ui/components/button"
import { Input } from "@personal-ui/ui/components/input"
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@personal-ui/ui/components/responsive-dialog"

function Example() {
  return (
    <ResponsiveDialog>
      <ResponsiveDialogTrigger asChild>
        <Button variant="outline">Edit profile</Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Edit profile</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>Change how your name appears to others.</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="grid gap-2 px-4 sm:px-0">
          <label htmlFor="display-name" className="text-sm font-medium">
            Display name
          </label>
          <Input id="display-name" defaultValue="Ada Lovelace" autoComplete="name" />
        </div>
        <ResponsiveDialogFooter>
          <Button>Save changes</Button>
          <ResponsiveDialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </ResponsiveDialogClose>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

const meta = {
  title: "Pilot/Responsive Dialog",
  component: Example,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Example>

export default meta
type Story = StoryObj<typeof meta>

/** Dialog above 640px, Drawer at 640px and below. */
export const Default: Story = {}
