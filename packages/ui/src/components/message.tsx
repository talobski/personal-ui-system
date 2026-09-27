"use client"

import * as React from "react"
import { cn } from "cn"

/**
 * Official shadcn new-york-v4 Message composition: layout-only `data-slot` wrappers around a sender's avatar and
 * content. `align="end"` reverses the row so the avatar and content sit on the trailing side. Message surfaces come
 * from Bubble; people come from Avatar.
 */
function MessageGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-group"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

function Message({
  className,
  align = "start",
  ...props
}: React.ComponentProps<"div"> & { align?: "start" | "end" }) {
  return (
    <div
      data-slot="message"
      data-align={align}
      className={cn(
        "group/message flex w-full min-w-0 items-start gap-2",
        align === "end" && "flex-row-reverse",
        className
      )}
      {...props}
    />
  )
}

function MessageAvatar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-avatar"
      className={cn("flex shrink-0", className)}
      {...props}
    />
  )
}

function MessageContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-content"
      className={cn(
        "flex min-w-0 flex-1 flex-col items-start gap-1 group-data-[align=end]/message:items-end",
        className
      )}
      {...props}
    />
  )
}

function MessageHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-header"
      className={cn(
        "flex items-baseline gap-2 text-xs text-muted-foreground group-data-[align=end]/message:flex-row-reverse",
        className
      )}
      {...props}
    />
  )
}

function MessageFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-footer"
      className={cn(
        "flex items-center gap-2 text-xs text-muted-foreground group-data-[align=end]/message:flex-row-reverse",
        className
      )}
      {...props}
    />
  )
}

export {
  MessageGroup,
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
  MessageFooter,
}
