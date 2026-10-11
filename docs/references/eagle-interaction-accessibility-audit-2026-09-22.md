# Pond interaction and accessibility audit against Eagle

## Implementation follow-up — 22 September 2026

The twenty findings below describe the pre-implementation snapshot. The follow-up implements their interaction paths; it does not claim a completed VoiceOver conformance assessment.

| Findings | Implemented behavior |
| --- | --- |
| 1–4 | Folder, Smart Folder/Group/Saved View, Quick Access and subfolder-card multi-selection; independent cursor and anchor; range/toggle/select-all; tree arrows, boundaries and typeahead; exact batch-menu/drag targets; deduplicated combined browsing with lock checks; tree metadata and inert collapsed content with focus return. |
| 5–8 | Spatial gallery arrows across grid, waterfall, justified and list layouts; Home/End and paging; Shift ranges; Option/Alt+arrows move only the cursor and Shift+Space toggles it. One listbox focus target retains its active option across virtualization. Enter/Space use the moving cursor. Background rectangle selection supports additive selection, edge scrolling and cancellation. |
| 9–10 | Native and keyboard selection resolve the full result set through one async command with pending/error feedback and stale-query guards. Save, collection, table, viewer, inspector, editable and overlay commands check ownership. Async navigation does not reclaim focus after the user leaves. |
| 11–12 | DataTable range extension reverses/shrinks correctly; arrows, boundaries, page movement and toggling use an independent cursor. Virtual rows reveal on navigation and focus return; the grid exposes total/index/selection metadata. Sources, Downloads and Tags share the control. |
| 13–16 | Splitters accept keyboard resize/bounds/collapse and expose current widths; Assign Folders supports arrow navigation, scopes and explicit keyboard Apply; Settings fields reference visible names/descriptions; rating buttons expose the exact rating and removal behavior. |
| 17–20 | Navigator panning and 3D orbit/pan/zoom have focused keyboard paths. Agent announces completion/error/required-action boundaries and offers Read Latest Response. Command-menu Enter ignores IME composition. Imperative app/Thread scrolling follows effective reduced-motion preferences. |

Implementation ownership and protocols are recorded in [desktop architecture](../contributing/architecture.md). Additional regression review repaired stale cursors, focus re-entry, selected ancestor/descendant moves, preserving union browsing through unlock, and key propagation from spatial viewers.

Live inspection observed the running app's Saves listbox, organization outlines and a splitter exposing its current width. Computer-use actions repeatedly returned stale-element/no-window errors, so the complete disposable-Library interaction matrix and VoiceOver testing below remain unverified. No destructive acceptance tests were run on the personal Library. Imported Live Photos expose real archived VTT tracks when supplied; missing source captions are a content limitation.

Final validation results are recorded below in the follow-up verification section.

## Original audit — pre-implementation snapshot

September 22, 2026. **Source audit complete; live interaction and assistive-technology verification incomplete.**

Pond has many of Eagle's operations, but it does not yet have a consistent desktop selection and focus model. The largest missing workflow is selecting several folders directly in the sidebar, then browsing or acting on that selection. Several accessibility gaps affect shared controls and therefore more than one screen.

This report records 20 findings. It audits the current working tree, including existing uncommitted work; it does not describe only the last commit. No application implementation was changed for this audit.

## Evidence and limits

- Pond checkout: `0e2ec2777bb77bc9c7429d8800a28afb078d4f10`, with extensive pre-existing changes. Source files may continue changing during parallel development; verify each finding against the eventual implementation commit.
- Comparator: installed [Eagle (2026)](../provenance/generated/REFERENCES.md#eagle-4-20260401), version `4.0.0`, buildVersion `20260401`, buildNumber `23`.
- Extracted `/Applications/Eagle.app/Contents/Resources/app.asar` into `/private/tmp/pond-eagle-interaction-audit-20260922`. Archive SHA-256: `b04a2efdb8bc8d06910552f43f38c056e6964c8f74798e1b2849f1bffab8a1bd`.
- Eagle evidence below comes from files freshly extracted for this run. Its `app/js/core.jsc` is bytecode: readable templates, preferences, and directives do not prove every main-library keyboard implementation.
- Pond's initial live accessibility tree exposed the sidebar as navigation with individual folder buttons and separate Expand buttons. It exposed labeled toolbar controls, a search field, filters, and subfolder buttons. This supports the structural observations, not a completed keyboard walkthrough.
- Eagle captures were only 126 × 155 pixel distorted window thumbnails. They were inspected and rejected. Subsequent Pond capture was blocked because the Mac was locked and automatic unlock failed. **There are no accepted screenshots in this report.** The rejected capture remains local under `.tmp/audits/2026-09-22-interaction/` and is not evidence for a finding.
- No destructive operation, personal-library mutation, permission change, or live-network import was used to test a finding.
- Eagle support-page requests returned page titles and site chrome without article bodies. They are not treated as proof of interaction behavior.
- This is not a WCAG conformance determination. VoiceOver announcements, visual contrast, pointer target dimensions, focus-ring visibility, zoom/reflow, OS keyboard settings, and actual event ordering still need live checks.

**Evidence labels:** **Source** means an implementation gap is directly visible in current source. **Risk** means the source suggests a runtime problem whose exact manifestation still needs reproduction. **Eagle** means the comparison is supported by the fresh installed assets. **Pond baseline** means a proposed accessibility or consistency requirement, without asserting Eagle already meets it.

**Priority:** P1 blocks a common workflow, leaves a major control inaccessible, or risks acting on the wrong selection. P2 adds friction or leaves a narrower accessibility gap. These are audit priorities, not claims about a shipped incident.

Accessibility recommendations draw on [World Wide Web Consortium (n.d.-a)](../provenance/generated/REFERENCES.md#w3c-apg-grid), [World Wide Web Consortium (n.d.-b)](../provenance/generated/REFERENCES.md#w3c-apg-treeview), and [World Wide Web Consortium (n.d.-c)](../provenance/generated/REFERENCES.md#w3c-apg-window-splitter). Comparator version/build also match the vendor's [download page](https://eagle.cool/download) as checked in this run.

## App-wide coverage

Each row is a reviewed task surface, not a claim that every state was exercised. All runtime paths remain pending unless explicitly noted above.

| Step | Task surface | Source health and coverage |
| --- | --- | --- |
| 1 | Library destinations, folder tree, Smart Folders, Groups, Saved Views, Quick Access | Partial. Opening, disclosure, context menus, ordering, and shortcuts exist; direct multi-selection and tree keyboard behavior are missing. Findings 1–4. |
| 2 | Subfolder cards and combined folder browsing | Partial. Cards open individual folders; there is no sidebar multi-folder browsing state. Finding 1. |
| 3 | Grid, waterfall, justified, and Library list layouts | Partial. Modifier-click, horizontal range selection, paging, and reveal exist; four-direction movement and focus continuity are incomplete. Findings 5–8. |
| 4 | Native Edit/Organize menus, command palette, selection commands | Partial. Many commands exist; menu selection scope, command ownership, and IME handling need work. Findings 9, 10, 19. |
| 5 | Assign Folders, move folders, batch folder rename, arrange Saves | Partial. Working checkbox/form paths and batch operations exist; sidebar selection cannot seed them and the assign picker lacks arrow traversal. Findings 1, 14. |
| 6 | Tags page, Tag Groups, tag manager | Partial. Shared table selection and batch operations exist; shared keyboard/focus defects apply. Findings 11–12. |
| 7 | Downloads and Sources, their inspectors and bulk actions | Partial. Labels, search, selection, and action controls exist; shared DataTable defects apply. Findings 10–12. Network/account flows were not run. |
| 8 | Save details, ratings, metadata | Partial. Semantic fields and edit controls exist; rating state is visual-only. Finding 16. |
| 9 | Image/GIF viewer, cropping, annotations, navigator | Partial. Crop nudging, menus, zoom controls, and GIF operations exist; annotation placement and navigator operation lack equivalent keyboard paths. Finding 17. |
| 10 | Video/audio playback, compare, quick preview | Partial. Sliders, playback controls, and compare zoom buttons exist. Preview uses the range anchor, not the moving endpoint. Finding 8. Playback/slider interaction requires live validation. |
| 11 | 3D, PDF, EPUB, text, archive, saved-page viewers | Mixed. 3D has a concrete keyboard gap (17). Other viewers were inspected at integration boundaries; embedded/native viewer internals and every file format were not exhaustively audited. |
| 12 | Detached preview and presentation | Partial. Preview registers Left/Right and Escape and has native button controls. Focus return to the originating Save and OS window behavior remain unverified. |
| 13 | Search, filter toolbar, filter values, Smart Folder rule editing | Existing foundations. Search typeahead, labeled options, color input, range inputs, and Base UI controls are present. Keyboard traversal between fields/overlays and result announcements remain unverified. |
| 14 | Settings, settings search, shortcut customization | Partial. Semantic switches and many labeled controls exist; generic select/number labels are incomplete. Finding 15. |
| 15 | Sidebar/details/Agent resizing and panel visibility | Partial. Whole hidden panes become inert, but resizing is pointer-only and a collapsed folder section remains focusable. Findings 4, 13. |
| 16 | Agent composer, conversation, review | Partial. Composer and review controls are labeled; conversation completion lacks a dedicated announcement path. Finding 18. No provider request was sent. |
| 17 | Dialogs, context menus, confirmation and recovery | Existing foundations. Base UI underpins modal/menu behavior; several forms have pending/error states. Nested overlays, keyboard context-menu targeting, focus return, and Undo focus require runtime checks. |
| 18 | Import, duplicate review, conversion, repair, library transfer | Source spot-check only. Explicit actions, progress/errors, and confirmations exist. OS dialogs, interrupted jobs, recovery states, and all branches need fixture-based live checks. |
| 19 | Onboarding, lock screen, theme, reduced motion | Partial. Lock form labels, autofocus, and error alerts exist. CSS/Motion reduced-motion support exists, with explicit smooth-scroll exceptions. Finding 20. First-run and unlock walkthroughs remain pending. |
| 20 | Browser extension companion | Boundary inspected. Connected popup is informational; capture uses extension/native entry points. Browser capture UI, permission flows, and OS extension interactions are not verified here. Eagle plugin marketplace and third-party plugins are outside this comparison. |

## Findings

### 1. P1 — Sidebar multi-selection is missing across folders and saved organization

**Source + Eagle.** `FolderTreeRow` discards click modifiers and calls `enterFolder(folder.id)`. `LibraryNav` represents one folder ID. Smart Folder entries similarly select one view, and subfolder cards open immediately. There is no sidebar selection set, range anchor, or focus cursor.

This prevents Cmd/Ctrl-click toggles, Shift-click ranges, selection-preserving right-click, a selected-folder count, and acting on a set from the sidebar. It also prevents an explicit combined-folder browsing mode. Do not confuse this with selecting several destination checkboxes in Assign Folders.

Eagle's `app/index.html:589` displays `selectedFolders.length`; `:907` changes the subfolder browser for a multiple-folder selection; `:932` reads `selectedFolderMappings`. Its English move-dialog variants at `i18n/en.js:565` describe multiple selected folders. Exact modifier and union/intersection behavior still needs live verification.

**Existing work to reuse:** Pond already has `folders.moveBatch`, `folders.renameBatch`, and `savedViews.renameBatch`. The move and rename dialogs collect their own selections. Dragging in the sidebar still carries one folder ID. This is principally a missing interaction/state integration, not a missing batch backend.

**Acceptance:** select siblings or non-adjacent folders, preserve that set when opening its context menu, seed move/rename with the exact IDs, and expose applicable batch commands. Define combined browsing explicitly, deduplicate Saves, and handle locked folders and ancestor/descendant selections. Keep active destination, selected set, and focused row distinct.

**Code:** [folder row](../../apps/desktop/src/renderer/src/features/library/components/folder-sidebar/folder-tree-row.tsx), [navigation type](../../apps/desktop/src/renderer/src/shared/lib/library-nav.ts), [Smart Folders](../../apps/desktop/src/renderer/src/features/library/components/smart-folders/index.tsx), [subfolder cards](../../apps/desktop/src/renderer/src/features/library/components/folder-browser/index.tsx), [drag/drop](../../apps/desktop/src/renderer/src/features/library/components/folder-sidebar/use-folder-drag-drop.ts), [move tools](../../apps/desktop/src/renderer/src/features/library/components/folder-tools/index.tsx), [batch rename](../../apps/desktop/src/renderer/src/features/library/components/organization-rename-dialog/index.tsx).

### 2. P1 — The sidebar has no tree keyboard navigation

**Source; Pond baseline.** Folder rows are individual buttons. No tree controller handles Up/Down, Left/Right, Home/End, range extension, or typed-prefix navigation. Tab can reach buttons but is inefficient for large folder hierarchies. Smart Folders and Groups have the same structural limitation.

**Acceptance:** Up/Down traverse visible rows; Right expands or enters a child; Left collapses or visits the parent; Home/End visit boundaries; typing finds a visible name. Define selection modifiers separately. These proposed conventions follow the [W3C tree pattern](../provenance/generated/REFERENCES.md#w3c-apg-treeview), not an unverified claim about Eagle's bytecode.

**Code:** [folder tree](../../apps/desktop/src/renderer/src/features/library/components/folder-sidebar/folder-tree.tsx), [row](../../apps/desktop/src/renderer/src/features/library/components/folder-sidebar/row.tsx), [Sidebar primitive](../../packages/ui/src/sidebar/index.tsx).

### 3. P2 — Folder hierarchy is visual rather than semantic

**Source + initial AX observation; Pond baseline.** Indentation is `data-depth`; the active destination uses `aria-current`. Those are useful, but there are no tree/treeitem relationships, selected states, or level/position metadata for the proposed selectable tree. Expansion belongs to a separate button.

**Acceptance:** implement semantics together with finding 2. Use a labeled tree, expansion state, selection state, and hierarchy information. Do not add tree roles without the corresponding keyboard behavior. The [W3C tree pattern](../provenance/generated/REFERENCES.md#w3c-apg-treeview) also distinguishes selection from DOM focus.

### 4. P1 — Collapsing the Folders section leaves its controls in the focus order

**Source.** `Sidebar.CollapsibleGroupContent` animates height/opacity but keeps descendants mounted. The Folders caller does not set `inert`, `hidden`, or `aria-hidden`. Smart Folder groups already supply `inert={!open}` and `aria-hidden={!open}`; the whole Window panes also do this correctly.

**Reproduction to run:** collapse the Folders heading, then Tab beyond it. Folder controls should never receive invisible focus. If focus was inside a collapsing region, return it to the heading.

**Code:** [Folders content](../../apps/desktop/src/renderer/src/features/library/components/folder-sidebar/folder-tree.tsx), [shared collapse](../../packages/ui/src/sidebar/index.tsx).

### 5. P1 — Gallery and Library list lack Up/Down and boundary navigation

**Source; requested desktop behavior.** `grid.prev`/`grid.next` bind Left/Right, and their Shift variants extend by one linear ID. There are no grid Up/Down bindings. All four Library layouts use this hook, including the vertical list. Remapping Right to Down would sacrifice Right rather than add spatial movement.

**Acceptance:** all four directions, appropriate row/column movement, range extension, boundaries, and offscreen reveal. Use layout geometry for justified/waterfall neighbors; define list behavior separately. Keep paging support. The [W3C grid guidance](../provenance/generated/REFERENCES.md#w3c-apg-grid) provides a focus-management baseline; exact geometry is a Pond implementation decision.

**Code:** [shortcut definitions](../../apps/desktop/src/shared/shortcuts.ts), [grid hotkeys](../../apps/desktop/src/renderer/src/features/library/hooks/use-grid-hotkeys.ts), [list layout](../../apps/desktop/src/renderer/src/features/library/components/layouts/list-view/index.tsx).

### 6. P2 — Gallery rectangle selection is absent

**Source + Eagle.** Eagle attaches `rect-select` to its main gallery at `app/index.html:788`, backed by `app/js/directives/rect-select.js`. Pond's gallery background handler clears selection; there is no rectangle-selection controller in the inspected gallery/selection implementation.

**Acceptance:** support background drag selection, additive modifiers, scrolling, cancellation, and clear selection feedback. Retain a complete keyboard equivalent; rectangle selection is a productivity feature, not a prerequisite for accessibility.

**Code:** [LibraryView](../../apps/desktop/src/renderer/src/features/library/components/view/index.tsx), [selection operations](../../apps/desktop/src/renderer/src/features/saves/lib/select.ts).

### 7. P1 — Gallery selection moves without moving DOM focus

**Source.** `useGridHotkeys` changes selection and invokes `resultNavigation.reveal`. The packed-grid reveal callback scrolls but does not focus the new Save. Each `Card.Select` is independently tabbable; virtual items can unmount while one still owns focus. There is no active-descendant relationship or logical position/total metadata for the virtual collection.

**Acceptance:** choose roving focus or active-descendant navigation, preserve a stable cursor across virtualization, and announce the current Save/selection. Tab should enter and leave the collection predictably. Test moving beyond the mounted window and returning from detail/preview. See [W3C grid guidance](../provenance/generated/REFERENCES.md#w3c-apg-grid).

**Code:** [packed-grid reveal](../../apps/desktop/src/renderer/src/features/library/components/layouts/packed-grid/index.tsx), [card](../../apps/desktop/src/renderer/src/features/saves/components/card/index.tsx), [card button](../../apps/desktop/src/renderer/src/features/saves/components/card/parts/index.tsx).

### 8. P1 — Enter and Space target the range anchor instead of its moving endpoint

**Source.** Extending with Shift+Right sets `primarySelection` to the new endpoint but keeps the original anchor. Enter in `useGridHotkeys` opens `selection.getAnchor()`. Quick preview also chooses the anchor. A range can visibly advance while opening/previewing its starting Save.

**Acceptance:** after selecting A and extending to C, define the current cursor as C; Enter/Space should act on that cursor while bulk actions still receive A–C. Keep the anchor only for range calculation.

**Code:** [grid movement/open](../../apps/desktop/src/renderer/src/features/library/hooks/use-grid-hotkeys.ts), [quick preview](../../apps/desktop/src/renderer/src/features/library/components/hover-preview/index.tsx), [selection state](../../apps/desktop/src/renderer/src/features/saves/state/selection.ts).

### 9. P1 — Native Select All Saves and Invert use only loaded results

**Source.** The native menu's `selectAllSaves()` and `invertSelection()` read `libraryViewContext.filteredIds()`, populated from loaded `data.filteredIds`. The grid shortcut has a separate `allIds()` path that can fetch the entire match set. A batch started from the native menu can therefore omit unloaded matches.

**Acceptance:** on a Library larger than one page, native menu, command invocation, and keyboard paths must agree on count and exact IDs. Show pending/error state while resolving the full result set. This is distinct from the native text-editing Select All menu item, which already has its own handler.

**Code:** [native selection commands](../../apps/desktop/src/renderer/src/app/effects/native-menu-actions.ts), [view context publication](../../apps/desktop/src/renderer/src/features/library/components/view/index.tsx), [Edit menu](../../apps/desktop/src/main/app-menu/edit-section.ts).

### 10. P1 — Keyboard commands lack consistent focus ownership

**Source-supported risk.** `SaveHotkeys` is mounted at the root and mostly gates on selection plus `ignoreInputs`, not the active pane. `DataTableHotkeys` listens on `document` and excludes editables/dialogs/menus but does not require focus in its own table. `AppHotkeys` also includes global single-key commands. Merely adding folder shortcuts would introduce more competing handlers.

**Reproduction to run:** select a Save and Tab to a sidebar or inspector button without changing selection; press a Save action key. On Sources/Downloads/Tags, focus a toolbar/sidebar button and press Enter, Up/Down, or Cmd/Ctrl+A. Verify only the focused surface responds. Do destructive checks with disposable fixtures.

**Acceptance:** establish ownership for sidebar, results, inspector, viewer, text editor, and overlay commands; block background handlers when another surface consumes a key. Preserve the existing editable guard.

**Code:** [SaveHotkeys](../../apps/desktop/src/renderer/src/features/saves/effects/save-hotkeys.tsx), [root shell](../../apps/desktop/src/renderer/src/app/components/root-shell.tsx), [DataTable hotkeys](../../packages/ui/src/data-table/hotkeys.tsx), [editable guard](../../apps/desktop/src/renderer/src/app/effects/editable-hotkey-guard.tsx).

### 11. P1 — DataTable range extension has no independent cursor

**Source.** Each keypress infers the cursor as the last selected row in display order. Shift+Up from C adds B, but the next Shift+Up again starts at C and cannot extend to A. `toggleRow(..., true)` unions the range into the prior set, so reversing direction cannot shrink it predictably.

**Acceptance:** separate cursor, anchor, and selected IDs. Test repeated upward extension, downward extension, reversal, non-adjacent selections, sorting, and grouped rows. Affects DataTable consumers including Sources, Downloads, and Tags; Library list uses a different implementation.

**Code:** [table hotkeys](../../packages/ui/src/data-table/hotkeys.tsx), [table selection actions](../../packages/ui/src/data-table/provider.tsx).

### 12. P1 — DataTable declares a grid but does not implement its focus contract

**Source.** The root uses `role="grid"`; rows use `role="row"` and `aria-selected`. Neither root nor generic row provides a managed tab stop/cursor. Arrow handlers select without focusing or scrolling the target. The virtual body has no selection-driven `scrollToIndex`; it also lacks logical row indices/count and multi-select metadata.

**Acceptance:** a keyboard user must enter the collection, identify the current row, move beyond the viewport, and reach row actions. Implement the [W3C grid focus model](../provenance/generated/REFERENCES.md#w3c-apg-grid), or use a simpler semantic table with an explicitly complete interaction model.

**Code:** [root](../../packages/ui/src/data-table/parts.tsx), [row](../../packages/ui/src/data-table/row.tsx), [virtual body](../../packages/ui/src/data-table/body.tsx).

### 13. P1 — Pane resizing is pointer-only and exposes a stale value

**Source; Pond baseline.** The Window resize handle has `tabIndex={-1}` and only `onPointerDown`. Its `aria-valuenow` is the default width, not the current resized width. Sidebar, Details, and Agent use this primitive.

**Acceptance:** a focusable separator, directional resizing, accurate current value, accessible collapse/restore, and sensible bounds. The [W3C window-splitter pattern](../provenance/generated/REFERENCES.md#w3c-apg-window-splitter) is guidance; that page identifies its own example/review limitations.

**Code:** [Window resize handle](../../packages/ui/src/window/index.tsx), [pane composition](../../apps/desktop/src/renderer/src/features/library/components/workspace-shell/index.tsx).

### 14. P2 — Assign Folders lacks the fast keyboard picker path

**Source + Eagle.** Pond provides search, labeled mixed-state checkboxes, Apply, creation, and Repeat Last. It does not provide a cursor moved from search with arrows or a tree navigator. Repeated Tab presses are the available checkbox path. Eagle's current `select-panel.js` handles directional keys/Enter/Escape, and `folder-select-panel.js` implements expansion plus All/Recent/Selected views.

**Acceptance:** search, move through results, toggle destinations, and apply entirely from the keyboard with visible instructions. Keep names as full paths, mixed states, and explicit confirmation. Do not replace the working checkbox accessibility with mouse-only rows.

**Code:** [folder picker](../../apps/desktop/src/renderer/src/features/library/components/folder-picker/index.tsx).

### 15. P1 — Generic Settings selects and numeric fields lose their setting name

**Source; Pond baseline.** `ItemTitle` is an unrelated `h3`. The generic select branch does not pass `aria-label` to `EnumSelect`, even though it accepts it; the number branch has no label association. A select can expose only its value, such as Last Screen, rather than Startup Behavior. Generic switches and range inputs already receive names.

**Acceptance:** associate each control with the visible title and description through IDs; preserve both value and setting name. Also give Settings search an explicit name. Verify representative General, Viewer, Downloads, and appearance fields with VoiceOver.

**Code:** [Settings control engine](../../apps/desktop/src/renderer/src/features/settings/components/engine/field-control/index.tsx), [EnumSelect](../../apps/desktop/src/renderer/src/shared/components/enum-select/index.tsx), [Settings primitive](../../packages/ui/src/settings/index.tsx), [Settings sidebar](../../apps/desktop/src/renderer/src/features/settings/components/sidebar/index.tsx).

### 16. P2 — Rating stars do not expose the selected rating

**Source.** Star buttons have names but only `data-active` reflects the rating. There is no checked/pressed state or associated current-rating value. The controls can be activated but their state cannot be reliably derived from their accessible properties.

**Acceptance:** expose the current rating and removal action. Prefer a coherent radio-style scale with an unrated option, or clearly defined pressed buttons. Keep existing numeric shortcuts.

**Code:** [RatingStars](../../apps/desktop/src/renderer/src/features/saves/components/detail/rating/index.tsx).

### 17. P1 — Some spatial viewer tasks have no equivalent keyboard operation

**Source; Pond baseline.** Crop nudging exists, but is explicitly limited to crop mode. The Navigator button derives position from mouse coordinates, so keyboard activation cannot choose a meaningful location. The 3D viewer attaches OrbitControls to a canvas without a keyboard listener/focus path; Reset and grid toggling do not provide orbit/pan/zoom equivalence.

**Acceptance:** directional navigator movement; keyboard camera controls or equivalent explicit buttons. Review `role="application"` on the image stage against actual keyboard support. Existing crop controls should be retained.

**Code:** [image gestures](../../apps/desktop/src/renderer/src/features/saves/components/viewers/image-inspector/image-gestures.ts), [crop keys](../../apps/desktop/src/renderer/src/features/saves/components/viewers/image-inspector/use-crop-keyboard.ts), [navigator](../../apps/desktop/src/renderer/src/features/saves/components/viewers/image-inspector/navigator/index.tsx), [3D viewer](../../apps/desktop/src/renderer/src/features/saves/components/viewers/model-viewer/index.tsx).

### 18. P2 — Agent response completion has no dedicated announcement path

**Source-supported risk; Pond-only feature.** ConversationView/Thread render ordinary containers and messages; the Agent caller does not add a live log or completion announcer. Initial conversation loading and parts of review have status semantics, but an arriving answer does not have the same explicit contract.

**Acceptance:** announce meaningful completion, failure, or required action without reading every streamed token. Preserve the user's reading position and offer a keyboard route to the response. Verify actual VoiceOver behavior before assigning a conformance result.

**Code:** [Agent pane](../../apps/desktop/src/renderer/src/features/agent/components/pane/index.tsx), [ConversationView](../../packages/ui/src/thread/index.tsx), [Thread](../../packages/ui/src/thread/index.tsx).

### 19. P2 — Command palette Enter does not guard IME composition

**Source-supported risk.** The palette executes its active entry on every Enter keydown, without checking composition state. Confirming an East Asian input candidate could also execute a command. Eagle's extracted `select-panel.js` explicitly distinguishes Enter keydown/keyup because of input-method behavior.

**Acceptance:** committing composed text must never run the highlighted command; only the subsequent intentional Enter should execute it. Test composition, dead keys, and normal Enter. Existing Up/Down, Home/End, combobox semantics, and scrolling are strengths.

**Code:** [command palette](../../apps/desktop/src/renderer/src/features/library/components/command-menu/index.tsx).

### 20. P2 — Explicit smooth scrolling bypasses the reduced-motion decision

**Source-supported risk.** App scroll-to-top/bottom and Thread's Latest Message request `behavior: "smooth"` unconditionally. CSS reduced-motion overrides and MotionConfig exist, but do not express a preference decision at these imperative scroll calls.

**Acceptance:** use immediate scrolling when reduced motion is requested, for both OS and Pond preference paths. Verify actual Chromium behavior. Other animations, auto-play, and focus-ring contrast require live checks rather than conclusions from this source scan.

**Code:** [app scrolling](../../apps/desktop/src/renderer/src/app/effects/app-hotkeys.tsx), [Latest Message](../../packages/ui/src/thread/index.tsx), [global CSS](../../apps/desktop/src/renderer/src/styles.css).

## Recommended implementation order

1. **Selection and command ownership:** resolve finding 10; model sidebar selection/cursor/anchor separately from the active destination; connect existing batch operations. Implement 1–4 together.
2. **Collection navigation:** complete spatial gallery navigation and focus/virtualization, fix anchor targeting and full-result menu selection, then repair DataTable cursor/ranges and reveal. Findings 5, 7–12.
3. **Shared accessibility:** Settings label associations and keyboard splitters, then picker efficiency and rating state. Findings 13–16. These shared changes improve multiple screens.
4. **Viewer and text input completeness:** keyboard spatial operations, Agent announcements, IME protection, reduced-motion scrolling, and rectangle-selection polish. Findings 6, 17–20.

Keep renderer selection in its owning feature; reusable focus mechanics can live in `packages/ui`. App composition should arbitrate commands between features. Main should continue receiving explicit validated IDs for mutations. Follow the existing [architecture](../contributing/architecture.md); this audit does not propose moving persistence into UI components.

## Live acceptance matrix still required

Use a disposable Library with 20 nested folders, duplicate folder names, a locked branch, multiple Smart Folder Groups, at least 600 Saves, and enough Sources/Downloads/Tags rows to virtualize. Include mixed media and empty/error states. Do not run destructive acceptance cases on the personal Library.

| Exercise | Required observation |
| --- | --- |
| Select, extend, shrink, toggle, clear, and right-click | Exact selected IDs, stable cursor/anchor, preserved context-menu targets |
| Collapse a selected ancestor; filter, sort, rename, move, and remove selected rows | No hidden focus, stale action target, unexpected range, or lost destination context |
| Navigate every collection beyond the viewport and across a query page boundary | Target is mounted, visible, focused/announced, and still the command target |
| Switch among sidebar, search, collection, inspector, Agent, and modal | One owner per key; text editing and focused buttons keep their expected behavior |
| Open detail/preview, nested menu/dialog, then Escape/Back | Focus returns to the logical originating control; layered Escape dismisses only the intended layer |
| Use native menu Select All/Invert, then keyboard equivalents | Counts and IDs agree across the complete filtered result set |
| VoiceOver traversal of trees, grids, settings, ratings, progress, and errors | Names, roles, values, selection, expansion, position, and meaningful updates are announced |
| All layouts, 200% interface zoom, narrow window, light/dark/custom themes | No clipped controls or obscured focus; measure contrast/target size in rendered states |
| OS and Pond reduced motion, IME composition, repeat keys | No unwanted motion, accidental command, repeated action, or focus jump |
| Image crop, navigator, 3D, video/audio, detached preview | Every non-path-dependent operation has an operable keyboard route |

Repeat the same selection and navigation exercises in Eagle to distinguish exact parity from Pond's accessibility baseline. Eagle is a workflow comparator, not an accessibility certification target.

## Checks performed

Eight existing offline Vitest files passed: **52 tests** across app hotkeys, editable-target handling, Save selection operations, result navigation, folder tree, sidebar navigation, command menu, and Window resizing. These tests validate existing behavior; they do not cover all findings above, and their passing result is not evidence that the missing interactions work.

Command:

```sh
pnpm --filter @pond/desktop exec vitest run \
  src/renderer/src/app/effects/app-hotkeys.test.tsx \
  src/renderer/src/shared/lib/editable-target.test.ts \
  src/renderer/src/features/saves/lib/selection.test.ts \
  src/renderer/src/features/saves/state/result-navigation.test.ts \
  src/renderer/src/features/library/components/folder-sidebar/folder-tree.test.tsx \
  src/renderer/src/features/library/components/folder-sidebar/navigation.test.tsx \
  src/renderer/src/features/library/components/command-menu/command-menu.test.tsx \
  src/window-resize.test.tsx
```

The environment ran Node `25.1.0` and pnpm `11.27.0`; the repository specifies Node 24, so pnpm emitted an engine warning. No production build or full repository check was performed for this documentation-only audit. The then-current `pnpm references:check` passed its 29 tests and offline reference/link validation; changed documentation also passed `git diff --check`. Full live verification remains blocked on an unlocked desktop.


## Follow-up verification

- The final `pnpm check` passed all 22 tasks using Node 24.21.0, including 2,663 desktop tests, shared UI tests, type checking, Biome, Oxlint, unused-code checks, architecture rules, generated-copy verification and reference checks. Regression coverage includes clearing pending folder selection from Sources/Downloads and loading deferred dialogs.
- Native socket and macOS HEIC fixture tests failed within the restricted sandbox and passed with normal host capabilities. The final full check used those host capabilities; live-network tests remained separate.
- Desktop, website, extension, CLI and Raycast compiled. The default Raycast build writes into its installed extension directory, which the sandbox cannot write; verification instead used the CLI's supported output option to build under `.tmp/interaction-raycast-build`.
- The first performance pass exceeded desktop budgets. Loading optional ZIP export support and Action/Conversion dialog bodies on use brought all five budgets back within their existing limits, without increasing them. The final desktop main bundle is 3,063.4 / 3,173.8 KiB and renderer is 5,261.0 / 5,273.4 KiB.
- The dialog measurement regression fixture now specifies its own header size. It continues to verify observation after outgoing content unmounts, independently of a pre-existing change to the header's visual default.

The remaining acceptance work is the live interaction/VoiceOver matrix above. Automated component tests cover keyboard events, paging, virtual reveal, range reversal, noncontiguous selection, modal/pane ownership, cancellation, IME, focus return, camera movement and meaningful announcements; they do not substitute for a full assistive-technology pass.
