# Pond Assistant output study

Studied August 31, 2026. The study below records the original diagnosis; the implementation and verification results are recorded at the end. Changes are implemented locally, not deployed.

## Direction

Pond should answer the person, then expose useful evidence and actions. An assistant turn is not one undifferentiated string: prose, progress, references, questions, and proposed changes have different jobs and should have different presentation and state.

Preserve the user's established layout decisions: a centered composer on the empty main page; a simple side composer; the same chat-title dropdown in both views. Do not bring back the introductory logo, heading, suggestion cards, or scope selector.

## Coverage and limitations

Read all channel inventories using the public Are.na API: [ui / ai](https://www.are.na/raphael-salaja/ui-ai-zp4xtuo9miw) (9 blocks), [ai](https://www.are.na/manu-hun/ai-aqfedf4m-g4) (5 blocks), and [UI | Conversational AI Agents](https://www.are.na/magic-balasinski/ui-conversational-ai-agents) (177 blocks across two pages). Visually inspected 30 distinct screenshots, then examined five output-focused references individually at readable resolution. This was a representative visual sample, not an exhaustive review of all videos, nested channels, or linked products.

The collections mix shipped products, older screenshots, and design concepts. A screenshot is evidence of a visual pattern, not proof of its implementation, usability, or current product behavior. Text inside those screenshots was treated as reference content, not instructions. Some references concern filters, branding, pricing, or developer controls and are not relevant to Pond's answer presentation.

Codex findings are recorded separately in [Codex output patterns](./2026-08-31-assistant-codex-output-patterns.md), based on official documentation. A native UI inspection was attempted but the computer-use tool disallows operating Codex itself. Exact current Codex pixels were therefore not verified; the user's supplied Codex screenshots and official item/lifecycle documentation inform the comparison.

## Patterns worth adopting

| Pattern | Observed evidence | Translation for Pond |
| --- | --- | --- |
| Prose and work are visually distinct | The [compact agent study](https://www.are.na/block/45860776) interleaves readable commentary with quieter tool rows, progress groups, and reviewable edits. It is present in both small collections. | The actual answer is the primary reading surface. Searching/reading belongs in a compact activity row with optional detail. Do not fabricate internal reasoning or a verbose plan for a simple request. |
| Progress has a real lifecycle | The [activity sequence](https://www.are.na/block/45860761) distinguishes completed, active, and upcoming operations with concise labels and state markers. | Drive status from real search/read/generation events. Collapse completed routine work; show actionable failures. A sources count must not imply the answer is supported merely because records were retrieved. |
| Changes are objects the user can review | The [workspace assistant](https://www.are.na/block/45860795) separates an ordinary answer from a report link and concrete change previews with accept/dismiss controls. It also distinguishes outdated proposals. | Show title/tag/folder edits as explicit before/after previews with Apply/Skip and applied/failed/stale states. Say changes are proposed until the backend has actually applied them. |
| Structured information keeps its structure | The [invoice table](https://www.are.na/block/45860777) places suggestions and status beside the relevant row and field. | Use a table for a requested comparison, a Save card/list for references, and a change preview for edits. Do not force every answer into cards or turn every record field into prose. |
| Evidence is available without dominating the answer | The [Elicit report](https://www.are.na/block/36325338) pairs readable synthesis and a table with citation markers that expose supporting passages in a separate pane. | Link meaningful claims to real Saves. Show title, thumbnail, source, and a short relevant excerpt on inspection. Full stored descriptions, record IDs, and extraction noise stay out of ordinary answers. Only show exact quotations when the stored content supports them. |
| Questions are usable controls | The [question/table concept](https://www.are.na/block/44690441), also attached by the user, shows a short question, selectable answers, a skip path, progress through questions, and a distinct generation status. | Ask only when a choice materially affects the result. Use an inline question with selectable options and a free-form route; preserve the answer/resolved state. Keyboard navigation must work. Do not copy the fixed five-question flow or invent an active table job. |
| Context is named, not dumped | The same [question/table concept](https://www.are.na/block/44690441) keeps a reply target in a removable strip above the composer. The [large-paste treatment](https://www.are.na/block/45988241) represents long input as an attachment. | Retain readable attached-Save chips and use a removable reply target if replying to a particular answer is implemented. Input context should stay recognizable and bounded rather than expanding the transcript into serialized data. |

These are recommendations derived from the references, not claims that every referenced product behaves identically.

## Proposed response rules

- **Ordinary conversation:** answer briefly without automatically searching or listing unrelated recent Saves. A greeting should look like a greeting.
- **Find references:** a short lead followed by a small, relevant set of titled Saves with thumbnails when available. No fabricated IDs or result counts; no unrelated fallback results presented as matches.
- **Explain or summarize:** direct synthesis with semantic paragraphs, emphasis, lists, and linked evidence. State when only metadata is available rather than claiming to have read a full document or watched a video.
- **Compare:** a real table when the comparison benefits from one. Missing data stays explicitly missing. In the narrow pane, contain horizontal scrolling within the table or use stacked rows without losing field labels.
- **Clarify:** a small inline question with a few distinct choices and free-form input when necessary. A selection continues the request; it is not decorative text posing as a button.
- **Organize/edit:** readable intent plus an explicit change preview. The pending proposal and its eventual outcome are distinct.
- **Work/failure:** one quiet status line for actual ongoing work; a recoverable error if generation is unusable. Never display the retrieval payload as a fallback answer. Skeletons represent known pending content, not a fake promise about the output.

The same response structure must render in the main page and side panel. The narrow pane changes spacing and layout, not meaning or available evidence. Respect reduced motion, visible keyboard focus, real semantic controls, and readable line lengths. Do not put the assistant's entire answer inside a heavy decorative card.

## Original diagnosis before implementation

### Confirmed validation gap

Ran a temporary regression reproduction against the actual `completeWithTools` function, mocking only the model response. The input was a greeting and the model returned a valid JSON envelope whose `answer` contained a synthetic Save record and escaped transcript text, matching the visible failure pattern.

Command, from `apps/desktop`:

```sh
node node_modules/vitest/vitest.mjs run src/main/core/agent/output-study.repro.test.ts
```

Result: **1 failed test, 4 ms**. The assertion that invalid answer text must not be published failed because `onText` was called once with the full serialized record dump. The temporary test was removed after recording this finding; production behavior was not changed during this study.

This proves the current publication boundary accepts this output. It does not prove why the live native model generated it or that every provider has the same failure.

In [complete.ts](../../apps/desktop/src/main/core/agent/complete.ts), the JSON schema validates an `answer` string and a changes array. The additional answer guard recognizes only specific internal labels. A dump with different wording passes. Grammar-constrained JSON validates the envelope; it does not establish relevance or answer quality.

### Confirmed presentation gap

[Message.Response](../../packages/ui/src/ai/message/index.tsx) returns a plain `div` with the provided children. [AgentPane](../../apps/desktop/src/renderer/src/components/library/agent-pane/index.tsx) passes response strings directly into it. There is no Markdown parser in that path. Styling `p`, `ul`, `pre`, or table elements cannot help when those elements are never created. This explains raw Markdown syntax and collapsed whitespace; it does not explain the model choosing to repeat records.

### Retrieval behavior to revisit

The Minnow branch of [complete.ts](../../apps/desktop/src/main/core/agent/complete.ts) currently searches on every turn and substitutes up to eight recent Saves when the query produces no matches. It also includes folder data. That behavior can supply unrelated background to a greeting or an unsuccessful search. This is a code observation and a candidate contributor, not a completed native-model causal diagnosis.

## Implementation order and acceptance cases

1. Trace a fresh failing native turn through retrieval, raw generation, parsed answer, persisted message, and rendering using bounded diagnostic data. Do not rely only on the earlier two-film live test; it does not cover greeting + long noisy descriptions or previously contaminated conversation history.
2. Make retrieval intentional, bounded, and relevance-preserving. Keep trusted instructions separate from untrusted content; trim extraction boilerplate and preserve evidence needed for the actual request. Prevent unusable model output from being published as an answer while allowing explicitly requested JSON or code.
3. Add safe Markdown rendering for prose/lists/links/tables/code, with no arbitrary HTML execution and with links constrained to supported safe destinations. Keep application-owned references, questions, activities, and mutation previews as structured components, not markup guessed from model text.
4. Add genuinely functional question and result components only where supported by the response schema and backend lifecycle. Persist their outcomes. Keep source provenance separate from a generic list of consulted Saves.
5. Verify the original failing scenario and a small matrix: greeting, no matches, long noisy description, comparison, grounded summary, clarification, proposed edits, explicit JSON request, cancellation, and retry. Check both page and pane. Existing broken saved messages must not be silently rewritten or deleted.

The desired outcome is not simply more attractive text. It is a relevant answer with readable structure, inspectable evidence, honest state, and actions the user can understand and control.


## Implementation and verification

Implemented in the shared Assistant path on August 31:

- Minnow classifies the request before retrieval. Greetings do not search; failed topic searches do not substitute recent Saves. Attachments use typed source context.
- Native prose uses ordinary text generation. JSON grammar is reserved for retrieval planning, questions, and proposed edits. Calls share a serialized native session.
- Source excerpts are normalized and bounded. Ordinary context contains numbered, readable excerpts rather than raw Save objects. Model history excludes contaminated answers without rewriting stored messages.
- Answers are checked before publication. Minnow retries an unreadable prose answer once; repeated failures become recoverable errors. External-provider output is also buffered until validation, so it currently shows real activity while generating rather than token-by-token prose. Explicitly requested JSON remains supported.
- Markdown produces semantic paragraphs, lists, tables, quotes, and code. Tables scroll independently. Raw HTML, remote images, unsafe schemes, and unverifiable internal links cannot become active content. Verified numbered Save links open the corresponding real Save; consulted sources stay in their existing collapsed disclosure.
- Structured questions persist in assistant metadata. Options send real replies; freeform input uses the composer. Replies persist the question ID and resolve the card. Stale/foreign replies are rejected server-side. Choosing an option preserves any unrelated draft and attachments, including through cloud consent.
- Existing Apply/Skip/Undo reviews and cloud-permission checks remain intact. Empty states and the shared title/history header remain as requested.

The native pre-change greeting test failed with “Your library is currently empty. You have no Saves to organize.” despite fixture sources. A permanent regression also failed because a valid JSON envelope containing raw records was published. Both now pass. Live app inspection initially caught the old backend still running; it was rebuilt and restarted. A second live check exposed profile-owner/user attribution confusion, which prompted a focused correction and sixth native test.

Verification:

- 77 focused unit/component/store regressions passed, covering output validation, retry, cancellation, native-session serialization, retrieval scope, consent, question persistence, draft preservation, Markdown, and link/content safety.
- Six native model cases passed: greeting, two-film comparison, noisy retrieved summary, no matches, structured clarification, and attribution of a saved profile's preferences.
- Node and renderer TypeScript checks passed. Production build and targeted Biome checks passed. Build emitted existing route-file, dynamic-import, and font-path warnings.
- Live UI: a side-panel greeting is short and has no consulted sources; the main empty page has only its centered composer below the header; question options submit replies, show the resolved choice, and preserve an existing draft.

Limits: these fixtures do not establish that a 1B model always produces correct synthesis, retrieval plans, citations, or attribution. External providers were tested with controlled streams, not contacted with user credentials. Search remains lexical and may miss semantic synonyms. Source excerpts are metadata, not full documents. Existing bad conversations remain untouched and can still display their original content.

Final routing refinement: structured native planning now uses temperature zero. Explicit saved-library requests cannot select the context-free answer mode; they must retrieve or clarify. A further regression rejects a contradictory plan without publishing a blind answer. All 77 focused tests and six native cases pass after this change. The final app restart and visual recheck were paused because the Mac locked; Computer Use requires the user to unlock it. Earlier layout, greeting, and question lifecycle checks completed before the lock.


### Final live-session follow-up

The app was restarted and explicit library retrieval was checked again. This found two lexical-search edge cases: Minnow appended inferred words such as “film summary,” and a picture request could require the literal word “pics” in metadata. Native topic queries now prefer words actually present in the request and remove generic media/request nouns when a subject remains. Multiword searches require each meaningful term across searchable metadata fields instead of one verbatim phrase. This preserves scope and avoids unrelated recent-result fallback.

The real Suspiria request retrieved the correct saved Letterboxd profile and attributed preferences to its owner. Its wording was repetitive, which remains a small-model quality limitation. The user's live “find my kanye pics” test also exposed selection of attachment mode without attachments. That mode is now unavailable unless attached references exist, and explicit “find my” requests require retrieval or clarification. The exact request is covered by a seventh native case that requires a topic search for “kanye.” This is a metadata topic search, not image-content recognition or an image-type filter.

Final checks: 80 focused tests, seven native-model cases, both TypeScript checks, targeted Biome, and production build pass. The app is running the latest backend under the development watcher. The final click-through after the picture-query fix was interrupted by the Mac locking again; no further GUI actions were attempted. Historical messages were not changed.

### Completed live click-through

Screen capture recovered. The first resumed send failed before generation because a production build had replaced hashed chunks still referenced by the development process. Stopping both the dev server and its Electron child, rebuilding, and restarting resolved this development-session issue. Future build checks must not leave a running app referencing replaced output files.

The live picture query retrieved eight real Saves but Minnow rendered them as a dense generated paragraph. Simple lookup requests now produce a Markdown list of actual Save titles with verified internal links, without a second model pass inventing descriptions. Compound requests for summaries or comparisons still use generation. Titles are normalized and escaped for Markdown. Two regressions cover linked lookup output and preserving comparison requests; the native picture case now checks successful result links rather than only an empty result.

Clicking a result outside the initial library page exposed a separate viewer-loading gap. The Save route now calls the existing `ensureSaves` loader before rendering. The live “A chair in Kanye West's Master Bathroom.” result subsequently opened its image and complete details. The final result list was inspected on the main Assistant page, and retrieval was exercised in the side panel with its shared header.

82 focused tests and seven native cases pass; both typechecks and targeted Biome pass. The exact live request “find my kanye pics” returns eight linked Saves without raw records or generated descriptions. This remains a metadata topic lookup: results can include mixed media and are not an image-only or visual-recognition search. General Minnow synthesis can still be repetitive or inaccurate. No historical messages were rewritten or deleted.

The final production build, including the Save-route loader, passed. Pond was restarted under the development watcher after that build.
