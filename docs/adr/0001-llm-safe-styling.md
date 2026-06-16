# ADR 0001 — LLM-safe styling: how far to chase the "Orbit" model

- **Status:** Proposed (decision deferred — this record exists to argue with later)
- **Date:** 2026-06-17
- **Deciders:** Raphael
- **Context source:** Polar's [_Building an LLM-safe design system_](https://polar.sh/blog/orbit-llm-safe-design-system),
  plus a StyleX spike on `library-grid` (see Consequences).

## Context

Most UI in pond is now written with an LLM in the loop. The risk that motivates this
ADR is **drift**: an LLM writes fluent, plausible CSS that is subtly off-system —
`padding: 17px` where the scale says 16, a one-off `#888` instead of a token, a gray
that's _a_ gray but not _our_ gray. None of it is a syntax error; all of it passes lint
and renders; it is wrong in the one way static analysis doesn't currently catch.

Polar's answer ("Orbit") is three separable bets, in increasing cost:

1. **Intent-named tokens** — `padding="l"`, `backgroundColor="background-card"`. The
   token names a _decision_, not a value.
2. **`light-dark()` baked into every color token** — there is no `dark:` pass to forget,
   so the most common theming bug is not expressible.
3. **A typed `<Box>`/`<Text>` primitive + an ESLint ban on raw `<div>`/`className`** —
   remove the open string surface entirely; the only expressible styles are tokens.

The crucial framing: **Orbit is a reaction to Tailwind**, where the open string surface
lives _at the call site_ (`className="p-4 bg-gray-100"`). That is the specific hole `<Box>`
closes.

### Where pond actually stands

pond is **not** on Tailwind. It is on **CSS Modules + a generated `--ds-*` token system**
(`packages/ui/src/theme/tokens.css`, generated from `colors/ramps.ts`). That changes the
threat model and therefore the value of each Orbit bet:

| Orbit bet | pond status today |
| --- | --- |
| #2 `light-dark()` tokens | **Already done for color.** `--ds-gray-a*`, `--ds-tomato-*`, `--ds-grass-*` bake in `light-dark()`; grays are oklch ramps. There is no `dark:` variant to forget. The headline bug is already solved. |
| #1 intent tokens | **Half done.** The **radius** scale (`--ds-radius-xs…2xl`, `full`) is exactly Orbit-style role naming. But **colors are scale-named** (`--ds-gray-11`, `--ds-accent-9`), not intent-named — there is no `text-secondary` / `surface-card`. |
| Spacing | **Unguarded.** There is **no `--ds-space-*` scale at all.** Every gap/padding is a raw pixel literal. This is the real drift surface, with zero enforcement. |
| #3 `<Box>` + ban `<div>` | **Mostly redundant + architecturally costly.** CSS Modules already close the _call-site_ string hole; pond's JSX references `styles.x`, which must exist. pond's open surface is _inside_ the `.module.css` file, not the markup. |

### Decision drivers

- **Threat model fit.** Solve pond's actual leak (raw px/hex inside CSS Modules), not
  Tailwind's leak (open class strings at the call site) that pond doesn't have.
- **Enforcement over exhortation.** Per the Orbit thesis: docs are a probability, CI is a
  contract. A rule that survives a fresh LLM context window beats a paragraph in
  `AGENTS.md`.
- **Architectural coherence.** The renderer `AGENTS.md` codifies "every component owns a
  `styles.module.css`." Bet #3 inverts that. Reversals of a documented convention need to
  clear a high bar.
- **Cost of regret.** Prefer changes that are additive and reversible over a one-way
  rearchitecture.

## Options considered

### A. Harden tokens + add a lint contract (keep CSS Modules)

Add a `--ds-space-*` scale; add intent **aliases** over existing scale colors
(`--ds-text-secondary: var(--ds-gray-11)`, `--ds-surface-card: …`); add a `stylelint`
rule banning raw px (outside token defs) and raw hex/`oklch()` in `.module.css`.

- **Pros:** Targets pond's real drift surface. Additive and reversible. Keeps the
  documented architecture. The lint rule is the CSS-Modules-native analog of Orbit's
  ESLint contract. Builds on what's already 70% there.
- **Cons:** Aliases are a convention an LLM must still _choose_ to use (mitigated by the
  raw-value lint rule, which forces _some_ token). Doesn't give type-safe autocomplete of
  tokens.

### B. StyleX-token-first (no Box primitive)

Define spacing/color tokens with `stylex.defineVars`, migrate components to StyleX
`stylex.create` incrementally. Tokens become typed; typos become type errors.

- **Pros:** Type-safe tokens with autocomplete — the genuinely new capability over CSS
  vars. Proven viable (spike). Coexists with CSS Modules during migration.
- **Cons:** Two styling paradigms live side by side indefinitely. Pulls StyleX into
  `packages/ui` (cross-package module resolution, three bundler integrations: desktop,
  website, extension). Per-component `stylex.props` + `cn` merge ergonomics. Doesn't by
  itself stop raw values — still needs the ESLint `valid-styles`/lint layer.

### C. Full Orbit (`<Box>`/`<Text>` + ESLint ban on raw `<div>`/`className`)

Build typed polymorphic primitives on StyleX; forbid raw layout elements in CI.

- **Pros:** Strongest guarantee — off-system styles become close to inexpressible. Best
  "correct by construction" review experience.
- **Cons:** Highest cost and the largest philosophical reversal (inverts the
  `styles.module.css`-per-component convention). Buys pond _less_ marginal safety than it
  bought Polar, because pond's call sites were never the leak. Banning `className` fights
  Base UI / third-party component composition, which pond leans on heavily. Highest
  cost-of-regret.

## Decision

**Deferred.** Recommendation on the table is **Option A**, optionally followed by **B** in
the surfaces where type-safe tokens earn their keep. **Option C is not recommended for
pond** — its central lever (closing the call-site string surface) is already closed by CSS
Modules, and its cost (inverting a documented architecture, fighting `className`-based
component composition) is high.

The 80/20, in priority order:

1. **Add a spacing scale** (`--ds-space-*`). Highest-leverage, lowest-regret — it is the
   one drift surface with no current defense.
2. **Add intent color aliases** over the scale tokens so "name the decision" becomes
   _possible_ without regenerating ramps.
3. **Add a `stylelint` contract** banning raw px/hex/`oklch()` in component CSS. This is
   the line the rest of it hangs off: make off-system values fail CI, not just a review
   comment.

StyleX (`<Box>`) stays an _orthogonal option_, revisited only if typed-tokens-as-props
becomes a felt need.

## Consequences

- A `docs/adr/` convention now exists; future architectural decisions get a numbered
  record here.
- A StyleX spike was wired during the discussion (`@stylexjs/unplugin` in the desktop
  renderer config, `@stylex;` in `styles.css`, `library-grid` converted to `stylex.create`).
  It builds and typechecks; the atomic CSS aggregates under `@layer priority*` and the
  `--ds-*` tokens pass through untouched. **If Option A is chosen and StyleX is not pursued
  further, this spike should be reverted** so the repo doesn't carry an unused styling
  paradigm. If Option B is chosen, the spike is the seed.
- Choosing A keeps the renderer `AGENTS.md` styling convention intact. Choosing B or C
  requires updating it.

## Open questions

- Do we want intent tokens to _replace_ scale tokens at call sites, or sit as an alias
  layer on top? (Alias layer is lower-regret and is what this ADR assumes.)
- What spacing ramp? A `4px`-based geometric-ish scale (`4/8/12/16/24/32/48/64`) mirrors
  the radius scale and the Orbit example.
- Is a raw-value `stylelint` rule tolerable given the `oklch()`/`color-mix()`/`light-dark()`
  math already living in `tokens.css`? (Yes — scope the rule to component `*.module.css`
  and exempt the generated token files.)
