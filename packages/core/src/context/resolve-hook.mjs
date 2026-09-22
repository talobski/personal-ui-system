// Node's ESM resolver requires explicit file extensions on relative specifiers, but this package's TypeScript
// sources (like the rest of packages/core) omit them, matching the bundler-based resolution every other consumer
// (Vite, Vitest, tsc) already uses. Rather than editing import specifiers across the package, this loader hook
// retries an extensionless relative specifier with ".ts" (and "/index.ts") appended before falling back to Node's
// default resolution. It changes no source file and adds no runtime behavior beyond specifier resolution.
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && !/\.[A-Za-z0-9]+$/.test(specifier)) {
    try {
      return await nextResolve(`${specifier}.ts`, context)
    } catch {
      return await nextResolve(`${specifier}/index.ts`, context)
    }
  }
  return nextResolve(specifier, context)
}
