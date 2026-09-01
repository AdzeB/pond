# Downloads design references

Reviewed August 31, 2026 after the first three prototype explorations. Mobbin's `search_screens` tool was not available in this session. These references come from official product sites, not Mobbin. No prototype layouts were changed during this research pass.

## Transmit 5

[Official screenshots](https://panic.com/transmit/) and [activity list documentation](https://help.panic.com/transmit/transmit5/getting-started/).

The inspected light-mode screenshot shows one compact activity popover. A parent transfer has a title, horizontal progress bar, transferred size, remaining time, and rate. Four child files sit beneath it with individual progress rings. A completed deletion occupies a quieter row beneath that batch.

For Pond: a compact top-level save or import summary with expandable file details can express both batch progress and individual failures. The activity popover is a useful density reference, even if Pond keeps a full Downloads page. Do not copy Transmit's older macOS chrome or imply that its pending-only Pause behavior is Pond's behavior.

Inspected image: `/tmp/pond-downloads-references/transmit-activity.png`.

## Downie

[Official screenshots](https://software.charliemonroe.net/downie/) and [download options documentation](https://software.charliemonroe.net/help/downie/?article=options).

The official screenshot crops show repeated self-contained downloads: title and source/format above progress, with per-download controls and transfer status below. Other crops show a compact menu-bar version and a separate History window. These are visibly older screenshot assets; use them as structural references rather than a verified rendering of the latest release.

For Pond: keep a save's title, status, and progress close together. Give active work more row height, and keep completed history secondary. Preserve Pond's plain backgrounds rather than adopting Downie's large image-backed rows.

Inspected images: `/tmp/pond-downloads-references/downie-downloads.jpg` and `/tmp/pond-downloads-references/downie-history.jpg`.

## Steam

[Valve's September 9, 2021 release notes](https://steamcommunity.com/news/post/4020014731797126300).

This is a historical documentation reference, not a live client audit. Valve explicitly describes accounting for the full update process, including disk allocation, because transfer-only progress could make an unfinished update appear complete. It also documents retaining partial progress for waiting downloads and drag-to-reorder.

For Pond: distinguish transfer progress from the entire save process. Use Downloading, Processing, and Saved states; use a percentage only when it measures a known quantity. Reordering would require pipeline support and should not appear as a working production capability based on these references alone.

## Fourth exploration: Transfers

Combine A's list structure with C's status clarity in a compact native transfer list:

- Put status and progress directly beneath the save title rather than in a distant column
- Use small thumbnails, expanding active rows only when they have useful progress detail
- Keep failed saves inline with a reason and Retry action; use a compact attention summary to locate them
- Put history in a secondary view or collapsed section
- Explore expandable batches for large imports rather than a permanent second source sidebar

This is a design inference from the references, not a claim that those products implement this exact combination. Implemented as `?variant=D`, with A, B, and C retained for comparison. The new direction uses stage labels and indeterminate activity, explicit sample import membership, warning counts on collapsed imports, an attention filter that expands affected imports, and separate completed history.

## Second reference search

Reviewed August 31, 2026. This pass adds visual references; it does not change the prototypes. All observations below come from published first-party screenshots, not installed or live-tested apps. Further native references, including Leech and WarpFetch, are in [additional references](additional-references.md).

### Pulli: a distinctive individual transfer

[Official site](https://pulli.app/) · [Inspected download card](https://pulli.app/images/hero/fetch-card.png).

The white rounded card uses a narrow vertical control strip on the left: a large Pause button, a small blue pixel activity display, and a percentage. The title occupies the top of the main area; remaining time and speed sit below, with size and file-type pills on the right. This is a single marketing card, not evidence of how a long queue behaves. Its sample percentage and size are not numerically consistent; use the layout as inspiration, not the example telemetry.

For Pond: explore a small activity/control rail beside each save, with one clear stage label. Keep the row much smaller and retain Pond thumbnails. Pixel activity could add personality without a hero image. Do not display a percent without measured progress.

### Leech: progress integrated into the row

[Official site](https://manytricks.com/leech/) · [Inspected queue](https://manytricks.com/leech/help/z_images/overview/main.png).

Three file rows have a large title, a lighter metadata line, and Pause/Cancel controls on the right. Pale blue fill extends across part of each row to communicate progress. No content sidebar or separate progress panel. This is an older-looking native visual language, but the hierarchy is unusually economical.

For Pond: keep D's small thumbnails and inline recovery, explore a subtle background activity treatment, and remove some of the repeated headers and rules. Determinate row fill would require a trustworthy denominator; otherwise use restrained indeterminate motion.

### Motrix: light framing and minimal chrome

[Official site](https://motrix.app/) · [Inspected current Downloads screenshot](https://motrix.app/screenshots/motrix-downloads-en-light.webp).

The published screenshot has a softly tinted sidebar, a white inset content surface, an All Downloads heading with dropdown/count, a single search icon, and low-priority totals at the bottom. Its download queue is empty; this source does not show populated row design. Useful for overall framing, not transfer behavior.

For Pond: reduce the toolbar to essential controls and let blank space remain blank. Preserve Pond's branding rather than copying the multicolor decoration.

### Varia: self-contained compact download cards

[Official site](https://giantpinkrobots.github.io/varia/) · [Inspected populated queue](https://raw.githubusercontent.com/giantpinkrobots/varia/main/screenshots/Screenshot-Varia-1.png).

Six compact rounded rows keep title, metadata, progress bar, and controls together. Blue bars mark unfinished downloads; the completed example has a green bar. A sidebar separates All, In Progress, Completed, Seeding, and Failed. The screenshot includes multi-part media progress.

For Pond: a useful middle ground between A's flat list and C's large featured card. Borrow the grouping within each row, while reducing button size, shadows, and persistent completed progress bars.

### AB Download Manager: useful density, weaker fit for Pond

[Official site](https://abdownloadmanager.com/?lang=en-US) · [Inspected main window](https://abdownloadmanager.com/assets/app-home_dark-CLFqWuQf.png).

The dark table displays filename, size, status, speed, remaining time, and date. Purple and yellow miniature progress bars sit directly under Downloading and Paused labels. File types and finished/unfinished categories occupy the sidebar.

For Pond: the inline status/bar relationship is worth retaining, but the number of permanent columns and controls would add complexity to the current page.

### Shortlist for a future exploration

Leech's compact row structure plus Pulli's small activity rail is the strongest new design hypothesis. WarpFetch adds a useful reference for making an active row taller than completed rows. Motrix is a framing reference. These are design judgments, not claims of tested usability. Stacher's inspected official images showed an empty main window and settings rather than a populated queue, so it was not shortlisted for row design.
