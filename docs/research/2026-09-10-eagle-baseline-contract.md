# Eagle baseline contract

Research date: 2026-09-10. Source of truth for "Pond should do everything Eagle does, minus plugins, plus harvest."

Derived from the installed Eagle.app on this Mac (`/Applications/Eagle.app`, bundle `tw.ogdesign.eagle`) plus earlier first-party docs. Inventory method: English catalog `i18n/en.js` and context-menu builders in `app/app.bundle.js` via `npx @electron/asar extract-file`. Do not copy Eagle source, templates, or SVG icons into Pond. Eagle was running during this pass; its windows were off the current Space, so live CUA screenshots were not available. Re-run CUA when Eagle is on-screen to confirm visual grouping.

Pond nouns: Library, Save, Folder, Tag, Smart Folder, Source, Harvest. Eagle says library, item, folder, tag. Product UI stays Pond: Title Case, no ellipsis in chrome, no em dashes.

## Product rule

**DAM baseline** = Eagle 4 first-party desktop. Capture, organize, browse, preview, convert, search, library, and collect. If Eagle ships it in the app without a plugin, Pond should ship it.

**On top** = Pond harvest: Sources, Accounts, Watches, Sync, Capture, extension intercept of save/like, Agent, Ask, first-party MCP.

**Out** = Plugin Center, third-party plugins, format plugins, Eagle Cloud, Photoshop-class editors, a JS plugin host that clones Eagle's marketplace.

Eagle's own AI Search, AI Action, and MCP/Skill are plugins. Pond already has first-party Agent and MCP. Do not rebuild those Eagle plugins. Keep Pond's Agent.

## How to refresh the inventory

From a machine with Eagle installed:

```sh
npx @electron/asar extract-file /Applications/Eagle.app/Contents/Resources/app.asar i18n/en.js
npx @electron/asar extract-file /Applications/Eagle.app/Contents/Resources/app.asar app/app.bundle.js
```

1. `i18n/en.js` keys under `appmenu.*`, `context.*`, `filter.*`, `preferencesWindow.*`, `sidebar.*`.
2. `app.bundle.js` `$scope.open*ContextMenu` builders for visual order.
3. Live app: File / Edit / View / Organize / Find / Library menus, Preferences sections, empty-gallery New menu, inspector.
4. CUA: `launch_app` / `list_windows` / `invoke_menu` / `get_window_state` while Eagle is on the current Space.

## In: Eagle first-party DAM

### Capture and collect

- Import files and folders, clipboard, links, Eagle package
- Auto-Import watched folder
- Collect window
- Screenshots: display, area, window
- Browser extension: save image/page/area, batch page assets, folders/tags at save time
- Empty-gallery New: New Folder, New Smart Folder, import folder/links/package, Auto Import, find duplicates
- Skip empty-gallery "installed app templates" (Sketch, Pages) and marketplace site shortcuts (ArtStation, Huaban). Those are plugin/template adjacent. Pond harvest covers Pinterest and the rest as Sources.

### Organize

- Hierarchical folders, a Save in many folders, Uncategorized / untagged / trash
- Tags, tag groups, starred tags, merge tags
- Smart Folders, Groups, Saved Views
- Ratings 0–5
- Notes, image comments, timestamped video notes
- Custom thumbnail (file or clipboard), replace file, duplicate
- Pin to top in a folder, set as folder cover
- Folder auto-tag, folder icon/color, expand/collapse, sort folders
- Batch rename, Actions
- Exact duplicates and visual similar
- Quick Access is optional. Pond already has recents and last-used folders. Do not add a second "favorites" sidebar unless the current ones fail the job.
- Folder password / app lock: import must warn and skip locked Eagle folders. First-party lock is later, not wave 1.

### Browse and preview

- Waterfall, grid, justified, list
- Hover preview, Spacebar inspect, pin preview windows, opacity, always on top
- Zoom, actual size, zoom to fit, grayscale, random/shuffle
- Thumbnail background (none / black / gray / white / grid)
- Navigator in the viewer
- Open with default app, Open With (ranked `.app` list, default labeled, no Other), Reveal in Finder, Open File Location
- Video: play, loop, speed, frame step, copy/save current frame, set cover, subtitles
- GIF: set thumbnail, loop range
- Crop as a derived copy. Rotate/flip as preview or write, matching a Pond preference
- Combine images / collage: first-party, not a plugin
- Presentation mode
- List columns: name, tags, dimensions, rating, extension, size, dates, annotation

### Find

- Keyword, phrase, OR, exclusion
- Filters: visual match, semantic, color, tags, folders, orientation, rating, types, dates, dimensions, duration, file size, comment, note, URL
- Fonts, BPM, camera: only once those media workflows exist
- Reverse image search: Google Lens, Bing, Yandex, TinEye, SauceNAO. Skip Baidu/Sogou unless we ship zh_CN
- Local reverse search if Eagle still ships it first-party. Eagle's catalog still has `appmenu.find>reverse>eagle`

### Convert and export

- Export files, specified format / WebP, CSV, Pond package (Eaglepack analog)
- Add to other Library
- Conversion presets and cancellable jobs
- Share via macOS share sheet

### Library

- Create, open, switch, reload, merge
- Backup / restore / verify
- Recent libraries
- Color profile unmanaged (macOS): later

### App menus (first-party, no plugin rows)

From `appmenu.*` on this install: App, File, Edit, View, Organize, Find, Library, Window, Help. Pond maps Help and licensing to Pond's own about/update/shortcuts. Skip `appmenu.help>installExtension` as Eagle-specific unless it opens Pond's extension install.

Preferences sections that are first-party: general, habits, hover, shortcuts, auto-import, screenshot, sidebar, themes, video, font, notification, privacy, proxy, developer API. Skip `preferencesWindow.pluginDisabled`, `aiSdk`, `aiSearch`, `mcp` as Eagle plugin prefs. Pond Settings keeps Agent as the Pond equivalent.

## Out

| Eagle thing | Why it is out |
| --- | --- |
| Plugin Center and third-party plugins | Marketplace, review, malware, payments |
| Format extensions (JXL extra, 3D extras, EPUB/SWF viewers) | Plugin type. Store the file, thumbnail if the OS can, else tile + Open With |
| AI Search / AI Action / MCP-as-plugin | Eagle plugins. Pond Agent and MCP are first-party |
| Eagle Cloud | Neither product is a Pond-hosted cloud |
| Photoshop-class preview of PSD/AI/INDD | Store, OS thumbnail, open in the real app |
| Plugin-middle-click behavior | `preferencesWindow.habits.middleBtnBehavior>plugin` |

## Pond extras (keep and name as Pond)

- Harvest / Sync from Sources through the user's session
- Accounts, Watches, Downloads, rate governor
- Extension intercept of native save/like
- Capture identity: author, metrics, list kinds (liked/saved), quoted posts
- Enrichment: OCR, captions, transcripts, CLIP, pHash
- Agent in the right column, Ask in search, stdio MCP
- Rebuildable SQLite index over an on-disk Library

## Status vs this repo (2026-09-10)

Much of the 2026-09-08 Eagle parity tracker (milestones 0–5) is in the working tree: query engine, Smart Folders, ratings, inspect, crop copies, pin preview, auto-import, screenshots, `.pondpack`, Eagle import, conversion jobs.

The remaining gap is not "rebuild the DAM." It is:

1. **Reachability.** Eagle actions exist in Pond but are missing, wrong, or dead in menus (Open Save on an open viewer, Open With Other, empty-gallery Find Duplicates).
2. **Missing first-party operations.** Combine images, thumbnail background, Share, pin-to-top, replace file, GIF loop range, load subtitles, folder cover from selection, Mac share sheet.
3. **Specialist media.** Fonts, audio BPM/waveform, first-page Office, common RAW. Store-all is already the format contract.
4. **Collect completeness.** Page-asset review grid and save-time folder/tag are sketched in the 8 Sep tracker and still need live-browser proof.
5. **Trust proof.** Signed-package backup, external-drive, and Eagle-timed browse comparisons remain unverified.

Do not regress harvest, Agent, or the rebuildable-library invariant to look more like Eagle.

## Appendix: app menu reachability (Wave 1)

Status: `pond` = reachable in Pond (app menu, File, Save menu, or equivalent). `later-wave` = first-party Eagle, not this wave. `out` = plugins / Eagle Cloud / skipped locales.

| Eagle key | Eagle label | Status | Pond surface |
| --- | --- | --- | --- |
| all | All | pond | Sidebar All, breadcrumbs |
| allTags | All Tags | pond | Tags page All Tags |
| alwaysOnTop | Always on Top | pond | Preview window Pin on Top |
| grayscale | Grayscale | pond | View menu Grayscale Overlay |
| gridLayout | Waterfall | pond | View menu Waterfall |
| justifiedLayout | Justified | pond | View menu Justified |
| next10Frame | Go forward 10 frames | pond | GIF inspector, `viewer.frame-next-ten` |
| nextFrame | Go forward 1 frame | pond | GIF inspector Next Frame, video FrameControls |
| opacity | Opacity | pond | Preview window Opacity |
| openInFinder | Reveal in Finder | pond | File menu Reveal in Finder (`save.reveal`) |
| openInNewWindow | Open in New Window | pond | Save menu and View menu Pin Preview |
| openInOthers | Open with Other App | out | Removed Other |
| openUrl | Open Link in Browser | pond | File menu Open Original URL (`save.open-original`) |
| openWithDefault | Open With Default App | pond | File menu Open with Default App (`save.open-with-default`) |
| prev10Frame | Go backward 10 frames | pond | GIF inspector, `viewer.frame-prev-ten` |
| prevFrame | Go backward 1 frame | pond | GIF inspector Previous Frame, video FrameControls |
| random | Random | pond | Folder sort Random |
| scrollPageDown | Scroll Page Down | later-wave | No page-scroll command |
| scrollPageUp | Scroll Page Up | later-wave | No page-scroll command |
| scrollToBottom | Scroll to Bottom | pond | Keyboard shortcut Scroll to Bottom (`nav.scroll-bottom`) |
| scrollToTop | Scroll to Top | pond | Keyboard shortcut Scroll to Top (`nav.scroll-top`) |
| showNavigator | Navigator | later-wave | Wave 3 viewer |
| speedDown | Slow Down | later-wave | Wave 3 viewer. Video player has a speed picker. GIF speed is not exposed |
| speedUp | Speed Up | later-wave | Wave 3 viewer. Video player has a speed picker. GIF speed is not exposed |
| stepBackward | Step Backward | pond | Viewer Previous Image or Save, preview window Previous |
| stepForward | Step Forward | pond | Viewer Next Image or Save, preview window Next |
| toggleAll | Sidebar / Inspector | pond | View menu Toggle Sidebar and Toggle Details |
| toggleFullscreen | Toggle Full Screen | pond | View menu Full Screen |
| toggleInspector | Inspector | pond | View menu Toggle Details |
| toggleListAnnotation | Show Comment | later-wave | Wave 3 list columns |
| toggleListMetas | Show Item Info | later-wave | Wave 3 list columns |
| toggleListName | Show Name | pond | Display Options Show Name (gallery overlay, not list columns) |
| toggleMainNav | Activity Bar | pond | Sidebar and Go menu (Library, Sources, Downloads, Trash) |
| toggleSidebar | Sidebar | pond | View menu Toggle Sidebar |
| toggleSubfolder | Show Subfolder Content | pond | Folder context menu Show Subfolder Content |
| trash | Trash | pond | Sidebar Trash, Go menu Trash |
| unfiled | Uncategorized | pond | Sidebar Uncategorized |
| untagged | Untagged | pond | Sidebar Untagged |
| volumeDecrease | Volume - 5% | later-wave | Wave 3 viewer. Video has a Volume slider, not ±5% |
| volumeIncrease | Volume + 5% | later-wave | Wave 3 viewer. Video has a Volume slider, not ±5% |
| zoomActual | Actual Size | pond | Inspector zoom menu Actual Size (`viewer.actual-size`) |
| zoomFit | Zoom to Fit | pond | Inspector zoom menu Zoom to Fit (`viewer.zoom-fit`) |
| zoomIn | Zoom In | pond | View menu Zoom In |
| zoomOut | Zoom Out | pond | View menu Zoom Out |
| rating>remove | Remove Rating | pond | Clear Rating (`save.rate-0`) |
| folder>add | Add Folder | pond | Save menu Add to Folders (`save.assign-folders`) |
| tag>add | Add Tags... | pond | File menu Add Tag (`save.add-tag`) |
| tag>clear | Clear Tags | pond | Inspector tag field Clear All Tags |
| tag>copy | Copy Tags | pond | Save menu Copy Tags |
| tag>paste | Paste Tags | pond | Save menu Paste Tags |
