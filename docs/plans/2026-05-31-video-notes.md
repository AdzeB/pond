# Timestamped Video Notes Implementation Plan

> **For agentic workers:** Use the `executing-plans` skill. Steps use checkbox
> (`- [ ]`) syntax. Read `2026-05-31-eagle-features-overview.md` first.

**Goal:** Let the user attach short notes to specific timestamps on a video
save, list them, and click one to seek the player there. Mirrors Eagle's video
notes and extends Pond's existing video player.

**Architecture:** Store notes in a new dedicated `video_notes` JSON column on
`saves` (not the flat `notes` field, which is free-text prose, and not
`rawJson`, which is capture metadata). Each entry is `{ id, timeSec, text }`.
Persist edits through the standard undoable `window.pond.tx` update path with
optimistic pool updates. In the player, read the current time from the
`videoRef` the `VideoPlayer` already forwards (`VideoPlayerProps.videoRef`), add
an "Add note at current time" control, and a notes list that seeks
`video.currentTime` on click.

**Tech Stack:** React 19, `@videojs/react`, better-sqlite3 + Drizzle,
`window.pond.tx`. No test runner: verify with
`pnpm --filter @pond/desktop typecheck`, `pnpm --filter @pond/schema typecheck`,
`pnpm lint:check`, manual smoke.

---

## File Structure

- Modify `packages/schema/src/db.ts`: add `videoNotes` column + `VideoNote` type.
- Modify `apps/desktop/src/main/db.ts`: boot migration for the column.
- Modify `apps/desktop/src/renderer/src/pool/types.ts` + `pool/reconcile.ts`: surface `videoNotes`.
- Create `apps/desktop/src/renderer/src/components/media/video-player/notes/index.tsx` + `styles.module.css`: the notes panel.
- Modify `apps/desktop/src/renderer/src/components/save/detail/index.tsx`: render the panel under the hero video and wire the `videoRef`.

---

## Task 1: Schema column

**Files:**
- Modify: `packages/schema/src/db.ts`
- Modify: `apps/desktop/src/main/db.ts`

- [ ] **Step 1: Add the type and column**

Above `Prefs` (or near `SaveFile`) in `packages/schema/src/db.ts`:

```ts
export interface VideoNote {
  id: string;
  timeSec: number;
  text: string;
}
```

In the `saves` table, after `phash` (or after `fileSize` if the dedup plan is
not built):

```ts
    videoNotes: text("video_notes", { mode: "json" })
      .$type<VideoNote[]>()
      .notNull()
      .default(sql`'[]'`),
```

- [ ] **Step 2: Boot migration**

In `apps/desktop/src/main/db.ts`, add and call:

```ts
function ensureSavesVideoNotesColumn(sqlite: Database.Database): void {
  const cols = sqlite
    .prepare<unknown[], { name: string }>("PRAGMA table_info(saves)")
    .all() as { name: string }[];
  if (!cols.some((c) => c.name === "video_notes")) {
    sqlite.exec("ALTER TABLE saves ADD COLUMN video_notes TEXT NOT NULL DEFAULT '[]'");
  }
}
```

- [ ] **Step 3: Surface in the renderer pool**

In `pool/types.ts` add `videoNotes: VideoNote[];` (import the type), and in
`pool/reconcile.ts` add `videoNotes: raw.videoNotes ?? [],`.

- [ ] **Step 4: Verify**

Run: `pnpm --filter @pond/schema typecheck && pnpm --filter @pond/desktop typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/schema/src/db.ts apps/desktop/src/main/db.ts apps/desktop/src/renderer/src/pool
git commit -m "feat(schema): add videoNotes column to saves"
```

---

## Task 2: Notes panel component

**Files:**
- Create: `apps/desktop/src/renderer/src/components/media/video-player/notes/index.tsx`
- Create: `.../notes/styles.module.css`

- [ ] **Step 1: Build the panel**

Receives the `save` and a `videoRef`. Reads time via the ref to add a note;
seeks via the ref on click. Persists via `window.pond.tx` with optimistic pool
updates (mirrors the notes-annotations plan's pattern).

```tsx
import { useCallback, useState } from "react";
import { ulid } from "ulid";
import type { Save } from "@/pool/types";
import type { VideoNote } from "@pond/schema/db";
import { pool } from "@/pool/pool";
import { optimistic } from "@/lib/optimistic";
import styles from "./styles.module.css";

export function VideoNotes({
  save,
  videoRef,
}: {
  save: Save;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
}) {
  const [draft, setDraft] = useState("");
  const notes = [...(save.videoNotes ?? [])].sort((a, b) => a.timeSec - b.timeSec);

  const persist = useCallback(
    async (next: VideoNote[]) => {
      const prev = pool.get(save.id);
      if (!prev) return;
      await optimistic(
        () => pool.upsert({ ...prev, videoNotes: next }),
        () => pool.upsert(prev),
        () =>
          window.pond.tx({
            kind: "update",
            model: "save",
            id: save.id,
            patch: { videoNotes: next },
            before: { videoNotes: save.videoNotes },
          }),
      );
    },
    [save.id, save.videoNotes],
  );

  const addAtCurrent = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    const timeSec = Math.floor(videoRef.current?.currentTime ?? 0);
    void persist([...(save.videoNotes ?? []), { id: ulid(), timeSec, text }]);
    setDraft("");
  }, [draft, persist, save.videoNotes, videoRef]);

  const remove = useCallback(
    (id: string) => persist((save.videoNotes ?? []).filter((n) => n.id !== id)),
    [persist, save.videoNotes],
  );

  const seek = useCallback(
    (timeSec: number) => {
      if (videoRef.current) videoRef.current.currentTime = timeSec;
    },
    [videoRef],
  );

  return (
    <div className={styles.root}>
      <div className={styles.add}>
        <input
          className={styles.input}
          placeholder="Note at current time"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addAtCurrent();
            }
          }}
        />
        <button type="button" onClick={addAtCurrent}>
          Add
        </button>
      </div>
      <ul className={styles.list}>
        {notes.map((n) => (
          <li key={n.id} className={styles.item}>
            <button type="button" className={styles.time} onClick={() => seek(n.timeSec)}>
              {formatTime(n.timeSec)}
            </button>
            <span className={styles.text}>{n.text}</span>
            <button type="button" className={styles.remove} onClick={() => remove(n.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
```

Confirm the optimistic helper import path: the preview pane uses `optimistic`;
match its actual module (`@/lib/optimistic` or wherever the pane imports it).

- [ ] **Step 2: Stylesheet**

```css
.root { display: flex; flex-direction: column; gap: 10px; padding: 12px 0; }
.add { display: flex; gap: 8px; }
.input { flex: 1; min-width: 0; }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.item { display: flex; gap: 8px; align-items: center; }
.time {
  font-variant-numeric: tabular-nums; color: var(--text-link);
  background: none; border: none; cursor: pointer; padding: 0;
}
.text { flex: 1; min-width: 0; }
.remove { color: var(--text-tertiary); background: none; border: none; cursor: pointer; }
```

- [ ] **Step 3: Verify + commit**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`

```bash
git add apps/desktop/src/renderer/src/components/media/video-player/notes
git commit -m "feat(video-notes): timestamped notes panel"
```

---

## Task 3: Wire the panel into the detail view

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/save/detail/index.tsx`

- [ ] **Step 1: Forward a `videoRef` and render the panel**

`HeroVideo` (`detail/index.tsx:121-137`) renders `VideoPlayer`, which accepts an
optional `videoRef` (`VideoPlayerProps.videoRef`). Create a ref in the detail
component, pass it to `VideoPlayer`, and render `VideoNotes` below the hero only
when the save has a video file:

```tsx
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasVideo = (save.files ?? []).some((f) => f.kind === "video");
```

Pass `videoRef={videoRef}` into the `<VideoPlayer .../>` inside `HeroVideo`
(thread the ref down as a prop), and after the hero:

```tsx
      {hasVideo ? <VideoNotes save={save} videoRef={videoRef} /> : null}
```

Import `useRef` and `VideoNotes`.

- [ ] **Step 2: Verify**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`
Expected: PASS.

- [ ] **Step 3: Manual smoke**

Run dev. Open a YouTube/video save in the detail view. Play a few seconds,
type a note, click Add: it appears with a timestamp. Seek elsewhere, click the
note's timestamp: the player jumps back. Add a second note earlier in the
video: the list sorts by time. Remove one. Press Cmd+Z: the removal is undone
(uses `window.pond.tx`). Relaunch and confirm notes persist.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/src/components/save/detail/index.tsx
git commit -m "feat(video-notes): show timestamped notes under the detail video"
```

---

## Self-Review Checklist

- [ ] Notes attach to the current playback time and seek on click.
- [ ] Add/remove persist, are undoable, and survive relaunch.
- [ ] Panel renders only for saves that have a video file.
- [ ] List is sorted by timestamp.
- [ ] All typechecks and `pnpm lint:check` pass.

## Notes / Follow-ups

- A future pass can render note markers on the `TimeSlider` track; that needs
  the player store to expose `duration`, which it does not narrow today.
