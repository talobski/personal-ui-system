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

  it("an unknown resource fails closed: nonzero exit, stable JSON error on stderr, empty stdout", () => {
    const { status, stdout, stderr } = run(["get", "--version", "personal-ui-context/1", "--theme", "quiet-editorial", "--resource", "nope"])
    expect(status).toBe(1)
    expect(stdout).toBe("")
    expect(JSON.parse(stderr.trimEnd())).toEqual({ ok: false, errors: [{ ruleId: "context.unknown-resource", path: "resource" }] })
  })

  it("rejects an unsupported flag rather than silently ignoring it", () => {
    const { status, stdout, stderr } = run(["list", "--version", "personal-ui-context/1", "--output", "/tmp/x.json"])
    expect(status).toBe(2)
    expect(stdout).toBe("")
    expect(stderr).toContain("unsupported flag")
  })

  it("has no network, write, path, or output option to reject in the first place", () => {
    const { stderr } = run(["list", "--version", "personal-ui-context/1", "--write", "x"])
    expect(stderr).toContain("unsupported flag")
  })

  it("is byte-identical across separate process invocations", () => {
    const first = run(["get", "--version", "personal-ui-context/1", "--theme", "quiet-editorial", "--resource", "input"])
    const second = run(["get", "--version", "personal-ui-context/1", "--theme", "quiet-editorial", "--resource", "input"])
    expect(first.stdout).toBe(second.stdout)
  })
})
