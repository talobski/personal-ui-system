import { Avatar, AvatarFallback, avatarInitial } from "../components/avatar"
import { Bubble, BubbleContent, BubbleGroup } from "../components/bubble"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/card"
import { Message, MessageAvatar, MessageContent, MessageFooter, MessageGroup, MessageHeader } from "../components/message"

type Turn = { sender: string; align: "start" | "end"; time: string; lines: readonly string[]; footer?: string }

/** A fixed, fictional exchange: other people start-aligned with avatars, the local user end-aligned. */
const THREAD: readonly Turn[] = [
  { sender: "Maya Chen", align: "start", time: "09:41", lines: ["Pushed the calmer type scale to preview.", "Headings sit at 600 now."] },
  { sender: "You", align: "end", time: "09:43", lines: ["Reads well in dark mode too."], footer: "Read" },
  { sender: "Jonah Park", align: "start", time: "09:45", lines: ["Can it ride along with Friday's build?"] },
  { sender: "You", align: "end", time: "09:46", lines: ["Yes. I'll tag the release."], footer: "Delivered" },
]

/**
 * PUI-88: a compact, static conversation built from the official Message and Bubble resources with Avatar. Every
 * turn names its sender (visibly, or for the local user in sr-only text); nothing is inserted, streamed, or expanded.
 */
export function TeamChat() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg"><h2 className="type-heading">Design review</h2></CardTitle>
        <CardDescription>Maya, Jonah and you</CardDescription>
      </CardHeader>
      <CardContent>
        <MessageGroup role="log" aria-label="Design review conversation">
          {THREAD.map(turn => (
            <Message key={turn.time} align={turn.align}>
              {turn.align === "start" && (
                <MessageAvatar>
                  <Avatar aria-hidden="true"><AvatarFallback className="text-xs font-medium">{avatarInitial(turn.sender)}</AvatarFallback></Avatar>
                </MessageAvatar>
              )}
              <MessageContent>
                {turn.align === "start"
                  ? <MessageHeader><span className="font-medium text-foreground">{turn.sender}</span><time className="font-mono tabular-nums" dateTime={turn.time}>{turn.time}</time></MessageHeader>
                  : <span className="sr-only">{turn.sender}</span>}
                <BubbleGroup>
                  {turn.lines.map(line => <Bubble key={line} variant={turn.align === "end" ? "default" : "muted"}><BubbleContent>{line}</BubbleContent></Bubble>)}
                </BubbleGroup>
                {turn.footer && <MessageFooter><time className="font-mono tabular-nums" dateTime={turn.time}>{turn.time}</time><span>{turn.footer}</span></MessageFooter>}
              </MessageContent>
            </Message>
          ))}
        </MessageGroup>
      </CardContent>
    </Card>
  )
}
