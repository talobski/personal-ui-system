import { z } from "zod"

const text = z.string().min(1).max(400)
const list = z.array(text).min(1).max(12)

/** Exactly the brief-required fields; no theme values, CSS, or model prose belong here. */
export const contractSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  purpose: text,
  use: list,
  avoid: list,
  variants: list,
  responsiveBehavior: text,
  accessibility: list,
  composition: list,
  examples: list,
  mistakes: list,
  mobileReplacement: z.string().min(1).max(400).nullable(),
  constraints: z
    .array(z.strictObject({ id: z.string().regex(/^[a-z]+(?:-[a-z]+)*\.[a-z0-9-]+$/), rule: text }))
    .min(1)
    .max(12),
})

export type Contract = z.infer<typeof contractSchema>

/** AC-04: a single serialized contract must stay within 8 KiB. */
export const CONTRACT_MAX_BYTES = 8 * 1024

export const contractByteLength = (contract: Contract) => new TextEncoder().encode(JSON.stringify(contract)).length
