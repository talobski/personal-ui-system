import type { Meta, StoryObj } from "@storybook/react-vite"

import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@personal-ui/ui/components/table"

const INVOICES = [
  { id: "INV001", status: "Paid", method: "Card", amount: 250 },
  { id: "INV002", status: "Pending", method: "Transfer", amount: 150 },
  { id: "INV003", status: "Unpaid", method: "Card", amount: 350 },
] as const
const usd = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" })

function Example() {
  return (
    <Table className="w-96">
      <TableCaption>Recent invoices.</TableCaption>
      <TableHeader>
        <TableRow><TableHead>Invoice</TableHead><TableHead>Status</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead></TableRow>
      </TableHeader>
      <TableBody>
        {INVOICES.map(invoice => (
          <TableRow key={invoice.id}>
            <TableCell className="font-medium">{invoice.id}</TableCell>
            <TableCell>{invoice.status}</TableCell>
            <TableCell>{invoice.method}</TableCell>
            <TableCell className="text-right tabular-nums">{usd(invoice.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow><TableCell colSpan={3}>Total</TableCell><TableCell className="text-right tabular-nums">{usd(750)}</TableCell></TableRow>
      </TableFooter>
    </Table>
  )
}

const meta = { title: "Pilot/Table", component: Example, parameters: { layout: "centered" } } satisfies Meta<typeof Example>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
