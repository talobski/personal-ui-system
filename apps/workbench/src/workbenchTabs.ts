/**
 * PUI-120: both Workbench category lists use the default shadcn surface Tabs (muted list, raised active trigger), so the
 * active trigger is also the UI Effects surface-Tabs target. Each list follows its content (`w-max` where it is used)
 * and each trigger its natural label width: `flex-none` replaces the official trigger's equal-width `flex-1`. Radius,
 * padding, type, focus ring, and ARIA stay the official trigger's.
 */
export const CATEGORY_TRIGGER_CLASS = "flex-none shrink-0 cursor-pointer"
