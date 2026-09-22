import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const components = dirname(fileURLToPath(import.meta.url))
const root = join(components, "components")
const source = (name: string) => readFileSync(join(root, name), "utf8")

describe("shadcn foundation", () => {
  it("keeps Button and Input as thin shadcn-derived components", () => {
    const button = source("button.tsx")
    const input = source("input.tsx")
    expect(button).toContain("class-variance-authority")
    expect(button).toContain('from "radix-ui"')
    expect(button).toContain('data-slot="button"')
    expect(input).toContain('data-slot="input"')
    expect(input).toContain('React.ComponentProps<"input">')
    for (const implementation of [button, input]) {
      expect(implementation).not.toMatch(/addEventListener\(["']keydown/)
      expect(implementation).not.toMatch(/focusTrap|trapFocus|dismissOnEscape/i)
    }
  })

  it("keeps Field and NativeSelect as shadcn-derived native form composition", () => {
    const field = source("field.tsx")
    const nativeSelect = source("native-select.tsx")
    expect(field).toContain('data-slot="field"')
    expect(field).toContain('from "class-variance-authority"')
    expect(field).toContain('from "@personal-ui/ui/components/label"')
    expect(nativeSelect).toContain('React.ComponentProps<"select">')
    expect(nativeSelect).toContain('data-slot="native-select"')
    expect(nativeSelect).toContain('from "lucide-react"')
    for (const implementation of [field, nativeSelect]) {
      expect(implementation).not.toMatch(/addEventListener\(["']keydown/)
      expect(implementation).not.toMatch(/role=["'](?:combobox|listbox)/)
      expect(implementation).not.toMatch(/focusTrap|trapFocus|dismissOnEscape/i)
    }
  })

  it("delegates dialog focus and dismissal to Radix/Vaul primitives", () => {
    const dialog = source("dialog.tsx")
    const drawer = source("drawer.tsx")
    const responsive = source("responsive-dialog.tsx")
    expect(dialog).toContain('Dialog as DialogPrimitive')
    expect(drawer).toContain('Drawer as DrawerPrimitive')
    expect(responsive).toContain('const MOBILE_QUERY = "(max-width: 640px)"')
    expect(responsive).toContain("isMobile ? Drawer : Dialog")
    for (const implementation of [dialog, drawer, responsive]) {
      expect(implementation).not.toMatch(/addEventListener\(["']keydown/)
      expect(implementation).not.toMatch(/focusTrap|trapFocus|dismissOnEscape/i)
    }
  })

  it("keeps Card, Tabs, Switch, Textarea, and SingleToggleGroup as thin shadcn-derived compositions", () => {
    const card = source("card.tsx")
    const tabs = source("tabs.tsx")
    const switchSource = source("switch.tsx")
    const textarea = source("textarea.tsx")
    const singleToggleGroup = source("single-toggle-group.tsx")
    expect(card).toContain('data-slot="card"')
    expect(tabs).toContain('from "radix-ui"')
    expect(tabs).toContain('data-slot="tabs"')
    expect(switchSource).toContain('from "radix-ui"')
    expect(switchSource).toContain('data-slot="switch"')
    expect(textarea).toContain('React.ComponentProps<"textarea">')
    expect(singleToggleGroup).toContain('from "@personal-ui/ui/components/toggle-group"')
    for (const implementation of [card, tabs, switchSource, textarea, singleToggleGroup]) {
      expect(implementation).not.toMatch(/addEventListener\(["']keydown/)
      expect(implementation).not.toMatch(/focusTrap|trapFocus|dismissOnEscape/i)
    }
  })

  it("declares the pilot dependency provenance in the shadcn registry", () => {
    const registry = JSON.parse(readFileSync(join(components, "../../../registry.json"), "utf8")) as {
      items: Array<{ name: string; dependencies?: string[]; registryDependencies?: string[] }>
    }
    const item = (name: string) => registry.items.find((entry) => entry.name === name)
    expect(item("button")?.dependencies).toEqual(expect.arrayContaining(["class-variance-authority", "radix-ui"]))
    expect(item("input")?.dependencies).toEqual(expect.arrayContaining(["cn"]))
    expect(item("field")?.dependencies).toEqual(expect.arrayContaining(["class-variance-authority", "cn", "radix-ui"]))
    expect(item("field")?.registryDependencies).toEqual(expect.arrayContaining(["label", "separator"]))
    expect(item("native-select")?.dependencies).toEqual(expect.arrayContaining(["cn", "lucide-react"]))
    expect(item("responsive-dialog")?.registryDependencies).toEqual(expect.arrayContaining(["dialog", "drawer"]))
    expect(item("card")?.dependencies).toEqual(expect.arrayContaining(["cn"]))
    expect(item("tabs")?.dependencies).toEqual(expect.arrayContaining(["cn", "radix-ui"]))
    expect(item("switch")?.dependencies).toEqual(expect.arrayContaining(["cn", "radix-ui"]))
    expect(item("textarea")?.dependencies).toEqual(expect.arrayContaining(["cn"]))
    expect(item("single-toggle-group")?.registryDependencies).toEqual(expect.arrayContaining(["toggle-group", "toggle"]))
    expect(registry.items.map((entry) => entry.name).sort()).toEqual([
      "button",
      "card",
      "field",
      "input",
      "native-select",
      "responsive-dialog",
      "single-toggle-group",
      "switch",
      "tabs",
      "textarea",
    ])
  })
})
