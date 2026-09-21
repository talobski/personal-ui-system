#!/usr/bin/env node
/**
 * Node 22 does not strip TypeScript inside node_modules.  The pinned shared
 * runtime is source-only, so this launcher makes a transient JS build from
 * that immutable package and executes its CLI.  It contains no runtime logic
 * and never writes the package or project state.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"
import { createRequire, stripTypeScriptTypes } from "node:module"
import { spawnSync } from "node:child_process"

const require = createRequire(import.meta.url)
const runtimeCli = require.resolve("@loop-engineering/jev-core/src/cli.ts")
const runtimeSource = dirname(runtimeCli)
const outputRoot = mkdtempSync(join(tmpdir(), "personal-ui-jev-"))

const emit = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const source = join(directory, entry.name)
    if (entry.isDirectory()) emit(source)
    else if (entry.isFile() && entry.name.endsWith(".ts")) {
      const target = join(outputRoot, relative(runtimeSource, source)).replace(/\.ts$/, ".js")
      const javascript = stripTypeScriptTypes(readFileSync(source, "utf8"), { mode: "strip", sourceUrl: source })
        .replaceAll(/(from\s+["'][^"']+)\.ts(["'])/g, "$1.js$2")
      writeFileSync(target, javascript)
    }
  }
}

emit(runtimeSource)
const result = spawnSync(process.execPath, [resolve(outputRoot, "cli.js"), ...process.argv.slice(2)], { stdio: "inherit", env: process.env })
rmSync(outputRoot, { recursive: true, force: true })
if (result.error) throw result.error
process.exitCode = result.status ?? 1
