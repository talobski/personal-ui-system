import { useState } from "react"
import { Sparkles } from "lucide-react"

import { Button } from "../components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/card"

const CAPACITY = 25
/** Literal chart-token utilities so every segment and legend swatch follows the active theme. */
const USAGE = [
  { label: "Design files", gigabytes: 8.6, swatch: "bg-chart-1" },
  { label: "Video", gigabytes: 5.2, swatch: "bg-chart-2" },
  { label: "Documents", gigabytes: 3.1, swatch: "bg-chart-3" },
  { label: "Other", gigabytes: 1.5, swatch: "bg-chart-4" },
] as const

export function PlanUsage() {
  const [previewed, setPreviewed] = useState(false)
  const used = USAGE.reduce((sum, item) => sum + item.gigabytes, 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg"><h2 className="type-heading">Storage</h2></CardTitle>
        <CardDescription>Pro plan · renews October 31</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <p className="flex items-baseline gap-2">
          <span className="type-heading text-4xl tabular-nums">{used.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">of {CAPACITY} GB used</span>
        </p>
        <div role="img" aria-label={`${Math.round((used / CAPACITY) * 100)}% of storage used`} className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
          {USAGE.map(item => <span key={item.label} className={`${item.swatch} h-full first:rounded-l-full`} style={{ width: `${(item.gigabytes / CAPACITY) * 100}%` }} />)}
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {USAGE.map(item => (
            <li key={item.label} className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${item.swatch}`} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">{item.gigabytes.toFixed(1)}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-background p-3 shadow-md">
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"><Sparkles className="size-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Team plan</p>
            <p className="text-xs text-muted-foreground">100 GB and shared libraries.</p>
          </div>
          <Button size="sm" className="cursor-pointer" onClick={() => setPreviewed(true)}>Upgrade</Button>
        </div>
        {previewed && <p role="status" className="text-sm">Upgrade preview only. Nothing was charged.</p>}
      </CardContent>
    </Card>
  )
}
