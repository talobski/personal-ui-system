import { useState } from "react"
import { ArrowRight, Bookmark } from "lucide-react"

import { Button } from "../components/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/card"

/** A generative cover built only from theme tokens: chart colours, primary, and the radius scale. */
const COVER = ["col-span-2 row-span-2 rounded-full bg-chart-1", "rounded-sm bg-chart-3", "rounded-lg bg-chart-2", "col-span-2 rounded-md bg-primary", "rounded-full bg-chart-4", "col-span-2 rounded-lg bg-chart-5", "rounded-sm bg-chart-2"]

export function RoomToThink() {
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState(false)
  return <Card><CardHeader><CardTitle className="text-lg"><h2 className="type-heading">Room to think</h2></CardTitle><CardDescription>FIELD NOTES / 004</CardDescription></CardHeader><CardContent className="@container"><div className="grid gap-5 @xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @xl:gap-8">
    <div aria-hidden="true" className="grid h-32 grid-cols-5 grid-rows-2 gap-2 rounded-lg border bg-secondary p-3 @xl:h-full @xl:min-h-40">{COVER.map(shape => <span key={shape} className={shape} />)}</div>
    <div className="grid content-start gap-4">
    <p className="type-heading text-2xl leading-tight">Make space for<br />the work that matters.</p>
    <p className="text-sm leading-relaxed text-muted-foreground">A quieter interface gives the work a little more room. Clear choices, familiar patterns, and details that stay out of your way.</p>
    {expanded && <p id="room-to-think-more" className="text-sm leading-relaxed text-muted-foreground">Restraint is not absence. It is the decision to let hierarchy, rhythm, and a few honest details carry the page.</p>}
    <p className="font-mono text-xs text-muted-foreground">6 min read · Katherine Johnson</p>
    </div>
  </div></CardContent><CardFooter className="justify-between gap-2">
    <Button variant="outline" size="sm" className="cursor-pointer" aria-expanded={expanded} aria-controls={expanded ? "room-to-think-more" : undefined} onClick={() => setExpanded(!expanded)}>{expanded ? "Show less" : "Keep reading"}<ArrowRight aria-hidden="true" className={expanded ? "-rotate-90" : undefined} /></Button>
    <Button variant="ghost" size="icon-sm" className="cursor-pointer" aria-label="Save for later" aria-pressed={saved} onClick={() => setSaved(!saved)}><Bookmark aria-hidden="true" className={saved ? "fill-current" : undefined} /></Button>
  </CardFooter></Card>
}
