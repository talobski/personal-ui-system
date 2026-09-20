import { spawnSync } from "node:child_process"
import { writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { API_KEY, makePacket, makeProject, readState } from "./testkit.ts"

const cli = join(dirname(fileURLToPath(import.meta.url)), "cli.ts")

const runCli = (args: string[], env: Record<string, string | undefined> = {}, input?: string) =>
  spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", cli, ...args], {
    encoding: "utf8",
    input,
    env: { PATH: process.env.PATH, HOME: "/nonexistent-home", ...env },
    timeout: 20_000,
  })

describe("cli", () => {
  it("prints usage and exits 2 without a packet", () => {
    const result = runCli([])
    expect(result.status).toBe(2)
    expect(result.stderr).toContain("usage: jev")
  })
  it("exits 2 on unknown flags, bad timeouts and unreadable packets", () => {
    expect(runCli(["--bogus"]).status).toBe(2)
    expect(runCli(["--packet", "x.json", "--timeout-ms", "0"]).status).toBe(2)
    expect(runCli(["--packet", "/definitely/missing.json"]).status).toBe(2)
  })
  it("fails closed with exit 1 and no charge when TYPESAFE_API_KEY is missing", async () => {
    const fx = await makeProject()
    const packetPath = join(fx.dir, "packet.json")
    await writeFile(packetPath, JSON.stringify(makePacket()))
    const result = runCli(["--packet", packetPath, "--project-dir", fx.dir, "--policy", fx.policyPath])
    expect(result.status).toBe(1)
    const outcome = JSON.parse(result.stdout)
    expect(outcome).toMatchObject({ accepted: false, status: "denied", reason: { code: "denied.missing-api-key" } })
    expect((await readState(fx)).counters.calls).toBe(0)
  })
  it("rejects an unsafe packet from stdin before reaching the network, without echoing the key", async () => {
    const fx = await makeProject()
    const packet = makePacket()
    packet.admission.authority.paidCapacity = true
    const result = runCli(["--packet", "-", "--project-dir", fx.dir, "--policy", fx.policyPath], { TYPESAFE_API_KEY: API_KEY }, JSON.stringify(packet))
    expect(result.status).toBe(1)
    expect(JSON.parse(result.stdout)).toMatchObject({ status: "rejected", reason: { code: "packet.paid-capacity" } })
    expect(result.stdout + result.stderr).not.toContain(API_KEY)
    expect((await readState(fx)).counters.calls).toBe(0)
  })
  it("denies when the policy file is missing (no default-home fallback)", async () => {
    const fx = await makeProject()
    const packetPath = join(fx.dir, "packet.json")
    await writeFile(packetPath, JSON.stringify(makePacket()))
    const result = runCli(["--packet", packetPath, "--project-dir", fx.dir], { TYPESAFE_API_KEY: API_KEY })
    expect(result.status).toBe(1)
    expect(JSON.parse(result.stdout).reason.code).toBe("denied.policy-unavailable")
  })
})
