import { ProductiveWeek } from "@personal-ui/ui/compositions/productive-week"
import { AccountProfile } from "@personal-ui/ui/compositions/account-profile"
import { TeamAccess } from "@personal-ui/ui/compositions/team-access"
import { WorkspaceSettings } from "@personal-ui/ui/compositions/workspace-settings"
import { NotificationPreferences } from "@personal-ui/ui/compositions/notification-preferences"
import { SupportRequest } from "@personal-ui/ui/compositions/support-request"
import { RecentActivity } from "@personal-ui/ui/compositions/recent-activity"
import { RoomToThink } from "@personal-ui/ui/compositions/room-to-think"

/** Gallery configuration only: regions own placement, compositions own content. */
export const PREVIEW_COMPOSITIONS = [
  { id: "productive-week", render: () => <ProductiveWeek /> },
  { id: "team-access", render: () => <TeamAccess /> },
  { id: "account-profile", render: () => <AccountProfile compact /> },
  { id: "notifications", render: () => <NotificationPreferences compact /> },
  { id: "support-request", render: () => <SupportRequest compact /> },
  { id: "workspace-settings", render: () => <WorkspaceSettings compact /> },
  { id: "recent-activity", render: () => <RecentActivity /> },
  { id: "room-to-think", render: () => <RoomToThink /> },
] as const

export const COMPOSITION_IDS = PREVIEW_COMPOSITIONS.map(composition => composition.id)

function Composition({ id }: { id: typeof COMPOSITION_IDS[number] }) {
  const composition = PREVIEW_COMPOSITIONS.find(entry => entry.id === id)!
  return <section data-composition={id}>{composition.render()}</section>
}

/** Explicit recipe; DOM/focus order follows each stack, then the full region and final local pair. */
export function Gallery() {
  return (
    <div className="quiet-gallery" aria-label="Workspace compositions">
      <div className="quiet-gallery-principal">
        <div className="quiet-stack" data-gallery-region="activity">
          <Composition id="productive-week" />
          <Composition id="team-access" />
        </div>
        <div className="quiet-stack" data-gallery-region="profile-actions">
          <Composition id="account-profile" />
          <Composition id="notifications" />
          <Composition id="support-request" />
        </div>
      </div>
      <Composition id="workspace-settings" />
      <div className="quiet-gallery-pair" data-gallery-region="local-pair">
        <Composition id="recent-activity" />
        <Composition id="room-to-think" />
      </div>
    </div>
  )
}
