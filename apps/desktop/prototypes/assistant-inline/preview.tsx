import { useState } from "react";
import { AssistantResponse } from "../../src/renderer/src/components/library/agent-pane/assistant-response";
import { ConversationThread } from "../../src/renderer/src/components/library/agent-pane/conversation-thread";
import { Question } from "../../src/renderer/src/components/library/agent-pane/question";
import { ResultSet } from "../../src/renderer/src/components/library/agent-pane/result-set";
import { ToolActivity } from "../../src/renderer/src/components/library/agent-pane/tool-activity";
import "../../src/renderer/src/styles.css";
import "./preview.css";

const sources = [
  {
    id: "film",
    title: "Suspiria — color and atmosphere",
    source: "arena",
    url: "https://www.are.na/example",
    description:
      "A reference study of saturated reds and blues, theatrical lighting, and unease.",
  },
  {
    id: "skin",
    title: "Under the Skin — a study in contrast",
    source: "arena",
    url: "https://www.are.na/example",
    description:
      "Dark negative space and isolated highlights build a different kind of tension.",
  },
];
const markdown = `## Two ways to build an atmosphere

Both references use **light as a narrative device**, but their visual language differs. Suspiria [1] relies on saturated color; Under the Skin [2] uses restraint and contrast.

| Reference | Palette | A useful direction |
| :--- | :--- | :--- |
| Suspiria | Red, blue, magenta | Push the atmosphere through color |
| Under the Skin | Black, white, silver | Make the subject emerge from darkness |

> Treat these as visual references, not a fixed recipe.

### A small working palette

\`\`\`css
:root {
  --background: #151617;
  --highlight: #c94848;
  --foreground: #faf8f4;
}
\`\`\`

- [x] Collect the references
- [ ] Choose a direction
- [ ] Try it in a composition

You can keep the references in the conversation and compare a different pair next.`;

export function Preview() {
  const [narrow, setNarrow] = useState(false);
  const [notice, setNotice] = useState("");
  const [answer, setAnswer] = useState<string>();
  const [replies, setReplies] = useState<number[]>([]);
  return (
    <div className="preview-page">
      <header>
        <div>
          <strong>Assistant components</strong>
          <p>Design preview · sample content, no library changes</p>
        </div>
        <div className="preview-controls">
          <button
            type="button"
            onClick={() =>
              setReplies((previous) => [...previous, previous.length + 1])
            }
          >
            Add Sample Reply
          </button>
          <button type="button" onClick={() => setNarrow(!narrow)}>
            {narrow ? "Page width" : "Side panel width"}
          </button>
        </div>
      </header>
      <main style={{ maxWidth: narrow ? 340 : 720 }}>
        <ConversationThread chatId="preview">
          <ToolActivity
            steps={[
              {
                id: "search",
                label: "Search library",
                detail: "film lighting",
                status: "complete",
                elapsedMs: 42,
              },
              {
                id: "read",
                label: "Read Save",
                status: "complete",
                elapsedMs: 14,
              },
            ]}
          />
          <AssistantResponse
            content={markdown}
            sources={sources}
            onOpenSave={(id) => setNotice(`Preview: open ${id}`)}
            onAttach={(saves) =>
              setNotice(`Preview: ${saves.length} Save added to message`)
            }
          />
          <ResultSet
            result={{
              title: "References in this comparison",
              saveIds: sources.map((source) => source.id),
            }}
            sources={sources}
            onOpenSave={(id) => setNotice(`Preview: open ${id}`)}
            onAttach={(saves) =>
              setNotice(`Preview: ${saves.length} Save added to message`)
            }
          />
          <Question
            question={{
              question: "Which direction would you like to explore?",
              options: ["Saturated color", "Light and shadow", "A mix of both"],
            }}
            answer={answer}
            disabled={false}
            onAnswer={setAnswer}
            onWrite={() => setNotice("Preview: focus the composer")}
          />
          <ToolActivity
            steps={[
              {
                id: "failed",
                label: "Read Save",
                status: "error",
                elapsedMs: 50,
              },
            ]}
          />
          <p role="status">{notice}</p>
          {replies.map((reply) => (
            <p key={reply}>
              Sample reply {reply}: more conversation content to verify
              scrolling.
            </p>
          ))}
        </ConversationThread>
      </main>
    </div>
  );
}
