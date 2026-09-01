# Provider-Independent Library Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Pond Assistant model reliably interpret terse Library requests, retrieve ranked multimodal evidence, and render grounded results before generating prose.

**Architecture:** A provider-independent planner runs before any model adapter. Evidence-required plans execute an app-owned `LibraryRetrievalService`, which combines FTS5, text-vector, and CLIP text-to-image candidates with reciprocal-rank fusion; the selected provider only writes over validated evidence. Lookup-only requests render deterministic result cards without requiring a model response.

**Tech Stack:** Electron, TypeScript, Vitest, Drizzle/better-sqlite3, SQLite FTS5, TanStack AI, Hugging Face Transformers, Zod.

---

The working tree contains extensive user-owned in-progress work, including untracked Assistant files. Commit steps are intentionally replaced with verification checkpoints so this implementation never stages or captures unrelated changes.

### Task 1: Verify the development baseline

**Files:**
- Verify: `apps/desktop/package.json`

- [ ] **Step 1: Launch the desktop app**

Run: `pnpm --filter @pond/desktop dev`

Expected: Electron main, preload, and renderer builds succeed; the app launches and logs the local API listener.

- [ ] **Step 2: Record non-blocking warnings**

Expected: The route warning for `routes/__root.test.ts` and background downloader failures do not prevent launch and are outside this feature scope.

### Task 2: Define and test the shared Assistant plan

**Files:**
- Create: `apps/desktop/src/main/core/agent/plan.ts`
- Create: `apps/desktop/src/main/core/agent/plan.test.ts`

- [ ] **Step 1: Write failing terse-query tests**

```ts
expect(planAssistantTurn({ latest: "kanye pics", hasSearch: true })).toMatchObject({
  intent: "search",
  query: "kanye",
  media: ["image"],
  requiresEvidence: true,
  directLookup: true,
});
expect(planAssistantTurn({ latest: "Hey", hasSearch: true })).toMatchObject({
  intent: "chat",
  requiresEvidence: false,
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `pnpm --filter @pond/desktop test -- src/main/core/agent/plan.test.ts`

Expected: FAIL because `planAssistantTurn` does not exist.

- [ ] **Step 3: Implement the strict plan contract**

```ts
export const assistantPlan = z.object({
  intent: z.enum(["chat", "search", "recent", "attachments", "clarify"]),
  query: z.string(),
  media: z.array(z.enum(["image", "video", "link", "text"])),
  requiresEvidence: z.boolean(),
  directLookup: z.boolean(),
  edit: z.boolean(),
});
```

The deterministic router must convert `pics/photos/images` to `media: ["image"]`, `vids/videos` to `media: ["video"]`, remove those nouns from the literal query, route explicit saved-Library phrases to search, and treat a short bare noun phrase on the Library surface as search.

- [ ] **Step 4: Run the focused test**

Expected: PASS for terse search, explicit search, recent, attachments, mutation, and ordinary chat cases.

### Task 3: Add app-owned retrieval and the evidence gate

**Files:**
- Modify: `apps/desktop/src/main/core/agent/complete.ts`
- Modify: `apps/desktop/src/main/core/agent/complete.test.ts`

- [ ] **Step 1: Add failing hosted and Minnow regressions**

```ts
it.each(["openai", "minnow"])("routes kanye pics through Library retrieval with %s", async (provider) => {
  const search = vi.fn().mockResolvedValue({ saves: [{ id: "portrait", title: "Kanye portrait", url: "https://example.com", source: "arena" }] });
  await completeWithTools({ ...request(), provider, messages: [{ role: "user", content: "kanye pics" }], tools: [tool("searchLibrary", search), tool("showSaves")] });
  expect(search).toHaveBeenCalledWith({ query: "kanye", media: ["image"], limit: 8 });
});
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `pnpm --filter @pond/desktop test -- src/main/core/agent/complete.test.ts`

Expected: FAIL because hosted providers can still skip search and the search input has no media filter.

- [ ] **Step 3: Execute required retrieval before provider dispatch**

Create one `planAssistantTurn` result at the start of `completeWithTools`. For `search` and `recent`, call `searchLibrary` in application code before loading any hosted adapter. Merge returned Saves with attachments and pass them through `evidence(...)`.

- [ ] **Step 4: Enforce the evidence invariant**

If a plan requires evidence, publishing is allowed only after the app-owned search completes. A completed zero-result search returns Pond-authored no-results copy; a missing search tool throws a scoped product error. The model never supplies the fallback.

- [ ] **Step 5: Run the focused tests**

Expected: PASS across hosted and Minnow paths, including exact `kanye pics`.

### Task 4: Render direct lookups without writer prose

**Files:**
- Modify: `apps/desktop/src/main/core/agent/complete.ts`
- Modify: `apps/desktop/src/main/core/agent/complete.test.ts`

- [ ] **Step 1: Test lookup-only rendering**

Assert that `kanye pics`, `find my film references`, and `recent saves` call `showSaves` with only retrieved IDs, return concise Pond-authored confirmation, and never call the hosted chat adapter or Minnow writer.

- [ ] **Step 2: Implement deterministic result rendering**

Use `showSaves` when available; otherwise use the existing `searchResults` Markdown fallback. Complex operations such as summarize, compare, explain, or organize continue to the selected writer with bounded evidence.

- [ ] **Step 3: Verify direct and complex paths**

Run: `pnpm --filter @pond/desktop test -- src/main/core/agent/complete.test.ts`

Expected: Direct lookups make zero writer calls; comparisons make one writer call after retrieval.

### Task 5: Build a shared ranked Library retrieval service

**Files:**
- Create: `apps/desktop/src/main/core/library-retrieval.ts`
- Create: `apps/desktop/src/main/core/library-retrieval.test.ts`
- Modify: `apps/desktop/src/main/core/agent/tools.ts`
- Modify: `apps/desktop/src/main/core/agent/context.ts`

- [ ] **Step 1: Test FTS query construction and media constraints**

```ts
expect(toFtsMatchQuery("Suspiria lighting", "all")).toBe('"Suspiria" AND "lighting"');
expect(normalizeMedia(["image", "image"])).toEqual(["image"]);
```

- [ ] **Step 2: Implement `LibraryRetrievalService.search`**

The service accepts `{query, media, source, folderId, limit}` plus the enforced conversation scope. It queries `saves_fts`, joins or filters against non-deleted scoped Saves, uses `bm25(saves_fts)`, and returns stable Save records with retrieval-channel metadata.

- [ ] **Step 3: Replace Assistant `LIKE` search**

`searchLibrary` delegates to the service so captions, OCR, transcripts, notes, tags, and metadata are searched with the same FTS substrate as the Library UI.

- [ ] **Step 4: Update the tool description and schema**

Add `media: z.array(z.enum(["image", "video", "link", "text"])).max(4).optional()` and describe the full indexed field set.

- [ ] **Step 5: Run retrieval and tool tests**

Run: `pnpm --filter @pond/desktop test -- src/main/core/library-retrieval.test.ts src/main/core/agent/tools.test.ts src/main/core/agent/context.test.ts`

Expected: FTS ranking, scope enforcement, media filtering, and no-result behavior pass.

### Task 6: Add hybrid text and visual retrieval

**Files:**
- Create: `apps/desktop/src/main/core/query-embeddings.ts`
- Create: `apps/desktop/src/main/core/query-embeddings.test.ts`
- Modify: `apps/desktop/src/main/core/library-retrieval.ts`
- Modify: `apps/desktop/src/main/core/library-retrieval.test.ts`

- [ ] **Step 1: Test cosine scoring and reciprocal-rank fusion**

```ts
expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
expect(reciprocalRankFusion([["exact", "shared"], ["visual", "shared"]])[0]?.id).toBe("shared");
```

- [ ] **Step 2: Implement lazy local query encoders**

Use the same text embedding checkpoint/version as stored Save embeddings. Use the matching CLIP text encoder and tokenizer for stored CLIP image vectors. Cache model promises, normalize vectors, validate dimension and model identity, and fail open to lexical search if local inference is unavailable.

- [ ] **Step 3: Add dense candidate channels**

Retrieve top text-vector and visual-vector candidates under the same hard scope/media filters. Never compare vectors from different checkpoints or dimensions.

- [ ] **Step 4: Fuse channels with RRF**

Fuse up to 50 FTS, 50 text, and 50 visual candidates using a fixed RRF constant. Use fused score first and recency only as a deterministic tie-breaker.

- [ ] **Step 5: Run hybrid tests without downloading models**

Inject fake query encoders and fixture vectors in tests. Verify lexical fallback when encoders throw.

### Task 7: Add retrieval provenance and observability

**Files:**
- Modify: `apps/desktop/src/main/core/library-retrieval.ts`
- Modify: `apps/desktop/src/main/core/agent/tool-steps.ts`
- Modify: `apps/desktop/src/main/core/agent/tools.test.ts`

- [ ] **Step 1: Return retrieval metadata**

Every hit includes `channels`, `score`, and model-version compatibility while the model-facing Save payload remains bounded and excludes raw vectors.

- [ ] **Step 2: Emit privacy-conscious diagnostics**

Log route, filters, channel counts, latency, and fallback reason. Do not log Save bodies, embeddings, credentials, or full user queries in production logs.

- [ ] **Step 3: Verify metadata cannot become model instructions**

Tests assert that retrieval metadata is not concatenated into system prompts and only admitted Save IDs can be shown or cited.

### Task 8: Upgrade and normalize model policy

**Files:**
- Modify: `apps/desktop/src/shared/assistant.ts`
- Modify: `apps/desktop/src/main/core/agent/complete.ts`
- Create: `apps/desktop/src/shared/assistant.test.ts`

- [ ] **Step 1: Define model capabilities**

Add model records for current recommended OpenAI, Anthropic, Gemini, Ollama, LM Studio, and compatible endpoints with `tools`, `structuredOutput`, `vision`, `local`, and `quality` metadata.

- [ ] **Step 2: Remove provider-specific behavioral assumptions**

Adapters only normalize transport and capabilities. Routing, retrieval, lookup rendering, and evidence validation remain outside adapters.

- [ ] **Step 3: Verify every model record resolves through an adapter**

Run the shared model-policy test and TypeScript typecheck.

### Task 9: Establish the competence release gate

**Files:**
- Create: `apps/desktop/src/main/core/agent/competence.test.ts`
- Modify: `apps/desktop/src/main/core/agent/complete.live.test.ts`

- [ ] **Step 1: Add deterministic fixture prompts**

Cover `kanye pics`, `kubrick stuff`, `recent vids`, explicit search, greetings, no-results, comparisons, attachments, and prompt injection stored inside a Save.

- [ ] **Step 2: Run the same behavioral contract across providers**

Mocked conformance tests must pass for Minnow, OpenAI, Anthropic, Gemini, Ollama, LM Studio, and compatible endpoints. Live tests remain opt-in with `POND_LIVE=1`.

- [ ] **Step 3: Run full verification**

Run:

```bash
pnpm --filter @pond/desktop test
pnpm --filter @pond/desktop typecheck
pnpm --filter @pond/desktop build
pnpm --filter @pond/desktop dev
```

Expected: Tests, typecheck, and build pass; Electron launches; `kanye pics` executes scoped image retrieval and renders real Saves without relying on provider tool choice.
