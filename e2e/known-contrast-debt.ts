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
  // White label on the light primary (#c96442), e.g. the landing card badge: about 3.89:1.
  { rule: "color-contrast", fgColor: "#ffffff", bgColor: "#c96442", minRatio: 3.85, maxRatio: 3.95 },
] as const

const serious = (violation: Violation) => violation.impact === "serious" || violation.impact === "critical"

async function isKnownDebt(page: Page, node: ViolationNode) {
  const data = node.any[0]?.data as { fgColor?: string; bgColor?: string; contrastRatio?: number } | undefined
  if (isPocketmarketDebt(data)) return true
  if (!data || data.fgColor !== KNOWN_DEFAULT_MUTED_DEBT.fgColor || data.bgColor !== KNOWN_DEFAULT_MUTED_DEBT.bgColor) return false
  if (typeof data.contrastRatio !== "number" || data.contrastRatio < KNOWN_DEFAULT_MUTED_DEBT.minRatio || data.contrastRatio > KNOWN_DEFAULT_MUTED_DEBT.maxRatio) return false
  // Top-level Workbench document only: an iframe target has more than one selector.
  if (node.target.length !== 1 || typeof node.target[0] !== "string") return false
  return page.evaluate(({ selector, element }) => document.querySelector(selector)?.matches(element) ?? false, { selector: node.target[0], element: KNOWN_DEFAULT_MUTED_DEBT.element })
}

function isPocketmarketDebt(data: { fgColor?: string; bgColor?: string; contrastRatio?: number } | undefined) {
  if (!data || typeof data.contrastRatio !== "number") return false
  const ratio = data.contrastRatio
  return KNOWN_POCKETMARKET_DEBT.some((debt) => debt.fgColor === data.fgColor && debt.bgColor === data.bgColor && ratio >= debt.minRatio && ratio <= debt.maxRatio)
}

/**
 * Returns every serious/critical violation except nodes that are exactly the known Default muted-pair debt or a
 * recorded Pocketmarket source-palette pair. When a TestInfo is given, the separated nodes are attached and annotated so
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
      disposition: "pre-approved deferred Default-theme debt (WSPF-06) or owner-kept Pocketmarket source-palette debt; measured, not suppressed",
      pairings: [KNOWN_DEFAULT_MUTED_DEBT, ...KNOWN_POCKETMARKET_DEBT],
      nodes: debt.map(node => ({ target: node.target, html: node.html, data: node.any[0]?.data })),
    }
    info.annotations.push({ type: "known-contrast-debt", description: `${label}: ${debt.length} known-debt node(s)` })
    await info.attach(`known-contrast-debt-${label}.json`, { body: JSON.stringify(record, null, 2), contentType: "application/json" })
  }
  return blocking
}
