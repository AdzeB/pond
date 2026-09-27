# dnd-kit capabilities and interaction research

Date: 2026-09-25

## Question

Which parts of dnd-kit can improve Pond's drag-and-drop interactions, and where
else in Pond is the library a good fit?

## Executive recommendation

Keep dnd-kit for in-app sorting and spatial moves, starting with a polished
`DragOverlay` for both sidebar reorder surfaces. Next, use it for the
virtualized Arrange Folder list and horizontal data-table column reordering,
then tackle the more complex folder and saved-view trees. Those surfaces gain
keyboard support, precise drop feedback, cancellation, and auto-scroll. Do
**not** replace native HTML drag-and-drop for moving saves or files
between Pond, the desktop, and other windows: dnd-kit deliberately does not use
the HTML5 drag-and-drop API and therefore cannot drag across windows or from the
desktop ([official architecture notes](https://github.com/clauderic/dnd-kit/tree/%40dnd-kit/core%406.3.1#architecture)).

The fastest interaction win is not “more animation.” It is a stable drag
preview, an unambiguous insertion target, input-specific activation, and a
complete keyboard/screen-reader path. The official `DragOverlay` guidance
specifically recommends an overlay for scrollable, virtualized, or
cross-container lists and for smooth drop animations
([DragOverlay documentation](https://dndkit.com/legacy/api-documentation/draggable/drag-overlay/),
[sortable overlay guidance](https://dndkit.com/legacy/presets/sortable/overview/#drag-overlay)).

## Version boundary

Pond currently installs:

- `@dnd-kit/core` 6.3.1
- `@dnd-kit/sortable` 10.0.0
- `@dnd-kit/modifiers` 9.0.0
- `@dnd-kit/utilities` 3.2.2

Those packages are the legacy React API documented under dnd-kit’s **Legacy**
section. The current generation is layered around `@dnd-kit/abstract`,
`@dnd-kit/dom`, and framework adapters including `@dnd-kit/react` and
`@dnd-kit/vue`
([current repository package map](https://github.com/clauderic/dnd-kit#packages)).
The shared Chromatic route is a newer `vue_draggable` story. Its floating
preview is a useful interaction reference, but its Vue code and current-package
APIs should not be copied into Pond. Recommendations below are checked against
the legacy React docs and the tagged 6.3.1 source/release line
([6.3.1 release](https://github.com/clauderic/dnd-kit/releases/tag/%40dnd-kit%2Fcore%406.3.1),
[tagged repository](https://github.com/clauderic/dnd-kit/tree/%40dnd-kit/core%406.3.1)).

Reference supplied for the desired overlay behavior:
[official Chromatic drag-overlay story](https://main--5fc05e08a4a65d0021ae0bf2.chromatic.com/?path=/story/vue_draggable-drag-overlay--example).

### What the newer generation adds

The current generation packages several useful policies as first-class
plugins: accessibility, auto-scroll, cursor feedback, and visual feedback. Its
Feedback plugin supports default, clone, move, and custom-overlay modes, plus a
custom asynchronous drop-animation function. It also documents reduced-motion
handling and the common double-snap failure that occurs when application state
and drop animation disagree
([plugin overview](https://dndkit.com/extend/plugins/),
[feedback guide](https://dndkit.com/react/guides/feedback/),
[current DragOverlay API](https://dndkit.com/react/components/drag-overlay/)).

These are good interaction-policy references, but not a reason to migrate by
themselves. Pond's installed packages already provide overlays, axis and bounds
modifiers, auto-scroll, custom collision detection, sensors, cancellation, and
accessibility hooks. Treat a move to `@dnd-kit/react` as a separate dependency
migration with its own prototype and regression suite; the official migration
guide changes provider, sortable-context, collision, modifier, and state APIs
([migration guide](https://dndkit.com/react/guides/migration/)).

## Capability matrix

| Capability | What the installed API provides | Best Pond application | Interaction payoff | Important constraint |
| --- | --- | --- | --- | --- |
| `DragOverlay` | A viewport-relative preview outside normal layout, configurable `dropAnimation`, keyframes, side effects, scale, wrapper, modifiers, and z-index ([docs](https://dndkit.com/legacy/api-documentation/draggable/drag-overlay/), [6.3.1 source API](https://github.com/clauderic/dnd-kit/blob/%40dnd-kit/core%406.3.1/packages/core/src/components/DragOverlay/hooks/useDropAnimation.ts)) | Live sidebar and Customize Sidebar first; folder tree second | Prevents the picked-up row from fighting the list layout; permits elevation, source dimming, and a controlled settle animation | Keep `<DragOverlay>` mounted and conditionally render its child. Render a presentational row, not another `useSortable` instance, or duplicate IDs will conflict. |
| Drop animation | Duration/easing plus custom Web Animation keyframes and temporary source/overlay styles or classes through `defaultDropAnimationSideEffects` ([core changelog](https://github.com/clauderic/dnd-kit/blob/%40dnd-kit/core%406.3.1/packages/core/CHANGELOG.md#L236-L365)) | Sidebar release polish | A short preview-to-slot settle can eliminate the release “jolt” without adding springy motion | Persist the new order synchronously/optimistically before the overlay measures its destination. Disable or shorten for reduced motion. |
| Sensors and activation | Pointer, mouse, touch, keyboard, or custom sensors. Core 6.1 permits distance and delay constraints together, supports conditional constraint bypass, and 6.3 adds `onDragPending`/`onDragAbort` for visual cues ([sensor docs](https://dndkit.com/legacy/api-documentation/sensors/), [core changelog](https://github.com/clauderic/dnd-kit/blob/%40dnd-kit/core%406.3.1/packages/core/CHANGELOG.md)) | Rows that must still click, open, select, or show a context menu | Fewer accidental drags; touch can use press-and-hold while mouse uses a small distance | Pointer `distance` and `delay` were mutually exclusive in older docs, but Pond's installed core includes the later combined-constraint support. Treat touch and mouse separately when their gestures differ. |
| Activator handles | `setActivatorNodeRef`, listener attributes, and focus restoration are available separately from the draggable node ([sortable changelog](https://github.com/clauderic/dnd-kit/blob/%40dnd-kit/core%406.3.1/packages/sortable/CHANGELOG.md#L92-L139)) | Customize Sidebar handle; a handle revealed on hover/focus in the live sidebar | Keeps row activation distinct from reorder and gives keyboard users a deliberate focus target | For an always-draggable row, split the returned listeners carefully: pointer activation can remain on the row while keyboard activation belongs on a labelled handle. |
| Modifiers | Axis lock; window, parent, and first-scrollable-ancestor bounds; snap-to-grid; custom coordinate transforms ([modifier docs](https://dndkit.com/legacy/api-documentation/modifiers/)) | Vertical lists, column order, bounded canvases | Makes the gesture agree with the interaction's actual degrees of freedom | `DndContext` and `DragOverlay` may use different modifier sets. Axis locking alone does not limit which logical container accepts a drop. |
| Collision detection | `rectIntersection`, `closestCenter`, `closestCorners`, `pointerWithin`, custom algorithms, and composition ([collision docs](https://dndkit.com/legacy/api-documentation/context-provider/collision-detection-algorithms/)) | `closestCenter` for sidebar/order lists; `closestCorners` or a custom composite for nested folders | More predictable target selection and clearer insertion/nesting zones | `pointerWithin` is pointer-only; combine it with a keyboard-capable fallback. Stacked folder rows need explicit edge-vs-center zones rather than relying on a generic list collision alone. |
| Sortable strategies | Rectangle list/grid sorting, vertical and horizontal strategies, swapping, and virtualized-list-compatible vertical/horizontal strategies ([sortable strategies](https://dndkit.com/legacy/presets/sortable/overview/#sorting-strategies)) | Vertical sidebar/folder order, horizontal inspector sections, future grid customization | Correct displacement math for the visual structure, including variable-sized and virtualized lists | Use `verticalListSortingStrategy` for these sidebars. `rectSortingStrategy` is the default but does not support virtualized lists. |
| Horizontal sorting | `horizontalListSortingStrategy`, horizontal keyboard coordinates, handles, and `restrictToHorizontalAxis` | Reorderable data-table columns | Replaces native HTML drag with visible displacement, keyboard parity, cancellation, and a real insertion model | The column drag handle must not compete with the sort button or resize separator. The generic `@pond/ui` package would need an explicit dnd-kit dependency or a narrow app-owned adapter. |
| Multiple containers | One `DndContext`, a `SortableContext` per container, `onDragOver` transfer, and a droppable wrapper so empty containers remain targets ([multiple containers](https://dndkit.com/legacy/presets/sortable/overview/#multiple-containers)) | Folder tree levels, future saved-view groups, moving ordered items between sections | Natural cross-group moves and a usable empty-state target | Optimistic `onDragOver` state needs rollback on cancel and domain validation. Keyboard navigation across containers needs custom coordinates, not just the single-list helper. |
| Auto-scroll | Boolean or configured auto-scroll with threshold, acceleration, interval, scroll intent, ancestor ordering, `canScroll`, and layout-shift compensation ([DndContext docs](https://dndkit.com/legacy/api-documentation/context-provider/dnd-context/#autoscroll), [tagged source](https://github.com/clauderic/dnd-kit/blob/%40dnd-kit/core%406.3.1/packages/core/src/hooks/utilities/useAutoScroller.ts)) | Long sidebar, folder tree, customization dialog | Keeps targets reachable without leaving the gesture | Tune the sidebar's scroll container rather than allowing the whole window to move. KeyboardSensor manages its own scrolling. |
| Keyboard coordinates | `sortableKeyboardCoordinates` moves to the next sortable item rather than an arbitrary pixel delta; custom getters can model trees or multiple containers ([sortable sensor docs](https://dndkit.com/legacy/presets/sortable/overview/#sensors), [keyboard docs](https://dndkit.com/legacy/api-documentation/sensors/keyboard/)) | Customize Sidebar now; live sidebar and folder tree next | Equivalent reorder without a pointer; Space/Enter pick up and drop, arrows move, Escape cancels | The activator must be focusable. A whole-row activator conflicts with a navigation button, so use a separate handle or explicit Move Up/Down commands. |
| Accessibility | Focusable activators, ARIA attributes, focus restoration, screen-reader instructions, and live announcements for start/move/over/end/cancel ([accessibility guide](https://dndkit.com/legacy/guides/accessibility/)) | Every sortable surface | Announces “moved All to position 3 of 7 in Library,” not opaque internal IDs | Defaults are only a starting point. Pond should localize instructions and announce human labels, one-based positions, totals, and section names. |
| Measuring and layout animation | Configurable droppable measuring strategy/frequency; `useSortable` exposes `transition` and `animateLayoutChanges` ([DndContext measuring](https://dndkit.com/legacy/api-documentation/context-provider/dnd-context/#layout-measuring), [sortable transitions](https://dndkit.com/legacy/presets/sortable/overview/#concepts)) | Dynamic lists, collapsible folder tree, rows whose counts/height can change | Avoids stale target geometry and can animate displaced rows when structure changes | `Always` measuring costs more. Start with defaults; opt into broader measurement only for a reproduced stale-layout defect. Apply dnd-kit's returned transition instead of a competing blanket CSS transform transition. |
| Cancellation and validation | `onDragCancel` restores transient state; `cancelDrop` can synchronously or asynchronously reject a drop ([tagged `DndContext` API](https://github.com/clauderic/dnd-kit/blob/%40dnd-kit/core%406.3.1/packages/core/src/components/DndContext/DndContext.tsx)) | Invalid folder nesting, protected targets, destructive targets | Escape always works; illegal moves can visibly return to origin | Validation belongs in Pond's domain move function too. UI cancellation is not a substitute for persistence checks. |
| Performance hooks | Initial droppable layouts are measured lazily; items are displaced with `translate3d`/scale rather than repeated DOM mutation; activators use React synthetic events ([official performance notes](https://github.com/clauderic/dnd-kit/tree/%40dnd-kit/core%406.3.1#performance)) | Large folder trees and any future virtualized sorter | Smooth pointer tracking with bounded React work | Keep high-frequency position feedback in transforms. Persist on end; only use `onDragOver` state changes where cross-container behavior requires them. |
| Testing | Geometry drives all sensors; the maintainer recommends real-browser integration tests for actual drag behavior and the official repository exercises Storybook with Cypress ([maintainer guidance](https://github.com/clauderic/dnd-kit/issues/261), [tagged Cypress suite](https://github.com/clauderic/dnd-kit/tree/%40dnd-kit/core%406.3.1/cypress)) | All migrations | Catches release jumps, collision mistakes, scrolling, and modality regressions that zero-layout DOM tests miss | Keep pure reorder/validation logic in unit tests, but do not treat jsdom pointer events as proof that geometry-based dragging works. |

## Prioritized Pond applications

| Rank | Pond surface | Recommendation | Value | Effort/risk |
| --- | --- | --- | --- | --- |
| 1 | Live sidebar + Customize Sidebar | Add a shared overlay, drop handoff, cancellation, reduced motion, and tailored announcements | High | Low |
| 2 | Arrange Folder dialog | Replace its native drag shim with a virtualized vertical sorter and overlay | High | Low-medium |
| 3 | Data-table columns | Replace native header dragging with a horizontal sorter and dedicated handle | High | Medium |
| 4 | Folder tree | Migrate only internal folder organization to one hierarchical dnd-kit context while retaining the existing move planner and native Save drops | Very high | Medium-high |
| 5 | Smart Folder / saved-view groups | Model group targets and multi-selection explicitly; add cancel rollback and count feedback | Medium-high | Medium-high |
| 6 | Text-editor blocks | Evaluate only after isolating editor selection and node-move rules | Medium | High |
| Keep native | Save/file/media transfer | Continue using HTML5 `DataTransfer` where the gesture can cross windows or the desktop | Essential compatibility | A dnd-kit replacement would regress capability |

### 1. Finish the two sidebar sorters

This is the lowest-risk, highest-visibility improvement.

- Add one always-mounted `DragOverlay` per `DndContext`; render the existing
  presentational row for the active destination.
- Keep the original row in place as the layout placeholder and use drop side
  effects to dim it while the overlay has modest elevation. This creates the
  same “picked up card” separation shown in the supplied story without changing
  order during pointer movement.
- Start the settle-animation experiment around 160–200 ms with a decelerating
  easing. This is a design recommendation, not a dnd-kit default; the library's
  default is 250 ms `ease`
  ([drop-animation docs](https://dndkit.com/legacy/api-documentation/draggable/drag-overlay/#drop-animation)).
- Keep order updates optimistic and synchronous, then persist. An overlay that
  measures before asynchronous state arrives can animate toward the old slot
  and then jump to the new one.
- Apply `restrictToVerticalAxis` to the context and bound the overlay to the
  first scrollable ancestor where the sidebar/dialog can scroll.
- Use `closestCenter`; it is the official forgiving default for sortable lists
  ([collision guidance](https://dndkit.com/legacy/api-documentation/context-provider/collision-detection-algorithms/#closest-center)).
- Preserve reduced-motion behavior by disabling the drop animation and row
  transition when motion reduction is requested.

### 2. Complete input and accessibility parity

The Customize Sidebar dialog already has a separate handle and keyboard sensor;
the live sidebar is pointer-only so its navigation buttons are not hijacked by
Space/Enter. Preserve that navigation behavior while adding an intentional
keyboard reorder affordance:

- Reveal a small drag handle on row hover and when the handle itself has focus.
- Attach pointer activation to the row if direct manipulation remains desired,
  but attach dnd-kit's keyboard listener and ARIA attributes to the handle.
- Use `sortableKeyboardCoordinates` for each vertical group.
- Add Pond-specific instructions and announcements. Example: “Picked up All,
  position 4 of 7 in Library. Use Up and Down to move; Space or Enter to drop;
  Escape to cancel.” Announce only when the one-based position changes.
- On touch-capable desktop hardware, prefer a touch delay plus movement
  tolerance and show pending feedback using `onDragPending`. For mouse, retain a
  small distance threshold. The exact thresholds should be tuned in the running
  app rather than copied from documentation examples.
- Always clear overlay, cursor, pending, and optimistic state in both
  `onDragEnd` and `onDragCancel`.

### 3. Migrate Arrange Folder with its virtualizer intact

The Arrange Folder dialog is the cleanest new adoption. It already has a pure
`moveOrderedItem` operation and button alternatives, but its native HTML drag
only drops on currently rendered rows. Use `verticalListSortingStrategy`, keep
TanStack Virtual as the owner of row mounting, and render the active Save title
in a `DragOverlay`. The official docs call an overlay essential when a
virtualized source may unmount while scrolling
([DragOverlay guidance](https://dndkit.com/legacy/api-documentation/draggable/drag-overlay/#when-should-i-use-a-drag-overlay)).

Preserve the explicit Move Up / Move Down commands as a discoverable fallback,
add edge auto-scroll, and test dragging beyond the initially rendered window.
Do not switch to eager rendering merely to simplify drag-and-drop.

### 4. Replace data-table column dragging with a horizontal sorter

The shared data table currently uses native `DataTransfer` on the entire header
cell. That gives little target feedback and makes drag compete with sorting and
resizing. A horizontal dnd-kit context can reuse the existing
`reorderColumns(from, to)` state operation while adding displaced-column
feedback, a header overlay, keyboard movement, Escape cancellation, and
`restrictToHorizontalAxis`.

Use a dedicated reorder handle or a clearly isolated header region. Keep the
sort button clickable and the resize separator pointer-owned. Because the table
lives in `@pond/ui`, decide explicitly whether dnd-kit becomes a package
dependency or whether a desktop-owned adapter supplies the interaction; do not
leak desktop state into the UI package.

### 5. Migrate the folder tree as a dedicated hierarchical interaction

The folder sidebar currently owns native drag events plus domain logic for
before/inside/after drops. dnd-kit can improve the input layer while preserving
that pure move planner:

- Keep one context across the tree rather than one nested context per folder.
- Represent row top edge, row center, and row bottom edge as logical reorder /
  nest / reorder targets using a custom composed collision detector.
- Render a single overlay that includes the folder label and, for multi-select,
  a count badge.
- Auto-expand a collapsed folder only after a short hover dwell, and cancel the
  timer when the target changes or the drag is cancelled.
- Provide a clear insertion line for before/after and a contained highlight for
  nesting. Reject self/descendant moves through both collision filtering and the
  existing domain validator.
- Add keyboard semantics deliberately: Up/Down changes sibling position;
  Left/Right changes depth only when the move is valid; Escape restores the
  original structure.

Keep native `DataTransfer` listeners for dropping Saves onto folders. Folder
reordering is an in-app structural move suited to dnd-kit, while Save drops are
part of Pond's broader native transfer protocol. A hybrid must use distinct
activation paths so the two drag systems do not both start from the same
gesture.

This is a medium-sized migration, but it is where custom collision detection,
auto-scroll, overlay rendering, cancellation, and keyboard coordinates provide
substantially more value than a native drag shim.

### 6. Model Smart Folder grouping separately

Saved-view dragging is not just sorting: it can move a multi-selection into a
group. Use typed source data, a count-bearing overlay, group-only drop targets,
and a snapshot restored on cancellation. If ordering is added later, separate
the edge reorder zones from the center grouping zone rather than making one
ambiguous target do both jobs.

### 7. Leave editor blocks until their move rules are isolated

Text-editor block dragging is a later candidate. Its selection model, Lexical
node constraints, and editor-owned commands make replacement materially riskier;
first extract and test its move planner, then evaluate dnd-kit only as the input
and feedback layer.

## Follow-on implementation assessment

This assessment records the go/no-go boundary after implementing the sidebar,
Arrange Folder, data-table column, and hybrid folder-tree work.

### Smart Folder grouping: conditional go

The current interaction in
`apps/desktop/src/renderer/src/features/library/components/smart-folders/index.tsx`
uses one native payload for a selected set of saved-view IDs and accepts drops
only on entries whose kind is `group`. dnd-kit is a good input-layer fit, but a
safe conversion should wait for these seams:

1. Extract a pure `planSavedViewGroupDrop(ids, targetId, views)` operation that
   returns the selected roots and rejects self/descendant/cyclic group moves.
2. Add a batch move operation so a multi-selection commits atomically rather
   than awaiting `savedViews.move` once per root.
3. Decide whether the feature is grouping-only or also sortable. Grouping-only
   needs center targets; sorting later needs separate edge targets and persisted
   sibling order.
4. Snapshot only transient optimistic grouping state and restore it on Escape,
   invalid drop, or persistence failure. The persisted store remains the source
   of truth.
5. Add a count-bearing overlay and announcements such as “Move 3 Smart Folders
   into Research,” plus browser tests for collapsed, empty, nested, and invalid
   group targets.

Decision: **go after the pure planner and atomic batch operation exist**. Do not
replace the current native grouping gesture inside this change set because the
existing loop can partially commit a failed multi-selection and provides no
rollback boundary for dnd-kit's optimistic feedback.

### Lexical text-block reordering: no-go for replacement yet

`apps/desktop/src/renderer/src/features/saves/components/viewers/text-viewer/draggable-block.tsx`
is coupled to Lexical's editor state, nested list/collapsible traversal, DOM-to-
node lookup, zoom compensation, collapsed margins, editor commands, and native
file-drop detection. dnd-kit could eventually supply the handle sensor and
overlay, but it must not become the owner of block semantics.

Before another evaluation:

1. Extract and unit-test the legal move predicate and `$moveBlock` operation for
   paragraphs, headings, list items, code, media, and collapsible containers.
2. Preserve Lexical command registration as the transaction boundary so
   selection, history, and collaboration state remain editor-owned.
3. Prove that a dnd-kit overlay does not break zoomed editors, collapsed-margin
   targeting, auto-scroll, nested lists, or native file drops.
4. Define keyboard block-move semantics that do not conflict with text editing,
   selection, or assistive-technology cursor movement.

Decision: **do not replace the Lexical-native drag path now**. Re-evaluate only
after the move planner is isolated and the editor-specific browser matrix is in
place; dnd-kit should remain a possible feedback layer, not a replacement for
Lexical's model operations.

### 8. Retain native drag for cross-window and file transfer

Keep native HTML drag-and-drop for save cards, file imports, media export, and
any interaction whose `DataTransfer` payload must leave Pond or arrive from the
operating system. dnd-kit can coexist with those surfaces, but it cannot replace
their cross-window transport because that limitation follows directly from its
non-HTML5 architecture
([official architecture notes](https://github.com/clauderic/dnd-kit/tree/%40dnd-kit/core%406.3.1#architecture)).

## Shared interaction policy worth extracting

If Pond expands dnd-kit beyond the two current sorters, centralize policy rather
than duplicating configuration:

1. Sensor factory by surface type: compact clickable row, explicit handle,
   touch reorder, or cross-container tree.
2. Stable modifier arrays and collision functions outside render.
3. A presentational overlay shell with cursor, elevation, source dimming, and
   reduced-motion behavior.
4. Human-readable announcement builders using labels, one-based positions,
   totals, and container names.
5. A drag-session cleanup helper used by end, cancel, abort, and unmount paths.
6. Browser-level interaction fixtures for mouse, keyboard, touch, scroll, and
   cancellation.

Avoid a single global `DndContext` merely for reuse. Nested contexts only know
their own draggable/droppable nodes and the first matching context captures an
activation event
([DndContext nesting](https://dndkit.com/legacy/api-documentation/context-provider/dnd-context/)).
Choose context ownership according to which items must interact; share policy
through helpers and small components.

## Verification plan for each adoption

Unit tests:

- Pure reorder, cross-container transfer, invalid move, cancel rollback, and
  persistence-failure behavior.
- Announcement strings for start, changed position, drop, and cancel.
- Reduced-motion configuration and cleanup state.

Real-browser tests:

- A click/context-menu gesture below the activation threshold does not drag.
- Pointer motion cannot escape the allowed axis or container.
- The overlay stays under the pointer and settles into the final slot without a
  blank frame, snap-back, or duplicate visible source.
- Escape cancels from every sensor; Tab ends keyboard dragging as defined by
  core 6.3.1
  ([6.3.1 release note](https://github.com/clauderic/dnd-kit/releases/tag/%40dnd-kit%2Fcore%406.3.1)).
- Space and Enter pick up/drop from a focused handle; arrows choose the expected
  next row; focus returns to the activator.
- Touch press, movement tolerance, pointer cancellation, and scroll-edge
  behavior work on a touch-capable target.
- Long-list auto-scroll reaches the first and last target without moving an
  unrelated window or pane.
- Reduced motion removes nonessential movement while preserving target and
  completion feedback.

## Primary sources

- [dnd-kit legacy DragOverlay documentation](https://dndkit.com/legacy/api-documentation/draggable/drag-overlay/)
- [dnd-kit legacy sensors documentation](https://dndkit.com/legacy/api-documentation/sensors/)
- [dnd-kit pointer sensor documentation](https://dndkit.com/legacy/api-documentation/sensors/pointer/)
- [dnd-kit keyboard sensor documentation](https://dndkit.com/legacy/api-documentation/sensors/keyboard/)
- [dnd-kit modifier documentation](https://dndkit.com/legacy/api-documentation/modifiers/)
- [dnd-kit collision detection documentation](https://dndkit.com/legacy/api-documentation/context-provider/collision-detection-algorithms/)
- [dnd-kit sortable documentation](https://dndkit.com/legacy/presets/sortable/overview/)
- [dnd-kit accessibility guide](https://dndkit.com/legacy/guides/accessibility/)
- [dnd-kit core 6.3.1 tagged source and changelog](https://github.com/clauderic/dnd-kit/tree/%40dnd-kit/core%406.3.1)
- [dnd-kit core 6.3.1 release](https://github.com/clauderic/dnd-kit/releases/tag/%40dnd-kit%2Fcore%406.3.1)
- [Current dnd-kit repository and package map](https://github.com/clauderic/dnd-kit#packages)
- [Current dnd-kit migration guide](https://dndkit.com/react/guides/migration/)
- [Current dnd-kit feedback guide](https://dndkit.com/react/guides/feedback/)
- [Current dnd-kit plugin overview](https://dndkit.com/extend/plugins/)
- [Official Chromatic drag-overlay example supplied for comparison](https://main--5fc05e08a4a65d0021ae0bf2.chromatic.com/?path=/story/vue_draggable-drag-overlay--example)

All implementation claims above use first-party documentation, tagged source,
release notes, or maintainer guidance. No secondary tutorial or code sample was
used.
