import { readFileSync } from "node:fs"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { evaluateContextRequest, getContract, validateComponentState } from "../../core/src/index"

import { Bubble, BubbleContent } from "./components/bubble"
import { Calendar } from "./components/calendar"
import { Message, MessageContent } from "./components/message"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/table"

const source = (name: string) => readFileSync(new URL(`./components/${name}.tsx`, import.meta.url), "utf8")
const RESOURCES = ["message", "bubble", "calendar", "table"] as const

describe("WSCG official Message, Bubble, Calendar and Table resources", () => {
  it.each(RESOURCES)("retrieves only the %s contract, deterministically, with source provenance", async (resource) => {
    const request = { version: "personal-ui-context/1", operation: "get", resource, theme: "default" }
    const result = await evaluateContextRequest(request)
    expect(result.ok).toBe(true)
    expect(result).toEqual(await evaluateContextRequest(request))
    expect(JSON.stringify(result)).toContain(`packages/core/src/contracts/data/${resource}.ts`)
    expect((await getContract(resource))?.composition.join(" ")).toContain("Official shadcn new-york-v4")
  })

  it("admits valid structured state and reports each closed rule", () => {
    const cases = [
      [{ kind: "message", messages: [{ sender: "Maya", align: "start", contentCount: 1 }] }, [
        [{ messages: [{ sender: "Maya", align: "start", contentCount: 1 }, { sender: "Maya", align: "end", contentCount: 1 }] }, "message.alignment"],
        [{ messages: [{ sender: null, align: "start", contentCount: 1 }] }, "message.sender-name"],
        [{ messages: [{ sender: "Maya", align: "start", contentCount: 0 }] }, "message.content-required"],
        [{ streaming: true }, "constraint.invalid-state"],
      ]],
      [{ kind: "bubble", variant: "default", bounded: true, wraps: true, text: "Hi" }, [
        [{ variant: "danger" }, "bubble.semantic-variant"],
        [{ wraps: false }, "bubble.bounded-width"],
        [{ text: "" }, "bubble.content-required"],
      ]],
      [{ kind: "calendar", mode: "range", numberOfMonths: 1, range: { from: "2026-10-12", to: "2026-10-16" }, keyboardGrid: true, visibleFocus: true }, [
        [{ range: { from: "2026-10-17", to: "2026-10-16" } }, "calendar.valid-range"],
        [{ visibleFocus: false }, "calendar.keyboard-grid"],
        [{ numberOfMonths: 13 }, "calendar.month-count"],
        [{ range: { from: "12 Oct", to: "16 Oct" } }, "constraint.invalid-state"],
      ]],
      [{ kind: "table", columns: ["Status", "Email", "Amount"], accessibleName: "Payments", rowCellCounts: [3, 3] }, [
        [{ columns: [] }, "table.column-headers"],
        [{ accessibleName: " " }, "table.accessible-name"],
        [{ rowCellCounts: [3, 4] }, "table.row-shape"],
      ]],
    ] as const
    for (const [valid, violations] of cases) {
      expect(validateComponentState(valid)).toEqual({ ok: true, state: valid })
      for (const [patch, ruleId] of violations) expect(validateComponentState({ ...valid, ...patch }), ruleId).toMatchObject({ ok: false, issues: expect.arrayContaining([expect.objectContaining({ ruleId })]) })
    }
  })

  it("keeps each resource a thin official composition with data slots and no bespoke input or network code", () => {
    const message = source("message")
    for (const slot of ["message-group", "message", "message-avatar", "message-content", "message-header", "message-footer"]) expect(message).toContain(`data-slot="${slot}"`)
    expect(message).toContain('align === "end" && "flex-row-reverse"')
    const bubble = source("bubble")
    for (const slot of ["bubble-group", "bubble", "bubble-content"]) expect(bubble).toContain(`data-slot="${slot}"`)
    expect(bubble).toContain('from "class-variance-authority"')
    expect(bubble).toContain('import { Slot } from "radix-ui"')
    const calendar = source("calendar")
    expect(calendar).toContain('import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"')
    expect(calendar).toContain('import { Button, buttonVariants } from "@personal-ui/ui/components/button"')
    expect(calendar).toContain('month_grid: "w-full border-collapse"')
    expect(calendar).toContain('data-slot="calendar"')
    expect(calendar).not.toMatch(/from "date-fns|from "@date-fns/)
    const table = source("table")
    for (const slot of ["table-container", "table", "table-header", "table-body", "table-footer", "table-row", "table-head", "table-cell", "table-caption"]) expect(table).toContain(`data-slot="${slot}"`)
    expect(table).toContain('className="relative w-full overflow-x-auto"')
    for (const implementation of [message, bubble, calendar, table]) {
      expect(implementation).not.toMatch(/onKeyDown|onPointer|addEventListener|fetch\(|https?:\/\/|#[0-9a-f]{3,8}\b/i)
      expect(implementation).not.toMatch(/\b(bg|text|border)-(red|blue|green|gray|slate|zinc|neutral)-\d/)
    }
  })

  it("pins react-day-picker as the only new direct dependency, with date-fns transitive only", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { dependencies: Record<string, string> }
    expect(pkg.dependencies["react-day-picker"]).toBe("10.0.1")
    expect(pkg.dependencies["@base-ui/react"]).toBe("1.8.0")
    expect(Object.keys(pkg.dependencies).filter(name => /date-fns|tanstack/.test(name))).toEqual([])
  })

  it("renders a range with start, middle and end day states from DayPicker modifiers", () => {
    const html = renderToStaticMarkup(createElement(Calendar, { mode: "range", defaultMonth: new Date(2026, 9, 1), selected: { from: new Date(2026, 9, 12), to: new Date(2026, 9, 15) } }))
    expect(html.match(/data-range-start="true"/g)).toHaveLength(1)
    expect(html.match(/data-range-end="true"/g)).toHaveLength(1)
    expect(html.match(/data-range-middle="true"/g)).toHaveLength(2)
    expect(html).toContain('role="grid"')
  })

  it("renders end alignment through the row and native table semantics through Table", () => {
    const row = renderToStaticMarkup(createElement(Message, { align: "end" }, createElement(MessageContent, null, createElement(Bubble, { variant: "muted" }, createElement(BubbleContent, null, "Hi")))))
    expect(row).toMatch(/data-slot="message" data-align="end" class="[^"]*flex-row-reverse/)
    expect(row).toContain('data-variant="muted"')
    const table = renderToStaticMarkup(createElement(Table, null,
      createElement(TableHeader, null, createElement(TableRow, null, createElement(TableHead, null, "Status"))),
      createElement(TableBody, null, createElement(TableRow, null, createElement(TableCell, null, "Paid")))))
    expect(table).toMatch(/^<div data-slot="table-container"[^>]*><table data-slot="table"[^>]*><thead[^>]*><tr[^>]*><th[^>]*>Status<\/th><\/tr><\/thead><tbody/)
  })
})
