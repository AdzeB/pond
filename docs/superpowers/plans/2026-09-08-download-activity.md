# Download activity implementation plan

**Goal:** Implement the approved Downloads list and existing right-panel inspector with real worker activity, grouped waiting work, and completed history.

**Architecture:** Main owns bounded, transient task and transfer snapshots queried through the typed preload bridge. Downloads owns projection and presentation. Application composition selects the download inspector in the existing resizable right pane.

**Tech Stack:** TypeScript, React, TanStack Query, existing DataTable and theme primitives, Electron, streamed fetch and yt-dlp.

## Work and ownership

- [x] Add `src/shared/download-activity.ts` schemas and `downloads.activity` query contracts. Instrument reconciler task lifetime, blob transfers and yt-dlp progress. Test bounded retention, late-report rejection, redaction and actual byte parsing offline.
- [x] Add Downloads activity query hook and pure formatting helpers. Unknown sizes remain indeterminate; stale transfer measurements are not presented as current speed. Test parallel files and waiting/processing phases.
- [x] Update `features/downloads/components/page/` with active rows, collapsed waiting/completed sections, visible failures and retained search, pause, retry, cancel and bulk selection. Page history remains paginated. Rows open `libraryChrome.inspectDownload(saveId)`.
- [x] Extend inspector context in `library-chrome.ts` and lazy composition in `app/components/right-pane/`. Implement download inspector with stage, real transfer details and bounded timeline. Preserve assistant/save inspection and panel resizing, reopening and closing.
- [x] Extend the offline Downloads gallery with the approved full layout and real production components. Verify keyboard selection, collapsing, pause and inspector switching visually with fixture data.
- [x] Run focused tests, `pnpm check`, `pnpm build`, and component gallery build. Document any pre-existing failures separately. Preserve all unrelated working changes and do not use personal libraries for verification.

## Behavioral acceptance

```ts
// A known transfer has byte progress; a task-count fraction never becomes it.
expect(describeDownloadActivity(receiving, now).progress).toBe(0.32);
expect(describeDownloadActivity(waiting, now).progress).toBeNull();
// Inspector selection is independent of save-detail navigation.
libraryChrome.inspectDownload("save-1");
expect(libraryChrome.getState().rightPane).toBe("inspector");
```

Use offline fixture transfers for response waits, transfer stalls, unknown sizes, processing, failure, completion and retry. Do not generate persistent activity events per byte or use live source traffic for checks.

## Verification outcome

82 focused tests pass across download activity, stream transfers, yt-dlp parsing, page behavior, inspector and shared pane state. The production-component preview builds and was checked in the browser for selected-row styling, switching Details, collapsed waiting work, pause/resume and stalled transfers. Architecture checks pass. Scoped Biome and oxlint checks pass.

Repository-wide checks remain blocked by unrelated diagnostics in the current working tree: oxlint findings in shadows, source hooks, search and token tests; TypeScript errors in sort, source icons and source hooks; existing knip findings; eight tests in source menus, native sockets and HEIC decoding. The desktop production build fails resolving the existing `@pond/theme/shadow/shadow.css` export. These were preserved. No live-network tests or personal library downloads were used.

The offline preview is served at `/downloads.html` by the component gallery. See `docs/superpowers/plans/2026-09-08-downloads-design-qa.md` for visual checks and limitations.
