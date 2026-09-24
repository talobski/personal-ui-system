import type { Meta, StoryObj } from "@storybook/react-vite"
import { ChevronDownIcon } from "lucide-react"

import { Button } from "@personal-ui/ui/components/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@personal-ui/ui/components/collapsible"
import { Input } from "@personal-ui/ui/components/input"

function Example({ open = false, disabled = false }: { open?: boolean; disabled?: boolean }) {
  return (
    <Collapsible defaultOpen={open} disabled={disabled} className="grid w-80 gap-2">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="justify-between [&[data-state=open]>svg]:rotate-180">
          Shadow
          <ChevronDownIcon aria-hidden="true" className="transition-transform" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-2 px-3 text-sm">
        <label className="grid gap-1" htmlFor="shadow-blur">
          Blur
          <Input id="shadow-blur" defaultValue="3" inputMode="decimal" />
        </label>
      </CollapsibleContent>
    </Collapsible>
  )
}

const meta = {
  title: "Pilot/Collapsible",
  component: Example,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Example>

export default meta
type Story = StoryObj<typeof meta>

export const Closed: Story = {}
export const Open: Story = { args: { open: true } }
export const Disabled: Story = { args: { disabled: true } }
