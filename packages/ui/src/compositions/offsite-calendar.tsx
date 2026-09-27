import { useState } from "react"
import type { DateRange } from "react-day-picker"

import { Calendar } from "../components/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/card"

/** Deterministic fixture dates (October 2026); "today" is pinned to the range start so real time never shows. */
const MONTH = new Date(2026, 9, 1)
const TODAY = new Date(2026, 9, 12)
const INITIAL: DateRange = { from: new Date(2026, 9, 12), to: new Date(2026, 9, 16) }
const DAY = 24 * 60 * 60 * 1000
const label = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric" })

/**
 * PUI-92: one single-month official Calendar in range mode. It starts with a visible start, middle and end, keeps
 * navigation, and always renders six weeks so changing month or range never changes the card's height.
 */
export function OffsiteCalendar() {
  const [range, setRange] = useState<DateRange | undefined>(INITIAL)
  const days = range?.from && range.to ? Math.round((range.to.getTime() - range.from.getTime()) / DAY) + 1 : range?.from ? 1 : 0
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg"><h2 className="type-heading">Studio offsite</h2></CardTitle>
        <CardDescription>Pick the days away</CardDescription>
      </CardHeader>
      <CardContent className="@container grid gap-4 @md:grid-cols-[auto_minmax(0,1fr)] @md:items-start">
        <Calendar mode="range" numberOfMonths={1} fixedWeeks defaultMonth={MONTH} today={TODAY} selected={range} onSelect={setRange} className="justify-self-center rounded-lg border p-2" />
        <dl className="grid grid-cols-3 content-start gap-4 text-sm @md:grid-cols-1 @md:pt-2">
          <div className="grid gap-1">
            <dt className="text-xs text-muted-foreground">Starts</dt>
            <dd className="font-medium">{range?.from ? label(range.from) : "Not set"}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-xs text-muted-foreground">Ends</dt>
            <dd className="font-medium">{range?.to ? label(range.to) : "Not set"}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-xs text-muted-foreground">Length</dt>
            <dd><span className="type-heading text-2xl tabular-nums">{days}</span> <span className="text-muted-foreground">{days === 1 ? "day" : "days"}</span></dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
