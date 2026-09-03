# Universal File Viewers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every Eagle-compatible file an intentional Pond detail view, with interactive rendering where safe, a full-size generated preview for proprietary formats, and reliable Open/Export fallback actions.

**Architecture:** Add one pure viewer-capability registry between file classification and React. Browser-native media keeps its existing viewers; common 3D and EPUB files load specialist renderers lazily; archives and offline web files use non-executing inspectors; proprietary design, RAW, Office, iWork, CAD, and mind-map files use Pond's existing OS thumbnail pipeline at viewer resolution. The original file remains the source of truth and every viewer can fall back without changing or rejecting it.

**Tech Stack:** TypeScript, React, Electron `pond://` protocol, Electron native thumbnails, Three.js loaders, epub.js, JSZip, Vitest, CSS modules.

---

### Task 1: Make viewer capability explicit for every Eagle format

**Files:**
- Create: `apps/desktop/src/renderer/src/lib/media/viewer-capability.ts`
- Create: `apps/desktop/src/renderer/src/lib/media/viewer-capability.test.ts`
- Modify: `apps/desktop/src/renderer/src/lib/media/file-viewer.ts`
- Modify: `apps/desktop/src/renderer/src/lib/media/file-viewer.test.ts`

- [ ] **Step 1: Write the manifest-wide routing test**

```ts
import { EAGLE_SUPPORTED_EXTENSIONS } from "@shared/eagle-formats";
import { viewerCapabilityFor } from "./viewer-capability";

it.each([...EAGLE_SUPPORTED_EXTENSIONS])("routes .%s to a detail viewer", (ext) => {
  const capability = viewerCapabilityFor({
    kind: "file",
    path: `sample.${ext}`,
    mimeType: null,
    sha256: "sample",
    size: 1,
  });
  expect(capability.kind).not.toBe("none");
  expect(capability.originalActions).toBe(true);
});
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run: `pnpm --filter @pond/desktop exec vitest run src/renderer/src/lib/media/viewer-capability.test.ts`

Expected: FAIL because `viewer-capability.ts` does not exist.

- [ ] **Step 3: Add the viewer-capability registry**

```ts
export type FileViewerKind =
  | "pdf"
  | "audio"
  | "font"
  | "text"
  | "epub"
  | "model"
  | "archive"
  | "safe-web"
  | "native-preview"
  | "generic";

export interface ViewerCapability {
  kind: FileViewerKind;
  renderer: "built-in" | "generated" | "external";
  originalActions: true;
}

const INTERACTIVE_MODELS = new Set([
  "glb", "fbx", "obj", "3ds", "3mf", "dae", "ply", "stl",
]);

export function viewerCapabilityFor(file: SaveFile): ViewerCapability {
  const format = classifyLibraryFile(file.path, file.mimeType);
  if (format.previewKind === "pdf") return builtIn("pdf");
  if (format.previewKind === "audio") return builtIn("audio");
  if (format.previewKind === "font") return builtIn("font");
  if (format.previewKind === "text") return builtIn("text");
  if (format.extension === "epub") return builtIn("epub");
  if (INTERACTIVE_MODELS.has(format.extension)) return builtIn("model");
  if (["zip", "rar", "7z"].includes(format.extension)) return builtIn("archive");
  if (["html", "mhtml", "webarchive", "url"].includes(format.extension)) {
    return builtIn("safe-web");
  }
  if (canRequestNativeThumbnail(file.path)) {
    return { kind: "native-preview", renderer: "generated", originalActions: true };
  }
  return { kind: "generic", renderer: "external", originalActions: true };
}
```

- [ ] **Step 4: Route all stored files through the registry**

Replace `storedFileViewerKind`'s preview-kind switch with `viewerCapabilityFor(file).kind`. Keep direct images and video in `MediaViewer`; use `StoredFileViewer` for the kinds above.

- [ ] **Step 5: Run the focused routing tests**

Run: `pnpm --filter @pond/desktop exec vitest run src/renderer/src/lib/media/viewer-capability.test.ts src/renderer/src/lib/media/file-viewer.test.ts src/renderer/src/lib/media/units.test.ts`

Expected: PASS.

### Task 2: Turn OS thumbnails into a real full-size fallback viewer

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/save/file-viewer/index.tsx`
- Modify: `apps/desktop/src/renderer/src/components/save/file-viewer/styles.module.css`
- Modify: `apps/desktop/src/renderer/src/lib/media/url.ts`
- Test: `apps/desktop/src/renderer/src/lib/media/viewer-capability.test.ts`

- [ ] **Step 1: Add tests for design, RAW, and Office routing**

```ts
it.each(["psd", "dng", "docx", "xlsx", "pptx", "key", "pages"])(
  "uses a generated full-size viewer for .%s",
  (ext) => expect(viewerCapabilityFor(file(ext)).kind).toBe("native-preview"),
);
```

- [ ] **Step 2: Add a dedicated viewer-resolution URL helper**

```ts
export function viewerPreviewUrlFor(url: string): string {
  return withParam(url, "preview", "2048");
}
```

- [ ] **Step 3: Implement `NativePreviewViewer` with graceful fallback**

```tsx
function NativePreviewViewer(props: ViewerProps & { url: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={styles.previewRoot}>
      {!failed ? (
        <img
          className={styles.generatedPreview}
          src={viewerPreviewUrlFor(props.url)}
          alt={props.save.title ?? props.file.path}
          onError={() => setFailed(true)}
        />
      ) : (
        <GenericFileCard {...props} message="No preview provider is installed for this format." />
      )}
      <FileBar {...props} />
    </div>
  );
}
```

Use `object-fit: contain`, a neutral checkerboard-compatible background, and a loading state. Keep Open and Export visible in the persistent file bar.

- [ ] **Step 4: Verify the existing native-thumbnail engine accepts every generated-preview route**

Run: `pnpm --filter @pond/desktop exec vitest run src/main/lib/thumbnail.test.ts src/renderer/src/lib/media/viewer-capability.test.ts`

Expected: PASS.

### Task 3: Add interactive 3D viewing for open model formats

**Files:**
- Modify: `apps/desktop/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/desktop/src/renderer/src/components/save/model-viewer/index.tsx`
- Create: `apps/desktop/src/renderer/src/components/save/model-viewer/styles.module.css`
- Create: `apps/desktop/src/renderer/src/components/save/model-viewer/load-model.ts`
- Create: `apps/desktop/src/renderer/src/components/save/model-viewer/load-model.test.ts`
- Modify: `apps/desktop/src/renderer/src/components/save/file-viewer/index.tsx`

- [ ] **Step 1: Add Three.js**

Run: `pnpm --filter @pond/desktop add three`

Expected: `three` is added to desktop dependencies and the lockfile is updated.

- [ ] **Step 2: Write extension-to-loader tests**

```ts
it.each([
  ["glb", "gltf"], ["fbx", "fbx"], ["obj", "obj"], ["stl", "stl"],
  ["ply", "ply"], ["3mf", "3mf"], ["3ds", "3ds"], ["dae", "dae"],
])("maps .%s to the %s loader", (extension, loader) => {
  expect(modelLoaderKind(extension)).toBe(loader);
});
```

- [ ] **Step 3: Implement lazy loader adapters**

Load `GLTFLoader`, `FBXLoader`, `OBJLoader`, `STLLoader`, `PLYLoader`, `ThreeMFLoader`, `TDSLoader`, and `ColladaLoader` from `three/addons/loaders/*` only when the model viewer opens. Normalize geometry-only results into a `THREE.Mesh` with a neutral `MeshStandardMaterial`.

- [ ] **Step 4: Implement the canvas viewer**

Create a scene with a perspective camera, hemisphere and directional lights, `OrbitControls`, resize observation, model bounds fitting, animation playback, grid toggle, reset-camera button, and full disposal of geometries, materials, textures, controls, animation frames, and the renderer.

- [ ] **Step 5: Fall back to `NativePreviewViewer` when a loader fails**

Loader errors must show the generated OS preview and original-file actions, not a blank WebGL canvas.

- [ ] **Step 6: Run model routing tests and typecheck**

Run: `pnpm --filter @pond/desktop exec vitest run src/renderer/src/components/save/model-viewer/load-model.test.ts src/renderer/src/lib/media/viewer-capability.test.ts && pnpm --filter @pond/desktop typecheck`

Expected: PASS.

### Task 4: Add EPUB reading and archive inspection

**Files:**
- Modify: `apps/desktop/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/desktop/src/renderer/src/components/save/epub-viewer/index.tsx`
- Create: `apps/desktop/src/renderer/src/components/save/epub-viewer/styles.module.css`
- Create: `apps/desktop/src/renderer/src/components/save/archive-file-viewer/index.tsx`
- Create: `apps/desktop/src/renderer/src/components/save/archive-file-viewer/styles.module.css`
- Modify: `apps/desktop/src/renderer/src/components/save/file-viewer/index.tsx`

- [ ] **Step 1: Add sandboxed EPUB and ZIP parsing dependencies**

Run: `pnpm --filter @pond/desktop add epubjs jszip`

Expected: both packages are added to desktop dependencies.

- [ ] **Step 2: Implement `EpubViewer`**

Fetch the `pond://` URL as an `ArrayBuffer`, call `book.open(buffer, "binary")`, render with `flow: "scrolled-doc"`, and leave `allowScriptedContent` unset so EPUB JavaScript remains disabled. Add previous/next buttons, table-of-contents selection, font-size controls, progress, and cleanup through `rendition.destroy()` and `book.destroy()`.

- [ ] **Step 3: Implement bounded ZIP inspection**

Use JSZip to list at most 2,000 non-directory entries and calculate name, extension, compressed size, and uncompressed size. Refuse in-app extraction when the archive exceeds 250 MB, contains more than 10,000 entries, or advertises more than 1 GB uncompressed data. Show RAR and 7z through the generated native preview plus external Open/Export because JSZip does not decode them.

- [ ] **Step 4: Add archive guard tests**

```ts
expect(archiveSafety({ entries: 10_001, compressed: 2, uncompressed: 3 }).safe).toBe(false);
expect(archiveSafety({ entries: 3, compressed: 2, uncompressed: 3 }).safe).toBe(true);
```

- [ ] **Step 5: Run EPUB/archive tests and typecheck**

Run: `pnpm --filter @pond/desktop exec vitest run src/renderer/src/components/save/archive-file-viewer && pnpm --filter @pond/desktop typecheck`

Expected: PASS.

### Task 5: Add a non-executing offline web viewer

**Files:**
- Create: `apps/desktop/src/renderer/src/components/save/safe-web-viewer/index.tsx`
- Create: `apps/desktop/src/renderer/src/components/save/safe-web-viewer/styles.module.css`
- Create: `apps/desktop/src/renderer/src/components/save/safe-web-viewer/sanitize.ts`
- Create: `apps/desktop/src/renderer/src/components/save/safe-web-viewer/sanitize.test.ts`
- Modify: `apps/desktop/src/renderer/src/components/save/file-viewer/index.tsx`

- [ ] **Step 1: Write sanitizer tests**

```ts
expect(sanitizeOfflineHtml('<script>alert(1)</script><p onclick="x()">Safe</p>'))
  .toContain("<p>Safe</p>");
expect(sanitizeOfflineHtml('<img src="https://tracker.example/pixel">'))
  .not.toContain("tracker.example");
```

- [ ] **Step 2: Implement browser-native sanitization**

Parse with `DOMParser`, remove `script`, `iframe`, `object`, `embed`, `form`, `meta[http-equiv]`, and `base`; remove `on*`, `srcset`, `ping`, `formaction`, and non-local `src`/`href` attributes; inject `Content-Security-Policy: default-src 'none'; img-src data: pond:; style-src 'unsafe-inline'`.

- [ ] **Step 3: Render sanitized HTML in a sandboxed iframe**

Use `<iframe sandbox="" srcDoc={safeHtml} />`. Provide tabs for rendered page and source. Treat MHTML, WebArchive, and URL shortcuts as generated previews with external Open/Export until a bounded parser exists; never feed them to a live browser context.

- [ ] **Step 4: Run sanitizer tests**

Run: `pnpm --filter @pond/desktop exec vitest run src/renderer/src/components/save/safe-web-viewer/sanitize.test.ts`

Expected: PASS.

### Task 6: Test the real Eagle Format Gallery contract

**Files:**
- Create: `apps/desktop/src/renderer/src/lib/media/eagle-gallery-viewers.test.ts`
- Modify: `docs/supported-formats.md`

- [ ] **Step 1: Add the 16-file gallery table test**

```ts
it.each([
  ["jpg", "direct-image"], ["heic", "native-image"], ["psd", "native-preview"],
  ["dng", "native-preview"], ["mp4", "video"], ["wav", "audio"],
  ["pdf", "pdf"], ["docx", "native-preview"], ["xlsx", "native-preview"],
  ["pptx", "native-preview"], ["woff2", "font"], ["glb", "model"],
  ["epub", "epub"], ["zip", "archive"], ["html", "safe-web"], ["md", "text"],
])("routes .%s through %s", (ext, expected) => {
  expect(galleryViewerKind(ext)).toBe(expected);
});
```

- [ ] **Step 2: Document renderer depth separately from import support**

Update the matrix with `Interactive`, `Generated full-size preview`, and `External fallback` columns. State that Office parity is a first-page rendered preview because Eagle itself documents that limitation.

- [ ] **Step 3: Run the gallery and manifest-wide tests**

Run: `pnpm --filter @pond/desktop exec vitest run src/renderer/src/lib/media/eagle-gallery-viewers.test.ts src/renderer/src/lib/media/viewer-capability.test.ts`

Expected: PASS.

### Task 7: Complete verification

**Files:**
- Verify every file listed above without rewriting unrelated working-tree changes.

- [ ] **Step 1: Run all focused tests**

Run: `pnpm --filter @pond/desktop exec vitest run src/shared/eagle-formats.test.ts src/shared/file-format.test.ts src/renderer/src/lib/media src/renderer/src/components/save/model-viewer src/renderer/src/components/save/archive-file-viewer src/renderer/src/components/save/safe-web-viewer`

Expected: PASS.

- [ ] **Step 2: Run desktop typecheck**

Run: `pnpm --filter @pond/desktop typecheck`

Expected: PASS.

- [ ] **Step 3: Run Biome on only the viewer files**

Run: `pnpm exec biome ci apps/desktop/src/renderer/src/lib/media apps/desktop/src/renderer/src/components/save/file-viewer apps/desktop/src/renderer/src/components/save/model-viewer apps/desktop/src/renderer/src/components/save/epub-viewer apps/desktop/src/renderer/src/components/save/archive-file-viewer apps/desktop/src/renderer/src/components/save/safe-web-viewer docs/supported-formats.md`

Expected: PASS.

- [ ] **Step 4: Run the desktop suite outside the sandbox if Unix-socket tests are denied**

Run: `pnpm --filter @pond/desktop test`

Expected: PASS. If the managed sandbox denies temporary Unix sockets, rerun the identical test command with escalation and keep that environment failure separate from code failures.

- [ ] **Step 5: Build production assets**

Run: `pnpm --filter @pond/desktop build`

Expected: PASS.

- [ ] **Step 6: Verify the live gallery**

Open `Eagle Format Gallery` in Pond and check each of the 16 items. Every card must have a thumbnail or type tile; every detail page must show its interactive viewer, generated full-size preview, or explicit fallback with Open and Export.
