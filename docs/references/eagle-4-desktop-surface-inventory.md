# Eagle 4 Desktop Surface Inventory

Audit date: September 20, 2026

This inventory closes the surface-level coverage for the
[Eagle 4 desktop parity audit](eagle-4-desktop-parity-audit.md). It catalogs the
installed Eagle 4.0.0 renderer, menus, options, viewers, dialogs, and states.
Plugin marketplace behavior and plugin-provided features remain excluded.

## Coverage boundary

Static inspection covers all readable first-party renderer assets in the
installed application:

- 1,915 main-application English interface keys
- 52 Collect-window interface keys
- 175 application-menu entries
- 191 context-menu keys across 20 surfaces
- 145 macOS shortcut slots in 11 groups, including 100 default bindings
- 13 active preference panes, including 3 excluded plugin shells
- 62 preference options bound in Eagle's preferences HTML
- 19 filter fields
- 121 empty, loading, progress, error, and recovery strings
- 18 first-party top-level HTML entries
- about 95 distinct first-party user-facing surfaces

The primary Library, nine non-plugin preference panes, folder and item menus,
mixed-media gallery, filter toolbar, folder-password and batch-rename dialogs,
and GIF, video, audio, font, and SVG viewers were also exercised at runtime.

Some surfaces are static-only because they require trial or license state,
specific hardware, operating-system failure, corrupt data, or destructive
maintenance input. Eagle's `main.jsc` and `run.jsc` are bytecode, so the
main-process window-constructor list cannot be proven from readable source.
Renderer entry points, labels, and triggers remain visible.

## Exclusions

- plugin marketplace, plugin creator, plugin panel, and plugin viewer
- plugin-provided Actions
- plugin-provided AI Search, AI SDK, and MCP behavior
- plugin templates and development test harnesses
- third-party package interfaces
- hidden capture workers with no user chrome

The AI Search, AI SDK, and MCP preference shells are recorded as excluded slots.
Their functionality depends on plugins.

## First-party entry points

| Entry | Role | Audit mode | Pond result |
| --- | --- | --- | --- |
| `index.html` | Main Library shell | Runtime and static | Partial |
| `preferences.html` | Preferences window | Runtime and static | Partial |
| `preview-window.html` | Detached preview | Static | Parity |
| `progress.html` | Floating job progress | Static | Partial |
| `registration.html` | Registration and trial | Static | Not applicable |
| `manage-device.html` | License device management | Static | Not applicable |
| `collect-window/index.html` | Desktop Collect window | Static | Intentional difference |
| `background.html` | Font preview worker | Static | Internal |
| `gif-viewer/index.html` | GIF viewer | Runtime and static | Partial |
| `raw-viewer/index.html` | RAW viewer | Static | Partial |
| `font-viewer/font-viewer.html` | Font viewer | Runtime and static | Partial |
| `text-editor/text-editor.html` | Text viewer | Static | Partial |
| `exif-viewer/index.html` | EXIF viewer | Static | Missing |
| `texture-viewer/index.html` | HDR and EXR viewer | Static | Missing |
| `native-viewer/index.html` | Native fallback viewer | Static | Partial |
| `model-viewer/website/index.html` | 3D model viewer | Static | Partial |
| `pdf-viewer/web/viewer.html` | PDF viewer | Static | Partial |
| `model-viewer/website/embed.html` | Model embed helper | Static | Internal |

## Main shell

The main window contains:

- Library sidebar
- gallery and list content
- in-place detail viewer
- item and folder inspector
- filter toolbar
- search, sort, layout, and navigation toolbar
- breadcrumb and scope strip
- custom title-bar controls

Sidebar node types include All, Uncategorized, Untagged, Recently Used, Random,
Community, All Tags, Trash, Quick Access, Smart Folders, folders, and their
section labels.

## Dialogs, panels, and popovers

The non-plugin shell contains these 28 user-facing surfaces:

1. Quick folder search
2. Batch rename
3. Duplicate import decision
4. Duplicate scan workspace
5. Duplicate merge editor
6. Folder password
7. Library switcher
8. Layout and sort panel
9. Folder picker
10. General tag picker
11. Inspector tag picker
12. Mouse-wheel conflict resolver
13. About
14. New-version notification
15. Notification Center
16. Welcome and onboarding
17. Add to folder
18. Move folder
19. Folder auto-tagging
20. Smart Folder editor
21. Import error table
22. Batch link import
23. ArtStation import
24. Application lock screen
25. Folder lock screen
26. Annotation editor
27. Hover preview
28. Image crop overlay

Eagle also has a custom searchable context-menu surface shared across main
window content.

## Viewers and modes

The first-party viewer set contains:

- standard raster image with zoom and navigator
- SVG
- GIF with advanced toolbar and frame scrubber
- video with native and fallback playback
- audio with waveform
- PDF
- font
- text
- RAW
- 3D model
- URL, HTML, and MHTML
- native operating-system fallback
- TIFF, TGA, and HEIC handling
- HDR and EXR texture handling
- EXIF view
- inline, slideshow, and presentation modes

All Tags is a separate full-page workspace with tag groups and starred tags.

## Application menu

Eagle defines 175 labels across these top-level menus.

### Eagle

About, Check for Updates, Color Space, Unmanaged, Hide, Hide Others, Lock Now,
Preferences, Quit, Register, registration owner, and Unregister.

### File

New Folder, New Smart Folder, New Group, Import Folders, Import Links, Import
Eagle Package, Auto Import, Auto Import Settings, Find Duplicated Files, Export
to Computer, Export Eaglepack, Export in Specified Format or Dimension, Export
CSV, and imports from ArtStation and Huaban.

Pinterest appears elsewhere as a documentation route, not a working importer in
the readable Eagle 4.0.0 renderer.

### Edit

Undo, Redo, Select All, Cut, Copy, Paste, Rename, Move to Trash, Remove from
Folder, Switch Library, Move Folder, arrange to top, up, down, or bottom, Copy
Link, Copy Eagle Link, Copy Name, Copy File Path, Copy Thumbnail, Copy Base64,
select custom thumbnail, custom thumbnail from clipboard, reset custom
thumbnail, refresh thumbnail, edit folder, set current folder, move folder,
create, edit, remove, or immediately lock a folder password, and crop, flip,
rotate, or combine images.

### Find

Search, Search All, Go to Folder, Add to Folder, Add to Last Used Folder, Filter
Sidebar Items, toggle and reset filters, and open Color, Date, Folder, Rating,
Shape, Tag, Type, Size, Resolution, Duration, Annotation, Note, URL, Semantic,
BPM, Camera, Fonts, Import, and Image filters.

Search by Image supports Local, Google, Bing, Yandex, TinEye, SauceNAO, Baidu,
and Sogou.

### View

All, All Tags, Uncategorized, Untagged, Random, Trash, Waterfall, Justified,
Always on Top, Grayscale, Opacity, Reveal in Finder, Open in New Window, Open
with Another App, Open Link in Browser, Open with Default App, next or previous
1 and 10 frames, step forward or backward, speed up or down, volume up or down,
scroll page up or down, scroll to top or bottom, Navigator, Sidebar, Inspector,
Activity Bar, Sidebar and Inspector, Show Subfolder Content, Show Comment, Show
Item Info, Show Name, Full Screen, Actual Size, Fit, Zoom In, and Zoom Out.

### Organize

Remove Rating, Add Folder, Add Tags, Clear Tags, Copy Tags, and Paste Tags.

### Library

Create Library, Switch Library, Merge Library, Empty Cache and Reload, and Clear
History.

### Help

Help Center, Tips and Tricks, Show Tutorial, Shortcuts, Install Extensions,
Export Debug Report, Error Logs, Feedback, Recover License, Privacy, Change
Logs, Roadmap, and license-related routes.

### Window and Actions

Window includes Minimize, Close, and Full Screen. Actions is a first-party menu
slot whose action providers are excluded plugin behavior.

## Context-menu surfaces

The 191 context labels belong to:

- item and gallery
- layout and sort
- folder
- subfolder
- Smart Folder
- import
- add-to-folder picker
- export folder
- trash
- colors
- tags
- tag groups
- tag input
- sidebar search and empty results
- GIF viewer
- zoom
- repair utilities
- custom thumbnail
- viewer-specific media actions
- shared selection actions

Material commands not already represented by Pond include Copy Base64, custom
thumbnail from clipboard, local Search by Image, WebP batch conversion, Replace
File, and the filename, thumbnail, empty-folder, and metadata repair commands.

## Shortcuts

Eagle exposes these shortcut groups:

- Global: 5
- Player: 14
- File: 13
- Library: 3
- Edit: 24
- Find: 27
- Reverse Search: 8
- Organize: 12
- View: 37
- Other: 2

The macOS total is 145 slots, with 100 non-empty defaults. Eagle includes
platform aliases for Rename, Trash, Remove from Folder, Reveal, and Duplicate.

## Preferences

The ten active non-plugin panes are:

- General
- Sidebar
- Controls
- Preview, named `habits` in source
- Screenshot
- Shortcuts
- Notification
- Password
- Auto-Import
- Developer

General covers language, interface zoom, GPU, vibrancy, Dock icon, sidebar
badges, auto-selection after import, Collect prompts, IPTC keyword tags, theme,
updates, startup, and window behavior.

Sidebar controls visibility for Uncategorized, Untagged, Recent, Random,
Community, Quick Access, Smart Folders, and folders.

Controls and Preview cover double-click, middle-click, scroll and wheel modes,
Space behavior, hover zoom, image rendering, default size, transparency, GIF
playback and frame viewer, video behavior, and image-transform write mode.

Screenshot covers image format, quality, Retina resolution, clipboard, automatic
Screenshot tags, shortcut enablement, and three global capture shortcuts.

Shortcuts exposes all 145 slots. Notification contains four notification and
four sound event switches. Password covers app lock and Touch ID. Auto-Import
covers enablement and watched path. Developer exposes the local API token.

AI Search, AI SDK, and MCP Server are active preference shells backed by
plugins, so they remain excluded. Download, Video, GIF, and Font panes are
commented out; their live options appear inside other panes. Proxy defaults and
localized copy exist without a readable visible panel.

## Filters

The 19 filter directives are:

- annotation
- BPM
- camera
- color
- duration
- folders
- activated fonts
- visual image match
- import date
- modification date
- note
- rating
- resolution
- semantic
- shape and orientation
- size
- tags
- types
- URL

Filter chrome supports locking, clearing, exclusion, and accuracy. Type values
include bookmark, font, and video. Date presets include today, yesterday, 7,
30, 90, and 365 days plus custom range.

## Import and export

First-party routes include:

- import files
- import folders
- import links
- import Eaglepack
- import Eagle Library
- import ArtStation
- import Huaban
- Pinterest documentation route
- import Pixave Library
- Auto Import
- batch link import
- export to computer
- export Eaglepack
- export CSV
- export in a specified format and dimension

## Progress and busy states

Eagle provides distinct progress surfaces for:

- Library load
- Library merge
- Eaglepack import
- Eaglepack export
- file export
- add files
- thumbnail regeneration
- empty trash
- debug-report export
- WebP conversion
- repair scan
- clean empty folders

It also shows GIF loading, palette analysis, NTFS warnings, and slow-disk
warnings.

## Empty, error, and recovery states

The 121 state strings cover:

- empty Library
- empty folder
- no search results
- empty Trash
- Uncategorized introduction and completion
- Untagged introduction and completion
- All Tags variants
- duplicate scan with no matches
- unsupported preview
- oversized TIFF, HEIC, and TGA preview
- video playback error
- first and last item tips
- empty Preferences search
- empty Smart Folder and picker search
- missing Library
- no disk space
- crash reporting
- app and folder unlock
- Touch ID recovery
- trial, registration, and device limits
- update availability
- Rosetta and platform-specific warnings

## Additional gaps outside the original matrix

The closure pass adds these reportable surfaces:

- saved filters
- deeper Smart Folder rule building
- full duplicate merge-review flow
- WebP batch conversion
- replace file in place
- Pixave import
- batch link import
- import error retry, clear, and copy actions
- saved-page browser toolbar
- welcome onboarding
- mouse-wheel first-run dialog
- Notification Center history
- Community sidebar destination
- starred tags and tag-group merge
- subfolder cover and list chrome
- shape and orientation filter
- BPM filter
- comments filter
- bookmark type filter
- video hover-preview preference
- video Fit or Fill preference
- GIF frame-viewer toggle
- screenshot automatic tagging
- Library reload and clear cache
- merge tags dialog
- clear Library and tag history
- hardcoded metadata repair command

## Closure statement

The readable Eagle 4.0.0 desktop renderer is now inventoried at the screen,
menu, context-menu, shortcut, preference, filter, viewer, dialog, and state
levels. This does not claim that every combinatorial runtime state was opened.
Static-only evidence is marked because some states require conditions that
should not be fabricated during an audit.
