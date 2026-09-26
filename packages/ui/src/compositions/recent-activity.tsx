import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/card"
export function RecentActivity() {
  return <Card><CardHeader><CardTitle className="text-lg"><h2 className="type-heading">Recent activity</h2></CardTitle><CardDescription>Small steps, steady progress.</CardDescription></CardHeader><CardContent>
    <ol className="grid gap-5 border-l pl-4">{[["Profile updated", "Today · 10:42"], ["Workspace created", "Yesterday · 14:18"], ["Welcome to your space", "Monday · 09:00"]].map(([label, time]) => <li key={label}><p className="text-sm font-medium">{label}</p><p className="mt-1 text-xs text-muted-foreground">{time}</p></li>)}</ol>
  </CardContent></Card>
}
