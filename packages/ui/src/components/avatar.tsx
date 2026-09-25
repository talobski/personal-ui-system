"use client"

import * as React from "react"
import { cn } from "cn"
import { Avatar as AvatarPrimitive } from "radix-ui"

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  )
}

/** Adaptation: the fallback also sets `text-muted-foreground`, so initials always pair the two semantic muted tokens. */
function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

/**
 * Exactly one initial: the first letter or digit of the display name, upper-cased for its locale. Leading spaces,
 * punctuation, and symbols are skipped; a name with no letter or digit falls back to "?". A letter whose upper case
 * is longer than one character (for example "ß") stays as written, so the result is always one character.
 */
function avatarInitial(name: string): string {
  const first = name.match(/[\p{L}\p{N}]/u)?.[0]
  if (!first) return "?"
  const upper = first.toLocaleUpperCase()
  return [...upper].length === 1 ? upper : first
}

export { Avatar, AvatarImage, AvatarFallback, avatarInitial }
