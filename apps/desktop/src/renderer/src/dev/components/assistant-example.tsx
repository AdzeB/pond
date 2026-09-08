import {
  IconAlbum2Outline18,
  IconChevronDownOutline18,
  IconClockRotateClockwiseOutline18,
  IconFileOutline18,
  IconImageOutline18,
  IconLink2Outline18,
  IconPlusOutline18,
  IconTagsOutline18,
  IconWandSparkleOutline18,
} from "@pond/icons/outline/18";
import { Button } from "@pond/ui";
import { AgentHeader } from "@pond/ui/agent-header";
import { ApprovalCard } from "@pond/ui/approval-card";
import {
  AssistantRuntimeProvider,
  type ChatModelAdapter,
  type ChatModelRunResult,
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  type SourceMessagePartProps,
  type ThreadMessageLike,
  useAui,
  useLocalRuntime,
} from "@pond/ui/assistant-runtime";
import { Activity } from "@pond/ui/chain-of-thought";
import { CodeBlock } from "@pond/ui/code-block";
import { Composer, ComposerView } from "@pond/ui/composer";
import { ComposerOptions } from "@pond/ui/composer-options";
import { ComposerPopover } from "@pond/ui/composer-popover";
import { ContextChips } from "@pond/ui/context-chip";
import { ContextPicker } from "@pond/ui/context-picker";
import { ErrorNotice } from "@pond/ui/error-notice";
import { MessageView } from "@pond/ui/message";
import { type AssistantModel, ModelPicker } from "@pond/ui/model-picker";
import { PromptSuggestions } from "@pond/ui/prompt-suggestions";
import { QuestionCard } from "@pond/ui/question-card";
import { type ReferenceItem, ReferenceList } from "@pond/ui/reference-list";
import { RunStatus } from "@pond/ui/run-status";
import { ConversationView } from "@pond/ui/thread";
import { ThreadHistory, ThreadList } from "@pond/ui/thread-list";
import { createContext, useContext, useRef, useState } from "react";
import styles from "./assistant-example.module.css";

const references: ReferenceItem[] = [
  {
    id: "composition",
    title: "A quieter way to compose a photograph",
    meta: "Read.cv · Article",
    description:
      "Leave room around the subject. Use the frame to make the important thing feel obvious.",
    media: <IconImageOutline18 />,
  },
  {
    id: "light",
    title: "Working with natural light",
    meta: "Are.na · Collection",
    description:
      "Soft window light and open shade bring texture to everyday scenes.",
    media: <IconAlbum2Outline18 />,
  },
  {
    id: "practice",
    title: "Notes on looking more closely",
    meta: "Your Library · Note",
    description:
      "A small set of constraints makes a useful daily photography practice.",
    media: <IconFileOutline18 />,
  },
];
const models: AssistantModel[] = [
  {
    id: "local-20b",
    name: "gpt-oss:20b",
    provider: "Ollama",
    connection: "Local",
    description: "Runs on your Mac",
  },
  {
    id: "local-26b",
    name: "gemma4:26b",
    provider: "Ollama",
    connection: "Local",
    description: "Text and images",
  },
  {
    id: "cloud",
    name: "Cloud model",
    provider: "Your provider",
    connection: "API key",
    disabled: true,
    description: "Add a key in Settings",
  },
];
const answer =
  "Your Saves point to a few habits that make a photograph feel more intentional.\n\n**Give the subject room.** A little empty space makes the frame easier to read. Move closer only when the detail is the story.\n\n**Follow the light.** Start with a window or open shade. Look for the direction of the light before changing your camera settings.\n\nTry one constraint on your next walk: photograph the same subject from three distances.";
const tool = {
  type: "tool-call",
  toolCallId: "search",
  toolName: "Search Library",
  args: { query: "photography composition" },
  argsText: '{"query":"photography composition"}',
  result: { found: 3 },
} satisfies NonNullable<ChatModelRunResult["content"]>[number];
const citation = {
  type: "source",
  sourceType: "url",
  id: "composition",
  title: "3 Saves consulted",
  url: "https://example.com/composition",
} satisfies NonNullable<ChatModelRunResult["content"]>[number];
const initialMessages: ThreadMessageLike[] = [
  {
    id: "question",
    role: "user",
    content: [
      { type: "text", text: "What can I learn from my photography Saves?" },
    ],
  },
  {
    id: "answer",
    role: "assistant",
    content: [tool, { type: "text", text: answer }, citation],
  },
];
const adapter: ChatModelAdapter = {
  async *run({ abortSignal }) {
    for (let length = 1; length <= answer.length; length += 4) {
      if (abortSignal.aborted) return;
      yield {
        content: [tool, { type: "text", text: answer.slice(0, length) }],
      };
      await new Promise<void>((resolve) => {
        const finish = () => {
          clearTimeout(timer);
          abortSignal.removeEventListener("abort", finish);
          resolve();
        };
        const timer = setTimeout(finish, 16);
        abortSignal.addEventListener("abort", finish, { once: true });
      });
    }
    if (!abortSignal.aborted)
      yield { content: [tool, { type: "text", text: answer }, citation] };
  },
};
const attachments = new CompositeAttachmentAdapter([
  new SimpleTextAttachmentAdapter(),
  new SimpleImageAttachmentAdapter(),
]);
type TrayPage = "options" | "models" | "context" | "references" | "history";
const TrayContext = createContext<(page: TrayPage) => void>(() => {});

function InlineReference({ title }: SourceMessagePartProps) {
  const open = useContext(TrayContext);
  return (
    <Button variant="ghost" size="xs" onClick={() => open("references")}>
      <IconLink2Outline18 />
      {title}
    </Button>
  );
}
function GalleryMessage() {
  return (
    <MessageView
      components={{
        ChainOfThought: Activity,
        Source: InlineReference,
      }}
    />
  );
}
function GalleryComposer({
  page,
  setPage,
}: {
  page: TrayPage | null;
  setPage: (page: TrayPage | null) => void;
}) {
  const aui = useAui();
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [model, setModel] = useState("local-20b");
  const [selected, setSelected] = useState<string[]>([]);
  const [openedReference, setOpenedReference] = useState<string | null>(null);
  const current = models.find((item) => item.id === model);
  const titles = {
    models: "Models",
    context: "Add Context",
    references: "Referenced Saves",
    history: "Chat History",
    options: undefined,
  };
  function prompt(text: string) {
    aui.composer().setText(text);
    setPage(null);
    inputRef.current?.focus();
  }
  const content =
    page === "models" ? (
      <ModelPicker
        models={models}
        value={model}
        onValueChange={(value) => {
          setModel(value);
          setPage(null);
        }}
      />
    ) : page === "context" ? (
      <ContextPicker
        items={references}
        selectedIds={selected}
        onSelectedIdsChange={setSelected}
      />
    ) : page === "references" ? (
      <>
        <ReferenceList
          items={references}
          addedIds={selected}
          onOpen={(item) => setOpenedReference(item.id)}
          onAdd={(item) =>
            setSelected((ids) =>
              ids.includes(item.id) ? ids : [...ids, item.id],
            )
          }
        />
        {openedReference && (
          <div className={styles.referencePreview}>
            <p>
              {
                references.find((item) => item.id === openedReference)
                  ?.description
              }
            </p>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setOpenedReference(null)}
            >
              Close Preview
            </Button>
          </div>
        )}
      </>
    ) : page === "history" ? (
      <ThreadHistory />
    ) : (
      <>
        <ComposerOptions.Group label="Add">
          <ComposerOptions.Item
            icon={<IconAlbum2Outline18 />}
            description="Choose saved items"
            onClick={() => setPage("context")}
          >
            Saves from Library
          </ComposerOptions.Item>
          <ComposerOptions.Item
            icon={<IconLink2Outline18 />}
            description="From this response"
            onClick={() => setPage("references")}
          >
            Referenced Saves
          </ComposerOptions.Item>
          <Composer.AddAttachment
            render={
              <ComposerOptions.Item
                icon={<IconFileOutline18 />}
                description="Images and text files"
              />
            }
          >
            Attach Files
          </Composer.AddAttachment>
        </ComposerOptions.Group>
        <ComposerOptions.Group label="Actions">
          <ComposerOptions.Item
            icon={<IconFileOutline18 />}
            description="Pull out the main ideas"
            onClick={() => prompt("Summarize these Saves")}
          >
            Summarize
          </ComposerOptions.Item>
          <ComposerOptions.Item
            icon={<IconLink2Outline18 />}
            description="Find shared themes"
            onClick={() => prompt("Connect ideas across these Saves")}
          >
            Connect Ideas
          </ComposerOptions.Item>
          <ComposerOptions.Item
            icon={<IconTagsOutline18 />}
            description="Review titles and tags"
            onClick={() => prompt("Help me organize these Saves")}
          >
            Organize Saves
          </ComposerOptions.Item>
        </ComposerOptions.Group>
        <ComposerOptions.Group label="Model">
          <ComposerOptions.Item
            icon={<IconWandSparkleOutline18 />}
            description={`${current?.provider} · ${current?.connection}`}
            trailing={<IconChevronDownOutline18 />}
            onClick={() => setPage("models")}
          >
            {current?.name}
          </ComposerOptions.Item>
        </ComposerOptions.Group>
      </>
    );
  return (
    <div ref={anchorRef}>
      <ComposerView
        inputProps={{ ref: inputRef }}
        toolbar={
          <>
            <Button
              data-composer-options-trigger
              icon
              size="xs"
              variant="ghost"
              aria-label="Composer options"
              aria-expanded={page === "options"}
              onClick={() => setPage(page === "options" ? null : "options")}
            >
              <IconPlusOutline18 />
            </Button>
            <Button
              data-composer-options-trigger
              variant="ghost"
              size="xs"
              aria-label="Choose model"
              aria-expanded={page === "models"}
              onClick={() => setPage(page === "models" ? null : "models")}
            >
              {current?.name}
              <IconChevronDownOutline18 />
            </Button>
          </>
        }
      >
        <ContextChips
          items={references.filter((item) => selected.includes(item.id))}
          onRemove={(id) =>
            setSelected((ids) => ids.filter((item) => item !== id))
          }
        />
      </ComposerView>
      <ComposerPopover
        open={page !== null}
        onOpenChange={(open) => {
          if (!open) setPage(null);
        }}
        anchorRef={anchorRef}
        inputRef={inputRef}
        page={page ?? "options"}
        title={page ? titles[page] : undefined}
        onBack={() => setPage("options")}
      >
        {content}
      </ComposerPopover>
    </div>
  );
}

function EmptyConversation() {
  const aui = useAui();
  return (
    <div className={styles.welcome}>
      <h2>What are you thinking about?</h2>
      <p>
        Find a connection, revisit an idea, or make something from your Saves.
      </p>
      <PromptSuggestions
        suggestions={[
          {
            id: "summary",
            title: "Find the main ideas",
            description: "Bring your Saves together",
            icon: <IconFileOutline18 />,
          },
          {
            id: "connections",
            title: "Connect the dots",
            description: "Look for a shared theme",
            icon: <IconLink2Outline18 />,
          },
        ]}
        onSelect={(id) => {
          aui
            .composer()
            .setText(
              id === "summary"
                ? "Summarize my recent Saves"
                : "What connects my recent Saves?",
            );
          aui.composer().send();
        }}
      />
    </div>
  );
}
export function AssistantExample() {
  const runtime = useLocalRuntime(adapter, {
    initialMessages,
    adapters: { attachments },
  });
  const [page, setPage] = useState<TrayPage | null>(null);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <TrayContext value={setPage}>
        <div className={styles.example}>
          <div className={styles.conversation}>
            <AgentHeader title="Photography ideas" subtitle="Agent">
              <Button
                size="xs"
                variant="ghost"
                icon
                aria-label="Chat history"
                data-composer-options-trigger
                onClick={() => setPage(page === "history" ? null : "history")}
              >
                <IconClockRotateClockwiseOutline18 />
              </Button>
              <ThreadList.New
                aria-label="New Chat"
                render={<Button icon variant="ghost" size="xs" />}
                onClick={() => setPage(null)}
              >
                <IconPlusOutline18 />
              </ThreadList.New>
            </AgentHeader>
            <ConversationView
              components={{ Message: GalleryMessage }}
              empty={<EmptyConversation />}
              composer={<GalleryComposer page={page} setPage={setPage} />}
            />
          </div>
          <p className={styles.note}>
            Local preview · Try the composer, model picker, references, or a new
            chat.
          </p>
        </div>
      </TrayContext>
    </AssistantRuntimeProvider>
  );
}

export function AssistantReviewExample() {
  const [decision, setDecision] = useState<"pending" | "approved" | "rejected">(
    "pending",
  );
  const [answer, setAnswer] = useState<string>();
  return (
    <div className={styles.samples}>
      <ApprovalCard
        title="Update 3 Saves?"
        description="Review the proposed changes before applying them."
        decision={decision}
        approveLabel="Apply Changes"
        onApprove={async () => setDecision("approved")}
        onReject={async () => setDecision("rejected")}
      >
        <ul className={styles.changes}>
          <li>
            <span>Photography basics</span>
            <span>2 tags added</span>
          </li>
          <li>
            <span>Working with natural light</span>
            <span>Title updated</span>
          </li>
          <li>
            <span>Notes on looking</span>
            <span>Moved to Photography</span>
          </li>
        </ul>
      </ApprovalCard>
      <QuestionCard
        title="How should I organize these Saves?"
        options={[
          {
            id: "theme",
            label: "By theme",
            description: "Keep related ideas together",
          },
          {
            id: "project",
            label: "By project",
            description: "Group Saves by what you're working on",
          },
        ]}
        answered={answer}
        onAnswer={async (value) => setAnswer(value)}
      />
      <Button
        variant="ghost"
        size="xs"
        onClick={() => {
          setDecision("pending");
          setAnswer(undefined);
        }}
      >
        Reset Review
      </Button>
    </div>
  );
}
export function AssistantStatesExample() {
  const [retry, setRetry] = useState(false);
  return (
    <div className={styles.samples}>
      <RunStatus>Searching your Library</RunStatus>
      <RunStatus state="stopped">
        Response stopped. Your partial answer is still here.
      </RunStatus>
      {retry ? (
        <RunStatus state="complete">Connection restored</RunStatus>
      ) : (
        <ErrorNotice
          title="The model isn't available"
          onRetry={() => setRetry(true)}
        >
          Check that your local provider is running, then try again.
        </ErrorNotice>
      )}
      <CodeBlock
        language="json"
        code={
          '{\n  "title": "Photography",\n  "tags": ["composition", "light"]\n}'
        }
      />
    </div>
  );
}
export function AssistantContextExample() {
  const [selected, setSelected] = useState<string[]>(["composition"]);
  const [opened, setOpened] = useState<string>();
  return (
    <div className={styles.samples}>
      <ContextChips
        items={references.filter((item) => selected.includes(item.id))}
        onRemove={(id) =>
          setSelected((ids) => ids.filter((value) => value !== id))
        }
      />
      <ContextPicker
        items={references}
        selectedIds={selected}
        onSelectedIdsChange={setSelected}
      />
      <ReferenceList
        items={references}
        onOpen={(item) => setOpened(item.description)}
        addedIds={selected}
        onAdd={(item) => setSelected((ids) => [...ids, item.id])}
      />
      {opened && <p>{opened}</p>}
    </div>
  );
}
export function AssistantModelsExample() {
  const [model, setModel] = useState<string | null>("local-20b");
  return (
    <div className={styles.samples}>
      <ModelPicker models={models} value={model} onValueChange={setModel} />
    </div>
  );
}
