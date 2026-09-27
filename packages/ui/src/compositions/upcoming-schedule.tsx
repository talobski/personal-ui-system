import { useState } from "react"
import { CalendarPlus } from "lucide-react"

import { Button } from "../components/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/card"

type Tone = 1 | 2 | 3 | 4 | 5
type Event = { time: string; title: string; detail: string; tone: Tone }

/** Literal utilities so Tailwind keeps every chart-token rail. */
const RAIL: Record<Tone, string> = { 1: "border-chart-1", 2: "border-chart-2", 3: "border-chart-3", 4: "border-chart-4", 5: "border-chart-5" }

const DAYS = [
  { key: "mon", short: "M", name: "Monday", date: 14 },
  { key: "tue", short: "T", name: "Tuesday", date: 15 },
  { key: "wed", short: "W", name: "Wednesday", date: 16 },
  { key: "thu", short: "T", name: "Thursday", date: 17 },
  { key: "fri", short: "F", name: "Friday", date: 18 },
  { key: "sat", short: "S", name: "Saturday", date: 19 },
  { key: "sun", short: "S", name: "Sunday", date: 20 },
] as const
type Day = typeof DAYS[number]["key"]

const INITIAL: Record<Day, Event[]> = {
  mon: [{ time: "09:30", title: "Planning with Ada", detail: "Studio · 45 min", tone: 2 }],
  tue: [
    { time: "10:00", title: "Design critique", detail: "Library room · 1 h", tone: 1 },
    { time: "13:30", title: "Client check-in", detail: "Video call · 30 min", tone: 3 },
    { time: "16:00", title: "Type pairing review", detail: "Async · comments due", tone: 5 },
  ],
  wed: [{ time: "11:00", title: "Research synthesis", detail: "Board · 2 h", tone: 4 }],
  thu: [
    { time: "09:00", title: "Release rehearsal", detail: "Studio · 1 h", tone: 2 },
    { time: "15:00", title: "Hiring loop", detail: "Room 2 · 45 min", tone: 3 },
  ],
  fri: [{ time: "17:00", title: "Launch v2.0", detail: "Everyone · celebrate", tone: 1 }],
  sat: [],
  sun: [],
}

/** The busiest day's length: the stable agenda always renders this many rows, padding quieter days with open time. */
const SLOTS = Math.max(...Object.values(INITIAL).map(agenda => agenda.length))

/**
 * `stable` is the gallery presentation: choosing a day swaps the agenda inside a fixed number of rows and there is no
 * add action, so the card keeps its footprint. The default keeps the full variable-length agenda and Add focus block.
 */
export function UpcomingSchedule({ stable = false }: { stable?: boolean }) {
  const [day, setDay] = useState<Day>("tue")
  const [events, setEvents] = useState(INITIAL)
  const selected = DAYS.find(entry => entry.key === day)!
  const agenda = events[day]
  const addFocusBlock = () => setEvents(previous => ({ ...previous, [day]: [...previous[day], { time: "14:00", title: "Focus block", detail: "Do not disturb · 90 min", tone: 4 }] }))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg"><h2 className="type-heading">This week</h2></CardTitle>
        <CardDescription>October 14 – 20</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div role="group" aria-label="Choose a day" className="grid grid-cols-7 gap-1">
          {DAYS.map(entry => {
            const count = events[entry.key].length
            const active = entry.key === day
            return (
              <button
                key={entry.key}
                type="button"
                aria-pressed={active}
                aria-label={`${entry.name}, October ${entry.date}, ${count === 0 ? "no events" : count === 1 ? "1 event" : `${count} events`}`}
                onClick={() => setDay(entry.key)}
                className={`grid min-w-0 cursor-pointer justify-items-center gap-1 rounded-md py-2 text-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"}`}
              >
                <span aria-hidden="true" className="font-medium">{entry.short}</span>
                <span aria-hidden="true" className="type-heading text-sm tabular-nums">{entry.date}</span>
                <span aria-hidden="true" className={`size-1 rounded-full ${count === 0 ? "bg-transparent" : active ? "bg-primary-foreground" : "bg-chart-2"}`} />
              </button>
            )
          })}
        </div>
        <section aria-live="polite" aria-label={`${selected.name} agenda`} className="grid gap-3">
          <p className="text-sm font-medium">{selected.name}</p>
          {stable
            ? <ol className="grid gap-3">
                {Array.from({ length: SLOTS }, (_, index) => agenda[index]).map((event, index) => (
                  <li key={`${day}-${index}`} className="grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-3">
                    {event ? <time className="pt-0.5 font-mono text-xs text-muted-foreground tabular-nums">{event.time}</time> : <span aria-hidden="true" className="pt-0.5 font-mono text-xs text-muted-foreground">—</span>}
                    <div className={`grid gap-0.5 border-l-2 pl-3 ${event ? RAIL[event.tone] : "border-dashed border-border"}`}>
                      <p className={event ? "truncate text-sm font-medium" : "truncate text-sm text-muted-foreground"}>{event?.title ?? "Open time"}</p>
                      <p className="truncate text-xs text-muted-foreground">{event?.detail ?? "Free for deep work"}</p>
                    </div>
                  </li>
                ))}
              </ol>
            : agenda.length === 0
            ? <p className="text-sm text-muted-foreground">Nothing scheduled. A clear day for deep work.</p>
            : <ol className="grid gap-3">
                {agenda.map((event, index) => (
                  <li key={`${event.time}-${index}`} className="grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-3">
                    <time className="pt-0.5 font-mono text-xs text-muted-foreground tabular-nums">{event.time}</time>
                    <div className={`grid gap-0.5 border-l-2 pl-3 ${RAIL[event.tone]}`}>
                      <p className="truncate text-sm font-medium">{event.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{event.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>}
        </section>
      </CardContent>
      {!stable && <CardFooter>
        <Button variant="outline" size="sm" className="w-full cursor-pointer" onClick={addFocusBlock}>
          <CalendarPlus aria-hidden="true" />Add focus block
        </Button>
      </CardFooter>}
    </Card>
  )
}
