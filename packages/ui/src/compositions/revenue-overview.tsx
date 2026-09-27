import { useState } from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { TrendingDown, TrendingUp } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../components/chart"
import type { ChartConfig } from "../components/chart"
import { SingleToggleGroup } from "../components/single-toggle-group"

type Range = "week" | "month" | "quarter"

const RANGE_OPTIONS = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
] as const

/** Fictional studio figures in thousands; every range carries its own comparison so the deltas stay honest. */
const SERIES: Record<Range, { label: string; points: { period: string; revenue: number; costs: number }[]; previous: number; margin: [number, number]; invoices: [number, number] }> = {
  week: {
    label: "this week",
    points: [["Mon", 6.2, 3.1], ["Tue", 8.4, 3.4], ["Wed", 7.1, 3.2], ["Thu", 11.6, 4.0], ["Fri", 9.8, 3.8], ["Sat", 3.1, 1.2], ["Sun", 2.0, 0.9]].map(([period, revenue, costs]) => ({ period: period as string, revenue: revenue as number, costs: costs as number })),
    previous: 42.9,
    margin: [58, 55],
    invoices: [14, 11],
  },
  month: {
    label: "this month",
    points: [["W1", 38.2, 17.0], ["W2", 44.9, 18.6], ["W3", 41.3, 19.9], ["W4", 52.6, 21.4]].map(([period, revenue, costs]) => ({ period: period as string, revenue: revenue as number, costs: costs as number })),
    previous: 171.4,
    margin: [56, 57],
    invoices: [61, 54],
  },
  quarter: {
    label: "this quarter",
    points: [["Jul", 162.0, 74.5], ["Aug", 171.4, 76.0], ["Sep", 177.0, 76.9]].map(([period, revenue, costs]) => ({ period: period as string, revenue: revenue as number, costs: costs as number })),
    previous: 468.2,
    margin: [56, 53],
    invoices: [176, 162],
  },
}

const config = {
  revenue: { label: "Revenue", color: "var(--chart-2)" },
  costs: { label: "Costs", color: "var(--chart-4)" },
} satisfies ChartConfig

const money = (thousands: number) => `$${thousands >= 100 ? Math.round(thousands) : thousands.toFixed(1)}k`

function Delta({ value, unit, label }: { value: number; unit: string; label: string }) {
  const Icon = value >= 0 ? TrendingUp : TrendingDown
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground tabular-nums">
      <Icon aria-hidden="true" className={value >= 0 ? "size-3 text-chart-2" : "size-3 text-destructive"} />
      {value >= 0 ? "+" : "−"}{Math.abs(value)}{unit}<span className="sr-only"> {label}</span>
    </span>
  )
}

export function RevenueOverview() {
  const [range, setRange] = useState<Range>("month")
  const data = SERIES[range]
  const revenue = data.points.reduce((sum, point) => sum + point.revenue, 0)
  const growth = Math.round(((revenue - data.previous) / data.previous) * 1000) / 10
  const stats = [
    { label: "Revenue", value: money(revenue), delta: <Delta value={growth} unit="%" label="versus the previous period" /> },
    { label: "Margin", value: `${data.margin[0]}%`, delta: <Delta value={data.margin[0] - data.margin[1]} unit=" pts" label="versus the previous period" /> },
    { label: "Invoices paid", value: String(data.invoices[0]), delta: <Delta value={data.invoices[0] - data.invoices[1]} unit="" label="versus the previous period" /> },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg"><h2 className="type-heading">Studio revenue</h2></CardTitle>
        <CardDescription>Income against costs, {data.label}.</CardDescription>
      </CardHeader>
      <CardContent className="@container grid gap-5">
        <div className="flex"><SingleToggleGroup label="Revenue range" value={range} onValueChange={setRange} options={RANGE_OPTIONS} /></div>
        <dl className="grid grid-cols-1 gap-3 @sm:grid-cols-3">
          {stats.map(stat => (
            <div key={stat.label} className="grid gap-1.5 rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="type-heading text-2xl tabular-nums">{stat.value}</span>
                {stat.delta}
              </dd>
            </div>
          ))}
        </dl>
        <figure data-testid="revenue-chart" className="grid gap-2">
          <figcaption className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-chart-2" />Revenue</span>
            <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-0.5 w-3 rounded-full bg-chart-4" />Costs</span>
            <span className="sr-only">
              {data.points.map(point => `${point.period}: revenue ${money(point.revenue)}, costs ${money(point.costs)}`).join("; ")}.
            </span>
          </figcaption>
          <ChartContainer config={config} className="aspect-auto h-40 w-full">
            <AreaChart accessibilityLayer data={data.points} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} title={`Revenue and costs ${data.label}`}>
              <defs>
                <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} interval={0} padding={{ left: 12, right: 12 }} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
              <Area dataKey="revenue" type="monotone" stroke="var(--color-revenue)" strokeWidth={2} fill="url(#revenue-fill)" isAnimationActive={false} />
              <Area dataKey="costs" type="monotone" stroke="var(--color-costs)" strokeWidth={2} strokeDasharray="4 4" fill="transparent" isAnimationActive={false} />
            </AreaChart>
          </ChartContainer>
        </figure>
      </CardContent>
    </Card>
  )
}
