import { Cloud, CloudDrizzle, CloudRain, CloudSun, Sun } from "lucide-react"

import { Card, CardContent } from "../components/card"

/** Fixed illustrative conditions: no location, network, or clock is read, and nothing here claims to be live. */
const NOW = { place: "Lisbon", condition: "Partly cloudy", icon: CloudSun, temperature: 21, high: 24, low: 16 } as const
const DAYS = [
  { day: "Wed", label: "Sunny", icon: Sun, high: 25 },
  { day: "Thu", label: "Partly cloudy", icon: CloudSun, high: 23 },
  { day: "Fri", label: "Light rain", icon: CloudDrizzle, high: 19 },
  { day: "Sat", label: "Rain", icon: CloudRain, high: 18 },
  { day: "Sun", label: "Cloudy", icon: Cloud, high: 20 },
] as const

/**
 * PUI-92/100: a two-zone weather card from deterministic sample data. The top zone is one horizontal summary: the
 * condition icon, a large temperature, stacked high/low, and the place and condition right-aligned. The bottom zone is
 * an evenly distributed five-day row of day, icon and high only (PUI-112 removes the forecast lows). It is
 * presentational: no interaction.
 * PUI-105: the whole card uses the Body family and ends where its content ends: its local pair no longer stretches it.
 * PUI-112: the temperature and place keep their size for hierarchy but set no weight of their own, so both follow the
 * live Body weight.
 */
export function LocalWeather() {
  return (
    <Card>
      <CardContent className="grid gap-6">
        <div className="flex min-w-0 items-center gap-3">
          <NOW.icon aria-hidden="true" strokeWidth={1.5} className="size-10 shrink-0 text-chart-4" />
          <p className="shrink-0 text-5xl tabular-nums"><span className="sr-only">Now </span>{NOW.temperature}°</p>
          <p className="grid shrink-0 text-xs text-muted-foreground tabular-nums">
            <span>H {NOW.high}°</span>
            <span>L {NOW.low}°</span>
          </p>
          <div className="ml-auto grid min-w-0 justify-items-end text-right">
            <h2 className="max-w-full truncate text-base">{NOW.place}</h2>
            <p className="max-w-full truncate text-sm text-muted-foreground">{NOW.condition}</p>
          </div>
        </div>
        <ol aria-label="Five-day forecast" className="grid grid-cols-5 gap-1">
          {DAYS.map(day => (
            <li key={day.day} className="grid min-w-0 justify-items-center gap-1.5 text-center">
              <span className="text-xs font-medium text-muted-foreground uppercase">{day.day}</span>
              <day.icon aria-hidden="true" className="size-5 text-foreground" />
              <span className="sr-only">{day.label}, high</span>
              <span className="text-sm font-medium tabular-nums">{day.high}°</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
