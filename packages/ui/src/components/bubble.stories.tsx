import type { Meta, StoryObj } from "@storybook/react-vite"

import { Bubble, BubbleContent, BubbleGroup } from "@personal-ui/ui/components/bubble"

/** Every semantic variant, plus a long unbroken word that must wrap inside the bounded width. */
function Example() {
  return (
    <BubbleGroup className="w-72">
      {(["default", "secondary", "muted", "outline"] as const).map(variant => (
        <Bubble key={variant} variant={variant}><BubbleContent>{variant} bubble</BubbleContent></Bubble>
      ))}
      <Bubble variant="muted"><BubbleContent>personal-ui-system/packages/ui/src/components/bubble.tsx</BubbleContent></Bubble>
    </BubbleGroup>
  )
}

const meta = { title: "Pilot/Bubble", component: Example, parameters: { layout: "centered" } } satisfies Meta<typeof Example>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
