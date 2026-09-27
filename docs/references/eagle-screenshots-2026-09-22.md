# Eagle screenshot workflow research

Research date: September 22, 2026. Scope: Eagle desktop capture behavior and its
separation from browser-extension capture. This is a behavior reference for Pond,
not a claim of complete parity or a completed implementation.

## Evidence and limits

Eagle's official support articles were read in a rendered browser. The search
reader returned titles and site navigation without article bodies; those empty
responses were not treated as behavioral evidence. The support pages do not state
an applicable release or publication date. Some instructions conflict, as recorded
below. No Eagle capture was completed as part of this document's research.

## Desktop interaction

The documented entry point is Eagle's tray/menu-bar icon. It offers three direct
commands: area, window, and full screen. Area capture also has the documented
shortcut **Command–Option–E on macOS / Control–Alt–E on Windows**. The guide says
to select an area or a window; it does not document a preliminary screen-thumbnail
picker. These are desktop capture commands, separate from web collection.
([Eagle, n.d.-p](../provenance/generated/REFERENCES.md#en-eagle-cool-support-article-capturing-screenshots);
[capture guide](https://en.eagle.cool/support/article/capturing-screenshots))

Screenshot shortcuts are enabled by default according to their dedicated guide.
Preferences → Screenshots lets the user enable/disable them and assign individual
combinations for selected area, selected window, and full screen.
([Eagle, n.d.-v](../provenance/generated/REFERENCES.md#en-eagle-cool-support-article-customize-eagle-screenshot-shortcut);
[shortcut preferences](https://en.eagle.cool/support/article/customize-eagle-screenshot-shortcut))

After capture, an optional categorization window lets users organize and save the
image immediately. Its setting is **Ask where to save when saving a screenshot**
under screenshot options. The article does not establish its default state or the
exact fields in that window.
([Eagle, n.d.-ah](../provenance/generated/REFERENCES.md#en-eagle-cool-support-article-enable-ask-where-to-save-when-saving-a-screenshot);
[save-location preference](https://en.eagle.cool/support/article/enable-ask-where-to-save-when-saving-a-screenshot))

## Related preferences

| Option | Verified behavior | Source |
| --- | --- | --- |
| Format and quality | PNG is documented as the default; JPG and WebP are available. Quality options are high, medium, and low. | [Eagle (n.d.-d)](../provenance/generated/REFERENCES.md#en-eagle-cool-support-article-adjust-default-screenshot-format-and-quality), [format guide](https://en.eagle.cool/support/article/adjust-default-screenshot-format-and-quality) |
| Clipboard | Optional automatic clipboard copy after capture, for pasting into another application. See the platform conflict below. | [Eagle (n.d.-ag)](../provenance/generated/REFERENCES.md#en-eagle-cool-support-article-enable-also-copy-the-screenshot-to-clipboard), [clipboard guide](https://en.eagle.cool/support/article/enable-also-copy-the-screenshot-to-clipboard) |
| Screenshot tag | Automatically adding a Screenshot tag is documented as enabled by default and can be disabled. | [Eagle (n.d.-bm)](../provenance/generated/REFERENCES.md#eagle-disable-screenshot-tags) |
| Completion notification | Optional feedback confirms successful import into Eagle. The article body places it under Preferences → Notification → Pop-up. Its title says disable while the body describes enabling. | [Eagle (n.d.-bn)](../provenance/generated/REFERENCES.md#eagle-disable-screenshot-notification) |
| Retina resolution | A Take @2x screenshots option exists for Retina displays. The article says enable in prose but uncheck in its steps, so its toggle direction is not established here. | [Eagle (n.d.-bo)](../provenance/generated/REFERENCES.md#eagle-retina-screenshots) |

## Platform and documentation conflicts

- The capture guide describes drawing/writing annotations during area and window
  capture, then limits screenshot annotation to Windows. It also labels clipboard
  copying Windows-only. The dedicated clipboard guide instead describes both
  Command-V and Control-V. Do not infer that current macOS lacks clipboard support
  from the capture guide alone. Annotation support on current macOS remains
  unverified. ([Capture guide](https://en.eagle.cool/support/article/capturing-screenshots),
  [clipboard guide](https://en.eagle.cool/support/article/enable-also-copy-the-screenshot-to-clipboard))
- The general keyboard table lists macOS screenshot as Command-Shift-A and window
  screenshot as Command-Shift-Option-A; Windows lists Control-Shift-A and says
  window screenshot is unsupported. This conflicts with the capture guide's
  documented shortcut and Windows window command. These may describe different
  scopes or versions; the pages do not resolve that distinction. Use the actual
  installed preference values when reproducing behavior.
  ([Eagle (n.d.-bp)](../provenance/generated/REFERENCES.md#eagle-keyboard-shortcuts),
  [capture guide](https://en.eagle.cool/support/article/capturing-screenshots))
- Repeat-last-region, pinning screenshots, exact selection-resize mechanics,
  confirmation/cancellation gestures, and current multi-monitor behavior were not
  established by these sources. Their absence from these pages does not establish
  their absence from Eagle.

## Browser extension is a different surface

Eagle advertises **Capture Area**, **Capture Element**, and **Full Page Capture**
for its browser extension. These are web-content operations; full-page capture
must not be mistaken for the desktop full-screen command. The extension requires
the Eagle app. ([Eagle (n.d.-bl)](../provenance/generated/REFERENCES.md#eagle-browser-extension))

## Suggested Pond adaptation

The supported interaction to borrow is: invoke a direct capture command, select
the target, then save into the library with optional categorization. Make area,
window, and full-screen commands discoverable together and expose their shortcut
bindings. Keep post-capture organization optional and make library import success
visible. This is a proposed Pond design based on the sources above, not a claim
that every Eagle release uses the same overlay or confirmation UI.

## Installed source inspection

The user requested the same extraction approach used for the color picker.
Ten files were extracted directly from the installed archive into the ignored
`apps/desktop/.tmp/eagle-screenshots/eagle/` directory. The adjacent
`provenance.json` records per-file SHA-256 hashes. The archive hash is
`b04a2efdb8bc8d06910552f43f38c056e6964c8f74798e1b2849f1bffab8a1bd`;
its manifest identifies version 4.0.0, buildVersion 20260401, buildNumber 23
([Eagle, 2026](../provenance/generated/REFERENCES.md#eagle-4-20260401)). Files matched the earlier
interaction-audit extraction byte for byte. This inspected build is a narrower
baseline than Eagle's unversioned website.

| Behavior | Evidence in the extracted archive |
| --- | --- |
| Mac area selection uses the operating system | `app/js/lib/api/screen-capture.js:180`: mode 1 invokes `screencapture -x -i -o -t png` with a temporary file. |
| Mac window selection uses the operating system | The same method invokes `screencapture -x -w -o -t png` for the other selective mode. There is no custom Electron selection overlay in this path. |
| Full-screen capture follows a separate path | `screen-capture.js:116`: Electron desktop-capture sources are requested through IPC and a thumbnail is written as PNG. Source selection has several fallbacks, so correct multi-display behavior needs testing. |
| Processing happens after capture | `screen-capture.js:45`: optional Retina resizing and JPEG/WebP conversion, timestamp-based name, optional Screenshot tag, clipboard copy, and an import record. |
| Organization is optional | `app/js/background.js:429`: opens the Collect window when the preference is enabled and mode is not full screen; otherwise queues the item for import. Full-screen capture bypasses this prompt in this build. |
| Defaults differ from personal settings | `app/js/default-preferences.js`: PNG, quality 90, Retina and automatic Screenshot tagging enabled; clipboard copy and capture categorization disabled. Area shortcut is CmdOrCtrl+Alt+E; window/full-screen shortcuts are initially blank. |

The installed Mac Screenshot preferences visibly expose clipboard copying,
Retina, notifications, format, tagging, and optional categorization. This supports
the readable implementation over the website's older Windows-only clipboard
note. No preference changes were saved. A shortcut inspection was cancelled;
the full capture/import lifecycle was not exercised.

Cancellation is represented by a command failure or missing output file in the
Mac helper. The caller does not clearly guard an absent capture result before
opening Collect or reading item fields. Pond should model cancellation explicitly
as a successful exit without an import or error notification. Likewise, the
capture-in-progress flag is only set in the Windows helper: this is a behavior
to improve, not reproduce.

The Collect template exposes preview/dimensions, rating, title, textual notes,
tags, and folder selection (`app/collect-window/index.html:12`). These notes are
not a drawing toolbar. Its controller applies destination metadata, saves, and
closes (`app/collect-window/js/controllers/collect.js:211`). The Windows wrapper
instead calls an external `NiuniuCapture.exe`; its internal selection and drawing
UI is not established here. Main-process `.jsc` bytecode also limits visibility
into shortcut registration, IPC handlers, and capture-window focus behavior.

## Concrete Pond direction

Pond currently opens a screen/window thumbnail dialog with title, tags, format,
quality, clipboard, and preview crop controls before capture
(`apps/desktop/src/renderer/src/features/library/components/new-menu/screenshot-dialog/index.tsx`).
Its global-shortcut registry currently contains Show Pond only
(`apps/desktop/src/shared/global-shortcuts.ts`). The screenshot binding is an
in-app command, so a global capture action requires explicit registration.

For macOS, use the same native area/window capture mechanism with Pond-owned
process handling and import logic. Offer Area, Window, and Full Screen together
in the menu bar, with configurable global shortcuts and visible conflict errors.
Store format/quality/clipboard defaults in preferences. Save directly into Pond,
with an optional folder/tag step after capture. Keep watched-folder intake as a
separate feature for screenshots saved by other apps.

Implementation should handle permission failures, cancellation, temporary-file
cleanup, overlapping requests, locked libraries, and Retina/multiple displays.
Use argument-array process invocation instead of Eagle's shell-string execution.
This is a proposed adaptation; no Pond capture code was changed during research.

This research uses Eagle's behavior as inspiration. At the user's request, the
reference files below were extracted locally for inspection. No Eagle code or
assets were added to Pond's shipped implementation. Terms permitting redistribution
of those materials were not established.
