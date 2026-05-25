# AGENTS.md (components/)

Rules for creating or refactoring any component in this tree. Defer to
[`.cursor/components/SKILL.md`](../../../../../../.cursor/components/SKILL.md)
for the full Pond house style: compound objects, CSS Modules, `data-*`
variants, semantic HTML, design tokens. This file only adds the rules
that aren't there yet: where things live, the single-file containment
preference, and the Vercel composition patterns checklist.

## Where things live

The tree is grouped by surface, not by component type.

| Folder | What goes here |
|---|---|
| `_primitives/` | Presentational, no domain state. Could be promoted to `@pond/ui` if a second consumer appears. |
| `shell/` | App frame, layouts, and the chrome shared by every page (sidebar, sidebar-tools). |
| `library/` | Anything that lives inside the Library surface: grid/list primitive, sidebar, toolbar, filter-bar, bulk-action-bar, inspector, quick-capture. Named library dropdowns (view, filter, display) live under `library/menus/`. |
| `save/` | Per-save surfaces (preview pane, context menu). Imported by the save-detail route and the inspector. |
| `capture/` | Background capture pipeline UI: the processing button + dialog and the activity dialog/list. |
| `media/` | Media playback (video player). |
| `command-palette/` | Top-level, cross-cutting. Stays at the root. |
| `settings/` | The `<Settings.*>` compound used by the settings sections. Stays at the root. |

### Placement decisions

- **Purely presentational, no domain knowledge?** → `_primitives/`.
- **Used by exactly one surface?** → that surface's folder (e.g. only
  the library uses it → `library/`).
- **Shared across surfaces with domain state?** → top level
  (`command-palette/`, `settings/`).
- **Not a component at all** (a mounted-once effect, a hook, a
  zustand-style store)? → it doesn't go in `components/`. Effects live
  in [`../effects/`](../effects/); hooks and stores in
  [`../lib/`](../lib/).

## Creating components

### Default to a single file

A new component is `index.tsx` + `styles.module.css`. That's it. Don't
pre-split sub-components into sibling files. The `packages/ui`
namespaces are the templates: multiple named pieces in one file.

- [`packages/ui/src/context-menu/index.tsx`](../../../../../../packages/ui/src/context-menu/index.tsx): 17 named pieces, one file.
- [`packages/ui/src/tooltip/index.tsx`](../../../../../../packages/ui/src/tooltip/index.tsx): 8 pieces, one file.
- [`packages/ui/src/dialog/index.tsx`](../../../../../../packages/ui/src/dialog/index.tsx): 6 pieces, one file.
- [`./settings/index.tsx`](settings/index.tsx): 12 pieces, one file.

Reach for a split only when the file genuinely becomes hard to
navigate. Rough rule of thumb: 400+ lines and the sub-components carry
non-trivial logic of their own. A long file of small, declarative
sub-components is fine; jumping between four files to read one render
path is not.

### One CSS Module per component

`styles.module.css` lives next to `index.tsx`. Class names are
kebab-case (per the workspace [`AGENTS.md`](../../../../../../AGENTS.md)).
No second stylesheet, no `<name>.css`, no co-located CSS variables file.

### Compound object export

```tsx
export const Component = { Root, Item, Trigger };
```

Never named exports of individual sub-components. The compound object
keeps the namespace obvious at the call site (`<Component.Root>` reads
like a sentence) and lets you rename internals without churning every
consumer.

### Quick split signal

If you find yourself reaching for `forwardRef`, prop-drilling
`isActive` through three layers, or wrapping a sub-component in `memo`
to dodge a re-render: that's the signal to refactor toward a
context-driven compound, **not** to split into more files. See the
checklist below and the
[`vercel-composition-patterns`](../../../../../../.agents/skills/vercel-composition-patterns/SKILL.md)
skill for what the refactor looks like.

## Vercel composition patterns checklist

Walk this list before opening a PR for any new or refactored component.
Mirrors the priority ordering in
[`.agents/skills/vercel-composition-patterns/SKILL.md`](../../../../../../.agents/skills/vercel-composition-patterns/SKILL.md).

### Architecture (HIGH)

- [ ] **No boolean props that switch behavior.** `compact`, `isThread`,
      `isEditing`, `bordered`: collapse into a `data-*` variant for
      styling, or split into separate sub-components for behavior.
- [ ] **Compound components share state via Context + `use()`,** not via
      props drilled through every level. Sub-components like `Icon`,
      `Label`, `Close` should take no state/action props at all.

### State (MEDIUM)

- [ ] **Context value follows the `{ state, actions, meta }` shape** so
      any provider can implement the contract.
- [ ] **Only the `Provider` (or a `StoreProvider` helper) reads app
      stores or global state.** Sub-components consume the context
      interface, not zustand selectors directly.
- [ ] **State that must reach siblings outside the visual tree is
      lifted into a `Provider`** rather than trapped in a hook inside
      `Root`.

### Implementation (MEDIUM)

- [ ] **No `renderHeader` / `renderFooter` / `renderActions` props.**
      Use `children` and let consumers compose. (`base-ui`'s internal
      `render={…}` is a separate idiom: fine to use, don't expose it
      on your own surface.)
- [ ] **Explicit variants over modes.** Two callers needing different
      behavior get two named components (`Root`, `CompactRoot`), not
      one `Root` with `compact?: boolean`.

### React 19 (MEDIUM)

- [ ] **No `forwardRef`.** `ref` is a regular prop on the props
      interface.
- [ ] **No `useContext`.** Use `use()` instead. It can be called
      conditionally.

## Where to look

- [`.cursor/components/SKILL.md`](../../../../../../.cursor/components/SKILL.md): full Pond
  component conventions (compound objects, CSS Modules, `data-*`
  variants, semantic HTML, design tokens).
- [`.agents/skills/vercel-composition-patterns/SKILL.md`](../../../../../../.agents/skills/vercel-composition-patterns/SKILL.md):
  composition pattern rules with code examples per rule.
- Reference compound implementations in this codebase:
  - [`packages/ui/src/context-menu/index.tsx`](../../../../../../packages/ui/src/context-menu/index.tsx)
  - [`packages/ui/src/tooltip/index.tsx`](../../../../../../packages/ui/src/tooltip/index.tsx)
  - [`./settings/index.tsx`](settings/index.tsx)
  - [`./library/index.tsx`](library/index.tsx)
  - [`./shell/sidebar/index.tsx`](shell/sidebar/index.tsx)
