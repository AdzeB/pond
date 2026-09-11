# Eagle sidebar drag and drop

Research date: 2026-09-08. Scope: Eagle, the asset organizer at eagle.cool.

The request means making Pond's sidebar an editable folder tree: drag folders to change their order, nest existing folders, move branches between parents, and bring subfolders back to the top level. This is an interpretation of the user's examples and the evidence below, not a claim that every proposed gesture exactly matches Eagle.

## What the primary sources establish

| Behavior | Evidence and limits |
| --- | --- |
| Nested folders and changing parents | Eagle's Folder API exposes children and a mutable parent. Setting another parent moves the folder; setting null or undefined moves it to the root. This confirms the hierarchy operations, not the precise mouse gesture. [Folder API](https://developer.eagle.cool/plugin-api/api/folder) |
| Multiple folders can be dragged to the sidebar | Eagle 4.0 Build 20, dated March 3, 2026, fixes a missing blue highlight indicator when dragging multiple folders to the sidebar. It confirms this interaction and visible target feedback; it does not specify selection modifiers, payload origin, or insertion geometry. [Build 20 release notes](https://en.eagle.cool/blog/post/eagle4-build20) |
| Folder selection supports multiple entries | The public API returns an array of currently selected folders. This does not establish the sidebar's exact range/toggle selection shortcuts. [Folder API](https://developer.eagle.cool/plugin-api/api/folder) |
| Asset dragging is a separate operation | Eagle's July 6, 2022 guide describes dragging images from Folder A to Folder B; holding Alt keeps them in both folders. This documents asset categorization, not moving the folder tree. The article is older and does not establish every current modifier preference. [Categorization guide](https://en.eagle.cool/blog/post/how-to-quickly-organize-files-in-eagle-app) |
| Smart folders are condition based | The same guide creates a smart folder using conditions such as PNG type and no assigned folder. Do not assume dropping an asset onto a smart folder has the same meaning as dropping onto a regular folder. [Categorization guide](https://en.eagle.cool/blog/post/how-to-quickly-organize-files-in-eagle-app) |

## Relevant help topics with unavailable bodies

The following official pages returned their titles but no article body in both web retrieval and a rendered browser check. Their existence identifies relevant product topics; it does **not** verify the instructions or answers they contain.

- [Adjust folder sorting order](https://en.eagle.cool/support/article/how-to-change-folder-sorting-in-eagle).
- [Move subfolders](https://en.eagle.cool/support/article/how-to-move-subfolders-to-different-categories-in-eagle).
- [Batch-move folders](https://en.eagle.cool/support/article/batch-move-folders).
- [Disable automatic expansion when moving folders](https://en.eagle.cool/support/article/how-to-move-folders-without-automatically-expanding-folder-structure).
- [Folders](https://en.eagle.cool/support/article/folders) and [Smart folders](https://en.eagle.cool/support/article/smart-folders).

Consequently, this research does not confirm Eagle's exact sibling reordering gesture, root drop target, hover expansion delay or setting, automatic versus manual folder sort behavior, smart-folder group drop rules, insertion-line appearance, auto-scroll timing, or undo behavior. A title about disabling expansion does not establish that disabling it is supported.

## Proposed interaction contract for Pond

These are design recommendations that make the user's request concrete; they are not verified Eagle details.

| Gesture | Result and feedback |
| --- | --- |
| Drag before or after a folder row | Insert at that sibling position. Show a line with indentation matching the resulting parent. |
| Drag onto the middle of a folder row | Make the dragged folder a child. Highlight the destination row distinctly from the insertion line. |
| Drag a subfolder to a root target | Remove its parent and insert it among top-level folders. Keep the root target reachable in a populated tree. |
| Hold over a collapsed destination | Expand it after a deliberate delay so a deeper target becomes reachable. |
| Drag near the sidebar edges | Scroll the tree while retaining a clear destination. |
| Drop a folder with descendants | Move the branch together, preserving its contents and descendant relationships. |
| Cancel or choose an invalid target | Make no mutation. Reject self/descendant destinations and unrelated sidebar sections. |

Persist parent and sibling order together. Keep normal navigation, disclosure controls, and focus usable. Provide a keyboard-accessible move command. Distinguish folder, saved-view/group, asset, and external-file payloads so a folder move cannot accidentally categorize selected assets.

Support single-folder reorder, nesting, reparenting, and root moves first. Treat multi-selection dragging and smart-folder/group parity as explicit follow-up scope unless already covered by the implementation. If alphabetical sorting is offered, define its relationship to manual ordering before enabling drag in that mode.

## Pond's current implementation

Inspected the current working tree, including existing uncommitted sidebar and Smart Folder work. These findings describe that snapshot, not only committed code.

| Area | Existing behavior | Gap to address |
| --- | --- | --- |
| Ordinary folder storage | `parentId` and `sortOrder` already exist. Retrieval sorts by order, then name; newly created folders receive order zero. [Schema](../../packages/schema/src/db.ts), [folder operations](../../apps/desktop/src/main/core/folders.ts) | Add a validated move operation that updates parent and affected sibling order together. Define insertion for new folders so they do not unexpectedly jump to the front after manual ordering. |
| Ordinary folder sidebar | New Subfolder creates a nested folder. The tree renderer flattens all descendants, with indentation and branch guides. [Sidebar](../../apps/desktop/src/renderer/src/features/library/components/folder-sidebar/folder-sidebar.tsx), [tree traversal](../../apps/desktop/src/renderer/src/features/library/components/folder-sidebar/tree.ts) | Existing folder rows cannot be dragged or individually collapsed. Add disclosure state, explicit before/inside/after feedback, and an accessible root destination. |
| Ordinary folder transport | Queries expose creation, renaming, deletion and Save membership updates. [Handlers](../../apps/desktop/src/main/ipc/queries/folders.ts), [contracts](../../apps/desktop/src/shared/query-contracts.ts) | No folder move or reorder query currently connects the UI to persistence. Main must validate folder existence and reject cycles; a renderer-only reorder would not persist. |
| Smart Folders, Saved Views and Groups | Groups collapse and contain other entries. The context menu already offers Move to Group and a move to the section root. Main validates Group parents and cycles, and exposes a reorder operation. [Smart Folder UI](../../apps/desktop/src/renderer/src/features/library/components/smart-folders/smart-folders.tsx), [main operations](../../apps/desktop/src/main/core/saved-views.ts) | Add equivalent drag behavior, allowing inside drops only on Groups. Existing parent updates and order updates are separate operations; combine them for a drop that changes both. Keep ordinary folders and Smart Folder entries in their own sections. |
| Save drops | A folder row accepts drag-over without checking a payload type, then adds the current global Save selection on drop. Save cards initiate Electron native file dragging. [Sidebar](../../apps/desktop/src/renderer/src/features/library/components/folder-sidebar/folder-sidebar.tsx), [Save card](../../apps/desktop/src/renderer/src/features/saves/components/card/card.tsx) | A new folder drag must never fall through to the Save-membership handler. Explicitly identify the dragged object; test internal tree dragging alongside native Save dragging. Do not silently change Pond's current additive Save-membership behavior to Eagle's documented move behavior. |

Moving a Smart Folder or Group is semantically significant: ancestor Group filters combine with its own filters using AND, and moving changes the inherited conditions. Refresh already recalculates those conditions for the active entry. Preserve that behavior after drag moves. [Domain vocabulary](../../CONTEXT.md), [saved-view state](../../apps/desktop/src/renderer/src/features/library/state/saved-views.ts)

Moving an ordinary folder should preserve folder IDs, Save memberships and descendant links. Parent-folder results may change because Pond can include subfolder contents. [Navigation filtering](../../apps/desktop/src/renderer/src/features/saves/lib/nav-filter.ts)

## Concrete completion criteria for implementation

1. Reorder root folders and nested siblings; the order survives reload.
2. Move an existing folder into another folder, between parents, and back to the root. A branch moves with its descendants and retains its Saves.
3. The preview unambiguously communicates sibling insertion versus nesting, including next to expanded branches. Pointer hover can expose deeper destinations and scroll long trees.
4. Reject self/descendant moves and incompatible sections. Escape, an outside drop and a persistence failure leave the tree unchanged or restore its previous state with useful feedback.
5. Folder dragging never adds selected Saves to a folder. Native Save dragging and existing membership behavior continue working.
6. Preserve selection, keyboard access and reduced-motion behavior. Provide menu-based moving and ordering as an alternative to dragging.
7. For Smart Folder parity, reorder entries and nest only in Groups; refresh inherited filters when the active entry or an ancestor moves.

This turn produced research only; no application code or interaction tests were changed. An implementation should use the repository's documented offline checks (`pnpm check`), production build (`pnpm build`), and Electron-ABI database checks for the new persistence behavior, plus visual interaction checks in an isolated library. Keep live-network tests separate. [Contributor checks](../../CONTRIBUTING.md)
