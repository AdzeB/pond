# Capturing a component accurately

The earlier extraction measured outer elements and some immediate children. It did not preserve enough of the component anatomy or state. Those captures are evidence of individual properties, not proof that the reconstructed component matches Linear.

## Source-backed workflow

1. Select the actual component in Elements, including the visible surface and internal layout. DevTools exposes the selected element as `$0`. Keep captures scoped to a component, never the workspace document. [Chrome console utilities](https://developer.chrome.com/docs/devtools/console/utilities)
2. Capture resolved styles recursively, plus bounds and relevant ancestor surfaces. `getComputedStyle` includes styles resolved through the cascade and inheritance, but returns only the current state. Copy values immediately because the returned object is live. Capture `::before` and `::after` separately. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle)
3. Inspect authored rules as well as computed values. Computed dimensions may reflect the current layout rather than a reusable token. In Styles, follow inherited rules and referenced custom properties. [Chrome CSS reference](https://developer.chrome.com/docs/devtools/css/reference?hl=en)
4. Capture default, hover, focus-visible, pressed, selected and disabled examples separately. Use DevTools’ Force element state where appropriate. CSS states do not reproduce application-controlled selected/open states; open those using the real UI. Use Emulate a focused page for overlays that disappear when DevTools takes focus. Restore forced states afterward. [Chrome CSS reference](https://developer.chrome.com/docs/devtools/css/reference?hl=en)
5. Include SVG geometry beyond paths: rectangles, circles, groups, transforms, fill and stroke matter. Keep fonts and asset provenance. External references need separate review; do not copy private image URLs or user images.
6. Validate a component crop beside its reconstruction at the same viewport, zoom, theme, content and state. Measure children and pseudo-elements, not only the outer box. Compare Pond separately; a faithful Linear reconstruction and a Pond style change are different tasks.

DevTools Protocol also exposes computed and matched styles, inherited rules and pseudo-elements through the CSS domain. It is useful when an approved automation surface exposes it; it is not a reason to bypass the browser tools or access restrictions. [CSS protocol](https://chromedevtools.github.io/devtools-protocol/tot/CSS/)

## Applied to this prototype

- Button now includes seven existing native-app captures instead of only the create icon. Each is paired with the same height, label and source icon on Pond’s unchanged Button component. The inspector can select each pair.
- Native buttons captured here have pill radii at 24/28 px. Pond previously used 6/8 px radii at those sizes, with 8/10/12 px at larger sizes. Following the user’s request to match the button shape, the production Button now uses the full-radius token across all five sizes. Colors, heights, padding and variants remain unchanged.
- Menu highlights were missing their separate, rounded layer. The captured priority row’s child has 6 px horizontal insets and 8 px corners; the reconstruction now retains that layer instead of painting the full row.
- Comparison scope is visible above every pair, and available examples are marked partial reconstructions. Related controls must not be described as exact equivalents.
- `capture-component.ts` implements a bounded, read-only tree capture for future inspections. “Export Pond anatomy” exercises it on the current local example. It includes resolved styles, pseudo-elements, SVG geometry, current states and ancestor surfaces. It deliberately excludes private text/values/URLs, arbitrary attributes, custom-property payloads and URL-based paint. Its exclusions and truncation are explicit. It does not extract authored rules or shadow-root contents.

## Remaining limits

After the user requested the same approach for other components, the first production pass updated Select and Combobox triggers to pill radii, shared menu rows to 14/18 px content padding with 6 px highlight insets and 8 px corners, combobox search to a 36 px flat field, tooltip content to 5/8 px padding, and switches to 22 × 14 px tracks with 10 px thumbs and 8 px travel. The switch retains an expanded pointer target. These changes intentionally preserve Pond’s colors and interaction logic; other families and unverified states remain separate work.

The native Linear connection produced repeated ScreenCaptureKit errors during this follow-up. The new tree extractor was validated locally, not against a fresh Linear capture. The seven button samples come from the earlier native inspection. Do not describe this pass as a completed fresh extraction or claim all interaction states match.

The earlier source icon capture only retained paths. Some icons with rectangles or other SVG primitives are incomplete. Other unresolved differences include themed ancestors, some child layout, missing states, and related controls being used where an exact counterpart has not been found. The new capture format is intended to prevent repeating these omissions; it does not retroactively fill them in.

## Figma capture route

Figma’s official Chrome extension can capture an individual webpage element and convert it to editable design layers. Its documentation lists corner radius, padding, gap, opacity and typography among supported variable-binding properties. Captures remain plain layers rather than original library components; virtualized lists and complex rendering can be imperfect. For this task, capture neutral individual controls from Linear’s web app and Pond at the same scale, then verify them against component screenshots. The extension does not run inside the native Linear app. Installation and uploading workspace content are separate actions; neither was performed in this pass. [Figma extension](https://help.figma.com/hc/en-us/articles/9067379354135-Figma-Chrome-extension) · [Code to canvas capabilities and limits](https://help.figma.com/hc/en-us/articles/40826832449303-Turn-coded-screens-into-editable-design-layers)

An alternative, html.to.design, documents local `.h2d` captures for authenticated pages and optional hover-state imports. Its vendor states that local file capture avoids uploading the capture to its servers; importing it into a Figma file is still a separate data-sharing step. [Private capture](https://html.to.design/docs/import-private-page/) · [Hover import](https://html.to.design/blog/new-feature-import-hover-effects)
