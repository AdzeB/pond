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

Downloads activity is main-owned transient state, exposed through the typed `downloads.activity` query in the shared download activity contract. The reconciler owns task lifetimes; workers report observed phases and per-transfer measurements through their context. Direct media fetches report response and first-byte timings and streamed byte counts; yt-dlp reports its structured progress fields. Request telemetry includes only the method, hostname, status, and content type. Unobserved measurements remain absent. Snapshots bound recent task, transfer, and phase history, discard late worker callbacks after settlement, and clear when the development app switches libraries; production switches restart the process. The renderer polls this snapshot for the Downloads page and right panel instead of persisting or broadcasting each progress update.

Smart Folders, Groups, and Saved Views share the existing saved view persistence and IPC operations, distinguished by kind and optional parent group. Main validates group membership and prevents cycles; deleting a group promotes its children atomically. The library feature owns their sidebar tree and selection. Editable filters stay separate from inherited ancestor conditions, which are combined with AND for library retrieval. Only Saved Views restore layout and sorting.

Reusable Actions use `shared/action-contracts.ts` for definitions and preview/run requests. Main owns ordered transformations, stale-preview checks, `actions.json` persistence, and mutation batches in `core/library-actions.ts`; IPC, authenticated HTTP library routes, and MCP call those same operations. The library feature owns the action editor and rename preview. A preview token covers the definition, ordered selection, and editable metadata; applying requires that token and records the completed batch as one undo entry. App-level shortcut profiles and viewer preferences remain separate from portable library settings.

Conversion presets are stored in `conversion-presets.json` in the library. The main conversion job registry owns progress, cancellation, and a two-job concurrency limit. Sharp image conversions and FFmpeg GIF exports share collision-safe file writers; originals remain unchanged, and completed outputs remain available after cancellation or a later-file failure. IPC asks for an export directory through Electron, while authenticated HTTP and MCP accept an explicit destination. Both adapters use the same validated presets and job operations. Library switches prevent remaining items in an old job from resolving against the new library.

The executor serializes mutations and creates a `.transactions` journal before changing Save files or organization metadata. Journals snapshot touched files; destructive operations additionally snapshot originals. SQLite records a commit receipt atomically with index updates and sync events. Opening a library restores journals without a receipt and discards journals whose operation committed. A failed rollback retains its journal and blocks further executor writes to that library until restart recovery succeeds. Library switches stop worker and transfer admission, suspend and drain executor work before changing active paths, and clear undo history after a successful switch. Pipeline metadata persistence shares the executor mutation scope through AsyncLocalStorage; nested writes remain admitted until the outer operation finishes. Explicit user-title locks are stored beside item metadata, included in the update transaction journal, and reversed with undo. Folder membership updates use the `save_folder` transaction model so info metadata, the membership index, Action batches, and undo follow the same path.

Bulk selection mutations cross IPC as explicit IDs through `saves.bulkEdit`. Main loads only the metadata needed to prepare rating, tag, trash, restore, and purge operations; the renderer pool is an optimistic projection and never determines mutation membership. Main validates the complete selection before committing one transaction batch. Purge remains permanent and does not add an unusable undo entry. Clipboard and external-open commands hydrate missing rows before resolving files or links; enrichment commands hydrate selected rows only when their renderer-owned model work needs them.
