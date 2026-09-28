import { Line, LineChart, XAxis, YAxis } from "recharts"
import { Bitcoin, TrendingDown, TrendingUp } from "lucide-react"

import { Card, CardContent } from "../components/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../components/chart"
import type { ChartConfig } from "../components/chart"

/**
 * Static historical BTC/USD reference, never fetched at runtime. Source: Coinbase via the Federal Reserve Bank of
 * St. Louis, FRED series CBBTCUSD (https://fred.stlouisfed.org/series/CBBTCUSD), retrieved 2026-09-28 UTC and frozen in
 * docs/evidence/workbench-bitcoin-designsystem-shells/btc-reference-data.md. Each value is the daily observation
 * recorded on the first calendar day of the month (not a month-end close or monthly average), spanning exactly one
 * completed calendar year.
 */
export const BTC_FIRST_OF_MONTH_USD = [
  { date: "2025-01-01", price: 96903.19 },
  { date: "2025-02-01", price: 97676.52 },
  { date: "2025-03-01", price: 94265.48 },
  { date: "2025-04-01", price: 82490.08 },
  { date: "2025-05-01", price: 96929.81 },
  { date: "2025-06-01", price: 105904.94 },
  { date: "2025-07-01", price: 108888.32 },
  { date: "2025-08-01", price: 112542.74 },
  { date: "2025-09-01", price: 111247.94 },
  { date: "2025-10-01", price: 120621.32 },
  { date: "2025-11-01", price: 110536.01 },
  { date: "2025-12-01", price: 86628.25 },
  { date: "2026-01-01", price: 88642.88 },
] as const

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
/** `2025-01-01` -> `Jan 1, 2025`, from the ISO text alone so no time zone can shift the day. */
const day = (iso: string) => {
  const [year, month, date] = iso.split("-").map(Number)
  return `${MONTHS[month! - 1]} ${date}, ${year}`
}
const usd = (value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const points = BTC_FIRST_OF_MONTH_USD.map(point => ({ day: day(point.date), price: point.price }))
const first = BTC_FIRST_OF_MONTH_USD[0]
const last = BTC_FIRST_OF_MONTH_USD[BTC_FIRST_OF_MONTH_USD.length - 1]
/** One-year change from the first to the last observation, as a percentage rounded to two decimals. */
export const BTC_ONE_YEAR_CHANGE = Math.round(((last.price - first.price) / first.price) * 10000) / 100
const low = Math.min(...points.map(point => point.price))
const high = Math.max(...points.map(point => point.price))
const pad = (high - low) * 0.12

const config = { price: { label: "BTC/USD", color: "var(--chart-1)" } } satisfies ChartConfig

/**
 * PUI-108: a static Bitcoin 1Y card after Studio revenue. It leads with a small identifier and a fixed 1Y label, then
 * the last historical price and its one-year change, then one line with restrained dots on the official shadcn
 * Line Chart - Dots pattern (ChartContainer + Recharts). No grid, visible axes, legend, second series or controls: the
 * category and value axes are hidden scales that draw nothing and reserve no space; the existing lightweight tooltip
 * keeps each observation's date. Numbers use the Body role. The figcaption lists every observation for assistive
 * technology, and the source note states that the values are historical.
 */
export function BitcoinPrice() {
  const Trend = BTC_ONE_YEAR_CHANGE >= 0 ? TrendingUp : TrendingDown
  const change = `${BTC_ONE_YEAR_CHANGE >= 0 ? "+" : "−"}${Math.abs(BTC_ONE_YEAR_CHANGE).toFixed(2)}%`
  return (
    <Card>
      <CardContent className="@container grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><Bitcoin className="size-4" /></span>
            <h2 className="truncate text-sm font-medium">Bitcoin <span className="text-muted-foreground">BTC</span></h2>
          </div>
          <span className="shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground" data-testid="btc-range">1Y<span className="sr-only"> range</span></span>
        </div>
        <div className="grid gap-1.5">
          <p className="text-3xl font-semibold tabular-nums @md:text-4xl" data-testid="btc-price">{usd(last.price)}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground tabular-nums" data-testid="btc-change">
              <Trend aria-hidden="true" className={BTC_ONE_YEAR_CHANGE >= 0 ? "size-3 text-chart-2" : "size-3 text-destructive"} />
              {change}<span className="sr-only"> over one year</span>
            </span>
            <span>{day(last.date)}</span>
          </p>
        </div>
        <figure data-testid="btc-chart" className="grid">
          <figcaption className="sr-only">
            Bitcoin price in US dollars on the first day of each month, {day(first.date)} to {day(last.date)}: {points.map(point => `${point.day} ${usd(point.price)}`).join("; ")}.
          </figcaption>
          <ChartContainer config={config} className="aspect-auto h-36 w-full">
            <LineChart accessibilityLayer data={points} margin={{ top: 6, right: 6, bottom: 6, left: 6 }} title="Bitcoin price, one year">
              <XAxis dataKey="day" hide />
              <YAxis hide domain={[low - pad, high + pad]} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator />} />
              <Line dataKey="price" type="natural" stroke="var(--color-price)" strokeWidth={2} dot={{ r: 2.5, fill: "var(--color-price)", strokeWidth: 0 }} activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} />
            </LineChart>
          </ChartContainer>
        </figure>
        <p className="text-xs text-muted-foreground">Historical first-of-month BTC/USD, {day(first.date)} – {day(last.date)}. Source: Coinbase via FRED.</p>
      </CardContent>
    </Card>
  )
}
