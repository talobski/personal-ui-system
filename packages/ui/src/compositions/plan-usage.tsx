import { Button } from "../components/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/card"

const CAPACITY = 25
/** Literal chart-token utilities so every segment and legend swatch follows the active theme. */
const USAGE = [
  { label: "Design files", gigabytes: 8.6, swatch: "bg-chart-1" },
  { label: "Video", gigabytes: 5.2, swatch: "bg-chart-2" },
  { label: "Documents", gigabytes: 3.1, swatch: "bg-chart-3" },
  { label: "Other", gigabytes: 1.5, swatch: "bg-chart-4" },
] as const

/**
 * PUI-86: a usage/status card with no promotion; it ends after the category breakdown and has no interaction.
 * PUI-103: the title leads straight into the usage figure (no plan subtitle), and the breakdown reads as colours and
 * names only, with no per-category values.
 * PUI-120: one inert Secondary "Manage storage" Button below the breakdown, a natural specimen for UI Effects. It has no
 * workflow, state, navigation, or network behaviour. PUI-128: it spans the content's full inner width at its own height.
 */
export function PlanUsage() {
  const used = USAGE.reduce((sum, item) => sum + item.gigabytes, 0)
  return (
    <Card>
      <CardHeader className="grid-rows-none">
        <CardTitle className="text-lg"><h2 className="type-heading">Storage</h2></CardTitle>
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
              <span className="min-w-0 truncate">{item.label}</span>
            </li>
          ))}
        </ul>
        <Button variant="secondary" type="button" className="w-full cursor-pointer">Manage storage</Button>
      </CardContent>
    </Card>
  )
}
