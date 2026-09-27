import type { Meta, StoryObj } from "@storybook/react-vite"

import { Avatar, AvatarFallback, avatarInitial } from "@personal-ui/ui/components/avatar"
import { Bubble, BubbleContent, BubbleGroup } from "@personal-ui/ui/components/bubble"
import { Message, MessageAvatar, MessageContent, MessageFooter, MessageGroup, MessageHeader } from "@personal-ui/ui/components/message"

/** A short static thread: other participants start-aligned, the local user end-aligned, each turn named. */
function Example() {
  return (
    <MessageGroup role="log" aria-label="Conversation" className="w-80">
      <Message>
        <MessageAvatar><Avatar aria-hidden="true"><AvatarFallback className="text-xs font-medium">{avatarInitial("Maya Chen")}</AvatarFallback></Avatar></MessageAvatar>
        <MessageContent>
          <MessageHeader><span className="font-medium text-foreground">Maya Chen</span><time dateTime="09:41">09:41</time></MessageHeader>
          <BubbleGroup>
            <Bubble variant="muted"><BubbleContent>The draft is ready for review.</BubbleContent></Bubble>
            <Bubble variant="muted"><BubbleContent>I kept the long headings from Friday.</BubbleContent></Bubble>
          </BubbleGroup>
        </MessageContent>
      </Message>
      <Message align="end">
        <MessageContent>
          <span className="sr-only">You</span>
          <Bubble><BubbleContent>Great, I will look after lunch.</BubbleContent></Bubble>
          <MessageFooter><time dateTime="09:44">09:44</time><span>Read</span></MessageFooter>
        </MessageContent>
      </Message>
    </MessageGroup>
  )
}

const meta = { title: "Pilot/Message", component: Example, parameters: { layout: "centered" } } satisfies Meta<typeof Example>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
