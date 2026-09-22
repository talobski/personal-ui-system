import { evaluateContextRequest } from "./evaluator"
import { toCanonicalJson } from "./serialize"

const USAGE =
  "usage: context <list|get|capabilities> --version personal-ui-context/1 [--theme <id> --resource <id>]\n" +
  "Read-only. Prints one JSON result on stdout, or one JSON error on stderr with a nonzero exit."

const ALLOWED_FLAGS = new Set(["version", "theme", "resource"])

type ParsedArgs = { operation: string | undefined; flags: Record<string, string> }

function parseArgs(argv: readonly string[]): ParsedArgs {
  const [operation, ...rest] = argv
  const flags: Record<string, string> = {}
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]
    if (!token || !token.startsWith("--")) throw new Error(`unrecognized argument "${token ?? ""}"`)
    const name = token.slice(2)
    if (!ALLOWED_FLAGS.has(name)) throw new Error(`unsupported flag "--${name}"`)
    const value = rest[index + 1]
    if (value === undefined || value.startsWith("--")) throw new Error(`missing value for "--${name}"`)
    flags[name] = value
    index += 1
  }
  return { operation, flags }
}

function usageError(message: string): never {
  process.stderr.write(toCanonicalJson({ ok: false, errors: [{ ruleId: "context.invalid-request", path: "cli" }] }) + "\n")
  process.stderr.write(`${message}\n${USAGE}\n`)
  process.exit(2)
}

async function main(): Promise<void> {
  // `pnpm context -- <args>` forwards a leading "--" token verbatim; drop it so it is never mistaken for an operation.
  const argv = process.argv.slice(2)
  if (argv[0] === "--") argv.shift()

  let parsed: ParsedArgs
  try {
    parsed = parseArgs(argv)
  } catch (error) {
    usageError(error instanceof Error ? error.message : String(error))
  }
  if (!parsed.operation) usageError("missing operation")

  const request: Record<string, unknown> = { version: parsed.flags.version, operation: parsed.operation }
  if (parsed.flags.theme !== undefined) request.theme = parsed.flags.theme
  if (parsed.flags.resource !== undefined) request.resource = parsed.flags.resource

  const result = await evaluateContextRequest(request)
  if (!result.ok) {
    process.stderr.write(toCanonicalJson(result) + "\n")
    process.exitCode = 1
    return
  }
  process.stdout.write(toCanonicalJson(result) + "\n")
}

await main()
