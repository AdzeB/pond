# Save Screenshot dialog comparison

Inspected September 22, 2026. Pond has the same basic metadata fields as Eagle,
but its current dialog does not reproduce Eagle's organization workflow.

This records the baseline before the subsequent September 22 redesign. Pond now
has the split layout, inline stars, multiline notes, tag chips and picker,
searchable nested folders, recent destinations, and folder creation described
in the follow-up below. It retains an explicit Save Screenshot action and a
single destination. The Pond line references in the table identify the earlier
implementation, not the redesigned files.

## Evidence

This comparison reads Pond's implementation and the installed Eagle 4.0.0,
buildVersion 20260401, buildNumber 23 source
([Eagle, 2026](../provenance/generated/REFERENCES.md#eagle-4-20260401)). It is not a side-by-side
observation of a completed live Eagle capture. Exact native window placement,
focus after saving, and runtime appearance remain unverified.

Eagle paths below are relative to the extracted
`apps/desktop/.tmp/eagle-screenshots/eagle/app/collect-window/` directory.
Additional picker templates, controllers, and CSS were extracted locally from
the same installed archive; hashes are in the ignored
`apps/desktop/.tmp/eagle-screenshots/save-dialog-provenance.json`. The original
archive provenance is recorded in the [screenshot research](eagle-screenshots-2026-09-22.md).
These files are inspection references; no Eagle code or assets were added to
Pond's shipped implementation. Redistribution terms remain unknown.

Pond references below use
`apps/desktop/src/renderer/src/features/library/components/screenshot-organize/index.tsx`
unless otherwise identified.

## Source-verified differences

| Area | Eagle | Pond | Evidence |
| --- | --- | --- | --- |
| Organization | Two panes: preview and metadata on the left, destination browser on the right. | Large preview followed by stacked form fields, then folder/rating dropdowns and footer buttons. | Eagle `index.html:13`, `:77`; Pond `:100`, `:149`, `:190`. |
| Destination selection | Persistent search, hierarchical folders, collapse controls, recent destinations, parent context in search results. | One flat folder dropdown, with Library as its empty choice. | Eagle `js/directives/folder-select-panel.html:3`, `:74`, `:88`, `:93`; `folder-select-panel.js:141`; Pond `:34`, `:151`. |
| Recent folders | Recent destinations appear before the main list; the normal limit starts at five. | No recent-destination presentation. | Eagle `js/directives/folder-select-panel.js:145`, `:201`; Pond `:34`. |
| Multiple folders | Command/Control-click enters multiple-selection mode and exposes a Collect button. | Exactly one `folderId` is submitted. | Eagle `js/directives/folder-select-panel.js:648`; `folder-select-panel.html:115`; Pond `:59`. |
| Create folder | Searching exposes a create-folder row; creating that folder saves the capture there. | No folder creation in this dialog. | Eagle `js/directives/folder-select-panel.js:240`; `js/controllers/collect.js:239`; Pond `:151`. |
| Library | Destination header contains a Library switcher; switching reloads folder/tag data. | Uses the currently open Library; no switcher in the dialog. | Eagle `js/directives/folder-select-panel.html:23`; `js/controllers/collect.js:247`; Pond `:27`, `:151`. |
| Tags | Removable colored chips and an add button open a searchable picker with recent/starred tags, groups, and tag creation. | One comma-separated text field. | Eagle `index.html:57`; `js/controllers/collect.js:169`; `js/directives/tag-select-panel.html:3`, `:22`, `:74`; Pond `:137`. |
| Rating | Five directly clickable stars; clicking the current rating clears it. | Dropdown containing No Rating and one through five stars. | Eagle `index.html:21`; `js/controllers/collect.js:154`; Pond `:38`, `:168`. |
| Notes | Multiline editable annotation field, maximum 8,192 characters. | Single-line Notes input with the same limit. | Eagle `index.html:42`; Pond `:125`. |
| Save | In normal mode, clicking a destination or pressing Enter on the highlighted result saves and closes. Metadata can be edited before choosing the destination. | Selecting a folder does not save; the form's Save Screenshot action submits, opens the saved item, and closes the dialog. | Eagle `js/directives/folder-select-panel.js:397`, `:648`; `js/controllers/collect.js:211`, `:259`; Pond `:49`, `:90`, `:192`. |
| Keyboard | Folder search receives focus, arrows navigate, Enter activates the highlighted destination; footer shows shortcuts. | Standard form and dropdown interactions; no always-visible destination search or shortcut hints. | Eagle `js/controllers/collect.js:203`; `js/directives/select-panel.js:238`, `:251`; `folder-select-panel.html:106`; Pond `:90`. |

Both implementations include a screenshot preview, dimensions, title, notes,
tags, rating, and a destination. Matching these fields alone does not provide
the same speed or organization tools.

## Boundaries and proposed follow-up

The Eagle folder template contains All/Recent tabs, but explicitly hides them
with `display: none`; they should not be described as visible controls.
The generic picker handles Escape, but the folder picker overrides `close()`
with an empty implementation, so whole-window Escape cancellation is not
established by these files. Eagle's main-process bytecode may supply behavior
that this inspection cannot verify.

For a closer Pond adaptation, prioritize the split layout, searchable folder
browser with recent destinations, real tag picker, inline stars, and multiline
notes. Multiple destinations and Library switching require broader contract and
state decisions. Decide explicitly whether selecting a destination saves
immediately or leaves an explicit Save action. This is a proposed design
direction, not an implementation completed by this comparison.
