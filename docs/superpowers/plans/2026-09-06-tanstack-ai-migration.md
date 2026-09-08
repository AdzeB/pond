# TanStack AI Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make TanStack the owner of Pond's generic AI infrastructure while preserving local data and existing product behavior.

**Architecture:** TanStack provider factories, schemas, tool middleware and client events replace custom equivalents. Electron main remains the authority for credentials, library operations and storage; TanStack persistence integrates with that local store. Local inference engines remain actual execution backends rather than being replaced by remote services.

**Tech Stack:** TanStack AI, React, Electron IPC, SQLite/Drizzle, Zod, Transformers.js.

---

## Scope and completion criteria

This implements the user's direction following the full audit. The audit's conservative “evaluate later” recommendations for generic runtime and persistence are now migration targets. This does not enable new paid providers, external memory services or shell agents merely because adapters exist.

- [x] All model execution uses the public TanStack provider/compatible/extension APIs, with no model-catalog assertions.
- [x] Cloud model browsing uses TanStack catalogs before credentials, merged with live/custom models.
- [x] Structured query compilation uses schema output instead of extracting JSON from prose.
- [x] Tool lifecycle and generic run events use TanStack, preserving Pond's source/proposal metadata.
- [x] TanStack client owns generic chat message/run state over typed IPC.
- [x] TanStack persistence owns canonical transcript mechanics through an adapter over the local database; client/IPC owns generic run state, and old chat IDs and metadata remain readable.
- [x] TanStack compaction replaces arbitrary history truncation without deleting stored history.
- [x] Assistant presentation uses published `createChatUI`, preserving Pond's message components, composer interactions and scrolling.
- [x] Unused infrastructure is removed after behavior parity and documented checks.

## Independently testable work packages

| Order | Ownership | Files and verification boundary |
|---|---|---|
| 1 | Provider factories | `apps/desktop/src/main/core/agent/adapter.ts`; colocated real-factory construction tests with arbitrary IDs and endpoint normalization |
| 2 | Catalogs | New main-owned catalog module; `agent/keys.ts`; provider settings and chooser consume sanitized IPC results; offline browsing and saved visibility tests |
| 3 | Structured plans | `main/core/ai/index.ts` and a pure schema module; valid/invalid filter generation tested without credentials |
| 4 | Tool/run lifecycle | `agent/complete.ts`, `context.ts`, `tool-steps.ts`; errors, cancellation and review behavior tested before deleting wrappers |
| 5 | Client transport | Shared assistant contracts, preload and renderer assistant state; custom TanStack connection adapter; thread switching and cancellation tests |
| 6 | Local persistence | `agent/persist.ts`, database schema/migrations and custom TanStack store; additive migration and old-chat fixtures |
| 7 | Compaction | Completion context assembled through compatible released compaction APIs; paired tool messages and scope evidence tests |
| 8 | Presentation and cleanup | Assistant runtime/components, galleries and dependencies; maintain appearance, keyboard behavior and reduced motion |

Each package is implemented and verified before moving to its dependent package. Exact public types are read from the selected installed release at its boundary; do not copy the outdated TanStack skill examples or assume current website examples exist in the installed package.

## First executable change: provider factories

**Modify:** `apps/desktop/src/main/core/agent/adapter.ts`

**Create:** `apps/desktop/src/main/core/agent/adapter.test.ts`

- [x] Add tests constructing each provider with `model: 'pond-custom-model'`, fake keys and no invocation. Assert the returned adapter retains the model ID.
- [x] Assert Ollama's host normalizes a trailing `/v1`, and compatible endpoints reject missing configuration rather than routing a local request to OpenAI.
- [x] Run `pnpm --filter @pond/desktop exec vitest run src/main/core/agent/adapter.test.ts` and verify failing regression cases.
- [x] Replace each closed catalog assertion using the official extension factory:

```ts
const { createModel, extendAdapter } = await import('@tanstack/ai');
const factory = extendAdapter(createAnthropicChat, [
  createModel(modelId, ['text', 'image']),
]);
return factory(modelId, key);
```

Apply the same public extension API to OpenAI/Gemini; it forwards runtime-selected model IDs while keeping explicit main-owned credentials. These modality declarations preserve the existing image-capable call path and are not an entitlement check.

- [x] For LM Studio and custom endpoints use the public compatible subpath:

```ts
const { openaiCompatibleText } = await import('@tanstack/ai-openai/compatible');
return openaiCompatibleText(modelId, {
  api: 'chat-completions',
  apiKey: key || 'local',
  baseURL,
});
```

- [x] Run the adapter tests and TypeScript checks. Keep lazy provider imports. Inspect the diff to ensure keys are never logged or passed to renderer.

## Migration constraints and verification

Credentials, endpoint identity, provider enablement, catalog availability, selected models and visible models are distinct state. Discovery failure does not prove credentials invalid. Local model catalogs do not prove a model is installed. Custom endpoints are not necessarily local.

Preserve typed IPC authorization, chat/request IDs, source scope, proposal review, stale-value checks and undo. Stream replay must not repeat a tool or append a turn twice. Store the canonical transcript independently from the compacted model context. No cloud service becomes a fallback for local inference.

Use temporary libraries and offline provider/transport fixtures. Run `pnpm check` and `pnpm build` for the completed implementation, the documented Electron-ABI database checks for persistence, and Knip before removing dependencies. Live provider tests remain opt-in and separate.

## Completion — 2026-09-07

Implemented all migration boundaries for existing AI functionality. The original source audit remains at `docs/audits/2026-09-06-tanstack-ai-full-audit.md`; its recommendations describe the pre-migration state.

- Public provider factories, cloud catalogs, query caching, schema query output, middleware tool lifecycle and compaction replaced the previous equivalents.
- The Electron connection transports TanStack run/text events while main retains authorization and answer validation. A single `ChatClient` owns generic renderer state across pane/page remounts. Stop waits for the main request to settle before another send; cancellation during chat creation prevents dispatch.
- `createChatUI` replaces assistant-ui. Pond's composer, sources, questions, proposals and review components retain product behavior. The obsolete runtime bridge and assistant-ui dependency were removed.
- `defineMessageStore`, `defineAIPersistence` and `withPersistence` persist canonical tool transcripts through an additive SQLite column. Legacy visible rows and metadata remain unchanged. Reconciliation preserves tool pairs and validated replies. This is conversation persistence, not automatic resumption of tool execution after a process crash.
- Provider discovery now distinguishes authentication errors from HTTP/network failures, can browse local inventories before connection, and handles compatible endpoints without a model-list API. Custom credentials cannot fall back to OpenAI; Gemini credentials use headers.

Installed releases: core 0.53.0, React 0.24.0, client 0.31.0, persistence 0.5.6, OpenAI 0.22.5, Anthropic 0.18.5, Gemini 0.29.1, Ollama 0.11.1, compaction 0.1.1. The direct AG-UI event enum dependency matches core's exact `0.1.1-canary.beta.0` protocol dependency. No unrequested hosted gateway, memory store or coding-agent harness was enabled.

## Verification

Offline coverage includes real TanStack event consumption, request identity, cancellation and listener cleanup; stale history and pane remounts; old-chat hydration and metadata preservation; a real tool loop through persistence and compaction; custom model factories; provider discovery; and composer/scroll interactions. Native Electron tests use temporary libraries and the correct SQLite ABI. No paid model requests were used.

Final validation: `pnpm check` passed lint, custom rules, architecture, Knip, all package type checks and 1,482 desktop tests (22 skipped under Node). The separate Electron-ABI suite passed 13 database/vector/transcript tests, including the six transcript tests skipped under Node. Targeted client/facade checks passed after the final listener-cleanup adjustment. `pnpm build` passed every bundle budget: desktop main static graph 2,376.7 KiB and renderer initial JS/CSS 4,048.1 KiB, down approximately 620 KiB from the first migration stage. The documented desktop startup smoke check passed with a temporary library; a second smoke check navigated to the real Assistant page and verified its settled appearance. No live provider calls were made.
