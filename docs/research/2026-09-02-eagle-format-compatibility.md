# Eagle format compatibility: import, thumbnails, preview, and migration

Research date: 2026-09-02
Scope: current Eagle desktop behavior documented by Eagle first-party sources, plus Pond repository evidence. Third-party marketplace plugins are deliberately excluded from the supported matrix.

## Executive answer

Eagle has two materially different compatibility promises:

1. **Ingestion is universal.** Eagle says it can add every file type; Eagle 3's launch notes explicitly use ZIP, RAR, EPUB, GDOC, and DMG as examples and say arbitrary files can be categorized, tagged, and searched. Unsupported renderers fall back to a custom thumbnail and opening the original in another app. ([current format support](https://en.eagle.cool/support/article/what-file-formats-does-eagle-support), [Eagle 3 release](https://en.eagle.cool/blog/post/eagle-3.0))
2. **Native viewing is a finite, platform-dependent subset.** The current support page labels 106 types on Windows and 115 on macOS as files that can be "previewed or played directly." Eagle does not publish an equally complete, extension-by-extension native-thumbnail matrix, so this report does not silently equate import, thumbnail generation, and full content viewing. ([current format support](https://en.eagle.cool/support/article/what-file-formats-does-eagle-support))

For Pond, the highest-value compatibility target is therefore not “implement 115 viewers.” It is:

- never reject an original because Pond cannot render it;
- retain and show Eagle's generated/custom thumbnail during migration;
- add native viewing in layers, starting with design/source files, common RAW/video edge cases, Office first-page previews, and 3D;
- make the difference between **stored**, **thumbnail available**, and **viewable here** explicit in the product model.

## Status model used in this report

| Status | Meaning |
| --- | --- |
| Import/store | The original can be added, organized, tagged, searched, exported, and opened externally. Eagle says this applies to all file types. |
| Native thumbnail | Eagle itself can render a library/card image. Eagle has not published a complete per-extension table for this status; where first-party docs are explicit, the report says so. |
| Native preview/player | Eagle's current support table says the file can be previewed or played directly in Eagle. For Office files, this is only the first page. |
| Official plugin T / V | An Eagle-App-authored format extension adds thumbnail generation (`T`), an in-app viewer (`V`), or both. |

This separation follows Eagle's own extension architecture: a format extension may provide a JavaScript thumbnail parser, an HTML viewer, or either capability independently. ([format-extension API](https://developer.eagle.cool/plugin-api/get-started/plugin-types/preview), [plugin-type overview](https://developer.eagle.cool/plugin-api/get-started/plugin-types))

## Complete current native preview/playback matrix

Every extension below is importable on both platforms. The lists preserve Eagle's current categories and spelling so they can be audited against the vendor page. “Same” means the exact listed set is shared by Windows and macOS. ([current format support](https://en.eagle.cool/support/article/what-file-formats-does-eagle-support))

### Images

| Platform | Native preview/playback extensions | Native thumbnail status |
| --- | --- | --- |
| Windows | `bmp`, `eps`, `gif`, `heic`, `heif`, `hif`, `icns`, `ico`, `jpeg`, `jpg`, `png`, `svg`, `tif`, `tiff`, `ttf`, `webp`, `avif`, `base64`, `jfif`, `insp`, `jxl`, `jpe` | Eagle does not publish a separate complete per-extension thumbnail list. Official plugins exist for stronger JXL, HEIC, AI/EPS, RAW, and LIVP thumbnail support; see below. |
| macOS | `bmp`, `gif`, `heic`, `heif`, `hif`, `icns`, `ico`, `jpeg`, `jpg`, `png`, `svg`, `tif`, `tiff`, `ttf`, `webp`, `avif`, `base64`, `jfif`, `insp`, `jxl`, `jpe` | Same documentation limitation. EPS is absent from the macOS native table and is restored by Eagle's official EPS extension on Sonoma-era macOS. |

Notes:

- `eps` is Windows-only in the current native table.
- Eagle's official table puts `ttf` under both Image and Font, and calls `base64` a format even though it is an encoding rather than a conventional filename extension. These are vendor-table artifacts, not Pond normalization recommendations. ([current format support](https://en.eagle.cool/support/article/what-file-formats-does-eagle-support))
- Eagle's official JXL plugin explicitly provides both thumbnails and previews and recommends refreshing existing thumbnails after installation. ([JXL extension](https://community.eagle.cool/plugin/jxl-format-extension))

### Design and source files

| Platform | Native preview extensions | Compatibility notes |
| --- | --- | --- |
| Both | `af`, `afdesign`, `afphoto`, `afpub`, `ai`, `c4d`, `cdr`, `clip`, `dwg`, `graffle`, `idml`, `indd`, `indt`, `psb`, `psd`, `psdt`, `skp`, `xd`, `xmind` | Eagle expands these as Affinity, Adobe, Cinema 4D, CorelDRAW, Clip Studio Paint, AutoCAD, OmniGraffle, InDesign, Photoshop, SketchUp, Adobe XD, and XMind formats. |
| macOS only | `mindnode`, `pxd`, `Principle`, `sketch`, `skt` | Eagle labels `pxd` as Pixelmator Pro and lists Principle and Sketch-family formats only on macOS. |
| Windows only | None beyond the shared list | — |

The current table calls all of these directly previewable, but it does not promise faithful editing or a native-document renderer. AI compatibility can depend on the file containing PDF-compatible data; Eagle's own AI/EPS extension tells users to re-save AI with “Create PDF Compatible File” if parsing fails. ([current format support](https://en.eagle.cool/support/article/what-file-formats-does-eagle-support), [AI/EPS extension](https://community.eagle.cool/plugin/vector-format-extension))

### Video

| Platform | Native player container extensions | Documented codec/player scope | Native thumbnail status |
| --- | --- | --- | --- |
| Both | `m4v`, `mp4`, `webm`, `mov`, `mkv`, `flv`, `f4v`, `ts`, `mts`, `m2ts`, `3gp` | H.264, H.265/HEVC, AV1, VP9, VP8, and Apple ProRes; MOV alpha/transparency is supported. | The main matrix does not separately enumerate thumbnail generation. Eagle's official Video Thumbnail extension adds thumbnail-only coverage for a broader extension set. |

Container extension and encoded codec are separate compatibility dimensions. Eagle 4 Build 18 describes the rewritten video engine, including Apple ProRes, TS, and transparent MOV playback, and says the enhanced macOS engine requires macOS 14 or later; the current format table is the authoritative extension list above. ([Build 18 release](https://en.eagle.cool/blog/post/eagle4-build18), [current format support](https://en.eagle.cool/support/article/what-file-formats-does-eagle-support))

### Audio

| Platform | Native playback extensions | Native thumbnail status |
| --- | --- | --- |
| Both | `aac`, `flac`, `m4a`, `mp3`, `ogg`, `wav` | Not separately enumerated by Eagle's current format table. |

### Documents and Office

| Platform | Native preview extensions | Preview depth |
| --- | --- | --- |
| Both | `txt`, `pdf`, `potx`, `ppt`, `pptx`, `xls`, `xlsx`, `doc`, `docx`, `eddx`, `emmx` | Eagle says Office documents such as PPT, DOC, and XLS are previewed only on the first page; complete documents must be opened in the default/native app. PDF is listed as a direct preview format. |
| macOS only | `key`, `numbers`, `pages` | Listed as directly previewable by the current macOS table. |

The first-page limitation is an intentional quick-identification view, not complete Office browsing or editing. ([document-format overview](https://en.eagle.cool/support/article/what-document-and-office-file-formats-can-eagle-preview), [Office first-page limitation](https://en.eagle.cool/support/article/why-can-eagle-only-preview-the-first-page-of-ppt-doc-and-xls-files))

### Fonts

| Platform | Native preview extensions | Notes |
| --- | --- | --- |
| Both | `ttf`, `ttc`, `otf`, `woff` | Eagle lists these as direct preview formats. `woff2` is not present in the current table. |

### Archives

| Platform | Import/store | Native thumbnail | Native archive-content preview | Official Eagle-App format plugin |
| --- | --- | --- | --- | --- |
| Both | Yes, including ZIP and RAR | No archive-content thumbnail matrix; users may assign a custom thumbnail | No. Eagle explicitly says it cannot directly preview images inside ZIP, RAR, or other compressed files; use an archive app or extract and re-import. | None documented. Third-party marketplace tools are outside this first-party matrix. |

Sources: [archive preview limitation](https://en.eagle.cool/support/article/eagle-or-how-to-preview-images-inside-archive-files-in-eagle), [Eagle 3 arbitrary-file import](https://en.eagle.cool/blog/post/eagle-3.0).

### 3D

| Platform | Native preview extensions | Known native-thumbnail exclusions |
| --- | --- | --- |
| Windows | `fbx`, `obj`, `blender`, `3ds`, `3mf`, `dae`, `ifc`, `ply`, `stl`, `glb` | Eagle separately says professional formats such as 3ds Max and Maya do not receive native thumbnail previews because rendering requires specialized engines and substantial resources; users can attach manual thumbnails and open them externally. |
| macOS | `fbx`, `obj`, `3ds`, `3mf`, `dae`, `ifc`, `ply`, `stl`, `glb` | The current macOS table omits `blender`. The professional-format limitation still applies. |

`blender` is Eagle's literal entry; the usual Blender extension is `.blend`. Do not rewrite the vendor claim without an interoperability test. ([current format support](https://en.eagle.cool/support/article/what-file-formats-does-eagle-support), [3D thumbnail limitation](https://en.eagle.cool/support/article/supported-3d-file-formats-for-thumbnail-preview-what-about-3ds-max-and-maya))

### Web

| Platform | Native preview extensions | Notes |
| --- | --- | --- |
| Both | `html`, `mhtml`, `url` | Eagle 4 added HTML/MHTML webpage support; the current table also includes URL shortcut files. |

Sources: [current format support](https://en.eagle.cool/support/article/what-file-formats-does-eagle-support), [Eagle 4 release](https://en.eagle.cool/blog/post/eagle4).

### Other: textures and camera RAW

| Group | Platform | Native preview extensions | Notes |
| --- | --- | --- | --- |
| Texture/HDR | Both | `dds`, `exr`, `hdr`, `tga` | Listed as directly previewable. |
| Camera RAW | Both | `3fr`, `arw`, `cr2`, `cr3`, `crw`, `dng`, `erf`, `mrw`, `nef`, `nrw`, `orf`, `otf`, `pef`, `raf`, `raw`, `rw2`, `sr2`, `srw`, `x3f` | `otf` is almost certainly a vendor documentation anomaly because it is also listed as a font and is not a camera RAW format. Preserve the literal table for audit, but do not classify OTF as RAW in Pond. |

The Eagle-App-authored RAW extension gives a cleaner practical RAW set—`arw`, `cr2`, `cr3`, `crw`, `dng`, `raf`, `rw2`, `orf`, `nef`, `nrw`, `raw`, `3fr`, `erf`, `srw`, `mrw`, `x3f`, `pef`—and provides high-quality thumbnails plus previews on Windows through Microsoft's Raw Image Extension. ([RAW extension](https://community.eagle.cool/plugin/eagle-extension-raw), [current format support](https://en.eagle.cool/support/article/what-file-formats-does-eagle-support))

## Official Eagle-App format extensions

This is the complete set of current format extensions visibly authored by **Eagle App** in Eagle's official marketplace as of the research date. Marketplace entries by other developers are not counted as first-party compatibility. ([official format-plugin catalog](https://community.eagle.cool/plugins/format))

| Extension | File extensions | Adds thumbnail (`T`) | Adds viewer (`V`) | Important constraints |
| --- | --- | --- | --- | --- |
| JXL Format Extension | `jxl` | Yes | Yes | WebAssembly decoder; refresh existing thumbnails after installation. ([plugin](https://community.eagle.cool/plugin/jxl-format-extension)) |
| RAW Format Extension | `arw`, `cr2`, `cr3`, `crw`, `dng`, `raf`, `rw2`, `orf`, `nef`, `nrw`, `raw`, `3fr`, `erf`, `srw`, `mrw`, `x3f`, `pef` | Yes | Yes | Requires Windows Raw Image Extension. ([plugin](https://community.eagle.cool/plugin/eagle-extension-raw)) |
| Live Photo Format Extension | `livp` | Yes | Yes | Static thumbnail plus interactive double-click preview. ([plugin](https://community.eagle.cool/plugin/eagle-extension-livp)) |
| AI, EPS Format Extension | `ai`, `eps` | Preview parsing is documented; thumbnail status is not stated separately | Yes | Ghostscript-based; AI may need PDF-compatible save data. ([plugin](https://community.eagle.cool/plugin/vector-format-extension)) |
| EPS Format Extension | `eps` | Yes | Yes | Compatibility supplement for macOS Sonoma after native EPS support disappeared; converts EPS to PNG for display. ([plugin](https://community.eagle.cool/plugin/eps-format-extension)) |
| HEIC Format Extension | `heic` | Yes | Yes | Official compatibility supplement, particularly relevant on Windows; listed by Eagle App in the official format catalog. ([plugin](https://community.eagle.cool/plugin/heic-format-extension), [Eagle 4 release](https://en.eagle.cool/blog/post/eagle4)) |
| ePub Format Extension | `epub` | Yes | Yes | Full reading UI; current release notes explicitly mention improved thumbnail generation for image-based EPUB. ([plugin](https://community.eagle.cool/plugin/epub-format-extension)) |
| SWF Format Extension | `swf` | Yes | Yes | In-app interactive SWF animation/game preview using Ruffle; plugin required. ([plugin](https://community.eagle.cool/plugin/eagle-plugin-swf), [Eagle 4 release](https://en.eagle.cool/blog/post/eagle4)) |
| Video Thumbnail Extension | `3gp`, `avi`, `av1`, `f4v`, `flv`, `hevc`, `m4v`, `mkv`, `mov`, `mp4`, `mpeg`, `mpg`, `ogv`, `rm`, `rmvb`, `ts`, `vp8`, `vp9`, `webm`, `wmv` | Yes | **No** | Thumbnail-only; requires FFmpeg. The plugin page says an integrated player is future work. ([plugin](https://community.eagle.cool/plugin/f1faafc3-d00e-4f0a-b525-18f7f6ab9159?categoryId=6)) |

Two practical conclusions follow:

- “Plugin-supported” must not become one boolean in Pond. Eagle's Video Thumbnail extension proves that thumbnail generation and playback are independent capabilities.
- Several plugin extensions overlap the native table. They are compatibility supplements or stronger decoders, not evidence that the original format cannot be imported without the plugin.

## Release-note discrepancies and conservative interpretation

Eagle 4's 2024 launch post announced additional video entries `gifv`, `afx`, `eva`, and `vap`, plus `swf` and `epub` through plugins. The current 2026 support table omits the first four, while retaining SWF/EPUB only through official extensions. Therefore this report treats the current table as the source of truth for built-in direct viewing and records the release-only entries as **historical/unclear**, not current native promises. ([Eagle 4 release](https://en.eagle.cool/blog/post/eagle4), [current format support](https://en.eagle.cool/support/article/what-file-formats-does-eagle-support))

The official “106 Windows / 115 macOS” counts should likewise be treated as vendor counts. The literal Windows category rows total 109 entries (106 if the three Web/Other entries are omitted) and 107 unique tokens after the obvious TTF/OTF duplicates. The macOS rows total 115 but only 113 unique tokens after those duplicates. The published rows also contain nonstandard labels (`base64`, `blender`), so the headline numbers are not a clean count of unique conventional extensions.

## Migration and library-package behavior

### What Eagle guarantees

- `.eaglepack` is an Eagle-specific transfer package. Eagle's detailed import/export article says it retains tags **except tag groups**; exporting/importing a folder preserves category organization and hierarchy. Eagle positions it for sharing selected resources or backing up part of a library without copying the entire library. ([EaglePack import/export](https://en.eagle.cool/support/article/import-exporting-eaglepacks))
- A separate Eagle support article describes EaglePack transfer as preserving tags, annotations, other metadata, and the organized categorization structure across computers. Read with the detailed article above, “complete” preservation still excludes tag groups. ([cross-computer EaglePack preservation](https://en.eagle.cool/support/article/are-tags-and-metadata-preserved-when-importing-an-eaglepack-on-a-different-computer))
- Eagle says it does not modify embedded original-file metadata: EXIF and other metadata are preserved on both import and export. ([EXIF preservation](https://en.eagle.cool/support/article/does-eagle-preserve-exif-and-other-metadata-when-importing-and-exporting-images))
- Unsupported originals remain valuable migration payloads because Eagle stores arbitrary file types and permits custom thumbnails rather than converting the original. ([Eagle 3 arbitrary-file import](https://en.eagle.cool/blog/post/eagle-3.0))
- Folder-level package context matters. Eagle says a whole-folder EaglePack preserves subfolder hierarchy, tags, ratings, and colors across Windows and macOS; selecting individual files instead loses folder structure. ([folder-structure preservation](https://en.eagle.cool/support/article/does-an-exported-eaglepack-maintain-folder-structure-when-imported-to-another-computer))
- Manual item order also lives at folder level: Eagle says it is preserved only when the whole folder is exported, not when individually selected files are packaged. ([custom-sort preservation](https://en.eagle.cool/support/article/will-custom-image-sorting-be-preserved-when-importing-an-eaglepack-to-another-device))
- A live Eagle library is centralized copied storage rather than a reference index over originals; each library owns its folders, tags, files, notes/comments, and other metadata. Eagle also warns against different Eagle versions editing the same shared live library. ([what is a library](https://en.eagle.cool/support/article/what-is-the-library), [copying rather than indexing](https://en.eagle.cool/support/article/eagle-imports-files-by-copying-rather-than-indexing-the-original-files), [mixed-version warning](https://en.eagle.cool/support/article/can-i-share-the-same-library-between-different-eagle-versions))

### What Pond currently imports

Pond's current importer reads an unpacked Eagle `.library` folder, walks `images/*.info`, preserves every visible original file, separates a generated/custom thumbnail, and maps title, source URL, annotation, tags, dimensions, and folder membership. It skips deleted items and password-protected folders. ([Eagle importer](../../apps/desktop/src/main/core/eagle-import.ts))

The importer does **not** currently accept `.eaglepack` files or preserve Eagle tag groups, folder-level custom sort order, ratings, item colors, or comments outside its explicit schema. That means package-only migration and less-common item metadata require a separate compatibility decision rather than being assumed to work. ([Eagle importer](../../apps/desktop/src/main/core/eagle-import.ts))

Pond's viewer classifier currently has explicit rendering paths for:

- images: `jpg`, `jpeg`, `png`, `gif`, `webp`, `avif`, `svg`, `bmp`, `ico`, plus native-thumbnail images `heic`, `heif`, `jxl`, `tif`, `tiff`;
- video: `mp4`, `webm`, `mov`, `m4v`, `mkv`, `avi`, `ogv`, `gifv`;
- audio: `mp3`, `wav`, `m4a`, `aac`, `flac`, `ogg`, `oga`, `opus`;
- PDF, fonts `ttf`/`otf`/`woff`/`woff2`, and text `txt`/`md`/`markdown`.

Everything else becomes a generic file unless its supplied MIME type selects an existing image/video/audio/PDF/font path. ([Pond file classifier](../../apps/desktop/src/shared/file-format.ts))

This is already a strong migration foundation: even when Pond cannot render an Eagle original, the importer can retain the original and reuse Eagle's thumbnail for the card. The gap is primarily **in-app viewing and explicit capability reporting**, not data survival.

## Pond compatibility priorities

### P0 — migration must never lose an original

1. Keep the current arbitrary-file import behavior and add a regression corpus covering at least one unknown design file, RAW, Office document, archive, 3D model, and multi-file Eagle item.
2. Preserve Eagle's supplied thumbnail independently of viewer capability. A thumbnail is not a converted replacement for the original.
3. Produce a migration summary that distinguishes imported originals, reused thumbnails, natively viewable files, generic files, skipped deleted items, and password-protected folders.

### P1 — close the highest-frequency visual gaps

1. Design/source thumbnails and previews: PSD/PSB, AI/EPS, Affinity, Sketch, C4D, and common CAD/source containers.
2. Video containers/codecs: add `flv`, `f4v`, `ts`, `mts`, `m2ts`, `3gp` and test codec-level behavior for H.265/HEVC, AV1, ProRes, and transparent MOV.
3. RAW: use the native OS thumbnail path first, with a clearly bounded decoder fallback where the OS cannot render.
4. Office: first-page thumbnail/preview parity for DOC/DOCX, PPT/PPTX/POTX, XLS/XLSX, plus Apple iWork on macOS. Full editing is not required for Eagle parity.

### P2 — broaden specialist viewing without coupling storage to rendering

1. 3D preview for the current Eagle set (`fbx`, `obj`, Windows-only `blender`, `3ds`, `3mf`, `dae`, `ifc`, `ply`, `stl`, `glb`), while keeping 3ds Max/Maya generic with custom thumbnails.
2. Web archives and shortcuts: safe HTML/MHTML preview and URL shortcut handling.
3. EPUB and LIVP viewers only after the common design/RAW/Office gaps; SWF should remain a security-reviewed optional viewer rather than a core ingestion requirement.

### P3 — package convenience

Add direct `.eaglepack` import only if it can be implemented and tested without depending on undocumented package internals. The existing unpacked-library importer is more important for complete migrations; EaglePack is optimized for selected sharing/partial backup and cannot retain tag groups even within Eagle.

## Recommended product model

Represent file capability as separate values, not one `supported` flag:

```text
ingest: yes | blocked
thumbnail: supplied | native | generated | none
viewer: image | video | audio | pdf | font | text | design | office | 3d | web | external-only
viewerSource: built-in | os | optional-extension
```

That model matches Eagle's real behavior, fits Pond's current custom-thumbnail migration path, and prevents an unsupported viewer from turning into a failed import.

## First-party source index

- [Eagle: What file formats does Eagle support?](https://en.eagle.cool/support/article/what-file-formats-does-eagle-support)
- [Eagle 3: all-file import and custom thumbnails](https://en.eagle.cool/blog/post/eagle-3.0)
- [Eagle 4: format extensions and added formats](https://en.eagle.cool/blog/post/eagle4)
- [Eagle format-extension API](https://developer.eagle.cool/plugin-api/get-started/plugin-types/preview)
- [Eagle official format-plugin catalog](https://community.eagle.cool/plugins/format)
- [EaglePack import/export](https://en.eagle.cool/support/article/import-exporting-eaglepacks)
- [EaglePack metadata preservation](https://en.eagle.cool/support/article/are-tags-and-metadata-preserved-when-importing-an-eaglepack-on-a-different-computer)
- [Original EXIF/metadata preservation](https://en.eagle.cool/support/article/does-eagle-preserve-exif-and-other-metadata-when-importing-and-exporting-images)
