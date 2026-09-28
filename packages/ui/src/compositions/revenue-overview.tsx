import { useState } from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { TrendingDown, TrendingUp } from "lucide-react"

import { Card, CardContent } from "../components/card"
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
const SERIES: Record<Range, { label: string; points: { period: string; revenue: number }[]; previous: number; margin: [number, number]; invoices: [number, number] }> = {
  week: {
    label: "this week",
    points: [["Mon", 6.2], ["Tue", 8.4], ["Wed", 7.1], ["Thu", 11.6], ["Fri", 9.8], ["Sat", 3.1], ["Sun", 2.0]].map(([period, revenue]) => ({ period: period as string, revenue: revenue as number })),
    previous: 42.9,
    margin: [58, 55],
    invoices: [14, 11],
  },
  month: {
    label: "this month",
    points: [["W1", 38.2], ["W2", 44.9], ["W3", 41.3], ["W4", 52.6]].map(([period, revenue]) => ({ period: period as string, revenue: revenue as number })),
    previous: 171.4,
    margin: [56, 57],
    invoices: [61, 54],
  },
  quarter: {
    label: "this quarter",
    points: [["Jul", 162.0], ["Aug", 171.4], ["Sep", 177.0]].map(([period, revenue]) => ({ period: period as string, revenue: revenue as number })),
    previous: 468.2,
    margin: [56, 53],
    invoices: [176, 162],
  },
}

const config = {
  revenue: { label: "Revenue", color: "var(--chart-2)" },
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

/**
 * PUI-85: no visible header, so the range tabs lead; the heading remains for assistive technology. The three metrics
 * share one row with semantic dividers instead of nested tiles, and each keeps a fixed label/value/badge structure so
 * switching range never re-wraps the row. The chart shows the primary Revenue series only.
 * PUI-87: the category axis stays as a hidden scale (so tooltips keep their period labels) but draws no tick row and
 * reserves no space; the figcaption still lists every period for assistive technology.
 * PUI-107: the card has no uniform outer padding. The tabs and metrics sit in their own padded wrapper, and the chart
 * follows outside it with no side or bottom inset, reaching the card's left, right and bottom inner edges; the card
 * clips it to its radius.
 */
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
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent className="@container grid gap-5 pt-6 pb-5">
        <h2 className="sr-only">Studio revenue</h2>
        <div className="flex"><SingleToggleGroup label="Revenue range" value={range} onValueChange={setRange} options={RANGE_OPTIONS} /></div>
        <dl className="grid grid-cols-3 divide-x divide-border">
          {stats.map(stat => (
            <div key={stat.label} className="grid min-w-0 content-start gap-1.5 px-3 first:pl-0 last:pr-0 @md:px-5">
              <dt className="truncate text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="grid justify-items-start gap-1.5">
                <span className="type-heading text-xl tabular-nums @md:text-2xl">{stat.value}</span>
                {stat.delta}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
      <figure data-testid="revenue-chart" className="grid">
        <figcaption className="sr-only">
          Revenue {data.label}: {data.points.map(point => `${point.period} ${money(point.revenue)}`).join("; ")}.
        </figcaption>
        <ChartContainer config={config} className="aspect-auto h-40 w-full">
          <AreaChart accessibilityLayer data={data.points} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} title={`Revenue ${data.label}`}>
            <defs>
              <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="period" hide />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <Area dataKey="revenue" type="monotone" stroke="var(--color-revenue)" strokeWidth={2} fill="url(#revenue-fill)" isAnimationActive={false} />
          </AreaChart>
        </ChartContainer>
      </figure>
    </Card>
  )
}
