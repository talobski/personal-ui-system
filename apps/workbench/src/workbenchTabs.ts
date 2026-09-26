/**
 * Content-width category Tabs: active uses the secondary pair without a shadow; inactive stays transparent with muted
 * foreground and a text-only hover. The official trigger's radius, vertical padding, focus ring, and ARIA are unchanged.
 */
export const CATEGORY_TRIGGER_CLASS =
  "h-[calc(100%-7px)] w-auto flex-none shrink-0 cursor-pointer whitespace-nowrap px-2 text-sm text-muted-foreground dark:text-muted-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:hover:text-muted-foreground/80 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-none dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-secondary dark:data-[state=active]:text-secondary-foreground"

