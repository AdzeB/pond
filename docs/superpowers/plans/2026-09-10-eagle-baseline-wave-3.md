# Eagle Baseline Wave 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not vendor Eagle source, templates, or SVG icons. Do not mix unrelated dirty-tree files into Wave 3 commits. Do not write rotate/flip into original files in this wave.

**Goal:** Ship Eagle’s remaining first-party viewer and convert operations: GIF loop range and GIF thumbnail, loadable subtitles, the image navigator, list columns, WebP-to-PNG/JPG convert, plus speed and volume steps.

**Architecture:** Main owns bytes (GIF frame PNG, subtitle files, conversion jobs). Renderer owns loop memory, navigator pose math, list-column prefs, and menus. GIF loop reuses `viewerMemory.loop` as inclusive frame indices on the GIF `pond://` src. Subtitles persist as `kind: "subtitle"` and play through HTML `<track>`. Navigator is a fit-pose minimap over `image-inspector` zoom/pan. List columns are localStorage, not gallery overlay Display Options. Convert WebP calls existing `conversion.start` with a PNG or JPEG preset. Originals stay untouched except subtitle files added beside the video and custom thumbnails replaced on the same Save.

**Tech Stack:** TypeScript, Electron `^42.4.0`, sharp, Pond UI menus, CSS Modules `data-*` states, Vitest, existing `query()` + `query-contracts.ts` pairs, `viewerMemory`, `conversion.start`.

---

## Scope

| Operation | Eagle key | Pond label |
| --- | --- | --- |
| GIF loop range | GIF viewer + `Reset Loop Range` | Set Loop Start, Set Loop End, Reset Loop Range |
| GIF thumbnail | `Set as GIF Thumbnail` | Set as GIF Thumbnail |
| GIF / video speed | `speedUp` / `speedDown` | Speed Up, Slow Down |
| Volume ±5% | `volumeIncrease` / `volumeDecrease` | Volume Up, Volume Down |
| Load subtitles | video `Load Subtitles` | Load Subtitles |
| Navigator | `showNavigator` | Show Navigator |
| List columns | `openListPropContextMenu` | Tags, Dimensions, Rating, Extension, File Size, Date Added, Annotation |
| Convert WebP | Convert to PNG / JPG | Convert to PNG, Convert to JPG |

**Out of Wave 3:** plugins, Plugin Center, write-to-file rotate/flip, Collect, fonts/RAW/Office, Find Duplicates on empty gallery, `scrollPageUp` / `scrollPageDown`, Eagle Cloud, Pond cloud copy.

**Protect:** harvest, Sources, Agent, rebuildable index.

**UI rules:** Title Case. No ellipsis in chrome (`Load Subtitles`, not `Load Subtitles…`). No em dashes in user-facing copy. Bare `—` is allowed as an empty list-column value. Pond nouns: Library, Save, Folder.

Wave 2 already shipped Combine Images, Replace File, Pin to Top, folder cover, Share, and Thumbnail Background. This wave must not regress those labels in `eagle-baseline-menu.test.ts`.

---

## Working-tree commit policy

The live working copy is far ahead of HEAD (gallery query rewrite, prefs, menu accelerator rewrite, harvest). Implement against the live tree so `pnpm dev` stays current. Commit only Wave 3 hunks.

Never `git add -p`, `git add -i`, `git checkout .`, or `git restore .`.

For a **mixed tracked file** (Wave 3 plus unrelated dirty edits):

1. Copy the live file aside (`cp path path.wave3bak`).
2. `git checkout HEAD -- path` to get HEAD.
3. Re-apply **only** the Wave 3 edits from this plan onto HEAD.
4. `git add` that file plus any new Wave 3 files.
5. Commit.
6. Restore the backup (`mv path.wave3bak path`) and re-apply the Wave 3 edits onto the restored dirty file so `pnpm dev` still has them.

Untracked rewrite files stay untracked: `apps/desktop/src/main/core/library-query.ts`, `apps/desktop/src/renderer/src/features/settings/lib/config-viewer.tsx`, tmp Eagle PNGs, harvest-only edits.

Navigator and list columns use localStorage (like Display Options), not `ViewerPrefsSchema`, so this wave does not need to commit the untracked prefs rewrite.

---

## Files this wave owns

- Create: `apps/desktop/src/renderer/src/features/saves/lib/gif-loop.ts`
- Create: `apps/desktop/src/renderer/src/features/saves/lib/gif-loop.test.ts`
- Create: `apps/desktop/src/main/core/gif-thumbnail.ts`
- Create: `apps/desktop/src/main/core/gif-thumbnail.test.ts`
- Create: `apps/desktop/src/main/core/subtitles.ts`
- Create: `apps/desktop/src/main/core/subtitles.test.ts`
- Create: `apps/desktop/src/renderer/src/features/saves/components/viewers/image-inspector/navigator/index.tsx`
- Create: `apps/desktop/src/renderer/src/features/saves/components/viewers/image-inspector/navigator/styles.module.css`
- Create: `apps/desktop/src/renderer/src/features/saves/components/viewers/image-inspector/navigator/navigator.test.ts`
- Create: `apps/desktop/src/renderer/src/features/library/state/list-columns.ts`
- Create: `apps/desktop/src/renderer/src/features/library/state/list-columns.test.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/hooks/use-gif-player.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/viewer-memory.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/viewer-memory.test.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/components/viewers/image-inspector/image-inspector.tsx`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/menu.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/components/viewers/media-viewer/lib/menu.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/menu.test.ts`
- Modify: `apps/desktop/src/main/ipc/queries/saves-import.ts`
- Modify: `apps/desktop/src/shared/query-contracts.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/components/video-player/video-player.tsx`
- Modify: `apps/desktop/src/shared/shortcuts.ts`
- Modify: `apps/desktop/src/shared/constants.ts`
- Modify: `apps/desktop/src/main/menu.ts`
- Modify: `apps/desktop/src/renderer/src/app/effects/menu-bridge.tsx`
- Modify: `apps/desktop/src/renderer/src/features/saves/state/inspect.ts`
- Modify: `packages/ui/src/video/lib.ts`
- Modify: `packages/ui/src/index.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/components/card/views/list/list.tsx`
- Modify: `apps/desktop/src/renderer/src/features/saves/components/card/views/list/list.module.css`
- Modify: `apps/desktop/src/renderer/src/features/library/components/view-menu/display/display.tsx`

Do not commit unrelated dirty files.

---

### Task 1: GIF loop range

**Files:**
- Create: `apps/desktop/src/renderer/src/features/saves/lib/gif-loop.ts`
- Create: `apps/desktop/src/renderer/src/features/saves/lib/gif-loop.test.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/viewer-memory.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/viewer-memory.test.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/hooks/use-gif-player.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/components/viewers/image-inspector/image-inspector.tsx`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/menu.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts`

Loop range is inclusive frame indices persisted per GIF src in `viewerMemory.loop`. Playback wraps inside that range. Original GIF bytes stay untouched.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { gifLoopRange, nextGifFrame } from "./gif-loop";

describe("gifLoopRange", () => {
  it("orders start and end so playback can wrap", () => {
    expect(gifLoopRange(3, 8)).toEqual([3, 8]);
    expect(gifLoopRange(8, 3)).toEqual([3, 8]);
    expect(gifLoopRange(0, 0)).toEqual([0, 0]);
  });
});

describe("nextGifFrame", () => {
  it("wraps through the full GIF when no loop is set", () => {
    expect(nextGifFrame(0, 4, null)).toBe(1);
    expect(nextGifFrame(3, 4, null)).toBe(0);
  });

  it("wraps inside an inclusive loop range", () => {
    expect(nextGifFrame(2, 10, [2, 5])).toBe(3);
    expect(nextGifFrame(5, 10, [2, 5])).toBe(2);
    expect(nextGifFrame(0, 10, [2, 5])).toBe(3);
  });

  it("holds a single-frame loop", () => {
    expect(nextGifFrame(4, 10, [4, 4])).toBe(4);
  });
});
```

Add this assertion to `viewer-memory.test.ts` inside `"retains independent image poses and playback positions"` (or a new it):

```ts
it("stores a single-frame GIF loop at frame zero", () => {
  viewerMemory.setLoop("pond://gif/loop.gif", [0, 0]);
  expect(viewerMemory.loop("pond://gif/loop.gif")).toEqual([0, 0]);
});
```

Add this to `eagle-baseline-menu.test.ts`:

```ts
function gifSave(): Save {
  return {
    ...fileSave(),
    id: "gif-save",
    sourceId: "gif-save",
    mediaType: "image",
    files: [
      {
        kind: "image",
        path: "loop.gif",
        mimeType: "image/gif",
        sha256: "gif",
        size: 1,
      },
    ],
  };
}

it("exposes Reset Loop Range on an opened GIF", () => {
  const items = buildSaveMenu(gifSave(), {
    clipboardEmpty: true,
    opened: true,
  });
  expect(labels(items)).toContain("Reset Loop Range");
});

it("hides Reset Loop Range on a still image", () => {
  const items = buildSaveMenu(imageSave("still"), {
    clipboardEmpty: true,
    opened: true,
  });
  expect(labels(items)).not.toContain("Reset Loop Range");
});
```

- [ ] **Step 2: Run tests to verify they fail**

```sh
pnpm --filter @pond/desktop exec vitest run src/renderer/src/features/saves/lib/gif-loop.test.ts src/renderer/src/features/saves/lib/viewer-memory.test.ts src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
```

Expected: FAIL. `gif-loop.ts` is missing. `viewerMemory.setLoop("pond://gif/loop.gif", [0, 0])` does not round-trip because the schema still requires a positive end. Menu test fails because `Reset Loop Range` is missing.

- [ ] **Step 3: Write the loop helper and persist schema**

`gif-loop.ts`:

```ts
export function gifLoopRange(start: number, end: number): [number, number] {
  const a = Math.max(0, Math.floor(start));
  const b = Math.max(0, Math.floor(end));
  return a <= b ? [a, b] : [b, a];
}

export function clampGifFrame(
  index: number,
  count: number,
  loop: [number, number] | null,
): number {
  if (count <= 0) return 0;
  const [rawStart, rawEnd] = loop ?? [0, count - 1];
  const start = Math.max(0, Math.min(rawStart, count - 1));
  const end = Math.max(start, Math.min(rawEnd, count - 1));
  return Math.max(start, Math.min(index, end));
}

export function nextGifFrame(
  index: number,
  count: number,
  loop: [number, number] | null,
): number {
  if (count <= 0) return 0;
  const current = clampGifFrame(index, count, loop);
  const [rawStart, rawEnd] = loop ?? [0, count - 1];
  const start = Math.max(0, Math.min(rawStart, count - 1));
  const end = Math.max(start, Math.min(rawEnd, count - 1));
  return current >= end ? start : current + 1;
}
```

In `viewer-memory.ts` change the loop tuple to allow frame `0`:

```ts
  loop: z
    .tuple([z.number().nonnegative(), z.number().nonnegative()])
    .nullable()
    .optional(),
```

- [ ] **Step 4: Wire the GIF player and inspector chrome**

In `use-gif-player.ts`, restore loop from `viewerMemory.loop(src)` and wrap the timeout increment with `nextGifFrame`. Export `loop`, `setLoopStart`, `setLoopEnd`, and `resetLoop`. Seek must `clampGifFrame`. Persist on change with `viewerMemory.setLoop(src, range)`.

Replace the increment:

```ts
() => setFrameIndex((index) => nextGifFrame(index, frameCount, loop)),
```

Add to the returned object:

```ts
    loop,
    setLoopStart: () => {
      const range = gifLoopRange(frameIndex, loop?.[1] ?? frameIndex);
      setLoop(range);
      viewerMemory.setLoop(src, range);
    },
    setLoopEnd: () => {
      const range = gifLoopRange(loop?.[0] ?? frameIndex, frameIndex);
      setLoop(range);
      viewerMemory.setLoop(src, range);
    },
    resetLoop: () => {
      setLoop(null);
      viewerMemory.setLoop(src, null);
    },
```

Import `viewerMemory` from `@/features/saves/lib/viewer-memory` and the helpers from `@/features/saves/lib/gif-loop`.

In `image-inspector.tsx` GIF toolbar (the `data-playback` ChromePortal), after Next Frame, add three `Tool` buttons:

```tsx
                <Tool
                  label="Set Loop Start"
                  onClick={gif.setLoopStart}
                >
                  <IconMediaFastBackwardsOutline18 />
                </Tool>
                <Tool
                  label="Set Loop End"
                  onClick={gif.setLoopEnd}
                >
                  <IconMediaFastForwardOutline18 />
                </Tool>
                <Tool
                  label="Reset Loop Range"
                  disabled={!gif.loop}
                  onClick={gif.resetLoop}
                >
                  <IconAnimationRepeatOutline18 />
                </Tool>
```

Import `IconAnimationRepeatOutline18` from `@pond/icons/outline/18`. Previous/Next Frame `disabled` must use the loop bounds via `clampGifFrame` / `gif.loop`, not only `0` and `frameCount - 1`.

Put `data-frame={gif.frameIndex}` on the GIF `<canvas>` so later tasks can read the current frame from the DOM.

- [ ] **Step 5: Add Reset Loop Range to the Save menu**

Near other viewer-only rows in `buildSaveMenu`, using the same `file` already resolved for the target save:

```ts
  const isGif =
    !batch &&
    (targetFile?.mimeType === "image/gif" ||
      /\.gif(?:$|[?#])/i.test(targetFile?.path ?? ""));
```

`targetFile` is the file `buildSaveMenu` already uses for `deriveTypeKind`. If the local name is `file` or from `resolveFileIndex`, match that name.

Add this item to `moreItems` (or beside other inspect rows), hidden unless the GIF is open:

```ts
    {
      label: "Reset Loop Range",
      hidden: !opened || !isGif,
      onClick: () => {
        const file = save.files[fileIndex ?? 0] ?? save.files[0];
        if (!file) return;
        const src = `pond://${save.id}/${file.path}`;
        viewerMemory.setLoop(src, null);
      },
    },
```

Import `viewerMemory`. Do not add ellipsis.

- [ ] **Step 6: Run tests to verify they pass**

```sh
pnpm --filter @pond/desktop exec vitest run src/renderer/src/features/saves/lib/gif-loop.test.ts src/renderer/src/features/saves/lib/viewer-memory.test.ts src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

Follow the working-tree commit policy for mixed `menu.ts` / `image-inspector.tsx` / `viewer-memory.ts`. New files can be added directly.

```sh
git add apps/desktop/src/renderer/src/features/saves/lib/gif-loop.ts \
  apps/desktop/src/renderer/src/features/saves/lib/gif-loop.test.ts \
  apps/desktop/src/renderer/src/features/saves/lib/viewer-memory.ts \
  apps/desktop/src/renderer/src/features/saves/lib/viewer-memory.test.ts \
  apps/desktop/src/renderer/src/features/saves/hooks/use-gif-player.ts \
  apps/desktop/src/renderer/src/features/saves/components/viewers/image-inspector/image-inspector.tsx \
  apps/desktop/src/renderer/src/features/saves/lib/menu.ts \
  apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
git commit -m "$(cat <<'EOF'
feat: loop GIFs between chosen start and end frames

EOF
)"
```

---

### Task 2: Set as GIF Thumbnail

**Files:**
- Create: `apps/desktop/src/main/core/gif-thumbnail.ts`
- Create: `apps/desktop/src/main/core/gif-thumbnail.test.ts`
- Modify: `apps/desktop/src/main/ipc/queries/saves-import.ts`
- Modify: `apps/desktop/src/shared/query-contracts.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/menu.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts`

The current GIF frame becomes `kind: "custom_thumbnail"` on the same Save. Original GIF bytes stay. Same persist path as `saves.setCustomThumbnail`.

- [ ] **Step 1: Write the failing tests**

```ts
import { expect, it } from "vitest";
import sharp from "sharp";
import { gifFramePng } from "./gif-thumbnail";

it("exports the requested GIF frame as PNG without changing source bytes", async () => {
  const pixels = Buffer.from([
    ...Array.from({ length: 4 }, () => [255, 0, 0]).flat(),
    ...Array.from({ length: 4 }, () => [0, 0, 255]).flat(),
  ]);
  const gif = await sharp(pixels, {
    raw: { width: 2, height: 4, channels: 3, pageHeight: 2 },
  })
    .gif({ delay: [100, 200] })
    .toBuffer();
  const original = Buffer.from(gif);
  const png = await gifFramePng(gif, 1);
  const output = await sharp(png).removeAlpha().raw().toBuffer();
  expect([...output.subarray(0, 3)]).toEqual([0, 0, 255]);
  expect(gif).toEqual(original);
});
```

Menu test:

```ts
it("exposes Set as GIF Thumbnail on an opened GIF", () => {
  const items = buildSaveMenu(gifSave(), {
    clipboardEmpty: true,
    opened: true,
  });
  expect(labels(items)).toContain("Set as GIF Thumbnail");
});

it("hides Set as GIF Thumbnail in the gallery", () => {
  expect(
    labels(buildSaveMenu(gifSave(), { clipboardEmpty: true })),
  ).not.toContain("Set as GIF Thumbnail");
});
```

Reuse `gifSave()` from Task 1.

- [ ] **Step 2: Run tests to verify they fail**

```sh
pnpm --filter @pond/desktop exec vitest run src/main/core/gif-thumbnail.test.ts src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
```

Expected: FAIL. Module missing. Menu label missing.

- [ ] **Step 3: Implement frame export**

`gif-thumbnail.ts`:

```ts
import sharp from "sharp";

export async function gifFramePng(
  source: string | Buffer,
  frameIndex: number,
): Promise<Buffer> {
  const page = Math.max(0, Math.floor(frameIndex));
  return sharp(source, { pages: 1, page }).png().toBuffer();
}
```

- [ ] **Step 4: Add the query contract and handler**

In `query-contracts.ts` `SaveQueryInputs`:

```ts
  "saves.setGifThumbnail": {
    id: string;
    src: string;
    frameIndex: number;
  };
```

In `SaveQueryResults`:

```ts
  "saves.setGifThumbnail": OkResult & { error?: string };
```

Place them next to `"saves.setCustomThumbnail"`.

In `saves-import.ts`, next to `"saves.setCustomThumbnail"`:

```ts
  "saves.setGifThumbnail": query(
    z.object({
      id: StringParam,
      src: StringParam,
      frameIndex: z.number().int().min(0),
    }),
    async (params) => {
      const resolved = resolvePondItemPath(params.src);
      if (
        !resolved ||
        resolved.saveId.toLowerCase() !== params.id.toLowerCase()
      ) {
        return { ok: false, error: "missing_file" };
      }
      const png = await gifFramePng(resolved.path, params.frameIndex);
      const updated = await persistSave(
        params.id,
        {},
        {
          actorReason: "user:set-gif-thumbnail",
          replaceFilesWithKind: "custom_thumbnail",
          newFiles: [
            {
              kind: "custom_thumbnail",
              filename: "gif-thumb.png",
              mimeType: "image/png",
              bytes: png,
            },
          ],
        },
      );
      return { ok: Boolean(updated) };
    },
  ),
```

Import `gifFramePng` from `../../core/gif-thumbnail` and `resolvePondItemPath` from `../helpers` (already used by `video.ts`; `saves-import.ts` currently imports `resolveSaveFilePath`. Use `resolvePondItemPath` like `video.setThumbnail` so the renderer can pass the same `pond://` src the inspector already has).

If `resolvePondItemPath` is not exported from `helpers`, use the same helper `video.ts` uses: `import { resolvePondItemPath } from "../helpers";`.

- [ ] **Step 5: Add the menu row**

In `buildSaveMenu`, beside Reset Loop Range:

```ts
    {
      label: "Set as GIF Thumbnail",
      hidden: !opened || !isGif,
      onClick: () => {
        const file = save.files[fileIndex ?? 0] ?? save.files[0];
        if (!file) return;
        const src = `pond://${save.id}/${file.path}`;
        const canvas = document.querySelector<HTMLCanvasElement>(
          `[data-gif-player] canvas[data-frame]`,
        );
        const frameIndex = Number(canvas?.getAttribute("data-frame") ?? 0);
        void window.pond
          .query("saves.setGifThumbnail", {
            id: save.id,
            src,
            frameIndex: Number.isFinite(frameIndex) ? frameIndex : 0,
          })
          .then((result) => {
            if (!result.ok)
              notify({
                id: "gif-thumb",
                title: "Couldn't set this GIF frame as the thumbnail.",
              });
          });
      },
    },
```

- [ ] **Step 6: Run tests**

```sh
pnpm --filter @pond/desktop exec vitest run src/main/core/gif-thumbnail.test.ts src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```sh
git add apps/desktop/src/main/core/gif-thumbnail.ts \
  apps/desktop/src/main/core/gif-thumbnail.test.ts \
  apps/desktop/src/main/ipc/queries/saves-import.ts \
  apps/desktop/src/shared/query-contracts.ts \
  apps/desktop/src/renderer/src/features/saves/lib/menu.ts \
  apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
git commit -m "$(cat <<'EOF'
feat: set a GIF's custom thumbnail from the current frame

EOF
)"
```

---

### Task 3: Speed Up, Slow Down, and volume ±5%

**Files:**
- Modify: `packages/ui/src/video/lib.ts`
- Create: `packages/ui/src/video/lib.test.ts`
- Modify: `packages/ui/src/index.ts`
- Modify: `apps/desktop/src/shared/shortcuts.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/hooks/use-gif-player.ts` (rate already exists)
- Modify: `apps/desktop/src/renderer/src/features/saves/components/viewers/image-inspector/image-inspector.tsx`
- Modify: `apps/desktop/src/renderer/src/features/saves/components/video-player/video-player.tsx`

Video already has a speed picker and a mute control. This task adds Eagle’s stepped shortcuts. GIF `rate` already divides frame delay in `use-gif-player.ts` but has no UI.

- [ ] **Step 1: Write the failing tests**

`packages/ui/src/video/lib.test.ts`:

```ts
import { expect, it } from "vitest";
import { stepPlaybackRate, stepVolume } from "./lib";

it("steps through SPEED_OPTIONS without leaving the ladder", () => {
  expect(stepPlaybackRate(1, 1)).toBe(1.25);
  expect(stepPlaybackRate(1, -1)).toBe(0.75);
  expect(stepPlaybackRate(8, 1)).toBe(8);
  expect(stepPlaybackRate(0.25, -1)).toBe(0.25);
  expect(stepPlaybackRate(1.1, 1)).toBe(1.25);
  expect(stepPlaybackRate(1.1, -1)).toBe(1);
});

it("nudges volume by five percent and clamps", () => {
  expect(stepVolume(0.5, 0.05)).toBe(0.55);
  expect(stepVolume(0.98, 0.05)).toBe(1);
  expect(stepVolume(0.02, -0.05)).toBe(0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

```sh
pnpm --filter @pond/ui exec vitest run src/video/lib.test.ts
```

If `@pond/ui` has no vitest script, run from repo root:

```sh
pnpm exec vitest run packages/ui/src/video/lib.test.ts
```

Expected: FAIL. `stepPlaybackRate` / `stepVolume` missing.

- [ ] **Step 3: Implement the steppers and export them**

Append to `packages/ui/src/video/lib.ts`:

```ts
export function stepPlaybackRate(rate: number, direction: 1 | -1): number {
  const exact = SPEED_OPTIONS.indexOf(
    rate as (typeof SPEED_OPTIONS)[number],
  );
  if (exact >= 0) {
    return SPEED_OPTIONS[
      Math.max(0, Math.min(SPEED_OPTIONS.length - 1, exact + direction))
    ]!;
  }
  if (direction > 0) {
    return SPEED_OPTIONS.find((value) => value > rate) ?? SPEED_OPTIONS.at(-1)!;
  }
  const lower = [...SPEED_OPTIONS].reverse().find((value) => value < rate);
  return lower ?? SPEED_OPTIONS[0]!;
}

export function stepVolume(volume: number, delta = 0.05): number {
  return clamp(Math.round((volume + delta) * 20) / 20, 0, 1);
}
```

In `packages/ui/src/index.ts`, next to the Video export:

```ts
export {
  SPEED_OPTIONS,
  stepPlaybackRate,
  stepVolume,
} from "./video/lib";
```

- [ ] **Step 4: Add shortcuts**

In `apps/desktop/src/shared/shortcuts.ts`, after `"viewer.seek-forward"`:

```ts
  "viewer.speed-up": {
    keys: ".",
    label: "Speed Up",
    group: "Viewer",
  },
  "viewer.speed-down": {
    keys: ",",
    label: "Slow Down",
    group: "Viewer",
  },
  "viewer.volume-up": {
    keys: "Shift+ArrowUp",
    label: "Volume Up",
    group: "Viewer",
  },
  "viewer.volume-down": {
    keys: "Shift+ArrowDown",
    label: "Volume Down",
    group: "Viewer",
  },
```

- [ ] **Step 5: Wire GIF and video hotkeys**

In `image-inspector.tsx` next to the other GIF `useHotkey` calls:

```ts
  useHotkey(
    shortcuts["viewer.speed-up"].keys!,
    () => gif.setRate(stepPlaybackRate(gif.rate, 1)),
    gifHotkeys,
  );
  useHotkey(
    shortcuts["viewer.speed-down"].keys!,
    () => gif.setRate(stepPlaybackRate(gif.rate, -1)),
    gifHotkeys,
  );
```

Import `{ stepPlaybackRate } from "@pond/ui"`.

In the GIF toolbar, after the frame counter, show the current rate as a `Tool` that cycles up:

```tsx
                <Tool
                  label="Speed Up"
                  shortcut={<ShortcutKeys id="viewer.speed-up" />}
                  onClick={() => gif.setRate(stepPlaybackRate(gif.rate, 1))}
                >
                  {`${gif.rate}×`}
                </Tool>
```

Do not put `{`${gif.rate}×`}` in a Pond `Button` as the icon child if `Tool` already wraps `Button`; `Tool` children are the icon slot. If that looks wrong, render the rate in the existing `<span className={styles.scale}>` as `{gif.frameIndex + 1} / {gif.frameCount} · {gif.rate}×`.

In `video-player.tsx` `MediaBridge`, after the existing playback effects, add:

```ts
  const videoHotkeys = { enabled: active, ignoreInputs: true };
  useHotkey(
    shortcuts["viewer.speed-up"].keys!,
    () => actions.setRate(stepPlaybackRate(rate, 1)),
    videoHotkeys,
  );
  useHotkey(
    shortcuts["viewer.speed-down"].keys!,
    () => actions.setRate(stepPlaybackRate(rate, -1)),
    videoHotkeys,
  );
  useHotkey(
    shortcuts["viewer.volume-up"].keys!,
    () => actions.setVolume(stepVolume(state.volume, 0.05)),
    videoHotkeys,
  );
  useHotkey(
    shortcuts["viewer.volume-down"].keys!,
    () => actions.setVolume(stepVolume(state.volume, -0.05)),
    videoHotkeys,
  );
```

`MediaBridge` already destructures `{ seek, seekBy, play, pause }` from `actions` and `{ currentTime, playing, duration, rate }` from `state`. Add `state.volume` and keep `actions` for `setRate` / `setVolume`. Import `stepPlaybackRate`, `stepVolume` from `@pond/ui`. Import `useShortcutBindings` is already there. Import `useHotkey` is already there.

- [ ] **Step 6: Run tests**

```sh
pnpm exec vitest run packages/ui/src/video/lib.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```sh
git add packages/ui/src/video/lib.ts \
  packages/ui/src/video/lib.test.ts \
  packages/ui/src/index.ts \
  apps/desktop/src/shared/shortcuts.ts \
  apps/desktop/src/renderer/src/features/saves/components/viewers/image-inspector/image-inspector.tsx \
  apps/desktop/src/renderer/src/features/saves/components/video-player/video-player.tsx
git commit -m "$(cat <<'EOF'
feat: step viewer playback speed and volume from the keyboard

EOF
)"
```

---

### Task 4: Load Subtitles

**Files:**
- Create: `apps/desktop/src/main/core/subtitles.ts`
- Create: `apps/desktop/src/main/core/subtitles.test.ts`
- Modify: `apps/desktop/src/main/ipc/queries/saves-import.ts`
- Modify: `apps/desktop/src/shared/query-contracts.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/menu.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/components/video-player/video-player.tsx`

Harvest already stores sidecar files as `kind: "subtitle"`. This task lets the user pick `.srt` / `.vtt`, converts SRT to VTT, persists beside the video, and attaches `<track kind="subtitles">`. Original video bytes stay.

- [ ] **Step 1: Write the failing tests**

```ts
import { expect, it } from "vitest";
import { srtToVtt } from "./subtitles";

it("writes a WEBVTT file with dot milliseconds", () => {
  const srt = `1
00:00:01,000 --> 00:00:02,500
Hello

2
00:00:03,000 --> 00:00:04,000
There
`;
  const vtt = srtToVtt(srt);
  expect(vtt.startsWith("WEBVTT\n\n")).toBe(true);
  expect(vtt).toContain("00:00:01.000 --> 00:00:02.500");
  expect(vtt).not.toContain("00:00:01,000");
});

it("leaves an existing VTT file alone", () => {
  const vtt = "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi\n";
  expect(srtToVtt(vtt)).toBe(vtt);
});
```

Menu tests. Add `videoSave()` if missing:

```ts
function videoSave(): Save {
  return {
    ...fileSave(),
    id: "video-save",
    sourceId: "video-save",
    mediaType: "video",
    files: [
      {
        kind: "video",
        path: "clip.mp4",
        mimeType: "video/mp4",
        sha256: "vid",
        size: 1,
      },
    ],
  };
}

it("exposes Load Subtitles on a video save", () => {
  expect(
    labels(buildSaveMenu(videoSave(), { clipboardEmpty: true })),
  ).toContain("Load Subtitles");
});

it("hides Load Subtitles on a still image", () => {
  expect(
    labels(buildSaveMenu(imageSave("still"), { clipboardEmpty: true })),
  ).not.toContain("Load Subtitles");
});
```

- [ ] **Step 2: Run tests to verify they fail**

```sh
pnpm --filter @pond/desktop exec vitest run src/main/core/subtitles.test.ts src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement SRT conversion**

`subtitles.ts`:

```ts
export function srtToVtt(input: string): string {
  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (normalized.startsWith("WEBVTT")) return normalized;
  const body = normalized.replace(
    /(\d{2}:\d{2}:\d{2}),(\d{3})/g,
    "$1.$2",
  );
  return `WEBVTT\n\n${body.trim()}\n`;
}
```

- [ ] **Step 4: Add the query**

`SaveQueryInputs`:

```ts
  "saves.loadSubtitles": IdInput;
```

`SaveQueryResults`:

```ts
  "saves.loadSubtitles": OkResult & { canceled?: boolean; error?: string };
```

Handler in `saves-import.ts`:

```ts
  "saves.loadSubtitles": query(z.object({ id: StringParam }), async (params) => {
    const win = BrowserWindow.getFocusedWindow() ?? undefined;
    const options = {
      properties: ["openFile" as const],
      message: "Choose a subtitle file",
      filters: [{ name: "Subtitles", extensions: ["vtt", "srt"] }],
    };
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options);
    const path = result.filePaths[0];
    if (result.canceled || !path) return { ok: false, canceled: true };
    const raw = await readFile(path, "utf8");
    const vtt = srtToVtt(raw);
    const updated = await persistSave(
      params.id,
      {},
      {
        actorReason: "user:load-subtitles",
        replaceFilesWithKind: "subtitle",
        newFiles: [
          {
            kind: "subtitle",
            filename: "subtitles.vtt",
            mimeType: "text/vtt",
            bytes: Buffer.from(vtt, "utf8"),
          },
        ],
      },
    );
    return { ok: Boolean(updated) };
  }),
```

`readFile` is already imported in `saves-import.ts`. Import `srtToVtt` from `../../core/subtitles`. Dialog copy has no ellipsis.

- [ ] **Step 5: Menu row and video track**

In `buildSaveMenu`, `isVideo` already exists (`deriveTypeKind(...) === "video"`). Add:

```ts
    {
      label: "Load Subtitles",
      hidden: !isVideo,
      onClick: () => {
        void window.pond
          .query("saves.loadSubtitles", { id: save.id })
          .then((result) => {
            if (!result.ok && !result.canceled)
              notify({
                id: "subtitles",
                title: "Couldn't load subtitles.",
              });
          });
      },
    },
```

Put it in `moreItems` or next to other video rows. Hidden on batch because `isVideo` is already `!batch && ...`.

In `video-player.tsx`, `useSave(saveId)` already loads the Save. After `trackUrl` for chapters:

```ts
  const subtitle = save?.files.find((file) => file.kind === "subtitle");
  const subtitleUrl =
    save && subtitle ? buildPondUrl(save.id, subtitle) : null;
```

Inside `<Video.Media>` next to the chapters track:

```tsx
        {subtitleUrl ? (
          <track
            kind="subtitles"
            src={subtitleUrl}
            default
            label="Subtitles"
          />
        ) : null}
```

Import `buildPondUrl` from `@/features/saves/lib/media/url`.

- [ ] **Step 6: Run tests**

```sh
pnpm --filter @pond/desktop exec vitest run src/main/core/subtitles.test.ts src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```sh
git add apps/desktop/src/main/core/subtitles.ts \
  apps/desktop/src/main/core/subtitles.test.ts \
  apps/desktop/src/main/ipc/queries/saves-import.ts \
  apps/desktop/src/shared/query-contracts.ts \
  apps/desktop/src/renderer/src/features/saves/lib/menu.ts \
  apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts \
  apps/desktop/src/renderer/src/features/saves/components/video-player/video-player.tsx
git commit -m "$(cat <<'EOF'
feat: load SRT or VTT subtitles onto a video Save

EOF
)"
```

---

### Task 5: Show Navigator

**Files:**
- Create: `apps/desktop/src/renderer/src/features/saves/components/viewers/image-inspector/navigator/navigator-geometry.ts`
- Create: `apps/desktop/src/renderer/src/features/saves/components/viewers/image-inspector/navigator/navigator.test.ts`
- Create: `apps/desktop/src/renderer/src/features/saves/components/viewers/image-inspector/navigator/index.tsx`
- Create: `apps/desktop/src/renderer/src/features/saves/components/viewers/image-inspector/navigator/styles.module.css`
- Modify: `apps/desktop/src/renderer/src/features/saves/components/viewers/image-inspector/image-inspector.tsx`
- Modify: `apps/desktop/src/renderer/src/features/saves/state/inspect.ts`
- Modify: `apps/desktop/src/shared/constants.ts`
- Modify: `apps/desktop/src/main/menu.ts`
- Modify: `apps/desktop/src/renderer/src/app/effects/menu-bridge.tsx`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/menu.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts`

Navigator is a minimap of the inspector image. Clicking it recenters the pose. Pref lives on `inspect` + `localStorage`, not `ViewerPrefsSchema`.

- [ ] **Step 1: Write the failing tests**

`navigator.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { FIT_POSE } from "@/features/saves/lib/viewer-memory";
import {
  poseFromNavigatorPoint,
  viewportFraction,
} from "./navigator-geometry";

const stage = { width: 800, height: 600 };

describe("viewportFraction", () => {
  it("covers the full image at fit", () => {
    expect(viewportFraction(FIT_POSE, stage)).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });

  it("shrinks the viewport when zoomed in", () => {
    const box = viewportFraction({ zoom: 2, x: 0, y: 0 }, stage);
    expect(box.width).toBeCloseTo(0.5);
    expect(box.height).toBeCloseTo(0.5);
    expect(box.x).toBeCloseTo(0.25);
    expect(box.y).toBeCloseTo(0.25);
  });
});

describe("poseFromNavigatorPoint", () => {
  it("recenters the zoomed pose on the clicked point", () => {
    const pose = poseFromNavigatorPoint(0.75, 0.25, 2, stage);
    const box = viewportFraction(pose, stage);
    expect(box.x + box.width / 2).toBeCloseTo(0.75);
    expect(box.y + box.height / 2).toBeCloseTo(0.25);
  });
});
```

Menu test:

```ts
it("exposes Show Navigator on an opened image", () => {
  expect(
    labels(
      buildSaveMenu(imageSave("still"), {
        clipboardEmpty: true,
        opened: true,
      }),
    ),
  ).toContain("Show Navigator");
});
```

- [ ] **Step 2: Run tests to verify they fail**

```sh
pnpm --filter @pond/desktop exec vitest run src/renderer/src/features/saves/components/viewers/image-inspector/navigator/navigator.test.ts src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Geometry**

`navigator-geometry.ts`:

```ts
import type { ImagePose } from "@/features/saves/lib/viewer-memory";

export function viewportFraction(
  pose: ImagePose,
  stage: { width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  const width = Math.min(1, 1 / pose.zoom);
  const height = Math.min(1, 1 / pose.zoom);
  const x = 0.5 - width / 2 - pose.x / (stage.width * pose.zoom);
  const y = 0.5 - height / 2 - pose.y / (stage.height * pose.zoom);
  return {
    x: Math.min(1 - width, Math.max(0, x)),
    y: Math.min(1 - height, Math.max(0, y)),
    width,
    height,
  };
}

export function poseFromNavigatorPoint(
  nx: number,
  ny: number,
  zoom: number,
  stage: { width: number; height: number },
): ImagePose {
  const width = Math.min(1, 1 / zoom);
  const height = Math.min(1, 1 / zoom);
  return {
    zoom,
    x: (0.5 - width / 2 - nx) * stage.width * zoom,
    y: (0.5 - height / 2 - ny) * stage.height * zoom,
  };
}
```

- [ ] **Step 4: Inspect toggle and persistence**

`inspect.ts`:

```ts
interface InspectState {
  grayscale: boolean;
  compare: boolean;
  showNavigator: boolean;
}

function readNavigator(): boolean {
  if (!globalThis.window) return false;
  try {
    return window.localStorage.getItem("pond.viewer.showNavigator") === "1";
  } catch {
    return false;
  }
}

const store = new Store<InspectState>({
  grayscale: false,
  compare: false,
  showNavigator: readNavigator(),
});

export const inspect = {
  toggleGrayscale(): void {
    store.setState((state) => ({ ...state, grayscale: !state.grayscale }));
  },
  setGrayscale(grayscale: boolean): void {
    store.setState((state) => ({ ...state, grayscale }));
  },
  setCompare(compare: boolean): void {
    store.setState((state) => ({ ...state, compare }));
  },
  toggleCompare(): void {
    store.setState((state) => ({ ...state, compare: !state.compare }));
  },
  setShowNavigator(showNavigator: boolean): void {
    if (globalThis.window) {
      try {
        window.localStorage.setItem(
          "pond.viewer.showNavigator",
          showNavigator ? "1" : "0",
        );
      } catch {}
    }
    store.setState((state) =>
      state.showNavigator === showNavigator
        ? state
        : { ...state, showNavigator },
    );
  },
  toggleNavigator(): void {
    inspect.setShowNavigator(!store.state.showNavigator);
  },
  pinCurrent(): void {
    const id = selection.getAnchor();
    if (!id) return;
    void window.pond.query("preview.pin", {
      id,
      navigation: resultNavigation.request() ?? undefined,
    });
  },
};
```

Keep the existing `useInspect` export.

- [ ] **Step 5: Navigator component**

`index.tsx`:

```tsx
import { clsx as cn } from "clsx";
import type { ImagePose } from "@/features/saves/lib/viewer-memory";
import {
  poseFromNavigatorPoint,
  viewportFraction,
} from "./navigator-geometry";
import styles from "./styles.module.css";

interface NavigatorProps {
  src: string;
  pose: ImagePose;
  stage: { width: number; height: number };
  onPose: (pose: ImagePose) => void;
}

export function Navigator({ src, pose, stage, onPose }: NavigatorProps) {
  const box = viewportFraction(pose, stage);
  return (
    <div className={styles.root} aria-label="Navigator">
      <button
        type="button"
        className={styles.map}
        aria-label="Move view"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          onPose(
            poseFromNavigatorPoint(
              (event.clientX - rect.left) / rect.width,
              (event.clientY - rect.top) / rect.height,
              pose.zoom,
              stage,
            ),
          );
        }}
      >
        <img src={src} alt="" className={styles.image} draggable={false} />
        <span
          className={styles.viewport}
          style={{
            left: `${box.x * 100}%`,
            top: `${box.y * 100}%`,
            width: `${box.width * 100}%`,
            height: `${box.height * 100}%`,
          }}
        />
      </button>
    </div>
  );
}
```

`styles.module.css`:

```css
.root {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 2;
  width: 160px;
  overflow: hidden;
  pointer-events: auto;
  background: var(--ds-gray-1);
  border: 1px solid var(--ds-gray-6);
  border-radius: var(--ds-radius-sm);
  box-shadow: var(--ds-shadow-2);
}

.map {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  cursor: var(--ds-cursor-interactive, pointer);
  background: transparent;
  border: 0;
}

.image {
  display: block;
  width: 100%;
  height: auto;
}

.viewport {
  position: absolute;
  box-shadow: inset 0 0 0 1px var(--ds-accent-8);
  pointer-events: none;
}
```

Mount in `image-inspector.tsx` inside `.frame` (the overflow-hidden inspector surface), using `useInspect().showNavigator`. Measure stage from `frame.current.getBoundingClientRect()` on resize. Example:

```tsx
  const { grayscale, showNavigator } = useInspect();
```

Near the end of the frame’s children:

```tsx
        {showNavigator && size.width > 0 ? (
          <Navigator
            src={src}
            pose={pose}
            stage={{
              width: frame.current?.clientWidth ?? 1,
              height: frame.current?.clientHeight ?? 1,
            }}
            onPose={setPosition}
          />
        ) : null}
```

`.frame` is `position: relative` already. Do not add a `mask-image`. Import `Navigator` from `./navigator`.

- [ ] **Step 6: View menu, Save menu, and menu bridge**

Add to `MenuActionId` in `constants.ts`:

```ts
  | "view.navigator";
```

In `apps/desktop/src/main/menu.ts` View submenu, after Pin Preview:

```ts
        {
          ...sym("square.dashed"),
          label: "Show Navigator",
          click: sendMenuAction("view.navigator"),
        },
```

If `square.dashed` is missing from `sym()`, use `...sym("viewfinder")` or omit `sym` and keep the label only.

In `menu-bridge.tsx` next to `view.grayscale`:

```ts
        case "view.navigator":
          inspect.toggleNavigator();
          return;
```

Import `inspect` if this file does not already (it already calls `inspect.toggleGrayscale()`).

Save menu checkbox, hidden unless `opened` and the save is an image (GIF counts):

```ts
    {
      type: "checkbox",
      label: "Show Navigator",
      hidden: !opened || deriveTypeKind(targetFile, save) !== "image",
      checked: inspectSnapshot?.showNavigator,
      onCheckedChange: () => inspect.toggleNavigator(),
    },
```

`buildSaveMenu` cannot call `useInspect`. Read `inspect` store directly:

```ts
import { inspect } from "@/features/saves/state/inspect";
```

`inspect` is a module object. Add a snapshot helper on it:

```ts
  snapshot(): InspectState {
    return store.state;
  },
```

Then `inspect.snapshot().showNavigator`.

- [ ] **Step 7: Run tests**

```sh
pnpm --filter @pond/desktop exec vitest run src/renderer/src/features/saves/components/viewers/image-inspector/navigator/navigator.test.ts src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```sh
git add apps/desktop/src/renderer/src/features/saves/components/viewers/image-inspector/navigator \
  apps/desktop/src/renderer/src/features/saves/components/viewers/image-inspector/image-inspector.tsx \
  apps/desktop/src/renderer/src/features/saves/state/inspect.ts \
  apps/desktop/src/shared/constants.ts \
  apps/desktop/src/main/menu.ts \
  apps/desktop/src/renderer/src/app/effects/menu-bridge.tsx \
  apps/desktop/src/renderer/src/features/saves/lib/menu.ts \
  apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
git commit -m "$(cat <<'EOF'
feat: show an image navigator for zoomed inspector poses

EOF
)"
```

---

### Task 6: List columns

**Files:**
- Create: `apps/desktop/src/renderer/src/features/library/state/list-columns.ts`
- Create: `apps/desktop/src/renderer/src/features/library/state/list-columns.test.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/components/card/views/list/list.tsx`
- Modify: `apps/desktop/src/renderer/src/features/saves/components/card/views/list/list.module.css`
- Modify: `apps/desktop/src/renderer/src/features/library/components/view-menu/display/display.tsx`

Eagle’s list-property menu is Tags, Dimensions, Rating, Extension, File Size, Date Added, Annotation. Pond already shows name and date through Display Options. List columns are independent of gallery overlay toggles. Do not nest a second context menu on the Save card (that fights the Save menu). Surface the toggles in Display Options when the layout is List.

- [ ] **Step 1: Write the failing tests**

```ts
import { expect, it } from "vitest";
import {
  formatListDimension,
  formatListRating,
  LIST_COLUMN_DEFAULTS,
} from "./list-columns";

it("defaults name and date on and the rest off", () => {
  expect(LIST_COLUMN_DEFAULTS).toEqual({
    name: true,
    dateAdded: true,
    tags: false,
    dimensions: false,
    rating: false,
    extension: false,
    fileSize: false,
    annotation: false,
  });
});

it("formats list cells", () => {
  expect(formatListDimension(1920, 1080)).toBe("1920 × 1080");
  expect(formatListDimension(null, null)).toBe("—");
  expect(formatListRating(5)).toBe("5");
  expect(formatListRating(null)).toBe("—");
});
```

- [ ] **Step 2: Run the test to verify it fails**

```sh
pnpm --filter @pond/desktop exec vitest run src/renderer/src/features/library/state/list-columns.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement the store and formatters**

`list-columns.ts`:

```ts
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

export type ListColumnKey =
  | "name"
  | "dateAdded"
  | "tags"
  | "dimensions"
  | "rating"
  | "extension"
  | "fileSize"
  | "annotation";

export type ListColumns = Record<ListColumnKey, boolean>;

export const LIST_COLUMN_DEFAULTS: ListColumns = {
  name: true,
  dateAdded: true,
  tags: false,
  dimensions: false,
  rating: false,
  extension: false,
  fileSize: false,
  annotation: false,
};

const STORAGE_KEYS: Record<ListColumnKey, string> = {
  name: "pond.list.name",
  dateAdded: "pond.list.dateAdded",
  tags: "pond.list.tags",
  dimensions: "pond.list.dimensions",
  rating: "pond.list.rating",
  extension: "pond.list.extension",
  fileSize: "pond.list.fileSize",
  annotation: "pond.list.annotation",
};

function readKey(key: ListColumnKey): boolean {
  if (!globalThis.window) return LIST_COLUMN_DEFAULTS[key];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS[key]);
    if (raw == null) return LIST_COLUMN_DEFAULTS[key];
    return raw === "1";
  } catch {
    return LIST_COLUMN_DEFAULTS[key];
  }
}

function readAll(): ListColumns {
  return {
    name: readKey("name"),
    dateAdded: readKey("dateAdded"),
    tags: readKey("tags"),
    dimensions: readKey("dimensions"),
    rating: readKey("rating"),
    extension: readKey("extension"),
    fileSize: readKey("fileSize"),
    annotation: readKey("annotation"),
  };
}

const store = new Store<ListColumns>(readAll());

export function setListColumn(key: ListColumnKey, value: boolean): void {
  if (globalThis.window) {
    try {
      window.localStorage.setItem(STORAGE_KEYS[key], value ? "1" : "0");
    } catch {}
  }
  store.setState((s) => (s[key] === value ? s : { ...s, [key]: value }));
}

export function useListColumns(): ListColumns {
  return useSelector(store, (s) => s);
}

export function formatListDimension(
  width: number | null | undefined,
  height: number | null | undefined,
): string {
  if (!width || !height) return "—";
  return `${width} × ${height}`;
}

export function formatListRating(rating: number | null | undefined): string {
  if (rating == null || rating <= 0) return "—";
  return String(rating);
}

export function formatListExtension(path: string | null | undefined): string {
  if (!path) return "—";
  const dot = path.lastIndexOf(".");
  if (dot < 0) return "—";
  return path.slice(dot + 1).toUpperCase();
}
```

- [ ] **Step 4: Render columns on the list card**

Replace `ListCard` body so extra cells sit beside `Card.Meta`. Keep `Card.Meta` for name/date when those list columns are on. `model.title` / `model.time` still follow gallery Display Options; for list layout, prefer list-column flags so Date Added can show when gallery “Show Date” is off.

```tsx
import { PreparedCardThumb } from "@/features/saves/components/card/media/media";
import { Card } from "@/features/saves/components/card/parts/parts";
import type { SaveCardViewProps } from "@/features/saves/components/card/views/types";
import {
  formatListDimension,
  formatListExtension,
  formatListRating,
  useListColumns,
} from "@/features/library/state/list-columns";
import { formatAbsolute, formatBytes } from "@/shared/lib/format";
import styles from "./list.module.css";

export function ListCard({ model, width }: SaveCardViewProps) {
  const columns = useListColumns();
  const save = model.save;
  const file = model.primary;
  return (
    <div className={styles.body}>
      <Card.Media className={styles.media}>
        <Card.Frame>
          <PreparedCardThumb
            save={save}
            view="list"
            width={width}
            mediaUnits={model.mediaUnits}
            pickOptions={model.pickOptions}
            unit={model.unit}
            primary={model.primary}
          />
        </Card.Frame>
        <Card.Overlay model={model.overlay} />
      </Card.Media>
      {columns.name ? (
        <Card.Meta className={styles.meta} title={save.title ?? save.url} />
      ) : null}
      {columns.tags ? (
        <span className={styles.cell}>{save.tags.join(", ") || "—"}</span>
      ) : null}
      {columns.dimensions ? (
        <span className={styles.cell}>
          {formatListDimension(save.width, save.height)}
        </span>
      ) : null}
      {columns.rating ? (
        <span className={styles.cell}>{formatListRating(save.rating)}</span>
      ) : null}
      {columns.extension ? (
        <span className={styles.cell}>
          {formatListExtension(file?.path)}
        </span>
      ) : null}
      {columns.fileSize ? (
        <span className={styles.cell}>{formatBytes(save.fileSize)}</span>
      ) : null}
      {columns.dateAdded ? (
        <span className={styles.cell}>{formatAbsolute(save.savedAt) || "—"}</span>
      ) : null}
      {columns.annotation ? (
        <span className={styles.cell}>
          {save.notes?.trim() || (save.comments?.length ?? 0) > 0 ? "Yes" : "—"}
        </span>
      ) : null}
    </div>
  );
}
```

Add to `list.module.css`:

```css
.cell {
  min-width: 0;
  overflow: hidden;
  font-size: var(--ds-text-mini);
  color: var(--ds-gray-11);
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

User-content truncation may use CSS `ellipsis`. Do not put `...` in the annotation label.

- [ ] **Step 5: Display Options rows when layout is List**

In `display.tsx`:

```tsx
import { Switch } from "@pond/ui";
import { useId } from "react";
import { useView } from "@/features/library/hooks/use-view";
import type { DisplayPrefKey } from "@/features/library/state/display-prefs";
import {
  type ListColumnKey,
  setListColumn,
  useListColumns,
} from "@/features/library/state/list-columns";
import styles from "./display.module.css";

const TOGGLES: Array<{ key: DisplayPrefKey; label: string }> = [
  { key: "name", label: "Show Name" },
  { key: "date", label: "Show Date" },
  { key: "source", label: "Show Source" },
  { key: "type", label: "Show Format" },
  { key: "fileCount", label: "Show File Count" },
];

const LIST_TOGGLES: Array<{ key: ListColumnKey; label: string }> = [
  { key: "name", label: "Show Name" },
  { key: "tags", label: "Show Tags" },
  { key: "dimensions", label: "Show Dimensions" },
  { key: "rating", label: "Show Rating" },
  { key: "extension", label: "Show Extension" },
  { key: "fileSize", label: "Show File Size" },
  { key: "dateAdded", label: "Show Date Added" },
  { key: "annotation", label: "Show Annotation" },
];

export function DisplaySection() {
  const { state, actions } = useView();
  const listColumns = useListColumns();
  const id = useId();
  const list = state.layout === "list";

  return (
    <div className={styles.rows}>
      {(list ? LIST_TOGGLES : TOGGLES).map(({ key, label }) => (
        <label key={key} htmlFor={`${id}-${key}`} className={styles.row}>
          <span className={styles.label}>{label}</span>
          <Switch.Root
            id={`${id}-${key}`}
            checked={
              list
                ? listColumns[key as ListColumnKey]
                : state.displayPrefs[key as DisplayPrefKey]
            }
            onCheckedChange={(checked) => {
              if (list) setListColumn(key as ListColumnKey, checked);
              else actions.setDisplayPref(key as DisplayPrefKey, checked);
            }}
          />
        </label>
      ))}
    </div>
  );
}
```

When layout is List, hide the gallery overlay toggles (source/type/file count) so the menu matches Eagle’s list properties. Source/type remain gallery overlays in other layouts.

- [ ] **Step 6: Run tests**

```sh
pnpm --filter @pond/desktop exec vitest run src/renderer/src/features/library/state/list-columns.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```sh
git add apps/desktop/src/renderer/src/features/library/state/list-columns.ts \
  apps/desktop/src/renderer/src/features/library/state/list-columns.test.ts \
  apps/desktop/src/renderer/src/features/saves/components/card/views/list/list.tsx \
  apps/desktop/src/renderer/src/features/saves/components/card/views/list/list.module.css \
  apps/desktop/src/renderer/src/features/library/components/view-menu/display/display.tsx
git commit -m "$(cat <<'EOF'
feat: add Eagle list columns for tags, size, and dates

EOF
)"
```

---

### Task 7: Convert WebP to PNG or JPG

**Files:**
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/menu.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts`

`conversion.start` already transcodes jpeg/png/webp via a directory picker. This task adds one-click PNG and JPG rows gated on WebP. Original WebP stays. Output is a converted export, not a replace-in-place.

- [ ] **Step 1: Write the failing tests**

```ts
function webpSave(): Save {
  return {
    ...fileSave(),
    id: "webp-save",
    sourceId: "webp-save",
    mediaType: "image",
    files: [
      {
        kind: "image",
        path: "shot.webp",
        mimeType: "image/webp",
        sha256: "webp",
        size: 1,
      },
    ],
  };
}

it("exposes Convert to PNG and Convert to JPG on a WebP save", () => {
  const top = labels(buildSaveMenu(webpSave(), { clipboardEmpty: true }));
  expect(top).toContain("Convert to PNG");
  expect(top).toContain("Convert to JPG");
});

it("hides WebP convert rows on a PNG save", () => {
  const top = labels(buildSaveMenu(imageSave("png"), { clipboardEmpty: true }));
  expect(top).not.toContain("Convert to PNG");
  expect(top).not.toContain("Convert to JPG");
});
```

- [ ] **Step 2: Run tests to verify they fail**

```sh
pnpm --filter @pond/desktop exec vitest run src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
```

Expected: FAIL. Labels missing.

- [ ] **Step 3: Add the menu rows**

In `buildSaveMenu`:

```ts
  const isWebp =
    !batch &&
    (targetFile?.mimeType === "image/webp" ||
      /\.webp(?:$|[?#])/i.test(targetFile?.path ?? ""));
```

Helper next to `openConversionDialog` usage (keep it in `menu.ts`):

```ts
function startWebpConvert(ids: string[], format: "png" | "jpeg") {
  return window.pond.query("conversion.start", {
    ids,
    fileIndex: 0,
    preset: {
      id: `webp-${format}`,
      name: format === "png" ? "PNG" : "JPG",
      format,
      width: null,
      height: null,
      quality: format === "png" ? 100 : 90,
      start: 0,
      duration: 5,
      fps: 12,
    },
  });
}
```

In `exportItems`, after Export as WebP:

```ts
    {
      label: "Convert to PNG",
      hidden: !isWebp,
      onClick: () => {
        void startWebpConvert(ids, "png");
      },
    },
    {
      label: "Convert to JPG",
      hidden: !isWebp,
      onClick: () => {
        void startWebpConvert(ids, "jpeg");
      },
    },
```

`ConversionPresetSchema` requires `id`, `name`, `format`, and the numeric defaults. Passing them explicitly avoids relying on Zod defaults at the renderer boundary.

Do not add a new conversion engine. `conversion.start` already opens “Export Converted Files” as a directory dialog.

- [ ] **Step 4: Run tests**

```sh
pnpm --filter @pond/desktop exec vitest run src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts src/renderer/src/features/saves/lib/menu.test.ts
```

Expected: PASS. Combine / Share / Pin / Cover / Replace File / Reset Loop Range / Set as GIF Thumbnail / Load Subtitles / Show Navigator still present when their conditions are true.

- [ ] **Step 5: Commit**

```sh
git add apps/desktop/src/renderer/src/features/saves/lib/menu.ts \
  apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
git commit -m "$(cat <<'EOF'
feat: convert WebP Saves to PNG or JPG through existing jobs

EOF
)"
```

---

## Self-review

- Spec coverage: GIF loop range, Set as GIF Thumbnail, Load Subtitles, Show Navigator, list columns (including annotation / item-info fields), Convert to PNG/JPG from WebP, `speedUp` / `speedDown`, volume ±5% each have a task. `scrollPageUp` / `scrollPageDown` stay later-wave. Write-to-file rotate stays out.
- Placeholder scan: no TBD, no “add tests later,” no “similar to Task N” without code.
- Types: `saves.setGifThumbnail` / `saves.loadSubtitles` match contracts, queries, and menu `window.pond.query` calls. GIF loop is `[number, number]` inclusive frames in `viewerMemory`. Subtitle files are `kind: "subtitle"`. Navigator uses `inspect.showNavigator`. List columns use `ListColumnKey`. Convert uses `conversion.start` with `format: "png" | "jpeg"`.
- Originals: GIF thumbnail writes `custom_thumbnail` only. Subtitles add/replace `subtitle` files only. Convert writes new files to a picked directory. Combine/replace from Wave 2 stay as they are.

## After this plan

Wave 4 (`docs/superpowers/plans/YYYY-MM-DD-eagle-baseline-wave-4.md`) owns Collect: page-asset grid, save-time folder/tag, screenshots/auto-import proven in a live session.
