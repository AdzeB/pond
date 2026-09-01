# Making Pond Assistant maximally competent

_Research date: 2026-09-01. Scope: Pond's local-first personal-library assistant. Sources are official product documentation, first-party engineering reports, and primary research papers._

## Executive conclusion

Pond does not mainly have a model-intelligence problem. It has a control-plane and retrieval-integration problem.

For `kanye pics`, the product should deterministically interpret the request as:

```json
{
  "intent": "search",
  "scope": "library",
  "query": "Kanye",
  "media": ["image"],
  "requiresEvidence": true
}
```

The application should then execute retrieval itself, show the resulting Saves, and only ask a language model to synthesize an answer if synthesis is needed. It should be impossible for a hosted model to skip retrieval and publish an unrelated refusal.

The highest-value fact from inspecting the repository is that much of the substrate already exists:

- Pond already creates an FTS5 index over title, description, author, tags, caption, OCR, transcript, notes, and URL (`apps/desktop/src/main/db.ts:350-432`).
- The schema already stores text embeddings, captions, OCR, transcripts, and CLIP embeddings (`packages/schema/src/db.ts:111-120`).
- Local enrichment already produces text embeddings from metadata plus caption/OCR/transcript and CLIP embeddings from representative images (`apps/desktop/src/renderer/src/lib/enrichment/enrichers/text-embedding.ts:15-39`, `clip.ts:11-27`).
- The Library UI already calls ranked FTS5 search (`apps/desktop/src/renderer/src/hooks/use-search-results.ts:52-88`).

The Assistant bypasses that substrate. Its search tool performs a conjunction of unranked `LIKE '%term%'` checks across only title, description, author, and URL (`apps/desktop/src/main/core/agent/tools.ts:54-98`). Hosted providers are given tools but may answer without using them (`complete.ts:87-129`). Only Minnow gets a separate retrieval planner, and its hard guard recognizes phrases such as “find my…” rather than terse Library-surface shorthand (`complete.ts:181-280`).

The recommended architecture is therefore: **app-owned planning -> app-owned hybrid retrieval -> optional reranking -> model synthesis -> deterministic evidence validation**. Keep one transparent workflow. Do not begin with a society of agents.

## Why the current response was predictable

Three independent failures line up:

1. **Routing is provider-dependent.** Hosted models use `auto` tool selection. OpenAI, Anthropic, and Gemini all document a distinction between optional and forced tool use: OpenAI offers `tool_choice: "required"`, Anthropic offers `any` or a named `tool`, and Gemini offers `ANY`. Merely supplying tools leaves the decision to the model. ([OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling), [Anthropic tool choice](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools), [Gemini function-calling modes](https://ai.google.dev/gemini-api/docs/function-calling))
2. **The guard is phrase-based instead of surface-aware.** On a dedicated Library assistant surface, a short noun phrase is much more likely to be a search than open-domain chat. `kanye pics` does not contain the current guard's `my`, `saved`, or `library` markers.
3. **Assistant retrieval is weaker than Library retrieval.** Even if the model calls the tool with `query: "kanye pics"`, the current tool requires every word to occur and does not search captions, OCR, transcripts, tags, FTS rank, text embeddings, or CLIP embeddings. “pics” should become a media constraint, not a lexical term.

Changing only the system prompt or default model may improve the frequency of correct behavior, but it cannot make the behavior invariant. Structured Outputs are useful because they constrain output to a schema, while their own documentation warns that schema adherence does not make values semantically correct. The application still needs validation and policy. ([OpenAI Structured Outputs](https://openai.com/index/introducing-structured-outputs-in-the-api/))

## Target architecture

```text
user turn
   |
   v
deterministic pre-router + structured intent planner
   |              |             |
   | chat         | clarify     | library work
   |              |             v
   |              |      app-owned retrieval plan
   |              |             |
   |              |       metadata filters
   |              |             |
   |              |      +------+------+------+
   |              |      |             |      |
   |              |    FTS5/BM25   text dense  visual dense
   |              |      +-------------+------+
   |              |             |
   |              |         rank fusion
   |              |             |
   |              |        local reranker
   |              |             |
   +--------------+------> synthesis model
                                |
                         evidence/result validator
                                |
                         render or bounded retry
```

This is a workflow, not an autonomous agent. Anthropic distinguishes predefined workflows from model-directed agents and recommends predictable workflows for well-defined tasks; OpenAI similarly advises that multi-agent complexity should be driven by eval results. ([Anthropic, “Building effective agents”](https://www.anthropic.com/engineering/building-effective-agents), [OpenAI evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices))

### 1. One provider-independent intent contract

Run the same planner before **every** provider, including Minnow. The contract should be an app-owned schema rather than free text:

```ts
type AssistantPlan = {
  intent:
    | "chat"
    | "search"
    | "inspect"
    | "summarize"
    | "compare"
    | "organize"
    | "clarify";
  scope: "library" | "folder" | "attachments";
  query: string;
  media: Array<"image" | "video" | "article" | "audio" | "other">;
  time?: { kind: "recent" } | { after?: string; before?: string };
  requiresEvidence: boolean;
  requestedMutation: boolean;
  confidence: number;
};
```

Use two layers:

- **Deterministic pre-router.** Greetings, explicit general questions, attachments, current surface, and obvious media/result nouns should be handled without inference. On the Library assistant surface, a bare entity/topic phrase defaults to `search`. `pics`, `photos`, and `images` become `media: ["image"]`; they are removed from the lexical query.
- **Small structured classifier for the remainder.** Use strict structured output and few-shot examples drawn from real logs. Preserve literal named entities in a separate field. If confidence is low, prefer a useful scoped search over a clarification unless a missing choice genuinely changes the action.

Routing is a natural fit for a specialized workflow: it isolates categories so each downstream path can have a narrower prompt and tool surface. ([Anthropic routing guidance](https://www.anthropic.com/engineering/building-effective-agents))

The planner must not depend on the final writer model. This makes `kanye pics` behave identically with OpenAI, Anthropic, Gemini, Ollama, LM Studio, or Minnow.

### 2. Evidence gates, not polite suggestions

When `requiresEvidence` is true, Pond should execute retrieval before the final model call. Provider `tool_choice` can strengthen a provider-specific path, but the cross-provider guarantee should live above adapters.

Enforce these invariants in code:

- A Library search/summary/compare turn cannot publish unless a retrieval or attachment-read event exists.
- Result IDs and citations must be subsets of IDs returned by the app-owned retriever.
- A no-result answer must be based on an executed search and must not substitute unrelated recent Saves.
- Lookup-only requests render `showSaves` directly; no writer call is required.
- Summaries and comparisons receive bounded evidence records and produce a structured draft such as `{answer, citedSaveIds, proposedChanges}` before rendering.
- A failed invariant causes one bounded corrective retry or a product-authored fallback, never the model's unsupported prose.

OpenAI's Structured Outputs and Anthropic's strict tool use can guarantee schema-shaped arguments when supported; Anthropic explicitly recommends combining forced tool choice with strict schemas when a tool call must happen. ([OpenAI](https://openai.com/index/introducing-structured-outputs-in-the-api/), [Anthropic](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools))

Pond's existing safety boundary for mutations is good: the model can propose changes, but stored proposals require explicit review and compare current values before apply/undo. Preserve it.

### 3. One retrieval service shared by UI and Assistant

Create a main-process `LibraryRetrievalService` and make both the UI and Assistant call it. Do not maintain a strong UI search path and a weak Assistant path.

The first version should immediately reuse `saves_fts` and its BM25 rank. SQLite FTS5 supports tokenized full-text queries, phrases, prefixes, field weighting, snippets, and a built-in `bm25()` ranking function. ([SQLite FTS5](https://www.sqlite.org/fts5.html))

Input and output should carry explanations:

```ts
type RetrievalRequest = {
  rawQuery: string;
  lexicalQuery: string;
  semanticQuery: string;
  scope: LibraryScope;
  media: MediaType[];
  limit: number;
};

type RetrievalHit = {
  saveId: string;
  score: number;
  channels: Array<"fts" | "text" | "visual" | "recency">;
  matchedFields: string[];
  excerpt?: string;
  frameTimeSec?: number;
};
```

Hard scope/media/date filters run before ranking. Recency is a tie-breaker or an explicit intent, not a substitute for relevance.

### 4. Hybrid lexical, semantic, and visual retrieval

No single retrieval channel is sufficient:

- **FTS5/BM25** preserves exact names, tags, quotations, usernames, URLs, and identifiers.
- **Text dense retrieval** finds paraphrases and conceptual similarity over metadata, captions, OCR, and transcripts.
- **Visual dense retrieval** maps text and images into a shared space so visual content can match even when metadata is sparse.

Dense Passage Retrieval established the effectiveness of dual-encoder semantic retrieval, while BEIR found BM25 to be a robust zero-shot baseline and found reranking/late-interaction systems strongest on average but more expensive. The correct conclusion for Pond is hybrid retrieval, not replacing lexical search. ([DPR paper](https://aclanthology.org/2020.emnlp-main.550/), [BEIR paper](https://arxiv.org/abs/2104.08663))

Fuse independently ranked lists with **Reciprocal Rank Fusion (RRF)** rather than hand-normalizing incomparable BM25 and cosine scores. The original RRF paper found the simple rank-based fusion consistently stronger than its individual systems in its experiments. ([Cormack, Clarke, and Buettcher, 2009](https://cormack.uwaterloo.ca/cormacksigir09-rrf.pdf))

Recommended first-stage candidate budget:

- top 50 lexical
- top 50 text-dense
- top 50 visual-dense for image/video-capable queries
- deduplicate and RRF-fuse
- rerank the top 30-60
- render the top 8-12, depending on intent

Treat those numbers as tunable eval parameters, not doctrine.

### 5. Make multimodal search real

CLIP jointly trains image and text encoders so natural-language prompts can be compared with image representations; SigLIP and SigLIP 2 extend this family and report stronger image-text retrieval, multilingual understanding, and multiple released model sizes. ([OpenAI CLIP](https://openai.com/index/clip/), [CLIP paper](https://cdn.openai.com/papers/Learning_Transferable_Visual_Models_From_Natural_Language_Supervision.pdf), [SigLIP paper](https://arxiv.org/abs/2303.15343), [SigLIP 2 paper](https://arxiv.org/abs/2502.14786))

Pond already stores image-side CLIP vectors, but search needs the matching **text encoder from the exact same checkpoint and preprocessing version**. Add model/version/dimension validation and rebuild stale vectors when that identity changes. Do not compare vectors produced by different models.

For images, index all of:

- the representative image's visual embedding
- generated caption
- OCR
- surrounding source metadata, author, tags, and notes
- optional per-asset embedding when one Save contains multiple images

For video, a first-frame poster is not enough. Build a timeline index:

- sample scene-change frames plus a bounded periodic fallback
- store a visual embedding, caption, and OCR per representative frame
- chunk the ASR transcript with timestamps
- link every hit back to `saveId` and `timeSec`
- fuse frame, transcript, and Save-level ranks, then deduplicate to Saves for the default UI

Whisper's primary report describes robust multilingual speech recognition and provides an open family of model sizes suitable for local transcription. Video-text retrieval research such as X-CLIP demonstrates the value of reasoning over multiple frames rather than one coarse image. ([OpenAI Whisper](https://openai.com/index/whisper/), [Whisper paper](https://cdn.openai.com/papers/whisper.pdf), [X-CLIP](https://arxiv.org/abs/2207.07285))

For `kanye pics`, the lexical route can find the name in titles/captions/OCR/tags, while the text-to-image route can retrieve visually aligned images. Generic visual encoders are not guaranteed biometric identity systems, so measure named-person retrieval on the user's actual collection. Do not silently create a face-identity database; if Pond ever adds known-person clustering, make it explicit, on-device, inspectable, and opt-in.

### 6. Chunk long Saves and preserve provenance

Save-level embeddings truncate and blur long articles/transcripts. Add a `save_chunks`-style index with:

- `saveId`, stable `chunkId`, modality, text
- character/page/time/frame offsets
- lexical index text and embedding
- model/version, source hash, and indexed-at timestamp
- a short parent-document context string

Anthropic's Contextual Retrieval prepends chunk-specific document context before creating both embeddings and BM25 entries. In its experiments, contextual embeddings plus contextual BM25 reduced top-20 retrieval failures by 49%, and reranking reduced them by 67%; the report also stresses testing chunk size, model, and top-K on the actual use case. ([Anthropic Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval))

The synthesis model should receive the original chunk plus a clearly separated context header, never an unattributed summary. Citations should map to stable Save IDs and, where available, exact offsets or timestamps.

### 7. Query understanding without query drift

Keep three representations:

1. `rawQuery`: exactly what the user wrote.
2. `literalQuery`: entities and terms safe for FTS (`Kanye`).
3. `semanticQuery`: a context-resolved rewrite for dense retrieval (`photos depicting Kanye West`).

Always search the raw/literal branch as well as any rewrite. Query rewriting can improve retrieval when user language differs from corpus language, but generated rewrites can drift. The Rewrite-Retrieve-Read paper reports consistent gains from a dedicated rewriter; HyDE retrieves from a generated hypothetical document embedding while explicitly acknowledging that the hypothetical text can contain false details. These are candidate generators, never evidence. ([Rewrite-Retrieve-Read](https://aclanthology.org/2023.emnlp-main.322/), [HyDE](https://aclanthology.org/2023.acl-long.99/))

Resolve terse follow-ups using a small structured conversation state:

```json
{
  "activeTopic": "Kanye West",
  "activeSaveIds": ["..."],
  "lastIntent": "search",
  "filters": { "media": ["image"] }
}
```

This is safer and more inspectable than asking the writer to infer all conversational context from an ever-growing transcript.

### 8. Rerank before asking the writer to reason

Use a local cross-encoder or late-interaction reranker on the fused candidate set. A cross-encoder sees query and candidate together and is slower but more precise; BERT passage reranking produced a large relative MRR@10 improvement in the original MS MARCO experiment. ColBERT's late interaction offers a middle point by precomputing document representations while retaining token-level interactions. ([Passage Re-ranking with BERT](https://arxiv.org/abs/1901.04085), [ColBERT](https://arxiv.org/abs/2004.12832))

Do not use the expensive final chat model as the default reranker. A small local reranker gives reproducible, private, low-token scoring. Reserve an LLM listwise reranker for complex compare/research modes only if offline evals show enough benefit.

### 9. Memory should improve continuity, not invent a user profile

Separate three kinds of state:

- **Conversation state:** recent turns, active topic, active results, pending review. This belongs to the chat and should be deterministic.
- **Explicit durable preferences:** facts the user directly asked Pond to remember, such as preferred output style or aliases. Store with provenance, timestamp, edit/delete controls, and user scope.
- **Library knowledge:** Saves, notes, tags, captions, and transcripts. This remains retrieval data, not “memory.”

Do not automatically turn content found inside Saves into facts about the user. Do not let retrieved instructions write durable memories. TanStack AI's memory middleware supports scoped `recall`/`save`, telemetry callbacks, and custom local adapters; its documentation also notes that ordinary recent turns should simply be passed as messages rather than treated as long-term memory. ([TanStack AI memory overview](https://tanstack.com/ai/latest/docs/memory/overview), [operating memory](https://tanstack.com/ai/latest/docs/memory/operating))

### 10. Model policy: evaluate capabilities, not brand prestige

Use separate model roles:

- **Router/planner:** smallest local or remote model that clears intent and argument eval thresholds with strict structured output.
- **Query rewriter:** small model, invoked only for ambiguous or conversational queries.
- **Reranker:** local specialist model.
- **Writer/reasoner:** the user's selected provider; offer a “Best quality” default backed by the strongest currently supported model that clears Pond's evals.
- **Vision fallback:** a multimodal writer only when the task requires inspecting a small number of top images beyond embeddings/captions.

Do not freeze old hard-coded defaults indefinitely. Maintain a capability registry (`tools`, `strict schema`, `vision`, context, reasoning, local/cloud, latency class), provider conformance tests, and versioned recommended defaults. OpenAI's current selection guidance is the right optimization order: set an accuracy target, optimize for accuracy first, then reduce cost and latency while maintaining it. ([OpenAI model selection](https://developers.openai.com/api/docs/guides/model-selection))

A bigger writer cannot compensate for missing retrieval. Conversely, once the evidence pipeline is deterministic, a stronger reasoning model can materially improve comparison, synthesis, organization proposals, and ambiguity handling.

## Orchestration with TanStack AI

TanStack AI already supplies useful mechanics: typed tools, provider adapters, bounded agent loops, middleware hooks, debug logging, devtools timelines, and memory middleware. It also explicitly notes that the model decides whether to call ordinary tools, and that `maxIterations` limits model turns rather than parallel tool fan-out. ([tools](https://tanstack.com/ai/latest/docs/tools/tools), [agentic cycle](https://tanstack.com/ai/latest/docs/chat/agentic-cycle), [middleware](https://tanstack.com/ai/latest/docs/advanced/middleware), [devtools](https://tanstack.com/ai/latest/docs/getting-started/devtools))

Use it as an execution substrate, not the product policy:

- Put plan/retrieval/evidence state in request-scoped context.
- Add middleware/tool wrappers that log and cap total and per-turn calls.
- Do not stream final prose to the UI until the first valid result/evidence event for evidence-required turns. Stream status and result sets immediately; buffer prose until validation.
- Keep the current six-turn ceiling, but add a cumulative tool-call budget and per-turn fan-out cap.
- Use the devtools locally during development, then persist a privacy-conscious trace schema for production diagnostics.
- Consider code-mode or autonomous orchestration only for genuinely complex, multi-Save research tasks; simple search should remain a fixed workflow.

## Observability

Log one local trace per turn with redaction controls:

- route and confidence
- raw, literal, and semantic query
- scope and filters
- index coverage and model versions
- per-channel candidates, ranks, and scores
- fused and reranked order
- tool calls, failures, retries, and stop reason
- evidence IDs made available and citations emitted
- model/provider/version, latency by stage, token/cost usage where available
- validation outcome and user feedback

TanStack AI's devtools can inspect run timelines, tool inputs/outputs, memory recall, state snapshots, and errors; its debug logging exposes provider, output, middleware, tool, and agent-loop events. ([TanStack devtools](https://tanstack.com/ai/latest/docs/getting-started/devtools), [debug logging](https://tanstack.com/ai/latest/docs/advanced/debug-logging))

Production traces should be local by default because the data is a personal library. Add an explicit export action for bug reports rather than silently uploading prompts or Save content.

## Prompt-injection and data-boundary defenses

Pond's current system prompt correctly labels Save text as untrusted, but prompting is one layer, not a security boundary. OpenAI's instruction-hierarchy research identifies the root problem: models can mistake lower-trust content for authoritative instructions. OpenAI describes prompt injection as an open security challenge requiring layered defenses, and reports that instruction-hierarchy training improves but does not eliminate susceptibility. ([Instruction Hierarchy](https://openai.com/index/the-instruction-hierarchy/), [prompt-injection overview](https://openai.com/index/prompt-injections/))

Enforce these boundaries in code:

- Retrieved Save text is data only. Delimit it and never concatenate it into system/developer instructions.
- The planner sees user text and trusted app state, not retrieved document bodies.
- Retrieval results cannot request tools, alter scope, write memory, or change the plan.
- Models receive the minimum tool set for the routed intent. Lookup mode has no mutation-capable tool.
- Search/read tools enforce Library scope server-side; model arguments cannot widen it.
- Every citation and proposed mutation references IDs already admitted into the turn's evidence set.
- Keep human review for writes. Never turn “Apply” into a model decision.
- Run an independent injection detector/monitor as defense in depth, but do not treat a classifier as a proof of safety.
- Add adversarial Saves to evals: “ignore previous instructions,” fake system prompts, fake tool JSON, fake Save IDs, data-exfiltration requests, and content that asks to remember or mutate something.

## Evaluation program

Competence must be a release gate, not a vibe. OpenAI recommends eval-driven development, task-specific tests that mirror production traffic, logging everything, continuous evaluation, and combining metrics with calibrated human judgment. Anthropic similarly recommends specific/measurable criteria and code-based grading when possible. ([OpenAI eval guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices), [Anthropic eval guidance](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests))

### Dataset

Start with a checked-in, privacy-safe fixture library containing text, images, multi-image Saves, videos, OCR-only items, sparse metadata, duplicate items, and adversarial content. Build at least these prompt slices:

- terse: `kanye pics`, `kubrick stuff`, `recent vids`
- explicit: `find my saved brutalist houses`
- paraphrase: `things that feel like 1970s Italian horror`
- exact: usernames, quotes, URLs, product codes
- multimodal: named people, objects, colors, composition, screenshots, OCR
- conversation: `show more`, `only videos`, `compare the first two`, `organize those`
- general chat/greetings that must not search
- no-result and near-miss queries
- injection and unauthorized-mutation attempts

Continuously add sanitized production failures and thumbs-down turns. Do not let all examples be model-generated.

### Metrics and gates

| Layer | Primary measures | Required invariant |
|---|---|---|
| Router | intent exact match, query/entity preservation, media/filter F1, unnecessary clarification rate | every clear Library request routes to Library work |
| Tool policy | required-tool compliance, argument accuracy, retry count | 0 evidence-required answers without evidence |
| Retrieval | Recall@K, MRR, nDCG@10, no-result precision, per-modality coverage | golden Save appears in the accepted top-K |
| Reranking | nDCG/MRR delta over fused baseline | cannot regress key query slices |
| Generation | claim-level citation precision/recall, faithfulness, answer relevance, result-set correctness | cited IDs are always in evidence set |
| Safety | injection success, scope violations, unauthorized writes, memory poisoning | 0 unauthorized mutations or scope escapes |
| Operations | p50/p95 stage latency, index coverage, stale-vector rate, tool/model errors | deterministic fallback remains useful |

RAGAS separates context relevance, answer faithfulness, and answer relevance; ARES adds calibrated lightweight judges with a small human-labeled set. Use those ideas, but keep deterministic checks for routing, IDs, citations, and permissions. ([RAGAS](https://aclanthology.org/2024.eacl-demo.16/), [ARES](https://arxiv.org/abs/2311.09476))

Run the same suite across every supported provider/model and with Minnow. Record accuracy, latency, and cost. Promote defaults only when they clear the same contract.

## Prioritized delivery plan

### P0 — stop obviously wrong answers

1. Move the structured planner in front of every provider.
2. Make Library-surface bare noun phrases search by default.
3. Parse `pics/photos/images/videos/articles` into media constraints rather than query terms.
4. Execute required retrieval in app code and add the evidence gate.
5. Add the exact regression `kanye pics -> search(query="kanye", media=["image"])` for every provider path.
6. Buffer/reject unsupported refusals and answers when evidence is required.

This phase alone prevents the screenshot's failure mode.

### P1 — connect the Assistant to Pond's real search

1. Extract the existing FTS5 query/ranking path into a shared main-process retrieval service.
2. Search all indexed fields already present: tags, captions, OCR, transcripts, notes, and metadata.
3. Return ranked explanations/excerpts and use the same service in Library UI and Assistant.
4. Add scope/media/date filters and deterministic result rendering.

### P2 — hybrid and visual search

1. Expose local text-query embeddings to the main retrieval service.
2. Add the matching CLIP/SigLIP text encoder for stored image embeddings.
3. Run lexical, text-dense, and visual-dense retrieval; fuse with RRF.
4. Validate vector model/version/dimension and surface enrichment/index coverage.
5. Re-index multiple images per Save rather than only the representative image.

### P3 — deep retrieval quality

1. Add chunk-level article/transcript/frame indexing with provenance.
2. Add contextualized chunk text.
3. Add a local reranker.
4. Add history-aware query rewriting while retaining the literal query branch.
5. Build timestamped multi-frame video search.

### P4 — continuity, quality policy, and operations

1. Add explicit scoped memory with provenance and user controls.
2. Add model capability registry and eval-selected defaults.
3. Add local traces, devtools integration, feedback capture, and continuous cross-provider evals.
4. Add injection monitors and adversarial regression suites.

### P5 — only after eval evidence

Add multi-step research, evaluator-optimizer loops, or orchestrator/worker behavior for tasks such as “analyze everything I saved about X and propose a taxonomy.” Search, lookup, filtering, and ordinary summary should remain fixed workflows.

## Definition of “smart” for Pond

The smartest Pond Assistant is not the one that improvises most. It is the one that:

- correctly infers the user's likely Library intent from natural shorthand;
- retrieves across every modality and preserves exact matches;
- can explain which local evidence supports its answer;
- never invents a Save, citation, or library action;
- remembers only what it is allowed to remember;
- behaves consistently across model providers;
- exposes enough trace data to turn every failure into a regression test;
- uses a frontier model where reasoning adds value, while keeping routing, retrieval, permissions, and evidence under application control.

That design makes the model a strong reasoner over Pond's world instead of asking it to guess whether Pond's world exists.
