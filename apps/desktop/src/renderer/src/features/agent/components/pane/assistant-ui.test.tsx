// @vitest-environment jsdom
import { Button } from "@pond/ui";
import { ApprovalCard } from "@pond/ui/approval-card";
import {
  AssistantRuntimeProvider,
  type ChatModelAdapter,
  useAui,
  useLocalRuntime,
} from "@pond/ui/assistant-runtime";
import { Composer } from "@pond/ui/composer";
import { ComposerOptions } from "@pond/ui/composer-options";
import { ComposerPopover } from "@pond/ui/composer-popover";
import { Details } from "@pond/ui/details";
import { ModelPicker } from "@pond/ui/model-picker";
import { QuestionCard } from "@pond/ui/question-card";
import { ReferenceList } from "@pond/ui/reference-list";
import { Source } from "@pond/ui/source";
import { ConversationView } from "@pond/ui/thread";
import { MotionConfig } from "motion/react";
import { act, createRef, type ReactNode, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

let host: HTMLDivElement;
let root: Root;
const originalScrollTo = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollTo",
);

function Harness({
  adapter,
  children,
}: {
  adapter: ChatModelAdapter;
  children: ReactNode;
}) {
  const runtime = useLocalRuntime(adapter);
  return (
    <MotionConfig reducedMotion="always">
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </MotionConfig>
  );
}

function button(label: string) {
  const found = [...host.querySelectorAll("button")].find(
    (item) =>
      item.textContent === label || item.getAttribute("aria-label") === label,
  );
  if (!found) throw new Error(`Missing button: ${label}`);
  return found;
}
async function click(label: string) {
  await act(async () => button(label).click());
}
async function type(text: string) {
  const input = host.querySelector("textarea");
  if (!input) throw new Error("Missing composer input");
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set?.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value(this: HTMLElement, options: ScrollToOptions) {
      this.scrollTop = options.top ?? this.scrollTop;
      this.scrollLeft = options.left ?? this.scrollLeft;
    },
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  if (originalScrollTo)
    Object.defineProperty(HTMLElement.prototype, "scrollTo", originalScrollTo);
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollTo");
  vi.unstubAllGlobals();
});

it("sends through the runtime, renders partial text, and stops the active stream", async () => {
  const cancelled = vi.fn();
  const received: string[] = [];
  const adapter: ChatModelAdapter = {
    async *run({ messages, abortSignal }) {
      const last = messages.at(-1);
      received.push(
        last?.content
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("") ?? "",
      );
      yield { content: [{ type: "text", text: "Partial answer" }] };
      await new Promise<void>((resolve) =>
        abortSignal.addEventListener(
          "abort",
          () => {
            cancelled();
            resolve();
          },
          { once: true },
        ),
      );
    },
  };
  await act(async () =>
    root.render(
      <Harness adapter={adapter}>
        <ConversationView />
      </Harness>,
    ),
  );
  expect(button("Send").disabled).toBe(true);
  await type("Make the composer clean");
  await click("Send");
  expect(received).toEqual(["Make the composer clean"]);
  expect(host.textContent).toContain("Partial answer");
  expect(host.querySelector("textarea")?.value).toBe("");
  await click("Stop");
  expect(cancelled).toHaveBeenCalledOnce();
  expect(host.textContent).toContain("Partial answer");
  expect(button("Send")).toBeDefined();
});

it("preserves refs, render composition, and preventDefault on send", async () => {
  const run = vi.fn<ChatModelAdapter["run"]>(async () => ({
    content: [{ type: "text", text: "Done" }],
  }));
  const inputRef = createRef<HTMLTextAreaElement>();
  const buttonRef = createRef<HTMLButtonElement>();
  await act(async () =>
    root.render(
      <Harness adapter={{ run }}>
        <Composer.Root>
          <Composer.Input ref={inputRef} />
          <Composer.Send
            ref={buttonRef}
            render={<Button variant="secondary" />}
            onClick={(event) => event.preventDefault()}
          >
            Review
          </Composer.Send>
          <Composer.Send asChild>
            <Button variant="primary">Submit</Button>
          </Composer.Send>
        </Composer.Root>
      </Harness>,
    ),
  );
  expect(inputRef.current).toBe(host.querySelector("textarea"));
  expect(buttonRef.current).toBe(button("Review"));
  expect(host.querySelector("button button")).toBeNull();
  await type("Hello");
  await click("Review");
  expect(run).not.toHaveBeenCalled();
  expect(inputRef.current?.value).toBe("Hello");
  await click("Submit");
  expect(run).toHaveBeenCalledOnce();
});

it("retries a sent message", async () => {
  const run = vi.fn<ChatModelAdapter["run"]>(async () => ({
    content: [{ type: "text", text: "**Complete** answer" }],
  }));
  await act(async () =>
    root.render(
      <Harness adapter={{ run }}>
        <ConversationView />
      </Harness>,
    ),
  );
  await type("First draft");
  await click("Send");
  expect(host.querySelector("strong")?.textContent).toBe("Complete");
  expect(host.textContent).not.toContain("Thinking");
  await click("Retry");
  expect(run).toHaveBeenCalledTimes(2);
});

it("opens source links safely and expands details with a real disclosure", async () => {
  await act(async () =>
    root.render(
      <MotionConfig reducedMotion="always">
        <Source
          type="source"
          sourceType="url"
          id="valid"
          url="https://example.com/reference"
          title="Reference"
          status={{ type: "complete" }}
        />
        <Source
          type="source"
          sourceType="url"
          id="unsafe"
          url="javascript:alert(1)"
          title="Unsafe link"
          status={{ type: "complete" }}
        />
        <Details title="Tool details">Finished searching</Details>
      </MotionConfig>,
    ),
  );
  expect(host.querySelectorAll("a")).toHaveLength(1);
  expect(host.querySelector("a")?.getAttribute("rel")).toBe(
    "noopener noreferrer",
  );
  expect(button("Tool details").getAttribute("aria-expanded")).toBe("false");
  await click("Tool details");
  expect(button("Tool details").getAttribute("aria-expanded")).toBe("true");
  expect(host.textContent).toContain("Finished searching");
});

it("searches models and preserves disabled provider choices", async () => {
  const select = vi.fn();
  await act(async () =>
    root.render(
      <ModelPicker
        models={[
          {
            id: "local",
            name: "Local Writer",
            provider: "Ollama",
            connection: "Local",
          },
          {
            id: "cloud",
            name: "Cloud Writer",
            provider: "Provider",
            connection: "API key",
            disabled: true,
          },
        ]}
        value="local"
        onValueChange={select}
      />,
    ),
  );
  const options = [...host.querySelectorAll<HTMLElement>('[role="option"]')];
  expect(options.map((item) => item.textContent)).toEqual(
    expect.arrayContaining([
      expect.stringContaining("Ollama"),
      expect.stringContaining("API key"),
    ]),
  );
  expect(options[1]?.getAttribute("aria-disabled")).toBe("true");
  await act(async () => options[1]?.click());
  expect(select).not.toHaveBeenCalled();
  const input = host.querySelector("input");
  if (!input) throw new Error("Missing model search");
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set?.call(input, "missing model");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(host.textContent).toContain("No models found");
});

it("reports failed approvals and allows an explicit retry", async () => {
  const approve = vi.fn(async () => {
    if (approve.mock.calls.length === 1)
      throw new Error("The review changed. Try again.");
  });
  const reject = vi.fn(async () => {});
  await act(async () =>
    root.render(
      <MotionConfig reducedMotion="always">
        <ApprovalCard
          title="Update these Saves?"
          onApprove={approve}
          onReject={reject}
        />
      </MotionConfig>,
    ),
  );
  await click("Approve");
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(
    "The review changed",
  );
  expect(button("Approve").disabled).toBe(false);
  await click("Approve");
  expect(approve).toHaveBeenCalledTimes(2);
  expect(reject).not.toHaveBeenCalled();
  expect(host.querySelector('[role="alert"]')).toBeNull();
});

it("requires a question answer and submits the selected option", async () => {
  const answer = vi.fn(async (_value: string) => {});
  await act(async () =>
    root.render(
      <MotionConfig reducedMotion="always">
        <QuestionCard
          title="How should I group these?"
          options={[
            { id: "theme", label: "By Theme" },
            { id: "project", label: "By Project" },
          ]}
          onAnswer={answer}
        />
      </MotionConfig>,
    ),
  );
  expect(button("Continue").disabled).toBe(true);
  await click("By Theme");
  expect(button("By Theme").getAttribute("aria-pressed")).toBe("true");
  await click("Continue");
  expect(answer).toHaveBeenCalledWith("theme");
});

it("keeps reference opening separate from adding composer context", async () => {
  const open = vi.fn();
  const add = vi.fn();
  const item = { id: "one", title: "Composition notes", meta: "Your Library" };
  await act(async () =>
    root.render(<ReferenceList items={[item]} onOpen={open} onAdd={add} />),
  );
  await click("Open Composition notes");
  expect(open).toHaveBeenCalledWith(item);
  expect(add).not.toHaveBeenCalled();
  await click("Add Composition notes");
  expect(add).toHaveBeenCalledWith(item);
});

it("quotes a response into the composer without sending it", async () => {
  const run = vi.fn<ChatModelAdapter["run"]>(async () => ({
    content: [{ type: "text", text: "A useful answer" }],
  }));
  await act(async () =>
    root.render(
      <Harness adapter={{ run }}>
        <ConversationView />
      </Harness>,
    ),
  );
  await type("A question");
  await click("Send");
  await click("Quote");
  const composer = host.querySelector("form");
  expect(composer?.textContent).toContain("A useful answer");
  expect(run).toHaveBeenCalledOnce();
  await click("Remove quote");
  expect(composer?.textContent).not.toContain("A useful answer");
});

function PopoverHarness() {
  const [page, setPage] = useState<"options" | "models" | null>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  return (
    <MotionConfig reducedMotion="always">
      <div ref={anchor}>
        <textarea ref={input} aria-label="Draft" />
        <Button
          data-composer-options-trigger
          onClick={() => setPage("options")}
        >
          Open Options
        </Button>
      </div>
      <ComposerPopover
        open={page !== null}
        page={page ?? "options"}
        title={page === "models" ? "Models" : undefined}
        onOpenChange={(open) => {
          if (!open) setPage(null);
        }}
        onBack={() => setPage("options")}
        anchorRef={anchor}
        inputRef={input}
      >
        {page === "models" ? (
          <ModelPicker
            models={[
              {
                id: "local",
                name: "Local model",
                provider: "Ollama",
                connection: "Local",
              },
            ]}
            value="local"
            onValueChange={() => setPage(null)}
          />
        ) : (
          <ComposerOptions.Group label="Model">
            <ComposerOptions.Item onClick={() => setPage("models")}>
              Choose Model
            </ComposerOptions.Item>
          </ComposerOptions.Group>
        )}
      </ComposerPopover>
    </MotionConfig>
  );
}
async function settlePopover() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 60));
  });
}

it("keeps one composer popover across pages and restores focus on Escape", async () => {
  await act(async () => root.render(<PopoverHarness />));
  await click("Open Options");
  await settlePopover();
  const popup = document.querySelector('[role="dialog"]');
  expect(popup).not.toBeNull();
  const choose = [
    ...document.querySelectorAll<HTMLButtonElement>("button"),
  ].find((item) => item.textContent === "Choose Model");
  if (!choose) throw new Error("Missing model action");
  await act(async () => choose.click());
  await settlePopover();
  expect(document.querySelector('[role="dialog"]')).toBe(popup);
  expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
  expect(document.activeElement?.getAttribute("aria-label")).toBe(
    "Search models",
  );
  await act(async () => {
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await settlePopover();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(
    host.querySelector('textarea[aria-label="Draft"]'),
  );
});

function AddSampleAttachment() {
  const aui = useAui();
  return (
    <Button
      onClick={() =>
        aui
          .thread()
          .composer()
          .addAttachment({
            name: "Reference.png",
            type: "image",
            contentType: "image/png",
            content: [
              { type: "image", image: "data:image/png;base64,aGVsbG8=" },
            ],
          })
      }
    >
      Add Sample
    </Button>
  );
}

it("previews and removes draft attachments, then keeps sent attachments read-only", async () => {
  const received: string[] = [];
  const adapter: ChatModelAdapter = {
    async run({ messages }) {
      received.push(
        ...(messages.at(-1)?.attachments?.map((item) => item.name) ?? []),
      );
      return { content: [{ type: "text", text: "Attached" }] };
    },
  };
  await act(async () =>
    root.render(
      <Harness adapter={adapter}>
        <AddSampleAttachment />
        <ConversationView />
      </Harness>,
    ),
  );
  await click("Add Sample");
  await click("Preview Reference.png");
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
    "Reference.png",
  );
  await act(async () =>
    document
      .querySelector<HTMLButtonElement>('[aria-label="Close Preview"]')
      ?.click(),
  );
  await click("Remove Reference.png");
  expect(host.querySelector('[aria-label="Preview Reference.png"]')).toBeNull();
  await click("Add Sample");
  await click("Send");
  expect(received).toEqual(["Reference.png"]);
  expect(
    host.querySelector('[aria-label="Preview Reference.png"]'),
  ).not.toBeNull();
  expect(host.querySelector('[aria-label="Remove Reference.png"]')).toBeNull();
  await click("Preview Reference.png");
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
    "Reference.png",
  );
});

it("renders response tables and nested lists through the shared chat renderer", async () => {
  const adapter: ChatModelAdapter = {
    async run() {
      return {
        content: [
          {
            type: "text",
            text: [
              "| Save | Topic |\n| --- | --- |\n| Photography | Light |",
              "1. Choose a subject.\n   1. Start wide.\n   2. Move closer.\n2. Compare the photographs.",
              '```json\n{\n  "title": "Photography"\n}\n```',
            ].join("\n\n"),
          },
        ],
      };
    },
  };
  await act(async () =>
    root.render(
      <Harness adapter={adapter}>
        <ConversationView />
      </Harness>,
    ),
  );
  await type("Show the results");
  await click("Send");
  expect(host.querySelector("table th")?.textContent).toBe("Save");
  expect(host.querySelector("table td")?.textContent).toBe("Photography");
  expect(host.querySelectorAll("ol ol > li")).toHaveLength(2);
  expect(host.querySelector("pre code")?.textContent).toContain(
    '"title": "Photography"',
  );
  expect(button("Copy code")).toBeDefined();
});
