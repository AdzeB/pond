# TanStack AI across Pond

Audited 6 September 2026 against working tree based on `aed38469`, including the existing uncommitted provider/settings work. Research only; no application code or dependency changes.

## Recommendation

Use TanStack AI more deeply for model execution, typed tools, structured results and run lifecycle events. Start with the packages already installed. Keep Pond responsible for library semantics, credentials, model visibility, local inference, chat storage and reviewed changes.

The highest-value changes are a model catalog that works before connection, the dedicated compatible-endpoint adapter, typed query-plan output, and middleware for tool activity. A client-runtime consolidation and token-aware compaction deserve separate experiments. Installing every adapter, replacing assistant-ui, or moving chat storage does not currently have a demonstrated payoff.

“Adopt now” below means recommended next implementation, not a change made by this audit. Effort is relative: small is a contained interface change; medium spans producer/consumer boundaries; large requires state or data migration. No bundle-size or performance savings are claimed without a build measurement.

## Evidence and release boundaries

Installed package manifests and source take precedence over the moving `latest` docs. Offline imports verified runtime exports, not live provider behavior. Public npm metadata verified the additional releases listed below. GitHub `main` and current docs describe upstream behavior but are not proof that Pond has it.

| Package | Installed | Role |
|---|---:|---|
| `@tanstack/ai` | 0.52.0 | Main-process model and tool execution |
| `@tanstack/ai-openai` | 0.22.3 | OpenAI and current compatible endpoints |
| `@tanstack/ai-anthropic` | 0.18.3 | Anthropic |
| `@tanstack/ai-gemini` | 0.26.4 | Gemini |
| `@tanstack/ai-ollama` | 0.10.3 | Local Ollama server |
| `@tanstack/ai-react` | 0.22.4 | Declared; no application source imports found |
| `@tanstack/ai-client` | 0.29.2 | Installed transitively through the React package |
| `@assistant-ui/react` | 0.15.17 | Active assistant presentation/external-store integration |
| `@huggingface/transformers` | 4.2.0 | Existing local inference engine |

Offline imports confirmed `chat`, `embed`, `rerank`, `generateImage`, `generateSpeech`, `generateTranscription`, `summarize`, `createModel`, `extendAdapter`, `memoryStream`, `replayRunStream`, `defineInterrupt` and `createInterruptBinding`. The OpenAI compatible subpath exports `openaiCompatible` and `openaiCompatibleText`.

Additional published packages are real, but their current releases target core `^0.53.0`, whereas Pond has 0.52.0: persistence 0.5.6, memory 0.1.10, compaction 0.1.1 and durable-stream 0.1.10. Treat adopting these as a coordinated upgrade task; do not assume the latest add-on can simply be installed alongside the current core. These are pre-1.0 releases, not automatically experimental features, and compatibility must be checked per release. [Published persistence](https://registry.npmjs.org/@tanstack%2fai-persistence/latest), [memory](https://registry.npmjs.org/@tanstack%2fai-memory/latest), [compaction](https://registry.npmjs.org/@tanstack%2fai-compaction/latest), [durable stream](https://registry.npmjs.org/@tanstack%2fai-durable-stream/latest).

An important exception is the new React UI migration: Pond's 0.22.4 has neither the `./ui` export nor `createChatHook`. Current migration documentation describes a forthcoming minor-release change. This audit does not recommend it as installed functionality. [UI migration](https://tanstack.com/ai/latest/docs/migration/create-ui).

## Ownership

| TanStack can own | Pond must still own |
|---|---|
| Provider protocol normalization and model calls | Which providers may run, credential storage and endpoint trust |
| Tool iteration, schemas, protocol events and interrupts | Tool behavior, library scope, evidence correctness and mutation authorization |
| Generic client message/run state, if adopted | Electron IPC authorization, persistence authority and UI-specific metadata |
| Compaction or persistence mechanisms through adapters | Existing data migration, retention, deletion and recovery policy |
| Calls to embedding, speech or image services | Local model execution, downloaded weights, indexing and enrichment scheduling |
| Importing external MCP tools | Serving Pond's library through MCP |

This boundary follows the implementation: `main/core/agent/complete.ts` already calls TanStack `chat`; its surrounding planner, evidence checks and review workflow are Pond behavior. There is no second independent model loop to replace wholesale.

## Capability matrix

Paths in the following tables are relative to `apps/desktop/src` unless prefixed with a package name. Each decision combines inspected local behavior with the linked public API.

| Capability | Pond implementation | TanStack surface and release status | Decision and practical effect |
|---|---|---|---|
| Provider routing | `main/core/agent/adapter.ts`, `provider-models.ts` | Installed `AnyTextAdapter`, provider factories | **Keep Pond's implementation** for selection; TanStack already owns execution |
| Custom endpoints | `adapter.ts` casts arbitrary IDs into OpenAI catalog types | Installed `openaiCompatibleText`, `openaiCompatible` | **Adopt now**, small; remove inappropriate catalog casts without another dependency |
| Unknown named-provider model | Catalog casts in `adapter.ts` | Installed `createModel`, `extendAdapter` | **Adopt now** where needed; declare known capabilities and preserve arbitrary IDs |
| Browse models before credentials | Settings model checklist is connection-dependent | Installed provider catalog exports | **Adopt now**, small/medium; populate settings offline before verification |
| Live model discovery | `main/core/agent/keys.ts` provider-specific fetches | No uniform live `listModels` API found in reviewed adapter interfaces | **Keep Pond's implementation**, add cache and distinguish discovery from validity |
| Model visibility | `shared/provider-models.ts`, preference maps | Catalogs describe models; not user preferences | **Keep Pond's implementation**; persist selected IDs separately from provider enablement |
| Credentials | `main/keychain.ts`, `agent/keys.ts` | Installed BYOK definitions/client hooks | **Keep Pond's implementation**; browser BYOK defaults do not improve desktop ownership |
| Agentic loop | `complete.ts`: `chat`, `toolDefinition(...).server`, `maxIterations(16)` | Already installed and used | **Keep Pond's implementation** around this existing TanStack loop |
| Generic tool lifecycle | `agent/tool-steps.ts` wraps executions | Installed `ChatMiddleware` tool/usage/error hooks | **Adopt now**, medium; remove generic wrapping, retain labels and domain results |
| Typed tools | Generic `ToolSpec` and per-tool Zod parsing | Installed `toolDefinition` input/output schemas | **Adopt now**, medium; strengthen boundary rather than duplicate validation machinery |
| Text delivery | `complete.ts` buffers text, validates, then emits once | Installed AG-UI events and client stream handling | **Evaluate later** for incremental display; current buffering preserves final-answer validation |
| Cancellation | `agent/chat.ts` active runs/request IDs/AbortController | Installed `chat` cancellation, client `stop()` | **Keep Pond's implementation** in main; client can simplify renderer callbacks |
| Structured query plan | `main/core/ai/index.ts` extracts JSON between braces | Installed `chat({ outputSchema })` | **Adopt now**, small; remove string extraction, retain `parseQueryPlan` domain checks |
| Citation and scope checks | `agent/output.ts`, `context.ts`, planner/evidence logic | Schema validation cannot prove factual grounding | **Keep Pond's implementation** |
| Clarifying questions | Persisted question metadata plus a subsequent turn | Installed `defineInterrupt`, `createInterruptBinding` | **Evaluate later** for continuation of the same run; not a trivial replacement |
| Review/apply/undo | `agent/review.ts`, persisted proposals and stale-value checks | Tool approval/interrupt APIs gate execution | **Keep Pond's implementation**; gating does not supply diffs, transactions or undo |
| Renderer runtime | `features/agent/state/assistant.ts` and custom IPC | Installed `useChat`, custom `ConnectionAdapter` | **Evaluate later**, medium/large; demonstrate reduced state plumbing first |
| Chat components | `assistant-runtime.ts` uses assistant-ui `useExternalStoreRuntime` | Installed TanStack hooks are headless; new UI export not installed | **Keep Pond's implementation** and assistant-ui for now |
| Chat persistence | `agent/persist.ts`, SQLite/Drizzle messages/chats | Additional `withPersistence` and custom store adapter | **Evaluate later**, large; preserve row IDs and Pond metadata |
| Renderer reconnect | Main run map is memory-only | Installed `memoryStream`, `replayRunStream` | **Evaluate later**, medium; event replay can recover delivery while main survives |
| Process-crash recovery | No durable execution journal identified | Additional durable-stream/persistence mechanisms | **Evaluate later**, large; replay does not restart provider computation by itself |
| Context budget | Last 24 messages and character limits | Additional `withCompaction` strategies | **Evaluate later**, high priority; deterministic eviction first, full transcript retained |
| Cross-chat memory | No general memory; explicit library context | Additional `memoryMiddleware` and storage adapters | **Evaluate later** as an opt-in feature, not ordinary chat storage |
| Usage/latency/errors | Custom tool timing; most usage discarded | Installed middleware, optional OTel subpath | **Adopt now** for local metadata; tracing exporter only if required |
| Generic tool cache | Reads depend on current library/scope | Installed `toolCacheMiddleware` | **Not useful** as a global cache; scope-aware request-local caching only if measured |
| Text embeddings | `main/core/query-embeddings.ts`, renderer inference worker | Installed `embed`, provider embedding factories | **Keep Pond's implementation** by default; optional Ollama/service backend later |
| Visual embeddings | CLIP text/vision and versioned vectors | Multimodal embedding adapters call other models | **Keep Pond's implementation**; vector-space changes require reindexing |
| Reranking | Cosine similarity and reciprocal-rank fusion | Installed `rerank`; additional Cohere/OpenRouter adapter | **Evaluate later** on a local retrieval benchmark before remote data access |
| Caption/OCR/Whisper | Renderer Florence/Whisper inference | Chat vision and `generateTranscription` call supported providers | **Keep Pond's implementation**; optional remote quality path is a new feature |
| TTS/image/audio/video generation | No corresponding feature established by this audit | Installed activity functions; adapters vary | **Not useful** to current cleanup; evaluate only for a defined product feature |
| External MCP consumption | No general host integration identified | Core MCP types installed; additional `ai-mcp` client | **Evaluate later** if users need external tools |
| Pond MCP exposure | `agent/mcp.ts` `McpServer` and stdio transport | Client-side MCP adapters solve the opposite direction | **Keep Pond's implementation** and official MCP SDK |
| Skills and code execution | Domain tools and system guidance | Additional portable skills, coding harnesses and sandbox packages | **Evaluate later** separately; no requirement for provider settings |
| Fetch scheduling/downloads | Pond background and source infrastructure | AI orchestration is not a persistent source scheduler | **Not useful** as a replacement |

Runtime references: [middleware](https://tanstack.com/ai/latest/docs/advanced/middleware), [structured output with tools](https://tanstack.com/ai/latest/docs/structured-outputs/with-tools), [interrupts](https://tanstack.com/ai/latest/docs/interrupts/generic), [client API](https://tanstack.com/ai/latest/docs/api/ai-client), [persistence](https://tanstack.com/ai/latest/docs/persistence/overview), [resumable streams](https://tanstack.com/ai/latest/docs/resumable-streams/overview), [compaction](https://tanstack.com/ai/latest/docs/advanced/compaction), [memory](https://tanstack.com/ai/latest/docs/memory/overview).

## Adapter comparison

An adapter is not a free new model or inference engine. Direct adapters call providers; gateways add a routing service; local-server adapters require a running server; harness adapters run another agent's loop. Model capabilities differ by selected model and endpoint, even when all return the same event format.

The published versions below were checked through the official npm registry on the audit date. They are not installed unless marked. Current additional adapters generally require core `^0.53.0`; select and verify a compatible package set before adoption. Electron suitability is an architectural assessment, not an end-to-end certification: HTTP adapters fit the existing main process; CLI/container adapters have additional packaging and lifecycle requirements.

| Adapter/package suffix (`@tanstack/ai-…`) | Status/version | Auth and model boundary | Benefit/cost for Pond |
|---|---|---|---|
| `openai` | Installed 0.22.3 | Explicit API key; Responses or Chat Completions, differing model support | Keep; preserve API choice during migration |
| `anthropic` | Installed 0.18.3 | Anthropic key and Claude catalog; separate Vertex entrypoint exists | Keep; provider-specific features remain explicit |
| `gemini` | Installed 0.26.4 | Gemini API key and model catalog | Keep; not interchangeable with Google Cloud ADC |
| `ollama` | Installed 0.10.3 | Configured local server; models must actually be installed | Keep; no bundled inference server or weights |
| `openai/compatible` | Installed subpath | `baseURL`, key as required, arbitrary model IDs; explicit Chat Completions/Responses | Adopt now for LM Studio/custom; no new package |
| `grok` | Published 0.18.4 | xAI service credentials/catalog | Evaluate on user demand; additional remote provider |
| `groq` | Published 0.7.4 | Groq service credentials/catalog | Evaluate on user demand |
| `mistral` | Published 0.6.1 | Mistral credentials; chat/embedding activity selection | Evaluate on user demand |
| `cohere` | Published 0.4.1 | Cohere credentials; dedicated embedding/rerank support | Evaluate for measured retrieval improvement |
| `byteplus` | Published 0.3.4 | BytePlus service credentials/model availability | Evaluate on user demand |
| `vertex` | Published 0.2.9 | Project/location and ADC/service account; `vertexText` | Enterprise hosting option; extra auth setup |
| `bedrock` | Published 0.3.7 | AWS credentials/SigV4 for Converse; API modes differ in model coverage | Enterprise option; AWS dependencies/configuration |
| `openrouter` | Published 0.19.8 | Gateway key; provider-qualified model IDs | Useful optional breadth; another remote operator |
| `vercel-gateway` | Published 0.2.8 | Gateway API key or Vercel OIDC; creator/model IDs | Optional routing; desktop should use explicit credentials |
| `lovable` | Published 0.2.4 | Lovable gateway authentication/model offering | Not useful now; no identified Pond need |
| `llmgateway` | Published 0.1.6 | Gateway key; optional self-hosted base URL | Evaluate for existing gateway users |
| `cloudflare` | Published 0.1.0 | Workers AI service/deployment configuration | Not useful now; no local-inference replacement |
| `elevenlabs` | Published 0.4.1 | Service key; supported speech/media activities | Evaluate only with a voice feature |
| `fal` | Published 0.13.4 | Service key and generation models | Not useful for current library/settings work |
| `perplexity` | Published 0.2.9 | Search/grounding service | External search feature; not a Sonar chat replacement |

Provider-specific evidence: [OpenAI](https://tanstack.com/ai/latest/docs/adapters/openai), [compatible endpoints](https://tanstack.com/ai/latest/docs/adapters/openai-compatible), [Ollama](https://tanstack.com/ai/latest/docs/adapters/ollama), [Vertex](https://tanstack.com/ai/latest/docs/adapters/vertex), [Bedrock](https://tanstack.com/ai/latest/docs/adapters/bedrock), [OpenRouter](https://tanstack.com/ai/latest/docs/adapters/openrouter), [Vercel gateway](https://tanstack.com/ai/latest/docs/adapters/vercel-gateway), [LLM Gateway](https://tanstack.com/ai/latest/docs/adapters/llmgateway), [Cloudflare](https://tanstack.com/ai/latest/docs/adapters/cloudflare), [adapter index](https://tanstack.com/ai/latest/docs/getting-started/overview). Published metadata follows `https://registry.npmjs.org/@tanstack%2fai-{suffix}/latest`; these URLs are moving snapshots, so versions above record the observation.

No blanket adapter installation is recommended. Preserve lazy imports in main and measure production bundle changes per addition. Cloud providers/gateways need a network and account access; local endpoints can operate offline with their server and models available. A custom endpoint can also be remote, so “compatible” must not be labeled “local” unconditionally.

### Coding agents, sandboxes and skills

| Published harness | Version | Factory and authentication | Assessment |
|---|---:|---|---|
| `ai-claude-code` | 0.6.4 | `claudeCodeText`; API key or explicit host CLI login mode | Separate coding workflow |
| `ai-codex` | 0.5.4 | `codexText`; `CODEX_API_KEY` or host login mode | Separate coding workflow |
| `ai-grok-build` | 0.5.4 | `grokBuildText`; xAI key or host login mode | Separate coding workflow |
| `ai-opencode` | 0.4.4 | `opencodeText`; process credentials; no equivalent `authMode` flag | Separate coding workflow |
| `ai-acp` | 0.3.9 | `acpCompatible`/`acpCompatibleText`; configured protocol authentication | Integration with an ACP agent, not a provider catalog |

These adapters use a harness's own execution loop and require sandbox integration. `ai-sandbox` 0.5.6 adds workspace/lifecycle responsibilities; published providers include local-process, Docker, Daytona, Vercel and Sprites. Local-process is **not isolation**. Container/cloud choices add runtime or service dependencies. Neither CLI login nor filesystem access should become an implicit fallback for normal chat. [Harnesses and auth](https://tanstack.com/ai/latest/docs/sandbox/harnesses), [sandbox providers](https://tanstack.com/ai/latest/docs/sandbox/providers), [Codex adapter](https://tanstack.com/ai/latest/docs/adapters/codex).

Portable `ai-skills` 0.1.2 offers `withSkills`, `inlineSkill` and resource loading. It does not itself execute scripts. Provider-hosted skills and code execution tools run in a different environment and have different data boundaries. Code Mode/isolate drivers likewise need their own execution policy; they are not necessary to improve Pond's existing typed library tools. **Evaluate later** only for a defined workflow. [Portable skills](https://tanstack.com/ai/latest/docs/skills/agent-skills), [provider skills](https://tanstack.com/ai/latest/docs/tools/provider-skills).

Published `ai-mcp` 0.3.9 supplies `createMCPClient` and managed `chat({ mcp: … })` consumption, including a stdio entrypoint. Keep this in main if adopted. Pond's existing MCP server exposes search/read/grep/folder/open/filter operations to other applications. Keep that server and its SDK: importing tools and exporting a library are separate directions. [MCP](https://tanstack.com/ai/latest/docs/tools/mcp).

## Provider settings: the concrete design

The installed catalogs can populate settings without a key or network. Offline imports returned:

| Export | Count | Meaning |
|---|---:|---|
| `OPENAI_CHAT_MODELS` | 51 | Bundled known OpenAI IDs |
| `ANTHROPIC_MODELS` | 12 | Bundled known Anthropic IDs |
| `GeminiTextModels` | 11 | Bundled known Gemini IDs |
| `OllamaTextModels` | 212 | Known Ollama names, not locally installed models |

Public exports are visible in the provider package indexes: [OpenAI](https://github.com/TanStack/ai/blob/main/packages/ai-openai/src/index.ts), [Anthropic](https://github.com/TanStack/ai/blob/main/packages/ai-anthropic/src/index.ts), [Gemini](https://github.com/TanStack/ai/blob/main/packages/ai-gemini/src/index.ts), [Ollama](https://github.com/TanStack/ai/blob/main/packages/ai-ollama/src/index.ts). The counts above come from installed code, not those moving upstream files.

Recommended behavior:

1. Show known cloud models immediately. Keep provider enablement, credentials, model visibility and current assistant selection as separate state.
2. Merge a cached live catalog when available; retain custom IDs and visibility settings on failure. Distinguish known, discovered and user-entered records internally.
3. For Ollama/LM Studio, label installed/available models using server discovery, rather than treating the bundled catalog as installed inventory. Offline browsing must not imply a runnable model. [Ollama tags](https://docs.ollama.com/api/tags), [LM Studio model listing](https://lmstudio.ai/docs/developer/rest/list).
4. Cache by provider, normalized endpoint and credential revision/account identity. Never put raw keys in cache keys. Refresh in the background; invalidate on endpoint/account changes. A credential change must not reuse another account's access claims.
5. Keep selected IDs on temporary errors and provide a clear unavailable state. Preserve the existing distinction between an undefined visibility preference and an explicit empty list.

`checkProviderKey` currently validates via the same model-list request. That couples “can enumerate” to “can chat.” A custom endpoint may support chat without implementing model enumeration. Separate these outcomes; do not automatically declare a key invalid or erase models after a discovery failure. Successful enumeration also does not guarantee every listed model supports tools or images.

The SDK's type-level capability maps help code compiled against known model IDs. They are not a universal live account-entitlement or runtime capability service. OpenAI has richer internal `model-meta.ts` data, but no verified uniform public runtime catalog for all providers was established. Avoid unsupported deep imports. Use public IDs now; add a separate catalog dependency only when concrete metadata requirements justify it. [Model extension](https://tanstack.com/ai/latest/docs/advanced/extend-adapter), [OpenAI metadata source](https://github.com/TanStack/ai/blob/main/packages/ai-openai/src/model-meta.ts).

BYOK helpers (`defineByok`, provider `/byok` definitions, `useByok`) offer key-state/storage/relay conventions. Their browser storage defaults and header relay are not a reason to move Pond keys into the renderer. Keep main-process ownership. The current secret store uses Electron `safeStorage` when available, with an explicit plaintext/base64 fallback when unavailable; it is not unconditionally OS-encrypted storage. TanStack cannot remove that platform policy decision. [BYOK](https://tanstack.com/ai/latest/docs/advanced/byok).

## Runtime, data and context implications

There are not two active chat engines. Pond runs TanStack in main and presents its own state through assistant-ui's external-store runtime. The declared `ai-react` dependency is not currently powering that state. A useful experiment is to carry standard events across IPC into one TanStack client, then adapt that client into the existing visuals. Replacing both UI and state at once would obscure whether any simplification was achieved.

Retain Pond's request IDs, cancellation ownership, source/result metadata and review executor. Tool approval waits for consent; it does not implement per-change diffs, stale-value detection, Apply, Undo or command history. Structured output validates shape, not whether cited library evidence supports a claim.

`withPersistence` would require a storage adapter and a decision about full-thread writes versus Pond's append-oriented rows. Preserve `sources`, `changes`, `question`, `results`, `steps`, stopped/error metadata and stable IDs. Browser persistence is not a replacement for the authoritative local database. Keep old-chat reading supported throughout any migration. [Chat persistence](https://tanstack.com/ai/latest/docs/persistence/chat-persistence).

For recovery, first distinguish renderer reload from main-process death. An in-memory event log can replay the former while a run continues. The latter requires durable run state and a policy for interrupted provider calls and side effects. Neither transcript storage nor replay alone guarantees exactly-once execution.

Compaction is the strongest additional-package candidate: `withCompaction`, `evictOldest`, `clearToolResults` and `summarizeOldest` can replace crude truncation. Begin with deterministic strategies, include system/retrieval budgets and retain the canonical transcript. Summarization adds model calls and must use the user's chosen access policy. Cross-chat memory is a separate, deletable and scoped feature, not an automatic hosted service.

Middleware can capture usage, durations and errors locally. OTel is available through `@tanstack/ai/middlewares/otel`, with an optional OpenTelemetry dependency. Do not add an exporter or prompt capture by default. [OTel](https://tanstack.com/ai/latest/docs/advanced/otel), [built-in middleware](https://tanstack.com/ai/latest/docs/advanced/built-in-middleware).

## Search and enrichment

Pond already performs actual inference through Transformers.js: Florence caption/OCR, Whisper transcription, text embeddings and CLIP. `features/enrichment/lib/inference-core.ts` selects WebGPU with WASM fallback; worker/client modules manage execution. `main/core/query-embeddings.ts` independently handles query vectors, normalization, model caches and rank fusion. Enrichment sidecars preserve derived fields and model provenance.

TanStack `embed` can call an Ollama embedding server or a remote provider. It does not execute the existing Transformers models, download their weights, maintain Pond's vector index, or ensure document/query vectors share the same model. Keep model/version/dimension identity in any future backend interface and require explicit reindexing on incompatible changes. Initial model downloads may need a network; the current local engine is not a guarantee of first-run offline availability. [Embeddings](https://tanstack.com/ai/latest/docs/embeddings).

`rerank` can reorder retrieved candidates via supported adapters such as Cohere or OpenRouter. That is an optional quality/latency/cost tradeoff, not a replacement for retrieval or an automatic improvement. Benchmark against Pond's current rank fusion, limit the candidate set and require explicit permission in product settings before sending library content externally. [Reranking](https://tanstack.com/ai/latest/docs/rerank/rerank).

Vision chat and transcription APIs are useful optional provider-backed paths. Keep local inference, media decoding limits, worker lifecycle, enrichment queues, sidecars and provenance. Image/audio/video generation and realtime voice are feature opportunities, not simplifications of today's harvesting or search implementation.

## Ranked simplifications and dependency impact

| Rank | Next change | Concrete replacement | Effort / dependency impact | Acceptance evidence |
|---:|---|---|---|---|
| 1 | Model browsing independent of connection | Public model arrays + cached Pond discovery | Medium; no new catalog dependency required | Models visible before credentials; discovery failure retains choices |
| 2 | Compatible endpoint typing | `openaiCompatibleText` instead of casted `createOpenaiChatCompletions` | Small; no new dependency | Custom IDs and LM Studio still use correct base URL/API |
| 3 | Query-plan extraction | `chat({ outputSchema })` instead of brace slicing | Small; no new dependency | Valid typed plans; unsupported/refused/malformed outputs fail safely |
| 4 | Tool lifecycle and contracts | Middleware hooks + typed `toolDefinition` | Medium; remove generic wrappers, no new package | Activity ordering/errors/cancellation unchanged |
| 5 | Context budgets | `withCompaction` strategies | Medium; add compaction and coordinated compatible upgrade | Paired tool messages and scoped evidence survive pruning |
| 6 | Renderer state experiment | `useChat`/ConnectionAdapter feeding assistant-ui | Medium/large; existing package can be used | Fewer state transitions with full behavior parity |

No existing dependency is proven removable solely by this audit. `@tanstack/ai-react` is a cleanup candidate if the client experiment is rejected; verify dynamic/gallery entries with Knip before removal. Keep assistant-ui, Transformers.js, SQLite/Drizzle and the MCP SDK. Additional providers add their own SDK/network/configuration surface; lazy importing limits startup work but is not proof of a smaller shipped application.

## Phased implementation roadmap

### Phase 1: installed APIs only

Introduce a main-owned catalog result with models, provenance, refresh status and discovery error separated from credential status. Preserve existing provider IDs and preference maps. Return sanitized model metadata through the existing typed IPC boundary; credentials stay in main. Cache discovery without a schema-breaking replacement of settings.

Switch only LM Studio/custom execution to the compatible factory with explicit Chat Completions semantics. Convert natural-language query compilation to schema output while retaining domain parsing and null/error behavior. Convert generic tool lifecycle tracking to middleware; preserve domain labels and source/result payloads.

Regression scenarios: offline settings; no key; empty visibility list; endpoint without `/models`; stale cache; custom model not in bundled catalog; changed account; disabled provider; selected unavailable model; malformed/refused structured response; stop during tool; stale request cancellation; tool error and retry. No paid calls in offline tests.

### Phase 2: context reliability and a bounded runtime experiment

Review a coordinated package upgrade, then test deterministic compaction against the existing transcript without changing stored history. Define budget inputs for system prompt, retrieval and messages. Do not enable summarization implicitly.

In a separate experiment, define a typed IPC envelope containing run ID, sequence and a standard TanStack event plus Pond-specific metadata. Give either the TanStack client or Pond store sole ownership of generic message/run state. Continue rendering through assistant-ui. Compare deleted plumbing, first-text latency and behavior; reject the migration if complexity merely moves into an adapter.

Regression scenarios: thread switch while running; stop and immediately send; partial/error response; invalid final answer; tool call/result pairing after compaction; attachment/source scope; stale clarification; no duplicated turn on reconnect; unchanged review/apply/undo. Decide explicitly how incremental display interacts with final-answer validation.

### Phase 3: recovery only if needed

Add stable run/event records and an adapter over the existing database if reload recovery is a real requirement. Make migrations additive and preserve old transcripts and custom metadata. Replaying a delivery stream must not re-run a tool. Treat main crash recovery separately from renderer reconnect.

Regression scenarios: renderer reload mid-run; main crash after tool execution; repeated resume; old chat reopen; partial run cleanup; stale proposal application; undo after reopen; deletion removes associated run data. Native database checks must use Electron's ABI.

### Phase 4: optional capabilities

Choose individual additions from demand: OpenRouter or another provider, optional reranking, external MCP tools, local scoped memory, or coding/artifact workflows. Each requires its own credentials, data exposure, offline fallback and dependency review. Harnesses require an explicit workspace and execution boundary; memory requires deletion/scope behavior; remote enrichment requires explicit user control and provenance.

For any implementation phase, run the repository's documented `pnpm check` and `pnpm build`, with targeted offline regressions first. Use temporary libraries. Keep live-provider verification separate and opt-in. Measure main/renderer bundle effects and packaged Electron behavior rather than inferring them from web examples.

## Audit validation and limits

- Read installed manifests, public exports and relevant implementation modules; inspected the current working changes rather than only committed code.
- Ran offline Node imports for core activities, compatible factories and catalog counts. No model inference, credential access, provider calls, dependency installation or application edits were performed.
- Constructed `openaiCompatibleText('pond-offline-probe', { baseURL: 'http://127.0.0.1:9/v1', apiKey: 'local', api: 'chat-completions' })` offline. The adapter retained the arbitrary model ID and reported `openai-compatible`; no request was executed. This verifies factory acceptance, not endpoint compatibility.
- Checked current docs, upstream source and registry versions; recorded installed versus additional published versus future UI surfaces separately.
- Exact model entitlements, provider-specific structured-output behavior, packaged CLI/container compatibility and bundle savings need the phase-specific checks above. No live credentials or paid services were used to claim those results.
- This report proposes interfaces and experiments; it does not treat proposals as released TanStack APIs. Moving `latest` URLs may change after the audit date.
