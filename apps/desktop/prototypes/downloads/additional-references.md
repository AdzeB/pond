# Additional download manager references

Researched on August 31, 2026. This is a visual reference study, not an app recommendation or a live usability audit. No applications were installed and no prototype layouts were changed.

## Leech: strongest compact native list reference

[Official product page](https://manytricks.com/leech/) · [Official help](https://manytricks.com/leech/help/index.html) · [Screenshot](https://manytricks.com/leech/help/z_images/overview/main.png)

**Visually inspected:** Yes, the official help screenshot. The help page is dated May 14, 2025; the screenshot is published documentation, not a capture of a running current build.

Observed: a white window with three compact two-line file rows, file icons on the left, subdued transfer statistics under filenames, and pause/cancel controls aligned on the right. Pale blue background fills communicate progress across each row. A small toolbar and bottom item count keep the queue dominant.

Pond inference: use this density and alignment as an alternative to large media cards. A faint progress wash could make activity visible without adding another column. Preserve textual statuses so color is not the only signal.

Local image: `/tmp/pond-downloads-additional-references/leech.png`.

## WarpFetch: strongest populated modern queue reference

[Official App Store listing](https://apps.apple.com/us/app/warpfetch/id6761764836?mt=12) · [Screenshot](https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/47/76/aa/4776aa66-19de-ce3b-e94f-3f0598bc90e5/01-fast-progress-2880x1800.png/1286x804bb-60.jpg)

**Visually inspected:** Yes, the developer-supplied App Store screenshot. No installed build was inspected. Its surrounding promotional text is not evidence of usability or performance.

Observed: a dark sidebar with status counts, a search toolbar, one active transfer, and two quieter completed rows. The active row places metadata and a thin progress bar directly below its filename, with a large pause target on the right. A narrow speed chart sits above the queue.

Pond inference: borrow the active/completed hierarchy and row anatomy. Omit the networking chart, connection segments, and most pills unless those details help people act. Pond needs source identity and recovery more than transfer engineering telemetry.

Local image: `/tmp/pond-downloads-additional-references/warpfetch.jpg`.

## Goel°: queue with an optional inspector

[Maintainer repository](https://github.com/vinitkumargoel/goel) · [Screenshot](https://raw.githubusercontent.com/vinitkumargoel/goel/main/Assets/screenshots/desktop.png)

**Visually inspected:** Yes. The maintainer explicitly labels screenshot downloads as illustrative mock data. This is a young reference, not an established-product endorsement.

Observed: a dark three-pane layout with status/type navigation, a dense queue table, and a selected-file inspector. Progress bars live under filenames; a large ring, transfer facts, and actions live in the inspector. Lavender selection and progress accents hold the interface together.

Pond inference: a compact list with an optional details pane is worth exploring. It can preserve scanning density while letting one save expose a detailed stage breakdown. Avoid copying the dense networking columns or the torrent-specific vocabulary.

Local image: `/tmp/pond-downloads-additional-references/goel.png`.

## Pulltube: media identity, less suitable visual styling

[Official product page](https://mymixapps.com/pulltube) · [Queue screenshot](https://static.tildacdn.net/tild6634-3230-4461-a466-313531623064/PtTips2.png) · [Progress screenshot](https://static.tildacdn.net/tild6236-3033-4937-a536-316539616239/PtTips1.png)

**Visually inspected:** Both official-site screenshots. The pictured content includes 2019 titles; the page does not date these screenshots, so their correspondence to the current release is unverified.

Observed: circular thumbnails make the queue strongly media-led. The progress view uses one enlarged circular thumbnail with a progress ring, batch position, and remaining-time text. Large type and blurred backgrounds dominate.

Pond inference: useful for a compact thumbnail progress ring or a restrained single-save activity card. I would not adopt the blurred imagery, oversized typography, or full-screen progress treatment; these reduce queue visibility.

Local images: `/tmp/pond-downloads-additional-references/pulltube-main.png` and `/tmp/pond-downloads-additional-references/pulltube-progress.png`.

## Selection

Prioritize **Leech** for quiet density, **WarpFetch** for a contemporary populated queue, and **Goel°** for list-plus-inspector structure. **Pulltube** supplies a media-focused alternative but is less suited to Pond's existing visual language.

Cork was checked but excluded from the core shortlist because it is a Homebrew package manager, not a downloads queue. Fetch and Neat Download Manager were found but not visually inspected or advanced as design recommendations. These findings complement the main reference study; they do not replace its decisions.
