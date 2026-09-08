# Desktop architecture

Pond is a local-first desktop app. The library on disk is authoritative; the database is its index. The main process owns persistence and privileged operations. The renderer owns presentation and optimistic state. Preload exposes the desktop interface. Cross-runtime schema definitions belong to the schema package or desktop shared contracts.

## Code map

Renderer code is grouped by product ownership under `features`: library, saves, search, sources, tags, downloads, agent, settings, enrichment, and captures. A feature contains its components, hooks, state, operations, and colocated tests. `app` composes features and windows, `dev` owns development galleries, and `shared` owns reusable controls and infrastructure.

```text
apps/desktop/src/
├── main/                  # Electron startup, IPC handlers, core operations, persistence
├── preload/               # Typed renderer capability bridge
├── shared/                # Desktop contracts and pure shared definitions
└── renderer/src/
    ├── app/               # Window and feature composition, application effects
    ├── features/          # Product UI, state, operations, hooks, and tests
    ├── shared/            # Reusable renderer controls and infrastructure
    ├── dev/               # Component, download, and assistant galleries
    └── routes/            # TanStack route definitions
```

The main process separates startup composition, Electron integration, domain operations, persistence, and background work. Domain modules consume explicit runtime operations rather than importing the startup entrypoint. Shared desktop contracts contain no main- or renderer-specific implementations.

The Agent uses TanStack AI provider factories in main. Runtime model IDs use the SDK's model extension API; custom endpoints use its compatible factory with an explicit base URL. Bundled cloud model catalogs are loaded in main and returned through the existing model queries. TanStack Query owns catalog request caching in the renderer. Tool activity comes from TanStack middleware, and compaction limits the model's working history without truncating the stored conversation. Library scope, evidence validation, proposal review and undo remain domain operations. A single renderer TanStack `ChatClient` owns messages and run state across pane/page remounts. A typed IPC connection carries SDK run/text events; the main process authorizes requests, validates answers before publishing text, and owns cancellation. `createChatUI` renders Pond's message components; composer drafts, attachments and review state remain product state rather than a second chat engine.

TanStack persistence stores the canonical model transcript in the nullable `agent_chats.canonical_transcript` column. Its full-thread store is separate from `agent_messages`, which remains the visible projection with stable IDs, sources, questions and review/undo metadata. Legacy chats hydrate from those existing rows; reconciliation retains tool pairs and uses validated visible replies on later turns. Compaction affects model requests, never the canonical store. Chat listings do not expose canonical payloads to the renderer. There is no automatic tool replay after a process crash; reopening a chat reads saved messages without executing a turn.

Provider settings separate configured connections from Language and Vision defaults. Language selections retain the existing per-provider model IDs. An optional `visionModelId` overrides only image conversations with an explicit vision provider; older preferences fall back to the provider model ID.

The composer offers a searchable list of all models grouped by connected provider, including saved custom IDs. Legacy model-visibility preferences no longer restrict discovery results. A non-modal model preview follows pointer and keyboard highlighting beside the list, showing available catalog details without changing the selection.

Provider model discovery is main-owned because the current TanStack adapters do not expose one common live-discovery API. Bundled names are available before credentials, local inventories reflect installed models, and discovery failures are distinct from authentication rejection. Electron secure key storage, local Transformers inference, SQLite library search and Pond's outward-facing MCP server retain their respective ownership.

Use [CONTEXT.md](../../CONTEXT.md) for domain terminology and [code standards](code-standards.md) for naming, imports, types, and tests.

## Changes by example

### Add a feature

Start with the owning product area. Keep its UI, operations, state, and tests together. Compose its route or window from application code. Export only the entries another module consumes. Put a helper in shared code only when its responsibility is independent of the feature.

### Add an IPC operation

Define the operation’s input and output in `apps/desktop/src/shared/query-contracts.ts` (or its domain contract module), and register its main handler under `apps/desktop/src/main/ipc/queries/`. The preload query signature accepts declared names and inputs. Decode incoming values at the transport adapter. Main delegates to an operation that can be tested without Electron; preload exposes only the intended capability. Verify success, invalid input, failure behavior, and handler coverage. Preserve serialized compatibility for existing callers.

### Change shared UI

Implement the primitive in the UI package, with its styles and behavior tests. Feature-specific decisions stay in feature components. Update the component gallery so contributors can inspect the public states, keyboard behavior, and reduced-motion behavior.

### Test an operation

Accept the external capability the operation needs, such as a typed tag client or snapshot store. For example, `createNewActions` receives prompt, notification, navigation, and folder-refresh services; `RightPaneView` receives the active pane and content components while its wrapper owns stores and lazy imports. Production passes the real implementation. Tests pass a faithful in-memory implementation and exercise success, rejection, and cleanup. Do not mock the module loader.

## Compatibility

File organization is internal. Routes, stored preference keys, source ids, library files, and extension messages are compatibility contracts. Preserve them through a refactor. Continue to build the capture renderer, auxiliary windows, galleries, and inference workers; these are entrypoints even when no TypeScript file imports them.

## Verification boundaries

Run `pnpm architecture:check` for runtime dependency cycles and process/shared-code boundaries. Type-only imports are excluded from the runtime graph. Run `pnpm check` for the required local code checks and offline tests, then `pnpm build` for bundles and performance budgets. Use `pnpm knip` separately when pruning; check non-TypeScript and dynamic entrypoints before accepting a deletion.

The renderer save pool lives under `features/saves/state/`. Library state owns view preferences, navigation, folders, and saved views. Tag operations live under `features/tags/operations/`; both the library Tags page and settings consume that feature. Shared UI primitives remain in `packages/ui`, independent of desktop stores.

Assistant UI primitives and chat compositions live in individual top-level `packages/ui/src/<component>/` folders, with colocated styles and public component entrypoints such as `@pond/ui/composer`, `@pond/ui/message`, and `@pond/ui/attachment`. `@pond/ui/assistant-runtime` contains provider hooks, adapters, and runtime types. Runtime-aware components use explicit subpath imports, separate from the root UI barrel, so unrelated screens do not load the chat runtime. Applications supply a runtime and own transport, provider choice, persistence, and tool approval policy. The component gallery uses an offline local adapter; the production Agent continues to use its existing TanStack runtime. Renderer vendor chunks assign modules to their own packages without recursively absorbing dependencies, preventing optional chat code from capturing shared React or positioning utilities into initial bundles.

## Dialogs

`@pond/ui` exports one `Dialog` API. `Dialog.Root` selects standard or alert semantics with `variant`; paged popups require both `pageId` and `depth`. Static bodies use `Content`, and paged bodies use `Viewport`. Page context and measurement are internal. Header Close defaults to a circular icon button; `render` supports custom footer dismissal buttons. `Cancel` and `Confirm` are styled actions and do not close a flow automatically.

Application composition mounts one `Dialog.Host`. `Dialog.confirm` and `Dialog.prompt` accept presentation options and completion callbacks; the UI package owns their input, pending, error, and dismissal behavior. Callers own domain operations. Commands return void, preserve payload replacement behavior, and require the host in the same renderer. Custom source flows remain compositional. `createHandle` and `createAlertHandle` support standard and alert roots respectively; `Dialog.Handle` remains the standard handle constructor.

Controlled flows must retain their last popup content while `open` becomes false. Base UI completes portal cleanup from the popup exit lifecycle; removing only Popup immediately can leave an invisible backdrop intercepting clicks. SourceFlowHost retains its last page and depth for this exit.
