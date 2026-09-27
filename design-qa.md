# Processing status card design QA

- Source visual truth path: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-d176a3a1-28a5-4318-a2fb-fa3e0838f88d.png`
- Implementation screenshot path: unavailable because macOS ScreenCaptureKit repeatedly returned an invalid-parameter capture error for the running Pond window
- Viewport: Pond desktop window; exact viewport unavailable because capture failed
- Source pixels: 2048 × 1535
- Implementation pixels: unavailable
- CSS size: unavailable
- Density normalization: not performed because an implementation capture could not be produced
- State: intended comparison was the attention state with real running and retry task counts

**Full-view comparison evidence**

The source was opened and inspected. The implementation ran in Pond, but the native-window capture failed before a same-state screenshot could be saved. A valid combined comparison input could not be created.

**Focused region comparison evidence**

Not available. The status header, icon tile, summary rows, and footer could not be compared visually without the implementation capture.

**Findings**

- [P0] Visual comparison is blocked
  Location: Processing settings status card.
  Evidence: the source image is available, while the rendered Pond window could not be captured because ScreenCaptureKit failed.
  Impact: typography, spacing, colors, icon rendering, copy wrapping, and polish cannot be approved from rendered evidence.
  Fix: capture the Processing settings card after ScreenCaptureKit recovers, place it beside the source at a normalized scale, and resolve any P0, P1, or P2 differences.

**Open Questions**

- None. The remaining blocker is capture infrastructure rather than an unresolved product decision.

**Implementation Checklist**

- Capture the running Processing settings card in its attention state.
- Normalize the implementation crop to the source card region.
- Compare the five required fidelity surfaces: typography, spacing, colors, asset quality, and copy.
- Fix any P0, P1, or P2 findings and repeat the comparison.

**Follow-up Polish**

- Defer P3 refinements until a valid side-by-side comparison is available.

**Comparison History**

- Iteration 1: no comparison completed. Source evidence opened; implementation capture failed before visual findings could be assessed.

**Final Result**

final result: blocked

---

# Picker section-header and footer QA — September 27

- Source visual truth path: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-0845492d-a438-4e7c-9eca-7400ac8ac1ea.png`
- Implementation screenshot path: in-app browser capture of `http://127.0.0.1:5174/picker-gallery.html`; the browser QA surface did not expose a filesystem path for the capture
- Browser viewport: 787 × 705 CSS px at device pixel ratio 2
- Source pixels: 306 × 526
- Implementation focused region: 357.5 × 588 CSS px
- State: light-theme tag picker with Starred, Recommended, Recently, and Others expanded; folder picker also visible in the full-page capture

**Findings**

- No remaining header-size mismatch is visible in the implementation. Browser-computed styles report `12px`, weight `500`, and `18px` line height for all four tag section headers, including both static `div` labels and collapsible `button` labels.
- The Pond folder and tag implementations no longer render keyboard-hint footers. The implementation tag article contains zero `kbd` elements, and the accessibility snapshot ends both Pond pickers at their collections.
- [P2] A single combined source-and-implementation image could not be saved.
  Location: focused comparison evidence.
  Evidence: the source was opened through the local image viewer and the live implementation was captured through the in-app browser, but browser security correctly blocks loading the local source file into a comparison tab.
  Impact: the two artifacts were inspected separately rather than in the same comparison input.
  Fix: expose an approved HTTP-served copy of the source if a durable combined comparison board is required.

**Required Fidelity Surfaces**

- Fonts and typography: all group headers now share the same family inheritance, 12px size, 500 weight, and 18px line height. Item typography and truncation remain unchanged.
- Spacing and layout rhythm: removing the footers gives both Pond pickers a clean collection edge and removes the extra 40px footer region. Header padding and grid spacing remain unchanged.
- Colors and visual tokens: unchanged.
- Image quality and asset fidelity: no assets were added or replaced; existing Pond icons remain in use.
- Copy and content: only the Move, Select, and Close keyboard legends were removed. Search, group labels, rows, counts, and selection states remain intact.

**Full-view Comparison Evidence**

- The refreshed live gallery visibly shows no footer below either Pond collection. Eagle reference footers remain only inside the extracted reference frames.

**Focused Region Comparison Evidence**

- The implementation tag panel was captured at 357.5 × 588 CSS px. Starred, Recommended, Recently, and Others appear at the same visual size and weight. Computed-style inspection confirms the identical values reported above.

**Implementation Checklist**

- [x] Preserve the shared section-label typography for collapsible buttons.
- [x] Remove the folder picker footer.
- [x] Remove the tag picker footer.
- [x] Verify section-header computed styles in the live gallery.
- [x] Verify no keyboard hints remain in the Pond tag implementation.
- [x] Run focused UI and tag-menu tests, formatting, type checks, and whitespace validation.
- [ ] Produce a combined comparison board if the local source is later available to the browser over an approved HTTP URL.

**Comparison History**

- Iteration 1: collapsible section buttons used `font: inherit`, overriding the shared 12px section-label rule and rendering Recently and Others larger than Starred and Recommended.
- Fix: changed the shared header typography to inherit only the font family while retaining its explicit size and weight; removed both menu footers and their unused keyboard imports.
- Iteration 2: the live gallery reports identical header metrics and no Pond footer content. A combined image remains unavailable because the source is a local file that the browser cannot load.

**Final Result**

final result: blocked

---

# Assignment picker simplification QA — September 27

- Source visual truth path: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-d4f0922f-5c6b-4332-8b06-aa389ed2c398.png`
- Implementation screenshot path: unavailable because the shared picker-gallery runtime at `127.0.0.1:5174` is not running
- Source pixels: 862 × 870
- Intended implementation viewport: existing picker gallery in the Codex in-app browser
- State: expanded folder hierarchy with a selected nested row; tag picker open as a grouped grid

**Findings**

- [P0] Final rendered comparison is blocked.
  Location: Folder and tag assignment pickers.
  Evidence: the source screenshot was opened at original resolution, but the gallery URL currently refuses connections and no implementation screenshot can be captured.
  Impact: the nested-row inset, grid density, typography, colors, icons, truncation, and copy cannot receive visual approval.
  Fix: restart the designated shared picker-gallery runtime, capture the expanded folder tree and tag grid at the existing viewport, and compare them beside the source.

**Required Fidelity Surfaces**

- Fonts and typography: code continues to use Pond's existing picker typography and ellipsis behavior; rendered verification is pending.
- Spacing and layout rhythm: nested folder content and its active background now move inward by one 48px hierarchy step while retaining the common right edge; rendered verification is pending.
- Colors and visual tokens: unchanged Pond selection, hover, border, and background tokens; rendered verification is pending.
- Image quality and asset fidelity: existing Nucleo folder and checkbox icons remain in use; no new assets or approximations were introduced.
- Copy and content: the scope toolbar, tag sidebar, layout toggle, and pin button are removed; search, rows, sections, keyboard legend, and truncation remain.

**Full-view Comparison Evidence**

- Unavailable because the local gallery runtime is stopped.

**Focused Region Comparison Evidence**

- Unavailable because the local gallery runtime is stopped. The source's critical region shows a nested highlight beginning 48px inside the root-row edge while sharing its right boundary.

**Implementation Checklist**

- [x] Remove All, Recent, and Selected controls from the folder picker.
- [x] Inset nested folder content and row backgrounds without shortening the right edge.
- [x] Remove tag group navigation and all header action buttons.
- [x] Force tag assignment into a grouped grid with four-direction keyboard movement.
- [x] Update focused tests, TypeScript checks, formatting, lint, and provenance.
- [ ] Capture and compare the running gallery after its designated runtime is restarted.

**Comparison History**

- Iteration 1: the source showed a contained nested row and a simpler assignment surface than Pond's scoped folder and navigable tag pickers.
- Fix: simplified folders to one tree list, inset nested row backgrounds and content by 48px, and simplified tags to a rail-free grouped grid.
- Iteration 2: automated behavior and type checks pass; visual comparison remains unavailable because the shared gallery runtime is stopped.

**Final Result**

final result: blocked

---

# Eagle-aligned detail viewer design QA

- Source visual truth path: `/Users/raphaelsalaja/Developer/pond/.artifacts/eagle-detail-visual-comparison-2026-09-24/screens/eagle/video.png`
- Implementation screenshot path: in-app browser capture of `http://127.0.0.1:4187/video.html`; the browser QA surface did not expose a filesystem path for the captured image
- Combined comparison: `http://127.0.0.1:4187/video-comparison.html`
- Browser viewport: 1280 × 720 CSS px at device pixel ratio 2
- Source pixels: 1292 × 768
- Implementation capture pixels: 1292 × 768, with the live viewer rendered at 1280 × 720 CSS px
- Density normalization: the combined board places both 1292 × 768 content frames at the same 49% scale; the direct implementation capture was also inspected at full scale
- State: default video detail view with utility chrome visible above the canvas and playback transport visible below it

**Findings**

- No actionable P0, P1, or P2 differences remain in the viewer-shell scope. Pond now follows the reference hierarchy—persistent utility actions above, media transport below—while retaining Pond surfaces, tokens, Nucleo icons, and accessible labels.

**Required Fidelity Surfaces**

- Fonts and typography: Pond intentionally keeps its system UI font and numeric transport typography. The video toolbar contains no persistent filename or size text; action labels remain available to assistive technology without adding visual text to the icon groups.
- Spacing and layout rhythm: the top toolbar uses three balanced tracks, the video remains the dominant region, and the bottom transport is a distinct time-based control group. No persistent control is clipped at the tested desktop viewport.
- Colors and visual tokens: Pond retains its neutral background, divider, hover, pressed, and disabled tokens rather than copying Eagle's purple accent or surrounding application chrome.
- Image quality and asset fidelity: the comparison uses Eagle's captured reference image only as research evidence. The Pond canvas renders the real local MP4 and all product controls use the installed Nucleo icon family; no Eagle assets ship in the application.
- Copy and content: the video toolbar contains no persistent metadata copy. Elapsed time and duration remain in the playback transport, and action names are concise tooltip and accessible labels.
- Icons: utility actions consistently use 18px outline icons above the canvas; time-based controls use the existing playback icon language below it. Alignment and optical weight are consistent with the shared viewer chrome.

**Full-view comparison evidence**

The combined board visibly places Eagle and Pond in one browser-rendered frame. Both preserve a large central media region, put general item actions along the top edge, and reserve the bottom edge for playback. Pond deliberately omits Eagle's library sidebar and metadata inspector because those belong to the surrounding Pond detail route rather than the reusable viewer.

**Focused region comparison evidence**

The direct full-scale Pond capture was used for the two critical regions that are too small on the scaled board. The top region contains frame capture, thumbnail, comments, rotate, mirror, open, and export actions without filename or size metadata. The bottom region contains play, 10-second back and forward controls, volume, time, seek, speed, loop, and fullscreen actions. No additional crop was required because both strips are fully readable in the direct capture.

**Open Questions**

- None for the desktop detail-view shell.

**Implementation Checklist**

- [x] Apply the shared icon-first top toolbar across stored-file viewers.
- [x] Split video utility actions from playback transport.
- [x] Split audio utility actions from playback transport.
- [x] Move text-file identity and common actions into shared top chrome.
- [x] Preserve specialized image/GIF, PDF, font, model, archive, EPUB, live-photo, web, and generic-file controls.
- [x] Preserve control-free hover previews.
- [x] Verify toolbar semantics, rotate behavior, loop state, and console output in the browser-rendered fixture.

**Follow-up Polish**

- [P3] Consider responsive overflow handling if detached preview windows are allowed to become materially narrower than the tested desktop frame.

**Comparison History**

- Iteration 1: the earlier Pond video view exposed playback and transformations together only in a bottom HUD, leaving no Eagle-like utility strip above the media.
- Fix: added a persistent top video action toolbar, kept only time-based controls in the bottom transport, and applied the same top/bottom hierarchy to audio while moving text-file actions into shared top chrome.
- Iteration 2: the source and revised implementation were captured together at matching content-frame scale. No actionable P0, P1, or P2 visual issue remained.

**Primary Interactions Tested**

- Rotate: the video transform changed to the expected 90-degree matrix and was restored.
- Loop: `aria-pressed` changed to `true` and was restored to `false`.
- Structure: the `Video` and `Playback` toolbars exposed the expected actions as separate semantic groups.
- Console: no errors or warnings were present in either the direct implementation or combined-comparison tab.

**Final Result**

final result: passed

---

# Image Navigator elevation QA

- Source request path: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-70828e6e-7f52-4339-9284-fce95e62f762.png`
- Rejected implementation path: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-e65163cf-b5eb-444b-b08d-fdefa8b7384d.png`
- Clipped-corner implementation path: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-88ee9282-8f29-4910-96f2-8e460c199540.png`
- Revised implementation screenshot path: live Pond capture through Computer Use; the capture did not expose a filesystem path
- Source pixels: 558 × 674; rejected implementation pixels: 416 × 424; clipped-corner crop: 142 × 450
- Revised viewport: full Pond window; focused implementation pixels, CSS size, and density normalization are unavailable
- State: image detail view with the Navigator visible

**Findings**

- [P1] The first implementation's large shadow was visually heavy and extended beyond the Navigator's 12px inset, allowing the frame to clip its far edge.
- [P2] The next implementation left the viewport outline square, so the rounded map mask clipped its corner pixels.
- The revision uses `var(--ds-shadow-sm)`, clips only the rounded inner map, and makes the viewport inherit the same radius.
- Final focused pixel-level approval remains blocked because Computer Use only returned a scaled full-window capture.

**Required Fidelity Surfaces**

- Typography, copy, position, size, image rendering, and viewport geometry are unchanged.
- The smaller design-system shadow preserves separation without the large blur seen in the rejected implementation.
- The inner map clips the image and its viewport outline to one shared radius; the outer wrapper no longer clips its own elevation.

**Full-view Comparison Evidence**

- The user's rejected screenshots confirm the oversized shadow and square viewport corners. The revised full-window capture shows the Navigator in the expected location without a layout regression.

**Focused Region Comparison Evidence**

- The 416 × 424 crop shows the heavy lower/right shadow; the 142 × 450 crop shows the square blue outline being clipped by the rounded mask. A focused post-fix capture remains unavailable.

**Implementation Checklist**

- [x] Add an external elevation shadow to the Navigator card.
- [x] Reduce the elevation from `--ds-shadow-lg` to `--ds-shadow-sm`.
- [x] Move rounded clipping from the shadow wrapper to the inner map.
- [x] Make the viewport outline inherit the map's radius.
- [x] Preserve the inset accent outline on the movable viewport.
- [x] Verify focused behavior tests, formatting, and desktop type checking.
- [ ] Capture and compare a focused post-fix Navigator crop.

**Comparison History**

- Iteration 1: the source identified insufficient separation between the Navigator and the viewer surface.
- Fix: replaced the smaller card shadow with `var(--ds-shadow-lg)` and left the viewport outline on the viewport element.
- Iteration 2: the user's screenshot showed that the large shadow looked heavy and was clipped by the viewer frame.
- Fix: reduced the card to `var(--ds-shadow-sm)` and moved clipping to the rounded inner map so the wrapper can paint its shadow freely.
- Iteration 3: the user's focused crop showed the remaining square viewport outline clipping against the rounded map corners.
- Fix: made the viewport inherit the inner map's border radius so the inset blue outline follows the same curve.
- Iteration 4: focused tests and formatting pass; the full-window capture shows no layout regression, but a focused post-fix capture is unavailable.

**Final Result**

final result: blocked

---

# Eagle detail-control parity QA — September 27

- Source visual truth paths: `.artifacts/eagle-detail-visual-comparison-2026-09-24/screens/eagle/document.png`, `audio.png`, `font.png`, `gif.png`, `gif-frames.png`, and `video.png`
- Implementation screenshot path: unavailable because the Mac was locked and the existing shared Pond native runtime could not be inspected or captured
- State: generated document preview, PDF, audio, video, GIF frames, and font detail controls after the parity pass

**Findings**

- [P0] Final rendered comparison is blocked. The source captures remain available, but native app inspection returned no applications and reported that the Mac must be unlocked manually.
- Automated structure checks confirm that GIF Frames does not add a separator and that video exposes Actual Size, Fit to Window, and a volume slider.
- Source review confirms that shared file-viewer actions are emitted in one continuous end slot; the only remaining `Tray.Separator` in image controls is conditional on a multi-slide save.

**Required Fidelity Surfaces**

- Typography, spacing, colors, icon rendering, and responsive clipping require a fresh native capture after the Mac is unlocked.
- Control presence and grouping are covered by focused tests and TypeScript checks.
- Pond retains its own Nucleo icons, component tokens, richer capture/note actions, and independent implementation.

**Implementation Checklist**

- [x] Add generated-preview zoom, Comments, Actual Size, and Fit to Window.
- [x] Open the save inspector directly on Comments.
- [x] Add PDF direct-page entry and Print while preserving thumbnails, search, fit, zoom, and rotation.
- [x] Add audio mute, progress, volume, loop, and fullscreen controls.
- [x] Add video volume, Actual Size, and Fit to Window controls.
- [x] Add toggleable GIF Frames without adding a separator.
- [x] Add font Symbols and Information modes.
- [x] Keep file-viewer actions continuous and reserve the sole divider for multi-slide navigation.
- [x] Pass focused tests, desktop TypeScript, Biome, and provenance checks.
- [ ] Capture the revised native viewers after the Mac is unlocked and compare the six required fidelity surfaces.

**Comparison History**

- Iteration 1: the live Eagle audit identified missing document, PDF, media, GIF, and font controls plus discontinuous Pond toolbar grouping.
- Fix: implemented the missing controls through the existing Pond viewer architecture and removed shared file-toolbar group spacing.
- Iteration 2: automated checks passed; visual approval could not be completed because the Mac was locked.

**Final Result**

final result: blocked

---

# Eagle-inspired save context menu design QA

- Source visual truth path: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-396d7c5d-501a-49ca-85f3-b88d239e6828.png`
- Implementation screenshot path: unavailable; the native Pond capture omitted the open transient popup layer
- Viewport: live Pond desktop detail view
- Source pixels: 1174 × 1666
- State: Save Actions open for an image, with Navigator enabled and Grayscale disabled

**Findings**

- [P0] Pixel-level comparison is blocked because the native capture API did not include the open popup. The running accessibility tree did expose the complete rendered menu, but it cannot verify typography, spacing, color, shadow, or icon alignment.

**Verified Structure and Interactions**

- The live menu exposes a flat sequence of common actions rather than wrapping them in Open, Organise, and Copy submenus.
- Open With, Export, Copy Options, Search by Image, Agent, and More remain submenus because each represents a genuine option family.
- Navigator and Grayscale appear as direct checked rows in the opened-image menu; Navigator is restored as a user-controlled setting.
- Entering `navigator` in the live filter reduced the menu to the Navigator row.
- The save context menu and detail kebab menu retain the shared filter header and use a 280px minimum width.
- Focused menu, Navigator, shared menu-rendering, and TypeScript checks pass.

**Open Questions**

- None. The remaining limitation is native transient-popup capture, not an unresolved product decision.

**Comparison History**

- Iteration 1: the earlier hierarchy grouped common actions into compact Open, Organise, and Copy submenus and removed the manual Navigator control.
- Fix: flattened common actions, restored Navigator beside Grayscale, retained submenus only for expandable option families, and widened the menu.
- Iteration 2: live accessibility inspection verified order, checkbox state, and filtering. Native visual capture omitted the popup, so pixel comparison could not be completed.

**Final Result**

final result: blocked

---

# Eagle-style image toolbar QA

- Source visual truth paths: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-f57abf1d-5d0f-40d5-b2bb-cbbbf6312ef7.png`, `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-01bcb885-c886-4cc8-ae83-bdcc2da943e2.png`, `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-ae6abd95-2331-47d9-a6be-3122fbd89806.png`, `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-bdfac64d-0020-4300-8830-fab0d3fc292c.png`, `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-ce740eda-e878-4f54-9f75-dd91e6ec5a74.png`, `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-23323437-225f-495c-91e1-354a865fe9df.png`, and `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-b7ca0396-169e-47aa-9e3d-d5cfba4157c4.png`
- Implementation screenshot paths: `/tmp/pond-toolbar-container-qa.jpg` and focused source/implementation comparison `/tmp/pond-toolbar-container-comparison.jpg`
- Viewports: focused production-component specimens at 760px and 360px viewer-container widths inside a 1,046 × 720 browser viewport
- Source pixels: latest radius reference 362 × 154; focused implementation crop normalized to the same 362 × 154 pixels
- Implementation capture: production `ViewerChrome` and image controls rendered at wide and narrow viewer-container widths with the first of 8,967 filtered library results active
- Density normalization: focused source and implementation toolbar crops were placed in one 1,360 × 130 comparison image; behavioral verification uses computed CSS sizes rather than source screenshot density
- State: first library image result, details-pane-equivalent narrow viewer, controls visible, no menu open

**Findings**

- No open findings. The image controls now sit in the integrated top toolbar instead of floating over the stage. Only the centered zoom controls hide when the viewer container is 620px wide or narrower; the count, tools, crop controls, and conditional slide navigation remain available even when the full window is wider.

**Required Fidelity Surfaces**

- Fonts and typography: the library item position and zoom ratio use Pond's compact shared viewer typography and tabular numerals.
- Spacing and layout rhythm: a three-track `1fr auto 1fr` toolbar keeps the result position left, zoom centered, and actions right, with 2px action gaps.
- Colors and visual tokens: controls use the shared ghost-button colors and states, and primary icon buttons inherit the shared gray-11 default.
- Image quality and asset fidelity: every action uses the installed 18px Nucleo outline icon components; no reference assets ship in Pond.
- Copy and content: accessible labels match the requested actions, including `Actual Size` and `Fit to Window`.

**Full-view Comparison Evidence**

The native Pond capture confirms the requested hierarchy remains intact: result position on the left, zoom centered, and editing actions with conditional slide arrows on the right. The compact rule is scoped to the viewer toolbar container rather than the application viewport.

**Focused Region Comparison Evidence**

The focused comparison at `/tmp/pond-toolbar-container-comparison.jpg` places the reported narrow-toolbar state and corrected 360px container state together. Browser-computed evidence reports zoom `display: none`, all six image actions visible, and equal `clientWidth`/`scrollWidth` of 342px in the narrow toolbar. At 760px, zoom remains visible and all six actions remain available.

**Open Questions**

- None.

**Implementation Checklist**

- [x] Replace the local slide/file count with the actual filtered-library position.
- [x] Keep only the result position on the left.
- [x] Place zoom in the centered track.
- [x] Order image actions as Comment, Flip, Rotate, Crop, Actual Size, and Fit to Window.
- [x] Remove both item-navigation arrows from the toolbar.
- [x] Add Previous Slide and Next Slide after a visible divider following Fit to Window.
- [x] Show slide controls only for saves with multiple slides.
- [x] Use blank group spacing instead of separator lines.
- [x] Use the integrated top toolbar with left, center, and right tracks.
- [x] Reduce shared viewer-island rounding to the 10px large-radius token.
- [x] Use the shared tooltip shadow for viewer islands.
- [x] Hide only the centered zoom controls when the viewer container is 620px wide or narrower.
- [x] Remove the overflow menu and its toolbar-only state.
- [x] Keep every control at the shared small button size.
- [x] Remove local button size/color and specificity overrides.
- [x] Reuse the same left/count, center/control, and right/action contract across image, video, PDF, audio, font, model, archive, EPUB, Live Photo, safe-web, text-file, note, and generic-file views.
- [x] Merge specialized preview controls and generic file actions into one top bar per view.
- [x] Verify the result in the live native Pond app.

**Follow-up Polish**

- None for this focused toolbar change.

**Comparison History**

- Iteration 1: the compact sequence used vertical separators between the paging, zoom, and action groups.
- User clarification: `|` represented spacing, not divider lines.
- Fix: removed both separators and introduced blank group spacing while preserving the exact action order.
- Iteration 2: the live Pond toolbar showed the three groups with blank fixed spacing.
- User feedback: the result still looked unchanged because fixed gaps were not true toolbar spacers.
- Fix: replaced the fixed gaps with a three-track `1fr auto 1fr` layout so paging stays left, zoom is centered, and actions stay right.
- Iteration 3: the layout regression test passed, but fresh native verification was initially blocked by an unrelated renderer error.
- User refinement: remove the local `1 / 6` file count, use the left edge for the actual result position like Eagle, and move forward navigation to the right.
- Fix: sourced position and total from result navigation, removed the carousel pager, split item navigation across the left and right edges, and replaced the last local specificity override with an explicit HUD layout variant.
- Iteration 4: the live native Pond app renders `1 / 8967` at the left and Next Item at the far right; focused tests and typecheck pass.
- User refinement: remove both the left and right item-navigation arrows.
- Fix: removed both arrow controls while preserving the actual result position, centered zoom, and right-aligned image actions.
- Iteration 5: the live native Pond app renders `1 / 8967` with no arrow controls; focused tests pass.
- User refinement: restore local slide arrows after Fit to Window, separated by blank space, only when the save has multiple slides.
- Fix: threaded carousel state into active image controls and rendered Previous Slide and Next Slide conditionally without restoring the slide count.
- Iteration 6: the live six-slide Pond save renders both arrows after Fit to Window; Next Slide advances the carousel and enables Previous Slide. Single-image tests confirm the arrows are absent.
- User clarification: in this placement, `|` means a visible divider.
- Fix: replaced the blank margin with the shared toolbar separator, conditional on the same multi-slide state as the arrows.
- Iteration 7: focused tests confirm the divider immediately precedes the slide arrows and that single images omit the divider and both arrows.
- User refinement: return to the floating toolbar.
- Fix: moved result position, zoom, and actions into the shared floating HUD pills; restored a floating crop-action pill and preserved presentation-mode visibility.
- User clarification: keep the floating toolbar at the top, not the bottom.
- Fix: anchored the result position, zoom, actions, and crop toolbar to the corresponding top HUD positions.
- Iteration 8: focused renderer tests confirm all three top floating anchors, conditional slide navigation, and hidden controls when viewer chrome is disabled.
- User refinement: hide the viewer islands on smaller screens and reduce their rounding.
- Fix: applied the shared 10px viewer-island radius and a 620px responsive visibility cutoff to both regular and crop image HUDs.
- Iteration 9: exact-size source/implementation crops confirm the tighter silhouette; responsive browser specimens confirm visible controls at 900px and no controls at 620px.
- User refinement: use the extra-small shadow on viewer islands.
- Fix: applied `--ds-shadow-xs` at the shared viewer HUD layer without changing other tray pills.
- User correction: use the tooltip shadow instead.
- Fix: replaced the viewer HUD shadow with `--ds-shadow-tooltip` while leaving other tray pills unchanged.
- User refinement: move away from the floating viewer treatment.
- Fix: returned the image and crop controls to the integrated top toolbar while preserving the simplified actions, result count, centered zoom, responsive cutoff, and conditional slide navigation.
- User correction: hide zoom on smaller screens, not the tools.
- Fix: scoped the 620px cutoff to the centered zoom group and kept the top toolbar, count, action tools, crop actions, and slide navigation visible.
- User feedback: zoom remained visible while the action tools disappeared when the details pane narrowed the viewer inside a wide window.
- Fix: replaced the viewport media query with a container query on the viewer toolbar, removed its max-content minimum, and switched the compact layout to two tracks so the count and actions remain visible.
- Iteration 10: the 360px production-component render shows no zoom controls and all six requested action icons without horizontal overflow; the 760px render retains the full three-track layout.
- User refinement: apply the same left/count, center/control, and right/action structure to every viewer.
- Fix: introduced one shared three-zone viewer bar, moved each top control surface into it, reused the actual filtered-library position on the left, and composed specialized controls with common file actions instead of mounting competing bars.
- Iteration 11: focused viewer tests and both desktop TypeScript projects pass; source inspection confirms one top bar per specialized file preview.

**Primary Interactions Tested**

- Focused renderer tests verify the visible action order, result count, absence of item-navigation arrows, conditional divider and slide arrows, working Next Slide action, and shared `sm` size.
- Gallery chrome tests verify that a multi-image save no longer exposes the local `1 / 2` count and instead reports its library position.
- The previous live accessibility pass exposed every requested action with its expected label and the real `1 / 8967` count, with no Previous Item or Next Item control.
- The focused layout contract now requires the integrated top toolbar and rejects floating HUD anchors for image controls.
- The shared bar contract test verifies the start, center, and end zones and the container-scoped center-collapse marker.
- The clean responsive browser specimen produced no console errors. Its only warnings are existing duplicate hotkey registrations caused by rendering two QA specimens on one page.

**Final Result**

final result: passed

---

# Figma-style image comments design QA

- Source visual truth paths: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-fcb92bc8-abde-401a-946e-9a3b4ff6bd45.png` and the time-only metadata correction in `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-f120a1aa-8a03-40a8-8584-0d37b0fa4411.png`
- Implementation screenshot path: in-app browser capture of `http://localhost:5173/comment-qa.html`; the browser QA surface did not expose a filesystem path for the capture
- Combined comparison: `http://localhost:5173/comment-qa.html`
- Browser viewport: 1280 × 720 CSS px
- Source pixels: 932 × 722
- Implementation CSS size: 360px comment card at native browser scale
- Density normalization: the Retina Figma reference was rendered at 50% (466 × 361 CSS px) beside the native 360px Pond card so the two comment surfaces could be compared at equivalent UI density
- State: one selected image comment with a numbered pin, relative timestamp only, thread actions, resolve, close, message actions, and an empty reply composer

**Findings**

- No actionable P0, P1, or P2 differences remain. Pond now follows Figma's comment hierarchy and interaction separation while retaining Pond tokens, components, persistence, and installed Nucleo icons.

**Required Fidelity Surfaces**

- Fonts and typography: compact header copy, muted relative time, and readable multiline comment text follow the reference hierarchy using Pond's system typography; the redundant single-user author label is intentionally omitted.
- Spacing and layout rhythm: the 360px card, compact divided header, full-width message content, and bottom composer match the density-normalized Figma reference without redundant avatar columns or the previous empty gap.
- Colors and visual tokens: the implementation keeps Pond's neutral surfaces, borders, shadows, focus ring, accent outline, and disabled treatment.
- Image quality and asset fidelity: the canvas uses compact numeric markers and the thread uses the installed 18px Nucleo dots, resolve, close, edit, delete, and send icons. No Figma artwork ships in the product.
- Copy and content: each message shows only its relative timestamp and comment text; the thread header contains only icon actions; message editing is entered from the message menu; and reply copy is isolated in the composer.

**Full-view Comparison Evidence**

The combined in-app browser view placed the supplied reference and live Pond component in one 1280 × 720 visual input. After density normalization, the update preserved the card, anchored-pin relationship, header/action structure, multiline body, and bottom reply composer while reducing message metadata to the requested relative time. Pond intentionally uses numbered pins and omits identity chrome because its comments are single-user.

**Focused Region Comparison Evidence**

The live Pond card was also inspected directly at full browser scale. The comment menu opened without dismissing the thread, Edit changed only the selected message into an inline editor with Cancel and Save, and Cancel returned to the read-only thread. The textarea resize affordance was removed after the focused comparison exposed it.

**Open Questions**

- None.

**Implementation Checklist**

- [x] Open a selected comment as a focused thread beside its annotation.
- [x] Show the local author and timestamp on each message.
- [x] Add persisted timestamped replies without closing the thread.
- [x] Separate inline message editing from thread opening.
- [x] Add icon-only thread actions, soft resolve, close, edit, delete, and send controls.
- [x] Hide resolved comments from the active canvas and inspector while preserving their stored data.
- [x] Keep numbered canvas pins and remove redundant initials avatars from the single-user thread.
- [x] Remove the redundant author name so each message shows only its relative timestamp.
- [x] Verify focused tests, desktop type checking, direct rendering, interaction states, and density-normalized side-by-side rendering.

**Follow-up Polish**

- None for the requested Figma-style comment interaction.

**Comparison History**

- Iteration 1: the first live render confirmed the structure and interactions but exposed a native textarea resize handle and looser-than-reference vertical density.
- Fix: disabled resizing with sufficient selector specificity, reduced header and body spacing, tightened avatar sizing, and normalized the reference to its Retina density.
- Iteration 2: the supplied source and revised live component were visible together at matching UI density with no remaining P0, P1, or P2 issue.
- Iteration 3: the numbered-pin revision was inspected in the running Pond app and beside the density-normalized Figma reference. Removing initials eliminated the unused avatar columns without weakening the author/timestamp hierarchy; no actionable P0, P1, or P2 issue was introduced.
- Iteration 4: the supplied metadata crop and the live time-only thread were placed together in one 1280 × 720 browser view. The name was removed, the timestamp remained left-aligned, and the message menu stayed right-aligned with no actionable P0, P1, or P2 issue.

**Primary Interactions Tested**

- Opening a comment keeps the saved message read-only and focuses the reply composer.
- Adding a reply persists it in the comment thread and keeps the thread open.
- Resolving persists `resolvedAt`, closes the popover, and removes the thread from active comment surfaces without deleting it.
- Comment Actions opens inside the thread and enters the inline edit state.
- Cancel exits inline edit without changing the message.
- Focused renderer tests pass and the desktop TypeScript projects compile without errors.
- The time-only metadata row was verified in both the running Pond window and a focused combined comparison.

**Final Result**

final result: passed

---

# Sidebar customization design QA

- Source visual truth paths: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-a8b33823-5910-427b-b32e-b90194811fab.png`, `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-526bd1b9-2b66-4ec6-96c6-8c5ccc32162d.png`, `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-7593c071-119a-454c-865f-c19da300593f.png`, `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-31546f50-fa8c-480b-b46d-26a27c2fa3e5.png`, `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-091bfc51-7640-4325-96d6-bf4e661d8496.png`, `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-f024cfc3-bc1a-494e-9950-5a3a6e4cceeb.png`, and `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-9f8394d9-8bbe-444e-8f60-700a5cfe5a68.png`
- Implementation screenshot path: in-app browser capture of `http://localhost:5173/sidebar-axis-preview.html`; the browser QA surface did not expose a filesystem path for the capture
- Combined comparison: `http://localhost:5173/sidebar-axis-comparison.html`
- Browser capture: 1280 × 720 pixels
- Primary source pixels: 1326 × 1418 for the full dialog, 1124 × 216 for the count-control simplification, 336 × 1006 for the visibility-select replacement, 1096 × 792 for the vertical-drag reference, and 596 × 502 for the direct live-sidebar reordering reference
- Density normalization: the comparison board places the requested control crop and the live Pond dialog in equal-width columns, with the source contained without cropping and the implementation rendered at its native responsive width
- State: customization dialog open, Show Count on, every destination visibility switch on, and light appearance for the latest vertical-drag comparison

**Findings**

- No actionable P0, P1, or P2 differences remain. Pond follows the simplified interaction model: a single settings entry, grouped reorderable destinations, per-item visibility switches, a Show Count switch, and contextual access. It uses Pond destinations, tokens, components, and iconography.

**Required Fidelity Surfaces**

- Fonts and typography: the title, section labels, and destination labels preserve the reference hierarchy while using Pond's system typography and existing settings scale.
- Spacing and layout rhythm: the dialog uses a compact single-column stack, bordered control groups, consistent 48px destination rows, and clear separation between Library and Harvesting.
- Colors and visual tokens: the implementation uses Pond's neutral light- and dark-theme surfaces, borders, focus treatment, and text tokens instead of copying Linear's palette.
- Image quality and asset fidelity: every destination and menu action uses installed Nucleo vector icons. No Linear artwork or code ships in the product.
- Copy and content: the visible rows now need only `Show Count` and Pond's destination names. Switch state replaces the repeated `Always Show` and `Hide` copy while remaining available to assistive technology.

**Full-view Comparison Evidence**

The latest combined board places the supplied light-theme destination rows beside the live Pond dialog in one browser input. Every destination uses the same compact aligned handle, icon, label, and switch structure. The full Library list and the start of Harvesting remain visible without horizontal overflow at the tested viewport.

**Focused Region Comparison Evidence**

The direct full-scale Pond capture confirmed that drag handles, icons, labels, and switch controls remain aligned and readable in every row. A horizontal-only drag on All dropped back over All without reordering; a diagonal drag with substantial horizontal movement reordered All vertically beneath Tags, confirming that the horizontal component was discarded.

**Open Questions**

- None.

**Implementation Checklist**

- [x] Add the App Sidebar settings row and shared customization dialog.
- [x] Persist destination visibility switches, ordering, Show Count, and per-destination badge overrides.
- [x] Add contextual Visibility, Badge, and Customize Sidebar actions to built-in destinations.
- [x] Apply the saved order, visibility, Show Count setting, and per-item badge overrides to the live sidebar.
- [x] Preserve keyboard-accessible reordering in addition to pointer drag and drop.
- [x] Verify schema migration from the legacy `showCounts` preference.
- [x] Record Linear as adapted provenance and regenerate public provenance views.

**Follow-up Polish**

- None for the requested desktop sidebar-customization scope.

**Comparison History**

- Iteration 1: the first live fixture confirmed the full dialog structure in Pond's light theme.
- Fix: applied the real theme effect and reran the fixture in dark appearance to match the supplied references.
- Iteration 2: the side-by-side board showed aligned hierarchy, row density, grouping, and controls with no actionable P0, P1, or P2 issue remaining.
- User refinement: replace the default badge-style preview and select with one Show Count toggle.
- Fix: removed the preview and select, then mapped the switch directly to the persisted count visibility preference.
- Iteration 3: the focused comparison board showed the requested two-column row, title-case label, native Pond switch, and unchanged surrounding dialog structure. No actionable P0, P1, or P2 issue remained.
- User refinement: replace every repeated Always Show or Hide select with a toggle.
- Fix: replaced each destination select with the shared Pond switch and used the destination label as its accessible name.
- Iteration 4: the focused comparison board showed nine consistently aligned visibility switches and unchanged row spacing. No actionable P0, P1, or P2 issue remained.
- User refinement: use dnd kit for sidebar destination reordering.
- Fix: replaced native row dragging and custom arrow handlers with handle-only dnd-kit pointer and keyboard sensors while retaining group-constrained persistence.
- Iteration 5: the idle dialog remains visually unchanged; the grip now owns drag activation so interacting with a destination switch cannot start a drag.
- User refinement: constrain every sidebar drag to the vertical axis.
- Fix: applied dnd-kit's vertical-axis modifier to every destination-group drag context so rows cannot drift horizontally.
- Iteration 6: idle layout remains unchanged and active drag translation is limited to the y axis.
- User refinement: make the rendered Library sidebar itself directly rearrangeable.
- Fix: made each visible built-in destination row a pointer-sortable dnd-kit activator, constrained it to its section and the y axis, and persisted it through the same sidebar order preference without moving hidden destinations.
- Iteration 7: direct sorting preserves the existing row chrome, active state, clicks, right-click menus, counts, and section labels; no extra handle or horizontal motion is introduced in the compact live sidebar.
- User refinement: remove the visible jolt when releasing a directly sorted sidebar row.
- Fix: removed the competing generic transform transition and applied dnd-kit's per-frame transition value, including its zero-duration layout handoff after the order changes.
- Iteration 8: the dropped row now lands directly in its persisted position without an animated snap back to stale geometry.

**Primary Interactions Tested**

- Show Count changed from on to off and persisted in the preview state.
- The All visibility switch changed from on to off and persisted in the preview state.
- Arrow Down on the All drag handle moved it below Uncategorized, confirming keyboard reordering.
- A horizontal-only pointer drag on All did not move or reorder it.
- A diagonal pointer drag moved All beneath Tags while remaining constrained to the vertical list.
- Every visible live-sidebar destination is exposed as a sortable row in saved order while ordinary click and context-menu behavior remains covered by the sidebar component tests.
- A pointer-driven component regression test confirms the released row receives dnd-kit's zero-duration handoff frame before the reordered layout settles.
- The complete dialog remained semantically exposed as labelled buttons, headings, lists, switches, and sortable handles.
- The in-app browser console reported no warnings or errors.

**Final Result**

final result: passed

---

# Eagle-style video transport QA

- Source visual truth paths:
  - `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-a7d3face-1160-4035-b8cd-e55a6babc52a.png`
  - `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-8bef378e-3261-442e-a919-868c8b5b8d0e.png`
- Implementation screenshot path: in-app browser capture of `http://127.0.0.1:4187/video.html`; the browser QA surface did not expose a filesystem path for the capture
- Combined comparison: `http://127.0.0.1:4187/video-transport-comparison.html`
- Browser viewport: 1280 × 720 CSS px at device pixel ratio 2
- Source pixels: 2666 × 152 for the transport reference and 1320 × 606 for the hover-preview reference
- Implementation capture pixels: 2560 × 1440 physical pixels from a 1280 × 720 CSS viewport
- Density normalization: both source images are contained without cropping in the comparison board; the live 1292 × 768 Pond fixture is shown at 65% scale (839.8 × 499.2 CSS px) and was also inspected directly at full viewport scale
- State: video detail view with utility chrome visible, playback paused at 0:02, and a real video frame plus timestamp visible above the hovered timeline position

**Findings**

- No actionable P0, P1, or P2 differences remain. Pond now matches Eagle's compact single-row transport hierarchy, outline icon language, long dominant scrubber, and frame-plus-time hover feedback while retaining Pond's neutral chrome and component tokens.

**Required Fidelity Surfaces**

- Fonts and typography: the elapsed/duration pair and speed label remain compact, tabular, and legible. The hover time is isolated in a small high-contrast label like the reference; Pond intentionally retains its system UI typography.
- Spacing and layout rhythm: controls are arranged in one tight row with zero inter-control row gap, the timeline receives the flexible width, and secondary speed, loop, and fullscreen actions stay at the trailing edge. The preview is centered on the precise hover point and clamps naturally at either edge.
- Colors and visual tokens: Pond preserves its neutral foreground, divider, surface, shadow, radius, disabled, hover, and pressed tokens. The implementation does not copy incidental colors from the reference video content.
- Image quality and asset fidelity: the preview renders an actual frame from the current video at its native aspect ratio with `object-fit: contain`, a crisp neutral border, and no placeholder imagery. Every transport glyph uses the installed 18px Nucleo outline family; no handcrafted SVG or text-glyph substitute is present.
- Copy and content: the visible playback copy is limited to elapsed time, duration, and speed. All icon controls retain concise accessible labels and tooltip names.

**Full-view Comparison Evidence**

The combined browser board places both Eagle references and the live Pond video viewer in one 1280 × 720 input. At the full-view level, the Pond implementation has the same control density and emphasis: compact transport controls at the edges, a visually dominant scrubber through the middle, and a quiet neutral surface that lets the media remain primary.

**Focused Region Comparison Evidence**

The transport strip and hover preview were inspected both in the combined board and in the direct live fixture. The combined hover state visibly shows the Eagle frame/timestamp reference beside Pond's real frame/timestamp popup. The direct view confirmed the 18px outline icons, one-row alignment, preview border and shadow, timeline hit target, and un-clipped popup.

**Open Questions**

- None for the desktop video transport.

**Implementation Checklist**

- [x] Replace filled playback, seek, volume, loop, and fullscreen glyphs with Nucleo outline icons.
- [x] Tighten the transport into a single compact row and let the scrubber consume the available width.
- [x] Add a real decoded frame preview and timestamp on timeline hover.
- [x] Keep the preview aligned to the exact seek position, including track edges.
- [x] Allow only the playback chrome to show the preview outside its bar without changing other viewer overflow behavior.
- [x] Verify direct and combined views, focused tests, type checks, formatting, and browser console output.

**Follow-up Polish**

- None required for this focused change.

**Comparison History**

- Iteration 1: the first rendered hover popup was clipped by the shared bottom chrome, leaving only the timestamp visible. This was a P2 fidelity and usability issue because the requested frame preview could not be seen.
- Fix: opened overflow only for the bottom chrome that contains the `Playback` toolbar, preserving clipping behavior for other viewer chrome.
- Iteration 2: the revised combined comparison showed the real Pond video frame and timestamp fully above the scrubber, aligned beside Eagle's corresponding hover state. No actionable P0, P1, or P2 issue remained.

**Primary Interactions Tested**

- Scrubber selection updates playback time and exposes the hover preview state.
- The decoded preview frame loads and fades in only after the secondary video seeks successfully.
- Playback, 10-second back/forward, mute, speed, loop, and fullscreen controls remain present with accessible names.
- Direct and combined-comparison browser consoles contain no errors or warnings.

**Final Result**

final result: passed

---

# Video toolbar metadata removal QA

- Source visual truth path: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-a62855e0-d05f-4ac7-9bf0-1cd0c0878a53.png`
- Implementation screenshot path: in-app browser capture of `http://127.0.0.1:4187/video.html`; the browser QA surface did not expose a filesystem path for the captured image
- Combined comparison: `http://127.0.0.1:4187/video-metadata-removal.html`
- Browser viewport: 1280 × 720 CSS px at device pixel ratio 2
- Source pixels: 414 × 176
- Implementation capture pixels: 1292 × 768, with the live viewer rendered at 1280 × 720 CSS px
- Density normalization: the source crop is displayed at its native aspect ratio; the implementation is shown live at 65% on the combined board and was also inspected at full scale
- State: default video detail view with the top action toolbar visible

**Findings**

- No actionable P0, P1, or P2 differences remain. The filename and file-size block identified in the source is absent, while the action groups remain centered and right-aligned as intended.

**Required Fidelity Surfaces**

- Fonts and typography: the unwanted metadata typography is fully removed; playback numerals remain unchanged.
- Spacing and layout rhythm: the empty left grid track preserves true centering for the primary action group, with open and export anchored at the right edge.
- Colors and visual tokens: no token changes were introduced; Pond's neutral toolbar surface and separators remain intact.
- Image quality and asset fidelity: the user-provided source crop is shown directly on the combined board without alteration; the implementation uses the existing Nucleo icons.
- Copy and content: neither the filename nor file size appears visually or in the accessibility tree. Accessible action names remain present.

**Full-view comparison evidence**

The combined board places the annotated source crop beside the live video detail view. The marked metadata is absent from the implementation and the toolbar remains visually balanced above the media canvas.

**Focused region comparison evidence**

The combined board focuses on the exact top-toolbar region requested by the user. A separate full-scale capture confirmed the same absence without scaling and showed no clipping or alignment regression.

**Open Questions**

- None.

**Implementation Checklist**

- [x] Remove the video filename and file-size elements.
- [x] Remove their unused formatting import and CSS.
- [x] Preserve centered primary actions and right-aligned open/export actions.
- [x] Verify the accessible toolbar contains actions only.
- [x] Check the direct preview and comparison-board consoles; no errors or warnings were present.

**Follow-up Polish**

- None for this focused change.

**Comparison History**

- Iteration 1: the user marked the persistent video filename and size for removal.
- Fix: removed both metadata elements while keeping the three-track toolbar geometry.
- Iteration 2: the source and revised implementation were captured together. No actionable P0, P1, or P2 issue remained.

**Final Result**

final result: passed

---

# Video transport control refinement QA

- Source visual truth path: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-4ab37486-685a-476c-af75-9fd3af404737.png`
- Implementation screenshot path: in-app browser capture of `http://127.0.0.1:4187/video.html`; the browser QA surface did not expose a filesystem path for the capture
- Combined comparison: `http://127.0.0.1:4187/video-transport-refinement.html`
- Browser viewport: 1280 × 720 CSS px at device pixel ratio 2
- Source pixels: 444 × 130
- Implementation capture pixels: 2560 × 1440 physical pixels from a 1280 × 720 CSS viewport
- Density normalization: the source crop is contained without cropping; the live 1292 × 768 fixture is rendered at 85% scale and clipped to its transport region in the same comparison board
- State: video playing with the custom Pause mark visible; Back, Forward, Mute, time, and scrubber visible in the focused bottom transport

**Findings**

- No actionable P0, P1, or P2 differences remain. The requested caret-to-line icon pair, two-stroke Pause mark, control spacing, concise tooltips, and shortcut-backed seek behavior are present without changing the surrounding viewer.

**Required Fidelity Surfaces**

- Fonts and typography: Back and Forward use terse title-case tooltip labels. Time remains tabular and unchanged.
- Spacing and layout rhythm: the control row has a 2px inter-button gap. The time block adds 4px before and 6px after, separating Mute from the readout and the readout from the scrubber without loosening the whole transport.
- Colors and visual tokens: icons and custom Pause strokes inherit `currentColor`; hover and pressed surfaces continue to use Pond's existing neutral tokens.
- Image quality and asset fidelity: Back and Forward use the exact installed Nucleo 18px outline `caret-left-to-line` and `caret-right-to-line` components requested. The user-requested Pause mark is two direct 1.5px vertical strokes with no surrounding box or secondary shape.
- Copy and content: visible tooltips are `Back` and `Forward`. Play or Pause, Back, Forward, Mute, Copy Current Frame, and Save Current Frame expose their existing configurable shortcut hints.

**Full-view Comparison Evidence**

The focused comparison board places the annotated source crop and the live Pond transport in one browser input. The implementation keeps the same one-row hierarchy and compact density while separating the highlighted Mute, time, and scrubber regions.

**Focused Region Comparison Evidence**

The implementation side is cropped to the bottom transport at 85% scale. It visibly shows the two-line Pause mark, caret-to-line Back and Forward icons, Mute, increased time spacing, and the start of the scrubber at a readable size.

**Open Questions**

- None.

**Implementation Checklist**

- [x] Rename seek tooltips to Back and Forward.
- [x] Use the exact requested Nucleo caret-to-line outline icons.
- [x] Replace the outlined Pause glyph with two straight inherited-color strokes.
- [x] Make button and keyboard seek behavior move 10 seconds.
- [x] Surface existing shortcut keys in supported transport and frame-action tooltips.
- [x] Add local spacing around the button cluster and time readout.
- [x] Verify type checking, formatting, behavior tests, direct rendering, comparison rendering, and a clean browser console.

**Follow-up Polish**

- None for this focused change.

**Comparison History**

- Iteration 1: the annotated source identified visually crowded spacing around Mute and the time readout, generic fast-seek icons, an overdrawn Pause glyph, long tooltip names, and missing visible shortcut hints.
- Fix: applied the exact caret-to-line icons, a two-stroke Pause mark, concise labels, shortcut content, 10-second keyboard seek parity, a 2px row gap, and targeted time margins.
- Iteration 2: the source and revised live transport were captured together at a readable focused scale. No actionable P0, P1, or P2 issue remained.

**Primary Interactions Tested**

- Back and Forward buttons move the active video by 10 seconds.
- Shift+Left and Shift+Right move the active video by the same 10-second amount.
- Tooltips receive shortcut components for Play or Pause, Back, Forward, Mute, Copy Current Frame, and Save Current Frame.
- A fresh direct preview and fresh combined comparison tab contained no console errors or warnings.

**Final Result**

final result: passed

---

# First detail-section spacing QA

- Source visual truth path: `/var/folders/sm/p05lq2nn4jd15ydyprjbt0b40000gn/T/codex-clipboard-9a7925eb-5947-4956-95d6-ff2552a7ed4c.png`
- Implementation screenshot path: live Pond capture through Computer Use; the capture did not expose a filesystem path and included docked DevTools
- Source pixels: 954 × 1430
- Implementation pixels, clean CSS viewport, and density normalization: unavailable because DevTools is docked into the app window
- State: Organise tab with Title as the first section

**Findings**

- [P2] The first section inherited the same 14px top padding used to separate later sections, compounding the pane body's existing 20px top inset.
- The revision removes only `padding-block-start` from a Section when it is the first child. Later sections retain their 14px vertical padding and dividers.

**Required Fidelity Surfaces**

- Typography, colors, content, inputs, dividers, horizontal padding, and subsequent section rhythm are unchanged.
- Only the first section's extra top padding is removed.

**Full-view Comparison Evidence**

- The live app and DevTools confirm that the first Title section remains in the Organise tab with no layout or content regression.

**Focused Region Comparison Evidence**

- DevTools computed styles confirm `.section:first-child { padding-block-start: 0; }` is applied to the selected Title section. A clean focused post-fix crop is unavailable while DevTools is docked.

**Implementation Checklist**

- [x] Remove top padding only from the first section.
- [x] Preserve spacing between later sections.
- [x] Run all nine detail-pane tests, formatting, and whitespace validation.
- [ ] Capture a clean focused post-fix crop after DevTools is undocked or closed.

**Comparison History**

- Iteration 1: the source showed redundant space above the first Title section.
- Fix: added the first-child padding override in the shared detail Section style.
- Iteration 2: behavior tests pass and the live computed style is active; a clean side-by-side visual comparison is blocked by docked DevTools.

**Final Result**

final result: blocked
