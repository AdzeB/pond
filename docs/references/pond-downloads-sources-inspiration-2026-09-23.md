# Downloads and Sources inspiration

Date: 23 September 2026.

[Visual board](downloads-sources-2026-09-23/index.html) · Eight references selected from a target of twenty.

## Brief and recommendation

Explore merging the Downloads and Sources pages. The current Downloads overview
already exposes source-level pauses and Sync batches; Sources lists Accounts and
Watches with sync status. This is a proposal, not an implemented domain change.

Use one Sources destination with All Downloads and a compact Account/Watch rail,
a central download table, and an inspector for the selected Source or Save.
Preserve manual downloads in All Downloads and distinguish Source, Account, and
Watch. Healthy idle Sources must remain manageable when no work is running.
Keep global, source, Sync, and Save actions visibly scoped; a pause must not look
like a cancellation. Show Harvest and transfer stages separately when there is
no reliable end-to-end total. Move internal diagnostics into details.

The rail uses space but keeps origin and recovery visible. At narrow widths,
collapse the inspector. The proposal combines reference 04's frame, 02's source
controls, 01's status summaries, 03's hierarchy, and 05's compact status list.
An alternative card directory (06) suits Add Source better than daily monitoring.

## Evidence

Cosmos searches covered downloads UI, download manager, sync UI, sync status,
connected accounts, integrations, and integrations UI. Eight distinct useful
images were retained; other results were generic, repeated, or unreliable to load.
Each selected design was opened and visually inspected. Inspection is of static
images, not verified production interfaces or interaction behavior. Titles are
descriptive labels except the visible caption title on 02. Creator and original
publication dates are unknown unless explicitly stated. No visible original-source
link was supplied for these selected elements. Uploader credit does not establish
authorship. Reuse terms are unknown; this is inspiration only, with no product code
or assets copied. The local board embeds the observed externally hosted previews.

## References and application

### 01 — Sync status cards

[*Sync status cards* (n.d.)](../provenance/generated/REFERENCES.md#cosmos-sync-status-cards). Creator: Unknown. Uploader: Unknown.

Observed: In-progress, completed, and delayed cards share a title, timing line, and aligned activity counts.

Apply: Give each Source a compact status summary. Separate Saves found from files downloaded; show totals only when known.

### 02 — Integrations — Settings

[Kara (n.d.)](../provenance/generated/REFERENCES.md#cosmos-integrations-settings-kara). Creator: Oğuz Yağız Kara (credited in Cosmos caption). Uploader: Praveen Juge.

Observed: A narrow list pairs a service logo and description with a right-aligned Connect or Disconnect action.

Apply: Keep Account and Watch management close to source identity, with reconnect and sync controls in the inspector.

### 03 — Hierarchical task rows

[*Hierarchical task rows* (n.d.)](../provenance/generated/REFERENCES.md#cosmos-hierarchical-task-rows). Creator: Unknown. Uploader: Unknown.

Observed: Indented child rows and fine connector lines show parent–child relationships; each row retains its own status glyph.

Apply: Let a Sync expand into its Saves, then expose file details only when selected. Do not confuse a Source pause with cancelling one Save.

### 04 — File workspace with an Info pane

[*File workspace with an Info pane* (n.d.)](../provenance/generated/REFERENCES.md#cosmos-file-workspace-info-pane). Creator: Unknown. Uploader: Unknown.

Observed: A left navigation column, central file area, and narrow Info pane share one frame; a blue selection identifies the current folder.

Apply: Use a Source rail, central download table, and contextual inspector. Preserve selection while details change.

### 05 — Compact transfer list

[*Compact transfer list* (n.d.)](../provenance/generated/REFERENCES.md#cosmos-compact-transfer-list). Creator: Unknown. Uploader: Unknown.

Observed: Three filename rows use subdued secondary text and small trailing actions, followed by an overall completion line and View All.

Apply: Use this density for the toolbar Status feed and let View All open the same shared workspace.

### 06 — Integration directory with enable controls

[*Integration directory with enable controls* (n.d.)](../provenance/generated/REFERENCES.md#cosmos-integration-directory-controls). Creator: Unknown. Uploader: Unknown.

Observed: A grid of integration cards combines logos, descriptions, category filters, and enabled-state switches.

Apply: Reserve a directory grid for adding a Source. Prefer compact rows for monitoring existing Sources so downloads retain space.

### 07 — Time in status

[*Time in status* (n.d.)](../provenance/generated/REFERENCES.md#cosmos-time-in-status). Creator: Unknown. Uploader: Unknown.

Observed: Status names and colored glyphs align with right-hand durations in a compact panel.

Apply: Explain waiting and paused downloads with elapsed time or the next retry time, while keeping technical diagnostics in details.

### 08 — Download preparation states

[*Download preparation states* (n.d.)](../provenance/generated/REFERENCES.md#cosmos-download-preparation-states). Creator: Unknown. Uploader: Aryana Shakibaei ✦.

Observed: The same download card is shown rendering, successfully rendered, and ready, with the status strip above format choices.

Apply: Keep stable row geometry across Harvest, file transfer, and completion. Name the current stage rather than inventing one combined percentage.

## Download-specific follow-up

[Supplemental visual board](downloads-specific-supplement-2026-09-23/index.html).

A stricter follow-up search retained one additional reference. Other inspected
results were upload forms, generic file browsers, repeated cards, or abstract
progress indicators rather than download interfaces.

### 09 — Download history table

[*Download history table* (n.d.)](../provenance/generated/REFERENCES.md#cosmos-download-history-table).
Creator and uploader unknown.

Observed: Each row aligns the request date, download type, initiating user,
generation status, and final file link. Generated, generating, and failed states
remain in one durable history.

Apply: Give Pond's Downloads table separate Stage and Result columns. Stage names
Harvesting, Fetching files, Ready, or Failed; Result becomes Open or Reveal in
Finder only when the file exists. Source selection can filter this history without
turning the merged workspace into a Source-only dashboard.
