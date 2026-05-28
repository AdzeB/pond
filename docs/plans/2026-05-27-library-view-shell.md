# Library View Shell Implementation Plan

> **For agentic workers:** Use the `executing-plans` skill to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current submenu-style filter UI plus the chip bar with a single unified `View` dropdown containing Layout, Sort, Density, Display, Filter, and Restore defaults sections. The filter section adopts a row-based predicate editor (Linear/Notion/Airtable pattern). Folder reorg and the broader component refactor land behind it.

**Architecture:** Two compound components share a `ViewContext`. `View` owns the top-level menu and section navigation. `Filter` owns the row-based predicate editor inside `View.Filter`. All view configuration state (query, layout, sort, density, display prefs, zoom) lifts into a single `ViewProvider` that reads URL search + local prefs. The existing `@pond/schema/filters/types` query model is preserved unchanged. The 6 dropdown variants from `library/menus/filter/dropdowns/*` collapse into named pieces inside `value-select.tsx`. The chip bar (`library/filter-bar/`) is deleted entirely. The toolbar's separate filter button is removed; only `View.Trigger` remains.

**Tech Stack:** React 19 (`use()` over `useContext`, ref-as-prop), TypeScript, `@pond/ui` (Popover, Menu, Select, Switch, Slider, Tooltip, Button, Input), `@pond/schema/filters/*`, TanStack Router for URL state, CSS Modules with kebab-case classes, Biome for lint, Turbo for typecheck. No test framework: verification is `pnpm typecheck` + `pnpm lint:check` + manual smoke in the running dev server.

---

## 1. Scope

### Files this plan replaces or deletes

- `apps/desktop/src/renderer/src/components/library/menus/filter/` — entire subtree, including the `dropdowns/` folder and the six dropdown variants
- `apps/desktop/src/renderer/src/components/library/filter-bar/` — chip bar deleted entirely (no replacement; the View trigger's badge is the only at-a-glance filter status outside the menu)
- `apps/desktop/src/renderer/src/components/library/menus/view/index.tsx` (378 lines) — rewritten as the new `View` compound
- `apps/desktop/src/renderer/src/components/library/menus/view/styles.module.css` — replaced with several smaller CSS modules co-located with their pieces
- `apps/desktop/src/renderer/src/components/library/toolbar/index.tsx` — loses the standalone `<Filter />` sub-component; only `<ViewOptions />` remains, renamed to `<View />`
- Any route mounts of `<FilterBar.Root>` in `apps/desktop/src/renderer/src/routes/_library*`

### Files preserved unchanged

- `packages/schema/src/filters/*` — `Predicate`, `Query`, `FIELD_META`, `FIELD_IDS`, `COMPARATORS_BY_TYPE`, `EMPTY_QUERY`, URL read/write helpers
- `apps/desktop/src/renderer/src/lib/{display-prefs,view-prefs,density,use-zoom,motion}.ts` — the existing pref hooks the provider consumes
- `apps/desktop/src/renderer/src/components/library/menus/display/` — the tags-route Display menu (different surface, unrelated to this work)

### Files migrated into the new compound

- `library/menus/filter/score.ts`, `recents.ts`, `relative-time.ts`, `date-presets.ts`, `helpers.ts`, `use-add-commit-api.ts` — moved under the new feature folder; logic unchanged
- The six dropdown bodies from `dropdowns/{string,optional,enum,number,date,tags}/index.tsx` — collapse into named pieces inside the new `value-select.tsx` (~450 lines, one file with six bodies)
- The six dropdown CSS modules — merged into one `value-select.module.css` using `data-variant` attributes (`narrow`, `scroll`) for the variations

---

## 2. Architecture Audit (Consolidated)

Single source of truth for the architectural findings that motivate this work. Vocabulary follows `.agents/skills/improve-codebase-architecture/LANGUAGE.md`.

### Two component-shape pathologies

The depth complaint in `apps/desktop/src/renderer/src/components/` is downstream of two component-shape issues, not a folder problem.

**Over-split (shallow modules, deletion test concentrates complexity).** Each module's interface is roughly as wide as its implementation; deletion would not scatter complexity, only consolidate it.

| Module | Lines | Verdict |
|---|---|---|
| `library/menus/filter/dropdowns/string/index.tsx` | 22 | Wraps `<Input.Field>` with one `onChange`. |
| `library/menus/filter/dropdowns/optional/index.tsx` | 55 | Wraps two `<Menu.Item>` rows. |
| `library/menus/filter/dropdowns/enum/index.tsx` | 86 | Toggle + multi-select on a presets array. |
| `library/menus/filter/dropdowns/number/index.tsx` | 92 | Presets + min/max range pair. |
| `library/menus/filter/dropdowns/date/index.tsx` | 106 | Presets + custom range + relative parsing already in `relative-time.ts`. |
| `library/menus/filter/dropdowns/tags/index.tsx` | 194 | Borderline; substantive grouping logic but same `DropdownProps` contract. |

All six share `{ predicate, onChange }`, the same `.body / .search / .empty` CSS shape, and one consumer. Per the workspace `AGENTS.md` "Unify" rule, they collapse into one `value-select.tsx` with six named bodies.

**Under-split (deep modules with no seam).** Each over the workspace `AGENTS.md` 400-line split threshold. Multiple internal sub-modules sharing a domain bundle that has no interface (no `Context`, no compound).

| Module | Lines | Phase |
|---|---|---|
| `library/menus/filter/index.tsx` | 763 | Replaced by `View.Filter` (Phases A–D) |
| `library/menus/view/index.tsx` | 378 | Rewritten as `View` compound (Phases A–B) |
| `library/filter-bar/index.tsx` | 298 | Deleted (Phase D) |
| `save/preview/tag-picker/index.tsx` | 744 | Phase E |
| `save/context-menu/index.tsx` | 555 | Phase E |
| `settings/sections/developer/index.tsx` | 544 | Phase E |
| `settings/sections/integrations/index.tsx` | 832 | Phase E |
| `settings/sections/library/index.tsx` | 1284 | Phase E |
| `capture/processing-dialog/index.tsx` | 1061 | Phase E |
| `command-palette/cmdk/index.tsx` | 1000 | Phase E |

### Real seams to preserve

- `useAddCommitApi` — URL-backed `AddCommitApi` adapter. Today's only adapter, hypothetical seam. After this work it folds into `ViewProvider`; the `AddCommitApi` interface stays as the swap point.
- `CardContext` in `_primitives/card-thumb/` — already a context-driven compound; do not touch.
- `@pond/ui` compound contexts (Menu, Popover, Select, Toolbar) — consume as-is.

### Out of scope

Do not touch in this plan:

- `_primitives/card-thumb/*` (already a healthy compound; depth is structural)
- `library/all-tags/{rail,tag-item}/` (substantive logic, ≥300 lines each, keep as folders)
- The `index.tsx` + `styles.module.css` folder convention itself
- The `library/menus/display/` tags-route menu (different surface)

---

## 3. Target Shape

### Compound: `View` (top-level dropdown)

```tsx
export const View = {
  Root,        // Popover.Root + ViewProvider; reads URL + prefs; owns ViewState
  Trigger,     // toolbar button. Renders summary text: "Filter by N applied" if query non-empty, else "View"
  Menu,        // Popover.Popup; renders the section row list
  Section,     // a row in the menu: { id, icon, label, badge?, onActivate }
  Layout,      // <View.Layout /> — layout picker panel
  Sort,        // <View.Sort />
  Density,     // <View.Density />
  Display,     // <View.Display /> — the metadata toggle switches
  Zoom,        // <View.Zoom />
  Filter,      // <View.Filter /> — wraps the Filter compound, see below
  Reset,       // "Restore defaults" row (red)
};
```

### Compound: `Filter` (the row-based predicate editor)

```tsx
export const Filter = {
  Root,             // FilterProvider; owns the predicate list slice of ViewContext
  Header,           // "Filter by" title + per-section "Reset" link
  RowList,          // ordered list of <Filter.Row>s; renders <Filter.Empty> when query is empty
  Row,              // one predicate row; takes { index, predicate }
  Connector,        // "Where" (idx 0) | "And" (idx > 0); for now read-only since query is AND-only
  FieldSelect,      // popover trigger; opens field picker
  ComparatorSelect, // dropdown for the comparator (per field type)
  ValueSelect,      // popover trigger; opens the discriminated value editor (6 named bodies inside)
  Delete,           // trash icon button
  Reorder,          // drag handle (visual-only in this plan; functional drag deferred to a follow-up)
  Add,              // "+ Add a condition" footer button
  Empty,            // "No filters yet. Add a condition to start." empty state
};
```

### State seam: `ViewContext`

```ts
// context.ts
import type { Query } from "@pond/schema/filters/types";
import type { Density } from "@/lib/density";
import type { DisplayPrefKey } from "@/lib/display-prefs";
import type { LayoutValue } from "@/lib/view-prefs";

export type SortKey = "savedAt" | "title" | "fileSize";
export type SortDir = "asc" | "desc";

export interface ViewState {
  query: Query;
  layout: LayoutValue;
  sort: { key: SortKey; dir: SortDir };
  density: Density;
  displayPrefs: Record<DisplayPrefKey, boolean>;
  zoom: number;
}

export interface ViewActions {
  setQuery: (next: Query) => void;
  addPredicate: () => void;
  updatePredicate: (idx: number, next: Predicate | null) => void;
  reorderPredicate: (from: number, to: number) => void;
  resetFilters: () => void;
  setLayout: (next: LayoutValue) => void;
  setSort: (next: { key: SortKey; dir: SortDir }) => void;
  setDensity: (next: Density) => void;
  setDisplayPref: (key: DisplayPrefKey, value: boolean) => void;
  setZoom: (next: number) => void;
  restoreDefaults: () => void;
}

export interface ViewMeta {
  triggerRef?: React.Ref<HTMLButtonElement>;
}

export interface ViewContextValue {
  state: ViewState;
  actions: ViewActions;
  meta: ViewMeta;
}

export const ViewContext = createContext<ViewContextValue | null>(null);
```

A `useView()` helper hook with non-null assertion is exported from `context.ts` for the named pieces to consume.

### Section navigation pattern

The screenshot shows two separate popovers: the top-level menu and the active section's editor anchored next to it. Implementation:

- `View.Root` is a single `Popover.Root` whose `Popup` contains `View.Menu` PLUS the active section's panel as siblings, controlled by a small `activeSection` state owned by the Provider.
- The Provider exposes `activeSection: SectionId | null` and `setActiveSection(id)` in a separate `ViewNavState` slot (kept distinct from `ViewState` because navigation is ephemeral, not URL-state).
- `View.Section` renders as a `<button>` row; clicking calls `setActiveSection(id)`.
- The right-side panel renders the active section component (`View.Filter`, `View.Sort`, etc.) inside the same popup, with a small back-arrow header to return to the menu list. This matches the screenshot's "menu on right, expanded panel on left" layout.

The active panel slides in via the existing `@/lib/motion` spring; the menu list slides out. The same animation primitive used elsewhere in the app handles the swap.

---

## 4. UX Details

Annotated breakdown of the reference screenshot:

| Region | Behaviour |
|---|---|
| **View trigger** (toolbar button) | Shows badge text reflecting active state. When `query.clauses.length > 0`: "Filter by N applied". Otherwise: "View". |
| **Top-level menu** (right side of screenshot) | Vertical list of `View.Section` rows: Layout, Sort by, Density, Display, Filter by, Restore defaults. Each shows current value as a badge ("Date saved", "Comfortable", "3 applied"). |
| **Section panel** (left side of screenshot) | Anchored to the menu, slides in from the left. Header has the section label and a "Reset" link that resets only that section. |
| **Filter row layout** | `[Where|And] [field▾] [cmp▾] [value▾] [🗑] [⋮⋮]` — 6 segments. Connector is left-aligned, delete and reorder right-aligned. |
| **Field select trigger** | Shows current field's icon + label (e.g. "T Category"). Opens a popover with the field picker. |
| **Comparator select trigger** | Shows current comparator label ("is any of"). Opens a small dropdown listing valid comparators for that field type. |
| **Value select trigger** | Shows a summary of the current value ("Select" when empty, "Politics" when one selected, "3 values" when multiple). Opens a popover containing the discriminated value editor. |
| **Add condition** | `+ Add a condition` row at the bottom of the row list. Appends a fresh `defaultPredicateFor(firstField)` predicate and immediately opens its field picker. |
| **Empty state** | When no predicates exist: a single muted line "No filters yet. Add a condition to start." plus the Add row. |
| **Reset / Restore defaults** | "Reset" in the filter panel header clears only the query. "Restore defaults" in the bottom of the menu resets the entire view config to app-shipped defaults. |

---

## 5. Domain Language

No new ADRs. Reuse existing names from `packages/schema/src/filters/*`:

- `Predicate` = `{ kind: "p", field, cmp, value, negate? }` — one row's content
- `Query` = `{ kind: "and", clauses: Predicate[] }` — the whole filter
- `FIELD_META`, `FIELD_IDS` — field taxonomy
- `COMPARATORS_BY_TYPE`, `COMPARATOR_LABELS` — comparator taxonomy

New terms introduced in this plan, scoped to the View feature:

- **ViewConfig** — the full bundle `{ query, layout, sort, density, displayPrefs, zoom }` owned by `ViewProvider`. Persisted across `displayPrefs` (localStorage via existing `lib/display-prefs.ts`), URL search params (`query`, `layout`, `sort`, `dir`), and local view-prefs (`lib/view-prefs.ts`).
- **SectionId** — `"layout" | "sort" | "density" | "display" | "zoom" | "filter"` — keys for navigation state.
- **ViewDefaults** — the app-shipped defaults, used by `restoreDefaults()`. Sourced from existing constants in `lib/view-prefs.ts` and `lib/density.ts`.

---

## 6. File Structure

### After Phase D (cutover complete)

```
apps/desktop/src/renderer/src/components/library/view-menu/
  index.tsx                  # View compound exports + Trigger + Menu + Section + Root composition (~250 lines)
  provider.tsx               # ViewProvider; owns ViewContext + ViewNavState (~220 lines)
  context.ts                 # ViewContext, types, useView hook (~120 lines)
  styles.module.css          # popup chrome, section row, menu/panel layout (~120 lines)
  trigger.tsx                # View.Trigger button + summary text (~60 lines)
  sections/
    layout.tsx               # View.Layout panel (~80 lines)
    layout.module.css
    sort.tsx                 # View.Sort panel (~90 lines)
    sort.module.css
    density.tsx              # View.Density panel (~50 lines)
    density.module.css
    display.tsx              # View.Display panel (toggles + sidebar/inspector visibility) (~90 lines)
    display.module.css
    zoom.tsx                 # View.Zoom panel (slider + buttons) (~80 lines)
    zoom.module.css
  filter/
    index.tsx                # Filter compound + Header + RowList + Row + Connector + Add (~220 lines)
    provider.tsx             # FilterProvider; thin wrapper around ViewContext predicate slice (~80 lines)
    field-select.tsx         # Filter.FieldSelect popover (~140 lines)
    field-select.module.css
    comparator-select.tsx    # Filter.ComparatorSelect dropdown (~70 lines)
    comparator-select.module.css
    value-select.tsx         # Filter.ValueSelect popover + 6 named bodies (~450 lines)
    value-select.module.css  # merged from 6 dropdown stylesheets via data-variant
    helpers.ts               # AddCommitApi, predicate helpers (moved from old filter feature)
    search-index.ts          # buildSearchIndex, etc. (moved from old filter feature; used by FieldSelect search)
    score.ts                 # moved
    recents.ts               # moved
    relative-time.ts         # moved
    date-presets.ts          # moved
    styles.module.css        # row layout, connector chip, delete/reorder buttons (~80 lines)
```

The `library/menus/` parent folder is removed entirely (only `display/` remained, which moves to `library/tags-display-menu/` in Phase G).

### Deleted at the end of Phase D

```
apps/desktop/src/renderer/src/components/library/menus/filter/      # entire subtree
apps/desktop/src/renderer/src/components/library/menus/view/        # entire subtree (rewritten under view-menu/)
apps/desktop/src/renderer/src/components/library/filter-bar/        # entire subtree
```

---

## 7. Phase A — View Shell

Build the empty View compound. ViewProvider owns state but only Layout passes through unchanged; other sections render placeholder panels. Toolbar still uses the old ViewPicker; nothing user-visible changes yet.

**Files:**
- Create: `apps/desktop/src/renderer/src/components/library/view-menu/context.ts`
- Create: `apps/desktop/src/renderer/src/components/library/view-menu/provider.tsx`
- Create: `apps/desktop/src/renderer/src/components/library/view-menu/trigger.tsx`
- Create: `apps/desktop/src/renderer/src/components/library/view-menu/index.tsx`
- Create: `apps/desktop/src/renderer/src/components/library/view-menu/styles.module.css`

### Task A1: Create `context.ts` and the `ViewContext` interface

- [ ] **Step 1: Write `context.ts`**

```ts
// apps/desktop/src/renderer/src/components/library/view-menu/context.ts
import type { Predicate, Query } from "@pond/schema/filters/types";
import { createContext, use } from "react";
import type { Density } from "@/lib/density";
import type { DisplayPrefKey } from "@/lib/display-prefs";
import type { LayoutValue } from "@/lib/view-prefs";

export type SortKey = "savedAt" | "title" | "fileSize";
export type SortDir = "asc" | "desc";

export type SectionId =
  | "layout"
  | "sort"
  | "density"
  | "display"
  | "zoom"
  | "filter";

export interface ViewState {
  query: Query;
  layout: LayoutValue;
  sort: { key: SortKey; dir: SortDir };
  density: Density;
  displayPrefs: Record<DisplayPrefKey, boolean>;
  zoom: number;
}

export interface ViewActions {
  setQuery: (next: Query) => void;
  addPredicate: () => void;
  updatePredicate: (idx: number, next: Predicate | null) => void;
  reorderPredicate: (from: number, to: number) => void;
  resetFilters: () => void;
  setLayout: (next: LayoutValue) => void;
  setSort: (next: { key: SortKey; dir: SortDir }) => void;
  setDensity: (next: Density) => void;
  setDisplayPref: (key: DisplayPrefKey, value: boolean) => void;
  setZoom: (next: number) => void;
  restoreDefaults: () => void;
}

export interface ViewNav {
  activeSection: SectionId | null;
  setActiveSection: (next: SectionId | null) => void;
}

export interface ViewMeta {
  triggerRef?: React.Ref<HTMLButtonElement>;
}

export interface ViewContextValue {
  state: ViewState;
  actions: ViewActions;
  nav: ViewNav;
  meta: ViewMeta;
}

export const ViewContext = createContext<ViewContextValue | null>(null);

export function useView(): ViewContextValue {
  const ctx = use(ViewContext);
  if (!ctx) {
    throw new Error("View sub-component used outside View.Root");
  }
  return ctx;
}
```

- [ ] **Step 2: Verify file compiles**

Run: `pnpm typecheck`

Expected: PASS. Unused imports (`Predicate`) will be flagged by Biome; that's fine until the provider lands in Task A2.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/library/view-menu/context.ts
git commit -m "feat(view): introduce ViewContext interface"
```

### Task A2: Create `provider.tsx` with the ViewProvider

The provider reads existing URL + prefs hooks (preserves backward-compat) and exposes the unified interface.

- [ ] **Step 1: Write `provider.tsx`**

```tsx
// apps/desktop/src/renderer/src/components/library/view-menu/provider.tsx
import { EMPTY_QUERY } from "@pond/schema/filters/types";
import type { Predicate, Query } from "@pond/schema/filters/types";
import { readQuery, writeQuery } from "@pond/schema/filters/url";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";
import { type Density, useDensity } from "@/lib/density";
import {
  type DisplayPrefKey,
  setDisplayPref as writeDisplayPref,
  useDisplayPrefs,
} from "@/lib/display-prefs";
import { patchSearch } from "@/lib/navigate-path";
import { paramsToSearch, searchToParams } from "@/lib/search-schemas";
import { useZoom } from "@/lib/use-zoom";
import {
  isLayoutValue,
  type LayoutValue,
  readViewPref,
  writeViewPref,
} from "@/lib/view-prefs";
import {
  type SectionId,
  type SortDir,
  type SortKey,
  ViewContext,
  type ViewContextValue,
} from "./context";

const SORT_KEYS = new Set<SortKey>(["savedAt", "title", "fileSize"]);

interface RootProps {
  children: ReactNode;
  triggerRef?: React.Ref<HTMLButtonElement>;
}

export function Root({ children, triggerRef }: RootProps) {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();
  const displayPrefs = useDisplayPrefs();
  const [density, setDensity] = useDensity();
  const [zoom, setZoom] = useZoom();
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  const params = useMemo(() => searchToParams(search), [search]);
  const query = useMemo(() => readQuery(params), [params]);

  const layout = useMemo<LayoutValue>(() => {
    const raw =
      (search.view as string | undefined) ?? readViewPref("view") ?? "waterfall";
    return isLayoutValue(raw) ? raw : "waterfall";
  }, [search.view]);

  const sort = useMemo<{ key: SortKey; dir: SortDir }>(() => {
    const rawKey =
      (search.sort as string | undefined) ?? readViewPref("sort") ?? "savedAt";
    const key: SortKey = SORT_KEYS.has(rawKey as SortKey)
      ? (rawKey as SortKey)
      : "savedAt";
    const rawDir = (search.dir as string | undefined) ?? readViewPref("dir");
    const dir: SortDir = rawDir === "asc" ? "asc" : "desc";
    return { key, dir };
  }, [search.sort, search.dir]);

  const commitQuery = useCallback(
    (next: Query) => {
      const written = writeQuery(params, next);
      patchSearch(navigate, () => paramsToSearch(written), { replace: true });
    },
    [navigate, params],
  );

  const setLayout = useCallback(
    (next: LayoutValue) => {
      writeViewPref("view", next);
      patchSearch(
        navigate,
        (prev) => {
          const out = { ...prev };
          if (next === "waterfall") delete out.view;
          else out.view = next;
          return out;
        },
        { replace: true },
      );
    },
    [navigate],
  );

  const setSort = useCallback(
    (next: { key: SortKey; dir: SortDir }) => {
      writeViewPref("sort", next.key);
      writeViewPref("dir", next.dir);
      patchSearch(
        navigate,
        (prev) => {
          const out = { ...prev };
          if (next.key === "savedAt") delete out.sort;
          else out.sort = next.key;
          if (next.dir === "desc") delete out.dir;
          else out.dir = next.dir;
          return out;
        },
        { replace: true },
      );
    },
    [navigate],
  );

  const setDisplayPref = useCallback(
    (key: DisplayPrefKey, value: boolean) => writeDisplayPref(key, value),
    [],
  );

  const addPredicate = useCallback(() => {
    // Use the first available field as the seed. The caller will immediately
    // open the FieldSelect popover for the new row.
    const first: Predicate = {
      kind: "p",
      field: "tags",
      cmp: "some",
      value: [],
    };
    commitQuery({ kind: "and", clauses: [...query.clauses, first] });
  }, [commitQuery, query]);

  const updatePredicate = useCallback(
    (idx: number, next: Predicate | null) => {
      const clauses = [...query.clauses];
      if (idx < 0 || idx >= clauses.length) return;
      if (next === null) clauses.splice(idx, 1);
      else clauses[idx] = next;
      commitQuery({ kind: "and", clauses });
    },
    [commitQuery, query.clauses],
  );

  const reorderPredicate = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      const clauses = [...query.clauses];
      const [moved] = clauses.splice(from, 1);
      if (!moved) return;
      clauses.splice(to, 0, moved);
      commitQuery({ kind: "and", clauses });
    },
    [commitQuery, query.clauses],
  );

  const resetFilters = useCallback(() => {
    commitQuery(EMPTY_QUERY);
  }, [commitQuery]);

  const restoreDefaults = useCallback(() => {
    commitQuery(EMPTY_QUERY);
    setLayout("waterfall");
    setSort({ key: "savedAt", dir: "desc" });
    setDensity("comfortable");
    setZoom(1);
  }, [commitQuery, setLayout, setSort, setDensity, setZoom]);

  const value = useMemo<ViewContextValue>(
    () => ({
      state: {
        query,
        layout,
        sort,
        density,
        displayPrefs,
        zoom,
      },
      actions: {
        setQuery: commitQuery,
        addPredicate,
        updatePredicate,
        reorderPredicate,
        resetFilters,
        setLayout,
        setSort,
        setDensity,
        setDisplayPref,
        setZoom,
        restoreDefaults,
      },
      nav: { activeSection, setActiveSection },
      meta: { triggerRef },
    }),
    [
      query,
      layout,
      sort,
      density,
      displayPrefs,
      zoom,
      activeSection,
      triggerRef,
      commitQuery,
      addPredicate,
      updatePredicate,
      reorderPredicate,
      resetFilters,
      setLayout,
      setSort,
      setDensity,
      setDisplayPref,
      setZoom,
      restoreDefaults,
    ],
  );

  return <ViewContext value={value}>{children}</ViewContext>;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`

Expected: PASS. The provider is unused so far; that's fine.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/library/view-menu/provider.tsx
git commit -m "feat(view): add ViewProvider with URL + prefs state"
```

### Task A3: Create `trigger.tsx` and the View shell skeleton

- [ ] **Step 1: Write `trigger.tsx`**

```tsx
// apps/desktop/src/renderer/src/components/library/view-menu/trigger.tsx
import { Button } from "@pond/ui";
import { Eye } from "lucide-react";
import { useView } from "./context";
import styles from "./styles.module.css";

interface TriggerProps {
  render?: React.ReactElement;
}

export function Trigger({ render }: TriggerProps) {
  const { state } = useView();
  const activeFilters = state.query.clauses.length;
  const label = activeFilters > 0
    ? `Filter by ${activeFilters} applied`
    : "View";

  if (render) {
    return render;
  }

  return (
    <Button
      icon
      aria-label={label}
      title={label}
      className={styles.trigger}
    >
      <Eye style={{ width: "100%", height: "100%" }} />
      {activeFilters > 0 ? (
        <span className={styles["trigger-badge"]} aria-hidden>
          {activeFilters}
        </span>
      ) : null}
    </Button>
  );
}
```

- [ ] **Step 2: Write `styles.module.css`**

```css
/* apps/desktop/src/renderer/src/components/library/view-menu/styles.module.css */
.trigger {
  position: relative;
}

.trigger-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  font-size: 10px;
  font-weight: 600;
  color: var(--ds-gray-1);
  background: var(--ds-accent-9);
  border-radius: 2147483647px;
}

.popup {
  display: flex;
  flex-direction: row;
  min-width: 280px;
  max-width: 560px;
  padding: 0;
  overflow: hidden;
}

.menu {
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 240px;
  padding: 6px;
}

.panel {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 320px;
  padding: 6px;
  border-right: 1px solid var(--ds-gray-a4);
}

.section-row {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
  align-items: center;
  padding: 6px 8px;
  font-size: 12px;
  color: var(--ds-gray-12);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;
}

.section-row:hover {
  background: var(--ds-gray-a3);
}

.section-row[data-active="true"] {
  background: var(--ds-gray-a4);
}

.section-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--ds-gray-11);
}

.section-label {
  flex: 1;
}

.section-badge {
  flex-shrink: 0;
  padding-left: 8px;
  font-size: 11px;
  color: var(--ds-gray-11);
}

.reset {
  margin-top: 4px;
  color: var(--ds-red-11);
}

.panel-header {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 4px 6px;
  margin-bottom: 4px;
}

.panel-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  color: var(--ds-gray-11);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;
}

.panel-back:hover {
  color: var(--ds-gray-12);
  background: var(--ds-gray-a3);
}

.panel-title {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
  color: var(--ds-gray-12);
}

.panel-reset {
  font-size: 11px;
  color: var(--ds-accent-11);
  cursor: pointer;
  background: transparent;
  border: 0;
}

.separator {
  height: 1px;
  margin: 4px 6px;
  background: var(--ds-gray-a4);
  border: 0;
}
```

- [ ] **Step 3: Write `index.tsx` with the View shell**

```tsx
// apps/desktop/src/renderer/src/components/library/view-menu/index.tsx
import { Popover } from "@pond/ui";
import {
  ArrowLeft,
  ArrowUpDown,
  Eye,
  LayoutGrid,
  ListFilter,
  RotateCcw,
  SlidersHorizontal,
  ZoomIn,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { type SectionId, useView } from "./context";
import { Root as Provider } from "./provider";
import { Trigger } from "./trigger";
import styles from "./styles.module.css";

interface RootProps {
  trigger?: React.ReactElement;
  children?: ReactNode;
}

function Root({ trigger, children }: RootProps) {
  return (
    <Provider>
      <Popover.Root>
        <Popover.Trigger render={trigger ?? <Trigger />} />
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="end" sideOffset={6}>
            <Popover.Popup className={styles.popup}>
              {children ?? <DefaultBody />}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </Provider>
  );
}

function DefaultBody() {
  return (
    <>
      <ActivePanel />
      <Menu />
    </>
  );
}

function Menu() {
  return (
    <div className={styles.menu}>
      <Section
        id="layout"
        icon={LayoutGrid}
        label="Layout"
        renderBadge={({ layout }) => labelForLayout(layout)}
      />
      <Section
        id="sort"
        icon={ArrowUpDown}
        label="Sort by"
        renderBadge={({ sort }) => `${labelForSortKey(sort.key)} ${sort.dir === "asc" ? "↑" : "↓"}`}
      />
      <Section
        id="density"
        icon={Eye}
        label="Density"
        renderBadge={({ density }) => density.charAt(0).toUpperCase() + density.slice(1)}
      />
      <Section
        id="display"
        icon={SlidersHorizontal}
        label="Display"
      />
      <Section
        id="zoom"
        icon={ZoomIn}
        label="Zoom"
        renderBadge={({ zoom }) => `${Math.round(zoom * 100)}%`}
      />
      <Section
        id="filter"
        icon={ListFilter}
        label="Filter by"
        renderBadge={({ query }) =>
          query.clauses.length > 0 ? `${query.clauses.length} applied` : undefined
        }
      />
      <hr className={styles.separator} />
      <Reset />
    </div>
  );
}

interface SectionProps {
  id: SectionId;
  icon: ComponentType<{ width?: string | number; height?: string | number }>;
  label: string;
  renderBadge?: (state: ReturnType<typeof useView>["state"]) => string | undefined;
}

function Section({ id, icon: Icon, label, renderBadge }: SectionProps) {
  const { state, nav } = useView();
  const badge = renderBadge?.(state);
  return (
    <button
      type="button"
      className={styles["section-row"]}
      data-active={nav.activeSection === id ? "true" : undefined}
      onClick={() => nav.setActiveSection(id)}
    >
      <span className={styles["section-icon"]} aria-hidden>
        <Icon width="14" height="14" />
      </span>
      <span className={styles["section-label"]}>{label}</span>
      {badge ? <span className={styles["section-badge"]}>{badge}</span> : null}
    </button>
  );
}

function Reset() {
  const { actions } = useView();
  return (
    <button
      type="button"
      className={`${styles["section-row"]} ${styles.reset}`}
      onClick={() => actions.restoreDefaults()}
    >
      <span className={styles["section-icon"]} aria-hidden>
        <RotateCcw width="14" height="14" />
      </span>
      <span className={styles["section-label"]}>Restore defaults</span>
    </button>
  );
}

function ActivePanel() {
  const { nav } = useView();
  if (!nav.activeSection) return null;

  return (
    <div className={styles.panel}>
      <PanelHeader />
      <PanelBody id={nav.activeSection} />
    </div>
  );
}

function PanelHeader() {
  const { nav } = useView();
  if (!nav.activeSection) return null;
  return (
    <div className={styles["panel-header"]}>
      <button
        type="button"
        className={styles["panel-back"]}
        aria-label="Back to View menu"
        onClick={() => nav.setActiveSection(null)}
      >
        <ArrowLeft width="14" height="14" />
      </button>
      <span className={styles["panel-title"]}>{labelForSection(nav.activeSection)}</span>
    </div>
  );
}

function PanelBody({ id }: { id: SectionId }) {
  // Stub until Phase B / C land the actual panels.
  return <div style={{ padding: 16, color: "var(--ds-gray-11)" }}>{labelForSection(id)} panel coming soon.</div>;
}

function labelForSection(id: SectionId): string {
  switch (id) {
    case "layout": return "Layout";
    case "sort": return "Sort by";
    case "density": return "Density";
    case "display": return "Display";
    case "zoom": return "Zoom";
    case "filter": return "Filter by";
  }
}

function labelForLayout(layout: string): string {
  return layout.charAt(0).toUpperCase() + layout.slice(1);
}

function labelForSortKey(key: string): string {
  switch (key) {
    case "savedAt": return "Date saved";
    case "title": return "Title";
    case "fileSize": return "Size";
    default: return key;
  }
}

export const View = {
  Root,
  Trigger,
  Menu,
  Section,
  Reset,
};

export { useView } from "./context";
```

- [ ] **Step 4: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint:check`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/renderer/src/components/library/view-menu/{index.tsx,trigger.tsx,styles.module.css}
git commit -m "feat(view): scaffold View compound with Section navigation"
```

---

## 8. Phase B — Migrate existing controls

Move the existing Layout, Sort, Density, Display, Zoom UIs from the old `library/menus/view/index.tsx` into `View.*` sub-panels. After this phase, opening the new View dropdown shows working Layout/Sort/Density/Display/Zoom panels reachable from the menu. The Filter section still shows the stub.

The old toolbar's `ViewOptions` is NOT yet swapped — both view dropdowns coexist (old + new) until Phase D. The new one mounts under a hidden Cmd-Shift-V test trigger or a temporary route flag so we can verify behaviour without breaking users.

**Files:**
- Create: `apps/desktop/src/renderer/src/components/library/view-menu/sections/{layout,sort,density,display,zoom}.tsx`
- Create: `apps/desktop/src/renderer/src/components/library/view-menu/sections/{layout,sort,density,display,zoom}.module.css`
- Modify: `apps/desktop/src/renderer/src/components/library/view-menu/index.tsx`

### Task B1: `View.Layout` panel

- [ ] **Step 1: Create `sections/layout.tsx`**

```tsx
// apps/desktop/src/renderer/src/components/library/view-menu/sections/layout.tsx
import { Select } from "@pond/ui";
import { ChevronsUpDown } from "lucide-react";
import { isLayoutValue, type LayoutValue } from "@/lib/view-prefs";
import { useView } from "../context";
import styles from "./layout.module.css";

const OPTIONS: Array<{ value: LayoutValue; label: string }> = [
  { value: "waterfall", label: "Waterfall" },
  { value: "grid", label: "Grid" },
  { value: "justified", label: "Justified" },
  { value: "list", label: "List" },
];

export function Layout() {
  const { state, actions } = useView();
  return (
    <div className={styles.body}>
      <Select.Root
        value={state.layout}
        onValueChange={(v) => {
          if (typeof v === "string" && isLayoutValue(v)) {
            actions.setLayout(v);
          }
        }}
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Icon>
            <ChevronsUpDown />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner sideOffset={6}>
            <Select.Popup>
              {OPTIONS.map((opt) => (
                <Select.Item key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Item>
              ))}
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
```

- [ ] **Step 2: Create `sections/layout.module.css`**

```css
.body {
  display: flex;
  flex-direction: column;
  padding: 6px;
}
```

- [ ] **Step 3: Wire into `index.tsx`'s `PanelBody`**

In `view-menu/index.tsx`, replace the `PanelBody` stub:

```tsx
import { Layout } from "./sections/layout";

function PanelBody({ id }: { id: SectionId }) {
  switch (id) {
    case "layout": return <Layout />;
    default: return <div style={{ padding: 16, color: "var(--ds-gray-11)" }}>{labelForSection(id)} panel coming soon.</div>;
  }
}
```

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm typecheck && pnpm lint:check
git add apps/desktop/src/renderer/src/components/library/view-menu/sections/layout.{tsx,module.css} apps/desktop/src/renderer/src/components/library/view-menu/index.tsx
git commit -m "feat(view): add Layout section panel"
```

### Task B2: `View.Sort` panel

- [ ] **Step 1: Create `sections/sort.tsx`** with a `Select.Root` for the sort key and a button pair for direction, structured the same way as the old view-menu's `Row label="Sort by"` block (lines 184–241 of `library/menus/view/index.tsx`). Read from `state.sort`, call `actions.setSort({ key, dir })`. Bodies for direction buttons:

```tsx
import { Select, Tooltip } from "@pond/ui";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { useView, type SortKey } from "../context";
import styles from "./sort.module.css";

const KEYS = new Set<SortKey>(["savedAt", "title", "fileSize"]);
const OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "savedAt", label: "Date saved" },
  { value: "title", label: "Title" },
  { value: "fileSize", label: "Size" },
];

export function Sort() {
  const { state, actions } = useView();
  const { key, dir } = state.sort;
  return (
    <div className={styles.body}>
      <Select.Root
        value={key}
        onValueChange={(v) => {
          if (typeof v === "string" && KEYS.has(v as SortKey)) {
            actions.setSort({ key: v as SortKey, dir });
          }
        }}
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Icon>
            <ChevronsUpDown />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner sideOffset={6}>
            <Select.Popup>
              {OPTIONS.map((opt) => (
                <Select.Item key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Item>
              ))}
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      <fieldset className={styles["dir-group"]}>
        <legend className={styles["sr-only"]}>Sort direction</legend>
        <Tooltip label="Ascending" side="bottom">
          <button
            type="button"
            aria-label="Sort ascending"
            aria-pressed={dir === "asc"}
            className={styles["dir-btn"]}
            onClick={() => actions.setSort({ key, dir: "asc" })}
          >
            <ArrowUp width="0.85em" height="0.85em" />
          </button>
        </Tooltip>
        <Tooltip label="Descending" side="bottom">
          <button
            type="button"
            aria-label="Sort descending"
            aria-pressed={dir === "desc"}
            className={styles["dir-btn"]}
            onClick={() => actions.setSort({ key, dir: "desc" })}
          >
            <ArrowDown width="0.85em" height="0.85em" />
          </button>
        </Tooltip>
      </fieldset>
    </div>
  );
}
```

- [ ] **Step 2: Create `sections/sort.module.css`** by copying the `.dir-group`, `.dir-btn`, `.sr-only` classes from the old `library/menus/view/styles.module.css` (lines 43–90), prefixed with `.body { display: flex; flex-direction: column; gap: 8px; padding: 6px; }`.

- [ ] **Step 3: Wire into `index.tsx`'s `PanelBody`** by adding `case "sort": return <Sort />;`.

- [ ] **Step 4: Typecheck + commit**

```bash
git add apps/desktop/src/renderer/src/components/library/view-menu
git commit -m "feat(view): add Sort section panel"
```

### Task B3: `View.Density`, `View.Display`, `View.Zoom` panels

Same pattern as B1/B2. Each is a small file that reads state from `useView()` and calls the matching action.

- [ ] **Step 1: Create `sections/density.tsx`** — Select.Root over `["compact", "comfortable", "spacious"]`.

- [ ] **Step 2: Create `sections/display.tsx`** — list of `Switch.Root` rows, one per `DisplayPrefKey` from `lib/display-prefs.ts`. Use the same `DISPLAY_TOGGLES` constant from the old file (move it into `display.tsx`).

- [ ] **Step 3: Create `sections/zoom.tsx`** — the `ZoomControl` from the old `library/menus/view/index.tsx` (lines 325–378). Copy its body unchanged; replace `useZoom()` import with `useView()` for state read and `actions.setZoom` for writes. (`useZoom()` is still the underlying hook so this could alternatively keep the hook directly; either is fine. Prefer reading from context for consistency.)

- [ ] **Step 4: Copy CSS** for each section from the old `library/menus/view/styles.module.css` into its co-located `*.module.css`.

- [ ] **Step 5: Wire all three into `PanelBody`**:

```tsx
import { Density } from "./sections/density";
import { Display } from "./sections/display";
import { Zoom } from "./sections/zoom";

function PanelBody({ id }: { id: SectionId }) {
  switch (id) {
    case "layout": return <Layout />;
    case "sort": return <Sort />;
    case "density": return <Density />;
    case "display": return <Display />;
    case "zoom": return <Zoom />;
    case "filter": return <div style={{ padding: 16, color: "var(--ds-gray-11)" }}>Filter panel coming soon.</div>;
  }
}
```

- [ ] **Step 6: Typecheck + commit**

```bash
pnpm typecheck && pnpm lint:check
git add apps/desktop/src/renderer/src/components/library/view-menu
git commit -m "feat(view): add Density, Display, and Zoom section panels"
```

### Task B4: Temporary mount for smoke testing

Add a debug mount alongside the old `ViewPicker` so we can compare. **The old menu stays the primary trigger.**

- [ ] **Step 1: Modify `library/toolbar/index.tsx`** to add a temporary `<View.Root>` mount with a different icon, gated behind a localStorage flag:

```tsx
// at the top of ViewOptions function:
import { View } from "@/components/library/view-menu";
import { Button } from "@pond/ui";
import { TestTube2 } from "lucide-react";

function ViewOptions() {
  const showNew = typeof window !== "undefined" && localStorage.getItem("pond.view.preview") === "1";
  return (
    <>
      <Tooltip label="View options" side="bottom">
        <ViewPicker
          trigger={<Button icon aria-label="View options"><Eye style={{ width: "100%", height: "100%" }} /></Button>}
        />
      </Tooltip>
      {showNew ? (
        <View.Root
          trigger={<Button icon aria-label="View options (preview)"><TestTube2 style={{ width: "100%", height: "100%" }} /></Button>}
        />
      ) : null}
    </>
  );
}
```

- [ ] **Step 2: Verify the new View opens**

Open Pond's devtools console, run `localStorage.setItem("pond.view.preview", "1")`, reload. Click the test-tube icon next to the eye icon. Expected: the new View popup opens, all 6 sections clickable, each shows the working control. Toggle Layout/Sort/Density values and verify the library responds identically to the old menu.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/library/toolbar/index.tsx
git commit -m "feat(view): mount preview View dropdown behind localStorage flag"
```

---

## 9. Phase C — Filter row editor

The new work. Build `Filter.{Root, Header, RowList, Row, Connector, FieldSelect, ComparatorSelect, ValueSelect, Delete, Reorder, Add, Empty}` inside `library/view-menu/filter/`.

### Task C1: Filter compound skeleton + Row layout (no popovers yet)

Static skeleton with the row chrome and stub triggers so the layout can be visually verified before the popovers land.

**Files:**
- Create: `library/view-menu/filter/index.tsx`
- Create: `library/view-menu/filter/styles.module.css`
- Modify: `library/view-menu/index.tsx` (wire `<Filter />` into `PanelBody`)

- [ ] **Step 1: Create `filter/index.tsx`**

```tsx
// apps/desktop/src/renderer/src/components/library/view-menu/filter/index.tsx
import type { Predicate } from "@pond/schema/filters/types";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { useView } from "../context";
import styles from "./styles.module.css";

function Root() {
  return (
    <div className={styles.root}>
      <Header />
      <RowList />
      <Add />
    </div>
  );
}

function Header() {
  const { state, actions } = useView();
  const count = state.query.clauses.length;
  return (
    <div className={styles.header}>
      <span className={styles.title}>Filter by</span>
      {count > 0 ? (
        <button
          type="button"
          className={styles["header-reset"]}
          onClick={() => actions.resetFilters()}
        >
          Reset
        </button>
      ) : null}
    </div>
  );
}

function RowList() {
  const { state } = useView();
  if (state.query.clauses.length === 0) {
    return <Empty />;
  }
  return (
    <div className={styles["row-list"]}>
      {state.query.clauses.map((predicate, idx) => (
        <Row key={idx} index={idx} predicate={predicate} />
      ))}
    </div>
  );
}

interface RowProps {
  index: number;
  predicate: Predicate;
}

function Row({ index, predicate }: RowProps) {
  return (
    <div className={styles.row}>
      <Connector index={index} />
      <FieldSelect index={index} predicate={predicate} />
      <ComparatorSelect index={index} predicate={predicate} />
      <ValueSelect index={index} predicate={predicate} />
      <Delete index={index} />
      <Reorder index={index} />
    </div>
  );
}

function Connector({ index }: { index: number }) {
  return (
    <span className={styles.connector} data-index={index}>
      {index === 0 ? "Where" : "And"}
    </span>
  );
}

// === Stubs for Tasks C2–C5; replaced by real popovers later. ===

function FieldSelect({ predicate }: { index: number; predicate: Predicate }) {
  return <button type="button" className={styles["select-trigger"]}>{predicate.field}</button>;
}

function ComparatorSelect({ predicate }: { index: number; predicate: Predicate }) {
  return <button type="button" className={styles["select-trigger"]}>{predicate.cmp}</button>;
}

function ValueSelect({ predicate }: { index: number; predicate: Predicate }) {
  return (
    <button type="button" className={styles["select-trigger"]}>
      {summariseValue(predicate)}
    </button>
  );
}

function Delete({ index }: { index: number }) {
  const { actions } = useView();
  return (
    <button
      type="button"
      className={styles["icon-btn"]}
      aria-label="Remove filter"
      onClick={() => actions.updatePredicate(index, null)}
    >
      <Trash2 width="14" height="14" />
    </button>
  );
}

function Reorder({ index }: { index: number }) {
  // Drag handle is visual-only in this phase; functional drag deferred to a follow-up.
  return (
    <button
      type="button"
      className={styles["icon-btn"]}
      aria-label="Reorder"
      title="Drag to reorder (coming soon)"
      data-index={index}
      disabled
    >
      <GripVertical width="14" height="14" />
    </button>
  );
}

function Add() {
  const { actions } = useView();
  return (
    <button
      type="button"
      className={styles.add}
      onClick={() => actions.addPredicate()}
    >
      <Plus width="14" height="14" />
      <span>Add a condition</span>
    </button>
  );
}

function Empty() {
  return (
    <div className={styles.empty}>
      No filters yet. Add a condition to start.
    </div>
  );
}

function summariseValue(p: Predicate): string {
  const v = p.value;
  if (p.cmp === "exists") return v === false ? "not set" : "set";
  if (Array.isArray(v)) {
    if (p.cmp === "between") {
      const [lo, hi] = v;
      return `${lo}–${hi}`;
    }
    if (v.length === 0) return "Select";
    if (v.length === 1) return String(v[0]);
    return `${v.length} values`;
  }
  if (typeof v === "string") return v || "Select";
  if (typeof v === "number") return String(v);
  return "Select";
}

export const Filter = {
  Root,
  Header,
  RowList,
  Row,
  Connector,
  FieldSelect,
  ComparatorSelect,
  ValueSelect,
  Delete,
  Reorder,
  Add,
  Empty,
};
```

- [ ] **Step 2: Create `filter/styles.module.css`**

```css
.root {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 480px;
  padding: 6px;
}

.header {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 4px 6px;
}

.title {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
  color: var(--ds-gray-12);
}

.header-reset {
  font-size: 11px;
  color: var(--ds-accent-11);
  cursor: pointer;
  background: transparent;
  border: 0;
}

.row-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.row {
  display: grid;
  grid-template-columns: 56px 1fr auto 1fr auto auto;
  gap: 4px;
  align-items: center;
  padding: 2px 4px;
}

.connector {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 450;
  color: var(--ds-gray-11);
  background: var(--ds-gray-a3);
  border-radius: 4px;
}

.select-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  min-width: 0;
  height: 28px;
  padding: 0 8px;
  overflow: hidden;
  font-size: 12px;
  color: var(--ds-gray-12);
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  background: var(--ds-gray-a3);
  border: 0;
  border-radius: 4px;
}

.select-trigger:hover {
  background: var(--ds-gray-a4);
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--ds-gray-11);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;
}

.icon-btn:hover:not(:disabled) {
  color: var(--ds-gray-12);
  background: var(--ds-gray-a3);
}

.icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.add {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  align-self: flex-start;
  padding: 6px 8px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--ds-gray-11);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;
}

.add:hover {
  color: var(--ds-gray-12);
  background: var(--ds-gray-a3);
}

.empty {
  padding: 16px 12px;
  font-size: 12px;
  color: var(--ds-gray-11);
  text-align: center;
}
```

- [ ] **Step 3: Wire `<Filter.Root />` into `PanelBody`** in `view-menu/index.tsx`:

```tsx
import { Filter } from "./filter";

function PanelBody({ id }: { id: SectionId }) {
  switch (id) {
    case "layout": return <Layout />;
    case "sort": return <Sort />;
    case "density": return <Density />;
    case "display": return <Display />;
    case "zoom": return <Zoom />;
    case "filter": return <Filter.Root />;
  }
}
```

Also widen the popup's max width in `styles.module.css` so the filter panel fits: change `max-width: 560px` to `max-width: 800px`.

- [ ] **Step 4: Smoke**

Open the preview View (test-tube icon, behind the localStorage flag). Click Filter by. Expected:
- "Filter by" panel opens with header + Empty state + Add row.
- Click "Add a condition" — a row appears with stub triggers (`tags`, `some`, `Select`) + trash + disabled drag handle.
- Click trash on the row — predicate removed, Empty state returns.

- [ ] **Step 5: Commit**

```bash
pnpm typecheck && pnpm lint:check
git add apps/desktop/src/renderer/src/components/library/view-menu
git commit -m "feat(filter): scaffold row-based predicate editor with stub selects"
```

### Task C2: Migrate filter helpers + `FieldSelect` popover

Move `score.ts`, `recents.ts`, `relative-time.ts`, `date-presets.ts`, `helpers.ts`, `search-index.ts` (plus the work the old `filter/index.tsx` did for these) into `view-menu/filter/`. Build the FieldSelect popover with a search box + field/value autocomplete (the same search behaviour the old AddFilterMenu had).

**Files:**
- Copy: `library/menus/filter/{score.ts,recents.ts,relative-time.ts,date-presets.ts,helpers.ts}` → `library/view-menu/filter/`
- Create: `library/view-menu/filter/search-index.ts` — extracted from old `library/menus/filter/index.tsx` lines 275–523, same as the Phase 1 plan's Task 2
- Create: `library/view-menu/filter/field-select.tsx`
- Create: `library/view-menu/filter/field-select.module.css`
- Modify: `library/view-menu/filter/index.tsx` (replace stub `FieldSelect`)

- [ ] **Step 1: Copy helpers**

```bash
cp apps/desktop/src/renderer/src/components/library/menus/filter/{score.ts,recents.ts,relative-time.ts,date-presets.ts,helpers.ts} \
   apps/desktop/src/renderer/src/components/library/view-menu/filter/
```

- [ ] **Step 2: Extract `search-index.ts`** — same code as the old Phase 1 plan's Task 2. Put it in `library/view-menu/filter/search-index.ts`. The file contains `FIELD_ICONS`, `FIELD_GROUPS`, `fieldsByGroup`, `COMPARATOR_LABELS`, `DATE_FIELDS`, `RESULT_CAP`, `SearchEntry`, `buildSearchIndex`, `appendTagEntries`, `appendCreatorEntries`, `appendHostEntries`, `parseHost`, `useEntryCounts`, `entryKey`, `formatCount`. Imports `predicateKey` from `./score`.

Refer to the old plan's Task 2 for the full code; do not duplicate it here. Verify byte-for-byte that the bodies of the moved functions match the originals.

- [ ] **Step 3: Build `field-select.tsx`**

```tsx
// apps/desktop/src/renderer/src/components/library/view-menu/filter/field-select.tsx
import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { Input, Menu, Popover } from "@pond/ui";
import { useMemo, useState } from "react";
import { useSaves } from "@/pool/hooks";
import { useView } from "../context";
import {
  FIELD_GROUPS,
  FIELD_ICONS,
  fieldsByGroup,
  buildSearchIndex,
  type SearchEntry,
} from "./search-index";
import { defaultPredicateFor } from "./helpers";
import { searchEntries } from "./score";
import styles from "./field-select.module.css";

interface FieldSelectProps {
  index: number;
  predicate: Predicate;
}

export function FieldSelect({ index, predicate }: FieldSelectProps) {
  const { actions } = useView();
  const meta = FIELD_META[predicate.field];
  const Icon = FIELD_ICONS[predicate.field];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const saves = useSaves();
  const groups = useMemo(() => fieldsByGroup(), []);
  const index2 = useMemo(() => buildSearchIndex(saves), [saves]);

  const results = useMemo<SearchEntry[]>(() => {
    if (!query.trim()) return [];
    return searchEntries(index2, query, new Map()).slice(0, 50);
  }, [query, index2]);

  function pick(field: FieldId) {
    const next = defaultPredicateFor(field);
    actions.updatePredicate(index, next);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        render={
          <button type="button" className={styles.trigger} aria-label={`Field: ${meta.label}`}>
            <span className={styles["trigger-icon"]} aria-hidden>
              <Icon width="1em" height="1em" />
            </span>
            <span className={styles["trigger-label"]}>{meta.label}</span>
          </button>
        }
      />
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={4}>
          <Popover.Popup className={styles.popup}>
            <div className={styles.search}>
              <Input.Field
                type="search"
                value={query}
                placeholder="Find a field…"
                autoFocus
                spellCheck={false}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {query.trim() && results.length > 0 ? (
              results.map((entry, i) => (
                <ResultItem key={i} entry={entry} onPick={pick} />
              ))
            ) : query.trim() ? (
              <div className={styles.empty}>No matches.</div>
            ) : (
              FIELD_GROUPS.map((group) => (
                <div key={group.id} className={styles.group}>
                  <div className={styles["group-label"]}>{group.label}</div>
                  {groups[group.id].map((field) => (
                    <FieldItem key={field} field={field} onPick={pick} />
                  ))}
                </div>
              ))
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function FieldItem({ field, onPick }: { field: FieldId; onPick: (f: FieldId) => void }) {
  const meta = FIELD_META[field];
  const Icon = FIELD_ICONS[field];
  return (
    <button
      type="button"
      className={styles.item}
      onClick={() => onPick(field)}
    >
      <span className={styles["item-icon"]} aria-hidden>
        <Icon width="1em" height="1em" />
      </span>
      <span className={styles["item-label"]}>{meta.label}</span>
    </button>
  );
}

function ResultItem({ entry, onPick }: { entry: SearchEntry; onPick: (f: FieldId) => void }) {
  if (entry.kind === "field" || entry.kind === "field-in-group") {
    return <FieldItem field={entry.field} onPick={onPick} />;
  }
  if (entry.kind === "group") {
    return (
      <div className={styles.group}>
        <div className={styles["group-label"]}>{entry.group.label}</div>
      </div>
    );
  }
  return null; // value rows: not selectable from FieldSelect; values come via ValueSelect
}
```

- [ ] **Step 4: Create `field-select.module.css`**

```css
.trigger {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  color: var(--ds-gray-12);
  cursor: pointer;
  background: var(--ds-gray-a3);
  border: 0;
  border-radius: 4px;
}

.trigger:hover {
  background: var(--ds-gray-a4);
}

.trigger-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  color: var(--ds-gray-11);
}

.trigger-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.popup {
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 240px;
  max-height: 360px;
  padding: 6px;
  overflow-y: auto;
}

.search {
  padding-block-end: 6px;
  margin-block-end: 4px;
  border-bottom: 1px solid var(--ds-gray-a3);
}

.group {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-bottom: 4px;
}

.group-label {
  padding: 4px 8px 2px;
  font-size: 10px;
  font-weight: 500;
  color: var(--ds-gray-11);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.item {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
  font-size: 12px;
  color: var(--ds-gray-12);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;
}

.item:hover {
  background: var(--ds-gray-a3);
}

.item-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  color: var(--ds-gray-11);
}

.item-label {
  flex: 1;
}

.empty {
  padding: 16px 12px;
  font-size: 12px;
  color: var(--ds-gray-11);
  text-align: center;
}
```

- [ ] **Step 5: Replace stub in `filter/index.tsx`**

In `view-menu/filter/index.tsx`, replace the stub `FieldSelect` with an import:

```tsx
import { FieldSelect } from "./field-select";
```

And in the compound export, point to the imported component.

- [ ] **Step 6: Smoke**

Open preview View, navigate to Filter by, add a row. Click the field trigger ("tags"). Expected: popover opens with grouped field list + search input. Pick "Type" — predicate updates, trigger now shows "Type". Verify search: type "saved" — list narrows to "Saved at".

- [ ] **Step 7: Commit**

```bash
pnpm typecheck && pnpm lint:check
git add apps/desktop/src/renderer/src/components/library/view-menu/filter
git commit -m "feat(filter): wire FieldSelect popover with searchable field list"
```

### Task C3: `ComparatorSelect` dropdown

- [ ] **Step 1: Create `comparator-select.tsx`**

```tsx
// apps/desktop/src/renderer/src/components/library/view-menu/filter/comparator-select.tsx
import { FIELD_META } from "@pond/schema/filters/meta";
import { COMPARATORS_BY_TYPE, type ComparatorId, type Predicate } from "@pond/schema/filters/types";
import { Menu } from "@pond/ui";
import { ChevronsUpDown } from "lucide-react";
import { useView } from "../context";
import { COMPARATOR_LABELS } from "./search-index";
import styles from "./comparator-select.module.css";

interface ComparatorSelectProps {
  index: number;
  predicate: Predicate;
}

export function ComparatorSelect({ index, predicate }: ComparatorSelectProps) {
  const { actions } = useView();
  const meta = FIELD_META[predicate.field];
  const allowed = COMPARATORS_BY_TYPE[meta.type];

  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <button type="button" className={styles.trigger} aria-label="Comparator">
            <span className={styles.label}>{COMPARATOR_LABELS[predicate.cmp]}</span>
            <ChevronsUpDown width="12" height="12" />
          </button>
        }
      />
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={4}>
          <Menu.Popup className={styles.popup}>
            <Menu.RadioGroup
              value={predicate.cmp}
              onValueChange={(next) => {
                actions.updatePredicate(index, { ...predicate, cmp: next as ComparatorId });
              }}
            >
              {allowed.map((id) => (
                <Menu.RadioItem key={id} value={id}>
                  <Menu.ItemLabel>{COMPARATOR_LABELS[id]}</Menu.ItemLabel>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
```

- [ ] **Step 2: Create `comparator-select.module.css`**

```css
.trigger {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  justify-content: space-between;
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  color: var(--ds-gray-12);
  cursor: pointer;
  background: var(--ds-gray-a3);
  border: 0;
  border-radius: 4px;
}

.trigger:hover {
  background: var(--ds-gray-a4);
}

.label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.popup {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 180px;
  padding: 6px;
}
```

- [ ] **Step 3: Wire into `filter/index.tsx`** — import and replace the stub.

- [ ] **Step 4: Smoke + commit**

Open the comparator trigger on an active row. Verify: dropdown shows valid comparators per field type (e.g. for `tags` you see "include any / include all / exclude all"; for `savedAt` you see "is at least / is at most / is between / is set").

```bash
pnpm typecheck && pnpm lint:check
git add apps/desktop/src/renderer/src/components/library/view-menu/filter
git commit -m "feat(filter): wire ComparatorSelect dropdown"
```

### Task C4: `ValueSelect` popover with 6 discriminated bodies

The big merge: collapse the six `library/menus/filter/dropdowns/*` variants into one file with six named bodies, then mount inside a Popover triggered from the row.

**Files:**
- Create: `library/view-menu/filter/value-select.tsx`
- Create: `library/view-menu/filter/value-select.module.css`

- [ ] **Step 1: Create `value-select.module.css`** — same merged CSS from the prior filter-menu compound plan's Task 4 Step 1. Single file containing `.body` (with `data-variant="scroll"` and `data-variant="narrow"` modifiers), `.search`, `.empty`, `.range`, `.dash`, `.check`, `.section-header`, `.star-flag`, `.count`. Copy verbatim from the prior plan if needed.

- [ ] **Step 2: Create `value-select.tsx`**

```tsx
// apps/desktop/src/renderer/src/components/library/view-menu/filter/value-select.tsx
import { FIELD_META } from "@pond/schema/filters/meta";
import type { Predicate } from "@pond/schema/filters/types";
import { Input, Menu, Popover } from "@pond/ui";
import { Check, Star } from "lucide-react";
import { Fragment, useCallback, useMemo, useState } from "react";
import { useSaves } from "@/pool/hooks";
import { useTagGroups } from "@/pool/tag-groups";
import { useTags } from "@/pool/tags";
import { useView } from "../context";
import { DATE_PRESETS } from "./date-presets";
import styles from "./value-select.module.css";

interface ValueSelectProps {
  index: number;
  predicate: Predicate;
}

export function ValueSelect({ index, predicate }: ValueSelectProps) {
  const { actions } = useView();
  const meta = FIELD_META[predicate.field];

  const onChange = useCallback(
    (next: Predicate) => actions.updatePredicate(index, next),
    [actions, index],
  );

  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <button type="button" className={styles["popover-trigger"]} aria-label={`${meta.label} value`}>
            {summariseValue(predicate)}
          </button>
        }
      />
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={4}>
          <Popover.Popup>
            <Body predicate={predicate} onChange={onChange} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

interface BodyProps {
  predicate: Predicate;
  onChange: (next: Predicate) => void;
}

function Body({ predicate, onChange }: BodyProps) {
  const meta = FIELD_META[predicate.field];
  switch (meta.type) {
    case "stringArray": return <TagsBody predicate={predicate} onChange={onChange} />;
    case "enum": return <EnumBody predicate={predicate} onChange={onChange} />;
    case "number": return <NumberBody predicate={predicate} onChange={onChange} />;
    case "date": return <DateBody predicate={predicate} onChange={onChange} />;
    case "optional": return <OptionalBody predicate={predicate} onChange={onChange} />;
    default: return <StringBody predicate={predicate} onChange={onChange} />;
  }
}

// === Six bodies, named pieces in one file. Copy the JSX bodies byte-for-byte
//     from the six existing dropdowns/{string,optional,enum,number,date,tags}/index.tsx
//     files. The only diffs are:
//       1. drop `import type { DropdownProps } from "../types"` → use BodyProps above
//       2. drop `import styles from "./styles.module.css"` → use the shared
//          value-select.module.css already imported at the top
//       3. add data-variant attributes:
//            OptionalBody root: <div className={styles.body} data-variant="narrow">
//            EnumBody root:     <div className={styles.body} data-variant="scroll">
//            TagsBody root:     <div className={styles.body} data-variant="scroll">

function StringBody(_: BodyProps) { /* copy from dropdowns/string/index.tsx lines 6–22 */ return null; }
function OptionalBody(_: BodyProps) { /* copy from dropdowns/optional/index.tsx lines 17–55 */ return null; }
function EnumBody(_: BodyProps) { /* copy from dropdowns/enum/index.tsx lines 8–86 */ return null; }
function NumberBody(_: BodyProps) { /* copy from dropdowns/number/index.tsx lines 7–92 */ return null; }
function DateBody(_: BodyProps) { /* copy from dropdowns/date/index.tsx lines 7–106 */ return null; }
function TagsBody(_: BodyProps) { /* copy from dropdowns/tags/index.tsx lines 24–194 */ return null; }

function summariseValue(p: Predicate): string {
  const v = p.value;
  if (p.cmp === "exists") return v === false ? "Without" : "With";
  if (Array.isArray(v)) {
    if (p.cmp === "between") {
      const [lo, hi] = v;
      return `${lo}–${hi}`;
    }
    if (v.length === 0) return "Select";
    if (v.length === 1) return String(v[0]);
    return `${v.length} values`;
  }
  if (typeof v === "string") return v || "Select";
  if (typeof v === "number") return String(v);
  return "Select";
}
```

Copy each `*Body` function body byte-for-byte from its original location. Verify each by diffing visually after the copy. The `Body` dispatcher is the only new logic; everything else is straight migration.

- [ ] **Step 3: Wire into `filter/index.tsx`**

```tsx
import { ValueSelect } from "./value-select";
```

Replace the stub `ValueSelect`.

- [ ] **Step 4: Smoke**

For each filter type, add a row of that type, click the value trigger, and verify the popover renders the right body:
- `tags` → multi-select with sections (Starred, by group, Uncategorised)
- `type` (enum) → multi-select checkboxes
- `size` (number) → presets + min/max range
- `savedAt` (date) → presets + custom range
- `note` (optional) → "With note" / "Without note"
- `url` (string) → text input

- [ ] **Step 5: Commit**

```bash
pnpm typecheck && pnpm lint:check
git add apps/desktop/src/renderer/src/components/library/view-menu/filter
git commit -m "feat(filter): collapse 6 dropdown variants into ValueSelect popover bodies"
```

### Task C5: `Filter.Add` / `Delete` / `Reorder` polish

- [ ] **Step 1: Improve `addPredicate()` to immediately open the new row's `FieldSelect`**

This requires lifting the `FieldSelect`'s `open` state into the row, controlled by a `justAddedIndex` ref in `FilterProvider` (or simpler: add a `pendingOpenIndex` to `ViewNav` that `FieldSelect` reads and clears on mount).

For simplicity, defer this to a follow-up. Document the limitation in the row's `aria-label` ("Add a condition, then pick a field") and leave `addPredicate()` as-is.

- [ ] **Step 2: Reorder handle visual polish**

The reorder button is disabled and shows a tooltip "Drag to reorder (coming soon)". Add the tooltip via `@pond/ui` `<Tooltip>`:

```tsx
import { Tooltip } from "@pond/ui";

function Reorder({ index }: { index: number }) {
  return (
    <Tooltip label="Drag to reorder (coming soon)" side="bottom">
      <button type="button" className={styles["icon-btn"]} aria-label="Reorder" disabled data-index={index}>
        <GripVertical width="14" height="14" />
      </button>
    </Tooltip>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/library/view-menu/filter
git commit -m "feat(filter): polish Reorder tooltip; mark drag follow-up"
```

---

## 10. Phase D — Cutover

Wire the new `View` into the toolbar as the only entry point. Delete the chip bar, the old filter menu, the old view menu, and the preview-flag mount.

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/library/toolbar/index.tsx`
- Delete: `library/menus/filter/` (entire subtree)
- Delete: `library/menus/view/` (entire subtree)
- Delete: `library/filter-bar/` (entire subtree)
- Modify: `apps/desktop/src/renderer/src/routes/_library.tsx` and any sub-routes mounting `<FilterBar.*>`

### Task D1: Replace toolbar's `ViewOptions` and `Filter` with single `View.Root`

- [ ] **Step 1: Rewrite `library/toolbar/index.tsx`**

```tsx
import { Button, Input, Toolbar as PondToolbar, Tooltip } from "@pond/ui";
import { Eye, Search as SearchIcon } from "lucide-react";
import { useRef } from "react";
import { View } from "@/components/library/view-menu";
import { usePlatform } from "@/lib/platform";
import { useDebouncedSearch } from "@/lib/use-debounced-search";
import { useSearchHotkey } from "@/lib/use-hotkeys";
import { useSidebar } from "@/lib/shell-state";
import styles from "./styles.module.css";

export function HeaderToolbar() {
  const { open: sidebarOpen } = useSidebar();
  const platform = usePlatform();
  const trafficLightInset = platform === "mac" && !sidebarOpen ? 72 : 0;

  return (
    <PondToolbar.Root
      aria-label="Library toolbar"
      className={styles.toolbar}
      style={{ paddingInlineStart: trafficLightInset }}
    >
      <Search />
      <ViewTrigger />
    </PondToolbar.Root>
  );
}

const SEARCH_DEBOUNCE_MS = 150;

function Search() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useDebouncedSearch("q", SEARCH_DEBOUNCE_MS);

  useSearchHotkey(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  });

  return (
    <Input.Root className={styles.search}>
      <Input.Icon>
        <SearchIcon />
      </Input.Icon>
      <Input.Field
        className={styles.field}
        ref={inputRef}
        type="search"
        placeholder="Search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search saves"
      />
    </Input.Root>
  );
}

function ViewTrigger() {
  return (
    <Tooltip label="View options" side="bottom">
      <View.Root
        trigger={
          <Button icon aria-label="View options">
            <Eye style={{ width: "100%", height: "100%" }} />
          </Button>
        }
      />
    </Tooltip>
  );
}
```

The `useFilterHotkey` import is removed because the dedicated filter trigger is gone. The hotkey behaviour is preserved by adding a `useFilterHotkey` listener inside `View.Root` (or its trigger) that opens the popover and navigates to the Filter section.

- [ ] **Step 2: Add filter hotkey to View**

In `view-menu/index.tsx`, inside `Root`, add a small effect that listens for the filter hotkey and forces nav to the filter section. Since `useFilterHotkey` currently expects a callback that opens a menu via local state, and the new shape uses Popover.Root's controlled open + ViewNav, route the hotkey through ViewNav:

```tsx
import { useFilterHotkey } from "@/lib/use-hotkeys";

function Root({ trigger, children }: RootProps) {
  // ...
  return (
    <Provider>
      <FilterHotkeyBridge />
      <Popover.Root>
        {/* ... */}
      </Popover.Root>
    </Provider>
  );
}

function FilterHotkeyBridge() {
  const { nav } = useView();
  useFilterHotkey(() => {
    nav.setActiveSection("filter");
    // also open the popover - this requires controlled open; see step 3
  });
  return null;
}
```

If `Popover.Root` is uncontrolled, switch it to controlled via a top-level `useState`. Move the open/setOpen into `ViewProvider` or a local state in `Root`.

- [ ] **Step 3: Make the Popover controlled to support hotkey-open**

In `view-menu/index.tsx`:

```tsx
function Root({ trigger, children }: RootProps) {
  const [open, setOpen] = useState(false);
  // ... pass open/setOpen into Popover.Root
}
```

Combine with the hotkey effect from step 2.

- [ ] **Step 4: Typecheck + lint + smoke**

Open Pond, press the filter hotkey (`Cmd-Shift-F` or whatever it's bound to). Expected: View popover opens directly on the Filter section.

- [ ] **Step 5: Commit**

```bash
pnpm typecheck && pnpm lint:check
git add apps/desktop/src/renderer/src/components/library
git commit -m "feat(view): make View the sole toolbar entry; reroute filter hotkey"
```

### Task D2: Remove the preview flag and the old `ViewPicker` mount

- [ ] **Step 1: Verify the old `ViewPicker` is no longer imported** (toolbar already removed in D1).

- [ ] **Step 2: Grep for leftover references**

```bash
rg "ViewPicker|AddFilterMenu|FilterBar" apps/desktop/src
```

Expected: no matches outside the to-be-deleted folders.

- [ ] **Step 3: Commit (only if grep showed cleanup needed)**

### Task D3: Delete `library/filter-bar/`

- [ ] **Step 1: Find and remove route mounts**

Grep first:

```bash
rg "FilterBar" apps/desktop/src/renderer/src/routes
```

For each match, remove the `<FilterBar.*>` JSX block from the route.

- [ ] **Step 2: Delete the folder**

```bash
rm -r apps/desktop/src/renderer/src/components/library/filter-bar
```

- [ ] **Step 3: Typecheck + smoke**

```bash
pnpm typecheck && pnpm lint:check
```

Smoke: navigate to /, /tags, /trash, /recents, /untagged, /random and the source detail routes. Expected: no chip bar visible anywhere, no console errors. The only filter-status surface is the View trigger badge.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(view): remove filter-bar chip surface; View badge is the only filter status outside the menu"
```

### Task D4: Delete `library/menus/filter/` and `library/menus/view/`

- [ ] **Step 1: Verify nothing imports them**

```bash
rg "library/menus/filter|library/menus/view" apps/desktop/src
```

Expected: matches only inside the folders themselves.

- [ ] **Step 2: Delete**

```bash
rm -r apps/desktop/src/renderer/src/components/library/menus/filter
rm -r apps/desktop/src/renderer/src/components/library/menus/view
```

- [ ] **Step 3: Typecheck + lint + smoke**

```bash
pnpm typecheck && pnpm lint:check
```

Smoke: full library functionality. Verify filter add/edit/delete, layout switch, sort change, density change, display toggles, zoom slider — all via the new View menu.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(view): delete legacy filter and view menu folders"
```

### Task D5: Final smoke + cleanup

- [ ] **Step 1: Full app smoke**

Walk through:

1. Toolbar: only `View` button present (eye icon, badge when filters active).
2. Library shows under default view (waterfall, savedAt desc, comfortable).
3. Open View → Filter by → Add a condition → pick "Type" → pick "Image" → close popover. Library narrows to images.
4. Open View → Layout → switch to "Grid". Library re-layouts.
5. Open View → Sort by → pick "Title" + "asc". Library re-sorts.
6. Open View → Density → "Compact". Cards tighten.
7. Open View → Display → toggle "Show name" off. Card titles disappear.
8. Open View → Zoom → drag slider. Cards resize.
9. Open View → Restore defaults. All controls reset, query clears, layout back to waterfall, etc.
10. Cmd-Shift-F (or whichever filter hotkey is bound) opens View directly on Filter section.
11. Multi-row filter: add 3 conditions, navigate routes, verify URL persists and chips don't reappear anywhere.
12. Navigate to /tags. The tags route's Display menu (different from this work) still functions.
13. Command palette (Cmd-K) unaffected.
14. Inspector + sidebar toggles, previously inside the old view menu, are now in the Display section. Verify both still work.

- [ ] **Step 2: Final commit if any cleanup remains**

```bash
git status
# if anything appears, fix and:
git add -A
git commit -m "chore(view): post-cutover cleanup"
```

---

## 11. Phase E — Other oversized components

After cutover, work through the remaining 7 oversized files. Each gets its own per-component plan (`docs/plans/2026-MM-DD-<feature>-compound.md`) written when started; this plan tracks the queue.

| Order | File | Lines | Why this order |
|---|---|---|---|
| E1 | `save/preview/tag-picker/index.tsx` | 744 | Same domain as the filter work just shipped (tags); patterns are fresh |
| E2 | `save/context-menu/index.tsx` | 555 | Small standalone Menu; clean compound carve-out |
| E3 | `settings/sections/developer/index.tsx` | 544 | Small standalone settings section |
| E4 | `settings/sections/integrations/index.tsx` | 832 | Medium settings section, same Settings.* compound parent |
| E5 | `settings/sections/library/index.tsx` | 1284 | Biggest settings section, pattern well-established by E3/E4 |
| E6 | `capture/processing-dialog/index.tsx` | 1061 | UX-critical surface; do once pattern is muscle memory |
| E7 | `command-palette/cmdk/index.tsx` | 1000 | Central infra; touched by every entry point, do last |

Each component plan follows the structure of `docs/plans/2026-05-27-filter-menu-compound.md`: audit findings, target compound shape with `{state, actions, meta}` context, file structure before/after, bite-sized task decomposition with full code, smoke + commit per task. Each plan should be 500–1500 lines.

Exit criteria for Phase E:
- Every file listed above is under 400 lines.
- Each refactored feature exports a compound (`{ Root, ... }`).
- `pnpm typecheck && pnpm lint:check` clean.
- Smoke pass for the touched surface.

---

## 12. Phase F — `@pond/ui` extraction

Move app-local primitives to the workspace package per the components/AGENTS.md "Promote to `@pond/ui` if a second consumer appears" rule.

**Candidates and target locations:**

- `_primitives/card-thumb/*` → `packages/ui/src/card-thumb/` (6 pieces in one folder; preserve the compound shape)
- `_primitives/source-badge/` → `packages/ui/src/source-badge/`
- `_primitives/number-field-stepper/` → `packages/ui/src/number-field-stepper/`
- `_primitives/suggestion-toast/` → `packages/ui/src/suggestion-toast/`

**Per-primitive task shape:**

1. Copy file(s) to `packages/ui/src/<name>/`.
2. Update `packages/ui/src/index.ts` to re-export.
3. Update all imports in the renderer from `@/components/_primitives/<name>` to `@pond/ui`.
4. Verify HMR works (the AGENTS.md Vite-alias note already covers the dep-graph wiring).
5. Delete the file(s) from `apps/desktop/src/renderer/src/components/_primitives/<name>/`.
6. Typecheck + smoke + commit.

After all four primitives are moved, the `_primitives/` folder is empty and gets removed. Phase G's `_primitives/` → `ui/` rename becomes a no-op.

---

## 13. Phase G — Folder reorg

Cap depth at `components/<domain>/<component>/`. The previous master plan listed these moves; with Phases A–D having already collapsed `library/menus/{view,filter,display}/`, the remaining work is smaller.

**Moves:**

- `library/menus/display/` → `library/tags-display-menu/` (`menus/` parent is then empty and removed)
- `settings/sections/*/` → `settings/section-*/` (each renamed in one batch)
- `save/preview/{pane,media-viewer,tag-picker}/` → `save/{preview-pane,preview-media-viewer,preview-tag-picker}/` (the `preview/` parent kept some sibling helpers — `helpers.ts`, `rows.tsx` — which move to `save/` directly)
- `media/video-player/scrub-preview/` → `media/video-player-scrub-preview/`
- `_primitives/` → already empty after Phase F; remove the folder

**Per-move task shape:**

1. `git mv old new`
2. Run a codemod (or a `sed` over `rg` output) updating all import paths from `@/components/old/x` to `@/components/new/x`. Biome's `pnpm lint --write` should fix any auto-fixable formatting after.
3. Typecheck + smoke + commit.

After Phase G, every component in `apps/desktop/src/renderer/src/components/` is at depth ≤ 2 from `components/`. The components/AGENTS.md "Where things live" table needs updating to reflect the new layout — fold that update into the final commit.

---

## 14. Decisions

- **Chip bar removed entirely.** Only the View trigger badge tells you filters are active outside the menu.
- **AND-only queries.** The existing `Query = { kind: "and", clauses: Predicate[] }` shape is preserved. OR / mixed-boolean queries deferred to a follow-up (see §15).
- **Drag-to-reorder visual-only.** `@dnd-kit` is not in this repo. The grip handle is rendered disabled with a tooltip noting "coming soon"; full drag implementation is a follow-up.
- **Restore defaults snaps to app-shipped defaults**, not a user-saved view (Pond has no saved-view concept yet).
- **The filter hotkey opens View directly on the Filter section**, replacing the previous "open AddFilterMenu" behaviour.
- **No new ADRs.** All domain language is reused from `@pond/schema/filters/*`. The new `ViewConfig` / `SectionId` / `ViewDefaults` terms are feature-local and live in this plan's glossary, not in `CONTEXT.md`.
- **Preview-flag mount during Phase B/C.** The new View dropdown is mounted behind a localStorage flag (`pond.view.preview = 1`) so the team can verify it without breaking users. Removed in Phase D.

---

## 15. Open questions / follow-ups

- **OR / mixed-boolean queries.** Next logical step once the row builder is in. Requires:
  - Schema update: `Query` becomes `{ kind: "and" | "or"; clauses: (Predicate | Query)[] }` or similar.
  - URL serialization update.
  - `Connector` becomes editable: `Where / And / Or` dropdown on each row (except the first).
  - Possibly a grouping affordance ("add group" for nesting).
- **Drag to reorder.** Add `@dnd-kit/core` + `@dnd-kit/sortable` to the desktop renderer deps. Wire the `Reorder` handle to a `useSortable` keyed by predicate index. Update `actions.reorderPredicate` to be the drop handler.
- **Add-condition auto-opens FieldSelect.** Stash a `pendingOpenIndex` in `ViewNav` after `addPredicate()`; have `FieldSelect` consume it via `useEffect` to call `setOpen(true)`, clear `pendingOpenIndex`.
- **Saved views.** Future feature. Would add `View.SavedList` and a `useSavedViews()` hook. Out of scope.
- **Search input inside FieldSelect: should it surface value rows too?** The old AddFilterMenu surfaced both fields and values from the search index. The new FieldSelect only surfaces fields. If users miss the "type a value, get a row" behaviour, port that back as a quick-action section above the field tree.
- **Sort multi-key.** Currently one sort key + dir. Linear-style sort lets you stack sorts. Out of scope.

---

## 16. Supersession

This plan supersedes two earlier plans:

- [docs/plans/2026-05-27-filter-menu-compound.md](./2026-05-27-filter-menu-compound.md): the compound shape it designed (`FilterMenu.{Root, SearchInput, FieldPicker, Field, Group, ValueEditor, PredicateList, Empty}`) is no longer the target. The 6-dropdown merge into a single discriminated component survives but lands inside `Filter.ValueSelect` here.
- [docs/plans/2026-05-27-components-refactor-master.md](./2026-05-27-components-refactor-master.md): the master plan that originally sequenced the four refactor workstreams. The component-refactor phases survive as Phases E (other oversized components), F (`@pond/ui` extraction), G (folder reorg) of this plan. The master plan retains value as the consolidated audit (its §2) and as the per-file Phase 2 carve-out target shapes (its §3B), which this plan's Phase E references rather than duplicates.

Both prior plans have supersede banners added at their top pointing here.

---

## 17. Self-review

### Spec coverage

| Requirement from the brief | Covered by |
|---|---|
| Row-based filter UX matching the screenshot | §3 (Filter compound), §4 (UX details), §9 (Phase C tasks) |
| Merge view + filter into one View dropdown | §3 (View compound), §7–8 (Phases A–B), §10 (Phase D cutover) |
| Chip bar removed entirely | §1 (scope), §10 (Phase D3) |
| Preserve the underlying query model | §1 (preserved files), §5 (domain language) |
| Subsume the other refactor workstreams | §11 (Phase E), §12 (Phase F), §13 (Phase G) |
| Supersede the two prior plans | §16 + the banner tasks |
| Use compound + context patterns | Provider in §7, ViewContext in §3, FilterProvider in §6 |
| Use writing-plans format | Header, bite-sized tasks with code, commits per task, self-review |

### Placeholder scan

- "Copy each `*Body` function body byte-for-byte from its original location" (§9 Task C4) and "Copy CSS for each section from the old `library/menus/view/styles.module.css`" (§8 Task B3) are exact-source pointers, not vague placeholders. Each instance specifies the source file and the verification step.
- "Refer to the old plan's Task 2 for the full code; do not duplicate it here" (§9 Task C2) — this avoids ~250 lines of duplication. The old plan still exists with the full code; the supersede banner notes that this section's implementation is the canonical destination.
- No "TBD", "implement later", "appropriate error handling", "fill in details" markers found.

### Type consistency

Names used across phases:

- `ViewContextValue, ViewState, ViewActions, ViewNav, ViewMeta` — defined in §3 / Task A1, consumed in all subsequent tasks.
- `SectionId` — defined in Task A1, consumed in §7 / §8 / §9.
- `SortKey, SortDir` — defined in Task A1, consumed in §8 (Sort panel).
- `Predicate, Query` — from `@pond/schema/filters/types`, unchanged.
- `Filter.{Root, Header, RowList, Row, Connector, FieldSelect, ComparatorSelect, ValueSelect, Delete, Reorder, Add, Empty}` — defined in §3, exported in §9 Task C1.
- `actions.{setQuery, addPredicate, updatePredicate, reorderPredicate, resetFilters, setLayout, setSort, setDensity, setDisplayPref, setZoom, restoreDefaults}` — declared in §3 Task A1 and Task A2; consumed identically in every panel.

No drift detected.

### Risk notes

1. **`Popover.Root` controlled vs uncontrolled.** Task D1 needs the popover controlled to support hotkey-open. If the `@pond/ui` Popover doesn't expose `open`/`onOpenChange`, an adapter is needed. Verify when the task starts.
2. **`@pond/schema/filters/types` `Predicate` type might have a `kind: "p"` discriminator the provider's `addPredicate` needs to set.** Verified: yes, the type includes `kind: "p"`. The provider's seed predicate includes it (`{ kind: "p", field: "tags", cmp: "some", value: [] }`).
3. **`useFilterHotkey` signature.** May currently expect a callback that itself opens a Menu. The reroute in Task D1 needs to verify the callback type and adapt.
4. **`useTags` / `useSaves` / `useTagGroups` import paths.** Verified during planning: `@/pool/{hooks,tags,tag-groups}`.
5. **CSS merge for `value-select.module.css`.** Six source files. Apply the same `data-variant` collapsing strategy from the prior filter-menu plan, verified there.
6. **Filter section's panel width (480px).** Wider than the other sections. The popup's `max-width: 800px` accommodates it; verify visually no overflow on narrower windows.

### Out-of-scope reminders

- Feature-Sliced Design reorg is **not** in this plan. If pursued later, it sits on top of completed Phases A–G.
- Sibling-file convention (drop `index.tsx` folders for short components) is **not** in this plan; would require an AGENTS.md change first.
- CSS-in-TS migration is out of scope.
- Test infrastructure is out of scope; verification is typecheck + lint + manual smoke.

---

## Execution Handoff

**Plan complete. Two execution options:**

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks. Phases A–D have ~22 tasks; E/F/G are tracked at phase level and each gets its own per-feature plan when started.

**2. Inline Execution** — execute tasks in this session using `executing-plans`, batch with checkpoints between phases.

**Which approach?**
