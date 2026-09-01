# Assistant output implementation plan

**Goal:** Replace raw retrieval dumps with relevant, readable answers and distinct evidence, activity, question, and review surfaces.

**Architecture:** Keep the shared page/pane renderer. Bound and normalize library context before model use, give Minnow a small retrieval-planning step, validate answers before publication, and exclude contaminated prior answers from model history without altering saved messages. Render safe Markdown and application-owned Save references and questions. Reuse the existing persisted review workflow.

**Stack:** Electron, React, TypeScript, TanStack AI, node-llama-cpp, Zod, react-markdown, remark-gfm, Vitest.

Execution is authorized in this task. Keep work in the current workspace; do not commit unrelated changes or stop for another execution-choice prompt.

## 1. Reproduce and isolate

- [x] Extend `apps/desktop/src/main/core/agent/complete.test.ts` with valid-envelope raw-record rejection, no unrelated no-result fallback, and preservation of explicitly requested JSON.
- [x] Extend `complete.live.test.ts` with greeting, noisy source summary, and no-match cases. Run the greeting against the existing native path before changing it.
- [x] Confirm hypotheses separately: irrelevant eager retrieval; raw record structure dominating small-model context; missing answer validation; plain-text rendering.

Commands from `apps/desktop`: `node node_modules/vitest/vitest.mjs run src/main/core/agent/complete.test.ts`; `POND_LIVE=1 node node_modules/vitest/vitest.mjs run src/main/core/agent/complete.live.test.ts`.

## 2. Retrieval and answer boundary

- [x] Add focused `output.ts` helpers for bounded metadata text, safe history, and output validation. Test escaped source whitespace and records nested inside an otherwise valid answer.
- [x] Replace unconditional Minnow retrieval with a constrained plan (`answer`, `search`, `recent`, `attachments`, or `clarify`). Never substitute recent Saves for a failed search. Do not search or enumerate folders for ordinary conversation.
- [x] Pass typed attachments into completion rather than requiring the model to parse serialized metadata labels. Bound sources and history; represent evidence by numbered references and readable fields.
- [x] Keep native runtime calls serialized. Support plain-text answer generation and JSON schemas only for planning/edits. On invalid output, retry once with a concise repair instruction, then return a recoverable error without publishing raw data.
- [x] Keep tool results bounded for external models and reject invalid output before publishing it. Do not mutate stored historical messages.

## 3. Semantic output

- [x] Add desktop `assistant-response.tsx` and CSS: semantic Markdown, GFM tables, code/quotes/lists, safe external links, no raw HTML or remote image loading, and verified numbered Save links.
- [x] Test renderer output with `renderToStaticMarkup`: paragraphs, lists, tables, code, safe links; malicious schemes/raw HTML are inert.
- [x] Use the renderer for stored answers and live text. Keep tables independently scrollable in the pane; retain the current empty-state and shared header behavior.
- [x] Normalize source excerpts for presentation, distinguish cited Saves from merely consulted ones, and keep evidence compact.

## 4. Structured questions and activity

- [x] Add a bounded Zod question schema, a `requestQuestion` tool for external models, and a Minnow clarification result. Persist the question alongside the assistant message.
- [x] Add a real question component with option buttons, a free-form route, and resolved state derived from a persisted reply. Preserve composer drafts and prevent duplicate answers while busy. Validate question replies server-side before saving.
- [x] Show actual search/read/write progress separately from prose. Reuse existing Apply/Skip/Undo review controls; do not generate fake tasks or synthetic reasoning.

## 5. Verify

- [x] Run focused agent, store, and renderer regressions plus desktop typecheck and build.
- [x] Run live Minnow greeting, noisy metadata synthesis, comparison, and no-match cases. Explicitly note any native-model quality limits.
- [x] Check page/pane UI with Computer Use when available, without deleting or rewriting the user's chats or making external provider calls.
- [x] Record actual verification results and remaining limits in the output study. Remove temporary diagnostics.


Verification notes: 80 focused regressions and seven native cases pass; TypeScript, build, and targeted Biome pass. Live main/pane checks are recorded in the output study. Answer streaming is intentionally buffered until validation; actual tool/generation activity remains live. Numbered verified citations and the existing “Saves consulted” disclosure distinguish linked evidence from retrieval activity. No historical messages were rewritten.

- [x] Restart the app and recheck explicit-library routing in the live UI. The Suspiria request retrieves the correct profile.
- [x] Complete the picture-query click-through. The live request returns eight linked Save titles; opening an older result loads its image and details. Simple lookups now use actual titles rather than generated summaries. Added the missing Save-route loader for results outside the initial library page. 82 focused tests and seven native cases pass, along with both typechecks and targeted lint.
