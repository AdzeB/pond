# Assistant preview QA

Current result: library-context and change-review prototype passes typecheck, Biome, build, and interactive browser checks. Historical notes below describe earlier revisions.

## Composer Add menu (2026-08-31)

Placement correction: the main menu now anchors to the composer shell, with an 8px gap above its top edge. Side flipping is disabled; available-height scrolling remains enabled. Typecheck and Biome pass. Live remeasurement was blocked by a browser tab-claim timeout.

- Replaced the plus button's immediate dialog with a grouped, anchored menu modeled on the supplied Codex screenshot. Existing keyboard focus indication remains, with a smaller outline and a quiet active background.
- Verified the library-picker handoff, Design folder attachment, referenced-Save attachment, and Organize draft. Folder and action selection return focus to the composer; Escape returns to the plus; ArrowDown opens and focuses the first item.
- Inspected dark full-page and light 280px-pane menus. The popover can extend beyond the pane, while staying within the browser viewport. Long descriptions truncate; menu content scrolls in constrained heights.
- No new runtime console errors during verification. TypeScript, Biome, and Vite build pass; the existing build-size warning remains.
- All options use the existing sample data. Actions fill drafts rather than sending automatically. The user's removed composer footer/suggestions remain absent.

## Library context and change review (2026-08-31)

Implemented in the isolated preview only: 17 gallery states; rich removable context; immutable sent attachment list; explicit search scope; source excerpts and Save/library dialogs; branded work statuses and Stop/Continue; selected before/after edits; per-item application; partial failure, retry, dismissal, and undo.

Verified through the live in-app browser:

- Sending the two attached Saves preserves the sent attachment group and uses Attached Saves scope. Stop preserves the question and attachments; Continue reaches an answer with exactly two sources.
- Context search filters the sample picker; selection attaches the Save; removing the last attachment returns scope to Library.
- Design Folder search reports its scope and returns the two original folder Saves. Organize These Saves produces exactly two proposed edits. Dismiss makes no edits; Review Again reopens the proposal.
- Applying with the last-edit failure simulation produces two successful changes and one unfinished edit. Retry reaches three applied edits. Show in Library displays the updated title, added tag, and moved folder.
- Undo restores the original title and metadata, verified in the Save dialog.
- Deselecting every edit disables Apply. Selecting only the tag edit updates that Save alone; title and third Save's Inbox folder remain unchanged.
- Full Page / Side Pane share the same live interaction. Light and dark designs inspected; 280px pane context and review inspected with no horizontal overflow and the composer inside the pane.
- At a 420 × 820 viewport, the page has no horizontal overflow and the composer ends at 748.5px inside the viewport. Temporary viewport overrides were reset.
- Model search for OpenAI and keyboard selection still work; sending displays explicit OpenAI consent. No new browser console errors were recorded during QA.
- The Reading state uses the `pond-thinking` animation, verified from its rendered computed style.
- Final full-page review screenshot: `/tmp/pond-assistant-review-2026-08-31.png`.
- Static preview states initially scroll to the response instead of opening midway through a card. Working responses retain follow-on-scroll behavior.

TypeScript and Biome pass. Vite builds; the existing shared-UI chunk-size warning remains nonblocking. No test suite added to this disposable UI.

Limits: canned one-turn content and history; no real provider or library behavior. Reduced motion is covered by CSS but not separately emulated with an OS preference. Screen reader use was not independently exercised. The attempted automated mid-application Stop check reached the completed state before interruption; mid-batch cancellation remains code-inspected rather than timing-verified. The older suggestion/footer screenshots below predate their user-requested removal.

## Thinking logo revision

- Reuses Pond’s existing Logo component in the response identity row. During Searching and Responding it pulses and turns 90 degrees over 2.8 seconds; completed and inactive states are still.
- Replaces the separate magnifier and pulsing dot with one branded activity indicator. Status text remains visible and is announced politely; the decorative logo is hidden from assistive technology.
- `prefers-reduced-motion: reduce` disables logo and text-cursor animation. No JavaScript animation timers, new dependencies, or changes to the production logo component.
- TypeScript and Biome pass. Visual motion verification is pending because browser control again stalled while claiming the preview tab.

## Model picker revision

- Replaced the provider menu with Pond’s accessible Combobox primitive: search, compact model rows, provider metadata, a Local badge, and a selected checkmark. Removed the large heading and repeated descriptions. The trigger now shows the actual model name.
- Reference: Cursor staff screenshot at https://us1.discourse-cdn.com/cursor1/original/3X/9/d/9d32dbb29a2d4931622c7deb47a318b84db582df.png, inspected locally as `/tmp/pond-cursor-picker-reference.png`. Borrowed its compact search/list hierarchy, not Auto/MAX toggles or model pricing.
- Scope: only the isolated preview. Existing provider state and consent logic remain in place. Cloud model labels match the repository’s configured models; no provider integration was added.
- TypeScript, Biome, and Vite build pass. The existing nonblocking chunk-size warning remains.
- Subsequently verified the dark picker in a 380px pane using a temporary Chrome preview: compact rows fit, provider-name search filters to GPT-4.1 mini, and ArrowDown/Enter selects that model and updates the trigger. Browser interruptions prevented completing light-theme, 280px, and empty-query checks. The broader verification below describes the original preview.

## Target and evidence

This is an intentional Linear/Notion blend using Pond’s design system, not a pixel-for-pixel clone. The user requested an isolated preview, a full Assistant page intended for the sidebar, and the name Assistant throughout.

- Source visual: `/tmp/linear-agent-reference.png` (1438 × 1098). Official Linear composer and suggestion-row reference.
- Full page: `/tmp/pond-assistant-page-dark.png` (1280 × 720).
- Tall full page: `/tmp/pond-assistant-page-tall.png` (1440 × 900).
- Narrow pane: `/tmp/pond-assistant-pane-280.png` (1280 × 720 viewport, 280px pane).
- Runtime: `http://127.0.0.1:4317/`.
- Compared the source and implemented empty state together in the image review. The source is a promotional crop; no exact pixel equivalence is claimed. Both show the composer with three suggestions. The implementation intentionally adds Pond’s context/provider controls and a small introduction, and removes the decorative background logo.
- Focused composer and narrow-pane screenshots were inspected for wrapping, spacing, action visibility, and control density. Browser screenshots use CSS viewport dimensions at 1× output. No source density normalization was used because this is a composition reference, not a clone.

## Findings and corrections

1. P2: Starting content clipped in short windows. Reduced empty-state spacing; hid the optional recent-chat list and redundant brand mark in short full-page layouts. Narrow panes use single-line suggestions in short windows. Rechecked at 1280 × 720 with a 280px pane; input, all three suggestions, and footer remain visible. At 1440 × 900, the full-page footer ends at 793px inside the panel’s 821px bottom edge.
2. P1: Opening a menu crashed because a Base UI group label lacked group context. Replaced decorative menu headings with Pond’s section labels. Rechecked model selection, chat history, and context menus successfully.
3. P2: Editing the root file could recreate a React root during hot reload. Separated the entry point from the refreshable prototype component. Reloaded and checked browser errors after the final interactions: no new errors.
4. P2: Secondary text was too faint. Raised suggestion descriptions, input placeholders, provider hints, and preview captions to Pond’s stronger secondary text token. Inspected dark and light themes.

## Visual review

- Typography: Pond’s local Inter font, compact controls, larger page introduction, readable unboxed responses. No external fonts.
- Spacing: A 600px empty-state column and 640px reading column on the page; the pane adapts to 280–560px. Shared composer anatomy with width-specific wrapping.
- Color: Pond’s generated neutral tokens with restrained surfaces and borders. Warm-white light canvas and charcoal dark canvas. Warning color is limited to the error indicator.
- Assets: Existing Pond logo and icon components; no invented illustrations, decorative gradients, or remote image dependencies.
- Copy: Assistant throughout. Sample content, citations, context, provider consent, and history are explicitly identified as simulated. Source excerpts carry a disclaimer and are not presented as real quotations.

## Verified behavior

- Full Page/Side Pane and URL-backed scenario/theme/width selection.
- Suggestions fill the composer; Enter submits; Shift+Enter adds a line.
- Simulated search, streamed text, and completed response.
- Provider consent starts the simulation; Minnow fallback preserves the draft.
- Context addition/removal, model selection, and chat history.
- Collapsible references and sample Save dialog.
- No-results follow-up fills a broader search.
- Close/reopen the pane and New Chat.
- 420px viewport has no document-level horizontal overflow. Temporary viewport overrides were reset.
- TypeScript check, Biome check, and Vite build pass.

## Limits

- This is disposable UI code with canned responses. It does not connect to Electron, real Saves, providers, persistence, or the live sidebar.
- The existing live Agent UI has not been renamed or modified.
- Copy uses the browser clipboard with a manual-selection fallback. Native IME composition and screen-reader behavior were not independently exercised.
- Build has a nonblocking chunk-size warning for the shared UI dependencies. Production integration should use the application’s normal bundling.
