import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AssistantMessage,
  AssistantQuestion,
  AssistantSend,
} from "../../../shared/assistant";
import { sendMessage, stopMessage } from "./chat";

const mock = vi.hoisted(() => ({
  prefs: {
    agent: { enabledKeys: {}, cloudAllowed: false, languageModel: "minnow" },
  },
  complete: vi.fn(),
  append: vi.fn(),
  broadcast: vi.fn(),
  key: vi.fn(),
  read: vi.fn(),
  history: [] as AssistantMessage[],
  question: undefined as AssistantQuestion | undefined,
}));
vi.mock("../../db", () => ({
  getDb: async () => ({
    select: () => ({
      from: () => ({ where: () => ({ get: async () => ({ id: "chat" }) }) }),
    }),
  }),
}));
vi.mock("../prefs", () => ({ getPrefs: async () => mock.prefs }));
vi.mock("../folders", () => ({ listFolders: async () => [] }));
vi.mock("../../lib/broadcast", () => ({ broadcast: mock.broadcast }));
vi.mock("./keys", () => ({ keyFor: mock.key }));
vi.mock("./complete", () => ({ completeWithTools: mock.complete }));
vi.mock("./persist", () => ({
  appendMessage: mock.append,
  recentMessages: async () => mock.history,
}));
vi.mock("./context", () => ({
  libraryContext: () => ({
    tools: [{ name: "readSave", execute: mock.read }],
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
    retrieve: vi.fn().mockResolvedValue([]),
  }),
}));
const request: AssistantSend = {
  chatId: "chat",
  requestId: "request",
  content: "Question",
  attachmentIds: [],
  scope: { kind: "library" },
  provider: "openai",
  allowCloudOnce: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mock.history = [];
  mock.question = undefined;
  mock.prefs.agent.cloudAllowed = false;
  mock.key.mockResolvedValue("test-key");
  mock.append.mockResolvedValue(undefined);
  mock.complete.mockImplementation(async (input) => {
    input.onText("Reply");
    return "Reply";
  });
});

describe("Assistant requests", () => {
  it("does not append a message or contact a provider before consent", async () => {
    expect(await sendMessage(request)).toEqual({
      chatId: "chat",
      needsCloud: true,
    });
    expect(mock.append).not.toHaveBeenCalled();
    expect(mock.complete).not.toHaveBeenCalled();
  });
  it("allows one request without changing the cloud preference", async () => {
    expect(
      await sendMessage({ ...request, allowCloudOnce: true }),
    ).toMatchObject({ accepted: true });
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
    expect(mock.prefs.agent.cloudAllowed).toBe(false);
    expect(await sendMessage({ ...request, requestId: "next" })).toHaveProperty(
      "needsCloud",
      true,
    );
  });
  it("checks provider keys before adding a user message", async () => {
    mock.key.mockResolvedValue(null);
    expect(
      await sendMessage({ ...request, allowCloudOnce: true }),
    ).toHaveProperty("error");
    expect(mock.append).not.toHaveBeenCalled();
  });
  it("rejects empty attachment scope instead of searching the whole library", async () => {
    expect(
      await sendMessage({
        ...request,
        provider: "minnow",
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
    });
    const result = sendMessage({ ...request, provider: "minnow" });
    await ready;
    expect(stopMessage("chat", "different-request")).toEqual({ ok: false });
    expect(
      await sendMessage({
        ...request,
        requestId: "duplicate",
        provider: "minnow",
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
      mock.broadcast.mock.calls.some(([, chunk]) => chunk.type === "done"),
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
  expect(await sendMessage({ ...request, provider: "minnow" })).toMatchObject({
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
  await sendMessage({ ...request, provider: "minnow", content: "Typography" });
  expect(mock.append).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      content: "Typography",
      metadata: expect.objectContaining({ replyToQuestion: "question" }),
    }),
  );
  expect(mock.complete.mock.calls[0]?.[0].messages[0].content).toContain(
    "Which topic?",
  );
});
it("rejects stale or foreign question replies before appending", async () => {
  const result = await sendMessage({
    ...request,
    provider: "minnow",
    replyToQuestion: "foreign",
  });
  expect(result.error).toMatch(/no longer awaiting/);
  expect(mock.append).not.toHaveBeenCalled();
  expect(mock.complete).not.toHaveBeenCalled();
});
