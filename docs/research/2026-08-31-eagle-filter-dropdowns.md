# Eagle filter dropdown investigation

Status: available controls inspected directly on 2026-08-31. The follow-up findings below supersede the initial pending checks. Unverified details are identified explicitly.

## Observed in the running app

### Color

- Opens a compact color picker with a saturation/value surface, hue strip, preset swatches, and a hex field.
- Entering `#FF0000` and pressing Return applied the filter while keeping the picker open.
- An Accuracy slider appeared beneath the hex field once the filter was active. Its accessibility value was 20; the exact scale and matching algorithm were not tested.
- Results changed immediately, the toolbar gained a colored indicator and per-filter clear button, and the overall filter count became one.
- Clearing the color returned the original 217 results in the current folder.

Pond currently offers preset color rows and a nested native color input. It has no accuracy control in the filter UI. A dedicated picker within the shared popup would better match this interaction; accuracy would also need a supported query parameter.

### Tags

- Opens a two-column panel with a search field, a Selected section, and an All Tags section.
- The list is scoped to the current folder: App showed two matches and Untagged showed 215.
- The Rule controls expose any/all/equal icons. Their precise semantics still need direct testing with multiple tags.
- Left-clicking App included it, produced two results, and changed the toolbar label to App. The panel stayed open.
- Right-clicking the selected App cleared it. Right-clicking App again from the neutral state excluded it, producing 215 results.
- Exclusion used a red cross in the option and `-App` in the toolbar.
- The footer explicitly explains left-click selection, right-click exclusion, and Escape to close.
- The Selected section displays a count when a selection exists.

Pond currently exposes positive checkbox selection. Its schema supports `some`, `every`, `none`, and `empty` for tag arrays, but the dropdown does not expose those matching modes, an Untagged option, or per-option result counts. Pond should expose exclusion through a visible, keyboard-accessible control even if right-click is also supported.

### Types

Verified in the preceding toolbar implementation pass: a searchable checkbox list of file extensions, including png, remains open after selection. The selected extension replaces the toolbar label and gains a clear button. Hiding the toolbar preserves active filtering.

Pond's Type field represents Image, Video, Website, and Text. Exact file-format filtering is a separate capability; changing menu labels alone would not reproduce Eagle's behavior.

## Initial follow-up checklist

| Dropdown | What remains to inspect |
| --- | --- |
| Color | Accuracy bounds, live dragging, grayscale, combining with other fields |
| Visual Match | Input source, similarity controls, application and reset behavior |
| Semantic | Query input, model prerequisites, result application |
| Tags | Any/all/exact semantics, multiple inclusions and exclusions, tag search |
| Folder | Hierarchy, descendants, matching modes, inclusion and exclusion |
| Shape | Shape presets, ratios, custom ratio entry, matching tolerance |
| Rating | Exact versus minimum rating, unrated selection |
| Types | Multiple selections, exclusion, option counts and grouping |
| Dimensions | Width/height controls, units, comparisons, apply behavior |
| Duration | Time units, presets, bounds and open-ended ranges |
| Size | Units, presets, bounds and apply behavior |
| Comment | Presence/absence versus content matching, comparison modes |
| Note | Presence/absence versus content matching, comparison modes |
| URL | Domain versus full URL matching, text operators |
| Date Imported | Relative presets, calendar/ranges, year/month selection |
| Date Modified | Same checks as Date Imported; confirm any differences |
| BPM | Bounds, precision, tempo prerequisites |
| Font | Installed/uninstalled criteria and format-specific controls |
| Camera | Available metadata fields, option lists and empty states |

Font and Camera were present in the accessibility tree but were not visible in the toolbar screenshot; verify their customization state before interacting.

## Pond comparison from source

- Every category currently uses the same `FilterCategory` menu structure. Numeric, date, and color inputs are nested under a custom submenu.
- Duration accepts raw seconds with Exactly, Less Than, At Least, and Between modes.
- Dates accept a From/To range; the selected final day is inclusive.
- Shape and Aspect are separate preset fields. There is no arbitrary ratio editor.
- Note is presence/absence only. Source is a choice of known sources, not a full URL text condition.
- Width, height, and file size exist in the save model but are not registered filter fields.
- Rating, BPM, Font, Camera, Visual Match, and Semantic are not registered categories in the current filter schema.

Relevant code: `apps/desktop/src/renderer/src/components/library/filter-menu/`, `packages/schema/src/filters/fields/`, and `packages/schema/src/filters/types.ts`.

## Initial interruption

The last confirmed Eagle state had a temporary `-App` tag filter applied. The attempt to clear it was interrupted by the lock; inspect current state before continuing and restore the original unfiltered Projects view. No assets or metadata were edited.

The public Eagle support pages were also checked, but the retrieved article bodies were empty. They did not provide enough evidence to fill in the uninspected interactions.

## Completed follow-up

| Filter | Additional direct observations |
| --- | --- |
| Tags | Any/All/Equal modes. Widget alone returned 79 despite a displayed count of 80. Adding Accordion under Any remained 79; All and Equal returned zero. Exact-set semantics remain unproven. |
| Folder | Search, counts, Any/All/Equal, inclusion/exclusion. Projects offered Epoch with 217 items. Descendant semantics were not verified. |
| Shape | Orientation and common ratio checkboxes. Custom expands inline width:height fields, initially 4:3, and immediately returned 142 items in Projects. |
| Rating | Only None was available in Projects and All. Star/range semantics could not be tested without editing assets. |
| Types | png (143) plus jpg (331) returned 474 items in All: OR within the field. Adding Square returned 25: AND across fields. Badge counted selected values (2, then 3). Shape counts stayed at scope totals (Square 29). |
| Dimensions | Inline W min/max and H min/max, no Apply. W minimum 3000 returned 124 items in Projects. Blank maximum leaves the upper bound open. |
| Duration | Inline min/max and unit selector showing sec. Other units were not verified. |
| Size | Inline min/max and unit selector showing KB. Native unit menu could not be enumerated reliably. |
| BPM | Inline min/max without a unit selector. |
| Comment, Note, URL | Yes/No checkboxes and a keyword textarea suggesting comma-separated values. Keyword triggering and comma semantics were not conclusively verified. |
| Date Imported | Today, Yesterday, Last 7/30/90/365 Days with counts. Custom Range expands inline entry and a calendar with month/year navigation. |
| Date Modified | Same relative choices plus month groups. Opening empty Custom Range temporarily returned zero items; avoid premature application in Pond. |
| Visual Match | Drop/paste panel for Eagle/local images and Choose Image. No image was submitted. |
| Semantic | Descriptive textarea. A dashboard query eventually became an active clause, but results remained 217. Model readiness and quality were not established. |
| Font, Camera | Hidden accessibility entries only. Neither appeared in the visible toolbar or customization search, including in All. Unavailable for direct inspection. |
| Plus | Searchable visibility list, pin controls, drag handles. No duplicate creation. Pin settings were not changed. |

Menus remain open during selection. Per-field clear and global reset remove predicates; hiding the toolbar preserves them. Counts in the combination test described the current scope before other filters.

Use Pond's shared Menu, Select, Input, ColorPicker and Slider controls. Keep full-width dividers and consistent select widths. Replace nested custom forms with inline field-specific editors. Exclusion needs a visible keyboard-accessible control. Range editors should seed existing values and validate before application. Content matching and color accuracy require actual matching support.

This work updates Pond's existing supported categories. Extension, arbitrary ratio, dimensions, file size, full URL, rating, BPM, font, camera and image/semantic filters require separate schema or engine work.

All temporary predicates were cleared. The last confirmed Eagle view was unfiltered All (487 items). Eagle reported no open windows when restoring Projects. No assets or metadata were edited.
