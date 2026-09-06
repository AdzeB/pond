# Pond × Linear

An isolated, interactive component comparison. Linear is reconstructed from the actual app’s extracted styles; Pond renders its unchanged `@pond/ui` components. The command menu audit is the exception: it uses matched live screenshots so the full surfaces can be compared without rebuilding Linear’s application behavior.

## Run

From the repository root:

```sh
node apps/desktop/prototypes/linear-comparison/extract-sources.mjs
./apps/desktop/node_modules/.bin/vite --config apps/desktop/prototypes/linear-comparison/vite.config.ts
```

Open <http://127.0.0.1:4321/?component=Menu>.

The command menu audit is available at
<http://127.0.0.1:4321/?page=command-menu>. It compares the current Linear and
Pond surfaces, measured geometry, typography, content structure, and the
highest-impact differences. It also includes a 12-state context study captured
after populating Linear's Playground team with a contained benchmark dataset.

The live Pond × Eagle filter audit is available at
<http://127.0.0.1:4321/?page=filters>. It contains eleven matched filter
captures, seven Pond-only filters, per-filter findings, and implementation
recommendations. The audit source images live in
`public/evidence/filter-audit/`.

## What is extracted

The native-app pass collected **77 component and child-element samples**, using Linear’s Inspect Element console. The earlier 14 app samples remain as additional evidence. Overlapping IDs prefer the newer native measurements; there are 83 distinct references in the merged ledger.

The prototype renders **23 Linear comparisons** beside all **46 Pond component families**. Direct and related matches are described under **Inspect styles** and in **Extraction**. Missing counterparts remain explicitly unextracted; they are not replaced with marketing-page components.

Available Linear examples: Button, Input, Select, Combobox, Checkbox, Switch, Toggle, Sidebar, Tab, Toolbar, TitleBar, Menu, ContextMenu, Popover, Tooltip, Dialog, Table, DataTable, Settings, Empty, Keyboard, Chip, and PromptInput.

Button now exposes seven captured action contexts with matching-height Pond examples and a per-pair inspector. Both sides use the source icons to isolate control styling; the full Pond variant inventory remains expandable. See [the extraction-method follow-up](extraction-method.md) for the capture omissions, corrected menu-highlight anatomy, Figma capture options, and remaining live-inspection limits. “Export Pond anatomy” captures the local component tree without text or URLs.

Some names represent related patterns, not identical components:

- Settings uses the native **Display options** preference rows, not account settings.
- Table and DataTable use native issue-list row styles with neutral, simplified columns.
- Chip uses the composer’s label-picker trigger, not a selected label badge.
- Empty shows the measured Inbox label, not its unextracted illustration.
- Dialog uses the blank issue composer’s surface; its content differs from Pond’s edit dialog.

## Source files

- `public/evidence/linear-command-menu-current.json`: current light-theme command menu extraction with 203 scoped nodes, all resolved CSS properties, pseudo-elements, bounds, SVG attributes, and 148 matching authored rules. URLs and input values are excluded.
- `public/evidence/linear-command-menu-current.png`: accepted full-window default-state capture.
- `public/evidence/linear-command-menu-search-current.png`: accepted filtered-state capture for the query `settings`.
- `public/evidence/pond-command-menu-current.png`: accepted current Pond preview capture.
- `public/evidence/pond-command-menu-search-current.png`: accepted Pond filtered-state capture for the same query.
- `public/evidence/context-audit/`: twelve current workspace, project, issue, document, mixed-result, and empty-result captures plus the seeded-record inventory and content findings.
- `public/evidence/linear-native-styles.json`: 77 measured native elements, immediate child styles, generic source icon paths, and switch pseudo-element states.
- `public/evidence/linear-authored-rules.json`: 270 matched authored rules across seven controls, with their referenced CSS variables. Includes hover, active, and pseudo-element declarations. These are available for inspection; not every authored state is reproduced in the local controls.
- `public/evidence/linear-app-styles.json`: earlier component-scoped app measurements. Their computed-style list is partial; the selected metrics are retained.
- `public/evidence/linear-inter-variable.woff2`: Linear’s original Inter 4.1 variable font, downloaded from its public asset host after matching the native `@font-face` rule.
- `public/evidence/linear-font-source.json`: font source and verification.
- `public/evidence/pond-sources.json`: 107 authored UI, theme, and theme-application files. Refresh with `extract-sources.mjs`.
- `public/evidence/pond-computed-dark.json`: previous default Pond specimen measurements; the current inspector measures live elements instead.

Older public-demo evidence remains archived on disk but is not imported or displayed by the comparison.

## Reconstruction boundaries

Measured typography, colors, borders, shadows, radii, heights, and padding are applied directly by `linear-source.ts`. Widths adapt where the example requires a bounded preview. Positioning wrappers, neutral content, missing states, and interactions are local implementations, generally using unstyled Base UI primitives. This is not embedded Linear application code or a full extraction of its component library.

Linear’s captured palette is light mode. Pond defaults to light for comparison; its independent dark-mode toggle deliberately leaves Linear’s evidence unchanged and displays a mismatch notice.

Both inspectors follow their own open overlays. The table shows original Linear measurements, the current Linear reconstruction, and the current Pond element. Different content or states can produce different dimensions; these are not automatically styling defects. Equivalent CSS color notations can also differ as strings.

The source font and generic icons are local. The original style extraction excludes private issue titles, messages, account values, workspace URLs, and user images. The separate context study intentionally contains full-window screenshots of a user-approved, isolated benchmark dataset created in the Playground team. It created two projects, ten issues, one document, and one team label; one project was marked canceled because Linear does not expose manual project archiving. No chat message or preference was submitted or changed. The user explicitly approved both reading the native window and creating the benchmark records. Auto-review separately blocked opening private Settings; that action was not retried indirectly.

## Verification

```sh
./node_modules/.bin/tsc --noEmit -p apps/desktop/prototypes/linear-comparison/tsconfig.json
./node_modules/.bin/biome check apps/desktop/prototypes/linear-comparison
./apps/desktop/node_modules/.bin/vite build --config apps/desktop/prototypes/linear-comparison/vite.config.ts
```

The bundle includes the whole UI library and source ledger, so it is intentionally larger than a production screen. The comparison itself does not override Pond’s component styles. Production buttons and select triggers use rounded corners. Other production updates include menu highlight geometry, a 36 px combobox search field, tighter tooltip padding and 22 × 14 px switches. Colors, variants and component behavior remain Pond’s own. These are measured styling updates, not a claim of complete Linear fidelity.
