import * as React from "react"
import { ArrowRight, ArrowUpRight, Moon, Sun } from "@personal-ui/ui/lib/workbench-icons"

import { resolveUiEffects } from "@personal-ui/core"
import type { Theme } from "@personal-ui/core"
import { Button } from "@personal-ui/ui/components/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@personal-ui/ui/components/card"
import { ScrollArea } from "@personal-ui/ui/components/scroll-area"
import { Separator } from "@personal-ui/ui/components/separator"
import { SingleToggleGroup } from "@personal-ui/ui/components/single-toggle-group"
import { Switch } from "@personal-ui/ui/components/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@personal-ui/ui/components/tabs"
import { PlanUsage } from "@personal-ui/ui/compositions/plan-usage"
import { QuickFind } from "@personal-ui/ui/compositions/quick-find"
import { RevenueOverview } from "@personal-ui/ui/compositions/revenue-overview"
import { TeamChat } from "@personal-ui/ui/compositions/team-chat"
import { NowPlaying } from "@personal-ui/ui/compositions/now-playing"
import { RecentActivity } from "@personal-ui/ui/compositions/recent-activity"
import { FONT_CATALOG, findFontOption } from "@personal-ui/ui/lib/fonts"

import { COLOR_GROUPS, readFontStack, TYPE_ROLE_GROUPS } from "./controls"
import { DEFAULT_THEME_ID, exportThemeCss, exportThemeJson, loadBuiltInThemes, previewVariablesCss } from "./lifecycle"
import type { Mode } from "./lifecycle"
import { builtInThemePath, LANDING_PATH, linkClick, WORKBENCH_PATH } from "./routes"

/**
 * PUI-143: the public landing page at `/`. It is composed only from the accepted shadcn primitives and shared
 * compositions, and it wears the same committed built-in Theme v3 fixtures the Workbench ships with: the theme dial
 * renders their real variable CSS onto this document, so every claim about theming is demonstrated, not illustrated.
 * Nothing here edits, saves or persists a theme; the Workbench at `/workbench` remains the only editor.
 */

const builtIns = loadBuiltInThemes()
const builtInById = (id: string) => builtIns.find((theme) => theme.id === id)

const BUILT_IN_NOTES: Readonly<Record<string, string>> = {
  default: "A neutral, high-contrast grayscale with a soft radius. The fresh-state starting point.",
  "quiet-editorial": "Ink-blue primary on cool, paper-white neutrals, set entirely in Inter.",
  "amber-dusk": "Terracotta primary over warm stone neutrals, with lavender chart accents.",
}

const fontName = (stack: readonly string[]) => findFontOption("any", stack)?.label ?? (stack[0]?.startsWith("ui-") ? "System" : (stack[0] ?? "System"))

/** Same-origin in-app link: a real `<a href>` (new tab and copy-link keep working) that navigates without reloading. */
function AppLink({ href, className, children, ...props }: React.ComponentProps<"a"> & { href: string }) {
  return (
    <a href={href} onClick={linkClick} className={className} {...props}>
      {children}
    </a>
  )
}

/** The page's own mark: four identifying colours of the theme it is wearing, the same tokens as the Workbench swatches. */
function Mark({ theme, mode }: { theme: Theme; mode: Mode }) {
  return (
    <span aria-hidden="true" className="grid size-6 grid-cols-2 gap-0.5 rounded-md p-0.5 ring-1 ring-border">
      {(["primary", "accent", "secondary", "border"] as const).map((token) => (
        <span key={token} className="rounded-[3px]" style={{ backgroundColor: theme.colors[mode][token].$value }} />
      ))}
    </span>
  )
}

function Swatches({ theme, mode, className = "size-2.5" }: { theme: Theme; mode: Mode; className?: string }) {
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center gap-0.5">
      {(["primary", "accent", "secondary", "border"] as const).map((token) => (
        <span key={token} className={`${className} rounded-sm ring-1 ring-border`} style={{ backgroundColor: theme.colors[mode][token].$value }} />
      ))}
    </span>
  )
}

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <Switch
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="cursor-pointer"
      checked={mode === "dark"}
      onCheckedChange={(checked) => onChange(checked ? "dark" : "light")}
      thumbContent={mode === "dark" ? <Moon aria-hidden="true" className="size-2.5" /> : <Sun aria-hidden="true" className="size-2.5" />}
    />
  )
}

const SECTIONS = [
  { id: "anatomy", label: "Theme" },
  { id: "workbench", label: "Workbench" },
  { id: "code", label: "Code" },
  { id: "command", label: "Command" },
  { id: "themes", label: "Built-ins" },
] as const

function SectionIntro({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid max-w-2xl gap-4">
      <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">{eyebrow}</p>
      <h2 id={`${id}-title`} className="type-heading text-3xl tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      <div className="grid gap-3 text-base leading-relaxed text-pretty text-muted-foreground">{children}</div>
    </div>
  )
}

/**
 * The hero's specimen board: real shared compositions, rendered with whichever built-in the page is wearing. It is a
 * picture of the product, so it is inert (no tab stops, hidden from assistive tech) and described by its caption.
 */
function SpecimenBoard({ theme, mode, onThemeChange }: { theme: Theme; mode: Mode; onThemeChange: (id: string) => void }) {
  return (
    <figure className="landing-rise landing-delay-2 grid min-w-0 gap-0 overflow-hidden rounded-2xl border bg-card shadow-lg" aria-labelledby="specimen-caption">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b px-4 py-3">
        <figcaption id="specimen-caption" className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <span className="relative flex size-2 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex size-full rounded-full bg-primary opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          <span>
            Live on this page: shared compositions wearing <span className="font-medium text-foreground">{theme.name}</span>
          </span>
        </figcaption>
        <div data-testid="landing-theme-dial" className="max-w-full overflow-x-auto [&_[data-slot=toggle-group-item]]:cursor-pointer">
          <SingleToggleGroup
            label="Theme shown on this page"
            value={theme.id}
            onValueChange={onThemeChange}
            options={builtIns.map((option) => ({
              value: option.id,
              label: (
                <span className="flex items-center gap-2">
                  <Swatches theme={option} mode={mode} className="size-2 max-sm:hidden" />
                  {option.name}
                </span>
              ),
            }))}
          />
        </div>
      </div>
      <div
        inert
        data-testid="landing-specimen"
        className="relative max-h-[34rem] overflow-hidden bg-muted/40 p-4 [mask-image:linear-gradient(to_bottom,black_70%,transparent)] sm:p-6"
      >
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3 [&_[data-slot=card]]:shadow-none">
          <div className="grid gap-4">
            <PlanUsage />
            <NowPlaying />
          </div>
          <div className="grid gap-4 max-md:hidden">
            <TeamChat />
          </div>
          <div className="grid gap-4 max-lg:hidden">
            <QuickFind stable />
            <RecentActivity />
          </div>
        </div>
      </div>
    </figure>
  )
}

/** A spec sheet of the theme the page is wearing, read straight from its Theme v3 document. */
function ThemeAnatomy({ theme, mode }: { theme: Theme; mode: Mode }) {
  const colors = theme.colors[mode]
  const effects = resolveUiEffects(theme)
  const featured = ["background", "foreground", "primary", "secondary", "accent", "muted", "border", "ring"] as const
  const charts = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"] as const
  const radii = (["sm", "md", "lg", "xl"] as const).map((step) => ({ step, value: theme.radius[step].$value }))
  const shadows = ["sm", "md", "lg"] as const
  return (
    <Card data-testid="landing-anatomy" className="gap-0 overflow-hidden py-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-6 py-4">
        <p className="text-sm font-medium">
          {theme.name} <span className="font-normal text-muted-foreground">· {mode}</span>
        </p>
        <p className="font-mono text-xs text-muted-foreground">schemaVersion {theme.schemaVersion}</p>
      </div>
      <dl className="grid divide-y">
        <div className="grid gap-4 px-6 py-5">
          <dt className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Color</dt>
          <dd className="grid gap-4">
            <ul className="grid grid-cols-2 gap-x-3 gap-y-4 min-[480px]:grid-cols-4">
              {featured.map((token) => (
                <li key={token} className="grid min-w-0 gap-1.5">
                  <span aria-hidden="true" className="h-12 rounded-md ring-1 ring-border" style={{ backgroundColor: colors[token].$value }} />
                  <span className="truncate font-mono text-[11px] text-muted-foreground">{token}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="flex h-3 flex-1 overflow-hidden rounded-full ring-1 ring-border">
                {charts.map((token) => (
                  <span key={token} className="flex-1" style={{ backgroundColor: colors[token].$value }} />
                ))}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">chart-1…5</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {Object.keys(colors).length} semantic tokens per mode, light and dark, stored as OKLCH — in {COLOR_GROUPS.length} groups from Primary to Sidebar.
            </p>
          </dd>
        </div>
        <div className="grid gap-4 px-6 py-5">
          <dt className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Type</dt>
          <dd className="grid gap-3 sm:grid-cols-3">
            {TYPE_ROLE_GROUPS.map(({ role, title }) => (
              <div key={role} className="grid content-start gap-2">
                <span aria-hidden="true" className={`${role === "heading" ? "type-heading" : "type-body"} text-4xl leading-none`}>Aa</span>
                <span className="grid text-xs">
                  <span className="font-medium">{title}</span>
                  <span className="text-muted-foreground">
                    {fontName(readFontStack(theme, role))} · {theme.typography[role].weight.$value}
                  </span>
                </span>
              </div>
            ))}
            <div className="grid content-start gap-2">
              <span aria-hidden="true" className="font-mono text-4xl leading-none">{"{}"}</span>
              <span className="grid text-xs">
                <span className="font-medium">Mono</span>
                <span className="text-muted-foreground">{fontName(readFontStack(theme, "mono"))}</span>
              </span>
            </div>
          </dd>
        </div>
        <div className="grid gap-4 px-6 py-5">
          <dt className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Geometry</dt>
          <dd className="flex flex-wrap items-start gap-x-6 gap-y-4">
            {radii.map(({ step, value }) => (
              <div key={step} className="grid justify-items-start gap-1.5">
                <span aria-hidden="true" className="size-10 border-2 border-primary/70 bg-primary/10" style={{ borderRadius: value }} />
                <span className="grid font-mono text-[11px] text-muted-foreground">
                  <span>radius.{step}</span>
                  <span>{value}</span>
                </span>
              </div>
            ))}
            <div className="grid gap-1.5">
              <span aria-hidden="true" className="flex h-10 items-end gap-1">
                {[1, 2, 3, 4, 6].map((step) => (
                  <span key={step} className="w-1.5 rounded-sm bg-foreground/70" style={{ height: `calc(${theme.space.base.$value} * ${step * 1.5})` }} />
                ))}
              </span>
              <span className="grid font-mono text-[11px] text-muted-foreground">
                <span>space.base</span>
                <span>{theme.space.base.$value}</span>
              </span>
            </div>
          </dd>
        </div>
        <div className="grid gap-4 px-6 py-5">
          <dt className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Effects</dt>
          <dd className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="flex flex-wrap gap-4">
              {shadows.map((step) => (
                <div key={step} className="grid gap-1.5">
                  <span aria-hidden="true" className={`block h-10 w-16 rounded-md bg-card ring-1 ring-border/60 ${step === "sm" ? "shadow-sm" : step === "md" ? "shadow-md" : "shadow-lg"}`} />
                  <span className="font-mono text-[11px] text-muted-foreground">shadow.{step}</span>
                </div>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-right">
              Motion {theme.motion.durationBase.$value} · reduced motion respected
              <br />
              UI effect: {effects.effect === "tactile" ? `Tactile, strength ${effects.strength}` : "Off"}
            </p>
          </dd>
        </div>
      </dl>
    </Card>
  )
}

const EDITOR_TABS = [
  {
    value: "colors",
    label: "Colors",
    title: "Every semantic token, both modes",
    body: "Each colour group opens to its tokens with a native picker beside a text field that takes HEX, RGB, HSL or OKLCH. Values are normalised and stored as OKLCH.",
    items: COLOR_GROUPS.map((group) => group.title),
  },
  {
    value: "typography",
    label: "Typography",
    title: "Roles, not one-off font sizes",
    body: `Heading and Body each own a font, weight and tracking; Mono is the code face. Fonts come from a catalogue of ${FONT_CATALOG.length} families hosted with the app, so nothing loads from a font CDN.`,
    items: [...TYPE_ROLE_GROUPS.map((group) => group.title), "Mono"],
  },
  {
    value: "geometry",
    label: "Geometry",
    title: "Structure from two baselines",
    body: "Radius and Spacing set the base the whole scale is derived from, so cards, inputs and shells stay in proportion as you move them.",
    items: ["Radius", "Spacing"],
  },
  {
    value: "effects",
    label: "Effects",
    title: "Depth and feel, kept restrained",
    body: "Shadow colour, opacity, blur, spread and offset; motion duration; and the optional Tactile UI effect for secondary buttons and surface tabs, with one Strength control.",
    items: ["Shadow", "UI Effects", "Motion"],
  },
  {
    value: "command",
    label: "Command",
    title: "Directional requests, staged for review",
    body: "An experimental command box turns a short direction into a staged proposal. More on how it works, and its limits, below.",
    items: ["Staged proposal", "Preview", "Apply or Discard"],
  },
] as const

function EditorTour() {
  return (
    <Tabs defaultValue="colors" className="min-w-0 gap-4 self-start">
      <div className="max-w-full overflow-x-auto pb-1">
        <TabsList aria-label="Workbench editor categories" className="w-max">
          {EDITOR_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="cursor-pointer px-3">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {EDITOR_TABS.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="min-h-60 flex-none rounded-xl border bg-card p-6 text-card-foreground">
          <h3 className="type-heading text-lg">{tab.title}</h3>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{tab.body}</p>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label={`${tab.label} sections`}>
            {tab.items.map((item) => (
              <li key={item} className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium">
                {item}
              </li>
            ))}
          </ul>
        </TabsContent>
      ))}
    </Tabs>
  )
}

const AROUND_THE_EDITOR = [
  { title: "Four preview views", body: "Cards, Design system, App shells and States, rendered in an isolated frame from the live theme." },
  { title: "History per theme", body: "Undo, Redo and a confirmed Reset for each theme you touch in a session." },
  { title: "Built-ins stay intact", body: "Save As makes a custom copy; custom themes save to this browser's local storage." },
  { title: "Light and dark together", body: "Every colour has a value in both modes, and one switch previews either." },
] as const

function ThemeCode({ theme }: { theme: Theme }) {
  const files = React.useMemo(() => {
    const json = exportThemeJson(theme)
    const css = exportThemeCss(theme)
    return [
      { value: "json", label: "JSON", filename: json.filename, content: json.json },
      { value: "css", label: "CSS / Tailwind v4", filename: css.filename, content: css.css },
    ]
  }, [theme])
  return (
    <Tabs defaultValue="json" className="min-w-0 gap-3">
      <TabsList aria-label="Theme code format" className="w-max max-w-full">
        {files.map((file) => (
          <TabsTrigger key={file.value} value={file.value} className="cursor-pointer">
            {file.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {files.map((file) => (
        <TabsContent key={file.value} value={file.value} className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-muted">
          <div className="flex min-h-10 items-center justify-between gap-3 border-b bg-background px-4 py-2">
            <span className="truncate font-mono text-xs text-muted-foreground">{file.filename}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{file.content.split("\n").length} lines</span>
          </div>
          <ScrollArea
            type="auto"
            orientation="both"
            className="quiet-scroll-area h-80 min-w-0"
            viewportProps={{ role: "region", "aria-label": `${file.label} theme code`, tabIndex: 0, className: "focus-visible:ring-inset" }}
          >
            <pre data-testid={`landing-code-${file.value}`} className="w-max min-w-full p-4 font-mono text-xs leading-relaxed whitespace-pre text-foreground">
              <code>{file.content}</code>
            </pre>
          </ScrollArea>
        </TabsContent>
      ))}
    </Tabs>
  )
}

/** The six directional axes Design Command currently understands (`personal-ui-design-command/1`). */
const COMMAND_AXES = [
  { category: "Color", from: "cooler", to: "warmer" },
  { category: "Radius", from: "sharper", to: "rounder" },
  { category: "Density", from: "denser", to: "looser" },
  { category: "Typography", from: "neutral", to: "editorial" },
  { category: "Shadow", from: "softer", to: "stronger" },
  { category: "Motion", from: "slower", to: "faster" },
] as const

const COMMAND_STEPS = [
  { title: "Describe", body: "A short direction, such as “make it denser and warmer”." },
  { title: "Stage", body: "It becomes typed theme operations in one proposal. Manual controls pause." },
  { title: "Review", body: "The preview shows the candidate; your active theme is untouched." },
  { title: "Apply or Discard", body: "Apply is one undoable step. Discard leaves everything as it was." },
] as const

function BuiltInCard({ theme, mode }: { theme: Theme; mode: Mode }) {
  const colors = theme.colors[mode]
  const path = builtInThemePath(theme.id)!
  return (
    <Card className="min-w-0 gap-5 overflow-hidden pt-0">
      <div
        aria-hidden="true"
        className="grid gap-4 border-b p-5"
        style={{ backgroundColor: colors.background.$value, color: colors.foreground.$value, borderColor: colors.border.$value }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-lg font-semibold tracking-tight" style={{ fontFamily: readFontStack(theme, "heading").join(", ") }}>
            Aa
          </span>
          <span className="rounded-md px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: colors.primary.$value, color: colors["primary-foreground"].$value, borderRadius: theme.radius.md.$value }}>
            Primary
          </span>
        </div>
        <div className="flex h-12 items-end gap-1.5">
          {(["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"] as const).map((token, index) => (
            <span key={token} className="flex-1 rounded-t-sm" style={{ backgroundColor: colors[token].$value, height: `${[55, 80, 45, 100, 65][index]}%` }} />
          ))}
        </div>
        <div className="flex gap-1.5">
          {(["secondary", "accent", "muted", "border"] as const).map((token) => (
            <span key={token} className="h-2 flex-1 rounded-full" style={{ backgroundColor: colors[token].$value }} />
          ))}
        </div>
      </div>
      <CardHeader>
        <CardTitle>
          <h3 className="type-heading text-lg">{theme.name}</h3>
        </CardTitle>
        <CardDescription>{BUILT_IN_NOTES[theme.id]}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <p className="truncate rounded-md border bg-muted px-2.5 py-1.5 font-mono text-xs text-muted-foreground">{path}</p>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" size="sm" className="w-full">
          <AppLink href={path} data-testid={`landing-open-${theme.id}`}>
            Open {theme.name} in the Workbench
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </AppLink>
        </Button>
      </CardFooter>
    </Card>
  )
}

function useLandingTheme() {
  const [themeId, setThemeId] = React.useState(DEFAULT_THEME_ID)
  const [mode, setMode] = React.useState<Mode>(() => (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"))
  const theme = builtInById(themeId) ?? builtInById(DEFAULT_THEME_ID)!
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark")
    return () => document.documentElement.classList.remove("dark")
  }, [mode])
  return { theme, mode, setThemeId, setMode }
}

export function Landing() {
  const { theme, mode, setThemeId, setMode } = useLandingTheme()
  const css = React.useMemo(() => previewVariablesCss(theme), [theme])

  return (
    <div data-testid="landing" data-theme-id={theme.id} data-mode={mode} className="landing min-h-dvh bg-background text-foreground">
      {/* The page wears a built-in's real Theme v3 variables; nothing is saved or persisted. */}
      <style id="landing-theme">{css}</style>
      <a href="#main" className="fixed top-3 left-3 z-50 -translate-y-20 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus-visible:translate-y-0 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-5 sm:px-8">
          <AppLink href={LANDING_PATH} className="flex items-center gap-2.5 rounded-md text-sm font-semibold tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
            <Mark theme={theme} mode={mode} />
            Personal UI
          </AppLink>
          <nav aria-label="Sections" className="ml-4 hidden items-center gap-1 lg:flex">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {section.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <ModeSwitch mode={mode} onChange={setMode} />
            <Button asChild size="sm">
              <AppLink href={WORKBENCH_PATH} data-testid="landing-header-cta">
                Open Workbench
              </AppLink>
            </Button>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="outline-none">
        {/* Hero */}
        <section aria-labelledby="hero-title" className="relative overflow-hidden">
          <div aria-hidden="true" className="landing-glow pointer-events-none absolute inset-x-0 top-0 h-[36rem]" />
          <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-5 pt-14 pb-20 sm:px-8 sm:pt-20 lg:gap-14">
            <div className="grid gap-8">
              <div className="landing-rise grid gap-6">
                <p className="w-fit rounded-full border bg-background/60 px-3 py-1 font-mono text-xs text-muted-foreground">A personal design system on shadcn/ui</p>
                <h1 id="hero-title" className="type-heading max-w-4xl text-5xl leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-7xl">
                  Shape a theme once. Every surface follows.
                </h1>
              </div>
              <div className="landing-rise landing-delay-1 grid gap-6 lg:grid-cols-[minmax(0,38rem)_auto] lg:items-end lg:justify-between">
                <p className="text-lg leading-relaxed text-pretty text-muted-foreground">
                  Personal UI keeps your colours, type, geometry and effects in one validated Theme v3 document. The Workbench edits it live against real components and app
                  shells, then hands it back as JSON or Tailwind CSS.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" className="group">
                    <AppLink href={WORKBENCH_PATH} data-testid="landing-primary-cta">
                      Open the Workbench
                      <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </AppLink>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <a href="#themes">Browse the built-ins</a>
                  </Button>
                </div>
              </div>
            </div>
            <SpecimenBoard theme={theme} mode={mode} onThemeChange={setThemeId} />
          </div>
        </section>

        {/* Anatomy */}
        <section id="anatomy" aria-labelledby="anatomy-title" className="scroll-mt-20 border-t bg-muted/30">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
            <div className="lg:sticky lg:top-28">
              <SectionIntro id="anatomy" eyebrow="The theme" title="A theme is a document, not a stylesheet.">
                <p>
                  Every value is a typed token in a versioned Theme v3 file. It is validated before it becomes active, and changes arrive only as typed operations from a closed set — so a
                  theme can’t drift into arbitrary CSS.
                </p>
                <p>
                  This is the <span className="font-medium text-foreground">{theme.name}</span> document this page is wearing right now. Switch the theme above, or the mode in the header, and
                  the sheet follows.
                </p>
              </SectionIntro>
            </div>
            <ThemeAnatomy theme={theme} mode={mode} />
          </div>
        </section>

        {/* Workbench */}
        <section id="workbench" aria-labelledby="workbench-title" className="scroll-mt-20 border-t">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-20 sm:px-8 sm:py-28">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <SectionIntro id="workbench" eyebrow="The Workbench" title="Edit with the whole system in view.">
                <p>A sidebar of controls beside a live preview of real compositions. Every edit goes through the same validated path, so the preview only ever shows a valid theme.</p>
              </SectionIntro>
              <Button asChild variant="outline" className="w-fit">
                <AppLink href={WORKBENCH_PATH}>
                  Open the Workbench
                  <ArrowRight aria-hidden="true" className="size-3.5" />
                </AppLink>
              </Button>
            </div>
            <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
              <EditorTour />
              <ul className="grid content-start gap-0 divide-y border-y">
                {AROUND_THE_EDITOR.map((item) => (
                  <li key={item.title} className="grid gap-1 py-4">
                    <h3 className="text-sm font-medium">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Theme code */}
        <section id="code" aria-labelledby="code-title" className="scroll-mt-20 border-t bg-muted/30">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">
            <SectionIntro id="code" eyebrow="Theme code" title="Take it with you, as data or as CSS.">
              <p>
                <span className="font-medium text-foreground">Code</span> shows the active theme as canonical Theme v3 JSON, or as CSS variables with a Tailwind v4 <code className="font-mono text-sm">@theme</code> block for a shadcn/ui project — ready to copy.
              </p>
              <p>On the right is the real output for {theme.name}, generated by the same renderer.</p>
            </SectionIntro>
            <ThemeCode theme={theme} />
          </div>
        </section>

        {/* Design Command */}
        <section id="command" aria-labelledby="command-title" className="scroll-mt-20 border-t">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-20 sm:px-8 sm:py-28">
            <SectionIntro
              id="command"
              eyebrow="Design Command · experimental"
              title={<>Say the direction. Review the change.</>}
            >
              <p>
                Design Command reads a short directional request and maps it onto the same typed operations the controls use. Nothing applies on its own: the result is a staged proposal you
                preview, then apply or discard.
              </p>
              <p className="text-sm">
                It needs a locally configured Jev connection and understands the six directions below. Open-ended or reference-style requests aren’t supported.
              </p>
            </SectionIntro>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              <ul aria-label="Supported directions" className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2">
                {COMMAND_AXES.map((axis) => (
                  <li key={axis.category} className="grid gap-2 bg-card p-4">
                    <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">{axis.category}</span>
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {axis.from}
                      <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-border via-primary/60 to-border" />
                      <span className="sr-only">or</span>
                      {axis.to}
                    </span>
                  </li>
                ))}
              </ul>
              <ol className="grid gap-4 sm:grid-cols-2">
                {COMMAND_STEPS.map((step, index) => (
                  <li key={step.title} className="grid content-start gap-2 rounded-xl border bg-card p-5">
                    <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-primary font-mono text-xs text-primary-foreground">
                      {index + 1}
                    </span>
                    <h3 className="text-sm font-medium">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Built-ins */}
        <section id="themes" aria-labelledby="themes-title" className="scroll-mt-20 border-t bg-muted/30">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-20 sm:px-8 sm:py-28">
            <SectionIntro id="themes" eyebrow="Built-in themes" title="Start from a built-in. Each one has its own link.">
              <p>
                A built-in’s link opens the Workbench with that theme applied, so it is easy to share. Built-ins never change; edits become your own custom theme, which stays in your browser and
                has no public link.
              </p>
            </SectionIntro>
            <div className="grid gap-6 md:grid-cols-3">
              {builtIns.map((builtIn) => (
                <BuiltInCard key={builtIn.id} theme={builtIn} mode={mode} />
              ))}
            </div>
          </div>
        </section>

        {/* Closing call to action */}
        <section aria-labelledby="closing-title" className="border-t">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <div className="relative grid gap-8 overflow-hidden rounded-3xl bg-primary px-6 py-14 text-primary-foreground sm:px-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="grid max-w-2xl gap-4">
                <h2 id="closing-title" className="type-heading text-4xl tracking-tight text-balance sm:text-5xl">
                  Open the Workbench and make it yours.
                </h2>
                <p className="text-base leading-relaxed text-pretty opacity-85">It runs in your browser with no account. Start from Default, or pick up where you left off.</p>
              </div>
              <Button asChild size="lg" variant="secondary" className="w-fit">
                <AppLink href={WORKBENCH_PATH} data-testid="landing-closing-cta">
                  Open the Workbench
                  <ArrowRight aria-hidden="true" className="size-4" />
                </AppLink>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground sm:px-8">
          <span className="flex items-center gap-2.5">
            <Mark theme={theme} mode={mode} />
            Personal UI · built on shadcn/ui, Tailwind CSS v4 and React
          </span>
          <AppLink href={WORKBENCH_PATH} className="rounded-md font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50">
            Workbench
          </AppLink>
        </div>
      </footer>
    </div>
  )
}

/** Any path the app does not serve, including the reserved but unimplemented `/themes` and `/themes/:slug`. */
export function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 text-foreground">
      <div className="grid max-w-md gap-5 text-center">
        <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">404</p>
        <h1 className="type-heading text-3xl tracking-tight">Page not found</h1>
        <p className="text-muted-foreground">There is nothing at this address.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <AppLink href={WORKBENCH_PATH}>Open the Workbench</AppLink>
          </Button>
          <Button asChild variant="outline">
            <AppLink href={LANDING_PATH}>Go to the home page</AppLink>
          </Button>
        </div>
      </div>
    </main>
  )
}
