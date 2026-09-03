# Assistant design preview

A disposable, isolated preview of Pond's Assistant page and companion pane. The current direction combines Linear/Notion's restrained layout, a Cursor-inspired model picker, Resurf's explicit context, and Eagle-inspired library actions. This does not change the production sidebar or Assistant.

```sh
pnpm --config.verify-deps-before-run=false --filter @pond/desktop prototype:assistant
```

Open http://127.0.0.1:4317. The state strip includes 17 scenarios. Full Page / Side Pane, theme, state, and pane width are encoded in the URL. Switching surfaces preserves the current interaction; switching scenarios or Replay State resets the sample.

## Try the complete flows

1. **With Context**: remove an attachment or open + → Saves from Library to search and select sample Saves. The Library control chooses Library, Design Folder, or Attached Saves. Send preserves the attachments and search scope alongside the question.
2. **Search → read → write**: sending a question plays these stages, using Pond's animated logo. Stop preserves partial content, question, and attachments; Continue resumes. Drafting remains available while working.
3. **Answer**: open source cards and citations, inspect the excerpt with Open Save, or Show in Library. The library dialog highlights the source and shows its current title, tags, and folder. Selected Saves can be attached to another question.
4. **Organize These Saves**: prepares changes for the answer's referenced Saves. Review each before/after edit, select a subset, then Apply or Dismiss. Zero selected edits disables Apply.
5. **Apply → undo**: progress is shown per Save. Show in Library reflects applied edits. Undo restores the original sample values; Review Again reopens the proposal.
6. **Partial failure**: use the scenario or the review card's explicitly labeled preview checkbox. Retry changes only unfinished items. Stop during application preserves completed edits and leaves unfinished ones available to retry. Undo reverts the completed edits.
7. **Provider Consent / Error**: cloud selection requires explicit consent for each simulated message. Retry or choose Ollama without losing the draft. No automatic cloud fallback.

Searching, Reading, and Preparing gallery scenarios remain still for inspection (their logo animates); actual submissions progress automatically. Responding and Applying gallery scenarios play automatically. Use Stop / Continue to advance a held work example.

## Composer Add menu

The plus opens a Codex-inspired popover 8px above the whole composer, aligned with its left edge. It stays above the input as attachments and draft text change the composer height. The menu has Add and Actions groups, icons, inline descriptions, and rounded hover rows. Saves from Library opens the existing picker. Folder opens a submenu whose counts reflect the current sample library. Referenced Saves adds the current response's Saves without duplicating existing attachments. Actions prepare editable drafts and focus the composer; nothing sends automatically.

The visual reference is the user's Codex Add-menu screenshot. [Official Codex feature documentation](https://developers.openai.com/codex/app/features/) was also consulted. This adapts the menu structure to Pond's sample-library functions; it does not add Codex goals, plugins, external files, or operating-system folder access.

## Deliberate simulation boundaries

- Three illustrative Saves with document-cover thumbnails. Excerpts are invented, not quotations or fetched website content.
- Canned answers, not AI. Queries containing organize, rename, tag, or folder trigger the example edit flow. Scope restricts sources and proposed edits to the sample selection.
- One active conversation turn, two canned history entries, and one edit batch. New Chat, history selection, state selection, Replay State, and reload reset the sample library. This is not a persistence or multi-turn prototype.
- No keys, providers, external requests, Electron IPC, real Saves, persistence, or production mutations. Even Apply is in memory.
- The model picker uses existing repository model labels. No Auto mode, routing, pricing, or provider settings are implied.
- Removed composer suggestions and the footer beneath the composer stay removed. Recent Chats belongs only to the full-page empty state.
- Logo pulse/rotation and streaming cursor respect reduced motion. Progress always has a text label; animation is decorative.

## Checks

```sh
./apps/desktop/node_modules/.bin/tsc -p apps/desktop/prototypes/assistant/tsconfig.json
pnpm --config.verify-deps-before-run=false --filter @pond/desktop exec vite build --config prototypes/assistant/vite.config.ts
```

See `design-qa.md` for browser checks and limitations. Competitive source notes are in `docs/research/2026-08-30-assistant-competitive-research.md` at the repository root.
