import type { Meta, StoryObj } from "@storybook/react-vite"
import { ScrollArea } from "./scroll-area"

function Example({ orientation = "vertical" }: { orientation?: "vertical" | "horizontal" | "both" }) {
  return (
    <ScrollArea orientation={orientation} className="h-64 w-72 rounded-md border" viewportProps={{ role: "region", "aria-label": "Activity", tabIndex: 0 }}>
      <div className={orientation === "vertical" ? "grid gap-3 p-4" : "grid w-[40rem] gap-3 p-4"}>
        {Array.from({ length: 24 }, (_, i) => <a key={i} href={`#activity-${i}`} className="rounded-sm text-sm underline focus-visible:ring-2 focus-visible:ring-ring">Activity {i + 1}</a>)}
      </div>
    </ScrollArea>
  )
}
const meta = { title: "Pilot/Scroll Area", component: Example, parameters: { layout: "centered" } } satisfies Meta<typeof Example>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Horizontal: Story = { args: { orientation: "horizontal" } }
export const Both: Story = { args: { orientation: "both" } }
