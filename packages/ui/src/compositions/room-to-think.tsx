import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/card"
export function RoomToThink() {
  return <Card><CardHeader><CardTitle className="text-lg"><h2 className="type-heading">Room to think</h2></CardTitle><CardDescription>FIELD NOTES / 004</CardDescription></CardHeader><CardContent className="grid gap-6">
    <p className="text-2xl font-semibold leading-tight">Make space for<br />the work that matters.</p><p className="text-sm leading-relaxed text-muted-foreground">A quieter interface gives the work a little more room. Clear choices, familiar patterns, and details that stay out of your way.</p><blockquote className="rounded-md bg-muted p-4 text-sm font-medium">Good design leaves room.</blockquote>
  </CardContent></Card>
}
