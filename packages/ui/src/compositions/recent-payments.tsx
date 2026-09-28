import { useEffect, useRef, useState } from "react"
import type { ComponentProps, Ref } from "react"
import { Check, Ellipsis, Minus } from "lucide-react"

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
/**
 * PUI-104: a native checkbox drawn with semantic tokens, since a native control's own border ignores `border-color`.
 * Unchecked, its border is the input token; checked or indeterminate, it fills with primary and shows the official
 * Check or Minus glyph, stacked in the same grid cell. The ring token keeps its keyboard focus outline, and the box
 * keeps its 16px size, so selection never changes the column's geometry.
 */
function TableCheckbox({ ref, ...props }: Omit<ComponentProps<"input">, "type" | "className"> & { ref?: Ref<HTMLInputElement> }) {
  return (
    <span className="inline-grid size-4 align-middle *:col-start-1 *:row-start-1">
      <input ref={ref} type="checkbox" {...props}
        className="peer size-4 cursor-pointer appearance-none rounded-[4px] border border-input shadow-xs outline-ring checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 dark:bg-input/30 dark:checked:bg-primary dark:indeterminate:bg-primary" />
      <Check aria-hidden="true" className="pointer-events-none invisible size-3.5 place-self-center text-primary-foreground peer-checked:visible" />
      <Minus aria-hidden="true" className="pointer-events-none invisible size-3.5 place-self-center text-primary-foreground peer-indeterminate:visible" />
    </span>
  )
}

/**
 * PUI-90/96: a compact recipe on the official Table resource, sitting flush in its card: only this card's `py-6` and
 * its content's `px-6` are removed, so the border and radius stay and every cell keeps the Table's own padding. Native
 * checkboxes (a header select-all and one per row) change local selection only; the far-right ellipsis is a named
 * per-row affordance under a blank header. There is no toolbar, filter, column menu, summary or pagination. A fixed
 * layout pins the table to its card's width and text cells truncate, so no theme spacing or card width can make the
 * Table container a (keyboard-unreachable) scroll region, and selection never changes the card's geometry. PUI-104:
 * Amount values use the Body family at the Table's own text size, like Status and Email.
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
                <TableCheckbox ref={selectAll} aria-label="Select all payments" checked={all} onChange={() => setSelected(all ? new Set() : new Set(PAYMENTS.map(payment => payment.id)))} />
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
                  <TableCheckbox aria-label={`Select payment from ${payment.email}`} checked={selected.has(payment.id)} onChange={() => toggle(payment.id)} />
                </TableCell>
                <TableCell className="truncate">{payment.status}</TableCell>
                <TableCell className="truncate text-muted-foreground">{payment.email}</TableCell>
                <TableCell className="truncate text-right tabular-nums">{usd(payment.amount)}</TableCell>
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
