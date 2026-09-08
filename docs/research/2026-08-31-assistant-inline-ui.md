# Pond Assistant inline UI

Implemented and inspected August 31, 2026. This follows the output repair and keeps the centered empty composer, shared page/pane header, and existing @ and / menus.

## References used

- [AI Elements inline citations](https://elements.ai-sdk.dev/components/inline-citation): inspected the live source-preview interaction. Pond uses this pattern for verified Save references with local thumbnails and actions to open or attach the Save.
- [assistant-ui tool UI](https://www.assistant-ui.com/elements/tool-fallback): separates tool execution from answer prose. Pond records actual search, read, folder, and proposal operations with completed, failed, and stopped states.
- [Prompt Kit messages](https://www.prompt-kit.com/docs/message): inspected the rendered message examples. Pond keeps assistant prose unboxed, limits its line length, and places small Copy and Quote actions nearby.
- [Prompt Kit prompt input](https://www.prompt-kit.com/docs/prompt-input): composer interaction reference. Pond retains its own context, model, keyboard, and consent behavior.

These are references for interaction patterns, not imported component dependencies or claims about matching Codex's model quality.

## What changed

Search results have typed, persisted result groups. The `showSaves` tool only accepts IDs already retrieved in the current context. Minnow's simple lookup path produces the same cards directly; other providers can call the tool. Result cards use real local media, expand beyond the first four, open a Save, and add context without sending or replacing the current draft.

Markdown retains its HTML, remote-image, unsafe-URL, and unknown-citation boundaries. It now renders code language headers and exact Copy Code actions, task lists, blockquotes, and independently scrolling tables. Source preview text and metadata come from actual saved records rather than generated labels. Source disclosures use compact rows.

Tool steps stream and persist alongside answers. Internal planning and raw tool payloads do not appear in the activity list. Existing question and change-review controls keep their resolution lifecycle. Quote appends Markdown and verified source attachments to the existing draft.

No new runtime dependency, model service, or automatic library mutation was added.

## Verification

- 89 focused agent, provider, renderer, and store tests pass.
- Seven live Minnow regressions pass using the actual native model.
- Both desktop TypeScript projects and targeted Biome checks pass.
- Live Pond: searched for Kanye references; restored the conversation from history; expanded results; verified local thumbnails; preserved a draft when attaching a result; opened the older Cosmos chair Save from its preview; inspected the real assistant side pane and header.
- Deterministic preview: checked paragraphs, source previews, tables, code copy feedback, task lists, questions, and tool failure states. Checked both 720px and 340px layouts. Narrow tables scroll inside the response without widening the page.

The isolated preview was retired during prototype cleanup. Use the maintained component gallery (`pnpm --filter @pond/desktop dev:components`) to inspect shared UI components.

## Follow-up interaction polish

The next pass added compact numbered citations, including grouped references, while keeping unknown references, existing links, code, and escaped Markdown literal. A dismissed @ or / menu reopens after typing its trigger again. Add-menu actions and Continue append to the current draft, and an oversized quote cannot clear its error by attaching context afterward.

Long conversations now have a Latest Reply control. The view follows incoming replies until the reader scrolls away, resumes when requested or when sending a message, and starts a different conversation at the bottom. Finishing a reply does not pull the reader away from earlier text. Source disclosures can expand without forcing a scroll to the bottom. The conversation remains keyboard-scrollable and contained at side-panel width.

Verification for this pass: 96 focused tests pass, both TypeScript projects pass, targeted Biome passes, and the desktop production build passes. Browser checks confirmed the narrow container does not overflow, numbered citations open full previews, incoming sample replies preserve reading position, and Latest Reply returns to the bottom. No browser runtime errors were recorded. The native app had an existing user draft open; it was left untouched rather than restarted or edited for these checks. No backend model changes were made in this pass.

## Limits

Minnow is still a small local model. These changes improve context handling and presentation; they do not guarantee reliable complex synthesis. The deterministic preview demonstrates supported rendering, not output produced by Minnow. Save tools currently read stored metadata, notes, and tags, not image pixels or full original documents. Code blocks are escaped and copyable, with language labels but no syntax highlighting. Historical malformed conversations are preserved rather than silently rewritten.
