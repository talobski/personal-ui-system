import { useState } from "react"
import { Line, LineChart, XAxis, YAxis } from "recharts"
import { Bitcoin, TrendingDown, TrendingUp } from "lucide-react"

import { Card, CardContent } from "../components/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../components/chart"
import type { ChartConfig } from "../components/chart"
import { SingleToggleGroup } from "../components/single-toggle-group"

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

/**
 * Illustrative quarter-start BTC/USD levels before the frozen year, used only to shape the 3Y and 5Y lines. They are
 * approximate, rounded to the nearest hundred dollars from general historical knowledge, and were not retrieved from
 * any source during this phase (no network was available or used); they are representative, not reference data, and
 * never a live or current price. From 2025-01-01 on, both longer ranges reuse the frozen first-of-month observations
 * above, so every range ends on the same recorded 2026-01-01 value.
 */
const BTC_ILLUSTRATIVE_QUARTER_START_USD = [
  ["2021-01-01", 29000], ["2021-04-01", 58800], ["2021-07-01", 33500], ["2021-10-01", 48100],
  ["2022-01-01", 46300], ["2022-04-01", 45500], ["2022-07-01", 19300], ["2022-10-01", 19300],
  ["2023-01-01", 16600], ["2023-04-01", 28500], ["2023-07-01", 30600], ["2023-10-01", 27000],
  ["2024-01-01", 42300], ["2024-04-01", 69700], ["2024-07-01", 62700], ["2024-10-01", 63300],
] as const

type Point = { readonly date: string; readonly price: number }

/** Quarter starts from `from` to 2026-01-01: the illustrative levels, then the frozen observations on a quarter start. */
const quarterly = (from: string): readonly Point[] => [
  ...BTC_ILLUSTRATIVE_QUARTER_START_USD.filter(([date]) => date >= from).map(([date, price]) => ({ date, price })),
  ...BTC_FIRST_OF_MONTH_USD.filter(point => ["01", "04", "07", "10"].includes(point.date.slice(5, 7))),
]

export type BitcoinRange = "1Y" | "3Y" | "5Y"

/**
 * PUI-117: the three static ranges, each on one fixed cadence. 1Y is the frozen monthly year, unchanged; 3Y and 5Y are
 * quarterly (13 and 21 points). Nothing is fetched, refreshed or persisted.
 */
export const BTC_RANGES: Record<BitcoinRange, { span: string; cadence: string; points: readonly Point[] }> = {
  "1Y": { span: "one year", cadence: "the first day of each month", points: BTC_FIRST_OF_MONTH_USD },
  "3Y": { span: "three years", cadence: "the first day of each quarter", points: quarterly("2023-01-01") },
  "5Y": { span: "five years", cadence: "the first day of each quarter", points: quarterly("2021-01-01") },
}

/** Change from a range's first to its last point, as a percentage rounded to two decimals. */
export const rangeChange = (points: readonly Point[]) => {
  const first = points[0]!, last = points[points.length - 1]!
  return Math.round(((last.price - first.price) / first.price) * 10000) / 100
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
/** `2025-01-01` -> `Jan 1, 2025`, from the ISO text alone so no time zone can shift the day. */
const day = (iso: string) => {
  const [year, month, date] = iso.split("-").map(Number)
  return `${MONTHS[month! - 1]} ${date}, ${year}`
}
const usd = (value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** One-year change from the first to the last observation, as a percentage rounded to two decimals. */
export const BTC_ONE_YEAR_CHANGE = rangeChange(BTC_FIRST_OF_MONTH_USD)

const RANGE_OPTIONS = (Object.keys(BTC_RANGES) as BitcoinRange[]).map(value => ({ value, label: value }))

const config = { price: { label: "BTC/USD", color: "var(--chart-1)" } } satisfies ChartConfig

/**
 * PUI-108/PUI-117: a static Bitcoin card, placed after the Chat / Recent activity pair. It leads with a small identifier
 * and a card-local 1Y / 3Y / 5Y single-select range control (the accepted ToggleGroup, as in Studio revenue; 1Y by
 * default), then the selected range's last price and its change from the range's first point, then one line with
 * restrained dots on the official shadcn Line Chart - Dots pattern (ChartContainer + Recharts). No grid, visible axes,
 * legend, second series or market controls: the category and value axes are hidden scales that draw nothing and reserve
 * no space; the existing lightweight tooltip keeps each point's date. The chart keeps one fixed footprint for every
 * range. Numbers use the Body role. The figcaption lists every point for assistive technology. Provenance stays in
 * code and phase evidence only; no source caption is rendered.
 */
export function BitcoinPrice() {
  const [range, setRange] = useState<BitcoinRange>("1Y")
  const { span, cadence, points: series } = BTC_RANGES[range]
  const first = series[0]!, last = series[series.length - 1]!
  const points = series.map(point => ({ day: day(point.date), price: point.price }))
  const low = Math.min(...series.map(point => point.price))
  const high = Math.max(...series.map(point => point.price))
  const pad = (high - low) * 0.12
  const percent = rangeChange(series)
  const Trend = percent >= 0 ? TrendingUp : TrendingDown
  const change = `${percent >= 0 ? "+" : "−"}${Math.abs(percent).toFixed(2)}%`
  return (
    <Card>
      <CardContent className="@container grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><Bitcoin className="size-4" /></span>
            <h2 className="truncate text-sm font-medium">Bitcoin <span className="text-muted-foreground">BTC</span></h2>
          </div>
          <div className="flex shrink-0" data-testid="btc-range"><SingleToggleGroup label="Bitcoin range" value={range} onValueChange={setRange} options={RANGE_OPTIONS} /></div>
        </div>
        <div className="grid gap-1.5">
          <p className="text-3xl font-semibold tabular-nums @md:text-4xl" data-testid="btc-price">{usd(last.price)}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground tabular-nums" data-testid="btc-change">
              <Trend aria-hidden="true" className={percent >= 0 ? "size-3 text-chart-2" : "size-3 text-destructive"} />
              {change}<span className="sr-only"> over {span}</span>
            </span>
            <span>{day(last.date)}</span>
          </p>
        </div>
        <figure data-testid="btc-chart" className="grid">
          <figcaption className="sr-only">
            Bitcoin price in US dollars on {cadence}, {day(first.date)} to {day(last.date)}: {points.map(point => `${point.day} ${usd(point.price)}`).join("; ")}.
          </figcaption>
          <ChartContainer config={config} className="aspect-auto h-36 w-full">
            <LineChart accessibilityLayer data={points} margin={{ top: 6, right: 6, bottom: 6, left: 6 }} title={`Bitcoin price, ${span}`}>
              <XAxis dataKey="day" hide />
              <YAxis hide domain={[low - pad, high + pad]} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator />} />
              <Line dataKey="price" type="natural" stroke="var(--color-price)" strokeWidth={2} dot={{ r: 2.5, fill: "var(--color-price)", strokeWidth: 0 }} activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} />
            </LineChart>
          </ChartContainer>
        </figure>
      </CardContent>
    </Card>
  )
}
