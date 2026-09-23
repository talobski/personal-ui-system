import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/card"

export function ProductiveWeek() {
  const values = [2, 4, 3, 6, 5, 7, 5]
  return <Card><CardHeader><CardTitle className="text-lg"><h2>A productive week</h2></CardTitle><CardDescription>Your workspace, at a glance.</CardDescription></CardHeader>
    <CardContent><p><strong className="text-4xl font-semibold">32</strong> <span className="text-muted-foreground">tasks completed</span></p><p className="mt-2 text-xs text-muted-foreground">8 more than last week</p>
      <figure className="mt-4"><figcaption className="sr-only">Tasks completed Monday through Sunday: 2, 4, 3, 6, 5, 7, 5. Total 32.</figcaption><div aria-hidden="true" className="flex h-20 items-end gap-2">{values.map((v, i) => <div key={i} className="flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-sm" style={{ height: v * 8, background: `var(--chart-${i === 6 ? 2 : 3})` }} /><span className="text-xs text-muted-foreground">{"MTWTFSS"[i]}</span></div>)}</div></figure>
    </CardContent></Card>
}
