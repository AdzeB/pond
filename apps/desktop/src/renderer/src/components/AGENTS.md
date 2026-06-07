# AGENTS.md (components/)

Rules for creating or refactoring any component in this tree. Defer to
[`.cursor/components/SKILL.md`](../../../../../../.cursor/components/SKILL.md)
for the full Pond house style: compound objects, CSS Modules, `data-*`
variants, semantic HTML, design tokens. This file only adds the rules
that aren't there yet: where things live, the single-file containment
preference, and the Vercel composition patterns checklist.

## Where things live

The tree is grouped by surface, **except for overlay primitives**, which
are grouped by type so they can be reused from any surface. The
type-grouped folders are `dialogs/`, `menus/`, `popovers/`, `selects/`,
and `comboboxes/` (see the taxonomy below). Everything else stays with
its surface.

| Folder | What goes here |
|---|---|
| `_primitives/` | Presentational, no domain state. Could be promoted to `@pond/ui` if a second consumer appears. |
| `dialogs/` | Every modal `Dialog`/`AlertDialog`, one folder per dialog. Holds the reusable `ConfirmDialog` and `PromptDialog` primitives plus the concrete dialogs (`customize-sources`, `relocate`, `quick-capture`, `categorize`, `repeat-custom`, …). Reach for `ConfirmDialog`/`PromptDialog` before hand-rolling another `AlertDialog`. |
| `menus/` | Every `Menu` (button-triggered) and `ContextMenu` (right-click), one folder per menu. Whole-folder moves (`save-context`, `view`, `display`, `help`, `library-switcher`, `video-context`) plus extracted inline menus (`source-context`, `sources-group`, `more-sources`, `tag-context`, `tag-group-context`, `filter-field`, `inspector-kebab`, `pond-switcher`, `recents`). Each takes its data/handlers as props; the host keeps trigger/open state. |
| `popovers/` | Arbitrary floating content that is **not** a value list — sliders, swatches, mini-forms (`tag-picker`, `video-volume`). |
| `selects/` | `Select` controls (one value from a small static set). `_shared/enum-select` is the generic `EnumSelect<T>` composer; concrete option sets build on it (`visibility`, `frequency`, `bind-address`, `video-speed`, `theme`). |
| `comboboxes/` | `Combobox`/`Autocomplete` — filterable / creatable value pickers (`bulk-tags`). |
| `shell/` | The `Shell` container, `Shell.Main` / `Header` / `Empty` chrome primitives, `StandaloneLayout`, and the chrome shared by every page: `Sidebar.*` primitives, `SidebarTools`, and the `Inspector` side panel. Surface-specific layouts live next to their surface (e.g. `library/layout.tsx`, `settings/layout.tsx`). |
| `library/` | Anything that lives inside the Library surface: grid/list primitive, sidebar, toolbar, filter-bar, bulk-action-bar. (Overlays it opens live in the type folders above.) |
| `save/` | Per-save surfaces (preview pane). Imported by the save-detail route and the inspector. |
| `media/` | Media playback (video player). |
| `command-palette/` | Top-level, cross-cutting. Stays at the root. |
| `settings/` | The `<Settings.*>` compound used by the settings sections. Stays at the root. |

### Primitive taxonomy (which type folder)

Pick the folder by what the control *is*, not by which surface opens it:

- **Menu** (`menus/`) — a list of commands you click to do something
  (navigate, run an action). Button-triggered. Never stores a value.
- **ContextMenu** (`menus/`) — same, but right-click-triggered on a
  target.
- **Select** (`selects/`) — pick exactly one value from a small,
  static, known set. Form control, no typing.
- **Combobox** (`comboboxes/`) — pick from a set with text filtering;
  supports multi-select, chips, create-new. The stored value(s) come
  from the option set.
- **Autocomplete** (`comboboxes/`) — free-text field where suggestions
  assist but the stored value is the typed text.
- **Popover** (`popovers/`) — arbitrary floating content that is not a
  value list (sliders, swatches, mini-forms).
- **NavigationMenu / Menubar / Toolbar** — site/app nav, app menu bar,
  button groups. These stay with their surface.

`@pond/ui` already wraps every base-ui part (Menu, ContextMenu, Select,
Combobox, Autocomplete, Popover). It stays a thin wrapper — **composed
pieces** (the `EnumSelect` composer, the creatable bulk-tags combobox)
live in the app type folders above, never in `@pond/ui`.

### Placement decisions

- **An overlay (menu / context-menu / popover / select / combobox)?** →
  its type folder, even if only one surface opens it. Keep the
  trigger/open state on the surface and drive the overlay through props.
- **A modal dialog (`Dialog`/`AlertDialog`)?** → `dialogs/`, even if
  only one surface opens it. Keep the trigger/state on the surface and
  drive the dialog through props (`open`, `onOpenChange`, `onConfirm`).
- **A new single-value `Select`?** → reach for `EnumSelect` in
  `selects/_shared` (options/value/onValueChange) before hand-rolling a
  `Select.Root`. Bespoke selects with separators, secondary labels, or
  items that open a dialog (e.g. the schedule frequency preset picker,
  the theme select) stay hand-rolled but still live in `selects/`.
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
