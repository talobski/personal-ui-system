import { Cloud, CloudRain, CloudSun, Droplets, MapPin, Sun, Sunset, Wind } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/card"

/** Fixed illustrative conditions. No location, network, or clock is read; the card says so. */
const HOURS = [
  { time: "Now", icon: CloudSun, temperature: 21, label: "Partly cloudy" },
  { time: "14:00", icon: Sun, temperature: 23, label: "Sunny" },
  { time: "15:00", icon: Sun, temperature: 24, label: "Sunny" },
  { time: "16:00", icon: Cloud, temperature: 22, label: "Cloudy" },
  { time: "17:00", icon: CloudRain, temperature: 19, label: "Light rain" },
] as const
const DETAILS = [
  { icon: Wind, label: "Wind", value: "14 km/h" },
  { icon: Droplets, label: "Humidity", value: "58%" },
  { icon: Sunset, label: "Sunset", value: "19:12" },
] as const

/**
 * PUI-92: a place-and-weather widget built from deterministic sample data. It is presentational only: the one
 * description line states the data is a sample, and nothing on the card changes size or content.
 */
export function LocalWeather() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg"><h2 className="type-heading flex items-center gap-1.5"><MapPin aria-hidden="true" className="size-4 text-muted-foreground" />Lisbon</h2></CardTitle>
        <CardDescription>Sample forecast · not live data</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="flex items-center justify-between gap-4">
          <p className="grid gap-1">
            <span className="type-heading text-5xl tabular-nums">21°</span>
            <span className="text-sm text-muted-foreground">Partly cloudy · <span className="font-mono text-xs tabular-nums">H 24° L 16°</span></span>
          </p>
          <CloudSun aria-hidden="true" strokeWidth={1.5} className="size-14 shrink-0 text-chart-4" />
        </div>
        <ol aria-label="Next hours" className="grid grid-cols-5 gap-1 rounded-lg bg-muted/60 p-2">
          {HOURS.map(hour => (
            <li key={hour.time} className="grid justify-items-center gap-1.5 py-1 text-center">
              <span className="font-mono text-xs text-muted-foreground tabular-nums">{hour.time}</span>
              <hour.icon aria-hidden="true" className="size-4 text-foreground" />
              <span className="sr-only">{hour.label},</span>
              <span className="text-sm font-medium tabular-nums">{hour.temperature}°</span>
            </li>
          ))}
        </ol>
        <dl className="grid grid-cols-3 divide-x divide-border">
          {DETAILS.map(detail => (
            <div key={detail.label} className="grid min-w-0 justify-items-start gap-1 px-3 first:pl-0 last:pr-0">
              <dt className="flex items-center gap-1 text-xs text-muted-foreground"><detail.icon aria-hidden="true" className="size-3" />{detail.label}</dt>
              <dd className="text-sm font-medium tabular-nums">{detail.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
