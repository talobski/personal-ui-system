import * as React from "react"
import { Group, Panel, Separator } from "react-resizable-panels"
import { cn } from "cn"

// shadcn Resizable composition, adapted to the pinned v4 Group/Separator API.
// All pointer, keyboard, bounds and ARIA behavior belongs to the library.
export function ResizablePanelGroup({ className, ...props }: React.ComponentProps<typeof Group>) {
  return <Group data-slot="resizable-panel-group" className={cn("flex h-full w-full min-w-0", className)} {...props} />
}

export const ResizablePanel = Panel

export function ResizableHandle({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return <Separator data-slot="resizable-handle" className={cn("relative flex w-2 shrink-0 items-center justify-center bg-border/40 outline-none focus-visible:bg-ring/30 focus-visible:ring-[3px] focus-visible:ring-ring/50", className)} {...props}>
    <span aria-hidden="true" className="h-8 w-0.5 rounded-full bg-border" />
  </Separator>
}
