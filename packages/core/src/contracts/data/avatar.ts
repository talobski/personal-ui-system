export const avatar = {
  id: "avatar",
  purpose: "Represent a person or account with an optional image and a one-character initial fallback on a muted surface.",
  use: [
    "Use Avatar beside a visible name to identify a person or account at a glance.",
    "Derive the fallback with avatarInitial(name): exactly one character, the first letter or digit of the display name.",
    "Mark the avatar aria-hidden when the name is visible next to it; otherwise give it role=img and an accessible name.",
    "Keep the fallback on the semantic muted surface with muted-foreground text.",
  ],
  avoid: [
    "Two-letter or multi-character initials.",
    "Hard-coded or per-person avatar colours; use the muted and muted-foreground tokens only.",
    "Using an avatar as the only way to identify a person.",
    "Loading remote avatar images in local examples.",
  ],
  variants: ["initial fallback", "image with fallback", "size-6", "size-8 (default)", "size-10"],
  responsiveBehavior: "The avatar keeps a fixed square size and never shrinks inside flex rows; the adjacent name truncates or wraps instead.",
  accessibility: [
    "A decorative avatar next to a visible name is aria-hidden so the name is announced once.",
    "A standalone avatar has role=img and an accessible name equal to the person's name.",
    "The initial uses muted-foreground on muted, which the theme keeps legible in light and dark modes.",
  ],
  composition: [
    "Extends the official shadcn new-york-v4 Avatar over the radix-ui@1.6.7 Avatar primitive (Root, Image, Fallback).",
    "Adaptation: AvatarFallback adds text-muted-foreground; the package also exports avatarInitial for the one-character initial.",
    "Compose Avatar > AvatarImage (optional) + AvatarFallback inside a list row, card header, or sidebar footer.",
  ],
  examples: [
    '<li className="flex items-center gap-3"><Avatar aria-hidden="true"><AvatarFallback>{avatarInitial("Ada Lovelace")}</AvatarFallback></Avatar><span>Ada Lovelace</span></li>',
  ],
  mistakes: [
    'Writing "AL" instead of the single initial "A".',
    "Colouring each avatar with a literal background such as bg-blue-500.",
    "Announcing the initial and the name twice to screen readers.",
  ],
  mobileReplacement: null,
  constraints: [
    { id: "avatar.single-initial", rule: "The fallback is exactly one character: the first letter or digit of the display name, upper-cased." },
    { id: "avatar.semantic-colors", rule: "The fallback uses the muted background and muted-foreground text tokens only." },
    { id: "avatar.accessible-name", rule: "A non-decorative avatar has a non-empty accessible name." },
  ],
}
