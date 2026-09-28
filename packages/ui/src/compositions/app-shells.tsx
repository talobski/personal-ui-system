import { useId, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import { Bell, ChartColumn, FileText, Folder, House, Inbox, LayoutGrid, Search, Settings, Tag, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

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

/**
 * One contained navigation built only from the accepted Sidebar primitives. Selection is local (`aria-current` and the
 * primitive's own `isActive` treatment); nothing routes, collapses or persists.
 */
function ShellNav({ label, groups, size = "default" }: { label: string; groups: readonly NavGroup[]; size?: "default" | "sm" }) {
  const [active, setActive] = useState(groups[0]!.items[0]!.label)
  return (
    <nav aria-label={label} className="contents">
      {groups.map(group => (
        <SidebarGroup key={group.label} className={size === "sm" ? "py-1" : undefined}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className={size === "sm" ? "gap-0.5" : undefined}>
              {group.items.map(item => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton size={size} isActive={item.label === active} aria-current={item.label === active ? "page" : undefined} onClick={() => setActive(item.label)} className="cursor-pointer">
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

/** A brand or workspace mark: the Sidebar's primary pair, so dedicated Sidebar tokens restyle it. */
function Mark({ letter, className = "" }: { letter: string; className?: string }) {
  return <span aria-hidden="true" className={`grid size-7 shrink-0 place-items-center rounded-md bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground ${className}`}>{letter}</span>
}

/** Abstract main content: neutral blocks that suggest structure without becoming an application. */
const Block = ({ className }: { className: string }) => <div className={`rounded-md bg-muted ${className}`} />

function Frame({ title, children, style }: { title: string; children: ReactNode; style?: CSSProperties }) {
  const id = useId()
  return (
    <section aria-labelledby={id} data-app-shell={title} className="grid min-w-0 gap-2">
      <h2 id={id} className="type-heading text-sm">{title}</h2>
      <div className="h-96 min-w-0 overflow-hidden rounded-xl border shadow-sm" style={style}>{children}</div>
    </section>
  )
}

const CLASSIC: readonly NavGroup[] = [
  { label: "Workspace", items: [{ label: "Home", icon: House }, { label: "Inbox", icon: Inbox }, { label: "Documents", icon: FileText }] },
  { label: "Team", items: [{ label: "Members", icon: Users }, { label: "Settings", icon: Settings }] },
]
const PROJECT: readonly NavGroup[] = [
  { label: "Project", items: [{ label: "Overview", icon: LayoutGrid }, { label: "Files", icon: Folder, badge: "12" }, { label: "Updates", icon: Bell, badge: "3" }] },
  { label: "Views", items: [{ label: "Roadmap", icon: ChartColumn }, { label: "Notes", icon: FileText }] },
]
const UTILITY: readonly NavGroup[] = [
  { label: "Queues", items: [{ label: "Inbox", icon: Inbox, badge: "24" }, { label: "Assigned", icon: Users, badge: "8" }, { label: "Mentions", icon: Bell }, { label: "Search", icon: Search }] },
  { label: "Labels", items: [{ label: "Billing", icon: Tag }, { label: "Bugs", icon: Tag }, { label: "Requests", icon: Tag }] },
]

/**
 * PUI-102: three contained application shells on the accepted shadcn Sidebar, for reading the live theme at app scale.
 * Every Sidebar uses the official non-collapsible (`collapsible="none"`) branch, which renders in normal flow: the
 * viewport-fixed desktop branch and mobile sheet are never mounted inside a card, and the public Sidebar API is
 * unchanged. One provider, held open, serves all three. Composition wrappers vary proportion, surface, header
 * relationship and density; the primitives keep their semantic Sidebar tokens, hover and focus. Main areas are
 * abstract blocks only.
 */
export function AppShells() {
  return (
    <SidebarProvider open className="@container block min-h-0 min-w-0">
      <div className="grid min-w-0 gap-6 @3xl:grid-cols-2">
        <div className="min-w-0 @3xl:col-span-2">
          <Frame title="Classic workspace" style={{ "--sidebar-width": "clamp(8.5rem, 30%, 15rem)" } as CSSProperties}>
            <div className="flex h-full min-w-0 bg-background">
              <Sidebar collapsible="none" className="border-r border-sidebar-border">
                <SidebarHeader className="flex-row items-center gap-2 px-3 py-3">
                  <Mark letter="N" />
                  <span className="type-heading truncate text-sm">Northwind</span>
                </SidebarHeader>
                <SidebarContent><ShellNav label="Classic workspace navigation" groups={CLASSIC} /></SidebarContent>
                <SidebarFooter className="flex-row items-center gap-2 border-t border-sidebar-border px-3 py-3">
                  <span aria-hidden="true" className="size-6 shrink-0 rounded-full bg-sidebar-accent" />
                  <span className="h-2 w-16 rounded-full bg-sidebar-accent" aria-hidden="true" />
                </SidebarFooter>
              </Sidebar>
              <div aria-hidden="true" className="flex min-w-0 flex-1 flex-col">
                <div className="flex h-12 shrink-0 items-center gap-3 border-b px-4"><Block className="h-3 w-28" /><Block className="ml-auto h-6 w-16" /></div>
                <div className="grid flex-1 content-start gap-3 p-4">
                  <Block className="h-5 w-40 max-w-full" />
                  <div className="grid grid-cols-3 gap-3"><div className="h-16 rounded-lg border bg-card" /><div className="h-16 rounded-lg border bg-card" /><div className="h-16 rounded-lg border bg-card" /></div>
                  <div className="h-28 rounded-lg border bg-card" />
                </div>
              </div>
            </div>
          </Frame>
        </div>
        <Frame title="Inset project" style={{ "--sidebar-width": "clamp(8.5rem, 38%, 13rem)" } as CSSProperties}>
          <div className="flex h-full min-w-0 gap-2 bg-sidebar p-2">
            <Sidebar collapsible="none" className="bg-transparent">
              <SidebarHeader className="flex-row items-center gap-2 px-2 py-2">
                <Mark letter="A" className="rounded-full" />
                <span className="grid min-w-0">
                  <span className="type-heading truncate text-sm">Atlas</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">Project</span>
                </span>
              </SidebarHeader>
              <SidebarContent><ShellNav label="Inset project navigation" groups={PROJECT} /></SidebarContent>
            </Sidebar>
            <div aria-hidden="true" className="flex min-w-0 flex-1 flex-col rounded-lg border bg-background shadow-sm">
              <div className="flex h-10 shrink-0 items-center gap-2 px-3"><Block className="h-2.5 w-10" /><span className="text-muted-foreground">/</span><Block className="h-2.5 w-16" /></div>
              <div className="grid flex-1 content-start gap-2 px-3 pb-3">
                <div className="h-20 rounded-lg bg-muted" />
                <Block className="h-3 w-3/4" />
                <Block className="h-3 w-1/2" />
                <Block className="h-3 w-2/3" />
              </div>
            </div>
          </div>
        </Frame>
        <Frame title="Compact utility" style={{ "--sidebar-width": "clamp(8rem, 40%, 11rem)" } as CSSProperties}>
          <div className="flex h-full min-w-0 flex-col bg-background">
            <div className="flex h-10 shrink-0 items-center gap-2 border-b bg-sidebar px-3 text-sidebar-foreground">
              <Mark letter="U" className="size-5 rounded-sm" />
              <span className="type-heading truncate text-xs">Utility</span>
              <span aria-hidden="true" className="ml-auto h-5 w-20 rounded-md border border-sidebar-border bg-background" />
            </div>
            <div className="flex min-h-0 min-w-0 flex-1">
              <Sidebar collapsible="none" className="border-r border-sidebar-border">
                <SidebarContent className="gap-0 py-1"><ShellNav label="Compact utility navigation" groups={UTILITY} size="sm" /></SidebarContent>
              </Sidebar>
              <div aria-hidden="true" className="grid min-w-0 flex-1 content-start divide-y">
                {["w-3/4", "w-2/3", "w-5/6", "w-1/2", "w-3/5", "w-2/3", "w-3/4"].map((width, index) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-2.5"><span className="size-2 shrink-0 rounded-full bg-muted-foreground/40" /><Block className={`h-2.5 ${width}`} /></div>
                ))}
              </div>
            </div>
          </div>
        </Frame>
      </div>
    </SidebarProvider>
  )
}
