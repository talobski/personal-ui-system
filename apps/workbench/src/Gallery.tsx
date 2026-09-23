import { ProductiveWeek } from "@personal-ui/ui/compositions/productive-week"
import { AccountProfile } from "@personal-ui/ui/compositions/account-profile"
import { TeamAccess } from "@personal-ui/ui/compositions/team-access"
import { WorkspaceSettings } from "@personal-ui/ui/compositions/workspace-settings"
import { NotificationPreferences } from "@personal-ui/ui/compositions/notification-preferences"
import { SupportRequest } from "@personal-ui/ui/compositions/support-request"
import { RecentActivity } from "@personal-ui/ui/compositions/recent-activity"
import { RoomToThink } from "@personal-ui/ui/compositions/room-to-think"

export const COMPOSITION_IDS = ["productive-week", "account-profile", "team-access", "workspace-settings", "notifications", "support-request", "recent-activity", "room-to-think"] as const
const cards = [<ProductiveWeek />, <AccountProfile compact />, <TeamAccess />, <WorkspaceSettings compact />, <NotificationPreferences compact />, <SupportRequest compact />, <RecentActivity />, <RoomToThink />]

export function Gallery() {
  return <div className="quiet-gallery" aria-label="Workspace compositions">{[[0, 1, 2], [3, 4, 5], [6, 7]].map((column, i) => <div className="quiet-stack" key={i}>{column.map(index => <section key={COMPOSITION_IDS[index]} data-composition={COMPOSITION_IDS[index]}>{cards[index]}</section>)}</div>)}</div>
}
