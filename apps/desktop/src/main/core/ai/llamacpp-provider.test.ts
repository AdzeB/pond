import { beforeEach, expect, it, vi } from "vitest";
import { LlamaCppProvider } from "./llamacpp-provider";

const mock = vi.hoisted(() => ({
  getLlama: vi.fn(),
  grammar: vi.fn(),
  prompt: vi.fn(),
  history: vi.fn(),
  reset: vi.fn(),
}));
vi.mock("node:fs/promises", () => ({
  stat: async () => ({ isFile: () => true, size: 100 }),
}));
vi.mock("electron", () => ({ app: { getPath: () => "/tmp/pond-test" } }));
vi.mock("node-llama-cpp", () => ({
  getLlama: mock.getLlama,
  LlamaChatSession: class {
    prompt = mock.prompt;
    setChatHistory = mock.history;
    resetChatHistory = mock.reset;
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  const llama = {
    createGrammarForJsonSchema: mock.grammar,
    loadModel: async () => ({
      llama,
      createContext: async () => ({ getSequence: () => ({}) }),
    }),
  };
  mock.getLlama.mockResolvedValue(llama);
  mock.grammar.mockResolvedValue({ parse: JSON.parse });
  mock.prompt.mockResolvedValue('{"answer":"Reply","changes":[]}');
});

it("uses the model's grammar and restores conversation roles before prompting", async () => {
  const provider = new LlamaCppProvider();
  const signal = new AbortController().signal;
  const responseSchema = { type: "object" };
  await provider.completeChat(
    {
      system: "Answer concisely.",
      messages: [
        { role: "user", content: "First question" },
        { role: "assistant", content: "First answer" },
        { role: "user", content: "Follow-up question" },
      ],
      context: "Save metadata",
      responseSchema,
    },
    signal,
  );
  expect(mock.getLlama).toHaveBeenCalledTimes(1);
  expect(mock.grammar).toHaveBeenCalledWith(responseSchema);
  expect(mock.history).toHaveBeenCalledWith([
    { type: "system", text: "Answer concisely." },
    { type: "user", text: "First question" },
    { type: "model", response: ["First answer"] },
  ]);
  expect(mock.prompt).toHaveBeenCalledWith(
    "<library_context>\nSave metadata\n</library_context>\n\nFollow-up question",
    expect.objectContaining({ grammar: { parse: JSON.parse }, signal }),
  );
});

it("uses the same native runtime for search plan grammar", async () => {
  mock.prompt.mockResolvedValue('{"combinator":"and","rules":[]}');
  const provider = new LlamaCppProvider();
  expect(
    await provider.compilePlan("Find films", {
      facets: { sources: [], types: [], tags: [], creators: [] },
    }),
  ).toEqual({ filter: { combinator: "and", rules: [] } });
  expect(mock.getLlama).toHaveBeenCalledTimes(1);
  expect(mock.prompt).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ grammar: { parse: JSON.parse } }),
  );
});

it("generates natural language without forcing a JSON grammar", async () => {
  const provider = new LlamaCppProvider();
  await provider.completeChat({
    system: "Be brief.",
    context: "",
    messages: [{ role: "user", content: "Hey" }],
  });
  expect(mock.grammar).not.toHaveBeenCalled();
  expect(mock.prompt).toHaveBeenCalledWith(
    "Hey",
    expect.objectContaining({ grammar: undefined }),
  );
});

it("serializes chat and search planning on the shared native session", async () => {
  let release!: (value: string) => void;
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  mock.prompt.mockImplementationOnce(() => {
    started();
    return new Promise<string>((resolve) => {
      release = resolve;
    });
  });
  const provider = new LlamaCppProvider();
  const first = provider.completeChat({
    system: "Reply",
    context: "",
    messages: [{ role: "user", content: "Hey" }],
  });
  await ready;
  const second = provider.compilePlan("Films", {
    facets: { sources: [], types: [], tags: [], creators: [] },
  });
  await Promise.resolve();
  expect(mock.prompt).toHaveBeenCalledTimes(1);
  expect(mock.reset).not.toHaveBeenCalled();
  release("Hi!");
  await Promise.all([first, second]);
  expect(mock.prompt).toHaveBeenCalledTimes(2);
  expect(mock.getLlama).toHaveBeenCalledTimes(1);
});
