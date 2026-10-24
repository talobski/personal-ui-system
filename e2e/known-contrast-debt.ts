import type AxeBuilder from "@axe-core/playwright"
import type { Page, TestInfo } from "@playwright/test"

type Violation = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"][number]
type ViolationNode = Violation["nodes"][number]

/**
 * WSPF-06: the one pre-approved, deferred Default-theme finding. Shared ControlSection triggers use the semantic
 * `bg-muted text-muted-foreground` pair, which in Default light measures about 4.35:1 for their small text. Only an
 * axe color-contrast node on exactly that trigger, with exactly those resolved colours and that ratio, is separated;
 * it is recorded as known debt, never dropped. Every other serious or critical node (including this rule on any other
 * element, colour pair, or ratio) stays blocking.
 */
export const KNOWN_DEFAULT_MUTED_DEBT = {
  rule: "color-contrast",
  element: '[data-testid^="section-"] > h3 > button',
  fgColor: "#737373",
  bgColor: "#f5f5f5",
  minRatio: 4.3,
  maxRatio: 4.4,
} as const

/**
 * Pocketmarket source-palette debt: the owner chose to keep the supplied tokens verbatim rather than adjust them (see
 * packages/core/src/theme/fixtures/pocketmarket.conversion.json `contrastDebt`). Only axe color-contrast nodes with
 * exactly these resolved Pocketmarket colours and ratio window are separated; any other pair stays blocking.
 */
export const KNOWN_POCKETMARKET_DEBT = [
  // White label on the light primary (#e56b66), e.g. the landing card badge: about 3.17:1.
  { rule: "color-contrast", fgColor: "#ffffff", bgColor: "#e56b66", minRatio: 3.12, maxRatio: 3.22 },
] as const

/**
 * Secuna source-palette debt: the owner's exported muted text is kept verbatim (see
 * packages/core/src/theme/fixtures/secuna.conversion.json `contrastDebt`). Only these exact resolved Secuna colours and
 * ratio windows are separated; any other pair stays blocking.
 */
export const KNOWN_SECUNA_DEBT = [
  // Light muted-foreground (#797e81) on the white background, card and popover: about 4.10:1.
  { rule: "color-contrast", fgColor: "#797e81", bgColor: "#ffffff", minRatio: 4.05, maxRatio: 4.15 },
  // The same text on the landing's near-white translucent surfaces (#fafbfb): about 3.96:1.
  { rule: "color-contrast", fgColor: "#797e81", bgColor: "#fafbfb", minRatio: 3.91, maxRatio: 4.01 },
  // Dark muted-foreground (#5c7a8a) on the background (4.17:1), card (4.01:1), muted (3.70:1) and the landing's
  // translucent header over the background (#0e1518, 4.04:1).
  { rule: "color-contrast", fgColor: "#5c7a8a", bgColor: "#0b1113", minRatio: 4.12, maxRatio: 4.22 },
  { rule: "color-contrast", fgColor: "#5c7a8a", bgColor: "#0e161a", minRatio: 3.96, maxRatio: 4.06 },
  { rule: "color-contrast", fgColor: "#5c7a8a", bgColor: "#151e23", minRatio: 3.65, maxRatio: 3.75 },
  { rule: "color-contrast", fgColor: "#5c7a8a", bgColor: "#0e1518", minRatio: 3.99, maxRatio: 4.09 },
] as const

const SOURCE_PALETTE_DEBT = [...KNOWN_POCKETMARKET_DEBT, ...KNOWN_SECUNA_DEBT]

const serious = (violation: Violation) => violation.impact === "serious" || violation.impact === "critical"

async function isKnownDebt(page: Page, node: ViolationNode) {
  const data = node.any[0]?.data as { fgColor?: string; bgColor?: string; contrastRatio?: number } | undefined
  if (isSourcePaletteDebt(data)) return true
  if (!data || data.fgColor !== KNOWN_DEFAULT_MUTED_DEBT.fgColor || data.bgColor !== KNOWN_DEFAULT_MUTED_DEBT.bgColor) return false
  if (typeof data.contrastRatio !== "number" || data.contrastRatio < KNOWN_DEFAULT_MUTED_DEBT.minRatio || data.contrastRatio > KNOWN_DEFAULT_MUTED_DEBT.maxRatio) return false
  // Top-level Workbench document only: an iframe target has more than one selector.
  if (node.target.length !== 1 || typeof node.target[0] !== "string") return false
  return page.evaluate(({ selector, element }) => document.querySelector(selector)?.matches(element) ?? false, { selector: node.target[0], element: KNOWN_DEFAULT_MUTED_DEBT.element })
}

function isSourcePaletteDebt(data: { fgColor?: string; bgColor?: string; contrastRatio?: number } | undefined) {
  if (!data || typeof data.contrastRatio !== "number") return false
  const ratio = data.contrastRatio
  return SOURCE_PALETTE_DEBT.some((debt) => debt.fgColor === data.fgColor && debt.bgColor === data.bgColor && ratio >= debt.minRatio && ratio <= debt.maxRatio)
}

/**
 * Returns every serious/critical violation except nodes that are exactly the known Default muted-pair debt or a
 * recorded Pocketmarket or Secuna source-palette pair. When a TestInfo is given, the separated nodes are attached and annotated so
 * receipts state the exception explicitly.
 */
export async function seriousOutsideKnownDebt(page: Page, violations: Violation[], info?: TestInfo, label = "axe") {
  const blocking: Violation[] = []
  const debt: ViolationNode[] = []
  for (const violation of violations.filter(serious)) {
    if (violation.id !== KNOWN_DEFAULT_MUTED_DEBT.rule) {
      blocking.push(violation)
      continue
    }
    const rest: ViolationNode[] = []
    for (const node of violation.nodes) (await isKnownDebt(page, node) ? debt : rest).push(node)
    if (rest.length > 0) blocking.push({ ...violation, nodes: rest })
  }
  if (info && debt.length > 0) {
    const record = {
      disposition: "pre-approved deferred Default-theme debt (WSPF-06) or owner-kept Pocketmarket or Secuna source-palette debt; measured, not suppressed",
      pairings: [KNOWN_DEFAULT_MUTED_DEBT, ...SOURCE_PALETTE_DEBT],
      nodes: debt.map(node => ({ target: node.target, html: node.html, data: node.any[0]?.data })),
    }
    info.annotations.push({ type: "known-contrast-debt", description: `${label}: ${debt.length} known-debt node(s)` })
    await info.attach(`known-contrast-debt-${label}.json`, { body: JSON.stringify(record, null, 2), contentType: "application/json" })
  }
  return blocking
}
