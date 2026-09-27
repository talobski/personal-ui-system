import { Bar, BarChart, XAxis } from "recharts"
import { TrendingUp } from "lucide-react"

import { Card, CardContent } from "../components/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../components/chart"
import type { ChartConfig } from "../components/chart"

/** Fictional daily step counts; the busiest day carries the accent chart token. */
const STEPS = [
  { day: "Monday", steps: 7820 },
  { day: "Tuesday", steps: 9140 },
  { day: "Wednesday", steps: 8310 },
  { day: "Thursday", steps: 10260 },
  { day: "Friday", steps: 9480 },
  { day: "Saturday", steps: 6150 },
  { day: "Sunday", steps: 7340 },
]
const PREVIOUS_AVERAGE = 7436
const busiest = Math.max(...STEPS.map(entry => entry.steps))
const week = STEPS.map(entry => ({ ...entry, fill: `var(--chart-${entry.steps === busiest ? 2 : 3})` }))
const average = Math.round(STEPS.reduce((sum, entry) => sum + entry.steps, 0) / STEPS.length)
const change = Math.round(((average - PREVIOUS_AVERAGE) / PREVIOUS_AVERAGE) * 1000) / 10
const count = (value: number) => value.toLocaleString("en-US")

const config = { steps: { label: "Steps", color: "var(--chart-3)" } } satisfies ChartConfig

/**
 * PUI-89: the former productivity card as a weekly steps summary. No visible title leads the metric; the heading
 * remains for assistive technology. The average uses the Heading role, and the seven bars read as daily steps.
 */
export function ProductiveWeek() {
  return <Card><CardContent className="grid gap-4">
    <h2 className="sr-only">Weekly steps</h2>
    <div className="grid gap-1.5">
      <p className="grid gap-1">
        <span className="type-heading text-4xl tabular-nums">{count(average)}</span>
        <span className="text-sm text-muted-foreground">Average steps this week</span>
      </p>
      <p className="inline-flex w-fit items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground tabular-nums">
        <TrendingUp aria-hidden="true" className="size-3 text-chart-2" />+{change}% vs last week
      </p>
    </div>
    <figure data-testid="productive-week-chart"><figcaption className="sr-only">Daily steps Monday through Sunday: {STEPS.map(entry => count(entry.steps)).join(", ")}. Average {count(average)}.</figcaption>
      <ChartContainer config={config} className="aspect-auto h-28 w-full">
        <BarChart accessibilityLayer data={week} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} title="Steps per day this week">
          <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={6} interval={0} tickFormatter={(day: string) => day.slice(0, 1)} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator />} />
          <Bar dataKey="steps" radius={4} isAnimationActive={false} />
        </BarChart>
      </ChartContainer>
    </figure>
  </CardContent></Card>
}
