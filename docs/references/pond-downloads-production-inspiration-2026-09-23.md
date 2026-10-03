# Production download interface inspiration

Date: 23 September 2026.

[Visual board](downloads-production-supplement-2026-09-23/index.html) · Five
additional references.

## Recommendation

The merged Sources destination should open on the download queue and durable
history. Source, Account, and Watch belong around that list as filters and
management context. Active and waiting work should precede date-grouped history;
the inspector should carry transfer metadata and diagnostics; batch actions should
appear only after selection. Removing an entry from history must remain distinct
from deleting its file.

This supplements the [main research note](pond-downloads-sources-inspiration-2026-09-23.md).

## Evidence and application

### 10 — Free Download Manager desktop queue

[Free Download Manager (n.d.)](../provenance/generated/REFERENCES.md#free-download-manager-screenshots).

Observed: The list remains primary while state and type filters stay nearby. A
selected transfer exposes source, destination, size, and activity without
expanding every row.

Apply: Keep name, source, stage, progress, and result in Pond's table. Move URL,
local path, timestamps, and diagnostics into the inspector.

### 11 — Motrix state-led navigation

[Motrix (n.d.)](../provenance/generated/REFERENCES.md#motrix-features).

Observed: Task states form the navigation model, while progress, speed, remaining
time, and row actions stay together.

Apply: Put All, Active, Waiting, Failed, and Complete above Source filters in the
rail. State should be the first way users narrow the table.

### 12 — Chrome durable history

[*Como limpar “apagar”, histórico de downloads?* (2024)](../provenance/generated/REFERENCES.md#google-chrome-download-history-community).

Observed: Search and date groups make a long history navigable. Each completed
item keeps its filename, origin, reveal action, and a separate history-removal
control.

Apply: Group older Pond downloads by day after active items. Keep Remove from
history distinct from Delete file, and make Reveal in Finder the completed row's
main action.

### 13 — Downloader Desktop batch operations

[bezzad (n.d.)](../provenance/generated/REFERENCES.md#github-com-bezzad-downloader-desktop).

Observed: Checkbox selection and a shared toolbar support batch start, pause,
stop, and remove. Failure reasons and per-connection progress move into details.

Apply: Use selection-driven actions in Pond's Downloads table. Scope actions to
eligible rows and report mixed results for batches containing incompatible states.

### 14 — Aloha Browser compact history

[Aloha Mobile (n.d.)](../provenance/generated/REFERENCES.md#aloha-browser-access-downloads).

Observed: A compact screen retains search, one global cleanup action, a date
heading, and the file list.

Apply: Collapse the Source rail and inspector at narrow widths before removing
search, status, filenames, or completed-file actions.

## Limits

The FDM, Motrix, Downloader Desktop, and Aloha images are published by their
respective projects. The Chrome image is user supplied on Google's official Help
Community. Static images and published descriptions do not verify every current
interaction. No product code or assets were copied.
