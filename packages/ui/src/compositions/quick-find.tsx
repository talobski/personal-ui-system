import { useId, useState } from "react"
import { Download, FilePlus, Keyboard, Palette, Search, UserPlus } from "lucide-react"

import { Card, CardContent } from "../components/card"
import { Input } from "../components/input"

const COMMANDS = [
  { label: "Edit theme colors", group: "Go to", keys: ["G", "C"], icon: Palette },
  { label: "New document", group: "Create", keys: ["N"], icon: FilePlus },
  { label: "Invite a teammate", group: "Create", keys: ["I"], icon: UserPlus },
  { label: "Export theme JSON", group: "Actions", keys: ["⇧", "E"], icon: Download },
  { label: "Keyboard shortcuts", group: "Help", keys: ["?"], icon: Keyboard },
] as const

/**
 * `stable` is the gallery presentation: every command row stays in place. Filtering disables and dims non-matching
 * rows, and opening a command marks its row selected, so the card keeps its footprint while it responds.
 * PUI-103: no visible title or subtitle, so the search field is the first visible content; the heading remains for
 * assistive technology. PUI-141: the embedded Input is `rounded-none` (as shadcn's InputGroupInput) because the row
 * owns the visible radius; the browser clips an input's text to its own rounded box, so an invisible radius on this
 * padless field would round the ends of the native selection highlight as the theme radius grows. It also takes
 * InputGroupInput's `input-group-control` slot, so the row, not the embedded field, owns any field depth.
 */
export function QuickFind({ stable = false }: { stable?: boolean }) {
  const id = useId()
  const [query, setQuery] = useState("")
  const [opened, setOpened] = useState<string | null>(null)
  const needle = query.trim().toLowerCase()
  const matches = (command: typeof COMMANDS[number]) => `${command.label} ${command.group}`.toLowerCase().includes(needle)
  const results = COMMANDS.filter(matches)
  return (
    <Card>
      <CardContent className="grid gap-3">
        <h2 className="sr-only">Quick find</h2>
        <label htmlFor={id} className="sr-only">Search commands</label>
        <div className="flex h-9 items-center gap-2 rounded-md border border-input px-3 shadow-xs transition-[color,box-shadow] has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/50 dark:bg-input/30">
          <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <Input id={id} data-slot="input-group-control" type="search" value={query} placeholder="Search or type a command" autoComplete="off" onChange={e => { setQuery(e.target.value); setOpened(null) }}
            className="h-auto min-w-0 rounded-none border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0 dark:bg-transparent" />
          <kbd aria-hidden="true" className="rounded border bg-muted px-1.5 font-mono text-[0.6875rem] text-foreground">⌘K</kbd>
        </div>
        <p aria-live="polite" className="sr-only">{results.length === 1 ? "1 result" : `${results.length} results`}</p>
        {results.length === 0 && !stable
          ? <p className="px-2 py-6 text-center text-sm text-muted-foreground">No matches for “{query.trim()}”.</p>
          : <ul aria-label="Commands" className="grid gap-0.5">
              {(stable ? COMMANDS : results).map(command => (
                <li key={command.label}>
                  <button type="button" disabled={!matches(command)} aria-current={stable && opened === command.label ? "true" : undefined} onClick={() => setOpened(command.label)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-[current=true]:bg-accent aria-[current=true]:text-accent-foreground">
                    <command.icon aria-hidden="true" className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{command.label}</span>
                    <span className="sr-only">, {command.group}, shortcut {command.keys.join(" ")}</span>
                    <span aria-hidden="true" className="flex gap-1">{command.keys.map(key => <kbd key={key} className="min-w-5 rounded border bg-background px-1 text-center font-mono text-[0.6875rem] text-foreground">{key}</kbd>)}</span>
                  </button>
                </li>
              ))}
            </ul>}
        {stable
          ? <p role="status" className="sr-only">{opened ? `Opened “${opened}” in this preview only.` : ""}</p>
          : opened && <p role="status" className="text-sm">Opened “{opened}” in this preview only.</p>}
      </CardContent>
    </Card>
  )
}
