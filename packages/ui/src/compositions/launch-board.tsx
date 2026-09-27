import { useState } from "react"
import { ArrowRight, Check } from "lucide-react"

import { Button } from "../components/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../components/card"

const COLUMNS = [
  { status: "next", title: "Up next" },
  { status: "doing", title: "In progress" },
  { status: "done", title: "Done" },
] as const
type Status = typeof COLUMNS[number]["status"]

const INITIAL: { id: string; title: string; tag: string; status: Status }[] = [
  { id: "changelog", title: "Write the changelog", tag: "docs", status: "next" },
  { id: "announce", title: "Schedule the announcement", tag: "comms", status: "next" },
  { id: "contrast", title: "Audit dark-mode contrast", tag: "a11y", status: "doing" },
  { id: "migration", title: "Dry-run theme migration", tag: "core", status: "doing" },
  { id: "tokens", title: "Freeze semantic tokens", tag: "core", status: "done" },
  { id: "stories", title: "Refresh component stories", tag: "ui", status: "done" },
  { id: "fonts", title: "Self-host the font catalog", tag: "ui", status: "done" },
]

const NEXT: Record<Status, Status | null> = { next: "doing", doing: "done", done: null }

export function LaunchBoard() {
  const [tasks, setTasks] = useState(INITIAL)
  const done = tasks.filter(task => task.status === "done").length
  const advance = (id: string) => setTasks(previous => previous.map(task => task.id === id && NEXT[task.status] ? { ...task, status: NEXT[task.status]! } : task))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg"><h2 className="type-heading">Launch checklist</h2></CardTitle>
        <CardDescription>Version 2.0 · ships Friday</CardDescription>
        <CardAction><span className="font-mono text-sm tabular-nums">{done}/{tasks.length}</span></CardAction>
      </CardHeader>
      <CardContent className="@container grid gap-4">
        <div role="progressbar" aria-label="Launch progress" aria-valuemin={0} aria-valuemax={tasks.length} aria-valuenow={done} aria-valuetext={`${done} of ${tasks.length} tasks done`} className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(done / tasks.length) * 100}%` }} />
        </div>
        <div className="grid grid-cols-1 items-start gap-3 @md:grid-cols-3">
          {COLUMNS.map(column => {
            const items = tasks.filter(task => task.status === column.status)
            return (
              <section key={column.status} aria-labelledby={`launch-${column.status}`} className="grid gap-2 rounded-lg border border-dashed p-2">
                <h3 id={`launch-${column.status}`} className="flex items-center justify-between px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {column.title}<span className="font-mono tabular-nums">{items.length}</span>
                </h3>
                <ul className="grid gap-2">
                  {items.map(task => (
                    <li key={task.id} className="flex items-start gap-2 rounded-md border bg-background p-2.5 shadow-xs">
                      <div className="min-w-0 flex-1">
                        <p className={column.status === "done" ? "text-sm text-muted-foreground line-through" : "text-sm"}>{task.title}</p>
                        <p className="mt-1 font-mono text-[0.6875rem] text-muted-foreground">#{task.tag}</p>
                      </div>
                      {column.status === "done"
                        ? <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-foreground" />
                        : <Button variant="ghost" size="icon-xs" className="shrink-0 cursor-pointer" aria-label={`Move “${task.title}” to ${column.status === "next" ? "In progress" : "Done"}`} onClick={() => advance(task.id)}>
                            <ArrowRight aria-hidden="true" />
                          </Button>}
                    </li>
                  ))}
                  {items.length === 0 && <li className="px-1 py-2 text-xs text-muted-foreground">Nothing here.</li>}
                </ul>
              </section>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
