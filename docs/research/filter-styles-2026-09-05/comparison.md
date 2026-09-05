# Eagle × Pond — filter styles
Captured 2026-09-05. Fresh live screenshots; no predicates submitted. Pond toolbar visibility restored after each hidden-filter capture.

## 1. Color × Color — Refine (P1)
Eagle places preset swatches directly below the color surface and keeps the hex input compact. Pond has a larger surface, a separate Hex section, tolerance, and two operator rows.

**Next:** Add the swatch palette. Put hex and tolerance into compact rows; collapse is/is not into a single control. Keep tolerance discoverable.

![Eagle Color](eagle-color.png)

![Pond Color](pond-color.png)

## 2. Visual Match × Visual Match — Close (P2)
Both show drag/paste guidance and Choose Image. Eagle gives the drop target a large illustrated area; Pond is a short text-only panel.

**Next:** Use a clearer drop target and image preview/state treatment if closer visual parity is the aim. Image submission and search quality were not tested.

![Eagle Visual Match](eagle-visual-match.png)

![Pond Visual Match](pond-visual-match.png)

## 3. Semantic × Semantic — Refine (P2)
Eagle uses a multiline textarea with an example. Pond uses a narrow single-line input beside Apply and repeats the instruction as a label.

**Next:** Give the query more room with a multiline field and a useful example. Keep an explicit submit action if needed for query cost or validation.

![Eagle Semantic](eagle-semantic.png)

![Pond Semantic](pond-semantic.png)

## 4. Tags × Tags — Close (P1)
Both already have search, a left group/selected rail, right-side checkboxes, and counts. Pond adds three full-width matching rows above search; Eagle puts rule icons beside search.

**Next:** Keep the two-column structure. Collapse matching into a named selector beside search; retain keyboard-accessible exclusion. Do not rebuild the browser.

![Eagle Tags](eagle-tags.png)

![Pond Tags](pond-tags.png)

## 5. Folder × Folders — Refine (P1)
Eagle has a search/rule header and a short list. Pond has the same search/count essentials but three matching rows first.

**Next:** Use the same compact matching header as Tags. Keep the explicit No Folder option and search. Descendant behavior was not tested.

![Eagle Folder](eagle-folder.png)

![Pond Folders](pond-folders.png)

## 6. Shape × Shape + Aspect — Partial (P2)
Eagle puts orientations, standard ratios, and Custom into one list. Pond splits orientations into Shape and ratios into Aspect.

**Next:** Remove the two always-visible operator rows. Decide whether to combine the two menus; add arbitrary ratio entry only with matching support.

![Eagle Shape](eagle-shape.png)

![Pond Shape + Aspect](pond-shape.png)

## 7. Rating × Rating — Refine (P2)
Eagle only exposes None in this library, so populated star behavior is unverified. Pond exposes Unrated, 1–5 Stars, four operators, and a range form.

**Next:** Lead with star choices. Reveal range controls only when needed; do not infer Eagle’s populated rating UI from this empty state.

![Eagle Rating](eagle-rating.png)

![Pond Rating](pond-rating.png)

## 8. Types × Type — Capability gap (P1)
Eagle lists exact extensions with search and counts. Pond lists media families including Image, Video, Audio, Document, Font, File, Website, and Text.

**Next:** Add exact format filtering alongside media families. This requires format-aware options and predicates; smaller styling alone does not provide parity.

![Eagle Types](eagle-types.png)

![Pond Type](pond-type.png)

## 9. Dimensions × Width / Height — Refine (P1)
Eagle puts W and H min/max fields in one small panel. Pond has separate Width and Height filters; the captured Width menu has four operator rows above one range.

**Next:** Combine W and H in a two-row editor with explicit pixel units. Preserve independent bounds in the query model. Width shown; Height is registered separately in source.

![Eagle Dimensions](eagle-dimensions.png)

![Pond Width / Height](pond-width.png)

## 10. Duration × Duration — Needs work (P1)
Eagle uses Min–Max–unit on one line. Pond shows four operators, four presets, three labeled inputs, and Apply at once.

**Next:** Make the range row primary. Put presets behind a compact secondary control and derive the operator from the entered bounds where possible. Keep validation.

![Eagle Duration](eagle-duration.png)

![Pond Duration](pond-duration.png)

## 11. Size × Size — Needs work (P1)
Eagle shows Min–Max with a KB selector. Pond has operators, MB presets, and unlabeled-unit min/max inputs. Its fileSize field stores bytes.

**Next:** Add a visible unit selector and conversion for custom bounds. Compress to the same range shell as Duration. Files is a separate file-count filter.

![Eagle Size](eagle-size.png)

![Pond Size](pond-size.png)

## 12. Comment × Comment — Refine (P2)
Eagle shows Yes/No plus a multiline keyword area. Pond adds is/is not, With/Without Comment, and a one-line Contains Text form with Apply.

**Next:** Use direct presence choices and one compact text entry. Avoid repeating negation through both operator rows and With/Without choices.

![Eagle Comment](eagle-comment.png)

![Pond Comment](pond-comment.png)

## 13. Note × Note — Refine (P2)
The same presence-plus-text pattern appears in both apps. Pond repeats the operator section above With Note / Without Note.

**Next:** Share the compact Comment/Note layout. Preserve readable labels and an explicit commit mechanism where needed.

![Eagle Note](eagle-note.png)

![Pond Note](pond-note.png)

## 14. URL × URL — Close (P2)
Pond already has With URL / Without URL and text matching without the extra operator rows. Eagle uses a multiline keyword field.

**Next:** Keep this simpler structure; increase text-entry room for longer URLs. Comma-separated keyword semantics in Eagle were not tested.

![Eagle URL](eagle-url.png)

![Pond URL](pond-url.png)

## 15. Date Imported × Date Saved — Refine (P1)
Eagle starts with Today, Yesterday, relative-day choices, counts, and Custom Range. Pond begins with three operators, then rolling relative presets and Custom Range.

**Next:** Lead with presets and collapse operators. Decide deliberately between calendar days and rolling periods: Today and Past 24 Hours are different.

![Eagle Date Imported](eagle-date-imported.png)

![Pond Date Saved](pond-date-saved.png)

## 16. Date Modified × Date Modified — Partial (P2)
Eagle also lists historic month buckets with counts. Pond offers rolling presets plus Custom Range and the repeated operator section.

**Next:** Reuse the compact date shell. Add month buckets if browsing old imports matters; keep them scrollable rather than making the panel unbounded. Custom calendars were not expanded in this run.

![Eagle Date Modified](eagle-date-modified.png)

![Pond Date Modified](pond-date-modified.png)

## 17. BPM × No dedicated filter — Missing (P3)
Eagle shows a simple min/max BPM editor. Pond’s current filter registry has no BPM field.

**Next:** Add tempo metadata and a numeric predicate before adding the UI. Reuse the compact range component once that support exists.

![Eagle BPM](eagle-bpm.png)

## 18. Font × No dedicated filter — Unverified (P3)
Font is present in Eagle’s accessibility tree but has no visible toolbar control in this capture. Pond has a Font media family, not a dedicated font-property filter.

**Next:** Verify Eagle’s font-specific state with suitable assets before specifying parity. Do not substitute the media Type menu for font properties.

## 19. Camera × No dedicated filter — Unverified (P3)
Camera is present in Eagle’s accessibility tree but not visible in this toolbar. Pond’s current filter registry has no camera filter.

**Next:** Inspect a camera-metadata context before defining fields or UI. No screenshot is presented as evidence of an unavailable menu.

## Limits
Font and Camera unavailable visually. Initial menu states only; no matching semantics, custom calendars, AI results or full accessibility testing. Screenshots show different app zoom/window sizes. Recommendations are design judgments.
