import { useId, useState } from "react"
import type { CSSProperties } from "react"
import { AudioWaveform, Command, FileText, GalleryVerticalEnd, House, Inbox, Settings, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Avatar, AvatarFallback, avatarInitial } from "../components/avatar"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../components/select"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "../components/sidebar"

type NavItem = { label: string; icon: LucideIcon; badge?: string }
type NavGroup = { label: string; items: readonly NavItem[] }
type Workspace = { id: string; name: string; plan: string; icon: LucideIcon }
type Density = "default" | "compact"

/** The one standard navigation every shell shares (the Classic workspace baseline): two groups, icons, one badge. */
const NAV: readonly NavGroup[] = [
  { label: "Workspace", items: [{ label: "Home", icon: House }, { label: "Inbox", icon: Inbox, badge: "3" }, { label: "Documents", icon: FileText }] },
  { label: "Team", items: [{ label: "Members", icon: Users }, { label: "Settings", icon: Settings }] },
]
const WORKSPACES: readonly Workspace[] = [
  { id: "northwind", name: "Northwind", plan: "Enterprise", icon: GalleryVerticalEnd },
  { id: "atlas", name: "Atlas", plan: "Startup", icon: AudioWaveform },
  { id: "harbor", name: "Harbor", plan: "Free", icon: Command },
]

/** A workspace logo: the Sidebar's primary pair, so dedicated Sidebar tokens restyle it. */
function Logo({ workspace, density }: { workspace: Workspace; density: Density }) {
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground ${density === "compact" ? "size-6" : "size-8"}`}>
      <workspace.icon className={density === "compact" ? "size-3.5" : "size-4"} />
    </span>
  )
}

/**
 * The header's workspace switcher: the accepted Select on a sidebar-styled trigger, as in the shadcn team-switcher
 * pattern. Choosing a workspace renames the header and the breadcrumb only; nothing routes or persists.
 */
function WorkspaceSwitcher({ shell, workspace, onChange, density }: { shell: string; workspace: Workspace; onChange: (id: string) => void; density: Density }) {
  const items = WORKSPACES.map(entry => ({ value: entry.id, label: entry.name }))
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Select items={items} value={workspace.id} onValueChange={id => { if (id) onChange(id) }}>
          <SelectTrigger aria-label={`${shell} workspace`} className={`w-full cursor-pointer gap-2 border-0 bg-transparent px-2 text-sidebar-foreground shadow-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground dark:bg-transparent dark:hover:bg-sidebar-accent ${density === "compact" ? "h-10!" : "h-12!"}`}>
            <SelectValue className="min-w-0 gap-2">
              <Logo workspace={workspace} density={density} />
              <span className="grid min-w-0 text-left leading-tight">
                <span className="truncate font-medium">{workspace.name}</span>
                <span className="truncate text-xs">{workspace.plan}</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectGroup>
              <SelectLabel>Workspaces</SelectLabel>
              {WORKSPACES.map(entry => <SelectItem key={entry.id} value={entry.id}>{entry.name}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

/** Grouped icon navigation on the Sidebar primitives. Selection is local (`aria-current` plus `isActive`). */
function ShellNav({ label, active, onSelect, density }: { label: string; active: string; onSelect: (item: string) => void; density: Density }) {
  const size = density === "compact" ? "sm" : "default"
  return (
    <nav aria-label={label} className="contents">
      {NAV.map(group => (
        <SidebarGroup key={group.label} className={density === "compact" ? "py-1" : undefined}>
          <SidebarGroupLabel className={density === "compact" ? "h-7" : undefined}>{group.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className={density === "compact" ? "gap-0.5" : undefined}>
              {group.items.map(item => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton size={size} isActive={item.label === active} aria-current={item.label === active ? "page" : undefined} onClick={() => onSelect(item.label)} className="cursor-pointer">
                    <item.icon aria-hidden="true" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </nav>
  )
}

/** The signed-in profile: the accepted Avatar with one initial, then name and email. Informational, not a control. */
function Profile({ density }: { density: Density }) {
  const name = "Maya Chen"
  return (
    <div className={`flex min-w-0 items-center gap-2 rounded-md px-2 ${density === "compact" ? "py-1" : "py-1.5"}`}>
      <Avatar className={density === "compact" ? "size-6" : "size-8"}><AvatarFallback className="text-xs">{avatarInitial(name)}</AvatarFallback></Avatar>
      <span className="grid min-w-0 text-sm leading-tight">
        <span className="truncate font-medium">{name}</span>
        <span className="truncate text-xs text-sidebar-foreground/70">maya@northwind.example</span>
      </span>
    </div>
  )
}

/**
 * The one abstract main panel every shell shares: a breadcrumb/header row, a row of three muted placeholder blocks and
 * one larger muted block. Only the breadcrumb is text; the blocks are hidden neutral silhouettes.
 */
function MainPanel({ workspace, page, density }: { workspace: Workspace; page: string; density: Density }) {
  const gap = density === "compact" ? "gap-2 p-3" : "gap-4 p-4"
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className={`flex shrink-0 items-center gap-2 border-b px-4 text-sm ${density === "compact" ? "h-10" : "h-12"}`} data-shell-header>
        <span className="truncate text-muted-foreground">{workspace.name}</span>
        <span aria-hidden="true" className="text-muted-foreground">/</span>
        <span className="truncate font-medium">{page}</span>
      </div>
      <div aria-hidden="true" className={`flex min-h-0 flex-1 flex-col ${gap}`} data-shell-content>
        <div className={`grid shrink-0 grid-cols-3 ${density === "compact" ? "gap-2" : "gap-4"}`}>
          <div className="h-16 rounded-lg bg-muted" /><div className="h-16 rounded-lg bg-muted" /><div className="h-16 rounded-lg bg-muted" />
        </div>
        <div className="min-h-0 flex-1 rounded-lg bg-muted" />
      </div>
    </div>
  )
}

type Variant = "classic" | "inset" | "compact"

/**
 * One shell: the shared Sidebar (switcher header, grouped navigation, profile footer) beside the shared main panel.
 * Variants differ only in restrained treatment: Classic divides a flat sidebar from the page; Inset lifts the page onto
 * a bordered, shadowed surface inside the sidebar colour; Compact tightens density and chooses a narrower sidebar.
 */
function Shell({ title, variant, initial }: { title: string; variant: Variant; initial: { workspace: string; page: string } }) {
  const id = useId()
  const [workspaceId, setWorkspaceId] = useState(initial.workspace)
  const [page, setPage] = useState(initial.page)
  const workspace = WORKSPACES.find(entry => entry.id === workspaceId)!
  const density: Density = variant === "compact" ? "compact" : "default"
  const width = { classic: "clamp(10rem, 32%, 15rem)", inset: "clamp(10rem, 32%, 14rem)", compact: "clamp(9rem, 28%, 12.5rem)" }[variant]
  const sidebar = (
    <Sidebar collapsible="none" className={variant === "inset" ? "bg-transparent" : "border-r border-sidebar-border"}>
      <SidebarHeader className={density === "compact" ? "p-1.5" : undefined}>
        <WorkspaceSwitcher shell={title} workspace={workspace} onChange={setWorkspaceId} density={density} />
      </SidebarHeader>
      <SidebarContent className={density === "compact" ? "gap-0" : undefined}>
        <ShellNav label={`${title} navigation`} active={page} onSelect={setPage} density={density} />
      </SidebarContent>
      <SidebarFooter className={variant === "inset" ? undefined : `border-t border-sidebar-border ${density === "compact" ? "p-1.5" : ""}`}>
        <Profile density={density} />
      </SidebarFooter>
    </Sidebar>
  )
  return (
    <section aria-labelledby={id} data-app-shell={title} data-shell-variant={variant} className="mx-auto grid w-full min-w-0 gap-2 @3xl:w-[72%]">
      <h2 id={id} className="type-heading text-sm">{title}</h2>
      <div className="h-108 min-w-0 overflow-hidden rounded-xl border shadow-sm" style={{ "--sidebar-width": width } as CSSProperties}>
        {variant === "inset" ? (
          <div className="flex h-full min-w-0 gap-2 bg-sidebar p-2">
            {sidebar}
            <div className="flex min-w-0 flex-1 rounded-lg border bg-background shadow-sm"><MainPanel workspace={workspace} page={page} density={density} /></div>
          </div>
        ) : (
          <div className="flex h-full min-w-0 bg-background">
            {sidebar}
            <MainPanel workspace={workspace} page={page} density={density} />
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * PUI-102/PUI-110: three contained application shells on the accepted shadcn Sidebar, for reading the live theme at app
 * scale. All three share one Sidebar pattern (workspace switcher, grouped icon navigation with an active item, profile
 * footer) and one abstract main panel, and stack vertically at a restrained, centred width that widens to the full
 * panel on narrow containers. Every Sidebar uses the official non-collapsible (`collapsible="none"`) branch, which
 * renders in normal flow: the viewport-fixed desktop branch and mobile sheet are never mounted, and the public Sidebar
 * API is unchanged. One provider, held open, serves all three. The official `SidebarInset` is not used because it
 * renders a `<main>` landmark and the preview document already has one; its inset treatment is composed instead.
 */
export function AppShells() {
  return (
    <SidebarProvider open className="@container block min-h-0 min-w-0">
      <div className="grid min-w-0 gap-8">
        <Shell title="Classic workspace" variant="classic" initial={{ workspace: "northwind", page: "Home" }} />
        <Shell title="Inset project" variant="inset" initial={{ workspace: "atlas", page: "Documents" }} />
        <Shell title="Compact utility" variant="compact" initial={{ workspace: "harbor", page: "Inbox" }} />
      </div>
    </SidebarProvider>
  )
}
