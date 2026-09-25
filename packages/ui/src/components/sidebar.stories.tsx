import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"
import { Trash2Icon } from "lucide-react"

import { Avatar, AvatarFallback, avatarInitial } from "@personal-ui/ui/components/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@personal-ui/ui/components/sidebar"

const sections = ["Colors", "Typography", "Other", "Command"] as const

/** One application shell: header, scrollable content, footer, and an inset main region with the toggle. */
function Example({ width = "22rem" }: { width?: string }) {
  const [active, setActive] = React.useState<(typeof sections)[number]>("Colors")
  const [drafts, setDrafts] = React.useState(["Studio", "Archive"])
  return (
    <SidebarProvider style={{ "--sidebar-width": width } as React.CSSProperties} className="h-svh min-h-0">
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" isActive>
                <span className="font-medium">Workspace</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent data-testid="sidebar-scroll">
          <SidebarGroup>
            <SidebarGroupLabel>Editor</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sections.map((section) => (
                  <SidebarMenuItem key={section}>
                    <SidebarMenuButton isActive={active === section} aria-current={active === section ? "true" : undefined} onClick={() => setActive(section)}>
                      <span>{section}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Drafts</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {drafts.map((draft) => (
                  <SidebarMenuItem key={draft}>
                    <SidebarMenuButton>
                      <span>{draft}</span>
                    </SidebarMenuButton>
                    <SidebarMenuAction aria-label={`Delete ${draft}`} onClick={() => setDrafts((all) => all.filter((d) => d !== draft))}>
                      <Trash2Icon />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-2 p-2 text-sm">
            <Avatar aria-hidden="true">
              <AvatarFallback className="text-xs font-medium">{avatarInitial("Ada Lovelace")}</AvatarFallback>
            </Avatar>
            <span>Ada Lovelace</span>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-3">
          <SidebarTrigger />
          <h1 className="text-sm font-medium">{active}</h1>
        </header>
        <div className="p-4 text-sm" data-testid="inset-content">
          Main content for {active}.
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

const meta = {
  title: "Pilot/Sidebar",
  component: Example,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Example>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
