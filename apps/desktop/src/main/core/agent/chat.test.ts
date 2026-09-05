import { DEFAULT_PREFS } from "@pond/schema/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type {
  AssistantMessage,
  AssistantQuestion,
  AssistantSend,
} from "../../../shared/assistant";
import {
  type ChatDependencies,
  sendMessage as send,
  stopMessage,
} from "./chat";
import type { ToolSpec } from "./complete";

interface ChatTestState {
  prefs: typeof DEFAULT_PREFS;
  complete: ReturnType<typeof vi.fn<ChatDependencies["completeWithTools"]>>;
  append: ReturnType<typeof vi.fn<ChatDependencies["appendMessage"]>>;
  broadcast: ReturnType<typeof vi.fn<ChatDependencies["broadcast"]>>;
  key: ReturnType<typeof vi.fn<ChatDependencies["keyFor"]>>;
  read: ReturnType<typeof vi.fn<ToolSpec["execute"]>>;
  history: AssistantMessage[];
  question: AssistantQuestion | undefined;
}
const mock: ChatTestState = {
  prefs: structuredClone(DEFAULT_PREFS),
  complete: vi.fn<ChatDependencies["completeWithTools"]>(),
  append: vi.fn<ChatDependencies["appendMessage"]>(),
  broadcast: vi.fn<ChatDependencies["broadcast"]>(),
  key: vi.fn<ChatDependencies["keyFor"]>(),
  read: vi.fn<ToolSpec["execute"]>().mockResolvedValue({}),
  history: [],
  question: undefined,
};
const dependencies: ChatDependencies = {
  conversationExists: async () => true,
  getPrefs: async () => mock.prefs,
  listFolders: async () => [],
  imagesForSaves: async () => [],
  broadcast: mock.broadcast,
  keyFor: mock.key,
  completeWithTools: mock.complete,
  appendMessage: mock.append,
  recentMessages: async () => mock.history,
  libraryContext: () => ({
    tools: [
      {
        name: "readSave",
        description: "Read a Save",
        schema: z.object({ id: z.string() }),
        execute: mock.read,
      },
    ],
    sources: () => [],
    changes: () => [],
    question: () => mock.question,
    results: () => [{ title: "References", saveIds: ["film"] }],
    steps: () => [
      {
        id: "step-1",
        label: "Search library",
        status: "complete",
        elapsedMs: 10,
      },
    ],
    retrieve: async () => [],
  }),
};
const sendMessage = (input: AssistantSend) => send(input, dependencies);
const request: AssistantSend = {
  chatId: "chat",
  requestId: "request",
  content: "Question",
  attachmentIds: [],
  scope: { kind: "library" },
  provider: "openai",
};

beforeEach(() => {
  vi.clearAllMocks();
  mock.history = [];
  mock.question = undefined;
  mock.prefs.agent = {
    ...DEFAULT_PREFS.agent,
    enabledKeys: {},
    languageModel: "openai",
    modelIds: {},
  };
  mock.key.mockResolvedValue("test-key");
  mock.append.mockResolvedValue(undefined);
  mock.complete.mockImplementation(async (input) => {
    input.onText("Reply");
    return "Reply";
  });
});

describe("Assistant requests", () => {
  it("sends to the chosen provider without a cloud consent gate", async () => {
    expect(await sendMessage(request)).toMatchObject({ accepted: true });
    expect(mock.append).toHaveBeenCalledTimes(2);
    expect(mock.append).toHaveBeenLastCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          results: [{ title: "References", saveIds: ["film"] }],
          steps: [
            {
              id: "step-1",
              label: "Search library",
              status: "complete",
              elapsedMs: 10,
            },
          ],
        }),
      }),
    );
    expect(mock.complete).toHaveBeenCalledOnce();
    expect(mock.complete.mock.calls[0]?.[0].model).toBe("gpt-5.6-sol");
  });
  it("uses the saved model id for the chosen provider", async () => {
    mock.prefs.agent = {
      ...DEFAULT_PREFS.agent,
      enabledKeys: {},
      languageModel: "openai",
      modelIds: { openai: "gpt-5.4-mini" },
    };
    expect(await sendMessage(request)).toMatchObject({ accepted: true });
    expect(mock.complete.mock.calls[0]?.[0].model).toBe("gpt-5.4-mini");
  });
  it("checks provider keys before adding a user message", async () => {
    mock.key.mockResolvedValue(null);
    expect(await sendMessage(request)).toHaveProperty("error");
    expect(mock.append).not.toHaveBeenCalled();
  });
  it("rejects empty attachment scope instead of searching the whole library", async () => {
    expect(
      await sendMessage({
        ...request,
        scope: { kind: "attachments" },
      }),
    ).toHaveProperty("error");
    expect(mock.complete).not.toHaveBeenCalled();
  });
  it("cancels only the matching request and preserves partial text", async () => {
    let started!: () => void;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    mock.complete.mockImplementation(async (input) => {
      input.onText("Partial reply");
      started();
      await new Promise((_, reject) =>
        input.abortController.signal.addEventListener(
          "abort",
          () => reject(new Error("aborted")),
          { once: true },
        ),
      );
      return "";
    });
    const result = sendMessage(request);
    await ready;
    expect(stopMessage("chat", "different-request")).toEqual({ ok: false });
    expect(
      await sendMessage({
        ...request,
        requestId: "duplicate",
      }),
    ).toHaveProperty("error");
    expect(stopMessage("chat", "request")).toEqual({ ok: true });
    expect(await result).toMatchObject({ stopped: true, accepted: true });
    expect(mock.append).toHaveBeenLastCalledWith(
      expect.objectContaining({
        content: "Partial reply",
        metadata: expect.objectContaining({ stopped: true }),
      }),
    );
    expect(
      mock.broadcast.mock.calls.some(
        ([, chunk]) =>
          z.object({ type: z.string() }).parse(chunk).type === "done",
      ),
    ).toBe(false);
    expect(stopMessage("chat", "request")).toEqual({ ok: false });
  });
});

it("persists a question even when there is no duplicate prose answer", async () => {
  mock.question = {
    question: "Which topic?",
    options: ["Film", "Architecture"],
  };
  mock.complete.mockResolvedValue("");
  expect(await sendMessage(request)).toMatchObject({
    accepted: true,
  });
  expect(mock.append).toHaveBeenLastCalledWith(
    expect.objectContaining({
      role: "assistant",
      content: "",
      metadata: expect.objectContaining({ question: mock.question }),
    }),
  );
});
it("links a freeform reply to the latest unanswered question", async () => {
  mock.history = [
    {
      id: "question",
      chatId: "chat",
      role: "assistant",
      content: "",
      metadata: {
        question: {
          question: "Which topic?",
          options: ["Film", "Architecture"],
        },
      },
    },
  ];
  await sendMessage({ ...request, content: "Typography" });
  expect(mock.append).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      content: "Typography",
      metadata: expect.objectContaining({ replyToQuestion: "question" }),
    }),
  );
  expect(mock.complete.mock.calls[0]?.[0].messages[0]?.content).toContain(
    "Which topic?",
  );
});
it("rejects stale or foreign question replies before appending", async () => {
  const result = await sendMessage({
    ...request,
    replyToQuestion: "foreign",
  });
  expect(result.error).toMatch(/no longer awaiting/);
  expect(mock.append).not.toHaveBeenCalled();
  expect(mock.complete).not.toHaveBeenCalled();
});
