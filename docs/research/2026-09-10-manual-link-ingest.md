# Manual link ingest

Audit date: 10 September 2026

A pasted or captured URL should start downloading now, stay visible in Downloads, and ignore Pause Queue. This note traces the live path and the gaps that still make that feel like background work.

## Path

1. Gallery paste and drop call `saves.quickAdd` per URL. [use-card-actions.ts](../../apps/desktop/src/renderer/src/features/saves/hooks/use-card-actions.ts)
2. Import from Links does the same loop, then toasts `Saved to Pond`. [actions.ts](../../apps/desktop/src/renderer/src/features/library/components/new-menu/actions.ts)
3. Main enqueues with `trigger: "user:quickAdd"`, stamps tasks `priority: "interactive"`, and kicks the reconciler. [saves-import.ts](../../apps/desktop/src/main/ipc/queries/saves-import.ts) [enqueue.ts](../../apps/desktop/src/main/core/pipeline/enqueue.ts) [priority.ts](../../apps/desktop/src/main/core/pipeline/priority.ts)
4. The extension, toolbar, and site intercepts also stamp interactive. Bookmark HTML import currently uses `user:quickAdd` too, so a 200-URL file looks like 200 pasted links. [saves-import.ts](../../apps/desktop/src/main/ipc/queries/saves-import.ts)
5. File paste is the contrast: `saves.importFiles` copies bytes immediately and never joins this pipeline.

## What still queues a paste

Pause Queue sets `paused` on the reconciler. `tick()` returns before it pulls work, so interactive tasks never start until you resume. Running background downloads finish; new ones, including the paste, wait. [reconciler.ts](../../apps/desktop/src/main/core/pipeline/reconciler.ts) [downloads-implementation.md](./2026-08-31-downloads-implementation.md)

Interactive overflow is one extra slot on the shared cap of four. If four videos are already fetching, a fifth paste can start. A sixth waits. Pause still blocks that fifth. [reconciler-config.ts](../../apps/desktop/src/main/core/pipeline/reconciler-config.ts)

`pullDueTasks` drops harvest and archive tasks while the source is in cooldown, breaker, budget, or governor pause. A pasted Twitter URL behind a sync cooldown is skipped entirely, so it does not even occupy the overflow slot. [task-queue.ts](../../apps/desktop/src/main/core/pipeline/task-queue.ts) [rate-governor.ts](../../apps/desktop/src/main/core/pipeline/rate-governor.ts)

Until a worker is running, Downloads puts the row in Waiting. While the queue is paused that group is labeled Paused, so the paste looks like background work you stopped. [downloads-view.tsx](../../apps/desktop/src/renderer/src/features/downloads/components/page/downloads-view.tsx)

## QoL

- Toast says Saved to Pond at enqueue, not when files land. One pasted link also does not open the Save. New Note does.
- Bookmark import should stay in the background lane. Paste, extension capture, and toolbar save should not.
- Keep source cooldowns. Skipping the governor for a pasted Twitter URL can hit the same account the sync just tripped. The wait belongs in `acquire()`, not in Pause Queue.
- Pause Queue copy can stay. The control pauses background ingest. User-started downloads are not that queue.

## Target

Treat `user:quickAdd`, extension captures, and intercepts as a pause-immune lane with its own small cap. They still appear in Downloads as running work. Background sync stays behind Pause Queue and the shared four-slot cap. Bookmark file import stays background.
