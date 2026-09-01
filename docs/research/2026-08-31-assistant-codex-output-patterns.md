# Codex output patterns for Pond

Investigated August 31, 2026. Companion research for the user's Are.na references and the Assistant output issue. No implementation changes.

## Conclusion

The useful Codex pattern is **an answer with inspectable work behind it**. Pond should synthesize the relevant Saves into readable prose, expose sources beside that answer, and use distinct controls for questions or proposed library changes. Raw retrieval records are input to that work, not its finished presentation.

This is a recommendation for Pond, informed by the documented separation below. It is not evidence that changing typography alone will correct Pond's generated answers.

## Evidence and limits

- **Documented:** current official OpenAI documentation fetched through OpenAI Docs. Protocol facts establish available data and lifecycle boundaries; they do not establish exact desktop pixels, default collapse behavior, or every model's output quality.
- **Provided screenshot:** the user's Pond output visibly includes serialized Save objects and literal `\n` escapes. It establishes the visible failure, not whether generation, parsing, persistence, or rendering caused it.
- **Proposal:** a product recommendation for Pond. No live Codex tasks were changed, no app actions were executed, and no fresh native screenshots were captured for this note.

## What Codex separates

| Documented behavior | Implication for Pond |
| --- | --- |
| Agent messages carry their own text and may distinguish commentary from a final answer. Commands, file changes, searches, and tool calls are separate item types. [C1] | Keep the answer, progress, and retrieval/tool data separate through generation, storage, and rendering. |
| Items have start/completion lifecycles; the completed item is authoritative. Turns can complete, fail, or be interrupted. [C1] | Status copy and completed answers must reflect actual state. Do not leave a spinner or partial table implying success after failure. |
| Plans have step statuses, while file changes carry structured changes and diffs. [C1] | Use compact progress when useful, and a dedicated preview when work will modify the library. |
| Approval requests are scoped to the conversation and resolve independently. Structured user-input requests also have a resolution lifecycle. [C2] | Clarification choices and mutation approvals need real controls and states, not simulated button text in Markdown. |
| Search activity appears with tool activity in the desktop transcript. [C3] | Show what was consulted without substituting a retrieval dump for the answer. |
| The review pane supports inspecting changes and line-specific feedback; review findings appear inline. [C4] | Borrow reviewability for library edits, not Git terminology. |

OpenAI explicitly distinguishes interfaces for different work: ChatGPT Work favors nontechnical language and finished outputs, while Codex can expose developer details and review views. Pond's audience and library work are closer to the first presentation goal. Coding commands, terminal logs, Git diffs, and repository controls should not be copied into Pond merely because Codex has them. [C5]

## Proposed response anatomy for Pond

1. **Answer:** a short direct response to the question, then only the supporting detail needed. Render semantic paragraphs, lists, emphasis, links, and tables. A comparison can use a table; a single fact does not need cards. IDs, object keys, serialization escapes, and extraction boilerplate stay out of normal prose.
2. **Sources:** recognizable Save titles and optional thumbnails, linked to the corresponding saved item. A compact disclosure such as “3 Saves consulted” can hold fuller evidence. Distinguish sources retrieved from sources actually supporting the answer; a count alone does not make an unsupported claim trustworthy.
3. **Work status:** a quiet, transient line for actual operations such as searching or reading. More detail may expand into a trace. Do not fabricate “thinking” or chain-of-thought text, and do not animate a generated table before the system knows that a table is being produced.
4. **Question:** when a missing choice materially changes the result, show a short question and selectable answers with a free-form route. Preserve its selected/resolved state in history. Do not add a questionnaire to every response.
5. **Proposed change:** preview concrete Save titles, tags, or destination changes with a clear action. Applied, declined, and failed must be distinct. An answer saying “organized” must follow a successful operation, not merely a model's intent.

These are proposed product rules, not a claim that Codex renders each item in this exact form. In particular, the reviewed documentation does not specify Codex's precise Markdown component styling or citation layout.

## What to verify before polishing the output

The provided screenshot requires investigation across the answer boundary. Inspect one fresh failing turn end to end: actual user question, bounded retrieved records, raw model response, parsed answer object, persisted message, and rendered message. Keep that diagnostic material out of the user's normal transcript.

Acceptance checks should include:

- A factual library question produces a relevant synthesis with verifiable Save references, not a list of retrieved JSON records.
- Empty or irrelevant retrieval produces an honest limitation rather than an answer from unrelated Saves.
- Long scraped descriptions containing navigation text and escaped whitespace do not dominate the answer.
- An explicit request for raw JSON can still receive JSON; ordinary questions never receive it as a silent failure fallback.
- A failed or interrupted generation offers an accurate recoverable state. It does not display internal context as a substitute answer.
- The same semantic response works in the full Assistant page and narrow companion pane.

These checks are recommended for Pond; this research did not run them or identify a confirmed implementation cause.

## Primary sources

- [C1 — Codex App Server: events and item types](https://learn.chatgpt.com/docs/app-server#events)
- [C2 — Codex App Server: approvals and user input](https://learn.chatgpt.com/docs/app-server#approvals)
- [C3 — Web search](https://learn.chatgpt.com/docs/web-search)
- [C4 — Code review: review in the app and results](https://learn.chatgpt.com/docs/code-review)
- [C5 — Compare ChatGPT Work and Codex on desktop](https://learn.chatgpt.com/docs/use-chatgpt#compare-chatgpt-work-and-codex-on-desktop)
