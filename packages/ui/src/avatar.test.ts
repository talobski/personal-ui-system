import { readFileSync, readdirSync } from "node:fs"
import { describe, expect, it } from "vitest"
// Relative import: this worktree's core, not whatever the linked node_modules package resolves to.
import { avatarInitial as coreInitial, validateComponentState } from "../../core/src/constraints/component-state"

import { avatarInitial } from "./components/avatar"

const names = ["Ada Lovelace", "grace hopper", "  Émile Borel", "@katherine", "7 of Nine", "ßen", "李 小龙", "😀 Smile", "   ", "", "—"]

describe("Avatar initials (WSSP-08)", () => {
  it("derives exactly one first meaningful character", () => {
    expect(names.map(avatarInitial)).toEqual(["A", "G", "É", "K", "7", "ß", "李", "S", "?", "?", "?"])
    for (const name of names) expect([...avatarInitial(name)]).toHaveLength(1)
  })

  it("matches the core avatar.single-initial rule for every name", () => {
    for (const name of names) {
      expect(coreInitial(name)).toBe(avatarInitial(name))
      if (!name.trim()) continue
      const state = { kind: "avatar", displayName: name, fallbackText: avatarInitial(name), fallbackBackground: "muted", fallbackForeground: "muted-foreground", decorative: true, accessibleName: null }
      expect(validateComponentState(state).ok, name).toBe(true)
    }
  })

  it("uses Avatar for every initials-style avatar in compositions and stories, with no two-letter initials or literal colours", () => {
    const dirs = ["compositions", "components"].map((dir) => new URL(`./${dir}/`, import.meta.url))
    const files = dirs.flatMap((dir) => readdirSync(dir).filter((name) => name.endsWith(".tsx")).map((name) => ({ name, text: readFileSync(new URL(name, dir), "utf8") })))
    const users = files.filter((file) => file.name !== "avatar.tsx" && file.text.includes("<Avatar"))
    // PUI-103 removes the Chat contact header, so team-chat.tsx no longer renders an Avatar.
    expect(users.map((file) => file.name).sort()).toEqual(["account-profile.tsx", "avatar.stories.tsx", "message.stories.tsx", "sidebar.stories.tsx", "team-access.tsx"])
    for (const file of files) {
      // No hand-rolled initials bubble: a rounded-full span holding capital letters.
      expect(file.text, file.name).not.toMatch(/rounded-full[^>]*>\s*(?:[A-Z]{1,3}|\{initials\})\s*</)
      expect(file.text, file.name).not.toMatch(/\["[A-Z]{2}", "/)
    }
    for (const file of users) {
      expect(file.text, file.name).toMatch(/<AvatarFallback[^>]*>\{avatarInitial\(/)
      expect(file.text, file.name).not.toMatch(/<AvatarFallback[^>]*className="[^"]*\b(?:bg|text)-(?!xs|sm|base|lg)[a-z]+(?:-\d+)?\b/)
    }
  })
})
