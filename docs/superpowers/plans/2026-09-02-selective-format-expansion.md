# Selective Format Expansion Implementation Plan

> **For Codex:** Execute this plan inline, test-first, and keep the original source file lossless. Do not add a conversion-only import path.

**Goal:** Make Pond a dependable library for PDF, HEIC/HEIF, JPEG XL, TIFF, MP3/WAV/M4A, fonts, and arbitrary files, including Eagle imports and user-supplied card thumbnails.

**Architecture:** A shared, extension-first classifier assigns every imported file a library media type, storage kind, MIME type, and preview strategy. The main process streams original files into the library without decoding them. The `pond://` protocol generates foreground OS/Sharp previews on demand for formats Chromium cannot display, while the renderer routes documents, audio, fonts, images/video, and generic files to purpose-built viewers. Custom thumbnails are stored as a distinct file kind so they affect cards without replacing or hiding the original asset.

**Tech Stack:** Electron, React, TypeScript, Drizzle/SQLite, Sharp, Vitest, CSS modules.

---

## Task 1: Shared classification and schema

- [x] Add failing classifier tests covering direct images, native-preview images, PDF, audio, fonts, text, video, and unknown files.
- [x] Add `apps/desktop/src/shared/file-format.ts` with `classifyLibraryFile`, format labels, preview helpers, and safe original filename handling.
- [x] Expand `MEDIA_TYPES` to include `audio`, `document`, `font`, and `file`.
- [x] Add the four types to the Type filter presets.
- [x] Update renderer type derivation to use the shared classifier and support long extensions such as `woff2`.
- [x] Run the focused schema and classifier tests.

## Task 2: Lossless import and metadata

- [x] Add failing manual-import unit tests for classification-to-file-kind mapping and source filename preservation.
- [x] Replace the import allowlist with all-file acceptance; reject only missing, non-file, or empty inputs.
- [x] Stream binary source files through `sourcePath` instead of reading them into memory.
- [x] Keep text-body extraction bounded while also storing the original text file.
- [x] Preserve a sanitized original filename and attach MIME, size, and best-effort image dimensions.
- [x] Compute the save media type deterministically for mixed Eagle items.
- [x] Keep original source assets as the files used by open, reveal, copy, drag, and export actions.
- [x] Run focused import tests.

## Task 3: Preview protocol and thumbnail engine

- [x] Add failing thumbnail tests for HEIC/HEIF, JXL, TIFF, PDF, font, and generic native-preview eligibility.
- [x] Export a foreground thumbnail generator from the thumbnail module.
- [x] Route Sharp-decodable images through Sharp and OS-supported documents/fonts/unknowns through Electron native thumbnails.
- [x] Add an explicit foreground preview query to `pond://` that waits for a generated WebP instead of briefly serving an undecodable source.
- [x] Preserve the existing non-blocking card thumbnail path for normal web images.
- [x] Add renderer helpers for foreground preview URLs.
- [x] Run protocol and thumbnail tests.

## Task 4: Purpose-built viewers and cards

- [x] Add failing routing/helper tests for PDF, audio, font, native-preview images, and generic files.
- [x] Add a PDF viewer using the secure `pond://` source with open/export fallback actions.
- [x] Add an audio viewer using the native media element with title, filename, format, and size context.
- [x] Add a font viewer that loads the stored font via `FontFace`, supports editable specimen text and size, and displays a glyph set.
- [x] Display HEIC/HEIF/JXL/TIFF through generated foreground previews while retaining originals for file actions.
- [x] Add a generic file viewer and extension tile for unsupported preview formats.
- [x] Add card selection that prefers a custom thumbnail, then an image/video/native preview, then the extension tile.
- [x] Keep media carousels limited to real image/video files and never include custom thumbnails as content.
- [x] Run renderer unit/component tests.

## Task 5: Custom thumbnails

- [x] Add failing persistence tests showing file-kind replacement also works when clearing a kind.
- [x] Update save patch persistence to remove replaced files from metadata even when no new file is written, and remove obsolete local blobs after the database update.
- [x] Add main-process queries to pick, set, and remove one `custom_thumbnail` file.
- [x] Add single-save context menu actions for Set Custom Thumbnail and Remove Custom Thumbnail.
- [x] Ensure custom thumbnails affect cards and aspect calculation but not viewer slides, export defaults, or original-file actions.
- [x] Run persistence, IPC, menu, card, and aspect tests.

## Task 6: Eagle and documentation

- [x] Add Eagle import tests for arbitrary source files and Eagle thumbnail detection.
- [x] Import every non-metadata Eagle asset through the shared importer.
- [x] When an Eagle item contains a thumbnail, import it as `custom_thumbnail` instead of discarding it.
- [x] Preserve Eagle title, URL, note, tags, folders, dimensions, and idempotent source ID behavior.
- [x] Add `docs/supported-formats.md` documenting storage, preview behavior, platform caveats, and original-file guarantees.
- [x] Update relevant import UI copy so it no longer implies image/video-only support.

## Task 7: Verification and cleanup

- [x] Run all focused tests after each task.
- [x] Run the full `@pond/desktop` test suite.
- [x] Run TypeScript checks and the repository linter/formatter for touched files.
- [x] Run the desktop production build.
- [x] Inspect the final diff for accidental changes, unsafe IPC exposure, and regressions in image/video workflows.
- [x] Record any platform limitation that cannot be made deterministic in automated tests.
