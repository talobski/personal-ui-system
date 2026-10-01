# Producer self-checks (PUI-143, PUI-144)

Producer self-checks only; not acceptance evidence. Lead owns exact-candidate browser evidence and decoded axe.
Base `30ff9be49e45e04cae7df0d04e433f0e2f7df5a8`. Temporary files used the ignored repo-local `.worker-tmp/`.

## Envelope incident (disclosed)

The worktree had no `node_modules` at start. The first `pnpm build:workbench` made pnpm materialize the worktree
install (`node_modules/` created 15:55 local) before building. `pnpm-lock.yaml` and every `package.json` are
unchanged and the tree stayed clean, but the producer cannot prove the install was served only from the local store
(`~/Library/pnpm/store/v11`) without network. After that, every command called `node_modules/.bin/*` directly, not
through pnpm scripts.

## Route contract as implemented

- `apps/workbench/src/routes.ts` holds the only pathname resolver and a small History API location store, with no
  routing dependency. `/` is the landing page and `/workbench` is the editor. `/workbench/themes/:slug` uses the
  explicit frozen table `default`, `quiet-editorial`, `amber-dusk` → same ids. Any other `/workbench/...` path
  (unknown, wrong-case, inherited-name or deeper) is canonicalized in place to `/workbench` before render.
  `/themes` and `/themes/:slug` resolve to the reserved not-found page. The preview entry is selected only at
  `/workbench?preview=1`.
- Precedence: on initial load, a URL-named built-in wins over the stored selection and writes nothing. Without a
  slug, a valid stored selection is restored, otherwise Default. Opening `/workbench` keeps that path.
- Sync: when the active theme changes after mount, the path is set with `replaceState`, never `pushState`. A
  built-in becomes its stable path; a local custom theme becomes `/workbench`. This covers selection, Save As to a
  custom theme, and Delete's Default fallback. Explicit selection still persists only the selection, as accepted.
- If back/forward lands on another built-in's path while the Workbench stays mounted, it selects that built-in
  through the same working-state-preserving switch, without a stored-selection write. If a proposal is staged or
  evaluating, the address bar returns to the active theme instead.
- Landing CTAs are real `<a href>` links. A plain click navigates in-app with `pushState`; modified clicks keep the
  browser default.

## Commands and results (final candidate unless noted)

- `vitest run`: 51 files, 949 tests passed. That includes the new `routes.test.ts` (9 tests) and the one updated
  `lifecycle.test.ts` iframe-source assertion, which is now exactly `src="/workbench?preview=1"`. An earlier run
  under parallel browser load timed out once in `packages/ui/src/quiet-workspace.test.ts` (dynamic imports, 5 s); it
  passed in the unloaded rerun.
- `tsc --noEmit` in `apps/workbench` and `packages/ui`, plus `tsc -p e2e`: clean. `vite build apps/workbench`: built.
- Browser runs used a producer-local wrapper, `.worker-tmp/pw-workbench.config.ts` (not committed). It is identical
  to `playwright.workbench.config.ts` except that it launches the absolute `node_modules/.bin/vite`, because the
  webServer shell here did not resolve `vite` from PATH (exit 127, before any test ran).
- `landing-workbench-routes.spec.ts` (new): 32 passed at 390×844 and 1440×900. It covers the landing semantics,
  CTA, back/forward, keyboard and skip link, and reduced motion. It runs decoded axe on all three built-ins in light
  and dark, with no horizontal overflow, plus the inert specimen. For every slug it checks URL precedence with
  byte-identical storage, refresh, and a fresh tab. It also covers the clean-recipient fixture, selection sync with
  no new history entries, custom → `/workbench`, unknown-slug normalization, mounted back/forward that keeps working
  state and Undo, reserved `/themes`, and iframe `src`/location isolation.
- Full Workbench config (all 26 specs, 518 tests): 495 passed, 19 skipped, 4 failed. The only failures are
  `workbench-gallery-preview-expansion.spec.ts` WGPE-10 (light/dark × 2 viewports), which expects the Inset shell
  body to be `muted`. The base `30ff9be` build fails the same 4 cases with identical values (expected
  `oklch(0.970151 0 0)`, received `oklch(0.99 0.005 250)`; built from `git archive` in `.worker-tmp/base`). It is a
  preexisting stale assertion from PUI-140's Sidebar-token Inset surface and was left unchanged.
- An earlier full run on the first candidate also failed TSV2-04 (`theme-v2-live-controls.spec.ts`): it reloaded
  after selecting a built-in, and the URL now wins. It was migrated to reload at `/workbench` (one line; the
  assertions are unchanged), and the file then passed 26/26.
- `design-command-live-boundary.spec.ts` under `vite dev`, with the credential forced empty (same wrapper approach):
  1 passed.
- `playwright test --list` (Storybook config): 132 tests; the new spec is excluded.

## Entry-point migration

26 Workbench specs had `page.goto("/")`, and every one changed to `page.goto("/workbench")` with no assertion
edits. The other migration is the TSV2-04 reload step above. `playwright.workbench.config.ts` adds the new spec,
and the Storybook `playwright.config.ts` ignores it.

## Landing page (LWR-01)

Built only from accepted primitives (Button, Card, Tabs, ScrollArea, SingleToggleGroup, Switch, Separator) and
shared compositions (Plan usage, Now playing, Team chat, Quick find, Recent activity). The Lucide bridge gains
`ArrowRight`/`ArrowUpRight`; no dependency or registry change. The page renders the real built-in Theme v3 variable
CSS (`previewVariablesCss`) and switches it from a theme dial plus a light/dark switch, with no storage. Its spec
sheet, Theme code and built-in cards are read from the fixtures and the existing renderers. Copy limits Design
Command to what ships: experimental, needs a local Jev connection, six directional axes, staged proposal, and no
open-ended or reference-style requests. Two contrast findings were fixed during self-checks: a `muted-foreground`
on `muted` chip (Default light 4.34:1) and an `opacity-85` line on Amber Dusk primary.

## Residuals

- Opening `/workbench` with a stored built-in keeps the `/workbench` path until the user selects a theme. This is
  deliberate: it preserves the opened editor URL and avoids rewriting on load.
- The landing theme dial and mode are page-local and reset when you return to `/`.
- Deployment-host HTML fallback for deep links is out of scope (LWR-06). Local `vite preview` and `vite dev` serve
  every path with `index.html`.
- The WGPE-10 stale assertion predates this phase (see above).
