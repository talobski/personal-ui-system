import { useEffect, useRef, useState } from "react"
import { Ellipsis } from "lucide-react"

import { Button } from "../components/button"
import { Card, CardContent } from "../components/card"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../components/table"

/** The official Data Table example rows, fixed and local. */
const PAYMENTS = [
  { id: "m5gr84i9", status: "Success", email: "ken99@example.com", amount: 316 },
  { id: "3u1reuv4", status: "Success", email: "abe45@example.com", amount: 242 },
  { id: "derv1ws0", status: "Processing", email: "monserrat44@example.com", amount: 837 },
  { id: "5kma53ae", status: "Success", email: "silas22@example.com", amount: 874 },
  { id: "bhqecj4p", status: "Failed", email: "carmella@example.com", amount: 721 },
] as const
const usd = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" })
/** Native checkboxes take the primary token as their accent and the ring token for keyboard focus. */
const CHECKBOX = "size-4 cursor-pointer align-middle accent-primary outline-ring focus-visible:outline-2 focus-visible:outline-offset-2"

/**
 * PUI-90/96: a compact recipe on the official Table resource, sitting flush in its card: only this card's `py-6` and
 * its content's `px-6` are removed, so the border and radius stay and every cell keeps the Table's own padding. Native
 * checkboxes (a header select-all and one per row) change local selection only; the far-right ellipsis is a named
 * per-row affordance under a blank header. There is no toolbar, filter, column menu, summary or pagination. A fixed
 * layout pins the table to its card's width and text cells truncate, so no theme spacing or card width can make the
 * Table container a (keyboard-unreachable) scroll region, and selection never changes the card's geometry.
 */
export function RecentPayments() {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())
  const all = selected.size === PAYMENTS.length
  const some = selected.size > 0 && !all
  const selectAll = useRef<HTMLInputElement>(null)
  useEffect(() => { if (selectAll.current) selectAll.current.indeterminate = some }, [some])
  const toggle = (id: string) => setSelected(current => {
    const next = new Set(current)
    if (!next.delete(id)) next.add(id)
    return next
  })
  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="px-0">
        <h2 className="sr-only">Recent payments</h2>
        <Table className="table-fixed">
          <TableCaption className="sr-only">Five most recent payments with status, email and amount.</TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 pl-4">
                <input ref={selectAll} type="checkbox" aria-label="Select all payments" checked={all} onChange={() => setSelected(all ? new Set() : new Set(PAYMENTS.map(payment => payment.id)))} className={CHECKBOX} />
              </TableHead>
              <TableHead className="w-[26%] truncate">Status</TableHead>
              <TableHead className="truncate">Email</TableHead>
              <TableHead className="w-[24%] truncate text-right">Amount</TableHead>
              <TableHead className="w-12 pr-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {PAYMENTS.map(payment => (
              <TableRow key={payment.id}>
                <TableCell className="pl-4">
                  <input type="checkbox" aria-label={`Select payment from ${payment.email}`} checked={selected.has(payment.id)} onChange={() => toggle(payment.id)} className={CHECKBOX} />
                </TableCell>
                <TableCell className="truncate">{payment.status}</TableCell>
                <TableCell className="truncate text-muted-foreground">{payment.email}</TableCell>
                <TableCell className="truncate text-right font-mono text-xs tabular-nums">{usd(payment.amount)}</TableCell>
                <TableCell className="pr-3 text-right">
                  <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${payment.email}`} className="cursor-pointer text-muted-foreground"><Ellipsis /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
