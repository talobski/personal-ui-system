import { readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const components = dirname(fileURLToPath(import.meta.url))
const root = join(components, "components")
const source = (name: string) => readFileSync(join(root, name), "utf8")

describe("shadcn foundation", () => {
  it("keeps explicit Playwright checks as the Storybook matrix's sole automated axe owner", () => {
    const preview = readFileSync(join(components, "../.storybook/preview.ts"), "utf8")
    const main = readFileSync(join(components, "../.storybook/main.ts"), "utf8")
    expect(preview).toMatch(/parameters:\s*\{\s*a11y:\s*\{\s*test:\s*"off"/)
    expect(main).toContain('addons: ["@storybook/addon-a11y"]')

    const repo = join(components, "../../..")
    const config = readFileSync(join(repo, "playwright.config.ts"), "utf8")
    const ignoredBlock = config.match(/testIgnore:\s*\[([\s\S]*?)\]/)
    expect(ignoredBlock).not.toBeNull()
    const ignored = [...ignoredBlock![1]!.matchAll(/"([^"]+)"/g)].map(match => match[1])
    const specs = readdirSync(join(repo, "e2e")).filter(name => name.endsWith(".spec.ts") && !ignored.includes(name))
    expect(specs.length).toBeGreaterThan(0)
    for (const name of specs) {
      const spec = readFileSync(join(repo, "e2e", name), "utf8")
      expect(spec, name).toMatch(/new AxeBuilder\(\{ page \}\)\.analyze\(\)/)
      expect(spec, name).toContain('impact === "critical"')
      expect(spec, name).toContain('impact === "serious"')
      expect(spec, name).toContain(".attach(")
      expect(spec, name).toContain(".toEqual([])")
    }
  })

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

  it("keeps Slider and Collapsible as thin shadcn-derived Radix compositions (TSV2-08, TSV2-09)", () => {
    const slider = source("slider.tsx")
    const collapsible = source("collapsible.tsx")
    expect(slider).toContain('from "@radix-ui/react-slider"')
    expect(slider).toContain('data-slot="slider"')
    expect(slider).toContain('data-slot="slider-thumb"')
    expect(collapsible).toContain('from "@radix-ui/react-collapsible"')
    expect(collapsible).toContain('data-slot="collapsible-trigger"')
    for (const implementation of [slider, collapsible]) {
      expect(implementation).not.toMatch(/onKeyDown|onPointer|addEventListener/)
      expect(implementation).not.toMatch(/focusTrap|trapFocus|dismissOnEscape/i)
    }
    const pkg = JSON.parse(readFileSync(join(components, "../package.json"), "utf8")) as { dependencies: Record<string, string> }
    expect(pkg.dependencies["@radix-ui/react-slider"]).toBe("1.4.7")
    expect(pkg.dependencies["@radix-ui/react-collapsible"]).toBe("1.1.20")
  })

  it("keeps Select, Combobox, and Chart as thin shadcn-derived compositions over pinned primitives (WCPR-04, WCPR-05, WCPR-11)", () => {
    const select = source("select.tsx")
    const combobox = source("combobox.tsx")
    const chart = source("chart.tsx")
    expect(select).toContain('Select as SelectPrimitive } from "@base-ui/react/select"')
    expect(select).toContain('data-slot="select-trigger"')
    expect(select).toContain('data-slot="select-item"')
    expect(combobox).toContain('from "@base-ui/react/combobox"')
    expect(combobox).toContain('data-slot="combobox-input"')
    expect(combobox).toContain('data-slot="combobox-item"')
    expect(chart).toContain('import * as RechartsPrimitive from "recharts"')
    expect(chart).toContain('data-slot="chart"')
    expect(chart).toContain("--color-${key}")
    for (const implementation of [select, combobox, chart]) {
      expect(implementation).not.toMatch(/onKeyDown|onPointer|addEventListener/)
      expect(implementation).not.toMatch(/focusTrap|trapFocus|dismissOnEscape/i)
      expect(implementation).not.toMatch(/https?:\/\//)
    }
    const pkg = JSON.parse(readFileSync(join(components, "../package.json"), "utf8")) as { dependencies: Record<string, string> }
    expect(pkg.dependencies["@base-ui/react"]).toBe("1.8.0")
    expect(pkg.dependencies.recharts).toBe("3.10.1")
    // The native select stays in place where native behavior is intended.
    expect(readdirSync(root)).toContain("native-select.tsx")
  })

  it("keeps Sidebar and Avatar as thin shadcn-derived compositions on semantic tokens (WSSP-02)", () => {
    const sidebar = source("sidebar.tsx")
    const avatar = source("avatar.tsx")
    expect(sidebar).toContain('import { Dialog as SheetPrimitive, Slot } from "radix-ui"')
    expect(sidebar).toContain('from "class-variance-authority"')
    for (const slot of ["sidebar-wrapper", "sidebar-gap", "sidebar-container", "sidebar-inset", "sidebar-header", "sidebar-content", "sidebar-footer", "sidebar-menu-button", "sidebar-menu-action", "sidebar-trigger"]) expect(sidebar).toContain(`data-slot="${slot}"`)
    expect(sidebar).toContain('const SIDEBAR_WIDTH_MOBILE = "18rem"')
    expect(sidebar).toContain('<span className="sr-only">Toggle Sidebar</span>')
    // Adapted to the existing semantic tokens: no sidebar-specific colour utilities, no literal colours, no cookie.
    expect(sidebar).not.toMatch(/(?:bg|text|border|ring|outline|shadow)-sidebar|--sidebar-(?:background|foreground|accent|border|ring|primary)|hsl\(|#[0-9a-f]{3,8}\b/i)
    expect(sidebar).not.toMatch(/document\.cookie|localStorage|sessionStorage|Math\.random/)
    expect(avatar).toContain('import { Avatar as AvatarPrimitive } from "radix-ui"')
    expect(avatar).toContain('data-slot="avatar-fallback"')
    expect(avatar).toMatch(/bg-muted text-muted-foreground/)
    expect(avatar).not.toMatch(/bg-(?!muted\b)[a-z]+-\d|#[0-9a-f]{3,8}\b/i)
    for (const implementation of [sidebar, avatar]) {
      expect(implementation).not.toMatch(/focusTrap|trapFocus|dismissOnEscape|onPointer/i)
      expect(implementation).not.toMatch(/https?:\/\//)
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
    expect(item("slider")?.dependencies).toEqual(["cn", "@radix-ui/react-slider@1.4.7"])
    expect(item("collapsible")?.dependencies).toEqual(["@radix-ui/react-collapsible@1.1.20"])
    expect(item("select")?.dependencies).toEqual(["cn", "lucide-react", "@base-ui/react@1.8.0"])
    expect(item("combobox")?.dependencies).toEqual(["cn", "lucide-react", "@base-ui/react@1.8.0"])
    expect(item("chart")?.dependencies).toEqual(["cn", "recharts@3.10.1"])
    expect(item("sidebar")?.dependencies).toEqual(["cn", "class-variance-authority", "lucide-react", "radix-ui"])
    expect(item("sidebar")?.registryDependencies).toEqual(["button", "input", "separator"])
    expect(item("avatar")?.dependencies).toEqual(["cn", "radix-ui"])
    expect(registry.items.map((entry) => entry.name).sort()).toEqual([
      "avatar",
      "button",
      "card",
      "chart",
      "collapsible",
      "combobox",
      "field",
      "input",
      "native-select",
      "resizable-panel",
      "responsive-dialog",
      "select",
      "sidebar",
      "single-toggle-group",
      "slider",
      "switch",
      "tabs",
      "textarea",
    ])
  })
})
