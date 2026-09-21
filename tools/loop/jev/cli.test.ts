import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import { describe, expect, it } from "vitest"

describe("jev CLI launcher", () => {
  it("loads the pinned runtime on Node 22 and fails closed before any transport without a credential", () => {
    const directory = mkdtempSync(join(tmpdir(), "personal-ui-jev-probe-"))
    const packet = join(directory, "safe-packet.json")
    writeFileSync(packet, "{}\n")
    const result = spawnSync(process.execPath, ["tools/loop/jev/cli.mjs", "--packet", packet, "--project-dir", directory, "--policy", join(directory, "no-policy.json")], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, TYPESAFE_LOOP_ENGINEERING_API_KEY: "" },
    })
    expect(result.error).toBeUndefined()
    expect(result.status).toBe(1)
    expect(result.stderr).not.toContain("ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING")
    expect(result.stdout).toContain('"code": "denied.policy-unavailable"')
  })
})
