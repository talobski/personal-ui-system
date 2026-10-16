import { useId, useState } from "react"
import type { CSSProperties, KeyboardEvent } from "react"
import { AudioWaveform, Command, FileText, GalleryVerticalEnd, House, Inbox, Settings, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Avatar, AvatarFallback, avatarInitial } from "../components/avatar"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../components/select"
import { Separator } from "../components/separator"
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
  SidebarTrigger,
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
 * pattern. Choosing a workspace renames the header and the breadcrumb only; nothing routes or persists. On the icon
 * rail only the logo shows (the trigger keeps its accessible name), as the official lg menu button does.
 */
function WorkspaceSwitcher({ shell, workspace, onChange, density }: { shell: string; workspace: Workspace; onChange: (id: string) => void; density: Density }) {
  const items = WORKSPACES.map(entry => ({ value: entry.id, label: entry.name }))
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Select items={items} value={workspace.id} onValueChange={id => { if (id) onChange(id) }}>
          <SelectTrigger aria-label={`${shell} workspace`} data-tactile="flat" className={`w-full cursor-pointer gap-2 border-0 bg-transparent px-2 text-sidebar-foreground shadow-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground dark:bg-transparent dark:hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:[&>span:last-child]:hidden ${density === "compact" ? "h-10!" : "h-12!"}`}>
            <SelectValue className="min-w-0 gap-2">
              <Logo workspace={workspace} density={density} />
              <span className="grid min-w-0 text-left leading-tight group-data-[collapsible=icon]:hidden">
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

/**
 * The signed-in profile: the accepted Avatar with one initial, then name and email. Informational, not a control. On the
 * icon rail the row clips to the avatar; the name and email stay in the accessibility tree, as menu-button labels do.
 */
function Profile({ density }: { density: Density }) {
  const name = "Maya Chen"
  return (
    <div className={`flex min-w-0 items-center gap-2 overflow-hidden rounded-md px-2 ${density === "compact" ? "py-1 group-data-[collapsible=icon]:px-1.5" : "py-1.5 group-data-[collapsible=icon]:px-0"}`}>
      <Avatar className={density === "compact" ? "size-6" : "size-8"}><AvatarFallback className="text-xs">{avatarInitial(name)}</AvatarFallback></Avatar>
      <span className="grid min-w-0 text-sm leading-tight">
        <span className="truncate font-medium">{name}</span>
        <span className="truncate text-xs text-sidebar-foreground/70">maya@northwind.example</span>
      </span>
    </div>
  )
}

/**
 * The one abstract main panel every shell shares: a header row holding this shell's SidebarTrigger and the breadcrumb,
 * a row of three muted placeholder blocks and one larger muted block. Only the breadcrumb is text; the blocks are hidden
 * neutral silhouettes. The trigger names its shell and reports and controls only that shell's Sidebar. PUI-127: the
 * header is desktop-app height (h-16, the Sidebar header's own height; h-12 compact) with the shadcn blocks' px-4 inset,
 * and the content and its blocks scale with the larger frame.
 */
function MainPanel({ title, sidebarId, open, onToggle, workspace, page, density }: { title: string; sidebarId: string; open: boolean; onToggle: () => void; workspace: Workspace; page: string; density: Density }) {
  const gap = density === "compact" ? "gap-3 p-4" : "gap-4 p-6"
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className={`flex shrink-0 items-center gap-2 border-b text-sm ${density === "compact" ? "h-12 px-3" : "h-16 px-4"}`}>
        <SidebarTrigger aria-label={`Toggle ${title} sidebar`} aria-expanded={open} aria-controls={sidebarId} onClick={onToggle} className="shrink-0 cursor-pointer" />
        <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
        <span className="flex min-w-0 items-center gap-2" data-shell-header>
        <span className="truncate text-muted-foreground">{workspace.name}</span>
        <span aria-hidden="true" className="text-muted-foreground">/</span>
        <span className="truncate font-medium">{page}</span>
        </span>
      </div>
      <div aria-hidden="true" className={`flex min-h-0 flex-1 flex-col ${gap}`} data-shell-content>
        <div className={`grid shrink-0 grid-cols-3 ${density === "compact" ? "gap-3" : "gap-4"}`}>
          {[0, 1, 2].map(block => <div key={block} className={`${density === "compact" ? "h-16" : "h-24"} rounded-lg bg-muted`} />)}
        </div>
        <div className="min-h-0 flex-1 rounded-lg bg-muted" />
      </div>
    </div>
  )
}

type Variant = "classic" | "inset" | "compact"

/** The accepted SidebarProvider shortcut (Cmd/Ctrl+B), answered here only while focus is inside this shell. */
const isSidebarShortcut = (event: KeyboardEvent) => event.key === "b" && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey

/**
 * Provider-originated changes are ignored: every shell's provider also answers the document-wide shortcut, and below
 * the md viewport its toggle drives the unused mobile sheet. A shell's state changes only through its own trigger and
 * the shortcut scoped to its own frame, so no shell (and no enclosing Workbench chrome) can move another.
 */
const ignoreProviderToggle = () => {}

/**
 * One shell: the shared Sidebar (switcher header, grouped navigation, profile footer) beside the shared main panel.
 * Variants differ only in restrained treatment: Classic divides a flat sidebar from the page; Inset (PUI-127) sets the
 * sidebar and the connected outer body on one surface, the dedicated semantic `sidebar` background since PUI-140, and
 * lifts the page onto a bordered background panel with the theme's lightest shadow tier (`shadow-2xs`), as in the shadcn
 * inset blocks; Compact tightens density and chooses a narrower sidebar. PUI-140: the outer frame is flat, edged only by
 * the semantic `border` (no `shadow-sm`), so no shell reads as a floating card; elevation inside a shell is unchanged.
 *
 * PUI-116: each shell is its own SidebarProvider (the frame), expanded at rest, controlled by session-local state that
 * is never persisted or shared. Collapse uses the official icon rail: the in-flow `collapsible="none"` Sidebar carries
 * the same `group`, `data-state` and icon-valued `data-collapsible` hooks as the official desktop branch, so the accepted
 * menu-button, group-label, badge and content styles produce the rail, while nothing is viewport-fixed or portalled at
 * any width. The public Sidebar API is unchanged.
 */
function Shell({ title, variant, initial }: { title: string; variant: Variant; initial: { workspace: string; page: string } }) {
  const id = useId()
  const sidebarId = useId()
  const [open, setOpen] = useState(true)
  const [workspaceId, setWorkspaceId] = useState(initial.workspace)
  const [page, setPage] = useState(initial.page)
  const workspace = WORKSPACES.find(entry => entry.id === workspaceId)!
  const density: Density = variant === "compact" ? "compact" : "default"
  // PUI-127: desktop-app sidebar widths (the official 16rem at most), still bounded for narrow containers.
  const width = { classic: "clamp(10rem, 30%, 16rem)", inset: "clamp(10rem, 30%, 16rem)", compact: "clamp(9rem, 26%, 13.5rem)" }[variant]
  const toggle = () => setOpen(value => !value)
  const onShortcut = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isSidebarShortcut(event)) return
    // Handled here, so the event never reaches the document-wide provider listeners (this shell's or any other).
    event.preventDefault()
    event.stopPropagation()
    toggle()
  }
  const sidebar = (
    <Sidebar
      collapsible="none"
      id={sidebarId}
      data-state={open ? "expanded" : "collapsed"}
      data-collapsible={open ? "" : "icon"}
      className={`group shrink-0 transition-[width] duration-200 ease-linear data-[collapsible=icon]:w-(--sidebar-width-icon) motion-reduce:transition-none ${variant === "inset" ? "bg-sidebar" : "border-r border-sidebar-border"}`}
    >
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
  const main = <MainPanel title={title} sidebarId={sidebarId} open={open} onToggle={toggle} workspace={workspace} page={page} density={density} />
  return (
    <section aria-labelledby={id} data-app-shell={title} data-shell-variant={variant} data-shell-state={open ? "expanded" : "collapsed"} className="mx-auto grid w-full min-w-0 gap-2 @3xl:w-[90%]">
      <h2 id={id} className="type-heading text-base">{title}</h2>
      <SidebarProvider open={open} onOpenChange={ignoreProviderToggle} onKeyDown={onShortcut} className="block h-[clamp(30rem,58cqw,44rem)] min-h-0 min-w-0 overflow-hidden rounded-xl border" style={{ "--sidebar-width": width } as CSSProperties}>
        {variant === "inset" ? (
          <div className="flex h-full min-w-0 gap-2 bg-sidebar p-2" data-shell-body>
            {sidebar}
            <div className="flex min-w-0 flex-1 rounded-lg border bg-background shadow-2xs" data-shell-inset>{main}</div>
          </div>
        ) : (
          <div className="flex h-full min-w-0 bg-background">
            {sidebar}
            {main}
          </div>
        )}
      </SidebarProvider>
    </section>
  )
}

/**
 * PUI-102/PUI-110/PUI-116: three contained application shells on the accepted shadcn Sidebar, for reading the live
 * theme at app scale. All three share one Sidebar pattern (workspace switcher, grouped icon navigation with an active
 * item, profile footer) and one abstract main panel, and stack vertically, centred. PUI-127: at desktop container
 * widths each shell takes about 90% of the panel and a proportional landscape height from the container width
 * (`clamp(30rem, 58cqw, 44rem)`), reading as a real application window; narrow containers use the full panel at the
 * 30rem floor. PUI-140: the shells stand 3rem apart and each title is one type step larger (`text-base`). Each shell owns one preview-local provider and collapses to its icon rail
 * independently (see Shell). The Sidebar stays on the official in-flow `collapsible="none"` branch: the viewport-fixed
 * desktop branch and mobile sheet are never mounted. The preview renders in its own iframe document, so neither the
 * Workbench's provider nor its shortcut listener can reach a shell, and a shell cannot reach them. The official
 * `SidebarInset` is not used because it renders a `<main>` landmark and the preview document already has one; its inset
 * treatment is composed instead.
 */
export function AppShells() {
  return (
    <div data-app-shells className="@container min-h-0 min-w-0">
      <div className="grid min-w-0 gap-12">
        <Shell title="Classic workspace" variant="classic" initial={{ workspace: "northwind", page: "Home" }} />
        <Shell title="Inset project" variant="inset" initial={{ workspace: "atlas", page: "Documents" }} />
        <Shell title="Compact utility" variant="compact" initial={{ workspace: "harbor", page: "Inbox" }} />
      </div>
    </div>
  )
}
