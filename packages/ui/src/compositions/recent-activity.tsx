import { FileText, GitCommitHorizontal, MessageSquare, UserPlus } from "lucide-react"

import { Card, CardHeader, CardTitle, CardContent } from "../components/card"

const DAYS = [
  { day: "Today", items: [
    { icon: GitCommitHorizontal, who: "Grace Hopper", did: "shipped", what: "Theme v3 migration" },
    { icon: MessageSquare, who: "Ada Lovelace", did: "commented on", what: "Launch checklist" },
  ] },
  { day: "Yesterday", items: [
    { icon: FileText, who: "Katherine Johnson", did: "published", what: "Field notes 004" },
    { icon: UserPlus, who: "Alan Kay", did: "joined", what: "Studio North" },
  ] },
] as const

/** PUI-103: the title, day groups and activity content only; no subtitle and no per-row timestamps. */
export function RecentActivity() {
  return <Card><CardHeader className="grid-rows-none"><CardTitle className="text-lg"><h2 className="type-heading">Recent activity</h2></CardTitle></CardHeader><CardContent className="grid gap-5">
    {DAYS.map(group => <section key={group.day} aria-label={group.day} className="grid gap-3">
      <h3 className="text-xs font-medium text-muted-foreground">{group.day}</h3>
      <ol className="grid gap-4">{group.items.map(item => <li key={item.what} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
        <span aria-hidden="true" className="grid size-8 place-items-center rounded-full border bg-background text-foreground"><item.icon className="size-3.5" /></span>
        <p className="pt-1.5 text-sm leading-snug"><span className="font-medium">{item.who}</span> {item.did} <span className="font-medium">{item.what}</span></p>
      </li>)}</ol>
    </section>)}
  </CardContent></Card>
}
