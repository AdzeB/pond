# Filter Menu Compound Refactor Implementation Plan

> **SUPERSEDED by [2026-05-27-library-view-shell.md](./2026-05-27-library-view-shell.md).** The compound shape this plan designed (`FilterMenu.{Root, SearchInput, FieldPicker, Field, Group, Results, ValueEditor, Empty}`) is **no longer the target**. The product moved to a unified `View` dropdown containing a row-based filter editor (Linear/Notion/Airtable pattern), and the standalone Add-Filter menu is removed entirely. What survives from this plan: the merge of the six `dropdowns/{string,optional,enum,number,date,tags}/index.tsx` variants into a single discriminated component with named bodies. That merge lands inside `Filter.ValueSelect` in the new plan (Phase C4), not inside `FilterMenu.ValueEditor`. The helpers migration (`score.ts`, `recents.ts`, `relative-time.ts`, `date-presets.ts`, `helpers.ts`, the search-index extraction) also survives, relocated to `library/view-menu/filter/`. Everything else here, including the `FilterMenuContext` shape, the `<AddFilterMenu>` parent, the chip-bar adapter, is obsolete. Read this file only if you need the implementation details of the surviving sub-tasks; treat all other sections as historical context.

> **Parent plan:** [2026-05-27-components-refactor-master.md](./2026-05-27-components-refactor-master.md). This filter-menu plan is Phase 1 of that master, which sequences four workstreams (Phase 1: filter-menu; Phase 2: seven other oversized components; Phase 3: folder reorg; Phase 4: `@pond/ui` extraction). The master records the audit findings, the per-file target shapes for Phase 2, the recommended ordering with rationale, and the cross-cutting exit criteria that apply to this plan and all later phases. Both this plan and the master are now superseded by the library-view-shell plan (linked above); the lineage is preserved here for historical context.

> **For agentic workers:** Use the `executing-plans` skill to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the 763-line monolithic `AddFilterMenu` into a context-driven compound (`FilterMenu.{Root,SearchInput,FieldPicker,Field,Group,Results,ValueEditor,Empty}`), and inline the six over-split dropdown variants as named pieces inside `FilterMenu.ValueEditor`.

**Architecture:** Lift filter-menu state into a `FilterMenuContext` exposing `{ state, actions, meta }` per the `vercel-composition-patterns` `state-context-interface` rule. The Provider takes the existing `AddCommitApi` (from `useAddCommitApi`) as the implementation seam; UI sub-components consume the context interface, not the implementation. Six dropdown variants collapse from `dropdowns/{string,optional,enum,number,date,tags}/index.tsx` into named pieces inside one `value-editor.tsx` because they share the same `{ predicate, onChange }` contract and the same `.body / .search / .empty` CSS shape (per the workspace `AGENTS.md` "Unify" rule).

**Tech Stack:** React 19 (uses `use()` not `useContext`, ref-as-prop), TypeScript, `@pond/ui` (Menu, Input), `@pond/schema/filters/*`, CSS Modules with kebab-case classes, Biome for lint, Turbo for typecheck. No test framework: verification is `pnpm typecheck` + `pnpm lint:check` + manual smoke in the dev server.

---

## Architecture Audit Summary

Before the implementation steps, the audit results that justify this work. Vocabulary follows `.agents/skills/improve-codebase-architecture/LANGUAGE.md`.

### Shallow modules (deletion test concentrates complexity)

The six dropdown folders under `library/menus/filter/dropdowns/` each have an interface roughly as wide as their implementation. Imagined deletion concentrates complexity into one `ValueEditor` switch, not many call sites:

| Module | Lines | Diagnosis |
|---|---|---|
| `dropdowns/string/index.tsx` | 22 | Wraps `<Input.Field>` with one `onChange`. Interface ≈ implementation. |
| `dropdowns/optional/index.tsx` | 55 | Wraps two `<Menu.Item>`s with a search box. |
| `dropdowns/enum/index.tsx` | 86 | Toggle + multi-select on a presets array. |
| `dropdowns/number/index.tsx` | 92 | Presets + min/max range pair. |
| `dropdowns/date/index.tsx` | 106 | Presets + custom range; relative-date parsing already extracted to `relative-time.ts`. |
| `dropdowns/tags/index.tsx` | 194 | Borderline. Has substantive grouping logic but uses the same `DropdownProps` contract. |

All six share:
- Identical `DropdownProps = { predicate, onChange }`
- Same container class `.body` and (where applicable) `.search` and `.empty` CSS shape
- Single consumer: `dropdownFor()` in `filter/index.tsx`
- No external imports of any individual dropdown outside the filter feature

This is the workspace `AGENTS.md` "Unify" pattern explicitly: same visual contract, different inputs. Collapse via a discriminated `ValueEditor` with named bodies inside one file.

### Deep modules with no seam (under-split)

`filter/index.tsx` at 763 lines fuses seven internal modules with no shared interface:

1. Field taxonomy (`FIELD_GROUPS`, `FIELD_ICONS`, `fieldsByGroup()`, `COMPARATOR_LABELS`)
2. `FilterSubmenu` (per-field builder with `liveAdd` / `liveUpdate` orchestration)
3. `GroupSubmenu` (per-group submenu wrapping `FilterSubmenu`s)
4. `dropdownFor()` dispatch
5. Search index (`buildSearchIndex`, `append*Entries`, `parseHost`)
6. Result counting (`useEntryCounts`)
7. `AddFilterMenu` (the orchestrator that ties query + index + results + recents together)
8. `ResultRow` (the search-result row dispatcher)

The seven sub-modules share a real domain bundle: query string, results, recents, counts, and a commit api. That bundle has no interface today; it's a handful of inline `useMemo` results passed via props. The missing seam is a `FilterMenuContext` exposing this bundle as `{ state, actions, meta }`.

### Existing real seam

`useAddCommitApi()` in `use-add-commit-api.ts` already isolates the URL-write side as a tidy three-method interface. One adapter today (URL-backed), which makes it a hypothetical seam. After this refactor it becomes a real seam: the Provider takes any `AddCommitApi` implementation, enabling a local-state adapter for Storybook stories, settings previews, or detached demos without rewriting the UI.

### Out of scope (follow-ups)

These were flagged during the audit but are not part of this plan. Track separately:

- `settings/sections/library/index.tsx` (1284 lines), `capture/processing-dialog/index.tsx` (1061), `command-palette/cmdk/index.tsx` (1000), `settings/sections/integrations/index.tsx` (832), `save/preview/tag-picker/index.tsx` (744), `save/context-menu/index.tsx` (555), `settings/sections/developer/index.tsx` (544): each over the workspace `AGENTS.md` 400-line split threshold and worth a separate compound-refactor plan.
- `_primitives/card-thumb/{image,video,placeholder,downloading-badge}/`: already a context-driven compound; depth is structural, leave as-is.
- `library/all-tags/{rail,tag-item}/`: each over 300 lines with substantive logic. Keep as folders.
- `settings/sections/components/_primitives/*.tsx`: already flat sibling files. Awkward placement (5 levels deep) but a folder-rename pass, not a component-split.

---

## File Structure

After the refactor, `library/menus/filter/` looks like this:

```
library/menus/filter/
  index.tsx                # the FilterMenu compound (single file, ~500 lines)
  value-editor.tsx         # discriminated body switcher + 6 named bodies (~450 lines)
  provider.tsx             # Root provider, owns state wiring (~120 lines)
  search-index.ts          # buildSearchIndex, append*Entries, parseHost, useEntryCounts (~180 lines)
  results.tsx              # PredicateList row + ResultRow rendering (~110 lines)
  context.ts               # FilterMenuContext + types (~60 lines)
  styles.module.css        # parent classes (search-row, kbd, breadcrumb, count, swatch-dot, value-popup, submenu-chevron, empty)
  value-editor.module.css  # body/search/empty/range/check/section-header/star-flag/dash (merged from all six dropdowns)
  helpers.ts               # unchanged (AddCommitApi interface + predicate helpers)
  use-add-commit-api.ts    # unchanged
  recents.ts               # unchanged
  relative-time.ts         # unchanged
  score.ts                 # unchanged
  date-presets.ts          # unchanged
```

Deleted at the end of the refactor:

```
library/menus/filter/dropdowns/             # entire subtree
  index.ts
  types.ts
  string/{index.tsx,styles.module.css}
  optional/{index.tsx,styles.module.css}
  enum/{index.tsx,styles.module.css}
  number/{index.tsx,styles.module.css}
  date/{index.tsx,styles.module.css}
  tags/{index.tsx,styles.module.css}
```

### File responsibilities

- **`context.ts`** — Defines `FilterMenuState`, `FilterMenuActions`, `FilterMenuMeta`, `FilterMenuContextValue`, exports `FilterMenuContext` (a `createContext<FilterMenuContextValue | null>(null)`).
- **`provider.tsx`** — Defines `Root` (the Provider). Reads `useSaves`, `useRecents`, `useState` for `query`, builds search index + synthetic + results + counts via memos, threads the `AddCommitApi` through to context actions. Single source of state.
- **`search-index.ts`** — Pure functions and one hook. Move `SearchEntry` types, `buildSearchIndex`, `appendTagEntries`, `appendCreatorEntries`, `appendHostEntries`, `parseHost`, `useEntryCounts`, `entryKey`, `formatCount`, `RESULT_CAP`, `TAG_CAP`, `CREATOR_CAP`, `HOST_CAP` here.
- **`value-editor.tsx`** — Defines `ValueEditor` (discriminated on `FIELD_META[field].type`) plus six internal named bodies (`StringBody`, `OptionalBody`, `EnumBody`, `NumberBody`, `DateBody`, `TagsBody`). Each body keeps its own local UI state (`q`, `showCustom`). Imports `value-editor.module.css`.
- **`results.tsx`** — Defines `PredicateList` (the search-results renderer) and `ResultRow` (the row dispatcher). Reads results + counts from context.
- **`index.tsx`** — Glues it together. Defines `SearchInput`, `FieldPicker`, `Field`, `Group`, `Empty` as named pieces. Exports the compound object `FilterMenu = { Root, SearchInput, FieldPicker, Field, Group, ValueEditor, PredicateList, Empty }`. Re-exports `useAddCommitApi` and `AddCommitApi` for callers.

---

## Compound Design

### Context shape

```ts
// context.ts
import type { ComponentType } from "react";
import { createContext } from "react";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import type { AddCommitApi } from "./helpers";
import type { SearchEntry } from "./search-index";

export type FieldGroupId = "content" | "media" | "people" | "time";

export interface FieldGroup {
  id: FieldGroupId;
  label: string;
  display?: "submenu";
  icon?: ComponentType<{ width?: string | number; height?: string | number }>;
}

export interface FilterMenuState {
  query: string;
  results: SearchEntry[] | null;
  resultCounts: Map<string, number>;
  recents: Map<string, number>;
  fieldGroups: readonly FieldGroup[];
  fieldsByGroup: Record<FieldGroupId, FieldId[]>;
}

export interface FilterMenuActions {
  setQuery: (q: string) => void;
  commitOne: (predicate: Predicate) => void;
  liveAdd: (predicate: Predicate) => number;
  liveUpdate: (idx: number, predicate: Predicate | null) => void;
  noteValueCommit: (predicate: Predicate) => void;
}

export interface FilterMenuMeta {
  inputRef?: React.Ref<HTMLInputElement>;
  api: AddCommitApi;
}

export interface FilterMenuContextValue {
  state: FilterMenuState;
  actions: FilterMenuActions;
  meta: FilterMenuMeta;
}

export const FilterMenuContext = createContext<FilterMenuContextValue | null>(null);
```

### Compound shape

```tsx
// index.tsx exports
export const FilterMenu = {
  Root,          // Provider; takes { api, inputRef, children }
  SearchInput,   // reads state.query, actions.setQuery, meta.inputRef
  FieldPicker,   // renders state.fieldGroups when state.results === null
  Field,         // <Field field={id} />; owns local draft; renders SubmenuRoot+Trigger+ValueEditor
  Group,         // <Group group={...} fields={[...]} />; renders nested SubmenuRoot of Fields
  ValueEditor,   // <ValueEditor predicate onChange />; discriminated on FIELD_META[field].type
  PredicateList, // renders state.results (null = default tree, [] = empty, [...] = rows)
  Empty,         // "No matches." state
};
```

### Naming note

The user-facing names in the original ask map as follows:

| Original ask | Final name | Why |
|---|---|---|
| `FilterMenu.Root` | `FilterMenu.Root` | Direct match; doubles as the Provider per `state-decouple-implementation`. |
| `FilterMenu.FieldPicker` | `FilterMenu.FieldPicker` | Direct match. |
| `FilterMenu.PredicateList` | `FilterMenu.PredicateList` | Direct match. Renders search-result rows (which are partly predicates, partly groups, partly fields). |
| `FilterMenu.ValueEditor` | `FilterMenu.ValueEditor` | Direct match. The discriminated body that owns the six variants. |
| (not asked) | `FilterMenu.SearchInput` | Added. The search input is its own piece so callers can place it outside the menu if needed. |
| (not asked) | `FilterMenu.Field` | Added. Owns the per-field draft. Used internally by `FieldPicker` and `PredicateList`. |
| (not asked) | `FilterMenu.Group` | Added. Per-group submenu wrapper. |
| (not asked) | `FilterMenu.Empty` | Added. Empty-state row. |

### Backward-compatibility shim

The two existing call sites (`filter-bar/index.tsx`, `toolbar/index.tsx`) use `<AddFilterMenu api={api} />` and `<AddFilterMenu api={api} inputRef={inputRef} />`. To avoid touching both call sites in the same commit as the compound carve-out, ship a thin shim in `index.tsx`:

```tsx
interface AddFilterMenuProps {
  api: AddCommitApi;
  inputRef?: React.Ref<HTMLInputElement>;
}

export function AddFilterMenu({ api, inputRef }: AddFilterMenuProps) {
  return (
    <FilterMenu.Root api={api} inputRef={inputRef}>
      <FilterMenu.SearchInput />
      <FilterMenu.PredicateList />
    </FilterMenu.Root>
  );
}
```

Drop the shim in Task 9 once both call sites have been migrated.

---

## Task Decomposition

Each task is a single commit. Each task ends with `pnpm typecheck` + `pnpm lint:check` clean, and (where the change is visible) a manual smoke check in the dev server.

The dev server is already running in terminal 15 (`pnpm dev`). Keep it running across tasks; rely on Vite HMR. After every task, switch to the Pond window, open the library toolbar, click the filter button, and verify: default field tree appears, type to search, pick a field, edit its value, see the chip appear. If anything regresses, stop and fix before the next task.

### Task 1: Create `context.ts` and extract context types

**Files:**
- Create: `apps/desktop/src/renderer/src/components/library/menus/filter/context.ts`

- [ ] **Step 1: Create the context file with the full interface**

```ts
// apps/desktop/src/renderer/src/components/library/menus/filter/context.ts
import type { ComponentType } from "react";
import { createContext } from "react";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import type { AddCommitApi } from "./helpers";
import type { SearchEntry } from "./search-index";

export type FieldGroupId = "content" | "media" | "people" | "time";

export interface FieldGroup {
  id: FieldGroupId;
  label: string;
  display?: "submenu";
  icon?: ComponentType<{ width?: string | number; height?: string | number }>;
}

export interface FilterMenuState {
  query: string;
  results: SearchEntry[] | null;
  resultCounts: Map<string, number>;
  recents: Map<string, number>;
  fieldGroups: readonly FieldGroup[];
  fieldsByGroup: Record<FieldGroupId, FieldId[]>;
}

export interface FilterMenuActions {
  setQuery: (q: string) => void;
  commitOne: (predicate: Predicate) => void;
  liveAdd: (predicate: Predicate) => number;
  liveUpdate: (idx: number, predicate: Predicate | null) => void;
  noteValueCommit: (predicate: Predicate) => void;
}

export interface FilterMenuMeta {
  inputRef?: React.Ref<HTMLInputElement>;
  api: AddCommitApi;
}

export interface FilterMenuContextValue {
  state: FilterMenuState;
  actions: FilterMenuActions;
  meta: FilterMenuMeta;
}

export const FilterMenuContext = createContext<FilterMenuContextValue | null>(
  null,
);

export function useFilterMenu(): FilterMenuContextValue {
  const ctx = use(FilterMenuContext);
  if (!ctx) throw new Error("FilterMenu sub-component used outside FilterMenu.Root");
  return ctx;
}
```

Note: `use` is the React 19 hook. The file imports it as `import { createContext, use } from "react";`. Add that import.

- [ ] **Step 2: Verify the file compiles**

Run: `pnpm typecheck`

Expected: PASS. The file references `SearchEntry` from `./search-index` which doesn't exist yet — TypeScript will complain. **Defer this typecheck to after Task 2 creates `search-index.ts`.** Skip Step 2 until then.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/library/menus/filter/context.ts
git commit -m "feat(filter): introduce FilterMenuContext interface"
```

### Task 2: Extract `search-index.ts`

Move all pure functions and `SearchEntry` types out of `filter/index.tsx` so `context.ts` can resolve and `Root` can be slim.

**Files:**
- Create: `apps/desktop/src/renderer/src/components/library/menus/filter/search-index.ts`
- Modify: `apps/desktop/src/renderer/src/components/library/menus/filter/index.tsx` (remove the moved code, add an import)

- [ ] **Step 1: Create `search-index.ts` with the extracted code**

Move from `index.tsx` (lines roughly 275–523, 746–763):

- `SearchEntry` type union
- `TAG_CAP`, `CREATOR_CAP`, `HOST_CAP`, `RESULT_CAP`, `DATE_FIELDS` constants
- `buildSearchIndex`
- `appendTagEntries`, `appendCreatorEntries`, `appendHostEntries`, `parseHost`
- `useEntryCounts`
- `entryKey`, `formatCount`

Also move the `FieldGroup` taxonomy that the index depends on (`FIELD_GROUPS`, `fieldsByGroup`) into this file as well, since `buildSearchIndex` calls `fieldsByGroup()`. The `FIELD_ICONS` map and `COMPARATOR_LABELS` map can move too, since they live in the same "filter metadata" concern.

Exact code (copy verbatim from the originals; only changes are import paths and the new `FieldGroup` import from `./context`):

```ts
// apps/desktop/src/renderer/src/components/library/menus/filter/search-index.ts
import type { SaveLike } from "@pond/schema/filters/match";
import { matches } from "@pond/schema/filters/match";
import { FIELD_IDS, FIELD_META } from "@pond/schema/filters/meta";
import type {
  ComparatorId,
  FieldId,
  Predicate,
  Query,
} from "@pond/schema/filters/types";
import {
  Calendar,
  File as FileIcon,
  Link as LinkIcon,
  Pencil,
  Ruler,
  Scale,
  Shapes,
  Tag,
  Timer,
  Upload,
  User,
} from "lucide-react";
import { type ComponentType, useMemo, useRef } from "react";
import { DATE_PRESETS } from "./date-presets";
import type { FieldGroup, FieldGroupId } from "./context";
import { predicateKey } from "./score";

type IconType = ComponentType<{
  width?: string | number;
  height?: string | number;
}>;

export const FIELD_ICONS: Record<FieldId, IconType> = {
  tags: Tag,
  source: LinkIcon,
  type: FileIcon,
  shape: Shapes,
  size: Scale,
  duration: Timer,
  dimensions: Ruler,
  creator: User,
  url: LinkIcon,
  note: Pencil,
  savedAt: Upload,
  publishedAt: Calendar,
  modifiedAt: Calendar,
};

export const FIELD_GROUPS: readonly FieldGroup[] = [
  { id: "content", label: "Content" },
  { id: "media", label: "Media" },
  { id: "people", label: "People" },
  {
    id: "time",
    label: "Dates",
    display: "submenu",
    icon: Calendar,
  },
];

export function fieldsByGroup(): Record<FieldGroupId, FieldId[]> {
  const out: Record<FieldGroupId, FieldId[]> = {
    content: [],
    media: [],
    people: [],
    time: [],
  };
  for (const id of FIELD_IDS) {
    out[FIELD_META[id].group].push(id);
  }
  return out;
}

export const COMPARATOR_LABELS: Record<ComparatorId, string> = {
  eq: "is",
  neq: "is not",
  in: "is any of",
  nin: "is none of",
  contains: "contains",
  startsWith: "starts with",
  endsWith: "ends with",
  lt: "is less than",
  lte: "is at most",
  gt: "is greater than",
  gte: "is at least",
  between: "is between",
  some: "include any",
  every: "include all",
  none: "exclude all",
  exists: "is set",
};

const DATE_FIELDS: FieldId[] = ["savedAt", "publishedAt", "modifiedAt"];

export type SearchEntry =
  | { kind: "field"; field: FieldId; label: string; breadcrumb: string }
  | { kind: "group"; group: FieldGroup; label: string; breadcrumb: string }
  | {
      kind: "field-in-group";
      field: FieldId;
      group: FieldGroup;
      label: string;
      breadcrumb: string;
    }
  | {
      kind: "value";
      predicate: Predicate;
      label: string;
      breadcrumb: string;
      swatchHex?: string;
    };

const TAG_CAP = 50;
const CREATOR_CAP = 50;
const HOST_CAP = 50;
export const RESULT_CAP = 50;
export { DATE_FIELDS };

export function buildSearchIndex(saves: readonly SaveLike[]): SearchEntry[] {
  // ... (copy unchanged from filter/index.tsx lines 307–403)
}

function appendTagEntries(
  out: SearchEntry[],
  saves: readonly SaveLike[],
): void {
  // ... (copy unchanged from filter/index.tsx lines 405–428)
}

function appendCreatorEntries(
  out: SearchEntry[],
  saves: readonly SaveLike[],
): void {
  // ... (copy unchanged from filter/index.tsx lines 430–452)
}

function appendHostEntries(
  out: SearchEntry[],
  saves: readonly SaveLike[],
): void {
  // ... (copy unchanged from filter/index.tsx lines 454–476)
}

function parseHost(url: string | null | undefined): string | null {
  // ... (copy unchanged from filter/index.tsx lines 478–487)
}

export function useEntryCounts(
  saves: readonly SaveLike[],
  entries: SearchEntry[] | null,
): Map<string, number> {
  // ... (copy unchanged from filter/index.tsx lines 489–523)
}

export function entryKey(entry: SearchEntry): string {
  switch (entry.kind) {
    case "group":
      return `group:${entry.group.id}`;
    case "field":
      return `field:${entry.field}`;
    case "field-in-group":
      return `field-in-group:${entry.group.id}:${entry.field}`;
    case "value":
      return `value:${predicateKey(entry.predicate)}`;
  }
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
```

Copy the bodies indicated as `// ... (copy unchanged ...)` directly from the current `filter/index.tsx` at the line ranges noted, without modification. Verify each function body matches byte-for-byte after the copy.

- [ ] **Step 2: Remove the moved code from `filter/index.tsx`**

Delete the same blocks from `filter/index.tsx`. Replace with imports at the top of the file:

```tsx
import type { FieldGroup, FieldGroupId } from "./context";
import {
  COMPARATOR_LABELS,
  DATE_FIELDS,
  FIELD_GROUPS,
  FIELD_ICONS,
  RESULT_CAP,
  type SearchEntry,
  buildSearchIndex,
  entryKey,
  fieldsByGroup,
  formatCount,
  useEntryCounts,
} from "./search-index";
```

Remove `COMPARATOR_LABELS` from the keep-list if it's not used in `index.tsx` after extraction. Check by grepping `COMPARATOR_LABELS` in `index.tsx` after the move; remove unused imports.

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint:check`

Expected: PASS. The `index.tsx` file should now be roughly 500 lines (down from 763); the rest moved to `search-index.ts` and `context.ts`.

- [ ] **Step 4: Smoke check**

Switch to the Pond window. Open the library toolbar, click the filter button. Verify the default field tree shows, search works, picking a field shows its value editor, and committing a value adds a chip. No console errors.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/renderer/src/components/library/menus/filter/{context.ts,search-index.ts,index.tsx}
git commit -m "refactor(filter): extract search-index module and FieldGroup taxonomy"
```

### Task 3: Add `FilterMenu.Root` Provider, wrap existing `AddFilterMenu`

Create the Provider that owns state. Wrap the still-monolithic `AddFilterMenu` body in `Root` so context is available even before sub-components are carved out. The visible UI does not change yet.

**Files:**
- Create: `apps/desktop/src/renderer/src/components/library/menus/filter/provider.tsx`
- Modify: `apps/desktop/src/renderer/src/components/library/menus/filter/index.tsx`

- [ ] **Step 1: Create `provider.tsx`**

```tsx
// apps/desktop/src/renderer/src/components/library/menus/filter/provider.tsx
import type { Predicate } from "@pond/schema/filters/types";
import { Fragment, type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { useSaves } from "@/pool/hooks";
import {
  type FilterMenuContextValue,
  FilterMenuContext,
} from "./context";
import type { AddCommitApi } from "./helpers";
import { pushRecent, useRecents } from "./recents";
import { parseRelative } from "./relative-time";
import { predicateKey, searchEntries } from "./score";
import {
  DATE_FIELDS,
  FIELD_GROUPS,
  RESULT_CAP,
  type SearchEntry,
  buildSearchIndex,
  fieldsByGroup,
  useEntryCounts,
} from "./search-index";
import { FIELD_META } from "@pond/schema/filters/meta";

interface RootProps {
  api: AddCommitApi;
  inputRef?: React.Ref<HTMLInputElement>;
  children: ReactNode;
}

export function Root({ api, inputRef, children }: RootProps) {
  const saves = useSaves();
  const [query, setQuery] = useState("");
  const recentList = useRecents();

  const recents = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < recentList.length; i++) {
      const key = recentList[i];
      if (key !== undefined) map.set(key, i);
    }
    return map;
  }, [recentList]);

  const groups = useMemo(() => fieldsByGroup(), []);
  const index = useMemo(() => buildSearchIndex(saves), [saves]);

  const synthetic = useMemo<SearchEntry[]>(() => {
    const m = parseRelative(query);
    if (!m) return [];
    return DATE_FIELDS.map((field) => {
      const meta = FIELD_META[field];
      return {
        kind: "value",
        predicate: { kind: "p", field, cmp: "gte", value: m.isoDuration },
        label: m.label,
        breadcrumb: `Dates › ${meta.label}`,
      } as const;
    });
  }, [query]);

  const results = useMemo<SearchEntry[] | null>(() => {
    if (!query.trim()) return null;
    const seen = new Set<string>();
    const merged: SearchEntry[] = [];
    for (const list of [index, synthetic]) {
      for (const entry of list) {
        if (entry.kind === "value") {
          const k = predicateKey(entry.predicate);
          if (seen.has(k)) continue;
          seen.add(k);
        }
        merged.push(entry);
      }
    }
    return searchEntries(merged, query, recents).slice(0, RESULT_CAP);
  }, [query, index, synthetic, recents]);

  const resultCounts = useEntryCounts(saves, results);

  const commitOne = useCallback(
    (predicate: Predicate) => {
      api.commitOne(predicate);
      pushRecent(predicateKey(predicate));
    },
    [api],
  );

  const pushedOnceRef = useRef(false);
  const noteValueCommit = useCallback((predicate: Predicate) => {
    if (pushedOnceRef.current) return;
    pushedOnceRef.current = true;
    pushRecent(predicateKey(predicate));
  }, []);

  const value = useMemo<FilterMenuContextValue>(
    () => ({
      state: {
        query,
        results,
        resultCounts,
        recents,
        fieldGroups: FIELD_GROUPS,
        fieldsByGroup: groups,
      },
      actions: {
        setQuery,
        commitOne,
        liveAdd: api.liveAdd,
        liveUpdate: api.liveUpdate,
        noteValueCommit,
      },
      meta: { inputRef, api },
    }),
    [
      query,
      results,
      resultCounts,
      recents,
      groups,
      commitOne,
      api,
      noteValueCommit,
      inputRef,
    ],
  );

  return <FilterMenuContext value={value}>{children}</FilterMenuContext>;
}
```

- [ ] **Step 2: Update `index.tsx` to wrap `AddFilterMenu`'s body in `Root`**

In `filter/index.tsx`, change the export to use the new Provider as a wrapper while keeping all internals as-is. The existing internal sub-components (`FilterSubmenu`, `GroupSubmenu`, `ResultRow`, etc.) still receive `api` via props; that is removed in Task 5.

```tsx
// near top of filter/index.tsx
import { Root } from "./provider";

// the existing AddFilterMenu becomes:
interface AddFilterMenuProps {
  api: AddCommitApi;
  inputRef?: React.Ref<HTMLInputElement>;
}

export function AddFilterMenu({ api, inputRef }: AddFilterMenuProps) {
  return (
    <Root api={api} inputRef={inputRef}>
      <AddFilterMenuBody />
    </Root>
  );
}

function AddFilterMenuBody() {
  // copy the existing function body of AddFilterMenu here verbatim, but:
  //  - read `query` / `setQuery` from context (use the hook) instead of useState
  //  - read `results` / `resultCounts` / `recents` / `groups` / `index` from context
  //  - get `api` from context.meta.api for now (sub-components still take it as a prop)
  const ctx = use(FilterMenuContext);
  if (!ctx) return null;
  const { state, actions, meta } = ctx;
  const { query, results, resultCounts, fieldGroups, fieldsByGroup: groups } = state;
  const { setQuery, commitOne, noteValueCommit } = actions;
  const { api, inputRef } = meta;

  return (
    <>
      <div className={styles["search-row"]}>
        <Input.Field
          ref={inputRef}
          type="search"
          value={query}
          placeholder="Add filter…"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            const k = e.key;
            if (k.length === 1 || k === "Backspace" || k === "Delete") {
              e.stopPropagation();
            }
          }}
          autoFocus
          spellCheck={false}
          aria-label="Add filter"
        />
        <kbd className={styles.kbd} aria-hidden>
          F
        </kbd>
      </div>
      {results === null ? (
        fieldGroups.map((group, i) => (
          <Fragment key={group.id}>
            {i > 0 ? <Menu.Separator /> : null}
            {group.display === "submenu" ? (
              <GroupSubmenu
                group={group}
                fields={groups[group.id]}
                api={api}
                onValueCommit={noteValueCommit}
              />
            ) : (
              groups[group.id].map((field) => (
                <FilterSubmenu
                  key={field}
                  field={field}
                  api={api}
                  onValueCommit={noteValueCommit}
                />
              ))
            )}
          </Fragment>
        ))
      ) : results.length === 0 ? (
        <div className={styles.empty}>No matches.</div>
      ) : (
        results.map((entry) => (
          <ResultRow
            key={entryKey(entry)}
            entry={entry}
            count={
              entry.kind === "value"
                ? resultCounts.get(predicateKey(entry.predicate))
                : undefined
            }
            groupFields={
              entry.kind === "group" ? groups[entry.group.id] : undefined
            }
            api={api}
            onCommitOne={commitOne}
            onValueCommit={noteValueCommit}
          />
        ))
      )}
    </>
  );
}
```

Remove the now-duplicated state setup that was in `AddFilterMenu`'s body (useSaves, useRecents, useMemo for index/synthetic/results, useEntryCounts, commitOne callback, pushedOnceRef + onLiveValueCommit). It now lives in `Root`.

- [ ] **Step 3: Typecheck, lint, smoke**

Run: `pnpm typecheck && pnpm lint:check`

Expected: PASS.

Switch to the Pond window. Smoke check identical to Task 2 Step 4. Verify the menu still works.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/src/components/library/menus/filter/{provider.tsx,index.tsx}
git commit -m "refactor(filter): wrap AddFilterMenu in FilterMenu.Root provider"
```

### Task 4: Inline the six dropdown variants into `value-editor.tsx`

Delete the `dropdowns/` subtree and replace with one file holding all six bodies as named pieces, plus a top-level `ValueEditor` that dispatches.

**Files:**
- Create: `apps/desktop/src/renderer/src/components/library/menus/filter/value-editor.tsx`
- Create: `apps/desktop/src/renderer/src/components/library/menus/filter/value-editor.module.css`
- Delete: `apps/desktop/src/renderer/src/components/library/menus/filter/dropdowns/` (entire subtree)
- Modify: `apps/desktop/src/renderer/src/components/library/menus/filter/index.tsx`

- [ ] **Step 1: Create `value-editor.module.css` by merging the six dropdown stylesheets**

Take the union of classes from `dropdowns/{string,optional,enum,number,date,tags}/styles.module.css`. The duplicate `.body`, `.search`, `.empty` declarations resolve as follows (verified by reading each file):

- `.body`: keep the widest set of properties. The string variant is the simplest (`width: 240px; padding: 6px`); enum and tags add `gap: 1px`, `max-height: 360px`, `overflow-y: auto`, `overscroll-behavior: contain`, `scroll-padding-block: 0.5rem`. **Use data-attribute variants** instead of duplicating: `.body[data-variant="scroll"] { max-height: 360px; overflow-y: auto; … }`.
- `.search`: identical across files (`padding-block-end: 6px; margin-block-end: 4px; border-bottom: 1px solid var(--ds-gray-a3)`). Keep one copy.
- `.empty`: small variation (string has `padding: 12px 10px`, others `padding: 16px 12px`). Keep `16px 12px` as default.
- `.range`, `.dash`, `.check`, `.section-header`, `.star-flag`, `.count`: unique per dropdown that uses them; merge as-is.

Exact merged file:

```css
/* apps/desktop/src/renderer/src/components/library/menus/filter/value-editor.module.css */
.body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 240px;
  padding: 6px;
}

.body[data-variant="scroll"] {
  max-height: 360px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-padding-block: 0.5rem;
}

.body[data-variant="narrow"] {
  width: 200px;
}

.search {
  padding-block-end: 6px;
  margin-block-end: 4px;
  border-bottom: 1px solid var(--ds-gray-a3);
}

.empty {
  padding: 16px 12px;
  font-size: 12px;
  color: var(--ds-gray-11);
  text-align: center;
}

.range {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 6px 4px 2px;
}

.dash {
  font-size: 12px;
  color: var(--ds-gray-10);
}

.check {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  color: var(--ds-gray-12);
}

.section-header {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 6px 8px 2px;
  font-size: 11px;
  font-weight: 500;
  color: var(--ds-gray-11);
}

.star-flag {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  color: var(--ds-yellow-9);
}

.count {
  flex-shrink: 0;
  padding-left: 8px;
  margin-left: auto;
  font-size: 11px;
  font-weight: 450;
  font-variant-numeric: tabular-nums;
  color: var(--ds-gray-11);
}
```

Verification step before writing: open each of the six original `dropdowns/*/styles.module.css` and confirm none of them has a class not represented above. If something is missed, add it. The `.range`, `.dash` rules in particular are used by `number/` and `date/` — both files have these classes; the values in the merged file are taken from `number/styles.module.css`.

- [ ] **Step 2: Create `value-editor.tsx` with the discriminated component plus six named bodies**

```tsx
// apps/desktop/src/renderer/src/components/library/menus/filter/value-editor.tsx
import { FIELD_META } from "@pond/schema/filters/meta";
import type { Predicate } from "@pond/schema/filters/types";
import { Input, Menu } from "@pond/ui";
import { Check, Star } from "lucide-react";
import { Fragment, useCallback, useMemo, useState } from "react";
import { useSaves } from "@/pool/hooks";
import { useTagGroups } from "@/pool/tag-groups";
import { useTags } from "@/pool/tags";
import { DATE_PRESETS } from "./date-presets";
import styles from "./value-editor.module.css";

export interface ValueEditorProps {
  predicate: Predicate;
  onChange: (next: Predicate) => void;
}

export function ValueEditor({ predicate, onChange }: ValueEditorProps) {
  const meta = FIELD_META[predicate.field];
  switch (meta.type) {
    case "stringArray":
      return <TagsBody predicate={predicate} onChange={onChange} />;
    case "enum":
      return <EnumBody predicate={predicate} onChange={onChange} />;
    case "number":
      return <NumberBody predicate={predicate} onChange={onChange} />;
    case "date":
      return <DateBody predicate={predicate} onChange={onChange} />;
    case "optional":
      return <OptionalBody predicate={predicate} onChange={onChange} />;
    default:
      return <StringBody predicate={predicate} onChange={onChange} />;
  }
}

function StringBody({ predicate, onChange }: ValueEditorProps) {
  // copy unchanged from dropdowns/string/index.tsx body (lines 6–22)
}

function OptionalBody({ predicate, onChange }: ValueEditorProps) {
  // copy unchanged from dropdowns/optional/index.tsx body (lines 17–55)
  // change className={styles.body} to className={styles.body} data-variant="narrow"
}

function EnumBody({ predicate, onChange }: ValueEditorProps) {
  // copy unchanged from dropdowns/enum/index.tsx body (lines 8–86)
  // change className={styles.body} to className={styles.body} data-variant="scroll"
}

function NumberBody({ predicate, onChange }: ValueEditorProps) {
  // copy unchanged from dropdowns/number/index.tsx body (lines 7–92)
}

function DateBody({ predicate, onChange }: ValueEditorProps) {
  // copy unchanged from dropdowns/date/index.tsx body (lines 7–106)
}

function TagsBody({ predicate, onChange }: ValueEditorProps) {
  // copy unchanged from dropdowns/tags/index.tsx body (lines 24–194)
  // change className={styles.body} to className={styles.body} data-variant="scroll"
}
```

Copy each body byte-for-byte from its original. The only changes are:
- Drop the `import type { DropdownProps } from "../types"` line; use `ValueEditorProps` defined above.
- Drop `import styles from "./styles.module.css"`; use the shared `value-editor.module.css` import at the top.
- Where the parent body had a unique style variant (scrollable list, narrow), add the `data-variant` attribute as noted.
- Imports for `DATE_PRESETS`, `useTags`, `useTagGroups`, `useSaves` already moved to the top.

Verify each body's JSX matches the original by diffing visually. The CSS class names referenced (`.body`, `.search`, `.empty`, `.range`, `.dash`, `.check`, `.section-header`, `.star-flag`, `.count`) all exist in the merged CSS module.

- [ ] **Step 3: Update `index.tsx` to import `ValueEditor` from the new file**

In `filter/index.tsx`, replace:

```tsx
import { DateDropdown } from "./dropdowns/date";
import { EnumDropdown } from "./dropdowns/enum";
import { NumberDropdown } from "./dropdowns/number";
import { OptionalDropdown } from "./dropdowns/optional";
import { StringDropdown } from "./dropdowns/string";
import { TagsDropdown } from "./dropdowns/tags";
import type { DropdownProps } from "./dropdowns/types";
```

with:

```tsx
import { ValueEditor, type ValueEditorProps } from "./value-editor";
```

Delete the `dropdownFor()` function entirely (it dispatched to the six removed variants).

In `FilterSubmenu`, replace:

```tsx
const Dropdown = dropdownFor(field);
// ...
<Dropdown predicate={draft} onChange={handleChange} />
```

with:

```tsx
<ValueEditor predicate={draft} onChange={handleChange} />
```

- [ ] **Step 4: Delete the `dropdowns/` subtree**

Run:

```bash
rm -r apps/desktop/src/renderer/src/components/library/menus/filter/dropdowns
```

- [ ] **Step 5: Typecheck, lint, smoke**

Run: `pnpm typecheck && pnpm lint:check`

Expected: PASS. The unused `DropdownProps` type and the six `*Dropdown` imports are gone; lint should be clean.

Switch to Pond. Open the filter menu. Verify each filter type still works:
- String: filter by URL → type a substring, chip appears
- Optional: filter by Note → "With note" / "Without note" picker
- Enum: filter by Type → multi-select presets
- Number: filter by Size → presets + min/max range
- Date: filter by Saved At → presets + custom range
- Tags: filter by Tags → grouped multi-select with counts

If anything looks off (different padding, missing scroll), inspect the element and check the CSS module to confirm the merged class still applies.

- [ ] **Step 6: Commit**

```bash
git add -A apps/desktop/src/renderer/src/components/library/menus/filter
git commit -m "refactor(filter): inline 6 dropdown variants into ValueEditor compound piece"
```

### Task 5: Carve out `FilterMenu.Field` and `FilterMenu.Group`

Move `FilterSubmenu` and `GroupSubmenu` out of `index.tsx` into named compound pieces that read everything they need from context (no more `api` / `onValueCommit` props).

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/library/menus/filter/index.tsx`

- [ ] **Step 1: Add `use` import to `index.tsx`**

```tsx
import { Fragment, use, useRef, useState } from "react";
```

- [ ] **Step 2: Replace `FilterSubmenu` with a context-consuming `Field`**

Find the existing `FilterSubmenu` function (around lines 146–221). Replace with:

```tsx
interface FieldProps {
  field: FieldId;
  breadcrumb?: string;
}

function Field({ field, breadcrumb }: FieldProps) {
  const ctx = use(FilterMenuContext);
  if (!ctx) return null;
  const { actions } = ctx;

  const meta = FIELD_META[field];
  const Icon = FIELD_ICONS[field];
  const [draft, setDraft] = useState<Predicate>(() => defaultPredicateFor(field));
  const liveIndexRef = useRef<number | null>(null);

  function handleChange(next: Predicate) {
    setDraft(next);
    const active = predicateIsActive(next);
    const idx = liveIndexRef.current;
    if (idx == null) {
      if (active) {
        liveIndexRef.current = actions.liveAdd(next);
        actions.noteValueCommit(next);
      }
      return;
    }
    if (active) {
      actions.liveUpdate(idx, next);
      actions.noteValueCommit(next);
    } else {
      actions.liveUpdate(idx, null);
      liveIndexRef.current = null;
    }
  }

  return (
    <Menu.SubmenuRoot
      onOpenChange={(open) => {
        if (open) return;
        setDraft(defaultPredicateFor(field));
        liveIndexRef.current = null;
      }}
    >
      <Menu.SubmenuTrigger>
        <Menu.ItemIcon>
          <Icon width="1em" height="1em" />
        </Menu.ItemIcon>
        <Menu.ItemLabel>
          {breadcrumb ? (
            <span className={styles.breadcrumb}>{breadcrumb}&nbsp;›&nbsp;</span>
          ) : null}
          {meta.label}
        </Menu.ItemLabel>
        <span className={styles["submenu-chevron"]} aria-hidden>
          <ChevronRight width="0.85em" height="0.85em" />
        </span>
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner align="start" side="left" sideOffset={6}>
          <Menu.Popup className={styles["value-popup"]}>
            <ValueEditor predicate={draft} onChange={handleChange} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}
```

- [ ] **Step 3: Replace `GroupSubmenu` with a context-consuming `Group`**

Find the existing `GroupSubmenu` function (around lines 231–273). Replace with:

```tsx
interface GroupProps {
  group: FieldGroup;
  fields: readonly FieldId[];
  breadcrumb?: string;
}

function Group({ group, fields, breadcrumb }: GroupProps) {
  const Icon = group.icon;
  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger>
        {Icon ? (
          <Menu.ItemIcon>
            <Icon width="1em" height="1em" />
          </Menu.ItemIcon>
        ) : null}
        <Menu.ItemLabel>
          {breadcrumb ? (
            <span className={styles.breadcrumb}>{breadcrumb}&nbsp;›&nbsp;</span>
          ) : null}
          {group.label}
        </Menu.ItemLabel>
        <span className={styles["submenu-chevron"]} aria-hidden>
          <ChevronRight width="0.85em" height="0.85em" />
        </span>
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner align="start" side="left" sideOffset={6}>
          <Menu.Popup>
            {fields.map((field) => (
              <Field key={field} field={field} />
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}
```

- [ ] **Step 4: Update `AddFilterMenuBody` and `ResultRow` to use the new components**

In `AddFilterMenuBody`, replace `<FilterSubmenu field={field} api={api} onValueCommit={noteValueCommit} />` with `<Field field={field} />`, and `<GroupSubmenu group={group} fields={groups[group.id]} api={api} onValueCommit={noteValueCommit} />` with `<Group group={group} fields={groups[group.id]} />`.

In `ResultRow`, remove the `api` and `onValueCommit` props from each case:

```tsx
case "group":
  return <Group group={entry.group} fields={groupFields ?? []} breadcrumb={entry.breadcrumb || undefined} />;
case "field":
  return <Field field={entry.field} breadcrumb={entry.breadcrumb || undefined} />;
case "field-in-group":
  return <Field field={entry.field} breadcrumb={entry.breadcrumb || undefined} />;
```

The `ResultRow` props interface drops `api` and `onValueCommit`; it now only needs `entry`, `count`, `groupFields`, `onCommitOne`.

- [ ] **Step 5: Typecheck, lint, smoke**

Run: `pnpm typecheck && pnpm lint:check`

Smoke check: same as Task 4 Step 5. All filter types still work, group submenus (Dates) still open, and the search results path still works.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/renderer/src/components/library/menus/filter/index.tsx
git commit -m "refactor(filter): replace FilterSubmenu+GroupSubmenu with context-driven Field+Group"
```

### Task 6: Extract `FilterMenu.PredicateList`, `FilterMenu.FieldPicker`, `FilterMenu.SearchInput`, `FilterMenu.Empty`

Move the three rendering modes (search input, default field tree, results list) out of `AddFilterMenuBody` into named pieces that each consume context.

**Files:**
- Create: `apps/desktop/src/renderer/src/components/library/menus/filter/results.tsx`
- Modify: `apps/desktop/src/renderer/src/components/library/menus/filter/index.tsx`

- [ ] **Step 1: Create `results.tsx`**

```tsx
// apps/desktop/src/renderer/src/components/library/menus/filter/results.tsx
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { Menu } from "@pond/ui";
import { use } from "react";
import { FilterMenuContext } from "./context";
import { FIELD_ICONS, entryKey, formatCount, type SearchEntry } from "./search-index";
import { predicateKey } from "./score";
import styles from "./styles.module.css";

interface PredicateListProps {
  children?: never;
}

export function PredicateList(_: PredicateListProps) {
  const ctx = use(FilterMenuContext);
  if (!ctx) return null;
  const { state, actions } = ctx;
  const { results, resultCounts, fieldsByGroup } = state;

  if (results === null) return null;
  if (results.length === 0) return <Empty />;

  return (
    <>
      {results.map((entry) => (
        <ResultRow
          key={entryKey(entry)}
          entry={entry}
          count={
            entry.kind === "value"
              ? resultCounts.get(predicateKey(entry.predicate))
              : undefined
          }
          groupFields={
            entry.kind === "group" ? fieldsByGroup[entry.group.id] : undefined
          }
          onCommitOne={actions.commitOne}
        />
      ))}
    </>
  );
}

export function Empty() {
  return <div className={styles.empty}>No matches.</div>;
}

interface ResultRowProps {
  entry: SearchEntry;
  count: number | undefined;
  groupFields: FieldId[] | undefined;
  onCommitOne: (predicate: Predicate) => void;
}

function ResultRow({ entry, count, groupFields, onCommitOne }: ResultRowProps) {
  // Field and Group are imported lazily via the FilterMenu compound to avoid
  // a circular import (index.tsx imports results.tsx which imports index.tsx).
  // The compound piece is forwarded through context indirectly: we render Menu
  // primitives here and delegate field/group rendering to the parent's
  // FilterMenu.Field / FilterMenu.Group via the exported compound — see
  // index.tsx where PredicateList is composed inside <FilterMenu.Root>.
  //
  // To avoid the cycle entirely, ResultRow only handles the "value" case here,
  // and field/group rows are handled by a small dispatcher kept in index.tsx.
  // See Task 7 for the final wiring.

  if (entry.kind !== "value") return null;
  const Icon = FIELD_ICONS[entry.predicate.field];
  return (
    <Menu.Item onClick={() => onCommitOne(entry.predicate)}>
      {entry.swatchHex ? (
        <span
          className={styles["swatch-dot"]}
          style={{ background: `#${entry.swatchHex}` }}
          aria-hidden
        />
      ) : (
        <Menu.ItemIcon>
          <Icon width="1em" height="1em" />
        </Menu.ItemIcon>
      )}
      <Menu.ItemLabel>
        {entry.breadcrumb ? (
          <span className={styles.breadcrumb}>
            {entry.breadcrumb}&nbsp;›&nbsp;
          </span>
        ) : null}
        {entry.label}
      </Menu.ItemLabel>
      {count != null ? (
        <span className={styles.count}>{formatCount(count)}</span>
      ) : null}
    </Menu.Item>
  );
}
```

The circular import is real: `results.tsx` wants `Field` and `Group`, which live in `index.tsx`, which imports `PredicateList` from `results.tsx`. Fix this by keeping the field/group dispatching in `index.tsx` (Task 7) and letting `results.tsx` handle only the "value" row case.

- [ ] **Step 2: Add `SearchInput` and `FieldPicker` to `index.tsx`**

Replace the body of `AddFilterMenuBody` with three named pieces:

```tsx
function SearchInput() {
  const ctx = use(FilterMenuContext);
  if (!ctx) return null;
  const { state, actions, meta } = ctx;
  return (
    <div className={styles["search-row"]}>
      <Input.Field
        ref={meta.inputRef}
        type="search"
        value={state.query}
        placeholder="Add filter…"
        onChange={(e) => actions.setQuery(e.target.value)}
        onKeyDown={(e) => {
          const k = e.key;
          if (k.length === 1 || k === "Backspace" || k === "Delete") {
            e.stopPropagation();
          }
        }}
        autoFocus
        spellCheck={false}
        aria-label="Add filter"
      />
      <kbd className={styles.kbd} aria-hidden>
        F
      </kbd>
    </div>
  );
}

function FieldPicker() {
  const ctx = use(FilterMenuContext);
  if (!ctx) return null;
  const { state } = ctx;
  if (state.results !== null) return null;

  return (
    <>
      {state.fieldGroups.map((group, i) => (
        <Fragment key={group.id}>
          {i > 0 ? <Menu.Separator /> : null}
          {group.display === "submenu" ? (
            <Group group={group} fields={state.fieldsByGroup[group.id]} />
          ) : (
            state.fieldsByGroup[group.id].map((field) => (
              <Field key={field} field={field} />
            ))
          )}
        </Fragment>
      ))}
    </>
  );
}
```

Remove the old `AddFilterMenuBody` function entirely.

- [ ] **Step 3: Update `AddFilterMenu` to compose the new pieces**

```tsx
export function AddFilterMenu({ api, inputRef }: AddFilterMenuProps) {
  return (
    <Root api={api} inputRef={inputRef}>
      <SearchInput />
      <FieldPicker />
      <PredicateList />
    </Root>
  );
}
```

Import `PredicateList` from `./results`.

- [ ] **Step 4: Typecheck, lint, smoke**

Run: `pnpm typecheck && pnpm lint:check`

Expected: PASS. The smoke check should be identical — same UI, just composed from compound pieces.

There's one gap: `PredicateList`'s ResultRow only handles the "value" case. The field / field-in-group / group rows from the search results need to be rendered too. Verify in the smoke check: type a search like "tag" and confirm "Tags" (field row) appears in the list. If it doesn't, Task 7 fixes it.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/renderer/src/components/library/menus/filter/{results.tsx,index.tsx}
git commit -m "refactor(filter): add SearchInput, FieldPicker, PredicateList compound pieces"
```

### Task 7: Wire field / group result rows back through `PredicateList`

`ResultRow` in `results.tsx` only handles the "value" case. Re-route the field / field-in-group / group cases through the compound's `Field` and `Group` pieces by lifting `ResultRow` back into `index.tsx` (which has access to both).

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/library/menus/filter/results.tsx`
- Modify: `apps/desktop/src/renderer/src/components/library/menus/filter/index.tsx`

- [ ] **Step 1: Export the value-row dispatcher from `results.tsx`**

Rename the internal `ResultRow` in `results.tsx` to `ValueRow` and export it. Drop the field / field-in-group / group cases (they're already gone — the body returned null for non-value). Replace `PredicateList`'s call to `ResultRow` with the full discriminator, and let `index.tsx` provide a render-prop or a context.

Actually, the simplest fix is to inline the dispatch back into `index.tsx`:

In `results.tsx`, change `PredicateList` to take a `renderRow` prop or use a small render-callback pattern:

```tsx
// results.tsx
export interface PredicateListProps {
  renderRow: (entry: SearchEntry, count: number | undefined, groupFields: FieldId[] | undefined) => React.ReactNode;
}

export function PredicateList({ renderRow }: PredicateListProps) {
  const ctx = use(FilterMenuContext);
  if (!ctx) return null;
  const { state } = ctx;
  const { results, resultCounts, fieldsByGroup } = state;

  if (results === null) return null;
  if (results.length === 0) return <Empty />;

  return (
    <>
      {results.map((entry) => {
        const count = entry.kind === "value"
          ? resultCounts.get(predicateKey(entry.predicate))
          : undefined;
        const groupFields = entry.kind === "group"
          ? fieldsByGroup[entry.group.id]
          : undefined;
        return (
          <Fragment key={entryKey(entry)}>
            {renderRow(entry, count, groupFields)}
          </Fragment>
        );
      })}
    </>
  );
}
```

Wait — the `vercel-composition-patterns` `patterns-children-over-render-props` rule prefers children over `renderX` props. Re-think.

The cleaner fix: keep the row dispatcher in `index.tsx` (where `Field` and `Group` live), have it consume the context directly, and remove `PredicateList` from `results.tsx` entirely. Move the whole list back to `index.tsx`. `results.tsx` only owns the value row.

Revised:

```tsx
// results.tsx — keep only ValueRow + Empty
export function ValueRow({ entry, count, onCommitOne }: ValueRowProps) {
  // existing value-row JSX
}

export function Empty() {
  return <div className={styles.empty}>No matches.</div>;
}
```

```tsx
// index.tsx — PredicateList lives here, can use Field and Group directly
function PredicateList() {
  const ctx = use(FilterMenuContext);
  if (!ctx) return null;
  const { state, actions } = ctx;
  const { results, resultCounts, fieldsByGroup } = state;

  if (results === null) return null;
  if (results.length === 0) return <Empty />;

  return (
    <>
      {results.map((entry) => {
        switch (entry.kind) {
          case "value":
            return (
              <ValueRow
                key={entryKey(entry)}
                entry={entry}
                count={resultCounts.get(predicateKey(entry.predicate))}
                onCommitOne={actions.commitOne}
              />
            );
          case "group":
            return (
              <Group
                key={entryKey(entry)}
                group={entry.group}
                fields={fieldsByGroup[entry.group.id]}
                breadcrumb={entry.breadcrumb || undefined}
              />
            );
          case "field":
          case "field-in-group":
            return (
              <Field
                key={entryKey(entry)}
                field={entry.field}
                breadcrumb={entry.breadcrumb || undefined}
              />
            );
        }
      })}
    </>
  );
}
```

- [ ] **Step 2: Update `results.tsx`**

Delete `PredicateList` from `results.tsx`. Keep only `ValueRow` and `Empty`. Update the file:

```tsx
// apps/desktop/src/renderer/src/components/library/menus/filter/results.tsx
import { Menu } from "@pond/ui";
import type { Predicate } from "@pond/schema/filters/types";
import { FIELD_ICONS, formatCount, type SearchEntry } from "./search-index";
import styles from "./styles.module.css";

interface ValueRowProps {
  entry: Extract<SearchEntry, { kind: "value" }>;
  count: number | undefined;
  onCommitOne: (predicate: Predicate) => void;
}

export function ValueRow({ entry, count, onCommitOne }: ValueRowProps) {
  const Icon = FIELD_ICONS[entry.predicate.field];
  return (
    <Menu.Item onClick={() => onCommitOne(entry.predicate)}>
      {entry.swatchHex ? (
        <span
          className={styles["swatch-dot"]}
          style={{ background: `#${entry.swatchHex}` }}
          aria-hidden
        />
      ) : (
        <Menu.ItemIcon>
          <Icon width="1em" height="1em" />
        </Menu.ItemIcon>
      )}
      <Menu.ItemLabel>
        {entry.breadcrumb ? (
          <span className={styles.breadcrumb}>
            {entry.breadcrumb}&nbsp;›&nbsp;
          </span>
        ) : null}
        {entry.label}
      </Menu.ItemLabel>
      {count != null ? (
        <span className={styles.count}>{formatCount(count)}</span>
      ) : null}
    </Menu.Item>
  );
}

export function Empty() {
  return <div className={styles.empty}>No matches.</div>;
}
```

- [ ] **Step 3: Update `index.tsx` with the full `PredicateList`**

Add `PredicateList` (per the code in Step 1) to `index.tsx`. Import `ValueRow` and `Empty` from `./results`.

- [ ] **Step 4: Typecheck, lint, smoke**

Run: `pnpm typecheck && pnpm lint:check`

Smoke: type a search like "tag" — expect to see the "Tags" field row appear (this was the gap from Task 6). Click it; expect the value-editor submenu to open. Type "saved" — expect a date row to appear with relative parsing. Smoke verifies the result-row dispatch works for all entry kinds.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/renderer/src/components/library/menus/filter/{results.tsx,index.tsx}
git commit -m "refactor(filter): inline PredicateList row dispatch with Field/Group/ValueRow"
```

### Task 8: Export the compound and migrate call sites

Export `FilterMenu` as a compound object, migrate the two call sites, then delete the legacy `AddFilterMenu` shim.

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/library/menus/filter/index.tsx`
- Modify: `apps/desktop/src/renderer/src/components/library/filter-bar/index.tsx`
- Modify: `apps/desktop/src/renderer/src/components/library/toolbar/index.tsx`

- [ ] **Step 1: Export `FilterMenu` from `index.tsx`**

At the bottom of `filter/index.tsx`, add:

```tsx
export const FilterMenu = {
  Root,
  SearchInput,
  FieldPicker,
  Field,
  Group,
  ValueEditor,
  PredicateList,
  Empty,
};
```

`Root` is imported from `./provider`; `ValueEditor` from `./value-editor`; `Empty` from `./results`; the rest are defined in `index.tsx`. Also re-export the types callers might want:

```tsx
export type { AddCommitApi } from "./helpers";
export { useAddCommitApi } from "./use-add-commit-api";
export type { FieldGroup, FieldGroupId, FilterMenuContextValue } from "./context";
```

Keep `AddFilterMenu` as a deprecated shim during this task only; remove it after the call sites are migrated.

- [ ] **Step 2: Migrate `filter-bar/index.tsx`**

Find the line `<AddFilterMenu api={api} />` (line 251). Replace with:

```tsx
<FilterMenu.Root api={api}>
  <FilterMenu.SearchInput />
  <FilterMenu.FieldPicker />
  <FilterMenu.PredicateList />
</FilterMenu.Root>
```

Update the import at the top:

```tsx
// before
import {
  AddFilterMenu,
  // ...
} from "@/components/library/menus/filter";

// after
import {
  FilterMenu,
  // ... (keep any other imports unchanged)
} from "@/components/library/menus/filter";
```

- [ ] **Step 3: Migrate `toolbar/index.tsx`**

Find line 96: `<AddFilterMenu api={api} inputRef={inputRef} />`. Replace with:

```tsx
<FilterMenu.Root api={api} inputRef={inputRef}>
  <FilterMenu.SearchInput />
  <FilterMenu.FieldPicker />
  <FilterMenu.PredicateList />
</FilterMenu.Root>
```

Update the import:

```tsx
// before
import { AddFilterMenu } from "@/components/library/menus/filter";

// after
import { FilterMenu } from "@/components/library/menus/filter";
```

- [ ] **Step 4: Delete the `AddFilterMenu` shim**

In `filter/index.tsx`, remove the `AddFilterMenu` export. Grep to confirm no remaining call sites:

```bash
rg "AddFilterMenu" apps/desktop
```

Expected: no matches.

- [ ] **Step 5: Typecheck, lint, smoke**

Run: `pnpm typecheck && pnpm lint:check`

Smoke: open the filter menu from both entry points (toolbar dropdown + filter-bar plus button). Both should behave identically to before.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/renderer/src/components/library/{menus/filter/index.tsx,filter-bar/index.tsx,toolbar/index.tsx}
git commit -m "feat(filter): expose FilterMenu compound; remove AddFilterMenu shim"
```

### Task 9: Final structural check

Confirm the file structure matches the plan, the line counts dropped, the dev server still HMRs, and no orphan files remain.

**Files:** (none modified)

- [ ] **Step 1: Verify file structure**

Run:

```bash
ls apps/desktop/src/renderer/src/components/library/menus/filter
```

Expected output (alphabetical):

```
context.ts
date-presets.ts
helpers.ts
index.tsx
provider.tsx
recents.ts
relative-time.ts
results.tsx
score.ts
search-index.ts
styles.module.css
use-add-commit-api.ts
value-editor.module.css
value-editor.tsx
```

No `dropdowns/` directory. No `dropdowns.ts`. No `*.bak` files.

- [ ] **Step 2: Verify line counts**

Run:

```bash
wc -l apps/desktop/src/renderer/src/components/library/menus/filter/*.{ts,tsx}
```

Expected (approximate, +/- 20 lines per file):

- `index.tsx`: ~220 lines (down from 763)
- `provider.tsx`: ~120 lines
- `search-index.ts`: ~280 lines
- `value-editor.tsx`: ~450 lines
- `results.tsx`: ~50 lines
- `context.ts`: ~60 lines
- existing helpers unchanged

Total tsx+ts in the filter directory: roughly the same as before (the 763 lines plus six dropdown index.tsx files totaling ~555 lines = ~1318 lines; after refactor ~1180 lines). Slight net reduction from CSS deduplication and removed dispatch.

- [ ] **Step 3: Final full-app smoke**

In Pond:

1. Open the library. Click the filter button in the toolbar. Confirm the search input is focused, the default tree shows.
2. Type "tag" → "Tags" field row appears in results. Click → submenu opens with the tags multi-select.
3. Pick a tag → chip appears in the filter bar.
4. Click the chip's value to reopen the value editor → tag stays selected.
5. Open the Plus button in the filter bar. Confirm the same menu appears (different entry point, same compound).
6. Open the Dates submenu → confirm group submenu still nests.
7. Test each value type: type, size (number), saved-at (date), with-note (optional), URL (string), tags (tag-array).
8. Clear all filters. Confirm chips disappear.
9. Open the command palette (Cmd-K) to confirm no unrelated regressions.

- [ ] **Step 4: Final commit if any cleanup remains**

If any file was left stale or any import path was missed, fix and commit:

```bash
git status
# if anything appears, fix and:
git add -A apps/desktop/src/renderer/src/components/library/menus/filter
git commit -m "chore(filter): post-refactor cleanup"
```

If `git status` is clean, this task is a no-op.

---

## Self-Review

Per `writing-plans` skill: skim the spec, check coverage, scan for placeholders, verify type consistency.

### Spec coverage

| Requirement from the brief | Covered by |
|---|---|
| Confirm over-split / under-split pattern via audit | Architecture Audit Summary section |
| Design `FilterMenu.Root + FieldPicker + PredicateList + ValueEditor + FilterMenuContext` | Compound Design section + Tasks 3, 5, 6, 7, 8 |
| Use `vercel-composition-patterns` (compound components, generic context, decouple state, no boolean props, no render-props) | Provider in Task 3, context interface in Task 1, Field/Group context-consumption in Task 5, PredicateList children-not-render-props in Task 7 |
| Use `writing-plans` (bite-sized steps, exact paths, complete code, no placeholders, frequent commits) | Tasks 1–9, each step is one action, every code block is complete, every task ends in commit |
| Save plan to a file before any code moves | Plan saved to `docs/plans/2026-05-27-filter-menu-compound.md` |

### Placeholder scan

- "copy unchanged from … (lines X–Y)" appears in Tasks 2 and 4 by design: the body is many dozens of lines, and the plan asks the executor to copy it byte-for-byte from a known source. This is not a placeholder; the source location is exact. Each instance is accompanied by a verification step (Task 2 Step 1's "Verify each function body matches byte-for-byte"; Task 4 Step 2's "Verify each body's JSX matches the original by diffing visually").
- No "TODO", "TBD", "implement later", "appropriate error handling", "fill in details" markers found.
- All file paths absolute relative to repo root. All commit messages provided.

### Type consistency

Names used across tasks:

- `AddCommitApi` (helpers.ts, unchanged) ✓
- `FilterMenuContextValue`, `FilterMenuState`, `FilterMenuActions`, `FilterMenuMeta` (context.ts, Task 1) — consistent in Tasks 3, 5, 6, 7
- `FieldGroup`, `FieldGroupId` (context.ts, Task 1) — used in search-index.ts (Task 2) and the compound
- `SearchEntry` (search-index.ts, Task 2) — used in results.tsx (Task 7), context.ts (Task 1)
- `ValueEditorProps` (value-editor.tsx, Task 4) — used internally, not propagated
- `Field`, `Group`, `PredicateList`, `SearchInput`, `FieldPicker`, `Empty`, `Root`, `ValueEditor` — consistent in the compound export (Task 8)
- Method names: `setQuery`, `commitOne`, `liveAdd`, `liveUpdate`, `noteValueCommit` — consistent between context.ts (Task 1), provider.tsx (Task 3), and consumers (Tasks 5, 6, 7)

No drift detected.

### Risk notes

1. **CSS merge collision**: Task 4 merges six CSS module files into one. The `.body` rule has the most variation (width: 200, 240; max-height; overflow). The data-variant approach avoids cascading bugs, but verify each variant visually in Step 5's smoke.
2. **Circular import in Task 6 → fix in Task 7**: results.tsx initially wants Field/Group from index.tsx. Plan acknowledges this and routes around it by keeping PredicateList in index.tsx.
3. **Single-pass refactor risk**: each task is small and ends in a commit, so any task can be reverted independently if the smoke check fails. The shim in Task 3 / 8 keeps callers green during the carve-out.

### Out-of-scope reminders

This plan does **not** address:
- `settings/sections/library/index.tsx` (1284 lines) and other 500+ line components — separate plans needed
- Folder-depth reorg under `library/menus/` → would land in a follow-up that flattens the `menus/` intermediate and renames to `library/filter-menu/`, `library/view-menu/`, `library/display-menu/`
- `dropdowns.ts` barrel file usage outside the filter feature (verified: none)

---

## Execution Handoff

**Plan complete and saved to `docs/plans/2026-05-27-filter-menu-compound.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session using `executing-plans`, batch execution with checkpoints for review.

**Which approach?**
