# PDF viewer design QA

- Source visual truth path: `/Users/raphaelsalaja/Developer/pond/.artifacts/eagle-detail-visual-comparison-2026-09-24/screens/eagle/document.png`
- Implementation screenshot path: in-app browser capture of `http://127.0.0.1:4187/`; the browser QA surface did not expose a filesystem path for the captured image
- Combined comparison: `http://127.0.0.1:4187/comparison.html`
- Comparison viewport: 1280 × 720 CSS px at device pixel ratio 2
- Source pixels: 1292 × 768
- Implementation viewport: 1292 × 768 CSS px at device pixel ratio 2, scaled to 49% only for the combined comparison board
- Density normalization: both source and implementation use the same 1292 × 768 content frame before the board applies its shared display scale
- State: default document view for the full-view comparison; thumbnails open, search result selected, page navigation, zoom, fit-page, and 90-degree rotation verified separately in the direct implementation preview

**Findings**

- No actionable P0, P1, or P2 differences remain in the viewer-shell scope. Pond now carries the source's icon-first control density and top-edge placement without copying Eagle's surrounding library rail or inspector.

**Required Fidelity Surfaces**

- Fonts and typography: Pond retains the product's system UI typography and optical hierarchy. The filename, file size, counters, and PDF content remain readable at the production viewport; toolbar labels are exposed accessibly instead of rendered as persistent text.
- Spacing and layout rhythm: controls are grouped in a single compact top bar, document space remains primary, and thumbnails occupy a dedicated narrow rail. The full-view comparison shows no clipped persistent controls at 1292 × 768.
- Colors and visual tokens: the implementation uses Pond's existing neutral surfaces, separators, focus/selected states, and shadows. It intentionally does not reproduce Eagle's purple accent or surrounding application chrome.
- Image quality and asset fidelity: PDF pages and thumbnails render from pdf.js canvases at device density. Toolbar controls use the existing Nucleo icon package; no reference assets or hand-drawn replacements ship in Pond.
- Copy and content: persistent toolbar text is limited to the filename, size, page count, zoom, and search count. Every icon-only action has an explicit accessible label.

**Full-view comparison evidence**

The combined board shows Eagle's document detail view and Pond's PDF pilot in one browser-rendered frame. Both place compact document actions along the top edge and keep the content canvas dominant. Pond deliberately omits Eagle's library navigation and metadata inspector because those belong to the surrounding Pond detail route, not the reusable file viewer.

**Focused region comparison evidence**

The toolbar was inspected at full implementation scale rather than only on the scaled board. It includes thumbnail, search, previous/next page, zoom out/in, fit width/page, rotate, open, and export controls. A focused browser interaction pass confirmed pressed, disabled, and count states. No additional crop was needed because the toolbar and document canvas were readable in the full-scale capture.

**Open Questions**

- None for the PDF pilot. Other file types can adopt the same shell incrementally without blocking this viewer.

**Implementation Checklist**

- [x] Reuse the shared viewer chrome for stored-file detail views.
- [x] Move common file actions into a compact icon-first top bar.
- [x] Add PDF thumbnails, text search, page navigation, zoom, fit, and rotation.
- [x] Preserve the control-free hover-preview mode.
- [x] Verify loading, search, navigation, zoom, fit, rotation, and lazy thumbnails in the browser-rendered fixture.
- [x] Check the QA console for errors at the local preview origin; none were present.

**Follow-up Polish**

- [P3] Consider responsive control overflow for unusually narrow detached preview windows when the shared viewer shell is expanded beyond the PDF pilot.

**Comparison History**

- Iteration 1: the source and implementation were captured together at matching 1292 × 768 content frames. No actionable P0, P1, or P2 visual issue was found, so no design-fix iteration was required.

**Primary Interactions Tested**

- Thumbnails: opened a three-page rail and rendered each thumbnail.
- Search: found `SECOND PAGE`, reported `1 / 1`, and navigated to page 2.
- Paging: next and previous actions updated the current page and disabled at the document boundary.
- Zoom and fit: zoom reached 110%, exited fit-width mode, and fit-page restored the fitting state.
- Rotation: the active page canvas changed from 964 × 1248 to 1616 × 1249 after a clockwise turn, confirming the rotation-aware fit calculation.

**Final Result**

final result: passed
