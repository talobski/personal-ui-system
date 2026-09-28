import { useState } from "react"
import type { DateRange } from "react-day-picker"

import { Calendar } from "../components/calendar"
import { Card, CardContent } from "../components/card"

/** Deterministic fixture dates (October 2026); "today" is pinned to the range start so real time never shows. */
const MONTH = new Date(2026, 9, 1)
const TODAY = new Date(2026, 9, 12)
const INITIAL: DateRange = { from: new Date(2026, 9, 12), to: new Date(2026, 9, 16) }

/**
 * PUI-92/97: the card is the calendar itself: one single-month official Calendar in range mode, with no title, summary
 * or side panel. It starts with a visible start, middle and end, keeps navigation, keyboard and focus, and always
 * renders six weeks so changing month or range never changes the card's height. Its natural width is the compact
 * member of the Calendar / Weather local pair.
 */
export function OffsiteCalendar() {
  const [range, setRange] = useState<DateRange | undefined>(INITIAL)
  return (
    <Card className="py-3">
      <CardContent className="px-3">
        <h2 className="sr-only">Offsite dates</h2>
        <Calendar mode="range" numberOfMonths={1} fixedWeeks defaultMonth={MONTH} today={TODAY} selected={range} onSelect={setRange} className="mx-auto" />
      </CardContent>
    </Card>
  )
}
