import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { createProposalSession, evaluateContextRequest, stageProposal, validateComponentState } from "@personal-ui/core"

const README = readFileSync(fileURLToPath(new URL("../../README.md", import.meta.url)), "utf8")

const documentedJson = (name: string): unknown => {
  const pattern = "<!-- afc09:" + name + ":start -->\\s*\\n```json\\s*\\n([\\s\\S]*?)\\n```\\s*\\n<!-- afc09:" + name + ":end -->"
  const match = README.match(new RegExp(pattern))
  if (!match) throw new Error(`missing AFC-09 README JSON block: ${name}`)
  return JSON.parse(match[1]!)
}

describe("AFC-09 public documentation contract", () => {
  it("keeps the documented Field composition valid through the public barrel", () => {
    expect(validateComponentState(documentedJson("field-state"))).toMatchObject({ ok: true })
  })

  it("stages the documented proposal against the theme returned by public context retrieval", async () => {
    const retrieved = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "get", theme: "quiet-editorial", resource: "field" })
    expect(retrieved.ok).toBe(true)
    if (!retrieved.ok || retrieved.operation !== "get") throw new Error("documented retrieval failed")
    const proposal = documentedJson("valid-proposal") as Record<string, unknown>
    expect(proposal.base).toEqual({ themeId: retrieved.theme.id, revision: retrieved.theme.revision })
    expect(stageProposal(createProposalSession(), retrieved.theme, proposal, "2026-01-01T00:00:00Z").ok).toBe(true)
  })

  it("rejects the documented arbitrary CSS/path attempt deterministically through proposal staging", async () => {
    const retrieved = await evaluateContextRequest({ version: "personal-ui-context/1", operation: "get", theme: "quiet-editorial", resource: "field" })
    expect(retrieved.ok).toBe(true)
    if (!retrieved.ok || retrieved.operation !== "get") throw new Error("documented retrieval failed")
    expect(stageProposal(createProposalSession(), retrieved.theme, documentedJson("set-css-attempt"), "2026-01-01T00:00:00Z")).toMatchObject({ ok: false, errors: [{ ruleId: "mutation.unknown-operation", path: "operations[0].op" }] })
  })
})
