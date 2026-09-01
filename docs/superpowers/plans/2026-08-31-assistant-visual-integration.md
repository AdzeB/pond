# Assistant visual integration implementation plan

> **For agentic workers:** Execute inline in the current task, as authorized by the user. Preserve unrelated edits. Do not copy fixture behavior into production.

**Goal:** Ship the prototype's concise visual answers and direct Save navigation in the real Assistant page and side pane.

**Architecture:** Keep existing IPC, source verification, Markdown safety, streaming, chat store, and reviewed mutations. Replace result presentation with reusable visual Save cards. An optional References panel uses actual message source snapshots and local media; it is not a generated folder or a persistent collection.

**Tech stack:** Existing React, TanStack Store, Base UI, Pond tokens, react-markdown, remark-gfm, Vitest. No new dependencies or provider changes.

## Decisions from the prototype

- Inline output is the default. A References panel supports the board workflow without a development variant switcher.
- Clicking an image or citation calls the existing `openSave(id)` navigation. No Save preview dialog.
- Empty main chat has a centered composer; empty side chat keeps its composer at the bottom. Both keep the shared header.
- Markdown comparisons, questions, and proposals remain backed by actual generation and persisted review state. No canned prose, palettes, invented folders, or prototype photography.
- Preserve the prototype as design evidence until the integration is reviewed. No commit or unrelated cleanup in this task.

## 1. Visual results

- [x] Add `save-reference-card.tsx` beside `result-set.tsx`. Use `SourceThumbnail`, the verified source title/domain, direct navigation, and a separate attach button.
- [x] Rework `ResultSet` into a four-item visual strip with expansion to all verified IDs. Deduplicate IDs and omit unknown IDs before rendering or attachment. Preserve result order.
- [x] Update `inline.module.css` for four columns on the page, a horizontally scrollable strip in narrow panes, and restrained metadata. Use Pond tokens and keyboard-visible attach controls.
- [x] Let `SourceThumbnail` show a bounded text fallback when a visual card has no local cover. Continue loading only local `pond://` media.
- [x] Change citation clicks to direct Save navigation. Keep compact source information available on hover and make its thumbnail open the same Save.

## 2. Conversation and references

- [x] Add `reference-board.tsx` for a message's deduplicated sources, with direct Save navigation, attach controls, and Close References.
- [x] Add `referenceMessageId`, `showReferences(messageId)`, and `closeReferences()` to `stores/assistant.ts`. Validate the message is in the current conversation and clear the selection on New Chat or chat changes.
- [x] Extract `response-content.tsx` from the completed-response portion of `AgentPane`. Keep actual questions, review errors, Stop/Continue, and Copy/Quote behavior. Place completed activity below the answer and expose consulted sources through References.
- [x] Add the References action and explicit New Chat action to the shared header. Render references beside the main conversation, or as a replaceable view at narrow widths; attachment returns to the composer.
- [x] Match prototype density, composer shape, and typography through existing component styles. Retain plain Markdown tables and code, accessible focus, reduced motion, and the existing empty-state behavior.

## 3. Verification

- [x] Update `inline.test.tsx` to exercise direct citation clicks, no intervening dialog, unknown/duplicate ID exclusion, expansion, attachment, and text fallback.
- [x] Add References tests for verified content, navigation versus attachment, and close behavior. Add store checks that references do not cross conversations or lose the draft.
- [x] Run focused renderer, store, and backend agent regressions:

```sh
cd apps/desktop
node node_modules/vitest/vitest.mjs run src/renderer/src/components/library/agent-pane src/renderer/src/stores/assistant.test.tsx src/main/core/agent
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.web.json
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.node.json
```

- [x] Verify the actual production components in the running app at page and pane widths, including keyboard interactions. Do not restart the user's app, overwrite its running build, make external model calls, or apply real library changes merely to test.
- [x] Record actual results and any pre-existing failures. Scope formatting to changed files.

## Verification results

- Focused renderer, assistant store, and backend agent regression suite: **95 passed**, **7 skipped**. The seven skipped cases require opt-in live model execution (`POND_LIVE`); no live generation was requested.
- Renderer and main TypeScript checks passed. Scoped Biome check passed for all 15 changed source/test/style files.
- Inspected the running Pond development app using existing chat history and real local Save covers. Verified the centered empty main composer, empty side composer with shared header, visual result strip, and References at both page and 340px pane widths.
- Opened the chair result directly into its actual Save detail and used Back to restore the same conversation and References selection. No preview dialog.
- Verified References autofocus, Escape to close with focus returned to the composer, slash action suggestions, and filtered @ Save suggestions. Cleared the temporary draft without sending a message.
- No library edits, provider calls, new dependencies, production build overwrite, or app restart. Existing generation behavior, source verification, and reviewed mutations remain unchanged.
