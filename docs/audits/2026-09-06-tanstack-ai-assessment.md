# TanStack AI for Pond’s provider and model settings

**Decision brief · 6 September 2026 · Audience: Pond product and engineering**

## Recommendation

Use the TanStack AI packages already installed in Pond as the first source of bundled cloud model IDs and as the execution layer. Do not add Models.dev solely to populate model checklists. Retain a small Pond-owned layer for live discovery, cached results, provider enablement, model visibility, and desktop credential persistence.

The earlier recommendation understated TanStack AI: it includes model ID catalogs, custom model definitions, compatible endpoint factories, and BYOK helpers in addition to chat execution. It does not supply the complete end-user Settings experience. “TanStack-first with a thin application layer” is supported by the evidence; “TanStack does every part without application code” is not.

This is a research deliverable. No application code or dependencies were changed during this research pass.

## What is already installed and verified

An offline Node import probe executed against Pond’s installed packages, not a documentation example, returned these public exports:

| Installed package | Public runtime export | Model IDs |
| --- | --- | ---: |
| `@tanstack/ai-openai` 0.22.3 | `OPENAI_CHAT_MODELS` | 51 |
| `@tanstack/ai-anthropic` 0.18.3 | `ANTHROPIC_MODELS` | 12 |
| `@tanstack/ai-gemini` 0.26.4 | `GeminiTextModels` | 11 |
| `@tanstack/ai-ollama` 0.10.3 | `OllamaTextModels` | 212 |

Pond also has core `@tanstack/ai` 0.52.0, React 0.22.4, and client 0.29.2 installed. Counts describe those exact installed snapshots, not current account access or the number of models installed locally. The exports can seed Settings without credentials or network access. Their existence directly answers the immediate “why must I connect to browse models?” problem.

Evidence: locally inspected package manifests, `src/index.ts`, model metadata files, and successful runtime imports. Upstream export entrypoints: [OpenAI](https://github.com/TanStack/ai/blob/main/packages/ai-openai/src/index.ts), [Anthropic](https://github.com/TanStack/ai/blob/main/packages/ai-anthropic/src/index.ts), [Gemini](https://github.com/TanStack/ai/blob/main/packages/ai-gemini/src/index.ts), [Ollama](https://github.com/TanStack/ai/blob/main/packages/ai-ollama/src/index.ts). Upstream main may differ from the installed release.

## Coverage and remaining work

| Pond requirement | TanStack coverage | Application responsibility |
| --- | --- | --- |
| Chat, streaming, tool calling | Core plus provider adapters | Library tools, product behavior, IPC wiring |
| Browse cloud models before entering a key | Public bundled model ID arrays | Labels, ordering, freshness, visibility UI |
| Select a model at runtime | Adapter factories | Selected provider/model preference |
| Custom IDs and LM Studio endpoints | Compatible adapter; custom model definitions | Endpoint fields and model discovery |
| Key entry and status | Headless BYOK helpers | Desktop storage integration and Settings UI |
| Installed Ollama/LM Studio models | No uniform discovery facility established by this review | Query the configured server and cache results |
| Provider enable switches | No ready-made Settings manager established | Persist enablement independently of credentials |
| Model visibility checkboxes | No ready-made visibility manager established | Persist user selection independently of discovery |
| Complete runtime capability/pricing catalog | Internal metadata and public types exist; uniform public metadata API not established | Small explicit metadata layer, or optional external catalog later |

The core runtime supplies common generation and tool APIs; it is not a turnkey Settings application. [TanStack overview](https://tanstack.com/ai/latest/docs/getting-started/overview)

## Catalogs are different from discovery

A bundled list says which IDs an SDK release knows about. It does not prove that a specific key can use a model, that the model remains available upstream, or that a local server has downloaded it. For local providers, use installed inventory as the primary list. Ollama exposes `/api/tags`; LM Studio exposes `/api/v1/models` with information about model inventory and loaded instances. Keep the last successful result during outages. [Ollama inventory](https://docs.ollama.com/api/tags), [LM Studio inventory](https://lmstudio.ai/docs/developer/rest/list)

For cloud providers, show the bundled list immediately and merge live account results when credentials become available. A catalog-only entry should not be presented as verified account access. Preserve custom IDs and hidden-model choices when results refresh.

No unified public `listModels()` or account-discovery method was found in the inspected core and the four installed adapters. This is a bounded negative finding, not a claim about every community adapter or future release. The compatible factory takes a caller-supplied `models` list; it does not discover that list for the caller. [Compatible adapter](https://tanstack.com/ai/latest/docs/adapters/openai-compatible)

## Custom models and capability handling

TanStack’s `openaiCompatible` and `openaiCompatibleText` cover compatible servers, including the documented LM Studio setup. `createModel` and `extendAdapter` can declare custom models and their supported inputs/options. Pond currently routes LM Studio through the ordinary OpenAI Chat Completions factory with a type assertion; the purpose-built compatible entrypoint is a better fit.

These definitions describe capabilities; they do not inspect a remote model to determine capabilities automatically. Bare compatible model strings use optimistic defaults, so unknown local models must not automatically be advertised as supporting images and tools. Public provider arrays can populate names, while product capability decisions need verified metadata or conservative behavior. [Compatible model definitions](https://tanstack.com/ai/latest/docs/adapters/openai-compatible#declaring-models), [Extending adapters](https://tanstack.com/ai/latest/docs/advanced/extend-adapter)

The installed provider source contains rich metadata objects, including modalities and some limits/pricing, but its stable public surface mainly exposes model ID arrays and type-level maps. Do not deep-import private metadata files to build production UI. Source availability does not make a file a supported package entrypoint.

## BYOK: useful, but not an automatic desktop replacement

TanStack offers `defineByok`, `useByok`, storage interfaces, validation status, and selected-provider credential forwarding. The official guide explicitly leaves the dialog to the application. Its browser storage/relay workflow is different from Pond’s desktop architecture. [BYOK guide](https://tanstack.com/ai/latest/docs/advanced/byok), [Client API](https://tanstack.com/ai/latest/docs/api/ai-client)

Pond already owns credential persistence in `main/keychain.ts` and loads credentials in the main process before constructing adapters. Keep that ownership. A custom BYOK bridge is possible, but adopting a browser keyring merely to reuse status handling would add work and potentially change where saved keys are exposed. The recommendation is architectural, not a claim that TanStack cannot be adapted to Electron.

## Proposed Pond flow

1. Every provider card stays visible. The switch controls use, not configuration existence.
2. Cloud cards show SDK-known models immediately. Model visibility can be configured without a key.
3. Local cards query the configured server without requiring an artificial “connected” flag first. An offline server retains its cached list and shows an inline status.
4. Keys save through Pond’s existing main-process storage. Credential validation and model enumeration have separate outcomes.
5. Checkboxes persist a model visibility preference. They do not change the currently selected chat model or claim the model is reachable.
6. The assistant chooser combines enabled providers and chosen models. It reads cached data immediately and refreshes without blanking the list.
7. Existing model choices survive migration. Once a user customizes a list, new discoveries do not silently enable themselves.

Listing failure must not be the only criterion for rejecting compatible credentials. Some compatible services can generate chat responses but do not implement a usable `/models` endpoint. Retain manual IDs and report discovery failure distinctly. [Open WebUI’s documented compatibility cases](https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/starting-with-openai-compatible/)

## Is Models.dev still useful?

Yes, optionally. Its maintained catalog and offline snapshot can supply richer cross-provider metadata and freshness beyond the installed SDK release. The officially linked `@opencode-ai/models` SDK is real. It is not necessary for Pond’s immediate checklist and chooser requirements. Revisit it only if richer pricing, context limits, capability badges, or broader provider coverage justify another data source. [Models.dev](https://models.dev/#sdk)

## Suggested implementation order

- First, adapt the existing TanStack public model arrays into a small provider-catalog module. Keep provider SDK imports out of the renderer bundle; return serializable lists over the existing IPC boundary or generate a small build-time snapshot.
- Separate discovered models, user visibility, provider enablement, and credential status. Cache discovery by provider and endpoint so one server’s results cannot leak into another server’s configuration.
- Use the dedicated compatible adapter for LM Studio and custom endpoints. Keep native adapters for the named providers.
- Cover offline catalogs, discovery failures, empty selections, custom IDs, endpoint changes, and disabled-provider persistence with tests.

Do not rewrite the working TanStack chat runtime or introduce a gateway to solve this Settings problem.

## Scope, confidence, and limitations

Research combined current official docs, upstream export/source review, exact installed dependency inspection, and an offline runtime import probe on 6 September 2026. Confidence is high for public model arrays, installed versions, compatible factories, BYOK existence, and Pond’s current ownership. The absence of a unified discovery/settings API is scoped to reviewed public APIs and packages. No paid inference, user API keys, or live account access was tested. No exhaustive model-by-model capability audit was performed.

Broad discovery was followed by targeted checks of public exports, BYOK architecture, compatible models, and local discovery. Research stopped once those claims converged and further searches were unlikely to alter the dependency recommendation. Online documentation changes independently of installed packages; use public installed exports and release-specific checks when implementing.
