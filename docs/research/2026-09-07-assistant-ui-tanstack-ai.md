# Assistant UI and TanStack AI: a stack decision for Pond

**Research date:** 7 September 2026  
**Audience:** Pond product and engineering  
**Scope:** Pond’s Electron desktop agent, its compact composer, local/cloud models, Save tools, and locally persisted conversations. This is a decision report, not an implemented migration.

## Recommendation

**Keep TanStack AI in the main process. Evaluate Assistant UI’s headless primitives as the frontend, with Pond UI providing the visual components. Do not replace the backend merely to improve the chat interface.**

This recommendation separates two decisions: choosing a chat interaction library and choosing the engine that calls models and runs tools. Assistant UI can take over substantial frontend behavior. It does not eliminate Pond’s need for provider execution, library retrieval, validated operations, and persistence. Its official architecture treats UI, runtime, backend, and storage as separate layers. [Assistant UI architecture](https://www.assistant-ui.com/docs/architecture)

The strongest immediate finding is in our own code: **Pond currently buffers the model’s answer until validation finishes, then publishes the assembled text.** Its character reveal is a subsequent presentation effect. A frontend library swap cannot remove that wait. Address publication latency separately from the choice of chat primitives.

Confidence is high about the responsibility boundaries and compatibility approach. Confidence is moderate about the frontend migration’s eventual benefit: no comparative bundle, performance, accessibility, or live integration benchmark was performed.

## What “Assistant UI for everything” would mean

There are three products or responsibilities that are easy to conflate:

| Surface | What it does | What Pond still needs |
| --- | --- | --- |
| Assistant UI primitives | Thread, message, composer, attachment, action, and related chat UI behavior | Pond styling and application-specific components |
| Assistant UI runtime | Owns or adapts messages, conversation state, and interaction lifecycle | An execution adapter/backend and correct persistence integration |
| Assistant Cloud | Optional hosted threads, history, and user-scoped storage | Model execution and Pond’s privileged library operations |

These distinctions follow the project’s [architecture](https://www.assistant-ui.com/docs/architecture) and [primitives catalog](https://www.assistant-ui.com/docs/primitives).

Assistant UI’s **LocalRuntime is more than a view wrapper**. It can own conversation state, editing, regeneration, branching, client tool continuation, and approval flows. But the application supplies `ChatModelAdapter.run`, and approved server actions still need an implementation. “LocalRuntime” describes runtime state ownership; it does not mean that the model automatically runs on the user’s Mac. [LocalRuntime](https://www.assistant-ui.com/docs/runtimes/custom/local-runtime)

The product called **Cloud AI SDK** adds hosted persistence and thread management to Vercel AI SDK’s chat hook. Its installation includes `ai` and `@ai-sdk/react`. It is not a standalone replacement for TanStack’s model/provider engine. [Cloud AI SDK](https://www.assistant-ui.com/docs/cloud/ai-sdk)

We could remove TanStack completely, but then we would replace its backend with Vercel AI SDK, another agent engine, or our own provider/tool orchestration. That is a separate backend migration.

## The actual alternatives

The judgments below are engineering assessments for the inspected Pond checkout, not measured rankings.

| Option | Benefit | Cost or limitation | Assessment |
| --- | --- | --- | --- |
| Keep TanStack chat UI + Pond UI | Preserves current integration and gives us full control | We continue owning custom chat behavior | Sensible baseline; lowest disruption |
| Assistant UI + existing TanStack client/backend | Gains chat-specific primitives while retaining model and transport work | Requires a message/action adapter and deliberate frontend ownership | **Best candidate for an incremental evaluation** |
| Assistant UI LocalRuntime + TanStack backend | Delegates more conversation behavior to Assistant UI | Changes ownership of history, drafts, lifecycle, and branching | Consider only if the external-store approach remains too cumbersome |
| Assistant UI + Vercel AI SDK backend | Dedicated framework integration and an alternative model/tool engine | Backend, transport, transcript, and provider migration | Valid stack; no present UI-driven reason to rewrite Pond into it |
| Assistant UI + hand-written provider backend | Maximum control over every layer | We maintain provider differences, tool loops, cancellation, and context handling | Poor fit for the current goal |

TanStack also supplies a genuine headless chat UI composition layer: `createChatUI`, messages, parts, input, queue, and interrupts. Its current documentation explicitly leaves visible markup and styling to the application. Assistant UI is therefore a different frontend abstraction, rather than the only way to have primitives. [TanStack React Chat UI](https://tanstack.com/ai/latest/docs/ui/react)

## What Assistant UI could improve for this design

| User goal | Relevant capability | Integration requirement |
| --- | --- | --- |
| Smooth text appearing per letter | `MessagePartPrimitive.Text` documents tunable character-level smoothing, enabled by default, with system reduced-motion handling | Choose one smoothing mechanism; do not put it on top of Pond’s existing reveal buffer |
| Natural conversation scrolling | Thread viewport supports automatic scrolling, top/bottom turn anchoring, thread/run initialization options, and a measured footer | Replace our custom scroll owner; verify scrollback while a reply grows |
| Consistent composer and message actions | Headless Composer, Message, ActionBar, Attachment, and related primitives | Connect actions to Pond operations and retain our full-width options tray |
| Pond’s appearance | Primitives accept `render` and `asChild`, including Base UI composition | Use Pond buttons, inputs, popovers, tokens, and motion rather than installing the stock visual theme |
| Markdown and Save citations | Markdown primitives support custom rendering and plugins | Preserve our Save citation parser, URL restrictions, code blocks, and table handling |

Sources: [text smoothing](https://www.assistant-ui.com/docs/api-reference/primitives/message-part), [thread behavior](https://www.assistant-ui.com/docs/api-reference/primitives/thread), [primitives](https://www.assistant-ui.com/docs/primitives), [Base UI compatibility](https://www.assistant-ui.com/docs/base-ui), and [Markdown integration](https://www.assistant-ui.com/elements/markdown-text).

These capabilities are directly relevant to the desired experience. They do not establish that an Assistant UI implementation will be faster or visually smoother than our current one. The final composition still needs keyboard and accessibility verification. Its system reduced-motion support also needs to respect Pond’s explicit app preference, not only the operating system setting.

Pond’s compact layout, expanding composer popover, model information, Save result cards, and entry/exit motion remain product design work. Changing the chat library will not automatically reproduce Linear or Codex’s visual polish.

## What we have in Pond today

This section is based on local source inspection, including existing test scenarios; those tests were not rerun as part of this research.

| Current responsibility | Evidence | Migration implication |
| --- | --- | --- |
| Provider selection | [adapter.ts](/Users/raphaelsalaja/Developer/pond/apps/desktop/src/main/core/agent/adapter.ts) handles Anthropic, Gemini, OpenAI, Ollama, LM Studio, and compatible endpoints | Retain this for a frontend-only migration |
| Tool execution and context | [complete.ts](/Users/raphaelsalaja/Developer/pond/apps/desktop/src/main/core/agent/complete.ts) constructs server tools, caps the loop, and applies compaction/persistence | Assistant UI does not replace these application contracts |
| Request lifecycle | [chat.ts](/Users/raphaelsalaja/Developer/pond/apps/desktop/src/main/core/agent/chat.ts) authorizes the conversation, scopes retrieval, tracks active requests, and emits events | Main must remain authoritative through cancellation and persistence settlement |
| Renderer message state | [assistant-runtime.ts](/Users/raphaelsalaja/Developer/pond/apps/desktop/src/renderer/src/features/agent/state/assistant-runtime.ts) owns a TanStack `ChatClient` and converts Pond metadata | An external-store bridge can initially use this same message owner |
| Electron transport | [assistant-connection.ts](/Users/raphaelsalaja/Developer/pond/apps/desktop/src/renderer/src/features/agent/state/assistant-connection.ts) filters by chat/request ID and adapts IPC events | Preserve cancellation, event isolation, cleanup, and completion ordering |
| Visual message composition | [pane.tsx](/Users/raphaelsalaja/Developer/pond/apps/desktop/src/renderer/src/features/agent/components/pane/pane.tsx) uses TanStack `createChatUI` with Pond renderers | This is the first replacement boundary |
| Scrolling and reveal | [conversation-thread.tsx](/Users/raphaelsalaja/Developer/pond/apps/desktop/src/renderer/src/features/agent/components/pane/conversation-thread.tsx), [text reveal](/Users/raphaelsalaja/Developer/pond/packages/ui/src/ai/text-reveal/index.ts) | Replace these only when the new primitives demonstrably own the same behavior |
| Drafts, attachments, scope | [assistant.ts](/Users/raphaelsalaja/Developer/pond/apps/desktop/src/renderer/src/features/agent/state/assistant.ts) | Avoid a second independently authoritative composer store |
| History and canonical model transcript | [persist.ts](/Users/raphaelsalaja/Developer/pond/apps/desktop/src/main/core/agent/persist.ts), [transcript.ts](/Users/raphaelsalaja/Developer/pond/apps/desktop/src/main/core/agent/transcript.ts) | Retain SQLite data and full tool history, not just visible text |
| Review and undo | [review.tsx](/Users/raphaelsalaja/Developer/pond/apps/desktop/src/renderer/src/features/agent/components/pane/review.tsx) invokes Pond change operations | A generic approval button does not supply selective Apply, retry, or Undo |

Our renderer currently presents tools, results, questions, and references through Pond metadata, while the chat factory declares an empty frontend tool list. Obtaining Assistant UI’s richer tool rendering would require a meaningful part/metadata mapping. Merely wrapping the same `PondMessage` tree would deliver little behavioral benefit.

The visible message table is a linear chat history, with no branch-parent column in [the agent schema](/Users/raphaelsalaja/Developer/pond/packages/schema/src/db.ts:307). Branch editing/regeneration therefore needs an explicit persistence design; adding a branch picker alone would not make branches survive reloads.

## The streaming finding changes the priority

In [complete.ts](/Users/raphaelsalaja/Developer/pond/apps/desktop/src/main/core/agent/complete.ts:323), incoming model text accumulates in `assembled`. The function checks answer validity and evidence, then calls `onText(assembled)` after the loop. Existing tests explicitly assert that a valid answer is published once after validation. [Publication tests](/Users/raphaelsalaja/Developer/pond/apps/desktop/src/main/core/agent/complete.test.ts:479)

The current ordinary model-answer path is therefore:

`model deltas → assembled answer → validation → renderer text → character reveal`

It is not currently an end-to-end incremental text stream, although activity and tool-related UI can update earlier. This is a property of Pond’s publication code, not evidence that TanStack lacks streaming.

My recommendation is to measure model-first-delta, renderer-first-text, completion, and reveal-finished separately. Then decide which validation can happen incrementally and which must wait for the full answer. Simply deleting validation would change behavior: the current tests protect against unreadable or inappropriate generated output. A deliberate redesign could publish validated blocks, or separate provisional text from final results, with defined error and correction behavior. Either is independent of the frontend library choice.

## How to connect Assistant UI safely and usefully

**Start with ExternalStoreRuntime.** It accepts existing messages and callbacks, allowing the TanStack client and Pond state to remain authoritative initially. Editing, regeneration, cancellation, tool results, and queueing each require the appropriate host implementation; they are not automatically supplied by displaying a control. [ExternalStoreRuntime](https://www.assistant-ui.com/docs/runtimes/custom/external-store)

Proposed ownership:

`Pond UI components → Assistant UI primitives/runtime adapter → Pond state + existing ChatClient → Electron IPC → TanStack AI + Pond tools → model provider`

Assistant UI’s external runtime adapts the existing messages in this arrangement; it should not be accompanied by a second LocalRuntime generating independent replies. The TanStack `createChatUI` renderer would be replaced. Retaining `@tanstack/ai-client` initially is compatible with adopting Assistant UI on the frontend; removing it later is a separate simplification decision.

**AG-UI is another real option, with constraints.** Assistant UI has a first-party AG-UI runtime that expects an `HttpAgent` and reconstructs messages from protocol events. Pond currently wraps AG-UI-style events in a custom Electron envelope and sends sources/results/activity separately. Matching event names does not make the whole transport interoperable. Adapting the protocol may become worthwhile for a future server-backed agent, but it adds unnecessary transport change to the first frontend evaluation. [Assistant UI AG-UI runtime](https://www.assistant-ui.com/docs/runtimes/ag-ui/overview)

**Electron is explicitly supported.** Assistant UI documents a renderer/main/preload bridge. Its example is text-only and calls out the need to extend tools, attachments, metadata, and persistence explicitly. We can retain our privileged main process and local database; there is no need to add a localhost HTTP server solely to render the UI. [Electron integration](https://www.assistant-ui.com/docs/guides/electron)

## Is Vercel AI SDK a better backend replacement?

It is a credible alternative, with a dedicated Assistant UI integration. The current version-specific guide uses AI SDK 7 and `@ai-sdk/react` 4. That is an integration advantage if choosing a new stack, but it does not remove Pond’s Electron or domain adaptation work. [Assistant UI’s AI SDK 7 integration](https://www.assistant-ui.com/docs/runtimes/ai-sdk/v7)

| Backend concern | TanStack evidence | Replacement assessment for Pond |
| --- | --- | --- |
| Text and cancellation | Streaming connections receive an abort signal | We already have the IPC stop bridge; it must remain correct in either stack |
| Tool loops and approval | Server/client tools and typed approval/interrupt mechanisms | Pond’s transactional review remains custom whichever engine runs tools |
| Long conversations | Dedicated compaction middleware | Existing 16,000-token compaction policy can stay with the frontend migration |
| Persistent tool history | Persistence middleware and custom stores | Our canonical transcript adapter is existing work to preserve |
| Local inference | Native Ollama and compatible endpoint adapters | Local models are not a reason to replace TanStack |
| Structured output | Provider-dependent streaming/fallback behavior | Verify the exact chosen model and adapter, rather than assume uniform support |

Sources: [connection cancellation](https://tanstack.com/ai/latest/docs/chat/connection-adapters#cancellation), [tool approval](https://tanstack.com/ai/latest/docs/interrupts/tool-approval), [compaction](https://tanstack.com/ai/latest/docs/advanced/compaction), [persistence](https://tanstack.com/ai/latest/docs/persistence/chat-persistence), [Ollama](https://tanstack.com/ai/latest/docs/adapters/ollama), [compatible providers](https://tanstack.com/ai/latest/docs/adapters/openai-compatible), and [structured streaming](https://tanstack.com/ai/latest/docs/structured-outputs/streaming).

AI SDK 7 offers model/tool execution and durable workflow features; its release requires Node 22+ and ESM. A future choice to adopt that workflow ecosystem could justify backend work. No evidence found makes it necessary for the compact composer, references, typography, or letter-level reveal. [AI SDK 7 release](https://vercel.com/changelog/ai-sdk-7)

One capability caveat: TanStack’s current structured-output documentation lists a completed-object fallback for adapters including Ollama, Anthropic, and Gemini. This concerns structured output, not ordinary text streaming. Older broad claims of cross-provider parity should not replace a test of the required provider feature.

## Maturity, cost, and product fit

TanStack AI entered release candidate on **21 August 2026**. The local skill’s “alpha” description is stale. Pond’s installed core is `0.53.0`; the inspected release listing also showed that version. This is an actively changing pre-1.0 dependency, not evidence that it cannot support the app. [RC announcement](https://tanstack.com/blog/tanstack-ai-rc), [releases](https://github.com/TanStack/ai/releases), [Pond dependencies](/Users/raphaelsalaja/Developer/pond/apps/desktop/package.json)

Assistant UI explicitly allows `unstable_` APIs to change in patch releases. Several advanced runtime surfaces fall into that category. Prefer the smallest stable interface, pin selected versions during migration, and keep conversion code in one module. [Stability policy](https://www.assistant-ui.com/docs/runtimes/concepts/stability)

Assistant UI and TanStack AI are MIT-licensed; Vercel AI SDK is Apache-2.0. These licenses do not determine inference costs. Direct provider use is available with AI SDK, so choosing its open-source library does not itself require Vercel hosting or Gateway. [Assistant UI license](https://github.com/assistant-ui/assistant-ui/blob/main/LICENSE), [TanStack license](https://github.com/TanStack/ai/blob/main/LICENSE), [AI SDK license and package](https://github.com/vercel/ai/blob/main/LICENSE), [AI SDK package documentation](https://github.com/vercel/ai/tree/main/packages/ai)

Assistant Cloud is optional. Its currently published tiers include free hosted persistence for 200 monthly active users and Pro at $50/month for 500, plus $0.10 per additional active user. The page says these are B2B plans and asks consumer products to request B2C pricing. Those figures are not a quote for Pond and do not include model-provider charges. For the current locally persisted product, I recommend using the OSS frontend without Assistant Cloud. [Pricing and cloud optionality](https://www.assistant-ui.com/pricing)

## A migration should earn its place

I recommend a bounded implementation evaluation before committing to a full migration. This report does not begin that implementation.

1. Adapt one real conversation to Assistant UI through ExternalStoreRuntime; preserve the existing backend and request protocol.
2. Use Pond UI to compose the thread, messages, actions, and composer. Keep the accepted compact layout and full-width tray.
3. Replace one scroll implementation and one text smoother. Retaining both defeats the purpose and can add lag or conflicting scroll behavior.
4. Map sources, tool steps, questions, result groups, errors, stopped state, and change reviews without flattening them into plain text.
5. Test local and cloud model runs, then compare the packaged build to the current baseline.

Acceptance criteria should include:

- A pending reply keeps its visual identity when the persisted message arrives.
- Stop reaches the active main-process request and does not unlock another send before settlement.
- Drafting while busy works, and failure, retry, cancellation, and chat switching preserve the intended draft and attachments.
- Source IDs, citations, selected Save scope, and historical references round-trip correctly.
- Apply, partial failure, retry, and Undo preserve Pond’s existing operation semantics.
- Scrolling up during generation stays under the user’s control; expanding cards and the composer do not displace the reading position unexpectedly.
- Reduced motion honors both system settings and Pond preferences; keyboard focus and Escape still work in the composed popover.
- History reloads correctly in a packaged app, with no dependency on development-server routes.
- The new implementation removes enough existing chat-specific machinery to justify the added adapter and dependency.

Measure first-visible-text latency, input responsiveness, scroll behavior, main-thread work during long Markdown updates, memory after thread switching, and production bundle changes. No numerical performance advantage or implementation time estimate is claimed here.

If the adapter becomes as complex as the frontend it replaces, retain the current TanStack UI composition. If it removes substantial scroll/composer/message behavior while preserving Pond’s interaction requirements, adopt it. **The backend decision should remain independent.**

## Research boundaries and unresolved questions

Research combined current official documentation, first-party release/license material, installed package exports, and Pond’s main/renderer implementation. Separate frontend and backend reviews were reconciled against the code. High-impact claims about state ownership, Cloud AI SDK, Base UI composition, smoothing, and Electron transport were independently checked.

Two documentation conflicts were resolved by preferring the specific current source: the local TanStack skill still says alpha despite the RC announcement; Assistant UI’s runtime picker contains older AI SDK v6 wording while its version-specific guide identifies v7. Provider-specific structured-streaming documentation was preferred to older broad feature claims.

Remaining uncertainty is empirical: actual adapter size, rendering performance, bundle impact, assistive-technology behavior, and provider edge cases. No dependencies were installed, no provider requests were made, and no application code was changed for this research. Repository files and remote docs may evolve independently; implementation should use the installed versions’ types and selected release notes.

Discovery covered ownership, primitives, runtime choices, Electron, transports, backend execution, local models, persistence, licenses, and hosted costs. Follow-up addressed the Cloud AI SDK naming ambiguity, AG-UI transport mismatch, version conflicts, and Pond’s text buffering. Research stopped when these decision-critical questions had primary evidence; further documentation searches would not establish the remaining measured integration benefits.

All web sources were accessed on **7 September 2026**. Documentation pages without an explicit publication date are treated as current rolling documentation, not dated release guarantees.
