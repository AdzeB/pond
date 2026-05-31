# Rule-Based Auto-Tagging Implementation Plan

> **For agentic workers:** Use the `executing-plans` skill. Steps use checkbox
> (`- [ ]`) syntax. Read `2026-05-31-eagle-features-overview.md` first.

**Goal:** Automatically apply tags to new saves based on user-defined rules
(e.g. "source is youtube -> add `video`", "url contains dribbble -> add
`design`"). This is rule-based, not ML, matching Eagle's folder auto-tagging.

**Architecture:** Store rules in `Prefs` (a new `autoTag` section), evaluate
them in the main process at the end of ingest (`runFinalize`, right before the
status flips to `complete`, where metadata like `source`/`author`/`title`/`url`
is populated), and merge matched tags into the save via the existing
`setSaveTags` path (which auto-creates tag rows and bumps usage). A new
Settings section lets the user manage rules with the existing settings compound
pattern.

**Tech Stack:** better-sqlite3 + Drizzle, React 19 settings compound, Prefs via
`settings.getPrefs`/`settings.setPrefs`. No test runner: verify with
`pnpm --filter @pond/desktop typecheck`, `pnpm --filter @pond/schema typecheck`,
`pnpm lint:check`, manual smoke.

---

## File Structure

- Modify `packages/schema/src/db.ts`: add `AutoTagRule` type, `autoTag` to
  `Prefs` and `DEFAULT_PREFS`.
- Create `apps/desktop/src/main/core/auto-tag.ts`: `evaluateAutoTags` (pure)
  and `applyAutoTags` (reads prefs, calls `setSaveTags`).
- Modify `apps/desktop/src/main/core/pipeline/workers/finalize.ts`: call
  `applyAutoTags` before the complete patch.
- Modify `apps/desktop/src/main/core/manual-import.ts`: apply rules to manual
  saves too (depends on the manual-import plan; skip if not yet built).
- Modify `packages/schema/src/settings.ts`: register the `auto-tags` section.
- Modify `apps/desktop/src/renderer/src/components/settings/registry.tsx`: map
  the section to a component.
- Create `apps/desktop/src/renderer/src/components/settings/sections/auto-tags/index.tsx` + `styles.module.css`.

---

## Task 1: Rule type + prefs

**Files:**
- Modify: `packages/schema/src/db.ts` (Prefs interface ~312-382, DEFAULT_PREFS ~384-454)

- [ ] **Step 1: Add the rule type and prefs section**

Above the `Prefs` interface in `packages/schema/src/db.ts`:

```ts
export interface AutoTagRule {
  id: string;
  enabled: boolean;
  // All provided conditions must match (AND). Empty conditions never match.
  source?: Source | null;
  urlContains?: string | null;
  authorContains?: string | null;
  titleContains?: string | null;
  addTags: string[];
}
```

Inside the `Prefs` interface, add:

```ts
  autoTag: {
    enabled: boolean;
    rules: AutoTagRule[];
  };
```

Inside `DEFAULT_PREFS`, add:

```ts
  autoTag: {
    enabled: true,
    rules: [],
  },
```

- [ ] **Step 2: Verify**

Run: `pnpm --filter @pond/schema typecheck`
Expected: PASS. `mergePrefs` in `apps/desktop/src/main/core/prefs.ts` does a
deep merge, so existing settings rows without `autoTag` fall back to the
default; confirm `pnpm --filter @pond/desktop typecheck` also passes.

- [ ] **Step 3: Commit**

```bash
git add packages/schema/src/db.ts
git commit -m "feat(schema): add autoTag rules to prefs"
```

---

## Task 2: Rule evaluation core

**Files:**
- Create: `apps/desktop/src/main/core/auto-tag.ts`

- [ ] **Step 1: Write the module**

```ts
import type { AutoTagRule, Save } from "@pond/schema/db";
import { getPrefs } from "./prefs";
import { setSaveTags } from "./tags";

// Pure rule matcher. A rule matches only if at least one condition is set and
// every set condition matches. Returns the union of addTags from all matching
// rules (lowercased, deduped).
export function evaluateAutoTags(
  save: Pick<Save, "source" | "url" | "author" | "title">,
  rules: ReadonlyArray<AutoTagRule>,
): string[] {
  const out = new Set<string>();
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (!ruleMatches(save, rule)) continue;
    for (const t of rule.addTags) {
      const norm = t.replace(/^#+/, "").trim().toLowerCase();
      if (norm) out.add(norm);
    }
  }
  return Array.from(out);
}

function ruleMatches(
  save: Pick<Save, "source" | "url" | "author" | "title">,
  rule: AutoTagRule,
): boolean {
  let hasCondition = false;
  if (rule.source) {
    hasCondition = true;
    if (save.source !== rule.source) return false;
  }
  if (rule.urlContains) {
    hasCondition = true;
    if (!(save.url ?? "").toLowerCase().includes(rule.urlContains.toLowerCase()))
      return false;
  }
  if (rule.authorContains) {
    hasCondition = true;
    if (
      !(save.author ?? "")
        .toLowerCase()
        .includes(rule.authorContains.toLowerCase())
    )
      return false;
  }
  if (rule.titleContains) {
    hasCondition = true;
    if (
      !(save.title ?? "").toLowerCase().includes(rule.titleContains.toLowerCase())
    )
      return false;
  }
  return hasCondition;
}

// Side-effecting: reads prefs, computes tags, merges with the save's existing
// tags, and persists via setSaveTags (which also auto-creates tag rows).
export async function applyAutoTags(save: Save): Promise<void> {
  const prefs = await getPrefs();
  if (!prefs.autoTag?.enabled) return;
  const add = evaluateAutoTags(save, prefs.autoTag.rules ?? []);
  if (add.length === 0) return;
  const existing = new Set((save.tags ?? []).map((t) => t.toLowerCase()));
  const merged = [...(save.tags ?? [])];
  for (const t of add) if (!existing.has(t)) merged.push(t);
  if (merged.length === (save.tags ?? []).length) return;
  await setSaveTags(save.id, merged);
}
```

- [ ] **Step 2: Verify + commit**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`

```bash
git add apps/desktop/src/main/core/auto-tag.ts
git commit -m "feat(auto-tag): rule evaluation and application core"
```

---

## Task 3: Hook auto-tagging into finalize

**Files:**
- Modify: `apps/desktop/src/main/core/pipeline/workers/finalize.ts:76-86`

- [ ] **Step 1: Apply rules before marking complete**

In `runFinalize`, after `writeItemInfo(save)` and before the
`applySavePatch({ status: "complete" ... })` call, re-read the save (metadata
is now populated) and apply rules:

```ts
  const { applyAutoTags } = await import("../../auto-tag");
  const populated = await readSave(saveId);
  if (populated) await applyAutoTags(populated);
```

`readSave` is already imported in this file. `applyAutoTags` runs its own
`setSaveTags` transaction (separate sync action), which is fine: the renderer
receives both the tag update and the subsequent complete update.

- [ ] **Step 2: (If the manual-import plan is built) apply to manual saves**

In `apps/desktop/src/main/core/manual-import.ts`, after `writeItemInfo(finalRow)`:

```ts
  const { applyAutoTags } = await import("./auto-tag");
  if (finalRow) await applyAutoTags(finalRow);
```

- [ ] **Step 3: Verify**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`
Expected: PASS.

- [ ] **Step 4: Manual smoke (after Task 5 lands the UI; or seed a rule by hand)**

Temporarily seed a rule via the settings JSON or the UI: source `youtube` ->
add `video`. Save a YouTube URL. When it finalizes, the `video` tag appears on
the card and inspector. Save a Twitter URL and confirm it is untagged.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/main/core/pipeline/workers/finalize.ts apps/desktop/src/main/core/manual-import.ts
git commit -m "feat(auto-tag): apply rules at finalize and on manual import"
```

---

## Task 4: Register the settings section

**Files:**
- Modify: `packages/schema/src/settings.ts:10-23`
- Modify: `apps/desktop/src/renderer/src/components/settings/registry.tsx`

- [ ] **Step 1: Add to the section catalog**

In `SETTINGS_SECTIONS`, add (group with the saving-related sections):

```ts
  { id: "auto-tags", path: "auto-tags", label: "Auto Tags", group: "saving" },
```

- [ ] **Step 2: Map a renderer + icon**

In `registry.tsx` `RENDERER_BY_ID`, add (import a Lucide icon such as `Tag`):

```ts
  "auto-tags": {
    icon: Tag,
    load: lazyComponent(() => import("./sections/auto-tags"), "AutoTagsSection"),
  },
```

- [ ] **Step 3: Verify**

Run: `pnpm --filter @pond/schema typecheck && pnpm --filter @pond/desktop typecheck`
Expected: PASS. (The registry throws at module load if a section id has no
renderer, so this must be added before the next dev run.)

- [ ] **Step 4: Commit**

```bash
git add packages/schema/src/settings.ts apps/desktop/src/renderer/src/components/settings/registry.tsx
git commit -m "feat(settings): register the Auto Tags section"
```

---

## Task 5: Auto-tags settings UI

**Files:**
- Create: `apps/desktop/src/renderer/src/components/settings/sections/auto-tags/index.tsx`
- Create: `apps/desktop/src/renderer/src/components/settings/sections/auto-tags/styles.module.css`

- [ ] **Step 1: Write the section**

Mirror the General section's structure (`Settings.Page` / `Settings.Section` /
`Settings.Item`, `Switch.Root`, `Input.Field`) and read/write prefs with
`usePrefs("autoTag")`. Use `ulid` (already a dependency) for rule ids.

```tsx
import { ulid } from "ulid";
import type { AutoTagRule } from "@pond/schema/db";
import { usePrefs } from "@/pool/prefs";
import styles from "./styles.module.css";

export function AutoTagsSection() {
  const [autoTag, patch] = usePrefs("autoTag");

  const update = (rules: AutoTagRule[]) => patch({ rules });

  const addRule = () =>
    update([
      ...(autoTag.rules ?? []),
      {
        id: ulid(),
        enabled: true,
        source: null,
        urlContains: null,
        authorContains: null,
        titleContains: null,
        addTags: [],
      },
    ]);

  const editRule = (id: string, delta: Partial<AutoTagRule>) =>
    update((autoTag.rules ?? []).map((r) => (r.id === id ? { ...r, ...delta } : r)));

  const removeRule = (id: string) =>
    update((autoTag.rules ?? []).filter((r) => r.id !== id));

  return (
    <div className={styles.root}>
      <label className={styles["enable-row"]}>
        <input
          type="checkbox"
          checked={autoTag.enabled}
          onChange={(e) => patch({ enabled: e.target.checked })}
        />
        Apply auto-tag rules to new saves
      </label>

      <div className={styles.rules}>
        {(autoTag.rules ?? []).map((rule) => (
          <div key={rule.id} className={styles.rule}>
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={(e) => editRule(rule.id, { enabled: e.target.checked })}
            />
            <input
              placeholder="url contains"
              value={rule.urlContains ?? ""}
              onChange={(e) =>
                editRule(rule.id, { urlContains: e.target.value || null })
              }
            />
            <input
              placeholder="add tags (comma separated)"
              value={rule.addTags.join(", ")}
              onChange={(e) =>
                editRule(rule.id, {
                  addTags: e.target.value
                    .split(/[\s,]+/)
                    .map((t) => t.replace(/^#+/, "").toLowerCase())
                    .filter(Boolean),
                })
              }
            />
            <button type="button" onClick={() => removeRule(rule.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={addRule}>
        Add rule
      </button>
    </div>
  );
}
```

For a polished result, replace the raw inputs with the project's `Input.Field`,
`Switch.Root`, and a `Select` for `source` (options from `SOURCES`), matching
the downloads/general sections. The logic above is the contract.

- [ ] **Step 2: Write the stylesheet**

```css
.root { display: flex; flex-direction: column; gap: 16px; }
.enable-row { display: flex; gap: 8px; align-items: center; }
.rules { display: flex; flex-direction: column; gap: 8px; }
.rule {
  display: flex; gap: 8px; align-items: center;
  padding: 8px; border: 1px solid var(--stroke-tertiary); border-radius: 8px;
}
.rule input[type="text"], .rule input:not([type]) { flex: 1; min-width: 0; }
```

- [ ] **Step 3: Verify**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`
Expected: PASS.

- [ ] **Step 4: Manual smoke**

Run dev. Settings -> Auto Tags. Add a rule (url contains `youtube.com` -> tags
`video, watch`). Save a YouTube URL. After it finalizes, both tags appear.
Disable the master toggle, save another, confirm no auto tags applied. Toggle a
single rule off and confirm it stops matching.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/renderer/src/components/settings/sections/auto-tags
git commit -m "feat(settings): auto-tag rules editor"
```

---

## Self-Review Checklist

- [ ] Rules with no conditions never match (guard against tagging everything).
- [ ] Multiple matching rules union their tags; no duplicates.
- [ ] Master toggle and per-rule toggle both respected.
- [ ] Auto-tagging runs after metadata is populated (finalize), so
      source/author/title conditions actually have values.
- [ ] All typechecks and `pnpm lint:check` pass.
