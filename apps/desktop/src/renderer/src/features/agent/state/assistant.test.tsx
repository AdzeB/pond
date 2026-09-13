// @vitest-environment jsdom
import { EventType } from "@ag-ui/core";
import type {
  AssistantChunk,
  AssistantMessage,
  AssistantSendResult,
} from "@shared/assistant";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { libraryChrome } from "../../library/state/library-chrome";
import { selection } from "../../library/state/selection";
import { assistant, useAssistant } from "./assistant";

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
  const query = vi.fn(
    async (
      name: string,
      _params?: { content?: string; allowCloudOnce?: boolean },
    ) => {
      if (name === "agent.messages") return [question];
      if (name === "agent.chats") return [{ id: "chat", title: "Topics" }];
      if (name === "agent.send") return { chatId: "chat", accepted: true };
      return {};
    },
  );
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
  const sendCall = query.mock.calls.find((call) => call[0] === "agent.send");
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
      draft: "",
    });
    await act(async () => assistant.showReferences("first-reply"));
    expect(JSON.parse(host.textContent || "{}").reference).toBeNull();
    await act(async () => {
      assistant.showReferences("second-reply");
      assistant.closeReferences();
    });
    expect(JSON.parse(host.textContent || "{}").draft).toBe("");
    await act(async () => assistant.openChat("first"));
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

it("ignores old history that arrives after switching chats", async () => {
  const first = Promise.withResolvers<AssistantMessage[]>();
  const second = Promise.withResolvers<AssistantMessage[]>();
  vi.stubGlobal("pond", {
    query: (name: string, args: { chatId?: string }) =>
      name === "agent.messages"
        ? args.chatId === "first"
          ? first.promise
          : second.promise
        : Promise.resolve([]),
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
          chatId: state.chatId,
          loading: state.loading,
          messages: state.messages,
        })}
      </output>
    );
  }
  try {
    await act(async () => root.render(<Probe />));
    let oldLoad: Promise<void> = Promise.resolve();
    let newLoad: Promise<void> = Promise.resolve();
    await act(async () => {
      oldLoad = assistant.openChat("first");
      newLoad = assistant.openChat("second");
    });
    await act(async () => {
      second.resolve([
        {
          id: "new",
          chatId: "second",
          role: "assistant",
          content: "Current conversation",
          metadata: null,
        },
      ]);
      await newLoad;
    });
    await act(async () => {
      first.resolve([
        {
          id: "old",
          chatId: "first",
          role: "assistant",
          content: "Stale conversation",
          metadata: null,
        },
      ]);
      await oldLoad;
    });
    expect(host.textContent).toContain("Current conversation");
    expect(host.textContent).not.toContain("Stale conversation");
    expect(host.textContent).toContain('"loading":false');
  } finally {
    await act(async () => root.unmount());
    assistant.newChat();
    vi.unstubAllGlobals();
  }
});

it("keeps the singleton run across pane unmount and waits for saved metadata after stop", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const response = Promise.withResolvers<AssistantSendResult>();
  let persisted: AssistantMessage[] = [];
  let receive: (chunk: AssistantChunk) => void = () => {};
  let requestId = "";
  const unsubscribe = vi.fn();
  const query = vi.fn((name: string, args: { requestId?: string }) => {
    if (name === "agent.messages") return Promise.resolve(persisted);
    if (name === "agent.send") {
      requestId = args.requestId ?? "";
      return response.promise;
    }
    if (name === "agent.stop") return Promise.resolve({});
    return Promise.resolve([]);
  });
  vi.stubGlobal("pond", {
    query,
    onAgentChunk(listener: (chunk: AssistantChunk) => void) {
      receive = listener;
      return unsubscribe;
    },
  });
  assistant.newChat();
  const host = document.createElement("div");
  const root = createRoot(host);
  function Probe() {
    const state = useAssistant();
    return (
      <output>
        {JSON.stringify({
          chatId: state.chatId,
          busy: state.busy,
          draft: state.draft,
          stream:
            state.messages.at(-1)?.role === "assistant"
              ? state.messages.at(-1)?.content
              : "",
          messages: state.messages,
        })}
      </output>
    );
  }
  let pending: Promise<void> = Promise.resolve();
  try {
    await act(async () => {
      root.render(<Probe />);
      await assistant.openChat("chat");
      assistant.setDraft("Find a film");
      pending = assistant.send("openai");
    });
    await vi.waitFor(() => expect(requestId).not.toBe(""));
    await act(async () => root.render(null));
    expect(unsubscribe).not.toHaveBeenCalled();
    await act(async () => {
      receive({
        chatId: "chat",
        requestId,
        type: "stream",
        event: {
          type: EventType.RUN_STARTED,
          threadId: "chat",
          runId: requestId,
        },
      });
      receive({
        chatId: "chat",
        requestId,
        type: "stream",
        event: {
          type: EventType.TEXT_MESSAGE_START,
          messageId: `${requestId}:assistant`,
          role: "assistant",
        },
      });
      receive({
        chatId: "chat",
        requestId,
        type: "stream",
        event: {
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId: `${requestId}:assistant`,
          delta: "A film",
        },
      });
      root.render(<Probe />);
    });
    await vi.waitFor(() =>
      expect(host.textContent).toContain('"stream":"A film"'),
    );
    await act(async () => {
      assistant.stop();
      assistant.newChat();
      await assistant.openChat("other");
      assistant.setDraft("Another request");
      await assistant.send("openai");
    });
    expect(host.textContent).toContain('"busy":true');
    expect(host.textContent).toContain('"chatId":"chat"');
    expect(
      query.mock.calls.filter(([name]) => name === "agent.send"),
    ).toHaveLength(1);
    expect(unsubscribe).not.toHaveBeenCalled();
    persisted = [
      {
        id: `${requestId}:assistant`,
        chatId: "chat",
        role: "assistant",
        content: "A film",
        metadata: {
          stopped: true,
          sources: [
            {
              id: "film",
              title: "Saved film",
              source: "arena",
              url: "https://example.com/film",
            },
          ],
        },
      },
    ];
    await act(async () => {
      response.resolve({ chatId: "chat", accepted: true, stopped: true });
      await pending;
    });
    expect(host.textContent).toContain('"busy":false');
    expect(host.textContent).toContain('"draft":"Another request"');
    expect(host.textContent).toContain('"stopped":true');
    expect(host.textContent).toContain("Saved film");
    expect(unsubscribe).toHaveBeenCalledOnce();
  } finally {
    response.resolve({ chatId: "chat", accepted: true, stopped: true });
    await act(async () => {
      await pending;
      root.unmount();
    });
    assistant.newChat();
    vi.unstubAllGlobals();
  }
});

it("cancels before a new chat finishes creating without dispatching a model request", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const created = Promise.withResolvers<{ id: string }>();
  const query = vi.fn((name: string) =>
    name === "agent.newChat" ? created.promise : Promise.resolve([]),
  );
  vi.stubGlobal("pond", { query, onAgentChunk: () => () => {} });
  assistant.newChat();
  const host = document.createElement("div");
  const root = createRoot(host);
  function Probe() {
    const state = useAssistant();
    return (
      <output>
        {JSON.stringify({ busy: state.busy, draft: state.draft })}
      </output>
    );
  }
  let pending: Promise<void> = Promise.resolve();
  try {
    await act(async () => {
      root.render(<Probe />);
      assistant.setDraft("Do not send this");
      pending = assistant.send("openai");
    });
    await act(async () => assistant.stop());
    await act(async () => {
      created.resolve({ id: "new-chat" });
      await pending;
    });
    expect(query.mock.calls.some(([name]) => name === "agent.send")).toBe(
      false,
    );
    expect(host.textContent).toContain('"busy":false');
    expect(host.textContent).toContain("Do not send this");
  } finally {
    created.resolve({ id: "new-chat" });
    await act(async () => {
      await pending;
      root.unmount();
    });
    assistant.newChat();
    vi.unstubAllGlobals();
  }
});

it("restores each chat's draft, visible attachments, and the unstarted composer", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("pond", {
    query: async () => [],
    onAgentChunk: () => () => {},
  });
  const host = document.createElement("div");
  const root = createRoot(host);
  function Probe() {
    const state = useAssistant();
    return (
      <output>
        {JSON.stringify({
          draft: state.draft,
          attachments: state.attachments.map((save) => save.id),
        })}
      </output>
    );
  }
  const save = {
    id: "draft-save",
    title: "A Save",
    source: "arena",
    url: "https://example.com/save",
  };
  try {
    await act(async () => {
      root.render(<Probe />);
      assistant.newChat();
      assistant.setDraft("Unstarted draft");
      await assistant.openChat("composer-first");
      assistant.setDraft("First draft");
      assistant.attach([save]);
      await assistant.openChat("composer-second");
    });
    expect(JSON.parse(host.textContent || "{}")).toEqual({
      draft: "",
      attachments: [],
    });
    await act(async () => {
      assistant.setDraft("Second draft");
      await assistant.openChat("composer-first");
    });
    expect(JSON.parse(host.textContent || "{}")).toEqual({
      draft: "First draft",
      attachments: [save.id],
    });
    await act(async () => assistant.newChat());
    expect(JSON.parse(host.textContent || "{}").draft).toBe("Unstarted draft");
    await act(async () => assistant.openChat("composer-second"));
    expect(JSON.parse(host.textContent || "{}")).toEqual({
      draft: "Second draft",
      attachments: [],
    });
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});

it("preserves new attachments on failure and retries the original attachments after navigation", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const failed = Promise.withResolvers<AssistantSendResult>();
  const requests: {
    scope?: { kind: string; id?: string };
    attachmentIds?: string[];
  }[] = [];
  const query = vi.fn(
    (
      name: string,
      args: { scope?: { kind: string; id?: string }; attachmentIds?: string[] },
    ) => {
      if (name === "agent.send") {
        requests.push(args);
        return requests.length === 1
          ? failed.promise
          : Promise.resolve({ chatId: "retry-context", accepted: true });
      }
      return Promise.resolve([]);
    },
  );
  vi.stubGlobal("pond", { query, onAgentChunk: () => () => {} });
  const host = document.createElement("div");
  const root = createRoot(host);
  function Probe() {
    const state = useAssistant();
    return (
      <output>
        {JSON.stringify({
          draft: state.draft,
          attachments: state.attachments.map((save) => save.id),
          failed: !!state.failed,
        })}
      </output>
    );
  }
  const original = {
    id: "original",
    title: "Original",
    source: "arena",
    url: "https://example.com/original",
  };
  const next = { ...original, id: "next" };
  let pending = Promise.resolve();
  try {
    await act(async () => {
      root.render(<Probe />);
      await assistant.openChat("retry-context");
      assistant.setDraft("Compare these Saves");
      assistant.attach([original]);
      pending = assistant.send("openai");
    });
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    await act(async () => {
      assistant.attach([next]);
      failed.resolve({
        chatId: "retry-context",
        accepted: false,
        error: "Unavailable",
      });
      await pending;
    });
    expect(JSON.parse(host.textContent || "{}")).toEqual({
      draft: "",
      attachments: ["next"],
      failed: true,
    });
    await act(async () => {
      await assistant.openChat("retry-other");
      libraryChrome.setNav({ kind: "folder", id: "different-folder" });
      await assistant.openChat("retry-context");
      await assistant.retry();
    });
    expect(requests).toHaveLength(2);
    for (const request of requests) {
      expect(request.scope).toEqual({ kind: "library" });
      expect(request.attachmentIds).toEqual(["original"]);
    }
    expect(JSON.parse(host.textContent || "{}")).toEqual({
      draft: "",
      attachments: ["next"],
      failed: false,
    });
  } finally {
    failed.resolve({ chatId: "retry-context", accepted: false });
    await act(async () => {
      await pending;
      root.unmount();
    });
    libraryChrome.setNav({ kind: "all" });
    vi.unstubAllGlobals();
  }
});

it("always searches the entire library and never infers attachments from selection pronouns", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const created = Promise.withResolvers<{ id: string }>();
  const query = vi.fn(
    (
      name: string,
      _args?: {
        scope?: { kind: string; id?: string };
        attachmentIds?: string[];
      },
    ) => {
      if (name === "agent.newChat") return created.promise;
      if (name === "agent.send")
        return Promise.resolve({ chatId: "snapshot-created", accepted: true });
      return Promise.resolve([]);
    },
  );
  vi.stubGlobal("pond", { query, onAgentChunk: () => () => {} });
  const host = document.createElement("div");
  const root = createRoot(host);
  function Probe() {
    useAssistant();
    return null;
  }
  let pending = Promise.resolve();
  try {
    await act(async () => {
      root.render(<Probe />);
      assistant.newChat();
      assistant.setDraft("Summarize these selected Saves");
      selection.set(["invisible-selection"]);
      libraryChrome.setNav({ kind: "folder", id: "original-folder" });
      pending = assistant.send("openai");
      libraryChrome.setNav({ kind: "folder", id: "later-folder" });
      created.resolve({ id: "snapshot-created" });
      await pending;
    });
    expect(query).toHaveBeenCalledWith(
      "agent.send",
      expect.objectContaining({
        scope: { kind: "library" },
        attachmentIds: [],
      }),
    );
  } finally {
    created.resolve({ id: "snapshot-created" });
    await act(async () => {
      await pending;
      root.unmount();
    });
    selection.clear();
    libraryChrome.setNav({ kind: "all" });
    vi.unstubAllGlobals();
  }
});

it("sends attached Saves as context while searching the entire library", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const response = Promise.withResolvers<AssistantSendResult>();
  const query = vi.fn((name: string) =>
    name === "agent.send" ? response.promise : Promise.resolve([]),
  );
  vi.stubGlobal("pond", { query, onAgentChunk: () => () => {} });
  const host = document.createElement("div");
  const root = createRoot(host);
  function Probe() {
    const state = useAssistant();
    return (
      <output>
        {JSON.stringify({
          draft: state.draft,
          attachments: state.attachments.map((save) => save.id),
        })}
      </output>
    );
  }
  const source = {
    id: "scope-save",
    title: "Save",
    source: "arena",
    url: "https://example.com/save",
  };
  let pending = Promise.resolve();
  try {
    await act(async () => {
      root.render(<Probe />);
      await assistant.openChat("scope-reset");
      assistant.attach([source, { ...source, id: "second-save" }]);
      assistant.removeAttachment("second-save");
    });
    expect(JSON.parse(host.textContent || "{}").attachments).toEqual([
      source.id,
    ]);
    await act(async () => assistant.removeAttachment(source.id));
    expect(JSON.parse(host.textContent || "{}").attachments).toEqual([]);
    await act(async () => {
      assistant.attach([source]);
      assistant.setDraft("Summarize this Save");
      pending = assistant.send("openai");
    });
    expect(JSON.parse(host.textContent || "{}")).toEqual({
      draft: "",
      attachments: [],
    });
    await act(async () => {
      response.resolve({
        chatId: "scope-reset",
        accepted: false,
        error: "Unavailable",
      });
      await pending;
    });
    expect(JSON.parse(host.textContent || "{}")).toEqual({
      draft: "Summarize this Save",
      attachments: [source.id],
    });
    expect(query).toHaveBeenCalledWith(
      "agent.send",
      expect.objectContaining({
        attachmentIds: [source.id],
        scope: { kind: "library" },
      }),
    );
  } finally {
    response.resolve({ chatId: "scope-reset", accepted: false });
    await act(async () => {
      await pending;
      root.unmount();
    });
    vi.unstubAllGlobals();
  }
});
