// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { assistant, useAssistant } from "./assistant";

vi.mock("./folders", () => ({ folders: { refresh: vi.fn() } }));
it("keeps the composer draft and attachments when answering a question", async () => {
  const question = {
    id: "question",
    chatId: "chat",
    role: "assistant",
    content: "",
    metadata: {
      question: { question: "Which topic?", options: ["Film", "Architecture"] },
    },
  };
  const query = vi.fn(async (name: string) => {
    if (name === "agent.messages") return [question];
    if (name === "agent.chats") return [{ id: "chat", title: "Topics" }];
    if (name === "agent.send") return { chatId: "chat", accepted: true };
    return {};
  });
  vi.stubGlobal("pond", { query, onAgentChunk: () => () => {} });
  const host = document.createElement("div");
  const root = createRoot(host);
  function Probe() {
    const state = useAssistant();
    return (
      <output>
        {JSON.stringify({
          draft: state.draft,
          attached: state.attachments.length,
        })}
      </output>
    );
  }
  await act(async () => {
    root.render(<Probe />);
    await assistant.openChat("chat");
  });
  await act(async () => {
    assistant.setDraft("Keep this draft");
    assistant.attach([
      {
        id: "film",
        title: "Film",
        source: "arena",
        url: "https://example.com",
      },
    ]);
    await assistant.answerQuestion("question", "Architecture", "openai");
  });
  expect(host.textContent).toContain('"draft":"Keep this draft"');
  expect(host.textContent).toContain('"attached":1');
  expect(query).toHaveBeenCalledWith(
    "agent.send",
    expect.objectContaining({
      content: "Architecture",
      replyToQuestion: "question",
    }),
  );
  const sendCall = query.mock.calls.find((call) => call[0] === "agent.send") as
    | [string, Record<string, unknown>]
    | undefined;
  expect(sendCall?.[1]).not.toHaveProperty("allowCloudOnce");
  expect(host.textContent).toContain('"draft":"Keep this draft"');
  expect(host.textContent).toContain('"attached":1');
  await act(async () => assistant.quote("A paragraph.\n\nSecond paragraph."));
  expect(host.textContent).toContain(
    "Keep this draft\\n\\n> A paragraph.\\n> \\n> Second paragraph.\\n\\n",
  );
  expect(host.textContent).toContain('"attached":1');
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});

it("appends shortcut actions without replacing the draft and rejects oversized insertions", async () => {
  vi.stubGlobal("pond", {
    query: async () => [],
    onAgentChunk: () => () => {},
  });
  assistant.newChat();
  const host = document.createElement("div");
  const root = createRoot(host);
  function Probe() {
    const state = useAssistant();
    return (
      <output>
        {JSON.stringify({ draft: state.draft, error: state.error })}
      </output>
    );
  }
  try {
    await act(async () => root.render(<Probe />));
    await act(async () => {
      assistant.setDraft("Keep my notes");
      expect(assistant.appendDraft("Summarize these Saves.")).toBe(true);
    });
    expect(JSON.parse(host.textContent || "{}").draft).toBe(
      "Keep my notes\n\nSummarize these Saves.",
    );
    await act(async () => {
      assistant.setDraft("x".repeat(31990));
      expect(assistant.appendDraft("This will not fit.")).toBe(false);
      expect(assistant.quote("Neither will this quote.")).toBe(false);
    });
    const result = JSON.parse(host.textContent || "{}");
    expect(result.draft).toBe("x".repeat(31990));
    expect(result.error).toContain("quote is too long");
  } finally {
    await act(async () => root.unmount());
    assistant.newChat();
    vi.unstubAllGlobals();
  }
});

it("keeps reference browsing scoped to a conversation without changing the draft", async () => {
  const source = {
    id: "save",
    title: "Reference",
    source: "arena",
    url: "https://example.com",
  };
  vi.stubGlobal("pond", {
    query: async (name: string, args: { chatId?: string }) =>
      name === "agent.chats"
        ? []
        : name === "agent.messages"
          ? [
              {
                id: `${args.chatId}-reply`,
                chatId: args.chatId,
                role: "assistant",
                content: "An answer",
                metadata: { sources: [source] },
              },
            ]
          : {},
    onAgentChunk: () => () => {},
  });
  assistant.newChat();
  const host = document.createElement("div");
  const root = createRoot(host);
  function Probe() {
    const state = useAssistant();
    return (
      <output>
        {JSON.stringify({
          reference: state.referenceMessageId,
          draft: state.draft,
        })}
      </output>
    );
  }
  try {
    await act(async () => {
      root.render(<Probe />);
      await assistant.openChat("first");
    });
    await act(async () => {
      assistant.setDraft("Keep my draft");
      assistant.showReferences("first-reply");
    });
    expect(JSON.parse(host.textContent || "{}")).toEqual({
      reference: "first-reply",
      draft: "Keep my draft",
    });
    await act(async () => assistant.showReferences("unknown"));
    expect(JSON.parse(host.textContent || "{}").reference).toBe("first-reply");
    await act(async () => assistant.openChat("second"));
    expect(JSON.parse(host.textContent || "{}")).toEqual({
      reference: null,
      draft: "Keep my draft",
    });
    await act(async () => assistant.showReferences("first-reply"));
    expect(JSON.parse(host.textContent || "{}").reference).toBeNull();
    await act(async () => {
      assistant.showReferences("second-reply");
      assistant.closeReferences();
    });
    expect(JSON.parse(host.textContent || "{}").draft).toBe("Keep my draft");
    await act(async () => {
      assistant.showReferences("second-reply");
      assistant.newChat();
    });
    expect(JSON.parse(host.textContent || "{}").reference).toBeNull();
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
