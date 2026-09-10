# Eagle Baseline Wave 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not vendor Eagle source, templates, or SVG icons. Do not mix unrelated dirty-tree files into Wave 5 commits. Do not add fontkit, essentia, or other heavy analysis deps. Do not replace harvest, Sources, or Agent.

**Goal:** Ship Eagle’s remaining first-party specialist media: font family plus activate/deactivate, audio waveform and BPM, Office first-page preview, and common RAW embedded previews. Store-all already exists.

**Architecture:** Main owns byte readers (OpenType name table, RAW JPEG, OOXML thumbnail, font copy into `~/Library/Fonts`). Renderer owns specimen chrome, AudioContext peaks/BPM, and Pond UI actions. Family and BPM persist on `SaveFile` JSON (`family`, `bpm`) so `{family}` rename and filters can project without a new SQLite column. Office and RAW keep `previewKind: "generic"` and `native-preview`; extractors feed `thumbnail.ts` before OS Quick Look.

**Tech Stack:** TypeScript, Electron `^42.4.0`, sharp, jszip (already a desktop dep), Pond UI, CSS Modules `data-*` states, Vitest, existing `query()` + `query-contracts.ts` pairs. Audio analysis is first-party `AudioContext` plus autocorrelation. No `fontkit`. No Eagle plugins.

---

## Scope

| Operation | Eagle surface | Pond label |
| --- | --- | --- |
| Font family | Font viewer / rename `{family}` | Family on the specimen; `{family}` in batch rename |
| Activate font | Font install | Activate Font / Deactivate Font |
| Audio waveform | Audio viewer | Waveform in the audio viewer |
| Audio BPM | Filter BPM | BPM on the viewer; BPM filter |
| Office first page | Native Office preview | OS Quick Look, OOXML thumbnail fallback |
| Common RAW | Native RAW thumbnail | Embedded JPEG, then OS thumbnail |

**Out of Wave 5:** plugins, Plugin Center, format plugins (JXL extras, 3D extras, EPUB/SWF as plugins), Photoshop-class PSD/AI, harvest/Sources replacement, Eagle Cloud, Pond cloud copy, folder passwords.

**Protect:** harvest, Sources, Agent, rebuildable index.

**UI rules:** Title Case. No ellipsis in chrome (`Activate Font`, not `Activating…`). No em dashes. Pond nouns: Library, Save, Folder. Search placeholders may use `…`. Outcome language, not algorithm names (`BPM`, not `Autocorrelation`).

---

## Working-tree commit policy

The live working copy is far ahead of HEAD. Implement against the live tree so `pnpm dev` stays current. Commit only Wave 5 hunks.

Never `git add -p`, `git add -i`, `git checkout .`, or `git restore .`.

For a **mixed tracked file** (Wave 5 plus unrelated dirty edits):

1. Copy the live file aside (`cp path path.wave5bak`).
2. `git checkout HEAD -- path` to get HEAD.
3. Re-apply **only** the Wave 5 edits from this plan onto HEAD.
4. `git add` that file plus any new Wave 5 files.
5. Commit.
6. Restore the backup (`mv path.wave5bak path`) and re-apply the Wave 5 edits onto the restored dirty file so `pnpm dev` still has them.

Untracked rewrite files stay untracked unless this wave created them. Do not `git add` `library-actions.ts` / `action-dialog.tsx` even if you patch `{family}` onto the live copy.

Likely mixed files: `packages/schema/src/db.ts` (`SaveFile`), `packages/schema/src/filters/**`, `apps/desktop/src/shared/query-contracts.ts`, `apps/desktop/src/main/ipc/queries/saves.ts`, `apps/desktop/src/main/core/manual-import.ts`, `apps/desktop/src/main/lib/thumbnail.ts` (check first), `apps/desktop/src/renderer/src/features/saves/components/viewers/file-viewer/file-viewer.tsx`, `apps/desktop/src/renderer/src/features/library/components/filter-menu/options.ts`.

---

## Files this wave owns

- Create: `apps/desktop/src/main/core/font-metadata.ts`
- Create: `apps/desktop/src/main/core/font-metadata.test.ts`
- Create: `apps/desktop/src/main/core/font-activation.ts`
- Create: `apps/desktop/src/main/core/font-activation.test.ts`
- Create: `apps/desktop/src/renderer/src/features/saves/lib/media/audio-peaks.ts`
- Create: `apps/desktop/src/renderer/src/features/saves/lib/media/audio-peaks.test.ts`
- Create: `apps/desktop/src/renderer/src/features/saves/lib/media/audio-bpm.ts`
- Create: `apps/desktop/src/renderer/src/features/saves/lib/media/audio-bpm.test.ts`
- Create: `apps/desktop/src/main/core/office-preview.ts`
- Create: `apps/desktop/src/main/core/office-preview.test.ts`
- Create: `apps/desktop/src/main/core/raw-preview.ts`
- Create: `apps/desktop/src/main/core/raw-preview.test.ts`
- Create: `packages/schema/src/filters/fields/font-family.ts`
- Create: `packages/schema/src/filters/fields/bpm.ts`
- Modify: `packages/schema/src/db.ts` (`SaveFile.family`, `SaveFile.bpm`)
- Modify: `packages/schema/src/filters/types.ts`
- Modify: `packages/schema/src/filters/fields/index.ts`
- Modify: `packages/schema/src/filters/fields/save-like.ts` only if project helpers need typed files
- Modify: `apps/desktop/src/main/core/manual-import.ts`
- Modify: `apps/desktop/src/main/ipc/queries/saves.ts`
- Modify: `apps/desktop/src/shared/query-contracts.ts`
- Modify: `apps/desktop/src/main/core/agent/review.ts` (`batchRename` `{family}`)
- Modify: `apps/desktop/src/main/lib/thumbnail.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/components/viewers/file-viewer/file-viewer.tsx`
- Modify: `apps/desktop/src/renderer/src/features/saves/components/viewers/file-viewer/file-viewer.module.css`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/menu.ts` (Activate Font when `mediaType === "font"`)
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts`
- Modify: `apps/desktop/src/renderer/src/features/library/components/filter-menu/options.ts`

Do not commit unrelated dirty files.

---

### Task 1: Font family extract and `{family}` rename

**Files:**
- Create: `apps/desktop/src/main/core/font-metadata.ts`
- Create: `apps/desktop/src/main/core/font-metadata.test.ts`
- Modify: `packages/schema/src/db.ts`
- Modify: `apps/desktop/src/main/core/manual-import.ts`
- Modify: `apps/desktop/src/main/ipc/queries/saves.ts`
- Modify: `apps/desktop/src/main/core/agent/review.ts`

Persist family on the first `SaveFile` as `family`. Batch rename substitutes `{family}` from that field, then `extractFontFamily` on the original path, then `"Untitled"`.

- [ ] **Step 1: Write the failing tests**

`font-metadata.test.ts`:

```ts
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractFontFamily, renameWithFamily } from "./font-metadata";

function nameTableFont(family: string): Buffer {
  const name = Buffer.from(family, "utf16le");
  const nameCount = 1;
  const stringOffset = 6 + 12 * nameCount;
  const table = Buffer.alloc(stringOffset + name.length);
  table.writeUInt16BE(0, 0);
  table.writeUInt16BE(nameCount, 2);
  table.writeUInt16BE(stringOffset, 4);
  table.writeUInt16BE(3, 6);
  table.writeUInt16BE(1, 8);
  table.writeUInt16BE(0x0409, 10);
  table.writeUInt16BE(1, 12);
  table.writeUInt16BE(name.length, 14);
  table.writeUInt16BE(0, 16);
  name.copy(table, stringOffset);
  const offsetTable = Buffer.alloc(12);
  offsetTable.writeUInt32BE(0x00010000, 0);
  offsetTable.writeUInt16BE(1, 4);
  const records = Buffer.alloc(16);
  records.write("name", 0, 4, "ascii");
  records.writeUInt32BE(table.length, 8);
  records.writeUInt32BE(28, 12);
  return Buffer.concat([offsetTable, records, table]);
}

describe("extractFontFamily", () => {
  it("reads the Windows family name", async () => {
    const path = join(tmpdir(), `pond-font-${Date.now()}.ttf`);
    await writeFile(path, nameTableFont("Source Serif"));
    expect(await extractFontFamily(path)).toBe("Source Serif");
  });

  it("returns null when the name table is missing", async () => {
    const path = join(tmpdir(), `pond-font-empty-${Date.now()}.ttf`);
    await writeFile(path, Buffer.alloc(32));
    expect(await extractFontFamily(path)).toBeNull();
  });
});

describe("renameWithFamily", () => {
  it("substitutes family, title, id, and index", () => {
    expect(
      renameWithFamily("{family} {n}", {
        n: 2,
        title: "Old",
        id: "s1",
        family: "Inter",
      }),
    ).toBe("Inter 2");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pond/desktop exec vitest run src/main/core/font-metadata.test.ts`

Expected: FAIL (module missing).

- [ ] **Step 3: Implement extract + rename helper, persist family, wire `saves.batchRename`**

`extractFontFamily(path)` reads the `name` table. Prefer Windows Unicode (platform 3, encoding 1, name ID 1). Fall back to Macintosh name ID 1. Do not import `fontkit`.

`SaveFile` in `packages/schema/src/db.ts`:

```ts
family?: string | null;
bpm?: number | null;
```

On font import in `importManualSave`, after files are hashed, set `files[0].family` from `extractFontFamily`. If `input.title` is empty, set save title to that family.

`saves.batchRename` and agent `batchRename` call `renameWithFamily` instead of three `replaceAll`s. Resolve family from `row.files[0].family` or `extractFontFamily(itemFile(row.id, row.files[0].path))`.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @pond/desktop exec vitest run src/main/core/font-metadata.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(desktop): extract font family for rename

Batch rename had no {family} token. Read the OpenType name table on import.

EOF
)"
```

---

### Task 2: Activate and deactivate fonts

**Files:**
- Create: `apps/desktop/src/main/core/font-activation.ts`
- Create: `apps/desktop/src/main/core/font-activation.test.ts`
- Modify: `apps/desktop/src/shared/query-contracts.ts`
- Modify: `apps/desktop/src/main/ipc/queries/saves.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/components/viewers/file-viewer/file-viewer.tsx`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/menu.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts`

Copy the original into a Pond-owned directory under the user Fonts folder (`~/Library/Fonts/Pond/` on darwin, `%LOCALAPPDATA%/Microsoft/Windows/Fonts/Pond/` on win32). Deactivate deletes only files inside that Pond directory. Record the installed path in `itemDir(id)/font-activation.json`.

- [ ] **Step 1: Write the failing tests**

```ts
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { activateFont, deactivateFont } from "./font-activation";

it("installs a font into the Pond fonts directory and removes it", async () => {
  const root = await mkdtemp(join(tmpdir(), "pond-fonts-"));
  const source = join(root, "SourceSerif.ttf");
  await writeFile(source, Buffer.from("font"));
  const fontsDir = join(root, "Fonts");
  const activated = await activateFont({
    sourcePath: source,
    saveId: "save-1",
    fontsDir,
  });
  expect(activated.ok).toBe(true);
  expect(activated.path?.startsWith(join(fontsDir, "Pond"))).toBe(true);
  expect(await readFile(activated.path ?? "", "utf8")).toBe("font");
  const deactivated = await deactivateFont({
    installedPath: activated.path ?? "",
    fontsDir,
  });
  expect(deactivated.ok).toBe(true);
  await expect(readFile(activated.path ?? "")).rejects.toThrow();
});

it("refuses to delete a file outside the Pond fonts directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "pond-fonts-"));
  const outside = join(root, "system.ttf");
  await writeFile(outside, "keep");
  const result = await deactivateFont({
    installedPath: outside,
    fontsDir: join(root, "Fonts"),
  });
  expect(result.ok).toBe(false);
  expect(await readFile(outside, "utf8")).toBe("keep");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pond/desktop exec vitest run src/main/core/font-activation.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement activation + queries + UI**

Queries:

```ts
"saves.activateFont": { id: string };
"saves.deactivateFont": { id: string };
// results: { ok: boolean; path?: string; error?: string }
```

Copy with `copyFile`. Default `fontsDir` is `join(app.getPath("home"), "Library", "Fonts")` on darwin.

Viewer and Save menu: `Activate Font` when no sidecar, `Deactivate Font` when sidecar exists. Pond UI `Button`. Title Case. Do not use ellipsis.

Add both labels to `eagle-baseline-menu.test.ts` for a font save (`mediaType: "font"`, file path `Family.ttf`). Hide them for image saves.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @pond/desktop exec vitest run src/main/core/font-activation.test.ts src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(desktop): activate and deactivate library fonts

Specimen preview is not enough. Copy into the user Fonts folder Pond owns.

EOF
)"
```

---

### Task 3: Audio waveform and BPM

**Files:**
- Create: `apps/desktop/src/renderer/src/features/saves/lib/media/audio-peaks.ts`
- Create: `apps/desktop/src/renderer/src/features/saves/lib/media/audio-peaks.test.ts`
- Create: `apps/desktop/src/renderer/src/features/saves/lib/media/audio-bpm.ts`
- Create: `apps/desktop/src/renderer/src/features/saves/lib/media/audio-bpm.test.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/components/viewers/file-viewer/file-viewer.tsx`
- Modify: `apps/desktop/src/renderer/src/features/saves/components/viewers/file-viewer/file-viewer.module.css`
- Modify: `apps/desktop/src/shared/query-contracts.ts`
- Modify: `apps/desktop/src/main/ipc/queries/saves.ts`

Peaks and BPM are pure functions over a mono `Float32Array`. The viewer decodes with `AudioContext.decodeAudioData`, draws peaks as a `<canvas>` (or SVG polyline) with `aria-label="Waveform"`, and shows `BPM` as a status number. Persist BPM onto `files[0].bpm` via `saves.setAudioAnalysis` so the filter can read it after the first open.

- [ ] **Step 1: Write the failing tests**

`audio-peaks.test.ts`:

```ts
import { expect, it } from "vitest";
import { downsamplePeaks } from "./audio-peaks";

it("buckets absolute peaks", () => {
  const samples = new Float32Array([0, 0.5, -1, 0.25, 0, 0]);
  expect(downsamplePeaks(samples, 2)).toEqual([1, 0.25]);
});

it("returns zeros for silence", () => {
  expect(downsamplePeaks(new Float32Array(8), 4)).toEqual([0, 0, 0, 0]);
});
```

`audio-bpm.test.ts`:

```ts
import { expect, it } from "vitest";
import { estimateBpm } from "./audio-bpm";

it("estimates a 120 bpm pulse", () => {
  const sampleRate = 44100;
  const seconds = 8;
  const samples = new Float32Array(sampleRate * seconds);
  const interval = Math.round(sampleRate * (60 / 120));
  for (let i = 0; i < samples.length; i += interval) samples[i] = 1;
  const bpm = estimateBpm(samples, sampleRate);
  expect(bpm).toBeGreaterThanOrEqual(118);
  expect(bpm).toBeLessThanOrEqual(122);
});

it("returns null for silence", () => {
  expect(estimateBpm(new Float32Array(44100), 44100)).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @pond/desktop exec vitest run src/renderer/src/features/saves/lib/media/audio-peaks.test.ts src/renderer/src/features/saves/lib/media/audio-bpm.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement peaks, BPM, viewer, persist query**

`downsamplePeaks(samples, buckets)`: max abs per equal slice.

`estimateBpm`: downsample to ~4 kHz, energy envelope, autocorrelation in 60–180 BPM, return nearest integer or `null`.

`AudioViewer`: keep `<audio controls>`. Add waveform canvas. Show `120 BPM` when known. Query `saves.setAudioAnalysis` `{ id, bpm }` after estimate. CSS part names: `waveform`, `bpm`. No component-prefixed classes.

Do not add essentia or waveform npm packages.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @pond/desktop exec vitest run src/renderer/src/features/saves/lib/media/audio-peaks.test.ts src/renderer/src/features/saves/lib/media/audio-bpm.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(desktop): show audio waveform and BPM

The audio viewer was a naked control. Peaks and tempo are first-party.

EOF
)"
```

---

### Task 4: Office first-page preview

**Files:**
- Create: `apps/desktop/src/main/core/office-preview.ts`
- Create: `apps/desktop/src/main/core/office-preview.test.ts`
- Modify: `apps/desktop/src/main/lib/thumbnail.ts`

Eagle Office preview is the first page, via the OS on Mac. Pond already routes `docx|pptx|xlsx|pages|key` to `native-preview` / `nativeImage.createThumbnailFromPath`. This task adds an OOXML embedded-thumbnail fallback when Quick Look returns empty, and locks the native route with a classifier test if one is missing.

- [ ] **Step 1: Write the failing tests**

```ts
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import { expect, it } from "vitest";
import { extractOfficePreview } from "./office-preview";

const jpeg = Buffer.from(
  "ffd8ffe000104a46494600010100000100010000ffd9",
  "hex",
);

it("reads docProps/thumbnail.jpeg from a docx zip", async () => {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>',
  );
  zip.file("docProps/thumbnail.jpeg", jpeg);
  const root = await mkdtemp(join(tmpdir(), "pond-office-"));
  const path = join(root, "deck.docx");
  await writeFile(path, await zip.generateAsync({ type: "nodebuffer" }));
  const preview = await extractOfficePreview(path);
  expect(preview?.subarray(0, 2).equals(Buffer.from([0xff, 0xd8]))).toBe(true);
});

it("returns null for a zip without a thumbnail", async () => {
  const zip = new JSZip();
  zip.file("word/document.xml", "<w:document/>");
  const root = await mkdtemp(join(tmpdir(), "pond-office-"));
  const path = join(root, "plain.docx");
  await writeFile(path, await zip.generateAsync({ type: "nodebuffer" }));
  expect(await extractOfficePreview(path)).toBeNull();
});
```

If `file-format.test.ts` does not already assert `report.docx` → `native-preview`, add that case in this task (same commit). Do not change PDF (full `pdfjs` viewer stays).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pond/desktop exec vitest run src/main/core/office-preview.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement extractor and call it from `nativeThumbnailPipeline`**

Try paths in order: `docProps/thumbnail.jpeg`, `docProps/thumbnail.jpg`, `docProps/thumbnail.emf` (skip emf if not JPEG/PNG). Accept `.docx` `.pptx` `.xlsx` `.dotx` `.potx`. If extract returns bytes, `sharp(bytes)`. Else keep existing `createThumbnailFromPath`.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @pond/desktop exec vitest run src/main/core/office-preview.test.ts src/shared/file-format.test.ts src/renderer/src/features/saves/lib/media/viewer-capability.test.ts`

Expected: PASS. Office files still `native-preview`.

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(desktop): preview Office from embedded first-page thumbnails

Quick Look already covers Mac. Unpack OOXML when the OS thumbnail is empty.

EOF
)"
```

---

### Task 5: RAW embedded JPEG

**Files:**
- Create: `apps/desktop/src/main/core/raw-preview.ts`
- Create: `apps/desktop/src/main/core/raw-preview.test.ts`
- Modify: `apps/desktop/src/main/lib/thumbnail.ts`

Common RAW in `EAGLE_FORMAT_GROUPS.rawImage` stays `previewKind: "generic"`. Before OS thumbnail, scan for an embedded JPEG (SOI `FF D8 FF` through EOI `FF D9`) at least 4 KB. Prefer the last valid JPEG (often the largest preview). Do not vendor libraw or Eagle RAW plugins.

- [ ] **Step 1: Write the failing tests**

```ts
import { expect, it } from "vitest";
import { extractRawPreviewJpeg } from "./raw-preview";

it("returns the trailing JPEG in a fake RAW container", () => {
  const jpeg = Buffer.from(
    "ffd8ffe000104a46494600010100000100010000" + "ff".repeat(4096) + "ffd9",
    "hex",
  );
  const container = Buffer.concat([Buffer.from("CFA0"), jpeg]);
  const preview = extractRawPreviewJpeg(container);
  expect(preview?.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))).toBe(
    true,
  );
  expect(preview?.subarray(-2).equals(Buffer.from([0xff, 0xd9]))).toBe(true);
});

it("returns null when no JPEG is present", () => {
  expect(extractRawPreviewJpeg(Buffer.from("not-an-image"))).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pond/desktop exec vitest run src/main/core/raw-preview.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement and wire thumbnail**

In `nativeThumbnailPipeline` (or just before it in `getOrCreateThumbnail`), if `classifyLibraryFile(sourcePath)` group is `rawImage` (or extension is in `EAGLE_FORMAT_GROUPS.rawImage`), `readFile` and `extractRawPreviewJpeg`. On success, `sharp(jpeg)`. On failure, existing native thumbnail.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @pond/desktop exec vitest run src/main/core/raw-preview.test.ts src/shared/file-format.test.ts`

Expected: PASS. `dng` / `cr3` still classify as `generic` / `native-preview`.

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(desktop): thumbnail RAW from an embedded JPEG

OS thumbs miss some camera files. Use the preview JPEG already in the container.

EOF
)"
```

---

### Task 6: Font family and BPM filters

**Files:**
- Create: `packages/schema/src/filters/fields/font-family.ts`
- Create: `packages/schema/src/filters/fields/bpm.ts`
- Modify: `packages/schema/src/filters/types.ts` (`FieldId`)
- Modify: `packages/schema/src/filters/fields/index.ts`
- Modify: `apps/desktop/src/renderer/src/features/library/components/filter-menu/options.ts`
- Test: add cases to an existing schema filter match test if one exists (`packages/schema` vitest), otherwise create `packages/schema/src/filters/fields/font-family.test.ts` and `bpm.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { expect, it } from "vitest";
import { matches } from "../match";

it("matches font family from the first file", () => {
  expect(
    matches(
      {
        combinator: "and",
        rules: [
          { field: "fontFamily", operator: "contains", value: "inter" },
        ],
      },
      {
        id: "s1",
        source: "file",
        url: "",
        mediaType: "font",
        files: [{ family: "Inter" }],
      },
    ),
  ).toBe(true);
});

it("matches bpm with gte", () => {
  expect(
    matches(
      {
        combinator: "and",
        rules: [{ field: "bpm", operator: "gte", value: 100 }],
      },
      {
        id: "s1",
        source: "file",
        url: "",
        mediaType: "audio",
        files: [{ bpm: 120 }],
      },
    ),
  ).toBe(true);
});
```

Put tests next to the new field modules. Import `matches` from `../match`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @pond/schema exec vitest run src/filters/fields/font-family.test.ts src/filters/fields/bpm.test.ts`

If the schema package has no vitest script, run from repo root the same way other schema tests run (`rg "filters/fields" packages/schema/package.json` and match).

Expected: FAIL (`FieldId` missing).

- [ ] **Step 3: Add fields and filter-menu groups**

`fontFamily`: type `string`, label `Font Family`, group `media`. Project `files[0].family` lowercased. SQL `lower(json_extract(files, '$[0].family'))`.

`bpm`: type `number`, label `BPM`, group `media`. Project `files[0].bpm`. SQL `json_extract(files, '$[0].bpm')`. Presets: `{ id: "slow", label: "< 90 BPM", value: 90 }`, `{ id: "mid", label: "90–140 BPM", value: [90, 140] }` only if the number field supports between; otherwise skip presets and use gte/lte like width.

Add `"fontFamily"` and `"bpm"` to `FILTER_GROUPS` media row in `options.ts` (the array that already has `duration`).

Do not put them on the default toolbar unless that list is derived from `FILTER_GROUPS`.

- [ ] **Step 4: Run tests**

Run schema field tests plus `pnpm --filter @pond/desktop exec vitest run src/renderer/src/features/library/components/filter-menu/behavior.test.ts` if it enumerates `FieldId`.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(desktop): filter Saves by font family and BPM

Family and tempo now live on the file record. Expose them in Find.

EOF
)"
```

---

## Spec coverage

- Fonts: Task 1 family + `{family}`; Task 2 activate; Task 6 filter.
- Audio: Task 3 waveform/BPM; Task 6 BPM filter.
- Office first page: Task 4 OS + OOXML thumbnail. PDF stays the multi-page viewer.
- Common RAW: Task 5 embedded JPEG then OS. Store-all list unchanged. Format plugins out.

## Placeholder scan

No TBD. `extractFontFamily`, `activateFont`, `downsamplePeaks`, `estimateBpm`, `extractOfficePreview`, `extractRawPreviewJpeg`, `saves.setAudioAnalysis`, `saves.activateFont` are the stable names.

## Pond extras to protect

Harvest, Accounts, Watches, Agent, rebuildable index, no Pond cloud copy.
