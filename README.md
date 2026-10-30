# UI Theme Workbench

A personal workbench for creating, previewing, and exporting UI themes. It works with shadcn-style components: you can edit a visual theme, see it across realistic interface patterns in light and dark mode, and export it for use in another project.

I built UI Theme Workbench as a personal project to explore where design systems, frontend engineering and agent-assisted development meet. The goal is to make design decisions portable without giving every project the same visual identity.

It is a tool for my own use. The code is public so people can see how I work; it is not a supported product or an open-source project seeking contributions.

## What it does

- Edit semantic colors, six identity tone pairs, typography, spacing, radius, shadows and optional Tactile interaction effects, with a live preview.
- Preview light and dark modes across cards, forms, control states, a design-system overview and application shells.
- Start from five built-in themes: Default, Quiet Editorial, Amber Dusk, Pocketmarket and Secuna. Each has a direct link, such as `/workbench/themes/pocketmarket`.
- Save custom themes in the browser, with undo and redo for the current session.
- Export a theme as JSON, CSS with Tailwind v4 `@theme` mappings, or an implementation prompt for a coding agent.

## Design and engineering decisions

**A strict, versioned theme format.** Themes are validated against a Zod schema (Theme v3) with DTCG-style tokens. Colors are stored as canonical OKLCH, whatever format they were entered in. Older v1 and v2 themes are migrated on load rather than rejected.

**Edits are typed operations.** Every change in the editor goes through one mutation API with a closed set of thirteen operations, such as `setColor`, `setRadiusBase` and `setUiEffects`. Each result is validated before it becomes the working theme. The experimental Design Command uses the same API: its operations are staged as a proposal and previewed, and change the theme only when you apply them. Undo and redo restore earlier snapshots and revalidate them.

**One renderer for preview and export.** The live preview and the CSS export both come from the same core renderer, including the Tactile effects block. The Agent Prompt wraps that exact CSS, so what you copy matches what you previewed.

**Portable output.** JSON exports keep only the design data, with no internal identity, schema version or revision. CSS exports have no generator header. Both can go into a project that knows nothing about this workbench.

**Tested in the browser.** Vitest covers the schema, migrations, mutations and rendering. Playwright checks the Workbench against its production build at mobile and desktop sizes, and most specs run axe accessibility scans. Known contrast shortfalls in the approved palettes are listed explicitly, instead of being hidden by tolerating every failure.

## Run locally

Requires Node.js 22 or newer and pnpm 12.5.1, as declared in `package.json`.

```sh
git clone https://github.com/talobski/ui-theme-workbench.git
cd ui-theme-workbench
pnpm install
pnpm --filter @personal-ui/workbench dev
```

Open <http://127.0.0.1:5173> for the landing page, or <http://127.0.0.1:5173/workbench> for the editor.

Editing and exporting themes need no API key or network service.

## Validation

```sh
pnpm typecheck
pnpm test
pnpm build:workbench
pnpm test:browser:workbench
```

The Workbench browser suite runs against the production build, so build it first. The Storybook browser checks need `pnpm build:storybook` before `pnpm test:browser:storybook`.

## Project structure

| Location | Responsibility |
| --- | --- |
| `apps/workbench` | React editor, landing page, previews, browser persistence and exports |
| `packages/core` | Theme schema, migrations, mutations, CSS rendering and a read-only context CLI for agents |
| `packages/ui` | Shared components, compositions and Storybook |
| `e2e` | Playwright browser checks |
| `docs` | Design contracts, implementation notes and earlier research |

Package names and internal identifiers (`personal-ui-system`, `@personal-ui/*`, `personal-ui-theme`, `personal-ui-context/1`) predate the current name and are unchanged.

Built with TypeScript, React, Vite, Tailwind CSS v4 and shadcn-style components on Base UI and Radix primitives.

## Limitations

- **Local only.** There is no backend or account. Custom themes live in one browser's localStorage, and undo history is cleared on reload.
- **Design Command is experimental.** It sends the command text to the hosted TypeSafe API through a Vite dev-server endpoint. It needs `TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY` in the dev server's environment (documented in `.env.example`; Vite does not load it from `.env` files for you), accepts requests only from the Workbench's own origin, and is not available in a production build.
- **Not published packages.** `@personal-ui/core` and `@personal-ui/ui` are private workspace packages, not published to npm.
- **Known contrast debt.** A few kept colors fall short of WCAG AA: muted text in Default (light) and Secuna (both modes), the white label on Pocketmarket's light primary, and two light pairs in the shared default tones. The fixtures and browser checks record these shortfalls rather than fixing the colors silently.
- **Known test failures.** A few Workbench browser checks currently fail on `main`, and I haven't resolved them yet.

More detail is in the [Tactile interaction-depth notes](docs/TACTILE_INTERACTION_DEPTH.md) and the [core package guide](packages/core/README.md).
