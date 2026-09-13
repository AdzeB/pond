# Build chat interfaces with Pond UI

Import each component from its Pond UI folder, such as `@pond/ui/composer`, `@pond/ui/message`, or `@pond/ui/attachment`. Import runtime hooks and types from `@pond/ui/assistant-runtime`. Assistant UI owns chat behavior; Pond owns styling, controls, and motion. This package includes the core primitive namespaces and the reusable chat components Pond needs. It does not install the full Elements catalog.

## Choose a runtime

Wrap the interface in `AssistantRuntimeProvider`. Supply a runtime owned by the application:

```tsx
import { AssistantRuntimeProvider, useLocalRuntime, type ChatModelAdapter } from "@pond/ui/assistant-runtime";
import { ConversationView } from "@pond/ui/thread";

function Chat({ adapter }: { adapter: ChatModelAdapter }) {
  const runtime = useLocalRuntime(adapter);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ConversationView />
    </AssistantRuntimeProvider>
  );
}
```

Use `useExternalStoreRuntime` when the application already owns messages and run state. Use `useLocalRuntime` when Assistant UI should own that state. Do not attach both runtimes to the same conversation. Use the component subpaths to keep the chat runtime out of unrelated screens. Each component owns its implementation and styles in a top-level folder.

The application owns provider selection, transport, credentials, history storage, attachments, tool execution, and approval policy. Nothing here starts network calls, creates cloud accounts, or changes Pond's production Agent runtime. Local runtime history is in memory unless the application supplies persistence adapters. A later AI SDK migration can supply the runtime without replacing these components.

## Primitive coverage

The pinned dependencies are `@assistant-ui/react@0.15.18` and `@assistant-ui/react-markdown@0.14.14`.

These primitive namespaces are available, checked against the [Assistant UI primitives documentation](https://www.assistant-ui.com/docs/primitives):

- `ActionBar`, `Attachment`, `BranchPicker`, `ChainOfThought`
- `Composer`, `Error`, `Message`, `MessagePart`
- `SelectionToolbar`, `Thread`, `ThreadList`, `ThreadListItem`

Each namespace is checked against upstream's public surface during type checking. Props come from the upstream component, including refs, `render`, `asChild`, and event cancellation. Visual controls default to Pond buttons and tokens. State-only parts and hooks preserve upstream behavior without extra DOM. Compatibility aliases and experimental members retain their upstream names; the unstable composer trigger popover remains a low-level escape hatch, with application composition responsible for its visible surface.

Keep primitive context intact: message actions belong inside `Message.Root`, attachment controls inside `Attachment.Root`, and thread controls inside the runtime provider. Use the supplied `Message.Parts` and `Thread.Messages` renderers to establish message and part scopes. Keep `Thread.ViewportFooter` inside `Thread.Viewport` so upstream can account for composer height while scrolling. Primitive buttons need caller-supplied labels.

## Reusable components

| Component | Purpose |
| --- | --- |
| `ConversationView` | Scrollable thread, empty state, message renderers, footer, and composer |
| `ComposerView` | Draft, attachments, quote, toolbar slot, send, and stop |
| `MessageView`, `MessageActions` | Message parts, errors, copy, retry, and branch controls |
| `Markdown` | Runtime text with character smoothing and Pond prose, code, and table styles |
| `AttachmentItem`, `FilePart` | Compact image/file tiles, filename tooltips, preview dialogs, upload/error feedback, and file metadata |
| `Activity`, `Details`, `Reasoning`, `ToolCall` | Grouped activity, accessible disclosures, tool inputs/results, and basic approval requests |
| `Source` | URL or document reference, with safe HTTP(S) links |
| `ThreadHistory`, `HistoryItem` | Create, select, and archive chats through runtime adapters |
| `ComposerPopover`, `ComposerOptions` | One composer-width tray with animated pages and keyboard focus management |
| `ModelPicker` | Searchable models with provider and connection metadata inline |
| `ContextPicker`, `ContextChip`, `ContextChips` | Search, select, and remove context |
| `ReferenceList` | Open consulted references or add them to the next message separately |
| `PromptSuggestions`, `AgentHeader` | Starter prompts and a compact conversation header |
| `RunStatus`, `ErrorNotice` | Working, stopped, complete, and retry states |
| `ApprovalCard`, `QuestionCard` | Explicit decisions and answers with pending/error feedback |
| `CodeBlock`, `CodeHeader` | Code presentation and clipboard feedback |

Pass `ConversationView.components` to customize message renderers, `MessageView.components` for individual parts, and `ComposerView.toolbar` for attachment, model, or context controls. Replace the `Source` renderer to open a Pond Save or pass a reference to application operations. The generic `ToolCall` supports explicit approve/reject requests through the runtime response callback. Replace it for domain-specific results, option-based approvals, permission grants, and other custom input requests. An approval never runs automatically. `ApprovalCard` and `QuestionCard` expose callbacks; the application owns the resulting operation and resolved state.

`AttachmentItem` is read-only by default. Set `removable` only in a composer attachment scope; `ComposerView` and `MessageView` handle this distinction. Local image previews release their object URLs on removal.

`ComposerPopover` anchors above the entire composer. Supply the composer element ref and input ref, then switch models, references, context, and history within its pages. Keep model metadata in each item. The root options page has no redundant header. `ModelPicker`, context, references, and suggestions are controlled compositions; applications connect their callbacks to actual domain operations.

`Markdown` preserves upstream plugin and component options. Raw HTML is skipped by default and upstream's URL transform remains in place. Configure plugins explicitly, for example GFM tables. Do not pass untrusted URL transforms or enable raw HTML without reviewing the source.

## Motion and verification

Use Pond's `MotionConfig` preference. Text and Markdown smoothing honor that preference and the system setting. Message and attachment entry, popup entry/exit, disclosures, and action reveals use shared motion or token-based transitions. Disclosures animate occupied height; Assistant UI owns scroll anchoring and stream state. This presentation smoothing cannot make a backend deliver text before it has validated an answer.

Behavioral tests cover runtime send/stop, rendered refs, `asChild`, prevented actions, retries, safe references, disclosure controls, main-composer quoting, model search, approval failures/retries, explicit question submission, independent reference actions, and popover keyboard focus.

Maps, dashboards, code execution, specialist widgets, and hosted services remain outside this package. Add individual Elements when a Pond feature needs them.
