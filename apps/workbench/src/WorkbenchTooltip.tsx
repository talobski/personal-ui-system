import * as React from "react"
import { TooltipPrimitive } from "@personal-ui/ui/lib/workbench-tooltip"

/**
 * PUI-139: the shadcn new-york-v4 Tooltip recipe, private to the Workbench chrome, on the installed Radix primitive with
 * semantic tokens only. The label supplements a control's own accessible name and never replaces it. The trigger is a
 * plain wrapper around the control, as Radix recommends for disabled controls: a disabled Button drops pointer events,
 * so the wrapper still reports hover, while it adds no tab stop and leaves the control's own disabled semantics,
 * focus, and hit target untouched. Keyboard focus reaches the wrapper's handlers by bubbling, so focus shows the label.
 */
export function WorkbenchTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        <span data-slot="tooltip-trigger" className="inline-flex">{children}</span>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          data-slot="tooltip-content"
          sideOffset={4}
          className="z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          {label}
          <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

/** One provider for the whole Workbench chrome, with shadcn's immediate open once a pointer rests on a trigger. */
export function WorkbenchTooltipProvider({ children }: { children: React.ReactNode }) {
  return <TooltipPrimitive.Provider delayDuration={0}>{children}</TooltipPrimitive.Provider>
}
