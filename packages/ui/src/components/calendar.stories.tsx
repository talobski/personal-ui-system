import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import type { DateRange } from "react-day-picker"

import { Calendar } from "@personal-ui/ui/components/calendar"

/** Deterministic dates: October 2026 with a fixed range, never today's date. */
const MONTH = new Date(2026, 9, 1)

function Single() {
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 9, 14))
  return <Calendar mode="single" defaultMonth={MONTH} selected={date} onSelect={setDate} className="rounded-md border" />
}

function Range() {
  const [range, setRange] = useState<DateRange | undefined>({ from: new Date(2026, 9, 12), to: new Date(2026, 9, 16) })
  return <Calendar mode="range" defaultMonth={MONTH} selected={range} onSelect={setRange} className="rounded-md border" />
}

const meta = { title: "Pilot/Calendar", component: Single, parameters: { layout: "centered" } } satisfies Meta<typeof Single>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const RangeStory: StoryObj<typeof Range> = { name: "Range", render: () => <Range /> }
