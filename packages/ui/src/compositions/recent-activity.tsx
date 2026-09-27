import { FileText, GitCommitHorizontal, MessageSquare, UserPlus } from "lucide-react"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/card"

const DAYS = [
  { day: "Today", items: [
    { icon: GitCommitHorizontal, who: "Grace Hopper", did: "shipped", what: "Theme v3 migration", time: "10:42" },
    { icon: MessageSquare, who: "Ada Lovelace", did: "commented on", what: "Launch checklist", time: "09:15" },
  ] },
  { day: "Yesterday", items: [
    { icon: FileText, who: "Katherine Johnson", did: "published", what: "Field notes 004", time: "16:08" },
    { icon: UserPlus, who: "Alan Kay", did: "joined", what: "Studio North", time: "14:18" },
  ] },
] as const

export function RecentActivity() {
  return <Card><CardHeader><CardTitle className="text-lg"><h2 className="type-heading">Recent activity</h2></CardTitle><CardDescription>Small steps, steady progress.</CardDescription></CardHeader><CardContent className="grid gap-5">
    {DAYS.map(group => <section key={group.day} aria-label={group.day} className="grid gap-3">
      <h3 className="text-xs font-medium text-muted-foreground">{group.day}</h3>
      <ol className="grid gap-4">{group.items.map(item => <li key={item.what} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        <span aria-hidden="true" className="grid size-8 place-items-center rounded-full border bg-background text-foreground"><item.icon className="size-3.5" /></span>
        <p className="pt-1.5 text-sm leading-snug"><span className="font-medium">{item.who}</span> {item.did} <span className="font-medium">{item.what}</span></p>
        <time className="pt-2 font-mono text-xs text-muted-foreground tabular-nums">{item.time}</time>
      </li>)}</ol>
    </section>)}
  </CardContent></Card>
}
