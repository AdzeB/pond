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
