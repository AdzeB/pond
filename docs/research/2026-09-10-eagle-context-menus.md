# Eagle context menus

Research date: 2026-09-10. Scope: Eagle.app on this Mac (`/Applications/Eagle.app`). Derived inventory only. Do not copy Eagle source, templates, or SVG icons into Pond.

Eagle is Electron. Context menus are not HTML templates of item lists. A generic Angular menu (`app/js/modules/context-menu/`) renders rows. Order, separators, icons, visibility, and shortcuts live in `app/app.bundle.js`. English copy lives in `i18n/en.js` under `context.*` and `Context.*`.

## How to extract

From a machine with Eagle installed:

```sh
npx @electron/asar extract-file /Applications/Eagle.app/Contents/Resources/app.asar i18n/en.js
npx @electron/asar extract-file /Applications/Eagle.app/Contents/Resources/app.asar app/app.bundle.js
```

1. `i18n/en.js` is the full label catalog. Keys are alphabetical, not visual order. Submenus use `>` in the key (`context.image.export>computer`).
2. `app.bundle.js` is the visual source of truth. Search `$scope.open*ContextMenu`. Each builder is an `items: [` array with `role: 'separator'`, `icon`, `visible`, `accelerator`, and nested `submenu`.
3. Icons sit at `app/assets/images/dark/icons/context-menu/ic-*.svg` (light theme has a twin set). Do not vendor those files. Map the *job* to Nucleo.
4. `core.jsc` / `main.jsc` are bytecode loaders. They do not hold the menu lists.

The custom menu supports search (`showSearch: true`), hover submenus, color/emoji roles, keep-open toggles, and per-row images (Open With apps, plugins, library icons).

## Surfaces

Builders in `app.bundle.js`:

| Builder | Where it opens |
| --- | --- |
| `openItemContextMenu` | Save / item, gallery or viewer |
| `openFolderContextMenu` | Sidebar folder (single vs multi) |
| `openSmartFolderContextMenu` | Smart Folder row |
| `openNewSmartFolderContextMenu` | Empty Smart Folder section |
| `openSubFolderContextMenu` | Subfolder chip in the gallery |
| `openNewContextMenu` | Empty gallery / New |
| `openTrashContextMenu` | Trash sidebar row |
| `openRecentContextMenu` | Recent sidebar row |
| `openTagContextMenu` | Tag in the tag manager |
| `openTagGroupContextMenu` | Tag group |
| `openTagGroupListContextMenu` | Tag list sort |
| inspector tag field | Tag chips / empty tag input |
| `openColorContextMenu` | Inspector palette swatch |
| `openGifContextMenu` | GIF viewer |
| `openRatioContextMenu` | Zoom percent |
| `openFilterAddContextMenu` | Add filter |
| `openListPropContextMenu` | List-layout columns |
| `openFolderExpandContextMenu` | Folder disclosure |
| `openSidebarVisibleContextMenu` | Sidebar section visibility |
| `openSidebarMenu` | Sidebar / Inspector chrome |
| `openQuickAccessContextMenu` | Quick Access row |
| export helpers | Export button split menus |
| `FixUtils.openContextMenu` | Hidden repair tools |

`openFileListContextMenu` does not build a menu. It opens Eagle's layout panel.

Pond nouns: Save, Folder, Tag, Library. Eagle says Item. Pond UI: Title Case, no ellipsis, no em dashes.

## Item menu (`openItemContextMenu`)

Search is on. Almost every row has an `ic-*` icon. Groups below match visual order. Rows in parentheses are conditional.

1. (Trash) Restore
2. (Font) Activate / Deactivate
3. (Video, viewer) Set as Video Thumbnail, Copy Current Frame to Clipboard, Save Current Frame, Load subtitles
4. Open Item(s) in New Window, Open With Default App, Open With (apps; default labeled `(Default)` then separator then others), Reveal in Finder, Open File Location (All + each folder)
5. (Plugins) Plugin, recent then the rest
6. Add To Last Used Folder, Add to Folders, Add to Other Library, Export (eaglepack / Computer / Specified Format / CSV), Share (Mac)
7. (In a folder) Pin to Top or Unpin from Top, Set as Folder Cover
8. (Multi) New Folder with Selection, Rename N Items. (Single) Rename
9. Copy, Copy File Path, Copy (Link, Folder path, Thumbnail, Base64, Name), Copy Tags, Paste Tags
10. (Multi images) Combine Images. (Single) Duplicate
11. Search by Image (Search Engine): Google, Bing, Yandex, TinEye, SauceNAO, plus Baidu/Sogou in zh_CN. Local reverse search is commented out
12. Enter / Leave Presentation Mode. (Viewer) Show Navigator. (Gallery) Thumbnail Background (None / Black / Gray / White / Grid). Grayscale preview
13. (WebP) Convert WebP: PNG, JPG
14. More: Custom thumbnail (file / clipboard / reset), Refresh Thumbnail, Re-analyze colors, Replace with File, (fonts) Rename with Font Family, Change Language
15. (In a folder) Remove from this Folder. Move to Trash, or Permanently Delete in Trash

Pond's save menu already follows this grouping. Gaps vs Eagle: per-row icons, Open in New Window, Share, Pin, Combine Images, reverse-search engines, Presentation, Thumbnail Background, Grayscale, Convert WebP, custom thumbnail, Search on the menu, Plugin submenu. Add Tag is an app-menu command in Eagle (`appmenu.organize>tag>add`), not a row on this context menu.

## Folder menu (`openFolderContextMenu`)

Search is on.

**Single**

- New Folder, New Subfolder, Move Folder
- (Quick Access) Add to / Remove from Quick Access
- Rename, Copy Link, Set Auto-Tag, Password (Create / Edit / Remove / Lock Now)
- Sort By: Title current level A→Z / Z→A, Title all levels A→Z / Z→A
- Expand/Collapse Folder, Same Level, All Folders
- Duplicate
- Export (Computer, eaglepack), Add to Other Library
- Show Subfolder Content (checked)
- Change Icon (emoji), color swatches
- Remove Folder

**Multi**

- (Quick Access) Add / Remove
- Move Folder, Rename N Items, Order By, Export
- Change Icon, color
- Remove Folder

## Smart Folder menu

**Single:** New Smart Folder, New Subfolder, Rename, Edit Rules, Duplicate, Copy Link, Refresh, (Quick Access), Export, Add to Other Library, Change Icon, color, Remove Folder.

**Empty section:** New Smart Folder, New Smart Folder Group.

**Multi:** Order By, Quick Access, Rename N, Change Icon, color, Remove.

## Other menus (order)

**Empty gallery / New:** New Folder, New Smart Folder; Import from folder(s), Import from Links, Import Eagle Package, Auto Import, Find Duplicated Items (Scan All / Current List / Selected); installed-app templates (Sketch, Pages, …); Pinterest, ArtStation, (zh_CN) Huaban.

**Trash row:** Empty Trash, Restore All Items.

**Recent row:** Clear history.

**Subfolder chip:** Rename, Auto-Tagging, Password, Export, Remove Folder.

**Tag:** Filter Items with the Tag(s); Add to Starred / Remove from Starred; Rename (or Rename N); Add to Group, Move to Group, Remove from this Group; Merge N Tags; (and related remove).

**Tag group:** Find items with tags in the group; Rename; Remove; Add to Other Library; color.

**Tag list sort:** A > Z, Z > A, Count High→Low / Low→High; Group by Alphabet / Groups.

**Inspector tag chip:** Filter Items with the Tag(s); Rename Tag; Copy Tags; Paste Tags.

**Empty tag field:** Copy Tags, Paste Tags, Clear All Tags.

**Palette swatch:** Find Similar Color Items; Copy hex / rgb / rgba / hsl; Copy hsv / hwb / cmyk; Set As Primary Color.

**GIF:** Set as GIF Thumbnail, Reset Loop Range.

**Zoom:** 5%, 10%, 25%, 50%, 100%, 125%, 150%, 200%, 300%, 400%, 800%; Actual Size; Zoom to Fit.

**Add filter (pinable):** Search by Image, Semantic, Color, Tags, Folders, Orientation, Rating, Types, Date Added, Date Modified, Dimensions, Duration, File Size, Comment, Note, URL, Font, BPM, Camera.

**List columns:** Tags, Dimensions, Rating, Extension, File Size, Date Added (keep-open checks).

**Folder disclosure:** Expand/Collapse Folder, Same Level, All Folders.

**Sidebar chrome:** Sidebar / Inspector, Sidebar, Inspector.

**Quick Access row:** Remove from Quick Access.

## Shell, not content

The HTML is chrome only: search field (`context.search` = `Search...`), rows, separators, labels, color swatches, submenu arrow. Item order is never in those files.

## Pond mapping notes

- Reuse Pond UI `Menu`. Do not restyle a native menu to look like Eagle.
- Drop Eagle ellipsis in Pond copy (`Add to Folders`, not `Add to Folders...`).
- Open With already matches: app icons, `(Default)`, then Other.
- Folder, tag, Smart Folder, filter, zoom, and inspector color menus are the next surfaces if the goal is parity, not more Save-menu rows.
- Eagle's item menu has no Add Tag row. Pond can keep Add Tag if it is the faster path; that is a Pond choice, not an Eagle match.
