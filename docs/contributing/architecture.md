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
