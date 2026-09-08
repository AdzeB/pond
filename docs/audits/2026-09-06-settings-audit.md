# Pond Settings audit

Audited 6 September 2026. Scope: all 11 current Settings sections in the running desktop app, plus the configuration, persistence, image processing, trash, and scheduling code. This is a product and interaction audit, not an implementation change or full accessibility certification.

## Verdict

Settings has a consistent visual foundation, but its organization follows implementation boundaries more than user tasks. Small pages (Trash, MCP, Images in its default state) coexist with overloaded ones (Search, Storage, Videos). Several controls need behavioral fixes before cosmetic changes. Reduce the number of destinations, keep advanced capability available, and add state that explains what the app is doing.

## What already works

- A stable sidebar and consistent grouped rows make basic navigation predictable.
- One global fetch schedule is the right default for the product. The inline editor is compact and explains scope and timezone.
- Appearance has separate light and dark choices and follows the system. Keep this flexibility.
- Local processing features are individually optional. Keep the distinction between features, rather than a single opaque AI switch.
- Storage actions already have pending/error states, and import supports a preview.
- Model and tag empty states have clear entry actions.
- Trash retention defaults to Never. Do not weaken permanent-delete confirmation merely to simplify Settings.

## Fix first

### 1. Saving can fail silently — high priority, source confirmed

The shared preference store rolls back on a failed save without telling the user. Download preferences have the same silent rollback pattern. The initial preference load retains a rejected in-flight promise, preventing normal retry through that loader. General preference apply calls also swallow errors.

The schedule page sets its success message immediately after calling a void patch method, before persistence has succeeded. Weekday buttons do not trigger the wrapper's native change handler, so the saved message can remain after editing days.

Recommendation: establish a shared save contract with pending, success, and error outcomes. Keep simple controls automatic; a multi-field schedule can retain Save. Only confirm a completed save, preserve the draft after failure, and provide Retry. Do not add celebratory saved messages to every row. Verify concurrent edits cannot be undone by an older request failing.

Evidence: `features/settings/state/prefs.ts`; `components/sections/downloads/downloads.tsx`; `components/sections/schedule/schedule.tsx`; `lib/config-general.tsx` under the renderer source.

### 2. Trash confirmation setting has no effect — high priority, source confirmed

`confirmBeforeEmpty` is declared in the schema and displayed in Settings but is not consumed by the empty-trash action. The action always opens confirmation. Automatic retention purges independently.

Recommendation: remove the redundant switch and always confirm manual permanent deletion. Keep retention as a separate, clearly described setting: deleted saves are permanently removed after the selected time. Move these controls into Storage.

Evidence: `features/saves/lib/empty-trash.ts`, `features/settings/lib/config-trash.tsx`, `main/crons.ts`. Repository search found no behavior reading the preference.

### 3. Video file-size choices exclude the current default — high priority, visually and source confirmed

The live value appears as bare `500`. The configured options are 2, 5, 10, 25, and 50 MB, plus Unlimited, while the default is 500 MB. Users cannot select the normal default again from the menu.

Recommendation: offer useful video limits including 500 MB and larger values; always format stored/custom values with units. Audit other selects for saved values outside their option list.

![Videos showing the bare 500 value](/tmp/pond-settings-audit/07-videos.png)

### 4. Original does not mean untouched — high priority, source confirmed

Images currently shows Resolution 2048 px and Format Original. Processing can resize and reencode while retaining the original format. The format description says “keep the original,” which implies more preservation than the implementation guarantees.

Recommendation: rename the format option to Same format. If offering Keep original file, it must actually bypass transformations. Make the choice between preserving files and optimizing storage explicit. State whether these preferences apply to future downloads; do not imply existing files are changed. The image download size cap exists in the model/worker but is absent from this page; decide whether it needs a visible control or a clear skipped-download explanation.

Evidence: `main/lib/image-process.ts`, `main/core/pipeline/workers/fetch-blobs.ts`, `features/settings/lib/config-images.tsx`.

### 5. Settings search misses important custom controls — medium priority, source confirmed

The search index collects declared group items and section metadata. Storage's Move, Backup, Restore, Import, and Watched Folder controls are rendered inside a custom group without item metadata. They therefore do not have individual search entries. Check for Updates has the same problem because its custom item has no indexed title.

Recommendation: index custom actions explicitly, including synonyms such as backup, restore, import, watched folder, and updates. Results should open the right section and identify the relevant row. This finding is based on the index implementation; live query interaction was not exercised.

## Section-by-section decisions

| Current section | Health | Recommendation |
| --- | --- | --- |
| Preferences | Needs refinement | Rename General. Group startup/background behavior together. Keep updates. Use macOS menu-bar wording instead of mixing tray/menu bar. |
| Appearance | Mostly sound | Put theme before decorative app-icon choices. Keep system motion and sound controls; reconsider exposing Pointer Cursors as a user preference. |
| Fetch Schedule | Good direction, incomplete feedback | Keep global. Add next scheduled check, last result, and a visible explanation when fetching is paused, offline, or blocked by storage. |
| Tags | Wrong location | Move the manager to the library, where users organize saves. Retain a discoverable link during migration. Remove duplicate New Tag actions in the empty state. |
| Trash | Too small and partly ineffective | Merge retention into Storage; remove the unused confirmation preference. |
| Storage | Overloaded | Separate usage, location, backups, and retention. Move import and watched folders to their actual workflows. |
| Search | Misleading scope | Rename Search & Processing and group search features separately from captions, transcription, title generation, and tags. |
| Models | Ambiguous label | Rename AI Providers. It configures Agent providers, not all downloaded local models. Link clearly from features that need it. |
| MCP | Too technical as a primary label | Fold into Integrations. Explain which apps can access the library and how setup works; put protocol/config details second. |
| Videos | Useful but too technical up front | Merge with Images under Downloads. Keep quality, size limits, and subtitles prominent; put codecs, container, and embedding options in Advanced. |
| Images | Compact but ambiguous | Make an Images group within Downloads. Clarify file preservation, resizing, format, metadata, and future-download scope. |

## Proposed sidebar

Seven destinations:

1. **General** — startup, background behavior, updates; useful links to keyboard shortcuts and support.
2. **Appearance** — theme, app icon, card appearance, interface sounds, motion.
3. **Fetching** — global schedule, status, link to manage connections and watched accounts.
4. **Downloads** — image and video defaults, with advanced format controls collapsed.
5. **Search & Processing** — search behavior, captions/OCR/transcription, local model readiness and processing state.
6. **Storage & Backups** — usage, location, backups, retention, storage limits.
7. **Integrations** — AI providers and external-app access, grouped separately on the page.

Tags belongs in the library. Import belongs in the library's import flow. Watched folders belong alongside other inputs in Sources. Avoid adding deep subpages until the amount of content justifies them. Preserve old Settings routes as redirects.

This structure also resolves the misleading AI sidebar group: search is a library task, regardless of how it is implemented. Provider configuration remains available to people who need it.

## Add useful state before more switches

### Fetching

Show the next scheduled check and last outcome. Display reasons for pauses and link to their remedy. Keep the existing “while Pond is running” explanation; clarify what closing the window versus quitting does. Derive status from the actual scheduler: hourly execution includes jitter and offline/storage checks, so avoid a falsely exact countdown.

Do not add a future start date or arbitrary recurrence builder yet. Hourly, daily, weekly, and manual cover the current use case. Preserve the selected daily/weekly mode when temporarily switching to Manual instead of resetting it to hourly.

### Storage and backups

Show actual library size, ideally a useful breakdown, available disk space, and the last successful backup with destination. Backups deserve a clear action and durable history before adding automatic backup scheduling.

“Restore Library” currently opens another library and relaunches. Name the action to match this behavior, or build an actual restore workflow. “Move” retains the original; keep that consequence visible before users expect disk space to be reclaimed. Avoid literal Markdown backticks around .pond in rendered copy.

The watched-folder row offers Choose Folder but does not show its current path, status, or a way to stop watching within that row. Moving it into Sources should include those controls.

### Processing and integrations

Distinguish local computation from provider-backed requests at the feature level. Search currently mentions processing on this Mac while natural-language queries use the configured Agent model, which can be remote. Identify the provider and what is sent when a feature uses it.

Make readiness discoverable before activation: required setup, model download size, and where to manage downloads. Existing model pickers should be reused rather than replaced with a second model-management system. Add a coherent processing summary (ready, downloading, processing, paused, failed) and a way to recover failed work. Validate the existing conditional picker states before adding duplicate controls.

MCP currently exposes only a Cursor config copy action. Rename the destination Integrations; lead with connecting an external app to search the library. Keep stdio and mcp.json in setup details. Explain access scope from the actual implementation before making any security claim.

## Remove or de-emphasize

- Remove the unused trash confirmation switch, keeping confirmation behavior.
- Remove Tags as a Settings destination.
- Combine the small Images/Trash/MCP destinations into appropriate pages.
- Hide codec/container/encoding choices under Advanced; retain their functionality.
- Let the app choose storage measurement frequency; Check Interval is implementation detail for most users.
- Hide warning percentage/action when Size Limit is No Limit, or disallow the contradictory combination.
- Consider removing Pointer Cursors and defaulting to the product's chosen pointer behavior. This is a product decision, not a defect.
- Avoid more global switches without a concrete user need: background-fetch and processing status are more useful immediately.

## Visual and copy consistency

The app uses a narrow, roughly 470 px settings column in a large window. This is appropriate for simple preference rows, but action-heavy Storage and Videos feel cramped. Use one consistent baseline text/control scale; allow complex pages a modestly wider content width. Do not make every control dialog-sized.

Descriptions should explain consequences. Replace implementation terms such as “muxed,” “stdio Config,” “Usage Guard,” and “re-measure” with plain labels, retaining technical details where needed. Follow the requested heading style without unnecessary hyphenated labels. Use Fetch consistently in user-facing copy rather than alternating with Sync. Theme choices should lead Appearance; the decorative icon grid can come later.

## Recommended sequence

1. Fix persistence feedback, inert controls, unmatched options, and misleading file-preservation wording.
2. Reorganize destinations while retaining deep links and settings-search coverage.
3. Add fetch/storage/backup/processing status using existing backend data where available.
4. Apply a consistent typography, spacing, and copy pass.
5. Consider new functionality only after testing the simpler structure with real library tasks.

## Evidence and limits

Fresh screenshots are in `/tmp/pond-settings-audit/`: Storage (01), Preferences (02 and 14), Appearance (03), Search (04), Models (05), MCP (06), Videos (07 and 08), Images (09), Trash (10), Tags (11), Fetch Schedule (12). Capture 13 duplicates Appearance's upper view; it is not evidence of lower controls.

![Search currently combines search and media processing](/tmp/pond-settings-audit/04-search.png)

![Storage mixes location, backups, imports, and watched folders](/tmp/pond-settings-audit/01-storage.png)

All 11 default pages were inspected in the running app. The account has no providers or tags and processing features are off. Populated provider/tag states and conditional model-download/encoding/storage-limit controls were reviewed only where represented in source, not exercised live. No settings were changed, no destructive actions were triggered, and network/model downloads were not tested. Failure and retry findings are code-path findings, not induced runtime failures. Keyboard, screen-reader, dark-theme, zoom, and narrow-window testing remain separate verification work. No compliance claim is made.

No application code was changed by this audit. Existing scheduler work and unrelated working changes were preserved.


## Implementation follow-up

Implemented after approval on 6 September:

- Seven visible destinations: General, Appearance, Fetching, Downloads, Search & Processing, Storage & Backups, Integrations.
- Images and Videos share Downloads; Trash retention shares Storage; MCP setup shares Integrations. Old page links redirect, including image/trash field anchors. Tags Settings links open the existing library tag manager.
- The global scheduler now supports a start date, repeat count, hours/days/weeks/months, weekday selection, time, manual mode, and next-occurrence preview. Legacy rules remain supported until edited. Monthly rules clamp to shorter month ends. Save has pending and error feedback.
- Preference saves are serialized and report failures; failed initial loads can retry. Download preference writes are serialized. General controls apply after their preference write completes.
- Removed the ineffective trash confirmation control; manual deletion still confirms. Corrected video size options and image format wording. Advanced media controls collapse. Theme precedes decorative icon choices.
- Storage reports library usage, free disk space, and the latest recorded backup for that library. New successful backups record history; old backups are not invented retrospectively.
- Watched-folder setup, path, and pause/resume controls now live in Sources; Settings links there.
- Fetching reports the last recorded successful source fetch, source errors, and storage blocking. Processing reports active/failed work and offers the existing rescan/retry operation.
- Settings search indexes custom Storage actions, updates, and external app setup. Removed duplicate New Tag in the empty state.

The broader product suggestions are not all new features: no automatic backup scheduler, new cloud integration, or new model-download manager was added. Pointer-cursor customization remains available. Eagle import/preview remains accessible in Storage as well as the existing Library import entry, pending a dedicated consolidation that preserves preview behavior.

Validation: pnpm check passed (1,437 desktop tests, 16 skipped), pnpm build passed all performance budgets, and the component gallery built. The final UI could not be visually verified because the Mac was locked; no claim of a completed visual or accessibility review is made.
