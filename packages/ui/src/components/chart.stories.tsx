import type { Meta, StoryObj } from "@storybook/react-vite"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@personal-ui/ui/components/chart"
import type { ChartConfig } from "@personal-ui/ui/components/chart"

const data = [
  { month: "January", focus: 18, meetings: 9 },
  { month: "February", focus: 22, meetings: 7 },
  { month: "March", focus: 16, meetings: 11 },
  { month: "April", focus: 25, meetings: 6 },
]

const config = {
  focus: { label: "Focus hours", color: "var(--chart-1)" },
  meetings: { label: "Meeting hours", color: "var(--chart-2)" },
} satisfies ChartConfig

function Example() {
  return (
    <figure className="w-[min(32rem,calc(100vw-2rem))]">
      <figcaption className="sr-only">Focus and meeting hours, January to April: focus 18, 22, 16, 25; meetings 9, 7, 11, 6.</figcaption>
      <ChartContainer config={config} className="min-h-48 w-full">
        <BarChart accessibilityLayer data={data} title="Focus and meeting hours by month">
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(month: string) => month.slice(0, 3)} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="focus" fill="var(--color-focus)" radius={4} isAnimationActive={false} />
          <Bar dataKey="meetings" fill="var(--color-meetings)" radius={4} isAnimationActive={false} />
        </BarChart>
      </ChartContainer>
    </figure>
  )
}

const meta = {
  title: "Pilot/Chart",
  component: Example,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Example>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
