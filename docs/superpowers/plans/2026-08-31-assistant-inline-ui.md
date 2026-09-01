# Pond Assistant Inline UI Implementation Plan

**Goal:** Make conversations useful as a Pond workspace: inspect and reuse Saves inline, read well-formatted responses, and review actual work without raw tool payloads.

**Architecture:** Keep the existing local/cloud runtime and Markdown safety boundary. Add typed, persisted result sets and tool steps. Build small React components using Pond tokens, Popover, icons, and local thumbnails; no replacement chat SDK or new provider service.

**Tech Stack:** Electron, React, TanStack AI, Zod, react-markdown/GFM, Base UI through Pond, Vitest.

Execution is authorized in this task. Work inline, preserve unrelated workspace changes and saved conversations, and do not commit or deploy.

## References and decisions

- [AI Elements inline citations](https://elements.ai-sdk.dev/components/inline-citation): compact references with an inspectable source preview. Use verified Pond sources, not generated source metadata.
- [assistant-ui tool UI](https://www.assistant-ui.com/elements/tool-fallback): distinguish tool activity from answer prose. Only record actual executed operations, never simulated reasoning.
- [Prompt Kit messages](https://www.prompt-kit.com/docs/message): readable line lengths, restrained containers, nearby message actions.
- Preserve the centered empty composer, shared page/pane header, and existing @ / menus. Do not add onboarding cards or a preamble.

## 1. Structured inline data

Files: `apps/desktop/src/shared/assistant.ts`, `src/main/core/agent/{context,chat,complete}.ts`, `src/renderer/src/stores/assistant.ts`.

- [x] Add result sets `{ title: string; saveIds: string[] }` and actual tool steps `{ id, label, detail?, status, elapsedMs? }` to message metadata and live chunks.
- [x] Add `showSaves` with a bounded ID list; reject IDs not collected in the current scope. Minnow simple lookups call this tool and return a short introduction; providers can call it after search/read. No record dumps or duplicate prose lists.
- [x] Wrap search/read/folder/proposal execution with running/completed/error/stopped events. Persist the same events, including on interrupted runs. Exclude internal planning from the timeline.
- [x] Verify unknown IDs cannot become UI results, successful results persist, and cancelled tools never claim completion.

## 2. Pond inline components

Files: `src/renderer/src/components/library/agent-pane/{save-preview,result-set,tool-activity,message-actions}.tsx` and scoped CSS.

- [x] Render source preview popovers with local-only thumbnails, bounded excerpts, a real Open Save action, and an attach-to-composer action.
- [x] Render result sets as responsive thumbnail cards, initially four with Show More; resolve all IDs from the message's verified sources. Batch hydrate missing Save records for local covers.
- [x] Render completed work as a quiet disclosure and active work with real status. Handle failed/stopped status distinctly and respect reduced motion.
- [x] Put Copy and Quote near each answer; quote inserts Markdown into the existing draft without sending or replacing it.

## 3. Markdown and cleanup

Files: `assistant-response.tsx`, `assistant-response.module.css`, `index.tsx`, `styles.module.css`, `question.module.css`.

- [x] Add fenced-code language headers and Copy Code with visible success/error. Preserve exact source code, never execute it.
- [x] Keep GFM tables, alignment, task lists, and links readable; wide tables/code scroll within the response. Inline references use preview controls.
- [x] Improve typography, spacing, focus visibility, responsive cards, composer hints, and review/question surfaces using existing tokens. No fabricated progress or decorative graphs.

## 4. Verification

- [x] Run focused agent/store/component tests, both TypeScript projects, and targeted Biome.
- [x] Run real Minnow regressions, then inspect a real search, result expansion, preview, attaching context, and opening an older Save in the main page and side pane.
- [x] Inspect rich Markdown and tool states using deterministic component fixtures where the 1B model cannot reliably produce a requested format. Mark fixtures as previews and keep them separate from real chats.
- [x] Stop the development server and its Electron child before the production build; restart afterward to avoid stale hashed chunks. Record actual results and limitations.

Commands from `apps/desktop`:

```sh
node node_modules/vitest/vitest.mjs run src/main/core/agent src/main/core/ai/llamacpp-provider.test.ts src/renderer/src/components/library/agent-pane src/renderer/src/stores/assistant.test.tsx
POND_LIVE=1 node node_modules/vitest/vitest.mjs run src/main/core/agent/complete.live.test.ts
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.node.json
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.web.json
node node_modules/electron-vite/bin/electron-vite.js build
```

## Result

Implemented in the existing workspace without a commit or deployment. All 89 focused tests, seven native Minnow tests, both TypeScript projects, targeted Biome, and the desktop production build pass. Live and deterministic visual checks are recorded in `docs/research/2026-08-31-assistant-inline-ui.md`. The dev server and Electron child were stopped together before building, then restarted. Existing conversations and unrelated workspace changes were preserved.
