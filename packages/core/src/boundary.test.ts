import { readdirSync, readFileSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const srcDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(srcDir, "../../..")

const IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)["']([^"']+)["']/g

export const importSpecifiers = (source: string) => [...source.matchAll(IMPORT)].map((m) => m[1]!)

const FORBIDDEN_PACKAGES = ["@personal-ui/workbench", "@personal-ui/ui", "react", "react-dom", "tailwindcss", "storybook", "vite"]

/** Returns human-readable violations for one core source file. */
export function findViolations(file: string, source: string): string[] {
  const violations: string[] = []
  for (const spec of importSpecifiers(source)) {
    const target = spec.startsWith(".") ? resolve(dirname(file), spec) : undefined
    if (target !== undefined && (relative(join(repoRoot, "packages/core"), target).startsWith("..") || target.includes(`${sep}apps${sep}workbench`))) {
      violations.push(`${file}: relative import "${spec}" leaves packages/core`)
    }
    if (spec.includes("apps/workbench")) violations.push(`${file}: import "${spec}" reaches apps/workbench`)
    if (FORBIDDEN_PACKAGES.some((name) => spec === name || spec.startsWith(`${name}/`))) {
      violations.push(`${file}: import "${spec}" is not allowed in core`)
    }
  }
  return violations
}

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? sourceFiles(join(dir, entry.name)) : entry.name.endsWith(".ts") ? [join(dir, entry.name)] : []
  )

describe("core import boundary", () => {
  it("rejects imports from apps/workbench and other outward dependencies", () => {
    const file = join(srcDir, "index.ts")
    const bad = [
      `import x from "../../../apps/workbench/src/main"`,
      `import x from "@personal-ui/workbench"`,
      `export * from "../../ui/src/components/button"`,
      `const m = await import("apps/workbench/thing")`,
      `import { useState } from "react"`,
    ]
    for (const source of bad) expect(findViolations(file, source), source).not.toEqual([])
    expect(findViolations(file, `import { z } from "zod"\nimport a from "./theme/schema"`)).toEqual([])
  })

  it("finds no forbidden imports in any core source file", () => {
    const files = sourceFiles(srcDir)
    expect(files.length).toBeGreaterThan(5)
    const violations = files
      // Tests may use node built-ins; the boundary rules above still apply to them.
      .flatMap((file) => findViolations(file, readFileSync(file, "utf8")))
      // This file's own fixtures contain forbidden specifiers as string data.
      .filter((v) => !v.startsWith(join(srcDir, "boundary.test.ts")))
    expect(violations).toEqual([])
  })
})
