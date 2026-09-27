import type { ReactNode } from "react"

import { ProductiveWeek } from "@personal-ui/ui/compositions/productive-week"
import { PlanUsage } from "@personal-ui/ui/compositions/plan-usage"
import { AccountProfile } from "@personal-ui/ui/compositions/account-profile"
import { NotificationPreferences } from "@personal-ui/ui/compositions/notification-preferences"
import { SupportRequest } from "@personal-ui/ui/compositions/support-request"
import { RevenueOverview } from "@personal-ui/ui/compositions/revenue-overview"
import { UpcomingSchedule } from "@personal-ui/ui/compositions/upcoming-schedule"
import { RecentActivity } from "@personal-ui/ui/compositions/recent-activity"
import { LaunchBoard } from "@personal-ui/ui/compositions/launch-board"
import { TeamAccess } from "@personal-ui/ui/compositions/team-access"
import { QuickFind } from "@personal-ui/ui/compositions/quick-find"
import { WorkspaceSettings } from "@personal-ui/ui/compositions/workspace-settings"
import { RoomToThink } from "@personal-ui/ui/compositions/room-to-think"

/** Gallery configuration only: the recipe below owns placement, compositions own content. */
export const PREVIEW_COMPOSITIONS = [
  { id: "productive-week", render: () => <ProductiveWeek /> },
  { id: "quick-find", render: () => <QuickFind /> },
  { id: "account-profile", render: () => <AccountProfile compact /> },
  { id: "notifications", render: () => <NotificationPreferences compact /> },
  { id: "plan-usage", render: () => <PlanUsage /> },
  { id: "support-request", render: () => <SupportRequest compact /> },
  { id: "revenue-overview", render: () => <RevenueOverview /> },
  { id: "upcoming-schedule", render: () => <UpcomingSchedule /> },
  { id: "recent-activity", render: () => <RecentActivity /> },
  { id: "launch-board", render: () => <LaunchBoard /> },
  { id: "team-access", render: () => <TeamAccess /> },
  { id: "workspace-settings", render: () => <WorkspaceSettings compact /> },
  { id: "room-to-think", render: () => <RoomToThink /> },
] as const

export const COMPOSITION_IDS = PREVIEW_COMPOSITIONS.map(composition => composition.id)
type CompositionId = typeof COMPOSITION_IDS[number]

/** Gallery roots stay shadowless (accepted presentation); elevation inside a composition remains token-driven. */
function Composition({ id }: { id: CompositionId }) {
  const composition = PREVIEW_COMPOSITIONS.find(entry => entry.id === id)!
  return <section data-composition={id} className="min-w-0 [&>[data-slot=card]]:[box-shadow:none] [&>form>[data-slot=card]]:[box-shadow:none]">{composition.render()}</section>
}

/** A major region: an independent natural-height stack that is also the query container for its local groups. */
function Region({ side, className, children }: { side: "left" | "right"; className: string; children: ReactNode }) {
  return <div data-gallery-region={side} className={`@container flex min-w-0 flex-col gap-4 @4xl/gallery:gap-6 ${className}`}>{children}</div>
}

/** A local group recomposes from its own region's width: a stack when narrow, side by side when there is room. */
function LocalGroup({ className, children }: { className: string; children: ReactNode }) {
  return <div data-gallery-group className={`grid min-w-0 grid-cols-1 items-start gap-4 @4xl/gallery:gap-6 ${className}`}>{children}</div>
}

/**
 * PUI-78 container recipe, driven by the gallery's own width (never the viewport):
 * - below @2xl (42rem): one column; the left then right region stack in DOM order.
 * - @2xl: a 12-track frame with two equal 6/6 regions.
 * - @4xl (56rem): the right region becomes the larger major column, 5/7, with 24px gaps.
 * - @6xl (72rem): rebalanced to 4/8 so the right region's local groups have room for more columns.
 * The frame has exactly one row: each region is an independent stack, so a tall card never holds down the other side.
 * DOM and focus order are the left stack, then the right region top to bottom.
 */
export function Gallery() {
  return (
    <div data-gallery="cards" aria-label="Workspace compositions" className="@container/gallery min-w-0">
      <div className="grid grid-cols-1 items-start gap-4 @2xl/gallery:grid-cols-12 @4xl/gallery:gap-6">
        <Region side="left" className="@2xl/gallery:col-span-6 @4xl/gallery:col-span-5 @6xl/gallery:col-span-4">
          <Composition id="productive-week" />
          <Composition id="quick-find" />
          <Composition id="account-profile" />
          <Composition id="notifications" />
          <Composition id="plan-usage" />
          <Composition id="support-request" />
        </Region>
        <Region side="right" className="@2xl/gallery:col-span-6 @4xl/gallery:col-span-7 @6xl/gallery:col-span-8">
          <Composition id="revenue-overview" />
          <LocalGroup className="@lg:grid-cols-2">
            <Composition id="upcoming-schedule" />
            <Composition id="recent-activity" />
          </LocalGroup>
          <Composition id="launch-board" />
          <LocalGroup className="@lg:grid-cols-2">
            <Composition id="team-access" />
            <Composition id="workspace-settings" />
          </LocalGroup>
          <Composition id="room-to-think" />
        </Region>
      </div>
    </div>
  )
}
