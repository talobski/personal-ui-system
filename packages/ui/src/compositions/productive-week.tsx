import { Bar, BarChart, XAxis } from "recharts"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../components/chart"
import type { ChartConfig } from "../components/chart"

const week = [
  { day: "Monday", tasks: 2 },
  { day: "Tuesday", tasks: 4 },
  { day: "Wednesday", tasks: 3 },
  { day: "Thursday", tasks: 6 },
  { day: "Friday", tasks: 5 },
  { day: "Saturday", tasks: 7 },
  { day: "Sunday", tasks: 5 },
].map((entry, i) => ({ ...entry, fill: `var(--chart-${i === 6 ? 2 : 3})` }))

const config = { tasks: { label: "Tasks", color: "var(--chart-3)" } } satisfies ChartConfig

export function ProductiveWeek() {
  return <Card><CardHeader><CardTitle className="text-lg"><h2>A productive week</h2></CardTitle><CardDescription>Your workspace, at a glance.</CardDescription></CardHeader>
    <CardContent><p><strong className="text-4xl font-semibold">32</strong> <span className="text-muted-foreground">tasks completed</span></p><p className="mt-2 text-xs text-muted-foreground">8 more than last week</p>
      <figure className="mt-4" data-testid="productive-week-chart"><figcaption className="sr-only">Tasks completed Monday through Sunday: 2, 4, 3, 6, 5, 7, 5. Total 32.</figcaption>
        <ChartContainer config={config} className="aspect-auto h-28 w-full">
          <BarChart accessibilityLayer data={week} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} title="Tasks completed per day this week">
            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={6} interval={0} tickFormatter={(day: string) => day.slice(0, 1)} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator />} />
            <Bar dataKey="tasks" radius={4} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </figure>
    </CardContent></Card>
}
