# Tabs and sidebar design QA

## Source and implementation

- Source target: Linear desktop tab strip and tab context menu.
- Source screenshot: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/com.openai.sky.CUAService/Linear Screenshot 2026-08-29 at 9.58.30 PM.jpeg`
- Source context-menu screenshot: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/com.openai.sky.CUAService/Linear Screenshot 2026-08-29 at 10.07.18 PM.jpeg`
- Implementation screenshot: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/com.openai.sky.CUAService/Pond Screenshot 2026-08-29 at 10.26.25 PM.jpeg`
- Implementation context-menu screenshot: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/com.openai.sky.CUAService/Pond Screenshot 2026-08-29 at 10.28.09 PM.jpeg`
- Full-view comparison: `/private/tmp/pond-linear-full-comparison.png`
- Focused tab-strip comparison: `/private/tmp/pond-linear-focus-comparison.png`
- Context-menu comparison: `/private/tmp/pond-linear-menu-comparison.png`
- Motion implementation screenshot: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/com.openai.sky.CUAService/Pond Screenshot 2026-08-29 at 10.33.50 PM.jpeg`
- Motion full-view comparison: `/private/tmp/pond-linear-motion-full-comparison.png`
- Motion tab-strip comparison: `/private/tmp/pond-linear-motion-tabs-comparison.png`

## Viewport and state

- Linear source viewport: 1292 × 768.
- Pond implementation viewport: 1134 × 768.
- Focused region: 650 × 44 titlebar crop, with Linear above Pond.
- Compared state: three open tabs, one active tab, one focused/hovered tab, plus new-tab action.
- Context-menu state: right-click on an inactive tab.

## Component measurements

- Header height: 44px (Linear inspected value was 43.5px).
- Tab height: 28px.
- Tab width range: 160–200px; pinned tabs collapse to 28px.
- Tab gap: 4px.
- Label size: 12px, medium weight.
- Icon/avatar size: 14px.
- Action hit area: 20px.

## Interaction tests

- Open: passed — Command-T appends and activates a new tab.
- Activate: passed — click and keyboard focus update the active tab.
- Hover: passed — hidden tab actions reveal without shifting the fixed-width capsule.
- Focus: passed — the thin accent outline matches Linear's focused-tab treatment.
- Right-click: passed — menu opens without requiring tab activation and exposes Pin, New, Duplicate, Close, Close Others, and Close to Right.
- Close: passed — close action and Delete/Backspace paths preserve a neighboring active tab.
- Rapid close: passed by implementation inspection — remaining widths freeze until pointer exit so repeated close targets stay stationary.
- Drag: passed — the dnd live region announced pickup/drop and the capsule now explicitly opts out of Electron window dragging. The three test labels were identical, so the accessibility tree could not visually distinguish their reordered identities.
- Reduced motion: passed — tab and toolbar transitions are disabled when requested by the OS.
- Open lifecycle: passed — newly mounted tabs expand from zero width while fading and scaling from 98% over 180ms.
- Close lifecycle: passed — every removal path uses the same 180ms contraction, including menu, keyboard, and bulk closes.
- Neighbor movement: passed — flex layout responds continuously to the animated slot width instead of jumping after removal.

## Console and checks

- `@pond/ui` typecheck: passed.
- Biome check for the four touched tab/toolbar files: passed.
- Pond desktop typecheck: blocked by pre-existing `TransitionEvent` listener errors in `src/renderer/src/lib/util/settled-resize.ts` lines 65 and 69.
- Electron runtime: no tab-specific errors observed.

## Findings and comparison history

1. Initial live comparison matched the capsule sizing, neutral fills, active elevation, hidden hover actions, and focus ring.
2. First drag test exposed a missing Electron `-webkit-app-region: no-drag` declaration after moving the tab visuals into the shared UI package.
3. Added the declaration to the shared tab item and repeated the dnd pickup/drop test.
4. Final side-by-side checks show the intended Linear rhythm and state hierarchy. Pond keeps its existing design tokens and omits Linear's unsupported multi-window command.
5. Added a shared presence wrapper so opening and closing tabs animate independently from the store and remain consistent across every command path.
6. Repeated the full and focused source comparison after the lifecycle-motion change; steady-state geometry remained unchanged.

## Sidebar source and implementation

- Source target: Linear desktop navigation sidebar in its expanded state.
- Source screenshot: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/com.openai.sky.CUAService/Linear Screenshot 2026-08-29 at 10.00.07 PM.jpeg`
- Pond expanded screenshot: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/com.openai.sky.CUAService/Pond Screenshot 2026-08-29 at 10.53.47 PM.jpeg`
- Pond final contrast screenshot: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/com.openai.sky.CUAService/Pond Screenshot 2026-08-29 at 10.56.56 PM.jpeg`
- Pond collapsed screenshot: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/com.openai.sky.CUAService/Pond Screenshot 2026-08-29 at 10.53.31 PM.jpeg`
- Source/implementation comparison: `/private/tmp/pond-linear-sidebar-comparison.png`
- Expanded/collapsed comparison: `/private/tmp/pond-sidebar-open-closed.png`

## Sidebar motion and interaction

- Shell width: 200ms using the design system's decelerating easing; the library content and main surface move together.
- Content reveal: 80ms opacity transition with an 80ms opening delay, paired with a restrained 6px inward translation over 150ms.
- Toggle synchronization: passed — the shell's controlled edge state begins its transition in the same render as the toolbar/menu command.
- Collapse: passed — the navigation tree and resize splitter leave the accessibility tree once the edge is closed.
- Expand: passed — the navigation tree and splitter return after the edge opens, with the saved 220px width restored.
- Resize affordance: passed by implementation inspection — the 8px edge target supports pointer drag, click-to-collapse, a hover accent, and a short instructional tooltip.
- Agent pane parity: passed — the right pane uses the same lifecycle, mirrored 6px direction, and saved-width behavior.
- Reduced motion: passed — shell width, pane opacity, and translation transitions are disabled when requested by the OS.
- Final visual comparison: passed — Pond preserves its own content and tokens while matching Linear's quiet neutral rail, selected-row hierarchy, and edge-to-content relationship.
- Navigation contrast: passed — inactive rows use gray 10, hover raises to gray 11, and the active row uses gray 12 against its selected fill.

## Sidebar checks

- `@pond/ui` typecheck: passed.
- Biome check for the Window shell and AppShell files: passed.
- `git diff --check`: passed.
- Pond desktop typecheck: still blocked only by the pre-existing `TransitionEvent` listener errors in `src/renderer/src/lib/util/settled-resize.ts` lines 65 and 69.
- Electron runtime: expanded and collapsed states rendered without sidebar-specific errors after the final hot reload.

final result: passed

---

# Global Search Command Menu

## Source and Implementation

- Trigger source: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-a13cc47d-31f8-403a-9332-5be95138cfa6.png`.
- Linear command-menu reference: `/Users/raphaelsalaja/.codex/visualizations/2026/09/02/01a06145-d834-7051-88be-ce792a747bf4/linear-command-menu-reference.png`.
- Resurf global-action reference: `/Users/raphaelsalaja/.codex/visualizations/2026/09/02/01a06145-d834-7051-88be-ce792a747bf4/resurf-command-surface-reference.png`.
- Final Pond implementation: `/Users/raphaelsalaja/.codex/visualizations/2026/09/02/01a06145-d834-7051-88be-ce792a747bf4/pond-command-menu-final.png`.
- Combined comparison: `/Users/raphaelsalaja/.codex/visualizations/2026/09/02/01a06145-d834-7051-88be-ce792a747bf4/command-menu-comparison.png`.
- Source pixels: 594 × 118 for the trigger crop; 1280 × 720 for both competitive references.
- Implementation pixels and CSS viewport: 981 × 984 at the browser's default density.
- State: light theme, palette open with an empty query and Library selected.

## Evidence and Required Fidelity Surfaces

- Full-view comparison: passed. Pond uses Linear's top-centered search-and-command hierarchy and Resurf's compact global-action surface while preserving Pond's light theme, spacing tokens, and accent.
- Focused evidence: the combined comparison places both references and the rendered Pond surface in one image. The input, grouped rows, active state, shortcut column, backdrop, radius, and elevation are legible at the normalized size.
- Fonts and typography: passed. The menu inherits Pond's product typeface and uses a 16px search input, compact menu labels, muted secondary context, and tabular shortcut glyphs.
- Spacing and layout rhythm: passed. The 620px surface, 58px search row, 42px result rows, 8px list padding, 16px radius, and top-biased placement match the references' fast, keyboard-first density.
- Colors and visual tokens: passed. The palette uses Pond's gray, accent, border, focus, and shadow tokens. The selected row is visible without overpowering the result text.
- Image quality and asset fidelity: passed. The surface requires no raster imagery. All visible icons come from `@pond/icons`; no handcrafted SVG, CSS drawing, emoji, or placeholder asset was introduced.
- Copy and content: passed. Labels follow Pond's title-case menu convention, status text stays sentence case, and the search placeholder is the only new chrome string using an ellipsis.

## Findings and Comparison History

- Initial [P1]: the header Search control focused an inline Library field and did not expose the requested global command surface.
- Fix: added one controlled command menu opened by the header control, `Command/Ctrl+K`, and the app menu. The palette searches saves, commits full-library searches, navigates between major sections, and exposes common actions.
- Initial [P2]: the first copy pass used sentence-case action labels and curly quotation marks around the query.
- Fix: aligned action labels with Pond's title-case menu convention and moved the raw query into secondary text.
- Post-fix comparison: no actionable P0/P1/P2 visual mismatch remains. Pond intentionally uses a lighter, quieter active fill than the older dark Linear reference.

### Follow-up production pass

- Source visual truth: `/Users/raphaelsalaja/Developer/pond/apps/desktop/prototypes/linear-comparison/public/evidence/linear-command-menu-crop-current.png` and `linear-command-menu-search-crop-current.png`.
- Implementation screenshots: `/Users/raphaelsalaja/.codex/visualizations/2026/09/02/01a062cd-a0dd-7462-a157-7b08fbc2dec8/pond-command-menu-final-default.png` and `pond-command-menu-final-search.png`.
- Normalized comparisons: `/Users/raphaelsalaja/.codex/visualizations/2026/09/02/01a062cd-a0dd-7462-a157-7b08fbc2dec8/command-menu-final-default-comparison.png` and `command-menu-final-search-comparison.png`.
- Viewport and density: 1280 × 720 CSS pixels and a 1280 × 720 browser capture. The default Pond surface is 680 × 450 pixels; the filtered surface is 680 × 230 pixels. The 720 × 450 Linear source was normalized to 680 × 450 for the default comparison.
- State: light theme. Default comparison uses an empty query with New Folder selected. Filtered comparison uses `settings` with Search Library selected.
- Initial [P2]: the production palette still led with broad destinations, rendered explanatory text on every command, boxed every icon, exposed only 10 default commands, and used a fixed Open footer hint.
- Fix: creation and import commands now lead the catalog; navigation and app commands follow. The menu exposes 18 default commands, uses compact unboxed icons and 34px rows, adds selection and folder-scoped actions, and changes the Enter hint between Search, Open, and Run.
- Post-fix evidence: the default comparison matches Linear's 450px command-catalog frame and keyboard-first row density. The filtered comparison preserves Pond's full-library search while matching Linear's compact command-first hierarchy. No actionable P0/P1/P2 mismatch remains.
- Fonts and typography: passed. Pond keeps its product typeface and optical weights while matching the source's compact single-line command hierarchy.
- Spacing and layout rhythm: passed. The 680 × 450 default frame, 48px input, 34px rows, 6px list inset, and scrollable catalog align with the normalized source.
- Colors and visual tokens: passed. Pond retains its semantic gray, accent, border, and shadow tokens. The blue selection remains an intentional product distinction.
- Image quality and asset fidelity: passed. The surface contains no raster imagery. Every visible command icon comes from `@pond/icons`.
- Copy and content: passed. Commands use terse title-case labels, remove redundant descriptions, and keep the query visible in the input.

## Interaction and Engineering Checks

- Keyboard selection: passed. Arrow Down moved selection from Library to Sources; Arrow Up restored Library.
- Close behavior: passed. Escape closed the dialog and returned it to the hidden state.
- Accessibility: passed. The surface exposes a named dialog, expanded combobox, listbox, selected option, active descendant, and keyboard-operable results.
- Clean browser pass: passed with no console warnings or errors in a fresh preview tab.
- Targeted command-menu and sidebar tests: 11 passed.
- Desktop typecheck: passed.
- Focused Biome check: passed.
- Follow-up browser pass: passed. Search filtering, Arrow Down selection, dynamic footer copy, Escape close, and a clean console were verified in the 1280 × 720 preview.
- Full desktop suite observation: 1020 tests passed and 20 skipped; two unrelated native Unix-socket tests were blocked by sandbox `EPERM`.

final result: passed

---

# Compact tag-filter header parity

## Source and implementation

- Source visual truth: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-6e8157a7-f319-4e2b-b447-d73cbf2c29f8.png`.
- Implementation screenshot: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/com.openai.sky.CUAService/Pond Screenshot 2026-09-02 at 8.31.42 AM.jpeg`.
- Focused normalized comparison: `/private/tmp/pond-tag-header-comparison.png`.
- Source pixels: 800 × 198. The source is a focused @2x-style crop, but its CSS viewport and device scale factor are not exposed.
- Implementation pixels and viewport: 1084 × 768 Computer Use capture of the Pond desktop window. The capture density and the app's CSS viewport are not exposed.
- Normalization: the source popover header was cropped from `728 × 84` pixels and normalized to `364 × 42`; the implementation header was cropped from `304 × 42` pixels and normalized to the same 364-pixel width. The two normalized headers were stacked into the focused comparison.
- State: light theme, Tags filter open, empty search, All Tags selected, Any Selected rule active.

## Comparison evidence

- Full-view evidence: the implementation screenshot shows the open tag filter in its real Library context, anchored to the Tags chip with the two-column browser visible beneath the compact header.
- Focused evidence: the normalized comparison opens the source and implementation headers in one image. Search, Rule label, three-button segmented control, divider, radius, and compact vertical density align closely.
- Fonts and typography: passed. Pond retains its design-system typeface and optical weights; the search placeholder and Rule label match the source hierarchy and remain legible.
- Spacing and layout rhythm: passed. Search and rules now share one 40px header row; the picker is narrowed to a 380px target width with a 132px navigation track, matching the source's compact proportions.
- Colors and visual tokens: passed. Background, subtle divider, muted label, selected-rule surface, border radius, and elevation use Pond's existing semantic tokens and visually match the source.
- Image quality and asset fidelity: passed. The search and rule controls use committed Nucleo icons from `@pond/icons`; no raster placeholders, handcrafted SVGs, CSS drawings, or text-glyph icons were introduced.
- Copy and content: passed for the requested styling scope. Pond intentionally preserves its accessible Any Selected, All Selected, and Exclude Selected semantics rather than presenting Eagle's unimplemented exact-set rule.

## Findings and comparison history

- Initial [P2]: Pond's tag picker used a full-width search row followed by two large select controls, making the header substantially taller and wider than the supplied reference.
- Fix: combined search and rule controls into one compact row, added the leading search icon and Rule label, replaced the selects with a three-button segmented rule control, narrowed the popup, and tightened the navigation column.
- Post-fix evidence: the focused normalized comparison shows matching header composition and density. No actionable P0/P1/P2 mismatch remains.
- Follow-up polish [P3]: Pond's Nucleo All Selected and Exclude Selected glyphs differ from Eagle's literal rule glyphs because Pond exposes different supported semantics. This is an intentional product constraint, not a styling defect.

## Interaction and engineering checks

- Live Pond window: tag picker opened successfully and search received focus.
- Targeted filter-editor tests: 5 passed, including Any/All mode changes, exclusion, and Untagged search.
- Desktop typecheck: passed.
- Focused Biome check: passed.
- Full desktop suite observation: 695 tests passed, 20 skipped; two unrelated native Unix-socket tests remain blocked by sandbox `EPERM`.

final result: passed

---

# Shared flat save menu

## Source and implementation

- Source visual truth: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-8ceb9c3b-1a7f-41cf-b04f-cc30845392e6.png`.
- Browser-rendered implementation screenshot: `/Users/raphaelsalaja/Developer/pond/docs/research/assets/save-detail-menu/implementation-reference-page-current.png`.
- Focused source crop: `/Users/raphaelsalaja/Developer/pond/docs/research/assets/save-detail-menu/source-reference-menu-current.png`.
- Focused implementation crop: `/Users/raphaelsalaja/Developer/pond/docs/research/assets/save-detail-menu/implementation-reference-menu-current.png`.
- Combined comparison evidence: `/Users/raphaelsalaja/Developer/pond/docs/research/assets/save-detail-menu/reference-menu-comparison-current.png`.
- Source pixels: 586 × 1014; focused menu crop 480 × 894.
- Implementation viewport: 1280 × 720 output pixels. The menu measured 240 × 446 CSS px at device scale factor 2; its browser capture was density-normalized to 480 × 892 for the comparison.
- State: light theme, single EPUB file, tag clipboard empty, shared save-action menu open.

## Evidence and required fidelity surfaces

- Full view: the isolated browser render uses Pond's production `Menu` components and the same `buildSaveMenu` definition consumed by the library context menu and detail ellipsis.
- Focused comparison: the source and implementation are placed together at matching width and density. Both show one flat action list with the same five groups, row order, shortcut column, disabled Paste Tags state, Reverse Image Search affordance, and Set Custom Thumbnail action.
- Fonts and typography: passed. Labels remain single-line, shortcuts align to a stable trailing column, and the implementation uses Pond's existing UI typeface and optical weights.
- Spacing and layout rhythm: passed. Row rhythm, group separators, padding, and action hierarchy match. Pond retains its shared compact menu radius and density so this menu stays consistent with every other app menu.
- Colors and visual tokens: passed. The light surface, dark labels, muted disabled state, subtle separators, and elevation follow the supplied light-theme reference through Pond's semantic menu tokens.
- Image quality and asset fidelity: passed. This surface contains no raster imagery; the submenu caret and keyboard glyphs come from the existing design-system components.
- Copy and content: passed. The visible commands match the supplied target exactly: Open with Default App, Reveal in Finder, Copy URL, Copy File, Copy File Path, Paste Tags, Reverse Image Search, Export, Set Custom Thumbnail, Move to Trash, Refresh Details, and Open Original URL in Browser.

## Findings and comparison history

- Earlier [P1]: the detail ellipsis exposed icon-led Open, Copy, Search, and Enhance category submenus, matching the rejected compact menu rather than the supplied flat reference.
- Fix: the detail ellipsis now consumes the shared `buildSaveMenu` action list, while the shared menu supplies the file-specific Copy File and Set Custom Thumbnail rows.
- Regression coverage: added an exact visible-label assertion for the supplied file-menu state and explicit rejection of the old Open, Copy, Search, and Enhance category labels.
- Post-fix evidence: the live Electron accessibility tree and the isolated browser render both expose the exact flat command sequence; the browser console reported no warnings or errors on the final render.
- No actionable P0/P1/P2 mismatch remains.

## Engineering checks

- Focused save-menu tests: 4 passed.
- Focused Biome check: passed after formatting.
- `git diff --check`: passed.

final result: passed

---

# Stable breadcrumb origin

## Source and implementation

- Source visual truth, single crumb: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-ded2ba11-b3ed-4ea1-a7d4-234bf051de80.png`.
- Source visual truth, nested crumb: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-ce28715f-3ce4-4aa5-9053-b5f640b3ec93.png`.
- Implementation screenshot, single crumb: `/Users/raphaelsalaja/Developer/pond/docs/research/assets/breadcrumb-alignment/implementation-single.jpeg`.
- Implementation screenshot, nested crumb: `/Users/raphaelsalaja/Developer/pond/docs/research/assets/breadcrumb-alignment/implementation-nested.jpeg`.
- Combined source/implementation comparison: `/Users/raphaelsalaja/Developer/pond/docs/research/assets/breadcrumb-alignment/comparison.png`.
- Source pixels: 380 × 108 and 690 × 98; source CSS dimensions and density were not exposed.
- Implementation pixels and app viewport: 1292 × 768 at the native Computer Use capture density; CSS dimensions and device scale factor were not exposed.
- State: light theme, left sidebar open, comparing the Library root with a saved-video detail breadcrumb.

## Evidence and required fidelity surfaces

- Full view: both live Electron screenshots retain the same toolbar grid, sidebar width, right-pane behavior, and content frame while moving between list and detail states.
- Focused comparison: the supplied captures show Library shifting when it changes from the current span to a clickable parent Button. In the final implementation row, the Library icon and label share the same horizontal origin in both states.
- Fonts and typography: passed; font family, size, weight, line height, truncation, and label hierarchy are unchanged.
- Spacing and layout rhythm: passed; both current and clickable crumbs now use the breadcrumb-owned 6px horizontal inset, 6px icon gap, and 28px height.
- Colors and visual tokens: passed; current, parent, and separator colors remain mapped to the existing gray tokens.
- Image quality and asset fidelity: passed; the existing Nucleo library icon is unchanged and no image asset was introduced.
- Copy and content: passed; breadcrumb labels and separator content are unchanged.

## Findings and comparison history

- Initial finding [P2]: the clickable parent crumb inherited the shared small Button's 10px padding, so Library moved horizontally when a child crumb appeared.
- Fix: increased the breadcrumb-local rule specificity so its 6px padding, type size, height, and gap consistently override generic Button sizing.
- Post-fix evidence: live list and detail captures show the Library crumb at the same horizontal origin; the combined comparison records the before and after states.
- No actionable P0/P1/P2 mismatch remains.

## Engineering checks

- Toolbar and breadcrumb tests: 12 passed.
- Desktop typecheck: passed.
- Biome: passed.
- `git diff --check`: passed.

final result: passed

---

# Shared page-level empty-state anatomy

## Source and implementation

- Source visual truth: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-8ef391a3-30fc-4943-9e93-56a958940bab.png`.
- Implementation screenshot: `/Users/raphaelsalaja/Developer/pond/docs/research/assets/empty-state-audit/07-empty-states-implementation.jpeg`.
- Focused implementation crop: `/Users/raphaelsalaja/Developer/pond/docs/research/assets/empty-state-audit/08-downloads-empty-implementation.png`.
- Combined comparison: `/Users/raphaelsalaja/Developer/pond/docs/research/assets/empty-state-audit/09-reference-comparison.png`.
- Source pixels: 538 × 304. CSS size and density were not exposed.
- Implementation viewport: 1292 × 768 at the native Computer Use capture density.
- Focused implementation pixels: 352 × 244. It was proportionally normalized to a 538 × 304 black canvas for the combined comparison.
- State: dark theme, true-empty Downloads specimen rendered with the production `DownloadsEmpty` and shared `Empty` components.

## Evidence and required fidelity surfaces

- Full view: Pond's component workshop shows the production true-empty and filtered-empty variants in their surrounding desktop UI.
- Focused comparison: the supplied reference and normalized Downloads crop were opened together. Both use the approved vertical anatomy: bare icon, status title, one description, and one rounded primary action.
- Fonts and typography: passed. Pond retains its design-system family and uses the existing body semibold title and small regular description roles. The source is too soft to justify changing Pond's established font metrics.
- Spacing and layout rhythm: passed. The implementation preserves a centered optical group with 20px between icon, copy, and action and 8px between title and description. Fixed top-biased padding was replaced by centering within the available region.
- Colors and visual tokens: passed. The icon, title, secondary copy, and button use Pond's semantic gray and primary button tokens in dark mode.
- Image quality and asset fidelity: passed. Page states use contextual Nucleo icons from `@pond/icons`; no handcrafted or placeholder assets were introduced. The source's product glyph is intentionally replaced per route because the user selected its anatomy, not its brand mark.
- Copy and content: passed. Every production page state now has one sentence-case status title, one calm description, and one title-case action. Loading remains actionless because it does not require user intervention.

## Findings and comparison history

- Initial [P1]: true-empty states were left-aligned with repeated place-name titles and multiple descriptions or actions; filtered states omitted the icon and action; scoped Tags used a separate inline status treatment.
- Fix: moved all production page-level states to the shared centered anatomy, added contextual reset actions for filtered states, and replaced the Tags one-off with the shared primitive.
- Initial [P2]: the shared media slot rendered as a shadowed tile and state changes appeared immediately.
- Fix: removed the tile shadow and added a 4px opacity/translation entrance using Pond's medium and decelerate motion tokens, with a reduced-motion override.
- Post-fix evidence: the combined comparison shows the same approved hierarchy and quiet density. No actionable P0/P1/P2 visual mismatch remains.

## Interaction and engineering checks

- True-empty actions are wired to working route or creation flows for Library, Sources, Downloads, Trash, Tags, and scoped tag groups.
- Filtered-empty actions reset the owning Library, Sources, Downloads, or Tags query/filter state.
- The shared media slot is decorative to assistive technology; status variants retain polite live-region semantics.
- `@pond/ui` typecheck: passed.
- Desktop typecheck: passed.
- Focused Biome check: passed.
- Focused Tags, Downloads, and tag-menu tests: 14 passed.
- Desktop suite: 636 tests passed and 20 skipped. Two unrelated native socket tests were blocked by sandbox `EPERM` errors.
- Production-window follow-up capture was unavailable after macOS locked. The final visual evidence uses Pond's local workshop, which renders the production components directly.

final result: passed

---

# Nucleo star icon correction

## Source and implementation

- Source visual truth: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-3b14b9d0-c4ae-400f-9a28-55b29e3a5012.png`.
- Implementation screenshot: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/com.openai.sky.CUAService/Pond Screenshot 2026-09-01 at 5.57.39 PM.jpeg`.
- Focused implementation crop: `/private/tmp/pond-star-final-focus.png`.
- Source pixels: 96 × 142 focused crop; source CSS size and density were not exposed.
- Implementation pixels and app viewport: 1292 × 768 at the native Computer Use capture density; device scale factor was not exposed.
- Focused implementation pixels: 440 × 220.
- State: light theme, All Tags selected, empty search, tag actions menu open.

## Evidence and required fidelity surfaces

- Full-view comparison: the Tags rail now shows a plain five-point star beside `Starred`, and the open tag menu uses the same star for both starred actions.
- Focused comparison: the 96 × 142 reference crop and 440 × 220 implementation crop were opened together so the incorrect orbit/sparkle silhouette could be judged directly against the replacement.
- Fonts and typography: passed; labels, weights, and menu text were not changed.
- Spacing and layout rhythm: passed; the 18px glyph remains within the existing rail and menu icon slots with no row movement.
- Colors and visual tokens: passed; the icon inherits Pond's current-color treatment, including disabled-menu opacity.
- Image quality and asset fidelity: passed; the replacement is the exact locally exported Nucleo UI `star` 18px outline glyph, not a handcrafted approximation.
- Copy and content: passed; `Starred`, `Add to Starred`, and `Remove from Starred` remain unchanged.

## Findings and comparison history

- Initial finding [P2]: the visible icon was Nucleo's orbit/sparkle glyph, which did not communicate the requested plain starred state.
- Fix: added the licensed Nucleo UI `star` outline glyph to `@pond/icons` and used it in both Tags surfaces.
- Post-fix visual evidence: the implementation screenshot and focused crop show the plain five-point outline consistently in the rail and context menu.
- No actionable P0/P1/P2 mismatch remains.

## Engineering checks

- Icons allowlist: passed at exactly 100 glyphs.
- Icons typecheck: passed.
- Desktop typecheck: passed.
- Targeted Tags tests: 9 passed.
- Biome: passed.

final result: passed

---

# Eagle tag context-menu parity

## Source and implementation

- Source visual truth: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-6a7e6e9a-aee8-4162-8095-c28b1ecd2af0.png`.
- Implementation screenshot: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/com.openai.sky.CUAService/Pond Screenshot 2026-09-01 at 5.39.22 PM.jpeg`.
- Source pixels: 1056 × 808; the attachment is a focused crop and does not expose its CSS viewport or density.
- Implementation pixels and app viewport: 1292 × 768 at the native Computer Use capture density; device scale factor was not exposed.
- Normalization: compared the complete visible menus at native density rather than stretching the focused Eagle crop to the full Pond viewport.
- State: light theme, right-click on an unstarred tag currently in a group, with Move to Group open.

## Comparison evidence

- Full view: the final Pond capture keeps the menu anchored to the selected tag row and preserves the Tags index behind it.
- Focused region: the source and implementation were opened together at original detail. The command order, separators, disabled starred state, group submenus, and destructive final action align. Literal whole-image scale was not compared because the Eagle source is a crop at unknown density.
- No raster assets are present. Pond uses the existing icon package rather than recreated SVG or CSS assets.

## Required fidelity surfaces

- Fonts and typography: passed; compact Pond menu text preserves Eagle's command hierarchy and disabled treatment.
- Spacing and layout rhythm: passed; search, three command sections, submenu carets, separators, and final removal action follow the source structure.
- Colors and tokens: passed; Pond's neutral popup, hover, border, shadow, and disabled tokens map cleanly to Eagle's light menu states.
- Image quality and assets: passed; all icons are existing vector assets from `@pond/icons` and remain sharp.
- Copy and content: passed; the menu now exposes Filter Items with the Tag(s), separate Add/Remove Starred commands, Rename Tag, Add/Move/Remove group commands, and Remove tag. Merge Into and Convert to Group are absent.

## Interaction and engineering checks

- Right-click opens the searchable menu: passed.
- Searching `rename` filters the menu to Rename Tag: passed.
- Add to Group and Move to Group submenus open and list eligible groups: passed.
- Filter Items with the Tag(s) navigates to Library with the tag breadcrumb active: passed; returned to Tags afterward.
- Escape closes the context menu cleanly: passed after correcting input key propagation.
- Desktop typecheck: passed.
- Targeted Tags and context-menu tests: 9 passed.
- Biome: passed with one pre-existing non-null-assertion warning in the touched row context.
- `git diff --check`: passed.

## Findings and comparison history

- Initial implementation matched the requested command set and visual grouping.
- Interaction QA found that the search field stopped Escape from reaching the menu root. Printable-key propagation remains isolated for typing, while Escape now closes the menu.
- No actionable P0/P1/P2 mismatch remains. The number and names of submenu targets reflect Pond's live groups rather than Eagle's sample data.

final result: passed

---

# Eagle Tags parity follow-up

## Live source inspection

- Eagle All Tags grid: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/com.openai.sky.CUAService/Eagle Screenshot 2026-09-01 at 5.16.20 PM.jpeg`.
- Eagle list layout: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/com.openai.sky.CUAService/Eagle Screenshot 2026-09-01 at 5.18.22 PM.jpeg`.
- Pond final grid: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/com.openai.sky.CUAService/Pond Screenshot 2026-09-01 at 5.30.14 PM.jpeg`.
- Same-viewport source/implementation comparison: `/private/tmp/eagle-pond-tags-final.png`.
- Viewport: 1292 × 768 for both live app captures.

## Interaction parity

- All, Uncategorized, Starred, and named group scopes: passed.
- Search within the active scope: passed in Eagle and Pond.
- Whole-row tag selection: passed; the Eagle-style marker reveals Pond's bulk-selection checkbox on hover, focus, or selection.
- Group detail: passed; selecting a group shows its name, count, editable description, divider, and member tags without alphabet headings.
- Group add-tags control: passed; the detail `+` opens Pond's functional tag picker with group membership toggles and tag creation.
- Group creation placement: passed; the icon-only `+` is aligned at the right edge of the Groups heading and opens the inline group-name field there.
- Starred metadata: passed; the existing persisted `starred` field now reaches the renderer, has a dedicated scope, and can be toggled from tag actions.

## Visual comparison findings

- The nested collection rail, compact navigation rows, selected-state hierarchy, alphabetical section dividers, tag markers, parenthesized counts, and responsive multi-column grid match the Eagle source relationships.
- Pond intentionally retains its shared Library search chrome, with Assistant remaining the only chrome exception. The Tags chrome stays free of trailing actions; the Eagle layout switcher and the former `New Tag` button were removed at product direction.
- Pond uses its own tokenized colors, typography, icon set, and focus states while matching Eagle's density and layout structure.
- The Tags collection rail is transparent so it shares the content surface rather than introducing a second tinted panel.
- No actionable P0/P1/P2 mismatch remains in the same-size comparison.

## Engineering checks

- Desktop typecheck: passed.
- Targeted Tags tests: 6 passed.
- Full desktop tests: 637 passed, 20 skipped.
- Biome: passed for the final Tags files.
- `git diff --check`: passed.

final result: passed

---

# Shared library chrome and Tags design QA

## Source and implementation

- Library chrome source truth: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-09d86ff3-a972-43f5-8cae-c106989f5e43.png` and Pond's live Library route.
- Tags direction source: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-3bcf8581-5be9-466f-b672-babdb7fa690e.png`.
- Implementation screenshot: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/com.openai.sky.CUAService/Pond Screenshot 2026-09-01 at 3.05.00 PM.jpeg`.
- Full-view comparison: `/private/tmp/pond-tags-eagle-comparison.png`.
- Focused Tags-workspace comparison: `/private/tmp/pond-tags-eagle-focus-comparison.png`.

## Viewport, normalization, and state

- Eagle source pixels: 3464 × 2150. The app window was cropped to 3249 × 1925, then normalized to 1292 × 768 for the full comparison.
- Pond implementation pixels and CSS viewport: 1292 × 768 at the app's native screenshot density.
- Focused comparison: Eagle's tag sidebar and index were cropped and normalized to 1122 × 759; Pond's corresponding region was captured at 1122 × 735. The small height difference is retained rather than stretched.
- State: light theme, All Tags selected, empty search, Assistant side pane closed. Source and implementation contain different real tag datasets, so row count and occupied whitespace are expected to differ.

## Full-view and focused evidence

- Full view: Pond preserves its existing macOS shell and global sidebar while matching Eagle's nested tag collection rail, quiet selection treatment, alphabetical sections, divider rhythm, and multi-column-capable content region.
- Focused view: search remains in Pond's shared 48px Library chrome; the Tags collection rail sits directly below it; section labels, counts, compact tag rows, and separators follow the Eagle reference hierarchy.
- A focused comparison was required because the source includes an extra global Eagle sidebar and a much larger dataset; the workspace crop makes the comparable tag-management surfaces legible.

## Required fidelity surfaces

- Fonts and typography: passed. Pond keeps its existing Inter/design-system text roles, with small medium-weight collection labels, compact counts, and clear alphabetical hierarchy.
- Spacing and layout rhythm: passed. The shared search strip is 48px across Library, Sources, Downloads, and Tags; Tags uses a 180–220px collection rail, 32px navigation rows, 36px tag rows, and consistent section dividers.
- Colors and visual tokens: passed. All new UI uses Pond gray, border, radius, shadow, and focus tokens; the selected collection treatment is intentionally native to Pond rather than copying Eagle's exact gray values.
- Image quality and assets: passed. This screen has no raster content requirements; all visible icons use the existing Pond icon package.
- Copy and content: passed. Route-specific search placeholders are concise, tag/group counts pluralize correctly, and Assistant remains the explicit chrome exception.

## Findings and comparison history

- No actionable P0/P1/P2 visual mismatch remains.
- Intentional difference: Pond retains checkboxes and overflow actions on tag rows so rename, starred, group, removal, and bulk-selection actions remain discoverable; Eagle's passive bullet treatment would regress existing management behavior.
- Initial live comparison showed the desired shared header alignment and Eagle-like hierarchy. No visual correction was required after the combined full and focused comparison.

## Interaction and engineering checks

- Live Library, Sources, Downloads, Tags, and Assistant routes inspected in the Electron app.
- Tags group scoping: passed with the real `Design` group.
- Tags search: passed with the real query `user`, narrowing the selected group to `User Interface`; search was cleared after verification.
- Sources and Downloads route-specific controls remain available in the shared chrome.
- Assistant page remains unchanged and does not receive the shared search strip.
- Desktop typecheck: passed.
- Biome and `git diff --check`: passed.
- Desktop tests: 633 passed, 20 skipped.

final result: passed

---

# Tags rail trailing-column alignment

## Source and implementation

- Source visual truth: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-ac6339ba-b6dc-40a5-88a7-153d1eb2863e.png`.
- Implementation screenshot: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/com.openai.sky.CUAService/Pond Screenshot 2026-09-01 at 5.42.14 PM.jpeg`.
- Source pixels: 78 × 448 focused crop; CSS viewport and density were not exposed.
- Implementation pixels and app viewport: 1292 × 768 at the native Computer Use capture density; device scale factor was not exposed.
- Normalization: the source is a narrow crop of the trailing controls, so the comparison used the controls' shared vertical axis rather than stretching the crop.
- State: light theme, All Tags selected, two named groups, empty Tags search.

## Evidence and fidelity surfaces

- Full view: the Tags rail remains unchanged apart from its trailing-column geometry.
- Focused comparison: the source crop and final app capture were opened together. All, Uncategorized, New Group, Design, and Memes now share the same fixed 18px trailing track.
- Fonts and typography: passed; tabular count styling is unchanged.
- Spacing and layout rhythm: passed; counts and the `+` share the same column width, center, and 8px outer inset.
- Colors and tokens: passed; selected, inactive, and icon colors are unchanged.
- Image quality and assets: passed; the existing Pond plus icon is retained with no generated or approximate asset.
- Copy and content: passed; no labels or counts changed.

## Findings and checks

- Initial evidence showed the `+` in a wider button slot while counts used auto-width grid tracks, producing the visible horizontal wobble.
- Replaced both trailing tracks with a fixed 18px column and constrained the New Group button to the same 18px box.
- Final live capture shows no actionable P0/P1/P2 mismatch.
- Tags page tests: 6 passed.
- Biome and `git diff --check`: passed.

final result: passed

---

# Checkbox-free Shift-click tag selection

## Source and implementation

- Source visual truth: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-f4fc4a13-0d2c-4486-a7e0-7037a84de12e.png`.
- Idle implementation screenshot: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/com.openai.sky.CUAService/Pond Screenshot 2026-09-01 at 6.01.38 PM.jpeg`.
- Selected implementation screenshot: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/com.openai.sky.CUAService/Pond Screenshot 2026-09-01 at 6.01.49 PM.jpeg`.
- Focused idle crop: `/private/tmp/pond-tags-checkbox-removed-focus.jpg`.
- Focused selected crop: `/private/tmp/pond-tags-shift-selected-focus.jpg`.
- Source pixels: 108 × 228 focused crop; source CSS size and density were not exposed.
- Implementation pixels and app viewport: 1292 × 768 at the native Computer Use capture density; device scale factor was not exposed.
- Focused implementation crops: 260 × 110.
- State: light theme, All Tags selected, empty search, first tag row hovered/focused.

## Evidence and required fidelity surfaces

- Full view: tag rows keep the compact Eagle-like marker and hover treatment without revealing a checkbox.
- Focused comparison: the reference's unwanted hover checkbox and the final checkbox-free row were opened together at original detail.
- Interaction-state comparison: an ordinary row click left selection empty; modifier selection produced the blue selected row and one-item bulk action bar, still without a checkbox.
- Fonts and typography: passed; tag labels and alphabet counts are unchanged.
- Spacing and layout rhythm: passed; the fixed 14px marker slot remains, so removing the checkbox causes no label movement.
- Colors and visual tokens: passed; idle, hover, and selected backgrounds continue using Pond's existing tokens.
- Image quality and asset fidelity: passed; the existing Nucleo marker remains and no replacement asset was introduced.
- Copy and content: passed; no visible copy changed.

## Findings and comparison history

- Initial finding [P2]: hovering or focusing an index row replaced the passive marker with a visible checkbox, and an ordinary click selected the row.
- Fix: removed the index checkbox and gated row selection behind Shift-click. Shift+Enter/Space provides the same modifier-only behavior for keyboard users.
- Post-fix evidence: the idle and modifier-selected screenshots show no checkbox; live interaction and the targeted test confirm ordinary click is inert and Shift-click selects.
- No actionable P0/P1/P2 mismatch remains.

## Engineering checks

- Targeted Tags and context-menu tests: 9 passed.
- Desktop typecheck: passed.
- Biome: passed.
- `git diff --check`: passed.

final result: passed

---

# Animated New Group field entrance

## Source and implementation

- Source visual truth: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-0171c25d-907a-4a8c-b908-7070eacc80b3.png`.
- Implementation screenshot: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/com.openai.sky.CUAService/Pond Screenshot 2026-09-01 at 8.24.34 PM.jpeg`.
- Focused implementation crop: `/private/tmp/pond-group-draft-animation-focus.jpg`.
- Source pixels: 616 × 356 focused crop; source CSS size and density were not exposed.
- Implementation pixels and app viewport: 1292 × 768 at the native Computer Use capture density; device scale factor was not exposed.
- Focused implementation pixels: 230 × 150.
- State: light theme, All Tags selected, New Group field open and focused, two existing groups.

## Evidence and required fidelity surfaces

- Full view: opening New Group inserts the focused field directly below the Groups heading and pushes the existing groups down without disturbing the adjacent tag index.
- Focused comparison: the supplied open-field reference and the settled implementation crop were opened together. The field placement, group order, count column, and rail divider remain intact.
- Motion: the field expands from zero height while fading and translating down 4px over Pond's 200ms medium duration with the decelerate easing token. Global reduced-motion rules collapse this to 0.01ms.
- Fonts and typography: passed; the existing `Group name` input typography is unchanged.
- Spacing and layout rhythm: passed; the animation ends at the existing 40px draft slot and therefore introduces no settled-state layout drift.
- Colors and visual tokens: passed; background, border, focus, and text colors are unchanged.
- Image quality and asset fidelity: passed; no image or icon asset was added or altered.
- Copy and content: passed; the placeholder remains `Group name`.

## Findings and comparison history

- Initial finding [P2]: the field appeared at its full height immediately, creating an abrupt vertical jump in the Groups rail.
- Fix: added a restrained height, padding, opacity, and 4px directional entrance animation using shared Pond motion tokens.
- Post-fix evidence: live Electron interaction confirmed the field opens, focuses, and settles in the correct position; the source and final settled screenshot show no layout mismatch.
- The in-app browser cannot render Pond without Electron's `window.pond` bridge, so it was not used as visual evidence. This is an expected environment constraint, not an implementation error.
- No actionable P0/P1/P2 mismatch remains.

## Engineering checks

- Tags page tests: 6 passed.
- Desktop typecheck: passed.
- Biome: passed.
- `git diff --check`: passed.

final result: passed

---

# Animated library filter rail

## Source and implementation

- Source visual truth: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-61045dc7-5475-4681-9a82-4c9277a196c7.png`.
- Implementation screenshot: unavailable because the Mac locked before the running Electron app could be captured.
- Source pixels: 2172 × 420 before conversation resizing; source CSS dimensions and density were not exposed.
- Intended implementation viewport: current 1292 × 768 Pond desktop window at the native Computer Use capture density.
- State: light theme, Library page, filter rail transitioning between open and closed.

## Evidence and required fidelity surfaces

- Full view: blocked pending an unlocked Electron capture.
- Focused comparison: blocked pending open and closed implementation captures that can be combined with the supplied source.
- Fonts and typography: code preserves the existing filter labels and type tokens; visual confirmation is pending.
- Spacing and layout rhythm: the implementation animates the rail's real grid row from `0fr` to `1fr`, with a 4px directional offset; visual confirmation is pending.
- Colors and visual tokens: existing colors are unchanged; opacity now transitions with Pond's fast duration token.
- Image quality and asset fidelity: no imagery or icon asset changed.
- Copy and content: filter labels and actions are unchanged.

## Findings and comparison history

- Initial finding [P2]: the filter rail was removed with `hidden` and conditional rendering, so both opening and closing jumped instantly.
- Fix applied: keep controls mounted, animate grid height, opacity, and a 4px vertical offset with shared motion tokens, and make the closed rail inert and hidden from accessibility. Global reduced-motion rules reduce the transition to 0.01ms.
- Post-fix visual evidence: blocked because the Mac is locked.
- Blocker: unlock the Mac so the running Pond app can be captured in both states and compared with the source.

## Engineering checks

- Filter toolbar tests: 4 passed.
- Full desktop test suite: 640 passed, 20 skipped.
- Desktop typecheck: passed.
- Biome: passed.
- `git diff --check`: passed.

final result: blocked

---

# Eagle-aligned Library filter system

## Source and implementation

- Source captures: `/Users/raphaelsalaja/Developer/pond/docs/research/filter-audit/eagle-tags-full.jpeg`, `/Users/raphaelsalaja/Developer/pond/docs/research/filter-audit/eagle-duration-full.jpeg`, and `/Users/raphaelsalaja/Developer/pond/docs/research/filter-audit/eagle-color-full.jpeg`.
- Final Pond captures: `/Users/raphaelsalaja/Developer/pond/docs/research/filter-audit/pond-tags-final.jpeg`, `/Users/raphaelsalaja/Developer/pond/docs/research/filter-audit/pond-duration-final.jpeg`, and `/Users/raphaelsalaja/Developer/pond/docs/research/filter-audit/pond-color-final.jpeg`.
- Combined comparisons: `/Users/raphaelsalaja/Developer/pond/docs/research/filter-audit/qa-tags-final.jpg`, `/Users/raphaelsalaja/Developer/pond/docs/research/filter-audit/qa-duration-final.jpg`, and `/Users/raphaelsalaja/Developer/pond/docs/research/filter-audit/qa-color-final.jpg`.
- Viewport: 1292 × 768 for every Eagle and Pond capture.
- State: light theme with the equivalent Tags, Duration, or Color filter open over a populated library.

## Evidence and fidelity surfaces

- Full-view comparison: passed. The popovers now occupy the same compact area over the library as their Eagle counterparts instead of sharing one universal 300px shell.
- Focused Tags comparison: passed. Search sits above a two-pane browser with All Tags, Selected, live tag groups, counts, and tag rows. Pond retains compact Include/Exclude and Any/All controls because those semantics are intentionally more discoverable than Eagle's click and right-click-only model.
- Focused Duration comparison: passed. Minimum, Maximum, and Unit share one row, helper copy is removed, and Apply has reduced visual weight. Pond retains its useful duration presets above the range editor.
- Focused Color comparison: passed. The picker, palette, hex value, and tolerance control now fit a task-sized visual panel while retaining Pond's more precise tolerance feature.
- Short-list density: passed. Shape, Aspect, Type, List, and other short static sets no longer show a search field. Long collections remain searchable.
- Fonts and typography: passed. Existing Pond text roles are preserved while the menus adopt Eagle's compact hierarchy.
- Spacing and layout rhythm: passed. Popover widths are now selected by task, controls use 4–8px internal gaps, and repeated explanatory footers are absent.
- Colors and visual tokens: passed. The redesign uses Pond's existing surface, border, hover, selected-state, and focus tokens.
- Image quality and assets: passed. Tag scopes use existing Nucleo icons from `@pond/icons`; no approximate SVG, emoji, or generated asset was introduced.
- Copy and content: passed. Search placeholders, rules, bounds, units, and actions are concise and retain explicit accessible names.

## Interaction and engineering checks

- Include/Exclude and Any/All choice semantics: passed.
- Untagged search and exclusion: passed.
- Duration unit conversion and bound persistence: passed.
- Custom date validation and inclusive end date: passed.
- Optional-content phrase matching: passed.
- Popup open/close motion: passed through the shared Menu opacity and scale lifecycle using Pond motion tokens.
- Live Electron inspection: passed for Shape, Tags, Duration, and Color after hot reload.
- Desktop typecheck: passed.
- Full desktop suite: 640 passed, 20 skipped.
- Focused filter suite after the final visual cleanup: 31 passed.
- Biome and `git diff --check`: passed.

## Findings and comparison history

- Initial [P1]: every filter inherited the same wide shell and nearly every choice menu repeated search, mode rows, and a counts disclaimer.
- Fix: introduced compact, searchable, tags, range, color, and content layouts with field-specific dimensions.
- Initial [P1]: Tags was a single scrolling list that did not expose real tag groups.
- Fix: rebuilt Tags around Pond's live groups and a two-pane selection model matching Eagle's information architecture.
- Initial [P2]: numeric ranges stacked bounds, units, helper text, and a heavy action vertically.
- Fix: placed bounds and units on one row, removed persistent helper text, and reduced the action to `Apply`.
- Post-fix side-by-side review found no actionable P0/P1/P2 mismatch. Intentional Pond differences preserve explicit rule semantics, accessibility names, duration presets, and color tolerance.

final result: passed
