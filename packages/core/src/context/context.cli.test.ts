import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const bootstrap = fileURLToPath(new URL("./bootstrap.mjs", import.meta.url))

const run = (args: string[]): { status: number; stdout: string; stderr: string } => {
  try {
    const stdout = execFileSync(process.execPath, [bootstrap, ...args], { encoding: "utf8" })
    return { status: 0, stdout, stderr: "" }
  } catch (error) {
    const e = error as { status: number | null; stdout: string; stderr: string }
    return { status: e.status ?? 1, stdout: e.stdout, stderr: e.stderr }
  }
}

/** Every CLI failure must be exactly one JSON line on stderr (no prose/usage text), empty stdout, nonzero exit. */
const expectSingleJsonErrorLine = (stderr: string, stdout: string) => {
  expect(stdout).toBe("")
  const lines = stderr.trimEnd().split("\n")
  expect(lines).toHaveLength(1)
  const parsed = JSON.parse(lines[0]!)
  expect(parsed.ok).toBe(false)
  expect(Array.isArray(parsed.errors)).toBe(true)
  return parsed
}

describe("context CLI (ACR-08)", () => {
  it("list prints one JSON stdout line and exits 0", () => {
    const { status, stdout, stderr } = run(["list", "--version", "personal-ui-context/1"])
    expect(status).toBe(0)
    expect(stderr).toBe("")
    const lines = stdout.trimEnd().split("\n")
    expect(lines).toHaveLength(1)
    const parsed = JSON.parse(lines[0]!)
    expect(parsed.ok).toBe(true)
    expect(parsed.operation).toBe("list")
  })

  it("get with allowlisted theme/resource prints stdout JSON and exits 0", () => {
    const { status, stdout } = run(["get", "--version", "personal-ui-context/1", "--theme", "quiet-editorial", "--resource", "button"])
    expect(status).toBe(0)
    const parsed = JSON.parse(stdout.trimEnd())
    expect(parsed.ok).toBe(true)
    expect(parsed.resource.id).toBe("button")
  })

  it("capabilities prints stdout JSON and exits 0", () => {
    const { status, stdout } = run(["capabilities", "--version", "personal-ui-context/1"])
    expect(status).toBe(0)
    const parsed = JSON.parse(stdout.trimEnd())
    expect(parsed.ok).toBe(true)
    expect(parsed.operation).toBe("capabilities")
  })

  it("an unknown resource fails closed: nonzero exit, one stable JSON line on stderr, empty stdout", () => {
    const { status, stdout, stderr } = run(["get", "--version", "personal-ui-context/1", "--theme", "quiet-editorial", "--resource", "nope"])
    expect(status).toBe(1)
    expect(stdout).toBe("")
    expect(JSON.parse(stderr.trimEnd())).toEqual({ ok: false, errors: [{ ruleId: "context.unknown-resource", path: "resource" }] })
  })

  it("no arguments: one stable JSON line on stderr, nothing else", () => {
    const { status, stdout, stderr } = run([])
    expect(status).toBe(2)
    const parsed = expectSingleJsonErrorLine(stderr, stdout)
    expect(parsed).toEqual({ ok: false, errors: [{ ruleId: "context.invalid-request", path: "argv.operation" }] })
  })

  it("an unsupported flag: one stable JSON line, no prose, no reflected flag name", () => {
    const { status, stdout, stderr } = run(["list", "--version", "personal-ui-context/1", "--output", "/tmp/x.json"])
    expect(status).toBe(2)
    const parsed = expectSingleJsonErrorLine(stderr, stdout)
    expect(parsed).toEqual({ ok: false, errors: [{ ruleId: "context.invalid-request", path: "argv.flags.unsupported" }] })
    expect(stderr).not.toContain("output")
    expect(stderr).not.toContain("/tmp/x.json")
  })

  it("a flag with a missing value: one stable JSON line", () => {
    const { status, stdout, stderr } = run(["list", "--version"])
    expect(status).toBe(2)
    const parsed = expectSingleJsonErrorLine(stderr, stdout)
    expect(parsed).toEqual({ ok: false, errors: [{ ruleId: "context.invalid-request", path: "argv.flags.missing-value" }] })
  })

  it("positional junk after flags: one stable JSON line", () => {
    const { status, stdout, stderr } = run(["list", "--version", "personal-ui-context/1", "junk"])
    expect(status).toBe(2)
    const parsed = expectSingleJsonErrorLine(stderr, stdout)
    expect(parsed).toEqual({ ok: false, errors: [{ ruleId: "context.invalid-request", path: "argv.positional" }] })
  })

  it("a duplicate flag is rejected, not last-one-wins", () => {
    const { status, stdout, stderr } = run([
      "get", "--version", "personal-ui-context/1", "--theme", "quiet-editorial", "--theme", "quiet-editorial", "--resource", "button",
    ])
    expect(status).toBe(2)
    const parsed = expectSingleJsonErrorLine(stderr, stdout)
    expect(parsed).toEqual({ ok: false, errors: [{ ruleId: "context.invalid-request", path: "argv.flags.duplicate" }] })
  })

  it("list rejects theme/resource flags via the same evaluator unknown-field rule", () => {
    const { status, stdout, stderr } = run(["list", "--version", "personal-ui-context/1", "--theme", "quiet-editorial"])
    expect(status).toBe(1)
    const parsed = expectSingleJsonErrorLine(stderr, stdout)
    expect(parsed).toEqual({ ok: false, errors: [{ ruleId: "context.unknown-field", path: "theme" }] })
  })

  it("capabilities rejects theme/resource flags via the same evaluator unknown-field rule", () => {
    const { status, stdout, stderr } = run(["capabilities", "--version", "personal-ui-context/1", "--resource", "button"])
    expect(status).toBe(1)
    const parsed = expectSingleJsonErrorLine(stderr, stdout)
    expect(parsed).toEqual({ ok: false, errors: [{ ruleId: "context.unknown-field", path: "resource" }] })
  })

  it("get requires both theme and resource, enforced by the evaluator", () => {
    const { status, stdout, stderr } = run(["get", "--version", "personal-ui-context/1", "--theme", "quiet-editorial"])
    expect(status).toBe(1)
    const parsed = expectSingleJsonErrorLine(stderr, stdout)
    expect(parsed).toEqual({ ok: false, errors: [{ ruleId: "context.invalid-request", path: "resource" }] })
  })

  it("is byte-identical across separate process invocations", () => {
    const first = run(["get", "--version", "personal-ui-context/1", "--theme", "quiet-editorial", "--resource", "input"])
    const second = run(["get", "--version", "personal-ui-context/1", "--theme", "quiet-editorial", "--resource", "input"])
    expect(first.stdout).toBe(second.stdout)
  })
})
