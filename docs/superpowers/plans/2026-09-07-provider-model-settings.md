# Provider and model settings implementation plan

> Execute inline in the current session. Preserve the existing uncommitted settings and AI migration work.

**Goal:** Separate provider connections from Language and Vision model defaults, using the Eagle reference and Pond's existing settings primitives.

**Architecture:** The settings feature owns provider cards, drafts, and model selection. Existing main-process queries continue owning discovery and secure credentials. Add an optional vision model ID to preserve independent role selections with legacy fallback.

**Tech Stack:** React, Base UI, Motion, TanStack Query, Zod, CSS modules, Vitest.

## Provider connections

Files: `apps/desktop/src/renderer/src/features/settings/components/sections/agent/agent.tsx`, `provider-settings.tsx`, `agent.module.css`, `provider/provider.tsx`, `provider/provider.module.css`, `provider/provider.test.tsx`.

- [x] Render only connected providers and explicitly added drafts; exclude them from Add Provider's menu. Retain drafts after verification failure and allow Cancel without saving.
- [x] Use a Providers card with heading and description, nested provider cards with visible connection fields, overflow removal menus, and an Add Provider button at the bottom. Animate added and removed cards with reduced-motion support.
- [x] Save explicitly, await endpoint persistence before verification, preserve existing keys when changing only endpoints, and surface errors. Refresh provider and model queries after connection changes.
- [x] Retain Remove Provider. Omit the enable switch, model checklist, and custom model form as requested; choose models in Default Models.
- [x] Update the local-provider behavior test to click Connect rather than using a toggle, verify failure keeps the form open, and verify saved credentials appear only as masked placeholders.

## Model defaults

Files: `default-models.tsx`, `model-select.tsx`, `model-select.module.css` under the same agent settings directory.

- [x] Read `agent.listAvailableModels` using the existing `assistant-models` query key. Render Language Model and Vision Model rows with searchable choices and provider labels, loading, retry, and empty states.
- [x] Save the language selection with the existing preference format:

```ts
{ languageModel: provider, modelIds: { ...agent.modelIds, [provider]: modelId } }
```

- [x] Save vision separately, without mutating language defaults:

```ts
{ visionModel: provider, visionModelId: modelId }
```

- [x] Offer Use Language Model to reset vision overrides. Keep provider capability restrictions aligned with current runtime support. Preserve saved selections even when discovery is unavailable.

## Runtime compatibility

Files: `packages/schema/src/prefs.ts`, `apps/desktop/src/main/core/agent/chat.ts`, `chat.test.ts`, `docs/contributing/architecture.md`.

- [x] Add `visionModelId: z.string().optional()` to agent preferences. Existing libraries fall back to the provider's existing selected model.
- [x] In chat requests containing images and an explicit vision provider, use the optional vision model ID; text-only requests retain their language model.
- [x] Add a behavior test sending image and text requests with different Language/Vision models from the same provider and assert the actual model passed to completion.

## Verification

- [x] Run targeted settings and chat tests with `pnpm --filter @pond/desktop exec vitest run` and the changed test paths.
- [x] Run `pnpm check` and `pnpm build`; record any unrelated pre-existing failures without rewriting other work.
- [x] Render the real settings components with isolated fixtures and inspect provider fields, add/remove, model selection, and empty state in the browser. Do not use personal keys or libraries for verification.

## Results

Implemented the reference card structure and separate Language/Vision selectors. Removed Manage Models and the Enable Provider switch per user feedback. Browser verification covered connection success/failure, add/remove, provider menu availability, independent defaults, and the empty state using isolated fixtures.

`pnpm check` passed with native access (1,485 tests passed, 22 skipped). The initial sandbox run could not create Unix sockets or decode the HEIC fixture; those tests passed outside the sandbox. `pnpm build` passed all five tasks and bundle budgets. The standalone preview build also passed. No live provider credentials were used.
