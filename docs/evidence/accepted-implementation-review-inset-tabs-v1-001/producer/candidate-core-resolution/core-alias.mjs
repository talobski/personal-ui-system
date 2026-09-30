// The worktree's node_modules is a symlink into the canonical checkout, where the `@personal-ui/core` workspace link
// points at the canonical packages/core. These aliases pin every `@personal-ui/core` export (package.json "exports")
// to THIS worktree's source so builds and tests exercise the candidate. Evidence tooling only; not product config.
import { fileURLToPath } from "node:url"
const core = fileURLToPath(new URL("../../../../../packages/core/src", import.meta.url))
export const coreAlias = [
  { find: /^@personal-ui\/core$/, replacement: `${core}/index.ts` },
  { find: /^@personal-ui\/core\/theme\/fixtures\/(.*)$/, replacement: `${core}/theme/fixtures/$1` },
  { find: /^@personal-ui\/core\/jev-design\/evaluate$/, replacement: `${core}/jev-design/evaluate.ts` },
]
