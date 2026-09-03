# Pond vs. Eagle gap assessment

Research date: 2026-09-01. Primary, first-party Eagle sources only: the official product site, support catalog, release notes, and developer documentation. This is a documentation review, not a hands-on product test. Marketing performance figures are vendor claims, not independent benchmarks.

## Executive summary

Eagle 4 is a mature local-first desktop asset manager whose competitive depth is concentrated in four areas: high-volume capture, dense organization and filtering, broad media preview/conversion, and a large automation surface. The current public build is Eagle 4.0.0 Build 23, dated 2026-04-01; the public downloads are Windows 10+ and macOS builds. Eagle says version 5 remains in development without a release date while version 4 continues to receive maintenance and compatibility work. [Homepage](https://en.eagle.cool/) [Download page](https://en.eagle.cool/download) [Eagle 5 development update](https://en.eagle.cool/blog/post/eagle-v5-development-update)

The product is not a hosted collaborative DAM. Its library lives in a user-selected local directory, Eagle supplies no first-party cloud storage, and multi-device use depends on syncing the whole library through services such as Google Drive or Dropbox. Team sharing is therefore based on a shared library or exported package rather than a cloud-native workspace. [Local library and third-party sync](https://en.eagle.cool/support/article/is-the-eagle-library-stored-locally-or-in-the-cloud) [Sync guides](https://en.eagle.cool/support/desktop/sync) [Team-sharing guidance](https://en.eagle.cool/support/article/how-to-share-and-collaborate-on-an-eagle-library-with-your-team)

The current commercial model is a 30-day full-feature trial followed by a one-time purchase with lifetime updates. One license works on two Windows or Mac devices and includes the browser extension; the official store currently renders US$34.95 for one license. [Homepage](https://en.eagle.cool/) [Store](https://en.eagle.cool/store) [Official price notice](https://en.eagle.cool/blog/post/price-adjustment-notice-2024)

## Pond baseline in this repository

Pond is already more than a minimal image grid. The repository defines a local-first Mac archive whose on-disk Library is the source of truth and whose SQLite index is rebuildable. It ships a three-column DAM with folders, Uncategorized, list layout, an Agent pane, and an Eagle importer that retains folder trees. [Product context](../../CONTEXT.md) [Desktop architecture](../../apps/desktop/README.md)

Capture is optimized for saved web material rather than arbitrary page asset extraction. The extension saves the current page, link, image, video, or audio; intercepts native save/like actions on supported sites; and hands work to the desktop app over native messaging. Pond also connects accounts and watches remote lists across Twitter, Instagram, Pinterest, Are.na, Cosmos, TikTok, YouTube, Reddit, and Threads. [Extension README](../../apps/extension/README.md) [Supported sources](../supported-sources.md) [Extension background implementation](../../apps/extension/entrypoints/background.ts)

The desktop already imports files, folders, clipboard images/files, batches of links, manual notes, and Eagle libraries; it exports selected files and CSV metadata. The current Eagle importer preserves files, names, tags, folder membership and hierarchy, source URLs, notes, and dimensions, while skipping deleted items and password-protected folders. It does not currently read Eagle ratings, palette data, custom thumbnails, image-region comments, or timestamped video notes. [Import handlers](../../apps/desktop/src/main/ipc/queries/saves-import.ts) [Eagle importer](../../apps/desktop/src/main/core/eagle-import.ts) [Export handlers](../../apps/desktop/src/main/ipc/queries/saves-export.ts)

Pond's search schema already exposes tags, folders, liked/saved state, source, media type, file count, duration, shape, aspect ratio, creator, account, note/caption/transcript presence, color, and saved/published/modified dates. The Library can also store captions, OCR, transcripts, text embeddings, CLIP embeddings, perceptual hashes, suggested tags, video notes, and dominant colors. [Filter descriptors](../../packages/schema/src/filters/fields/index.ts) [Save schema](../../packages/schema/src/db.ts)

The Agent is a current differentiator rather than a future placeholder. It supports local Minnow or user-supplied OpenAI, Anthropic, Gemini, Ollama, LM Studio, and compatible endpoints, and exposes a local stdio MCP server. Today's MCP tools are deliberately read-oriented: search the Library, read a Save, list folders, and focus Pond on a Save. [README Agent section](../../README.md) [MCP implementation](../../apps/desktop/src/main/core/agent/mcp.ts)

The roadmap in the repository already names ratings, duplicate merge, spacebar browse, GIF/video-frame tools, annotations, batch rename, detached windows, and a JavaScript plugin host as later work. It explicitly excludes Eagle Cloud, a Plugin Center store, and Photoshop-class format preview. [README Library section](../../README.md)

## Capability inventory

### 1. Ingestion and capture

| Capability | What Eagle documents |
| --- | --- |
| Local import | Files and folders can be imported through desktop flows; Eagle also supports libraries/Eaglepacks, clipboard input, screenshots, watched-folder Auto-Import, batch URL import, bookmarks, text notes/templates, fonts, audio, and imports aimed at ArtStation and Pinterest. [Desktop feature index](https://en.eagle.cool/support/desktop) [Collect index](https://en.eagle.cool/support/desktop/collect) |
| Browser capture | The official Chrome, Edge, Safari, and Firefox extensions expose image drag-and-drop, context-menu save, Alt/Option-right-click capture, one-click HD extraction, batch page extraction, and area/element/full-page screenshots. Batch capture can filter by size and format and apply folders and tags before saving. [Extension page](https://en.eagle.cool/extensions) [Homepage capture section](https://en.eagle.cool/) |
| Links and embedded media | Eagle can save web bookmarks, YouTube/Vimeo video bookmarks, and batches of pasted URLs. Build 12 classifies pasted direct image URLs as images and ordinary page URLs as bookmarks. [Desktop feature index](https://en.eagle.cool/support/desktop) [Build 12 release notes](https://en.eagle.cool/blog/post/eagle4-build12) |
| Desktop capture | Beyond the extension, the app documents global screenshot capture, clipboard collection, drag-and-drop from other applications, and a collect window. [Desktop feature index](https://en.eagle.cool/support/desktop) [Homepage capture section](https://en.eagle.cool/) |
| Import storage behavior | Eagle's standard import model copies source files into its managed library rather than merely indexing external originals. The support catalog also lists an "Import Existing Files" path intended to avoid duplicate disk usage, so its exact constraints should be validated before treating reference-only import as general behavior. [Copy-versus-indexing guidance](https://en.eagle.cool/support/article/does-eagle-import-files-by-copying-or-indexing) [Support catalog](https://en.eagle.cool/support/all-articles) |

This is an unusually complete capture funnel: Eagle handles the common path from noticing an asset on the web to filing it with metadata without requiring a later cleanup pass.

### 2. Organization and metadata

Eagle documents hierarchical folders, an asset belonging to multiple folders, tags and tag groups, 0–5-star ratings, image comments, timestamped video notes, smart folders, automatic folder tags, folder passwords/application lock, custom thumbnails, batch rename/move/create, exact-duplicate scanning, and fuzzy similar-image scanning. [Desktop feature index](https://en.eagle.cool/support/desktop) [Homepage organization section](https://en.eagle.cool/)

Its public item API confirms that the core record includes name, extension, source URL, annotation, tags, multiple folder IDs, an extracted color palette, dimensions, file size, star rating, import and modification times, deletion state, local file paths, and thumbnail/preview locations. The same API can query or mutate many of those fields and replace a file while retaining its record. [Official Item API](https://developer.eagle.cool/plugin-api/api/item)

Eagle 4 separates exact duplicate detection from visually similar-image detection and can scan the entire library, the current list, or only selected items. The vendor also says the tag manager and tag panel remain efficient beyond 20,000 tags. [Eagle 4 release](https://en.eagle.cool/blog/post/eagle4)

Build 12 added file replacement that preserves tags and other organization, while the desktop support index documents bulk tag/folder operations, batch file/folder renaming, and Eaglepack export for moving an organized selection. [Build 12 release notes](https://en.eagle.cool/blog/post/eagle4-build12) [Desktop feature index](https://en.eagle.cool/support/desktop)

One important metadata boundary: Eagle's tags live in its library metadata rather than being automatically written back into the source file's EXIF/IPTC metadata. [Official metadata FAQ](https://en.eagle.cool/support/article/are-eagle-tags-written-into-image-exif-or-metadata)

### 3. Search and retrieval

The ordinary search surface combines keyword/fuzzy search with saved filters and smart folders. Official support lists filters for tags, color, shape, dimensions, aspect ratio, file type, rating, date, size, image comments, notes, source URL, BPM, and installed-font state. [Search index](https://en.eagle.cool/support/desktop/search) [Desktop feature index](https://en.eagle.cool/support/desktop)

Build 12 expanded the query syntax with OR/`||`, parenthesized groups, quoted phrases, and negative terms. The official API also supports restricted queries by IDs, current selection, untagged/unfiled status, keywords, tags, folders, extension, annotation, rating, source URL, and shape. [Build 12 release notes](https://en.eagle.cool/blog/post/eagle4-build12) [Official Item API](https://developer.eagle.cool/plugin-api/api/item)

Eagle separately provides color search, random/shuffle browsing, reverse web image search, Pinterest visual search, exact duplicates, and visually similar local images. Its homepage claims that advanced filters locate assets in under 0.5 seconds, which should be treated as a vendor claim rather than a benchmark. [Homepage search section](https://en.eagle.cool/) [Eagle 4 duplicate-search release notes](https://en.eagle.cool/blog/post/eagle4)

The official AI Search plugin adds two distinct local search modes: visual similarity from a reference image and natural-language retrieval over searchable text such as filenames, descriptions, and notes. The text mode does not directly infer image content from a text prompt; libraries with sparse metadata therefore remain hard to retrieve. Indexes are per library, analysis is advertised as local/offline, and current releases make indexing opt-in for each library. [AI Search announcement](https://en.eagle.cool/blog/post/eagle-plugin-ai-search) [AI Search support guide](https://en.eagle.cool/support/article/ai-search) [Official plugin listing](https://community.eagle.cool/plugin/ai-search)

### 4. File formats, preview, and light editing

Eagle says arbitrary file formats can be imported and organized, but native thumbnail, preview, playback, and editing support is narrower and sometimes requires a format plugin. That distinction matters more than headline format counts. [Homepage format claim](https://en.eagle.cool/) [Eagle 3 format architecture](https://en.eagle.cool/blog/post/eagle-3.0)

The first-party desktop and release documentation establishes native or plugin-assisted handling across images and RAW files, design formats such as PSD/AI/SVG, documents and PDFs, GIF/animation, audio, video, fonts, 3D models, web archives, bookmarks, and EPUB/SWF. Eagle 4 specifically added EPS, AVIF, JPEG XL, JFIF/JPE/INSP, H.265/GIFV/3GP/AFX/EVA/VAP, HTML/MHTML, and 3DS/3MF/DAE/IFC/PLY/STL/GLB; EPUB and SWF were listed as plugin-dependent. [Eagle 4 format table](https://en.eagle.cool/blog/post/eagle4) [Desktop feature index](https://en.eagle.cool/support/desktop)

Build 18 expanded playback to include MOV alpha, ProRes, TS, FLV/F4V, MTS/M2TS, MKV, 3GP, and mainstream codecs, with the enhanced macOS playback engine requiring macOS 14 or later. [Build 18 release notes](https://en.eagle.cool/blog/post/eagle4-build18)

Browsing modes include waterfall/justified/grid/list layouts, detail and presentation modes, random and grayscale views, hover and spacebar preview, multiple preview windows, pinned desktop previews, zoom, external-app opening, video/GIF/audio/font viewers, and image comparison. [Desktop browse index](https://en.eagle.cool/support/desktop/browse) [Official preview guide](https://en.eagle.cool/blog/post/how-to-preview-files-in-eagle) [Homepage preview section](https://en.eagle.cool/)

Light media work includes rotate, horizontal flip, crop, image combine/collage, lossless image compression, WebP conversion, and video-to-GIF conversion. Build 12's custom export accepts 35+ input formats and 14 output formats and adds animation preservation, batch parallel conversion, quality/dimension/scale/codec controls, and reusable export presets. [Desktop import/export index](https://en.eagle.cool/support/desktop/import-and-export) [Build 12 release notes](https://en.eagle.cool/blog/post/eagle4-build12)

This is asset preparation, not a replacement for a full image or video editor: the first-party surface emphasizes preview, transform, conversion, annotation, and sending files to external apps. [Desktop browse index](https://en.eagle.cool/support/desktop/browse) [Desktop import/export index](https://en.eagle.cool/support/desktop/import-and-export)

### 5. Storage, sync, backup, and recovery

An Eagle library is a user-selected local directory containing managed files and metadata. Eagle does not provide its own cloud storage. Cross-device sync works by placing the complete library folder in a third-party sync location and disabling partial-file features such as on-demand downloads or storage optimization. [Local library and sync explanation](https://en.eagle.cool/support/article/is-the-eagle-library-stored-locally-or-in-the-cloud)

Official guides cover Dropbox, Google Drive, OneDrive, Synology Drive, portable drives, and other cloud-sync services. The support catalog also contains WebDAV, NAS, LAN, and external-drive workflows. [Sync index](https://en.eagle.cool/support/desktop/sync) [Support catalog](https://en.eagle.cool/support/all-articles)

Backups are likewise file based: the official library documentation covers backing up, importing, merging, and moving libraries, while Eaglepack export preserves files and organization for a selected package. The catalog contains recovery guidance for damaged libraries, missing folders/files, interrupted imports, and hard-drive failures, but it does not establish a built-in version history or continuous point-in-time restore system. [Library index](https://en.eagle.cool/support/desktop/library) [Desktop import/export index](https://en.eagle.cool/support/desktop/import-and-export) [Support catalog](https://en.eagle.cool/support/all-articles)

The support catalog's many sync, NAS, initialization, incomplete-download, and file-loss articles are evidence that a whole-library third-party-sync architecture has operational failure modes. They do not quantify how often failures occur. [Support catalog](https://en.eagle.cool/support/all-articles)

### 6. Automation and integrations

The non-AI automation surface includes Auto-Import watched folders, automatic folder tags, batch operations, reusable Actions, saved filters/smart folders, export presets, extensive configurable keyboard shortcuts, a browser extension, a local Web API, and an in-process plugin system. [Desktop feature index](https://en.eagle.cool/support/desktop) [Homepage organization and plugin sections](https://en.eagle.cool/) [Build 12 release notes](https://en.eagle.cool/blog/post/eagle4-build12)

Eagle plugins are JavaScript/HTML packages that can run as windows, background services, or format extensions and can use Node.js, the filesystem, third-party modules, and Eagle's item/folder/UI APIs. The local REST Web API v2 exposes library, item, folder, tag, and search operations while Eagle is running. [Plugin API overview](https://developer.eagle.cool/plugin-api) [Web API overview](https://developer.eagle.cool/web-api)

Build 22 added smart-folder and comment operations to the Plugin and Web APIs and added per-plugin enable/disable controls. [Build 22 release notes](https://en.eagle.cool/blog/post/eagle4-build22)

Official AI Action turns content-based renaming, descriptions, assignment to existing folders, tagging, ratings, and clearing metadata into reusable operations with model and instruction settings. Current documentation shows explicit selection and invocation; it does not verify an always-on trigger that runs an Action automatically on every import. [AI Action announcement](https://en.eagle.cool/blog/post/eagle-plugin-ai-action) [Quick-start guide](https://en.eagle.cool/support/article/ai-action-quick-start) [Official plugin listing](https://community.eagle.cool/plugin/ai-action)

The official MCP/Skill plugin exposes Eagle to external agents through a local service and remains labeled Beta. Its documented capabilities include metadata/folder/tag operations, tag cleanup, smart-folder CRUD, image/video annotations, and preview integrations with AI Search; categories of tools can be disabled so they are not registered. [MCP/Skill announcement](https://en.eagle.cool/blog/post/eagle-plugin-mcp-skill) [MCP setup and safety guide](https://en.eagle.cool/support/article/eagle-mcp-server) [Official MCP listing](https://community.eagle.cool/plugin/mcp-server)

### 7. Collaboration and sharing

Eagle's documented collaboration model is a shared library on cloud sync, NAS, or a LAN location, plus Eaglepack export for recipients. Official help has guides for team-sharing a library, local-network/NAS sharing, syncing libraries between computers, and sharing packages with people who do not have Eagle. [Team-sharing guide](https://en.eagle.cool/support/article/how-to-share-and-collaborate-on-an-eagle-library-with-your-team) [NAS/LAN guide](https://en.eagle.cool/support/article/how-to-share-eagle-library-in-a-local-network-or-nas-for-team-collaboration) [Eaglepack sharing](https://en.eagle.cool/support/article/how-to-share-your-library-with-friends-who-dont-have-eagle)

No first-party product page reviewed here documents cloud-native roles and permissions, presence, approvals, assignment, threaded team comments, or built-in conflict resolution/version history. This is an absence-of-documentation finding, not proof that no niche workflow or plugin can approximate one. [Team collaboration and permissions FAQ](https://en.eagle.cool/support/article/does-eagle-support-team-collaboration-and-permission-management) [File-management FAQ index](https://en.eagle.cool/support/faq/file-management)

Licenses are individual and one key covers two devices; sharing one key is therefore not a documented substitute for team identity and access control. [Store](https://en.eagle.cool/store) [License-sharing FAQ](https://en.eagle.cool/support/article/share-eagle-license-key)

### 8. Performance and scale

Eagle 4's published internal figures claim a 20% faster launch, 20–40% faster library loading, 400–800% faster HEIC decoding, 200–400% faster high-resolution decoding, 200% faster file-list rendering, and 20–30% lower memory use for libraries above 100,000 items. The same release says the tag manager and tag panel remain efficient above 20,000 tags. These are vendor figures without a published benchmark methodology. [Eagle 4 release](https://en.eagle.cool/blog/post/eagle4)

Later releases targeted large-library rendering, GIF playback, color analysis, high-resolution browsing, video hover previews, and partial-field API queries. The Item API explicitly recommends field projection and constrained queries for large libraries and warns against unrestricted retrieval at roughly 200,000+ items. [Build 12 release notes](https://en.eagle.cool/blog/post/eagle4-build12) [Build 22 release notes](https://en.eagle.cool/blog/post/eagle4-build22) [Official Item API](https://developer.eagle.cool/plugin-api/api/item)

The homepage claims advanced-filter results in under 0.5 seconds even across large collections; again, this is positioning rather than independently validated performance. [Homepage](https://en.eagle.cool/)

## Platform and pricing snapshot

| Area | Current documented state |
| --- | --- |
| Desktop | Eagle 4.0.0 Build 23, dated 2026-04-01. Windows 10+; macOS downloads include Apple Silicon and Intel builds, with supported macOS floors shown on the download page. [Download page](https://en.eagle.cool/download) |
| Mobile, web, Linux | No current first-party mobile, web, or Linux client is offered on the download page. Eagle's support catalog treats mobile/tablet, web, and Linux as compatibility/future-plan questions rather than current download targets. [Download page](https://en.eagle.cool/download) [Mobile/tablet FAQ](https://en.eagle.cool/support/article/will-eagle-have-a-mobile-or-tablet-version-in-the-future) [Linux FAQ](https://en.eagle.cool/support/article/is-eagle-client-available-for-linux) |
| Trial | 30-day full-feature trial. [Homepage](https://en.eagle.cool/) |
| License | One-time purchase, lifetime access and updates, one key for two Windows/macOS devices, unlimited deactivations, browser extension included. [Store](https://en.eagle.cool/store) |
| Price | The store rendered US$34.95 for one license on the research date; Eagle's latest explicit price notice also lists US$34.95 per set and US$17.47 per additional device. Regional taxes/currency may vary. [Store](https://en.eagle.cool/store) [Official price notice](https://en.eagle.cool/blog/post/price-adjustment-notice-2024) |

## Official-document conflicts and limits

- Eagle's current homepage and download page identify Build 23, while the detailed release-note trail inspected here stops at Build 22. Features attributed to Build 23 beyond the public build number were therefore not inferred. [Homepage](https://en.eagle.cool/) [Build 22 release notes](https://en.eagle.cool/blog/post/eagle4-build22)
- Format counts vary by source and age. The defensible distinction is that Eagle can store arbitrary formats, previews many creative formats natively, and uses plugins or custom thumbnails for some others. [Homepage](https://en.eagle.cool/) [Eagle 4 release](https://en.eagle.cool/blog/post/eagle4) [Eagle 3 release](https://en.eagle.cool/blog/post/eagle-3.0)
- Marketing claims such as sub-0.5-second search and quantified performance multipliers have not been independently tested. [Homepage](https://en.eagle.cool/) [Eagle 4 release](https://en.eagle.cool/blog/post/eagle4)
- Support-page titles sometimes outlive product behavior. Newer dated release notes were preferred when a support title conflicted with a newer implementation, especially for crop and video support. [Support catalog](https://en.eagle.cool/support/all-articles) [Build 18 release notes](https://en.eagle.cool/blog/post/eagle4-build18)
- The product was not installed. Extension compatibility, large-library latency, cloud-sync conflict behavior, and AI quality/privacy were not runtime-tested.

## Gap assessment and priorities

### Must add before claiming serious Eagle parity

| Priority | Gap | Why it matters | Recommended Pond scope |
| --- | --- | --- | --- |
| P0 | Capture-to-metadata workflow | Eagle can batch-extract a page, filter candidate assets, capture screenshots, and assign folders/tags before save. Pond's extension currently sends one page/link/media URL at a time and does not request screenshot permissions. [Eagle extension](https://en.eagle.cool/extensions) [Pond extension background](../../apps/extension/entrypoints/background.ts) | Add page asset discovery with a review grid, size/type filters, original-resolution selection, area/element/full-page capture, and save-time folder/tag assignment. Preserve Pond's one-click path for normal Saves. |
| P0 | Library trust: backup, integrity, and recovery | Pond's rebuildable index is strong, but selected-file/CSV export is not a complete portable Library backup. Eagle at least documents whole-library backup/move/merge and Eaglepack transfer, although it also exposes third-party-sync fragility. [Eagle library docs](https://en.eagle.cool/support/desktop/library) [Pond export handlers](../../apps/desktop/src/main/ipc/queries/saves-export.ts) | Add verify-library, portable full-Library export/import, scheduled backup targets, restore preview, and explicit recovery guidance. Do this before encouraging very large irreplaceable libraries. |
| P0 | Fast browse and cleanup loop | Ratings, duplicate merge, spacebar browse, annotations, and batch rename are high-frequency DAM operations in Eagle and are already named on Pond's own roadmap. [Eagle desktop index](https://en.eagle.cool/support/desktop) [Pond roadmap](../../README.md) | Ship spacebar/keyboard preview first, then ratings and exact-duplicate review/merge, then batch rename and annotations. These complete everyday curation without broadening the product thesis. |
| P1 | Saved dynamic views and remaining precision filters | Pond already has unusually good source/content facets, color, aspect, duration, and date filters. Eagle still leads on reusable saved filters/smart folders and explicit extension, width/height, file-size, rating, comment, URL, BPM, camera, and installed-font filtering. [Eagle search index](https://en.eagle.cool/support/desktop/search) [Pond filters](../../packages/schema/src/filters/fields/index.ts) | Add saved views first, then rating, extension, dimensions, size, and URL. Add BPM/camera/font only alongside corresponding media workflows; do not copy low-value facets merely for count parity. |
| P1 | Eagle migration fidelity | Pond's importer already keeps core files, folder trees, tags, source URL, notes, and dimensions, which is a strong switching path. It currently drops ratings, palette data, custom thumbnails, image comments, video notes, and password-protected folders. [Pond Eagle importer](../../apps/desktop/src/main/core/eagle-import.ts) [Eagle item model](https://developer.eagle.cool/plugin-api/api/item) | Preserve ratings, custom thumbnails, comments/video notes, palette data, and import warnings. Give users a dry-run report and an explicit policy for locked folders. Migration completeness is more valuable than adding a generic new importer. |
| P1 | Useful preview coverage | Eagle's breadth across RAW/design files, PDFs/documents, audio, fonts, video, 3D, and web archives reduces context switching. Pond's thumbnail index is currently focused on common stills and a small video set, while the roadmap explicitly rejects Photoshop-class preview. [Eagle format release](https://en.eagle.cool/blog/post/eagle4) [Pond media index](../../apps/desktop/src/shared/media-index.ts) [Pond non-goals](../../README.md) | Define a support contract per format: store, thumbnail, preview, extract text/metadata, open externally. Prioritize PDF, audio waveform, fonts, common RAW, and dependable video before 3D or proprietary authoring formats. |
| P1 | Measured large-library performance | Eagle publishes aggressive 100k-item and 20k-tag claims; Pond has paged hydration, a virtualized packed grid, enrichment backfills, and a rebuildable index, but this review found no comparable public benchmark contract. [Eagle 4 release](https://en.eagle.cool/blog/post/eagle4) [Pond desktop architecture](../../apps/desktop/README.md) | Establish 10k/50k/100k Library fixtures and budgets for launch, search, scroll, preview, memory, index rebuild, and background enrichment. Treat performance as a release gate, not a marketing afterthought. |

### Add after the core DAM loop is strong

| Priority | Gap | Recommended boundary |
| --- | --- | --- |
| P2 | Watched-folder Auto-Import | Useful for screenshots, exports, downloads, and creative-tool handoff. Add local folders with deterministic move/copy behavior, dedupe, and visible processing history; do not inherit Eagle's ambiguity around monitored-file deletion. [Eagle Auto-Import index](https://en.eagle.cool/support/desktop/import-and-export) |
| P2 | Reusable actions and export presets | Pond's Agent can search and explain the Library, but repeatable, reviewable mutations are not yet a product surface. Start with tag, title, note, and existing-folder proposals with per-Save before/after approval and undo; add export presets after preview/export formats mature. [Eagle AI Action](https://en.eagle.cool/blog/post/eagle-plugin-ai-action) [Pond Agent and MCP](../../README.md) |
| P2 | Local API and mutation-capable MCP | Pond's stdio MCP is currently read-oriented, whereas Eagle exposes broad Plugin/Web APIs and Beta agent mutations. Extend Pond only after validation, audit history, bounded undo, and per-tool permissions exist. [Eagle APIs](https://developer.eagle.cool/plugin-api) [Eagle MCP](https://community.eagle.cool/plugin/mcp-server) [Pond MCP](../../apps/desktop/src/main/core/agent/mcp.ts) |
| P2 | JavaScript plugin host | The roadmap already names this. Build a narrow, versioned capability model around Saves, folders, selection, import, and preview rather than cloning Eagle's marketplace surface. [Eagle plugin API](https://developer.eagle.cool/plugin-api) [Pond roadmap](../../README.md) |

### Pond advantages to protect

1. **Source-aware capture and sync.** Eagle is stronger at generic page asset extraction; Pond understands saved-item identity, authors, captions, metrics, list kinds, and account/watch sync across nine social and curation sources. [Pond terminology](../../CONTEXT.md) [Supported sources](../supported-sources.md)
2. **Richer content enrichment.** Pond's schema already has captions, OCR, transcripts, text and CLIP embeddings, suggested tags, perceptual hashes, aesthetic labels, and dominant colors. That supports retrieval and Agent answers beyond Eagle's ordinary filename/tag workflow. [Pond Save schema](../../packages/schema/src/db.ts)
3. **A native Agent surface.** Pond already places a model-selectable Agent inside the Library and ships a local MCP server. Eagle's native conversational Agent remains exploratory; its shipped agency is split across plugins and external clients. [Pond README](../../README.md) [Eagle AI Search announcement](https://en.eagle.cool/blog/post/eagle-plugin-ai-search) [Eagle MCP/Skill announcement](https://en.eagle.cool/blog/post/eagle-plugin-mcp-skill)
4. **Recoverable architecture.** Pond treats the on-disk Library as authoritative and the SQLite database as rebuildable. Keep that invariant as richer metadata, backups, and migrations arrive. [Pond desktop architecture](../../apps/desktop/README.md)

### Deliberate non-goals

- **No Pond cloud for parity's sake.** Eagle itself has no first-party cloud storage, and Pond's product context explicitly says there is no Pond cloud. Add excellent backup/export and perhaps user-owned sync support before considering hosted infrastructure. [Eagle local-library model](https://en.eagle.cool/support/article/is-the-eagle-library-stored-locally-or-in-the-cloud) [Pond context](../../CONTEXT.md)
- **No Plugin Center marketplace.** A controlled plugin host may become useful, but discovery, payments, review, moderation, compatibility, and malware handling are a separate business. Pond's roadmap explicitly excludes Eagle's Plugin Center store. [Eagle plugin center](https://en.eagle.cool/) [Pond roadmap](../../README.md)
- **No Photoshop-class preview.** Store arbitrary files, generate useful thumbnails where feasible, and open authoring formats in their real apps. The roadmap already rejects matching deep proprietary-format rendering. [Pond roadmap](../../README.md)
- **No blanket facet parity.** BPM, camera, font, 3D, and other specialist filters should follow actual supported workflows and indexed metadata, not be empty controls added to match Eagle's menu.
- **No cloud-native collaboration unless the audience changes.** Eagle's sharing is library/file-sync based and lacks a documented modern role/presence/versioning model. Pond should not inherit the operational cost of multiuser collaboration without a clear team product thesis. [Eagle collaboration guidance](https://en.eagle.cool/support/article/how-to-share-and-collaborate-on-an-eagle-library-with-your-team)

## Recommended sequence

1. **Trust and daily speed:** full backup/restore, Library verification, spacebar preview, ratings, exact-duplicate review/merge.
2. **Capture moat:** batch page extraction, screenshots, original-resolution selection, and save-time organization.
3. **Retrieval completeness:** saved views plus extension/dimension/size/rating/URL filters; benchmark at 10k–100k Saves.
4. **Switching and media depth:** complete the Eagle importer, then add PDF/audio/font/RAW/video preview contracts.
5. **Automation with control:** watched folders, reviewable Actions, mutation audit/undo, then broader MCP/API/plugin capabilities.

This ordering closes Eagle's most consequential workflow gaps while preserving Pond's actual differentiation: source-aware capture, a rebuildable local archive, semantic enrichment, and an in-library Agent.
