import { Card, CardContent } from "../components/card"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../components/table"

/** The official Data Table example rows, fixed and local; status is written out, the dot only reinforces it. */
const PAYMENTS = [
  { id: "m5gr84i9", status: "Success", email: "ken99@example.com", amount: 316 },
  { id: "3u1reuv4", status: "Success", email: "abe45@example.com", amount: 242 },
  { id: "derv1ws0", status: "Processing", email: "monserrat44@example.com", amount: 837 },
  { id: "5kma53ae", status: "Success", email: "silas22@example.com", amount: 874 },
  { id: "bhqecj4p", status: "Failed", email: "carmella@example.com", amount: 721 },
] as const
const DOT = { Success: "bg-chart-2", Processing: "bg-chart-4", Failed: "bg-destructive" } as const
const usd = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" })

/**
 * PUI-90: a compact recipe on the official Table resource. The table is the whole composition: no toolbar, filter,
 * column menu, selection, row menu, summary or pagination. A fixed layout pins the table to its card's width and every
 * cell truncates, so no theme spacing or card width can make the Table container a (keyboard-unreachable) scroll region.
 */
export function RecentPayments() {
  return (
    <Card>
      <CardContent>
        <h2 className="sr-only">Recent payments</h2>
        <Table className="table-fixed">
          <TableCaption className="sr-only">Five most recent payments with status, email and amount.</TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[32%] truncate pl-0">Status</TableHead>
              <TableHead className="truncate">Email</TableHead>
              <TableHead className="w-[26%] truncate pr-0 text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PAYMENTS.map(payment => (
              <TableRow key={payment.id}>
                <TableCell className="truncate pl-0">
                  <span className="inline-flex items-center gap-2"><span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${DOT[payment.status]}`} />{payment.status}</span>
                </TableCell>
                <TableCell className="truncate text-muted-foreground">{payment.email}</TableCell>
                <TableCell className="truncate pr-0 text-right font-mono text-xs tabular-nums">{usd(payment.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
