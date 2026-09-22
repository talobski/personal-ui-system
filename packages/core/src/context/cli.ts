import { evaluateContextRequest } from "./evaluator"
import { toCanonicalJson } from "./serialize"
import type { ContextError } from "./types"

const ALLOWED_FLAGS = new Set(["version", "theme", "resource"])

type ParseSuccess = { operation: string; flags: Record<string, string> }
type ParseOutcome = { ok: true; value: ParseSuccess } | { ok: false; error: ContextError }

/**
 * Every failure path returns a stable `{ ruleId, path }` with a fixed, pre-chosen `path` string — never the
 * offending token or flag name itself — so a CLI parse error can never reflect arbitrary caller-supplied text into
 * its own output.
 */
function parseArgs(argv: readonly string[]): ParseOutcome {
  const [operation, ...rest] = argv
  if (!operation) return { ok: false, error: { ruleId: "context.invalid-request", path: "argv.operation" } }

  const flags: Record<string, string> = {}
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]
    if (!token || !token.startsWith("--")) return { ok: false, error: { ruleId: "context.invalid-request", path: "argv.positional" } }
    const name = token.slice(2)
    if (!ALLOWED_FLAGS.has(name)) return { ok: false, error: { ruleId: "context.invalid-request", path: "argv.flags.unsupported" } }
    if (Object.hasOwn(flags, name)) return { ok: false, error: { ruleId: "context.invalid-request", path: "argv.flags.duplicate" } }
    const value = rest[index + 1]
    if (value === undefined || value.startsWith("--")) return { ok: false, error: { ruleId: "context.invalid-request", path: "argv.flags.missing-value" } }
    flags[name] = value
    index += 1
  }
  return { ok: true, value: { operation, flags } }
}

/** The only thing ever written to stderr: exactly one line of the same stable `{ ok: false, errors }` JSON shape core returns. */
const emitError = (errors: ContextError[]): void => {
  process.stderr.write(toCanonicalJson({ ok: false, errors }) + "\n")
}

async function main(): Promise<void> {
  // `pnpm context -- <args>` forwards a leading "--" token verbatim; drop it so it is never mistaken for an operation.
  const rawArgv = process.argv.slice(2)
  const argv = rawArgv[0] === "--" ? rawArgv.slice(1) : rawArgv

  const parsed = parseArgs(argv)
  if (!parsed.ok) {
    emitError([parsed.error])
    process.exitCode = 2
    return
  }

  const { operation, flags } = parsed.value
  const request: Record<string, unknown> = { version: flags.version, operation }
  if (flags.theme !== undefined) request.theme = flags.theme
  if (flags.resource !== undefined) request.resource = flags.resource

  const result = await evaluateContextRequest(request)
  if (!result.ok) {
    emitError(result.errors)
    process.exitCode = 1
    return
  }
  process.stdout.write(toCanonicalJson(result) + "\n")
}

await main()
