import type * as React from "react"

import { ProductiveWeek } from "@personal-ui/ui/compositions/productive-week"
import { AccountProfile } from "@personal-ui/ui/compositions/account-profile"
import { TeamAccess } from "@personal-ui/ui/compositions/team-access"
import { WorkspaceSettings } from "@personal-ui/ui/compositions/workspace-settings"
import { NotificationPreferences } from "@personal-ui/ui/compositions/notification-preferences"
import { SupportRequest } from "@personal-ui/ui/compositions/support-request"
import { RecentActivity } from "@personal-ui/ui/compositions/recent-activity"
import { RoomToThink } from "@personal-ui/ui/compositions/room-to-think"

/**
 * A composition's preview footprint (PUI-64): `default` spans one grid column; `wide` prefers two and spans two
 * whenever at least two columns exist. It is a width preference only: height stays content-driven. The footprint
 * belongs to the preview composition entry, never to Chart, Card, a form, or any other public resource.
 */
export type PreviewLayout = "default" | "wide"

type PreviewComposition = { id: string; layout: PreviewLayout; render: () => React.ReactNode }

/**
 * The eight shared compositions in source order, which is also DOM, reading, and focus order. `wide` marks the
 * compositions whose content is horizontally structured: the week chart, the member list, and the three-panel
 * workspace settings.
 */
export const PREVIEW_COMPOSITIONS: readonly PreviewComposition[] = [
  { id: "productive-week", layout: "wide", render: () => <ProductiveWeek /> },
  { id: "account-profile", layout: "default", render: () => <AccountProfile compact /> },
  { id: "team-access", layout: "wide", render: () => <TeamAccess /> },
  { id: "workspace-settings", layout: "wide", render: () => <WorkspaceSettings compact /> },
  { id: "notifications", layout: "default", render: () => <NotificationPreferences compact /> },
  { id: "support-request", layout: "default", render: () => <SupportRequest compact /> },
  { id: "recent-activity", layout: "default", render: () => <RecentActivity /> },
  { id: "room-to-think", layout: "default", render: () => <RoomToThink /> },
]

export const COMPOSITION_IDS = PREVIEW_COMPOSITIONS.map((composition) => composition.id)

/** One source-ordered CSS grid (`.quiet-gallery` in styles.css): 1, 2, then 3 columns; row flow, never dense. */
export function Gallery() {
  return (
    <div className="quiet-gallery" aria-label="Workspace compositions">
      {PREVIEW_COMPOSITIONS.map(({ id, layout, render }) => (
        <section key={id} data-composition={id} data-layout={layout}>
          {render()}
        </section>
      ))}
    </div>
  )
}
