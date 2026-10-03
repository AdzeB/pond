# Eagle 4 Desktop Parity Audit

Audit date: September 20, 2026

Interaction follow-up: the [September 22 selection, keyboard, and accessibility audit](eagle-interaction-accessibility-audit-2026-09-22.md)
records gaps in the current working tree that operation-level parity does not
cover. A feature marked implemented here does not establish complete keyboard
access, focus behavior, or sidebar multi-selection.

## Scope

This audit compares Eagle 4.0.0 for macOS with Pond at commit `ad665308`.
Plugin marketplace behavior and plugin-provided AI features are excluded.
Built-in menu slots and settings shells are recorded only when they affect the
desktop baseline.

The comparison uses:

- all 142 Eagle Desktop support pages previously cataloged in Pond
- the installed Eagle 4.0.0 application bundle, including 1,915 English labels,
  menus, shortcuts, templates, file-type handlers, and secondary windows
- direct interaction with Eagle using generated PNG, JPEG, SVG, GIF, video,
  audio, and font fixtures in a dedicated `Pond Parity Audit` folder
- four Eaglepack exports made by Eagle 4.0.0, including nested folders and a
  custom thumbnail
- Pond implementation and test evidence at the audited commit

Eagle's support pages remain the documented product baseline
([Eagle (n.d.-ae)](../provenance/generated/REFERENCES.md#eagle-cool)). The local application
inspection verifies behavior that support copy does not fully specify. Local
screenshots contain the existing Library sidebar and stay outside Git. The
committed Eaglepack samples contain only generated media, example.com URLs, and
audit-only metadata.

## Result

The original non-plugin candidate set contains 38 features:

- 20 reach parity
- 17 remain partial
- 0 remain intentional differences
- 1 goes beyond Eagle's documented guarantees
- 0 remain wholly missing

The first comparison found 21 additional product surfaces outside that candidate
set. The closure pass expanded coverage to about 95 first-party surfaces and at
least 47 distinct non-matrix surfaces. Their corrected Pond statuses appear
below. Visual-only differences are recorded separately. The old feature picker
is stale. It predates the security, browsing, conversion, localization,
screenshot, and organization work in `ad665308`.

The companion
[surface inventory](eagle-4-desktop-surface-inventory.md) catalogs 18
first-party HTML entries, 184 `appmenu.*` keys, 191 `context.*` keys, 31
`Context.*` keys, 145 macOS shortcut slots, 62 bound preference options, 19
filter directives, and 121 state strings.

The feature counts above describe the historical `ad665308` audit. The current
menu pass records 37 in-scope surfaces in
`apps/desktop/test/fixtures/compatibility/eagle-menus/manifest.json`. Every
recorded surface now has a working Pond trigger. Focused suites cover native
templates, real `contextmenu` events, checked state, menu builders, and repair
previews. Collect, Community, licensing, and plugin-provided rows remain
explicit exclusions.

## Parity

Pond now matches the audited Eagle behavior for:

- batch tag creation
- batch folder and Saved View rename
- Action shortcuts and duplication
- adjustable duplicate similarity
- Combine Images controls
- file-extension edits
- application lock
- presentation mode
- detached image windows
- random browsing
- video transforms and wheel modes
- default image size
- thumbnail quality modes
- existing-image compression
- folder and Saved View links
- sidebar customization through Settings
- configurable input behavior
- notification and sound controls
- duplicate-import decisions
- interface zoom from 50 to 200 percent
- native Find and Organize menus
- built-in sidebar visibility with hidden-item recovery
- Recently Used, Random, and mixed Quick Access
- folder, Smart Folder, breadcrumb, disclosure, and folder-picker menus
- dedicated export, GIF, zoom-ratio, search-scope, layout, list-column, tag,
  navigation-history, and detached-preview menus
- previewed targeted Library repairs

## Interoperability closures

Pond reads and writes Eagle 4.0.0's singular `pack.json.folder` tree while still
accepting Pond's legacy `folders` array. Fixture coverage verifies nested folder
names, item membership, tags, ratings, notes, colors, and custom thumbnails.

Selection copy and export now retain the selected Saved View hierarchy and
referenced Tag Groups instead of emitting empty organizational collections.

## Partial parity

### P1: Visible product gaps

- Screenshot capture: Pond captures screens and windows, crops, converts, and
  copies to the clipboard. It lacks Eagle's free-form area overlay, annotation
  tools, and dedicated screenshot preferences.
- Localization: Pond ships eight locale catalogs, but most Library and Save
  renderer copy remains English.

### P2: Workflow depth

- Collection metadata: the extension flow remains folder-and-tag focused.
  Desktop screenshot input supports metadata in the contract but omits rating
  and notes in the dialog.
- Font workspace: view modes and backgrounds exist. In-viewer rename and
  automatic Bold and Italic tags do not.
- Audio browsing: detail waveform, seek, loop, speed, volume, and BPM are
  present. Gallery hover playback and Space preview are not.
- Batch Save rename: Pond has date, tag, original-name, and regex tokens, but
  only one date format.
- Folder passwords and Touch ID: password protection and library biometric
  unlock exist. Folder biometric unlock and Eagle's license-recovery path do
  not.
- Recent searches: history, boolean syntax, explicit extension scope, and a
  checked scope picker exist. Pond does not preserve Eagle's exact query-history
  presentation.
- Original-file image transforms: Pond offers an explicit destructive action
  with Undo, while the default remains non-destructive.
- Conversion matrix: Pond declares 18 formats with runtime capability checks.
  A fixture-backed acceptance suite does not yet prove every claimed format on
  release builds.

## Additional desktop baseline

The original feature picker did not cover every Eagle desktop surface. Static
inspection of Eagle's installed menus, preferences, secondary windows, and
maintenance utilities added these findings.

### Missing

- Convert IPTC keywords into tags during import.
- Show a dedicated EXIF viewer.
- Preview HDR and EXR textures interactively.
- Configure an application proxy.
- Keep unified Notification Center history.

### Partial

- Export in a specified format and dimension: conversions exist, but the
  combined batch dialog does not.
- Search by Image locally: Pond exposes on-device visual retrieval from the
  item and native menus. Baidu and Sogou open their official upload surfaces
  because they do not expose a stable public URL-search route.
- Match Eagle's menu-bar quick-capture surface.
- Match the full interactive depth of Eagle's saved-page and HTML viewer.
- Save filters independently: Pond stores them through Saved Views.
- Match Smart Folder rules that depend on camera and EXIF metadata.
- Centralize import-error retry, clear, and copy actions.
- Match Eagle's dedicated GIF-only frame-viewer surface.

### Strict menu placement

The extracted renderer proves the first-party menu groups recorded in the
compatibility manifest. Pond now exposes each in-scope group at its equivalent
native, row, toolbar, viewer, picker, or preview trigger.

The native application template includes File, Edit, Find, Organize, View, Go,
History, Library, Window, and Help. Renderer placement covers built-in sidebar
visibility, Recently Used, Quick Access, folder and Smart Folder operations,
breadcrumbs, export shortcuts, checked zoom and search scope, color, GIF, tags,
tag groups, tag sorting, list columns, navigation history, layouts, folder
pickers, detached preview, editable fields, saved pages, and targeted repairs.

The plugin-populated Actions slot remains excluded. Pond's extension and capture
queue replace Collect, and local-first Pond has no hosted Community or licensing
surface.

### Intentional

Pond uses the browser extension and capture queue instead of Eagle's dedicated
desktop Collect window. Pinterest is a connected source instead of a one-time
competitor-library importer.

### Closure-pass parity confirmations

The exhaustive pass also confirmed that Pond already covers:

- exact and similar duplicate review with survivor selection
- starred tags and Tag Groups
- subfolder covers and content browsing
- video hover preview
- BPM filtering
- batch URL import
- replace file in place
- extension validation
- Auto Import
- an authenticated loopback HTTP API and copyable token

The local API lacks a visible token-rotation control, but its authenticated
server and client behavior reach parity with Eagle's Developer token surface.

Visual differences do not block feature parity. Placement differences are now
tracked separately because they affect discoverability and interaction parity.
Eagle swaps detail content in place while Pond can use an overlay and uses a
dedicated progress window where Pond uses status surfaces.

## Beyond Eagle

Pond encrypts Library media, indexes, backups, and protected packages at rest.
Eagle's lock documentation describes access gates, not equivalent encryption
guarantees. Pond's recovery key and main-process enforcement therefore remain a
stronger requirement than Eagle parity.

## UI observations

Eagle's desktop uses a stable three-column shell:

- a persistent Library and folder sidebar
- a gallery or detail viewer with one toolbar
- an inspector that edits the active folder or item in place

Custom searchable context menus carry most secondary commands. Preferences use
a narrow sidebar and one-level panels. Batch rename uses a large live-preview
dialog. Folder passwords use a smaller nested modal. Media viewers keep the
same shell and inspector while swapping the center surface.

Pond should preserve its own component language. Parity work should match
information, state, and workflow reachability rather than copy Eagle's visual
styling.

## Verification evidence

The audit exercised:

- General, Sidebar, Controls, Preview, Screenshot, Notification, Password,
  Auto-Import, and Developer preference panes
- folder and item context menus
- mixed-media gallery cards
- GIF, video, audio, font, and SVG detail viewers
- folder password and batch rename dialogs
- the full filter toolbar
- nested Eaglepack folder export
- selection export with a custom thumbnail

Static inspection also covered application menus, all shortcut groups, drag and
selection behavior, secondary windows, hidden repair utilities, import and
export routes, supported file types, empty states, and progress surfaces.

The closure inventory covers every readable first-party renderer entry and
option. It does not claim every combinatorial state was opened. Registration,
device limits, platform failures, crash recovery, corrupt-data repair, and
hardware-dependent states remain static-only. Eagle's `main.jsc` and `run.jsc`
are bytecode, so their window-constructor list is not readable.

## Follow-up order

1. Add screenshot area selection, annotation, and screenshot preferences.
2. Expand renderer localization.
3. Add the dedicated EXIF and remaining HDR or EXR viewer depth.
4. Consolidate Notification Center history.
5. Finish application proxy controls and the remaining conversion acceptance
   fixtures.

Eaglepack documentation uses Eagle's first-party transfer behavior
([Eagle (n.d.-av)](../provenance/generated/REFERENCES.md#en-eagle-cool-support-article-import-exporting-eaglepacks))
and the earlier independent format research
([Kerekes (2026)](../provenance/generated/REFERENCES.md#kerekes-2026-eaglepack-importer)).
