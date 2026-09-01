# Tags sidebar implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open a dedicated Tags page from the library sidebar.

**Architecture:** Reuse the existing `TagsSection` manager without duplicating its data or mutation logic. A scrollable library page hosts it at `/tags`; sidebar selection and breadcrumbs follow the route, independently of the current saved-item filter. Keep Settings > Tags available.

**Tech Stack:** React, TanStack Router, existing Pond UI and tag stores, CSS modules, Vitest.

**Status:** Implemented. The 26 focused tests and targeted Biome checks pass. Full renderer typechecking is blocked by the unrelated `/inbox` route importing a missing `components/library/inbox/page` module. The browser preview lacks the Electron `window.pond` bridge, so visual verification was not available. No user tags were changed during verification.

---

### Task 1: Lock down navigation

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/library/folder-sidebar/index.test.tsx`
- Modify: `apps/desktop/src/renderer/src/components/shell/toolbar/breadcrumbs.test.ts`

- [ ] Add `/tags` to the sidebar test router's child paths and verify navigation:

```tsx
it("opens Tags from the sidebar with an outline icon", async () => {
  const router = await mount();
  const tags = button("Tags");
  expect(tags.querySelector('[stroke="currentColor"]')).not.toBeNull();
  expect(tags.querySelector('[fill="currentColor"]')).toBeNull();
  await act(async () => tags.click());
  expect(router.state.location.pathname).toBe("/tags");
  expect(tags.getAttribute("aria-current")).toBe("page");
  expect(button("All").getAttribute("aria-current")).toBeNull();
});
```

- [ ] Reuse the existing direct-open and history tests for both `Sources` and `Tags`. Add `["/tags", "Tags"]` to the breadcrumb test's route cases.
- [ ] Run `pnpm --filter @pond/desktop test src/renderer/src/components/library/folder-sidebar/index.test.tsx src/renderer/src/components/shell/toolbar/breadcrumbs.test.ts`. Expect failures for the absent Tags entry and breadcrumb.

### Task 2: Implement the page and navigation

**Files:**
- Create: `apps/desktop/src/renderer/src/components/library/tags/page/index.tsx`
- Create: `apps/desktop/src/renderer/src/components/library/tags/page/styles.module.css`
- Create: `apps/desktop/src/renderer/src/routes/_library/tags.tsx`
- Modify: `apps/desktop/src/renderer/src/components/library/folder-sidebar/index.tsx`
- Modify: `apps/desktop/src/renderer/src/components/library/page/index.tsx`
- Modify: `apps/desktop/src/renderer/src/components/shell/toolbar/breadcrumbs.ts`
- Generate: `apps/desktop/src/renderer/src/routeTree.gen.ts`

- [ ] Create the page:

```tsx
import { TagsSection } from "@/components/settings/tags";
import { useScrollFade } from "@/hooks/use-scroll-fade";
import styles from "./styles.module.css";

export function TagsPage() {
  const scrollFade = useScrollFade<HTMLDivElement>();
  return (
    <div className={styles.page} {...scrollFade}>
      <TagsSection />
    </div>
  );
}
```

```css
.page {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}
```

- [ ] Create the file route:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { TagsPage } from "@/components/library/tags/page";

export const Route = createFileRoute("/_library/tags")({
  component: TagsPage,
});
```

- [ ] Import `IconTagsOutline18` in the sidebar. Derive `const tagsPage = pathname === "/tags"`, exclude it from `libraryPage`, and insert this row after Sources:

```tsx
<Row
  label="Tags"
  icon={<IconTagsOutline18 />}
  active={tagsPage}
  onClick={() => go("/tags")}
/>
```

- [ ] In the library layout, derive `const isTags = pathname === "/tags"`. Add `!isTags` to `showLibraryGrid` and `isTags` to the routes rendering `<Outlet />`.
- [ ] Add this branch after Sources in the breadcrumb builder:

```tsx
} else if (base === "/tags") {
  crumbs.push({ label: "Tags", path: base });
```

- [ ] Generate the route tree with `pnpm --filter @pond/desktop exec tsr generate`. Re-run Task 1's tests; expect them to pass.

### Task 3: Verify the rendered route

**Files:**
- Create: `apps/desktop/src/renderer/src/components/library/tags/page/index.test.tsx`

- [ ] Mount the real `Library` layout under a memory router with `/tags`, rendering `TagsPage` as its child. Mock the saved-item grid, app-shell content, scroll restoration, and tag-store inputs. Keep `TagsSection` real.
- [ ] Assert the Tags heading, search, and creation controls render; the library grid and save-filter chrome do not. Set the search input and verify unmatched tags disappear. Activate New Tag and New Group and assert each draft input appears. Mock IPC to verify draft commits use `tags.create` and `tagGroups.create`.
- [ ] Run focused tests covering the sidebar, breadcrumbs, toolbar, tag page, and existing new menu. Run `pnpm --filter @pond/desktop exec tsc --noEmit -p tsconfig.web.json` and Biome on changed authored files.
- [ ] If a running app/browser is available, inspect the new page for scrollability and sidebar selection. Do not mutate the user's actual tags during verification.
- [ ] Leave changes uncommitted for review; do not stage unrelated work.
