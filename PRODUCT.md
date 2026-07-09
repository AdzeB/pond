# Product

## Register

product

## Users

People who save and bookmark heavily across platforms (Twitter/X, Instagram, Pinterest, Are.na, Cosmos, TikTok, YouTube) and want one local, private archive of it all. They run Pond as a background companion app on their own Mac; when they open it they're either browsing their library or checking that syncing is healthy. The Sources screen is glanced at, not lived in — the job is "is everything connected and syncing, and if not, fix it fast."

## Product Purpose

Pond is a local-first personal archive: it syncs saved items from connected platforms through the user's own browser sessions into a SQLite-indexed library folder on disk. Success looks like the user trusting that their saves are quietly, safely accumulating without them having to think about it.

## Brand Personality

_Pending: user is choosing between direction variations (calm/quiet, crafted/precise, dense/power-user, warm/playful). Confirmed reference points: Arc (expressive, personal) and Things 3 (soft, calm, native-Mac). Update this section once a direction is chosen._

## Anti-references

No strong anti-references stated. General guardrails: avoid generic SaaS-analytics dashboard tropes (walls of KPI cards, sparkline decoration) and enterprise admin-panel grayness — Pond is a personal tool, not a work tool.

## Design Principles

1. **Glanceable health, not analytics.** Sync surfaces answer "is everything okay?" in one look; detail is progressive, behind a click.
2. **Quiet by default, loud only on failure.** Color and motion signal state (running, error, paused) — never decoration.
3. **Feels native to the Mac.** Familiar macOS affordances, density, and materials; the app should feel like it belongs on the platform.
4. **The library is the hero.** Chrome and monitoring UI stay visually subordinate to the user's saved content.

## Accessibility & Inclusion

Target WCAG AA contrast. `prefers-reduced-motion` alternatives are already established in the codebase and must be maintained for any new animation. Status must never be conveyed by color alone (pair with text or icon).
