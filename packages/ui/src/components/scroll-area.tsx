"use client"

import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"
import { cn } from "cn"

/** shadcn new-york-v4 ScrollArea composition; Radix owns all scrolling and input behavior. */
function ScrollArea({ className, children, viewportProps, orientation = "vertical", ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  viewportProps?: React.ComponentProps<typeof ScrollAreaPrimitive.Viewport>
  orientation?: "vertical" | "horizontal" | "both"
}) {
  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cn("group/scroll-area relative", className)} {...props}>
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        {...viewportProps}
        className={cn("size-full rounded-[inherit] outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1", viewportProps?.className)}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {orientation !== "horizontal" && <ScrollBar />}
      {orientation !== "vertical" && <ScrollBar orientation="horizontal" />}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

/**
 * One slim overlay bar for both orientations: a physical 0.5rem (never scaled by the theme spacing) on a transparent track. The rounded thumb is the semantic
 * muted foreground at 25% at rest, 40% while its ScrollArea is hovered or holds focus, and 55% while the thumb itself is
 * hovered or dragged. Radix keeps the bar out of layout flow, so no width is reserved.
 */
function ScrollBar({ className, orientation = "vertical", ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none select-none bg-transparent p-px transition-colors",
        orientation === "vertical" && "h-full w-[0.5rem] border-l border-l-transparent",
        orientation === "horizontal" && "h-[0.5rem] flex-col border-t border-t-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-muted-foreground/25 transition-colors group-focus-within/scroll-area:bg-muted-foreground/40 group-hover/scroll-area:bg-muted-foreground/40 hover:bg-muted-foreground/55 active:bg-muted-foreground/55 motion-reduce:transition-none"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
