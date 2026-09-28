import type { ReactNode } from "react"

import { PlanUsage } from "@personal-ui/ui/compositions/plan-usage"
import { QuickFind } from "@personal-ui/ui/compositions/quick-find"
import { ProductiveWeek } from "@personal-ui/ui/compositions/productive-week"
import { SignupForm } from "@personal-ui/ui/compositions/signup-form"
import { NowPlaying } from "@personal-ui/ui/compositions/now-playing"
import { RevenueOverview } from "@personal-ui/ui/compositions/revenue-overview"
import { TeamChat } from "@personal-ui/ui/compositions/team-chat"
import { RecentActivity } from "@personal-ui/ui/compositions/recent-activity"
import { RecentPayments } from "@personal-ui/ui/compositions/recent-payments"
import { OffsiteCalendar } from "@personal-ui/ui/compositions/offsite-calendar"
import { LocalWeather } from "@personal-ui/ui/compositions/local-weather"

/**
 * Gallery configuration only: the recipe below owns placement, compositions own content. Interactive compositions use
 * their `stable` presentation (PUI-84) or are geometry-stable by construction, so normal interaction never changes a
 * card's footprint in the gallery. PUI-88/90/91 replace This week, Launch checklist and the support form in their
 * slots; PUI-92 adds the range calendar, music and weather cards. PUI-97 moves Music to the end of the smaller left
 * region and pairs the compact Calendar with the wider Weather card at the end of the right region.
 */
export const PREVIEW_COMPOSITIONS = [
  { id: "plan-usage", render: () => <PlanUsage /> },
  { id: "quick-find", render: () => <QuickFind stable /> },
  { id: "productive-week", render: () => <ProductiveWeek /> },
  { id: "signup-form", render: () => <SignupForm /> },
  { id: "now-playing", render: () => <NowPlaying /> },
  { id: "revenue-overview", render: () => <RevenueOverview /> },
  { id: "team-chat", render: () => <TeamChat /> },
  { id: "recent-activity", render: () => <RecentActivity /> },
  { id: "recent-payments", render: () => <RecentPayments /> },
  { id: "offsite-calendar", render: () => <OffsiteCalendar /> },
  { id: "local-weather", render: () => <LocalWeather /> },
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
  return <div data-gallery-region={side} className={`@container flex min-w-0 flex-col gap-4 ${className}`}>{children}</div>
}

/**
 * An intentional local pair recomposes from its own region's width: a stack when narrow, side by side when there is
 * room. Side by side, both card surfaces stretch to the taller one (PUI-82); stacked, each sits in its own grid row,
 * so stretch resolves to its natural height. Nothing outside the pair is equalized. The pair's own class sets its
 * columns: Chat / Recent activity splits evenly; Calendar / Weather (PUI-97) gives the calendar its natural (auto)
 * width and Weather the residual track, only once the region is wide enough for Weather's two zones.
 * PUI-105: a pair marked `natural` (Calendar / Weather only) is start-aligned with no card stretch, so each card keeps
 * its own content height side by side as well as stacked. Every other pair keeps the stretch.
 */
function LocalGroup({ className, natural = false, children }: { className: string; natural?: boolean; children: ReactNode }) {
  const align = natural ? "items-start" : "items-stretch [&>[data-composition]>[data-slot=card]]:h-full"
  return <div data-gallery-group={natural ? "natural" : "stretch"} className={`grid min-w-0 grid-cols-1 ${align} gap-4 ${className}`}>{children}</div>
}

/**
 * PUI-78 container recipe, driven by the gallery's own width (never the viewport):
 * - below @2xl (42rem): one column; the left then right region stack in DOM order.
 * - @2xl: a 12-track frame with two equal 6/6 regions.
 * - @4xl (56rem): the right region becomes the larger major column, 5/7.
 * - @6xl (72rem): rebalanced to 4/8 so the right region's local groups have room for more columns.
 * Every frame, region, and local-group gap is 16px (`gap-4`) at all widths (PUI-81).
 * The frame has exactly one row: each region is an independent stack, so a tall card never holds down the other side.
 * DOM and focus order are the left stack, then the right region top to bottom.
 */
export function Gallery() {
  return (
    <div data-gallery="cards" aria-label="Workspace compositions" className="@container/gallery min-w-0">
      <div className="grid grid-cols-1 items-start gap-4 @2xl/gallery:grid-cols-12">
        <Region side="left" className="@2xl/gallery:col-span-6 @4xl/gallery:col-span-5 @6xl/gallery:col-span-4">
          <Composition id="plan-usage" />
          <Composition id="quick-find" />
          <Composition id="productive-week" />
          <Composition id="signup-form" />
          <Composition id="now-playing" />
        </Region>
        <Region side="right" className="@2xl/gallery:col-span-6 @4xl/gallery:col-span-7 @6xl/gallery:col-span-8">
          <Composition id="revenue-overview" />
          <LocalGroup className="@lg:grid-cols-2">
            <Composition id="team-chat" />
            <Composition id="recent-activity" />
          </LocalGroup>
          <Composition id="recent-payments" />
          <LocalGroup natural className="@2xl:grid-cols-[auto_minmax(0,1fr)]">
            <Composition id="offsite-calendar" />
            <Composition id="local-weather" />
          </LocalGroup>
        </Region>
      </div>
    </div>
  )
}
