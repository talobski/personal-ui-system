#!/usr/bin/env node
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { parseArgs } from "node:util"
import { runDecision } from "./adapter.ts"
import { DEFAULT_TIMEOUT_MS } from "./types.ts"

const USAGE = `usage: jev --packet <file|-> [--project-dir <dir>] [--policy <file>] [--timeout-ms <n>]

Runs one gate-admission packet against the fixed Jev endpoint using TYPESAFE_API_KEY.
Exit codes: 0 accepted, 1 not accepted (fail closed), 2 usage error.
The full outcome is printed as JSON on stdout. The API key is never printed.`

async function main(): Promise<number> {
  let parsed
  try {
    parsed = parseArgs({
      options: {
        packet: { type: "string" },
        "project-dir": { type: "string" },
        policy: { type: "string" },
        "timeout-ms": { type: "string" },
        help: { type: "boolean", short: "h" },
      },
      strict: true,
    })
  } catch (error) {
    console.error(`${(error as Error).message}\n${USAGE}`)
    return 2
  }
  const { values } = parsed
  if (values.help || !values.packet) {
    console.error(USAGE)
    return values.help ? 0 : 2
  }
  const timeoutMs = values["timeout-ms"] === undefined ? DEFAULT_TIMEOUT_MS : Number(values["timeout-ms"])
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    console.error(`--timeout-ms must be a positive integer\n${USAGE}`)
    return 2
  }

  let packet: unknown
  try {
    packet = JSON.parse(readFileSync(values.packet === "-" ? 0 : resolve(values.packet), "utf8"))
  } catch (error) {
    console.error(`cannot read packet: ${(error as Error).message}`)
    return 2
  }

  const outcome = await runDecision(packet, {
    projectDir: resolve(values["project-dir"] ?? process.cwd()),
    policyPath: values.policy === undefined ? undefined : resolve(values.policy),
    apiKey: process.env.TYPESAFE_API_KEY,
    fetch: (url, init) => fetch(url, init),
    timeoutMs,
  })
  console.log(JSON.stringify(outcome, null, 2))
  return outcome.accepted ? 0 : 1
}

process.exitCode = await main()
