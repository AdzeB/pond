# Eagle 4 Desktop Parity Audit

Audit date: September 20, 2026

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
([Eagle (n.d.-ae)](../../references.md#eagle-cool)). The local application
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
first-party HTML entries, 175 application-menu labels, 191 context-menu keys,
145 macOS shortcut slots, 62 bound preference options, 19 filter directives,
and 121 state strings.

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
- sidebar customization
- configurable input behavior
- notification and sound controls
- duplicate-import decisions
- interface zoom from 50 to 200 percent

## Partial parity

### P0: Interoperability correctness

#### Eaglepack

Real Eagle 4.0.0 exports use `pack.json.folder` for one nested root folder.
Pond currently parses and writes `pack.json.folders`. Media, tags, ratings,
notes, colors, and custom-thumbnail naming are compatible, but folder names and
hierarchy are not interoperable in either direction.

Evidence:

- `apps/desktop/src/main/core/eagle-package.ts`
- `apps/desktop/test/fixtures/compatibility/eaglepack/manifest.json`
- `apps/desktop/test/fixtures/compatibility/eaglepack/characterization.json`
- `apps/desktop/test/fixtures/compatibility/eaglepack/samples/`

The samples replace the earlier assumption-only descriptor. They confirm Eagle's
ZIP container, `pack.json`, `{itemId}.info` directories, `metadata.json`,
`{itemName}_thumbnail.png`, singular folder root, nested children, and
selection-export folder stripping.

#### Copy organizational objects between Libraries

Full-library Pond packages preserve Saved Views and Tag Groups. Selection copy
and selection export still write empty `views` and `groups` collections.

### P1: Visible product gaps

- Gallery GIF autoplay: the preference affects detail playback, not cards.
- Font activation filter: the field exists in the filter engine but is absent
  from the quick filter menu.
- Screenshot capture: Pond captures screens and windows, crops, converts, and
  copies to the clipboard. It lacks Eagle's free-form area overlay, annotation
  tools, and dedicated screenshot preferences.
- Tag picker controls: preferences and recommended tags exist, but Settings
  does not expose layout, width, and section controls.
- Quick Access: Pond pins folders but lacks an independent reorder model and a
  context-menu toggle.
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
- Recent searches: history and boolean syntax exist. Explicit extension scope
  and a scope picker do not.
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

- Copy an item's name, thumbnail, or image bytes as Base64.
- Filter folders and Saved Views in the sidebar.
- Auto-select newly imported items.
- Convert IPTC keywords into tags during import.
- Show camera metadata, camera filters, and a dedicated EXIF viewer.
- Preview HDR and EXR textures interactively.
- Configure an application proxy.
- Route Space to macOS Quick Look.
- Select a display color-space mode.
- Show first-run onboarding.
- Keep unified Notification Center history.
- Run an auto-advancing slideshow.
- Include folders in Quick Search results.
- Import directly from ArtStation, Pixave, and Inboard.

### Partial

- Export in a specified format and dimension: conversions exist, but the
  combined batch dialog does not.
- Repair Library data: integrity verification exists, but Eagle's filename,
  thumbnail, metadata, and empty-folder repair tools do not.
- Set a custom thumbnail from the clipboard: Pond accepts a selected file.
- Search by Image locally: Pond offers on-device visual retrieval, but not
  Eagle's item-menu entry point.
- Re-analyze colors: Pond computes palettes in its pipeline, but does not expose
  a user command.
- Switch gallery thumbnails between Fit and Fill.
- Match Eagle's menu-bar quick-capture surface.
- Match the full interactive depth of Eagle's saved-page and HTML viewer.
- Export a bundled debug report: Pond can reveal raw logs.
- Save filters independently: Pond stores them through Saved Views.
- Match Smart Folder rules that depend on camera and EXIF metadata.
- Convert WebP in place: Pond's general conversion flow exports copies.
- Centralize import-error retry, clear, and copy actions.
- Match Eagle's dedicated GIF-only frame-viewer surface.

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

Visual and placement differences do not block the same task. Eagle swaps detail
content in place while Pond can use an overlay, uses a dedicated progress window
where Pond uses status surfaces, and places some folder commands in Customize or
row menus instead of the context menu.

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

1. Correct Eaglepack's singular folder container in both import and export.
2. Add gallery GIF autoplay and expose the font activation quick filter.
3. Preserve Saved Views and Tag Groups in selection copy.
4. Add screenshot area selection, annotation, and screenshot preferences.
5. Expose tag-picker settings and Quick Access ordering.
6. Expand renderer localization coverage.
7. Add camera and EXIF surfaces, gallery Fit and Fill, and the most valuable
   missing desktop commands.
8. Add folder biometric unlock and the remaining gallery audio behavior.

Eaglepack documentation uses Eagle's first-party transfer behavior
([Eagle (n.d.-av)](../../references.md#en-eagle-cool-support-article-import-exporting-eaglepacks))
and the earlier independent format research
([Kerekes (2026)](../../references.md#kerekes-2026-eaglepack-importer)).
