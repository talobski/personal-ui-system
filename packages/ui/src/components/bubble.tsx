"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/**
 * Official shadcn new-york-v4 Bubble composition: a bounded-width message surface with semantic cva variants.
 * BubbleContent renders its text, or any polymorphic child through `asChild`. Adaptation: the optional reactions part
 * is not included, because no admitted consumer needs it.
 */
const bubbleVariants = cva(
  "flex w-fit max-w-[min(100%,32rem)] min-w-0 flex-col gap-1 rounded-2xl px-3 py-2 text-sm",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        muted: "bg-muted text-foreground",
        outline: "border bg-background text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function BubbleGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bubble-group"
      className={cn(
        "flex min-w-0 flex-col items-start gap-1 group-data-[align=end]/message:items-end",
        className
      )}
      {...props}
    />
  )
}

function Bubble({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof bubbleVariants>) {
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      className={cn(bubbleVariants({ variant, className }))}
      {...props}
    />
  )
}

function BubbleContent({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"p"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "p"

  return (
    <Comp
      data-slot="bubble-content"
      className={cn("leading-relaxed break-words whitespace-pre-wrap", className)}
      {...props}
    />
  )
}

export { BubbleGroup, Bubble, BubbleContent, bubbleVariants }
