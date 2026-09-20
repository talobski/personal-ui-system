# Accessibility and responsive browser checkpoint

Status: AC-07 verified on 2026-09-21. The project remains RUNNING pending AC-09.

The final browser evidence targets commit `11d2fe97bc6b6f045eeaabff8de5cffccb9c42e0` with Playwright 1.63.0, Chromium, and axe-core 4.13.0.

## Passing matrix

- Storybook responsive-dialog suite: 4/4 tests passed at 390×844 and 1440×900, including hard checks at 640 px and 641 px.
- Production workbench suite: 4/4 tests passed at 390×844 and 1440×900 in light and dark modes.
- Preview behavior: Drawer at 390 px and 640 px; Dialog at 641 px and 1024 px.
- Keyboard behavior: Button activation with Enter and Space, Input focus and typing, modal entry with Tab, Escape dismissal, and trigger focus restoration.
- Accessibility: 22 retained axe result attachments across closed, open, and post-reload states; every critical/serious result array was empty.
- Unit suite: 191/191 passed; typecheck and both production builds passed before browser verification.

The initial focus assertion incorrectly required immediate Drawer autofocus. The final admitted interaction performs Tab and then verifies focus is contained within the open Drawer or Dialog. The final workbench run used port 5174 so the owner's development server on port 5173 was not interrupted.

Machine-readable evidence is at `.loop/runs/accessibility-browser-001/evidence/ac-07.json`. This checkpoint does not claim project completion; AC-09 remains mandatory.
