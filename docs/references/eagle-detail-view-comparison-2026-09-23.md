# Eagle and Pond Detail View Comparison

Audit date: September 23, 2026

## Scope and evidence

This audit compares every distinct first-party Eagle 4.0.0 detail-view class
with the current Pond working tree. It extends the
[Eagle surface inventory](eagle-4-desktop-surface-inventory.md) and
[parity audit](eagle-4-desktop-parity-audit.md), using the installed
[Eagle (2026)](../provenance/generated/REFERENCES.md#eagle-4-20260401) application as the external
reference.

Evidence used:

- live Eagle captures for raster image, video, audio, font, GIF, GIF frames,
  text, SVG, unsupported archive, and native document preview
- fresh inspection of Eagle's first-party viewer entries for GIF, RAW, font,
  text, EXIF, HDR/EXR texture, native preview, 3D model, and PDF
- live Pond captures for image and video detail
- current Pond routing and implementation for every built-in viewer kind

The extracted Eagle files were inspected from a temporary directory and were
not added to Pond. Captures remain in the ignored
`.artifacts/eagle-detail-comparison-2026-09-23/` directory. Eagle's
proprietary reuse terms are not established; this is behavioral and visual
comparison only.

## Result

Eagle has the deeper specialist viewers. Pond has the stronger core media
workspace and the broader modern file set.

- **Eagle leads:** PDF, dedicated GIF frames, HDR/EXR, EXIF, and advanced 3D
  inspection.
- **Pond leads:** raster-image editing and annotation, video review, archives,
  EPUB, Live Photo, offline-web safety, and accessible control naming.
- **Close or mixed:** SVG, audio, font, RAW, native document/design previews,
  TIFF/HEIC, presentation, and generic fallback.

Eagle's strongest systemic advantage is consistency: almost every format keeps
the same calm three-column shell while swapping a compact center toolset.
Pond's strongest systemic advantage is capability: its image and video detail
views provide more direct work without leaving the viewer.

## Complete viewer matrix

| Detail-view class | Eagle 4.0.0 | Pond current | Assessment |
| --- | --- | --- | --- |
| Raster image | Zoom, navigator, actual size, fit, flip, rotate, crop, comments, previous/next; compact toolbar in the persistent Library shell. | Preview-only versus apply-to-file modes, crop, spatial comments, rotate, flip, grayscale, histogram, zoom ratios, actual size, fit, reset, presentation, detach, background handling, keyboard pan/zoom. | **Pond leads.** Eagle is calmer; Pond is materially more capable. |
| SVG | Uses the standard image shell and zoom/navigation controls. | Routes through the same direct-image inspector as raster formats. | **Close.** Pond inherits more image tools; Eagle's presentation is more compact. |
| GIF | Standard image view plus a separate frame workspace with frame counter, scrubber, play/pause, step controls, and playback speed. | Standard image inspector with GIF playback and loop controls, but no equally complete dedicated frame strip/workspace. | **Eagle leads.** |
| Video | Native/fallback playback with seek, volume, speed, looping, full screen, transforms, and retained inspector. | Seek, speed, volume, loop and loop range, frame stepping, ten-frame shortcuts, rotate, mirror, full screen, chapters, timestamped comments, subtitles, copy frame, and save frame. | **Pond leads.** |
| Audio | Waveform, seek, play/pause, volume, speed, loop, duration, and BPM in the retained shell. | Clickable waveform with hover playback, seek, play/pause, loop, six speeds, volume, duration, BPM estimation and persistence, open, and export. | **Close; Pond slight lead** on direct interaction and analysis. |
| PDF | Full pdf.js workspace: thumbnail/outline/attachment/layer sidebar, find, page navigation, zoom, print/save, presentation, rotation, selection/hand tools, scroll modes, spreads, and document properties. | Lazy continuous page rendering with semantic page labels, resize-aware canvases, open/export fallback, and no PDF-specific navigation or inspection toolbar. | **Eagle leads by the largest common-format gap.** |
| Font | Preview, Waterfall, Glyphs, and Information modes; editable specimen, size, theme/background swatches, activation, metadata, and rename. | Specimen, Waterfall, and Characters modes; editable specimen, size, light/dark background, metadata, activation/deactivation, rename, open, and export. | **Close; Eagle slight lead** for Information mode and palette depth. |
| Text and structured text | Dedicated editable plain-text surface. | Read-only text viewer with encoding detection, JSON pretty-printing, UTF-8 conversion, copy/open/export, and JSON-to-dotLottie export. | **Mixed.** Eagle edits; Pond is safer and handles encoding/structured text better. |
| RAW camera image | Normally displays a cached or embedded raster preview in the shared image shell, with the shell's orientation, fit, and navigation behavior. Full sensor development is used as a thumbnail-generation fallback, not as the ordinary detail-view path. | Extracts an embedded RAW raster when available and otherwise requests a generated native preview, then presents that derivative in the same image interaction shell as other generated rasters. Original-file actions remain available, destructive raster edits remain absent, and Actual Size uses the decoded derivative's pixel dimensions rather than the source file's sensor metadata. | **Close.** Both products ordinarily inspect a raster derivative rather than exposing a full RAW-development workspace; Pond makes the derivative-based 1:1 meaning explicit. |
| 3D model | Full 3D viewer with navigator/sidebar, grid and edge display, materials/settings, projection controls, fit, snapshot, and export. | Interactive orbit/pan/zoom, keyboard camera control, animation playback, reset view, and grid toggle for GLB, GLTF, FBX, OBJ, 3DS, 3MF, DAE, PLY, and STL. | **Eagle leads** on inspection depth; Pond covers the core interaction. |
| URL, HTML, and MHTML | Higher-fidelity interactive saved-page/HTML surface with browser-like behavior. | Sanitized offline rendered/source modes, MHTML page switching, sandboxed iframe, and explicit disabling of scripts, forms, embeds, and network requests. | **Mixed.** Eagle wins fidelity; Pond wins safety and source transparency. |
| Native document/design preview | OS-generated previews for formats including PSD/PSB/AI, Sketch, Office/iWork, EXR/HDR, Graffle, MindNode, and DWG, with fallback to another app. | Generated native or embedded previews for generic Eagle-compatible formats, including Office previews, displayed through the shared image interaction shell with decoded-pixel Actual Size plus open/export actions. | **Close.** Eagle exposes a more proven format matrix; Pond preserves original-file actions consistently and uses one raster interaction model. |
| TIFF, TGA, HEIC/HEIF, JXL | Dedicated/native raster handling in the image shell. | TIFF/JXL via Sharp or native fallback; HEIC/HEIF via macOS/native decoding; TGA through generated native preview when available. | **Close.** Runtime support still depends on platform codecs for parts of both matrices. |
| HDR and EXR texture | Dedicated texture viewer with HDR/EXR loaders, Reinhard tone mapping, and exposure control. | Generated/native static preview with open/export; no interactive exposure or tone mapping. | **Eagle leads.** |
| EXIF | Dedicated first-party EXIF viewer entry in addition to inspector metadata. | General Properties/Source inspector only; no dedicated EXIF workspace. | **Eagle leads.** |
| Archive | ZIP fixture falls back to “Open With Other Application”; no first-party archive browser was observed. | Safe ZIP/Lottie/LIVP directory inspection, size and entry-count guards, up to 2,000 displayed entries, sizes, and file-name filtering. RAR/7z route here but fall back when the browser cannot decode them. | **Pond leads.** |
| EPUB | No first-party Eagle viewer was found in the audited viewer inventory. | Built-in paginated reader with previous/next, type-size control, and table of contents. | **Pond only.** |
| Live Photo (`.livp`) | No distinct first-party Live Photo viewer was found in the audited viewer inventory. | Built-in photo/motion switcher, looping motion video, and archived WebVTT captions when present. | **Pond only.** |
| Generic unsupported file | File identity plus open-with/export fallback. | File identity plus open-in-default-app/export fallback. | **Parity.** |
| Slideshow, presentation, and detach | Inline detail, slideshow/presentation modes, and detached preview window. | Presentation and detached image/video windows, plus persistent detail inspector. | **Broad parity.** Eagle's transition between modes is more uniform. |

## Shell and interaction comparison

### Eagle

- The left Library sidebar and right inspector remain stable across formats.
- Format-specific controls are compact and visually quiet.
- Secondary operations tend to move into context menus, which reduces toolbar
  density but hides capability.
- The sampled accessibility tree exposed several icon-only controls without
  useful readable names.

### Pond

- The persistent shell is similar, with raster, temporal, specialist, and
  fallback content providers sharing stable outer chrome.
- Original and generated raster sources share the image interaction shell;
  unsupported edits are removed for generated derivatives rather than creating
  a separate preview-only surface.
- Image and video controls expose more of the work directly in the toolbar.
- The sampled image and video controls had explicit accessible names, semantic
  sliders/toggles, and status text.
- Toolbar density is higher, though action, edit, view, and multi-item
  navigation grouping is now consistent across the common viewer surfaces.

The current Pond direction should keep its richer actions and semantic control
labels while borrowing Eagle's compact grouping and cross-format placement
discipline—not Eagle's visual styling.

## Visual evidence

The complete runtime capture set is available in
[the local artifact directory](../../.artifacts/eagle-detail-comparison-2026-09-23/).

- [Eagle contact sheet](../../.artifacts/eagle-detail-comparison-2026-09-23/eagle-contact-sheet.jpg)
- [Pond image and video contact sheet](../../.artifacts/eagle-detail-comparison-2026-09-23/pond-contact-sheet.jpg)
- [Eagle GIF frame workspace](../../.artifacts/eagle-detail-comparison-2026-09-23/06-eagle-gif-frames.png)
- [Eagle font workspace](../../.artifacts/eagle-detail-comparison-2026-09-23/04-eagle-font.png)
- [Pond image detail](../../.artifacts/eagle-detail-comparison-2026-09-23/12-pond-image.png)
- [Pond video detail](../../.artifacts/eagle-detail-comparison-2026-09-23/11-pond-video.png)
- [Side-by-side Eagle and Pond CSS explorer](../../.artifacts/eagle-detail-css-comparison-2026-09-24/index.html)

## Recommended sequence

1. **Unhealthy — PDF depth.** Add page/outline navigation, search, zoom, print,
   download, rotation, and document properties before pursuing niche viewers.
2. **Unhealthy — specialist image inspection.** Add dedicated HDR/EXR exposure
   and tone mapping plus an EXIF workspace.
3. **Needs work — GIF frames.** Promote existing GIF controls into a dedicated
   frame scrubber with frame count, stepping, speed, and export/copy frame.
4. **Needs work — 3D depth.** Add fit, projection, material/background controls,
   edges, snapshot, and export while retaining keyboard camera operation.
5. **Needs work — cross-viewer chrome.** Standardize placement for open/export,
   zoom, presentation, reset, and view-mode controls across file viewers.
6. **Healthy — Pond differentiators.** Preserve chapters and comments for video,
   image inspection/editing, safe offline web rendering, archive inspection,
   EPUB, Live Photo, and explicit accessible labels.

## Verification limits

- Live Eagle coverage used representative generated fixtures, not every codec or
  hardware-dependent format.
- RAW, HDR/EXR, EXIF, advanced PDF, 3D, and some native-preview findings are
  source-derived from the installed application rather than completed live
  workflows. The RAW claim describes the ordinary detail-view route and its
  thumbnail fallback; it does not claim universal decoding for every camera or
  codec.
- Pond image and video were exercised live; the remaining Pond rows are based on
  current implementation and tests, not a release-build acceptance pass for
  every extension.
- This is not a full WCAG or keyboard audit. Accessibility findings are limited
  to the sampled runtime accessibility trees and semantic implementation.
