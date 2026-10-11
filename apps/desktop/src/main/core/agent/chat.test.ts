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
  loadFiles: ReturnType<typeof vi.fn<ChatDependencies["loadLocalAttachments"]>>;
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
  loadFiles: vi.fn<ChatDependencies["loadLocalAttachments"]>(),
  read: vi.fn<ToolSpec["execute"]>().mockResolvedValue({}),
  history: [],
  question: undefined,
};
const dependencies: ChatDependencies = {
  conversationExists: async () => true,
  getPrefs: async () => mock.prefs,
  listFolders: async () => [],
  imagesForSaves: async () => [],
  loadLocalAttachments: mock.loadFiles,
  broadcast: mock.broadcast,
  keyFor: mock.key,
  completeWithTools: mock.complete,
  appendMessage: mock.append,
  listMessages: async () => mock.history,
  loadModelTranscript: async () => [],
  loadModelCatalog: async () => ({
    fetchedAt: 0,
    models: [
      ...["gpt-5.6-sol", "gpt-visible", "language-model"].map((id) => ({
        id: `openai/${id}`,
        name: id,
        type: "language",
        context_window: 256_000,
        tags: ["fast"],
        reasoning_options: [
          {
            type: "effort",
            values: ["low", "medium", "high"],
          },
        ],
      })),
      ...["vision-model", "saved-model"].map((id) => ({
        id: `openai/${id}`,
        name: id,
        type: "language",
        context_window: 256_000,
        tags: ["vision"],
        reasoning_options: [
          {
            type: "effort",
            values: ["low", "medium", "high"],
          },
        ],
      })),
    ],
  }),
  listProviderModels: async () => ({ ok: true, models: [] }),
  libraryContext: () => ({
    onToolExecutionStart: () => {},
    onToolExecutionEnd: () => {},
    finishPending: () => {},
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
  }),
};
const sendMessage = (input: AssistantSend) => send(input, dependencies);
const request: AssistantSend = {
  chatId: "chat",
  requestId: "request",
  content: "Question",
  attachmentIds: [],
  fileAttachmentIds: [],
  scope: { kind: "library" },
  provider: "openai",
};

it("includes saved personalization in each reply and stops including cleared fields", async () => {
  mock.prefs.agent.userProfile = "I design libraries.";
  mock.prefs.agent.responseInstructions = "Keep replies concise.";
  await sendMessage(request);
  expect(mock.complete.mock.calls.at(-1)?.[0].context).toContain(
    "I design libraries.",
  );
  expect(mock.complete.mock.calls.at(-1)?.[0].context).toContain(
    "Keep replies concise.",
  );
  mock.prefs.agent.userProfile = "";
  mock.prefs.agent.responseInstructions = "";
  await sendMessage({ ...request, requestId: "without-profile" });
  expect(mock.complete.mock.calls.at(-1)?.[0].context).not.toContain(
    "User-provided personalization",
  );
});

it.each([false, true])(
  "persists total run time, including a failed reply: %s",
  async (fails) => {
    const clock = vi.spyOn(performance, "now").mockReturnValue(1000);
    mock.complete.mockImplementation(async (input) => {
      clock.mockReturnValue(91000);
      if (fails) throw new Error("Provider unavailable");
      input.onText("Reply");
      return "Reply";
    });
    try {
      await sendMessage(request);
      expect(mock.append).toHaveBeenLastCalledWith(
        expect.objectContaining({
          role: "assistant",
          metadata: expect.objectContaining({ elapsedMs: 90000 }),
        }),
      );
    } finally {
      clock.mockRestore();
    }
  },
);

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
  mock.loadFiles.mockResolvedValue([]);
  mock.append.mockResolvedValue("persisted-user");
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
  it("loads registered local files without adding them to the library", async () => {
    const file = {
      id: "file-1",
      name: "reference.pdf",
      mediaType: "application/pdf",
      size: 4,
      data: Buffer.from("test"),
    };
    mock.loadFiles.mockResolvedValue([file]);

    await sendMessage({
      ...request,
      requestId: "local-files",
      fileAttachmentIds: [file.id],
    });

    expect(mock.loadFiles).toHaveBeenCalledExactlyOnceWith([file.id]);
    expect(mock.complete).toHaveBeenCalledWith(
      expect.objectContaining({ files: [file] }),
    );
    expect(mock.append).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        metadata: expect.objectContaining({
          files: [
            {
              id: file.id,
              name: file.name,
              mediaType: file.mediaType,
              size: file.size,
            },
          ],
        }),
      }),
    );
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
  it("uses the model and controls snapshotted by the composer", async () => {
    await sendMessage({
      ...request,
      modelId: "gpt-visible",
      controls: {
        fast: true,
        contextTokens: 256_000,
        reasoning: "high",
      },
    });
    expect(mock.complete.mock.calls[0]?.[0]).toMatchObject({
      model: "gpt-visible",
      controls: {
        fast: true,
        contextTokens: 256_000,
        reasoning: "high",
      },
    });
  });
  it("removes unverified controls for models without catalog metadata", async () => {
    await sendMessage({
      ...request,
      modelId: "custom-model",
      controls: {
        fast: true,
        contextTokens: 256_000,
        reasoning: "high",
      },
    });
    expect(mock.complete.mock.calls[0]?.[0].controls).toEqual({
      fast: false,
      contextTokens: 64_000,
      reasoning: "provider-default",
    });
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
    expect(stopMessage("chat", "different-request")).toEqual({
      ok: false,
      error: "This reply already finished.",
    });
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
    expect(stopMessage("chat", "request")).toEqual({
      ok: false,
      error: "This reply already finished.",
    });
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

it("sends Save images to a selected local vision model", async () => {
  mock.prefs.agent = {
    ...mock.prefs.agent,
    enabledKeys: { ollama: true },
    languageModel: "ollama",
    modelIds: { ollama: "gemma4:e2b" },
  };
  const image = { mimeType: "image/png", data: "test-image" };
  const result = await send(
    {
      ...request,
      provider: "ollama",
      modelId: "gemma4:e2b",
      attachmentIds: ["image-save"],
    },
    {
      ...dependencies,
      imagesForSaves: async () => [image],
      listProviderModels: async () => ({
        ok: true,
        models: [
          {
            id: "gemma4:e2b",
            name: "Gemma 4 E2B",
            modelCapabilities: {
              text: true,
              vision: true,
              audio: false,
              tools: true,
            },
          },
        ],
      }),
    },
  );

  expect(result).toMatchObject({ accepted: true });
  expect(result.error).toBeUndefined();
  expect(mock.complete).toHaveBeenCalledWith(
    expect.objectContaining({
      provider: "ollama",
      model: "gemma4:e2b",
      images: [image],
    }),
  );
});

it("rejects Save images before transport for a selected text-only local model", async () => {
  mock.prefs.agent = {
    ...mock.prefs.agent,
    enabledKeys: { ollama: true },
    languageModel: "ollama",
    modelIds: { ollama: "llama3.2" },
  };
  const result = await send(
    {
      ...request,
      provider: "ollama",
      modelId: "llama3.2",
      attachmentIds: ["image-save"],
    },
    {
      ...dependencies,
      imagesForSaves: async () => [
        { mimeType: "image/png", data: "test-image" },
      ],
      listProviderModels: async () => ({
        ok: true,
        models: [
          {
            id: "llama3.2",
            name: "Llama 3.2",
            modelCapabilities: {
              text: true,
              vision: false,
              audio: false,
              tools: true,
            },
          },
        ],
      }),
    },
  );

  expect(result.error).toBe("Choose a vision model in Settings Models.");
  expect(mock.complete).not.toHaveBeenCalled();
});

it("rejects local image files before transport for a selected text-only model", async () => {
  mock.prefs.agent = {
    ...mock.prefs.agent,
    enabledKeys: { ollama: true },
    languageModel: "ollama",
    modelIds: { ollama: "llama3.2" },
  };
  mock.loadFiles.mockResolvedValue([
    {
      id: "image-file",
      name: "reference.png",
      mediaType: "image/png",
      size: 4,
      data: Buffer.from("test"),
    },
  ]);

  const result = await send(
    {
      ...request,
      provider: "ollama",
      modelId: "llama3.2",
      fileAttachmentIds: ["image-file"],
    },
    {
      ...dependencies,
      listProviderModels: async () => ({
        ok: true,
        models: [
          {
            id: "llama3.2",
            name: "Llama 3.2",
            modelCapabilities: {
              text: true,
              vision: false,
              audio: false,
              tools: true,
            },
          },
        ],
      }),
    },
  );

  expect(result.error).toBe("Choose a vision model in Settings Models.");
  expect(mock.complete).not.toHaveBeenCalled();
});

it("gives the next reply the current review outcome and created IDs", async () => {
  mock.history = [
    {
      id: "previous",
      chatId: "chat",
      role: "assistant",
      content: "Ready to create the Folder.",
      metadata: {
        changes: [
          {
            id: "change",
            saveId: "",
            title: "Create Film Folder",
            reason: "Organize",
            field: "action",
            action: "runOperation",
            before: null,
            after: "folders.create",
            status: "applied",
            payload: {
              operation: "folders.create",
              arguments: { name: "Film" },
              libraryId: "library",
              result: { id: "created-folder" },
            },
          },
        ],
      },
    },
  ];
  await sendMessage(request);
  expect(mock.complete).toHaveBeenCalledWith(
    expect.objectContaining({
      context: expect.stringContaining('"status":"applied"'),
    }),
  );
  expect(mock.complete).toHaveBeenCalledWith(
    expect.objectContaining({
      context: expect.stringContaining('"id":"created-folder"'),
    }),
  );
});
