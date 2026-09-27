export const message = {
  id: "message",
  purpose: "Lay out one sender's turn in a conversation: an optional avatar beside content aligned to the start or end of the thread.",
  use: [
    "Use Message for each turn in a short conversation; align the local user's turns to end and other participants to start.",
    "Put the visible message surface in Bubble > BubbleContent inside MessageContent.",
    "Use MessageAvatar with Avatar where identifying the sender helps; group consecutive turns from one sender with MessageGroup or BubbleGroup.",
    "Add MessageHeader or MessageFooter only for useful metadata such as a name or time.",
  ],
  avoid: [
    "A custom chat-row system when Message and Bubble cover the layout.",
    "Streaming, dynamic insertion, or expanding threads in static showcase compositions.",
    "Identifying the sender only by alignment or colour.",
    "Adding MessageScroller or a scroll region when the thread fits.",
  ],
  variants: ["align start (default)", "align end", "with avatar", "with header", "with footer", "grouped"],
  responsiveBehavior: "Message rows fill their container width; MessageContent shrinks with min-width 0 and Bubble bounds its own width, so long text wraps instead of overflowing.",
  accessibility: [
    "Render the thread as a list or named region so assistive technology hears message boundaries in DOM order.",
    "Give each turn a sender name as visible text or sr-only text; avatars beside a name are aria-hidden.",
    "Times use a time element with a machine-readable value where known.",
  ],
  composition: [
    "Official shadcn new-york-v4 Message: MessageGroup, Message, MessageAvatar, MessageContent, MessageHeader and MessageFooter data-slot wrappers over React and cn.",
    "align=end reverses the row (flex-row-reverse) and trailing-aligns content, header and footer through the group/message data-align attribute.",
    "Reconstructed offline from the Lead's audit of the official source; composes the existing Avatar and Bubble resources.",
  ],
  examples: [
    '<Message align="end"><MessageAvatar><Avatar aria-hidden="true"><AvatarFallback>M</AvatarFallback></Avatar></MessageAvatar><MessageContent><Bubble><BubbleContent>Sounds good.</BubbleContent></Bubble></MessageContent></Message>',
  ],
  mistakes: [
    "Omitting any sender name so a screen reader cannot tell who spoke.",
    "Hard-coding sender colours instead of Bubble's semantic variants.",
    "Letting long unbroken text overflow the row.",
  ],
  mobileReplacement: null,
  constraints: [
    { id: "message.alignment", rule: "Every message aligns to start or end, and one sender keeps one alignment within a thread." },
    { id: "message.sender-name", rule: "Every message has a non-empty sender name available as visible or sr-only text." },
    { id: "message.content-required", rule: "Every message has at least one non-empty content part." },
  ],
}
