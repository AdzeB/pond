# Assistant production integration

**Goal:** Bring the approved Assistant page and companion pane into the desktop app, using real conversations, Saves, provider settings, and reviewed edits. Keep the isolated state lab for design review.

**Architecture:** A shared renderer session owns drafts, attachments, history, and request identity. The main process validates scope, controls generation, and persists message context. Models can propose edits but cannot apply them. Explicit review actions use stored proposals and compare the current value before Apply or Undo.

**Stack:** Existing React, TanStack Store/Router/AI, Base UI, Electron IPC, Drizzle/SQLite, Pond components and tokens. No new dependencies.

## 1. Message and request contracts

- Add `apps/desktop/src/shared/assistant.ts` with validated scope and request schemas, provider/model definitions, source snapshots, review proposals, and chunk types.
- Extend `packages/schema/src/db.ts` and the idempotent migration in `apps/desktop/src/main/db.ts` with nullable message metadata. Preserve existing histories.
- Extend `apps/desktop/src/main/core/agent/persist.ts` to store and return metadata and sort equal timestamps by message ID.

```ts
type Scope = { kind: "library" } | { kind: "folder"; id: string } | { kind: "attachments" };
type SendInput = { chatId: string; requestId: string; content: string; attachmentIds: string[]; scope: Scope; provider: string; allowCloudOnce: boolean };
```

## 2. Real generation and library operations

- Update `core/agent/chat.ts`, `complete.ts`, `tools.ts`, `ipc/queries/agent.ts`, and preload chunk typing.
- Validate keys and consent before appending a user message. Bind each request to a chat and provider. Stop aborts the provider operation; stale chunks cannot enter a different conversation. Remove provider fallback that could replay partially completed calls.
- Restrict search/read/proposals to the selected scope. Emit actual search/read/write status and collected source snapshots. Persist sent attachments and scope separately from user text.
- Add `core/agent/review.ts`: accept only IDs of stored proposals, compare before/after values, apply selected changes, retain failures for retry, and reject Undo when a later edit changed the value.
- Existing library persistence and event broadcasts remain the path for Save writes. No model-accessible mutation tool.

## 3. Shared production interface

- Replace `renderer/src/components/library/agent-pane/index.tsx` and styles with shared Assistant UI. Add focused composer, context picker, source/review, and model-picker components beside it.
- Add `renderer/src/stores/assistant.ts` so drafts and streaming survive page/pane changes. Subscribe to events once for all consumers and match request IDs.
- Port the Codex-style Add menu with `anchor={composerRef}`, `side="top"`, `align="start"`, `sideOffset={8}`, and vertical flipping disabled. The menu scrolls in the space above the composer.
- Keep logo motion, reduced-motion support, clean empty state, searchable model selection, real history, source navigation, removable attachments, inline consent, errors, Stop/Continue, and review Apply/Dismiss/Retry/Undo.
- Do not port fixture timers, canned answers, fake thumbnails, suggestion rows, or composer footer copy.

## 4. Main navigation

- Create `renderer/src/routes/_library/assistant.tsx` and regenerate the route tree.
- Update Library layout and sidebar to render Assistant as its own destination, with breadcrumbs and no duplicate pane beside the page. Preserve the toolbar companion-pane toggle on library screens.
- Update user-facing Agent labels to Assistant, retaining internal preference and IPC IDs.

## 5. Verification

```sh
cd apps/desktop
./node_modules/.bin/tsr generate
./node_modules/.bin/tsc --noEmit -p tsconfig.node.json
./node_modules/.bin/tsc --noEmit -p tsconfig.web.json
./node_modules/.bin/vitest run src/main/core/agent
./node_modules/.bin/electron-vite build
```

Verify request rejection does not lose drafts or append duplicate messages; cancellation cannot leak late chunks; scoped reads reject unrelated IDs; Apply and Undo compare current values; repeated Apply is harmless. Inspect the Add menu above the composer, both page/pane, light/dark, narrow widths, keyboard focus, and removed footer sections. Record any pre-existing build failures separately. Do not make live provider calls or mutate the user's library for testing.

Execution is inline in the current task as requested. Preserve unrelated working changes; no commit, reset, dependency installation, or deployment is part of this task.
