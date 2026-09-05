# Desktop architecture cleanup

## Scope

Organize the desktop by ownership, simplify duplicated implementations, and establish contributor standards for an open-source repository. Preserve user capabilities, routes, saved preferences, source identifiers, library files, extension messages, and lazy loading. Keep changes on `codex/desktop-architecture-cleanup` for review; do not automatically commit or push.

This supersedes the initial renderer-only folder plan. The approved scope includes main, preload, renderer, shared contracts, verification tooling, and contributor documentation. Custom type and testing rules remain enabled without suppressions.

## Implementation

- [x] Group renderer implementation into `app`, ten product `features`, `dev`, and reusable `shared` modules. Keep framework entrypoint names and colocate components, styles, and tests.
- [x] Move save types to saves and display mode to library; keep stored values unchanged.
- [x] Separate save startup hydration from optimistic mutations and UI-independent media helpers from preview components.
- [x] Unify tag creation, rename, move, merge, and removal behind shared operations used by settings and library UI.
- [x] Inject main runtime controls and persistence services; remove imports of the startup entrypoint and runtime dependency cycles.
- [x] Define explicit input and result contracts for all 153 desktop queries, with handler coverage and boundary parsing tests.
- [x] Replace module mocks and unsafe input contracts with service interfaces, faithful fakes, schemas, and real store integration tests.
- [x] Add read-only contributor checks and automated import-cycle/ownership checks; make formatting an explicit action.
- [x] Document naming, interfaces, ownership, validation, React behavior, tests, and contribution workflows.
- [x] Complete unused-code analysis with explicit entrypoints for auxiliary HTML, galleries, workers, and prototypes; prune only verified unused implementation.
- [x] Verify browser-serialized source validation in a standalone environment, including malformed payloads and deterministic generation.
- [x] Finish full lint, typecheck, offline tests, production and gallery builds, performance budgets, and native smoke checks.

## Verification

Completed: `pnpm check` (1,360 desktop tests passed; environment-dependent tests skipped), native database tests under Electron (all executed), deterministic generation, production builds and all existing size budgets, component/assistant galleries, all five prototype builds, and an isolated first-run desktop smoke check with visible UI and preload queries.

The smoke check also exposed and resolved a native `sqlite-vec` bundling problem and first-run trigger creation before the saves table existed. The native database regression checks are now in CI. AI completion code loads on demand to keep startup within the existing budget.


`pnpm check` runs repository lint, custom standards, architecture verification, unused-code checks, type checks, and offline tests. `pnpm build` compiles production artifacts and checks their existing size budgets. Auxiliary gallery builds and native integration tests supplement these checks. Live source/account tests remain opt-in.

## References

- [Redux feature-folder guidance](https://redux.js.org/faq/code-structure/)
- [Bulletproof React project structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)
- [Feature-Sliced Design overview](https://fsd.how/docs/get-started/overview/)
- [Electron IPC guidance](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Starting an open-source project](https://opensource.guide/starting-a-project/)
