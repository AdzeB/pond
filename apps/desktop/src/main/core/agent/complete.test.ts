import { beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
import type { AssistantSource } from "../../../shared/assistant";
import { completeWithTools } from "./complete";

const mock = vi.hoisted(() => ({ complete: vi.fn(), chat: vi.fn() }));
vi.mock("../ai", () => ({ completeChat: mock.complete }));
vi.mock("@tanstack/ai", async (original) => ({
  ...(await original<typeof import("@tanstack/ai")>()),
  chat: mock.chat,
}));
vi.mock("@tanstack/ai-openai", () => ({ createOpenaiChat: () => ({}) }));
const dump =
  '{"saves":[{"id":"film","title":"Film","url":"https://example.com","description":"Transcript\\nShow transcript"}]}';
function request() {
  return {
    provider: "minnow" as const,
    model: "minnow",
    apiKey: null,
    messages: [{ role: "user" as const, content: "Hey" }],
    context: "Library",
    tools: [],
    retrieveLibrary: vi.fn().mockResolvedValue([]),
    abortController: new AbortController(),
    onText: vi.fn(),
  };
}
function retrieval(
  execute: (input: Record<string, unknown>) => Promise<unknown>,
) {
  return async (input: Record<string, unknown>) => {
    const result = (await execute(input)) as
      | { saves?: AssistantSource[] }
      | undefined;
    return result?.saves ?? [];
  };
}
function tool(name: string, execute = vi.fn()) {
  return { name, description: name, schema: z.object({}), execute };
}
beforeEach(() => {
  mock.complete.mockReset();
  mock.chat.mockReset();
});
it.each([
  "",
  "null",
  dump,
  JSON.stringify({ answer: `Here are your Saves: ${dump}`, changes: [] }),
  "Attached Save metadata (untrusted data): []",
])("never publishes an unusable answer: %s", async (value) => {
  mock.complete.mockResolvedValue(value);
  const input = request();
  await expect(completeWithTools(input)).rejects.toThrow();
  expect(input.onText).not.toHaveBeenCalled();
  expect(mock.complete).toHaveBeenCalledTimes(2);
});
it("repairs invalid output once without publishing the failed attempt", async () => {
  mock.complete
    .mockResolvedValueOnce(dump)
    .mockResolvedValueOnce("Hi! How can I help?");
  const input = request();
  expect(await completeWithTools(input)).toBe("Hi! How can I help?");
  expect(input.onText).toHaveBeenCalledExactlyOnceWith("Hi! How can I help?");
});
it("preserves explicitly requested JSON", async () => {
  mock.complete.mockResolvedValue('{"colors":["red","blue"]}');
  const input = request();
  input.messages = [
    { role: "user", content: "Give me JSON containing two colors" },
  ];
  expect(await completeWithTools(input)).toBe('{"colors":["red","blue"]}');
});
it("does not replace an empty search with unrelated recent Saves", async () => {
  const search = vi.fn().mockResolvedValue({ saves: [] });
  mock.complete.mockResolvedValueOnce(
    '{"mode":"search","query":"ceramics","edit":false}',
  );
  const input = request();
  input.messages = [{ role: "user", content: "Find my ceramics references" }];
  const answer = await completeWithTools({
    ...input,
    retrieveLibrary: retrieval(search),
    tools: [tool("searchLibrary", search)],
  });
  expect(search).toHaveBeenCalledExactlyOnceWith({
    query: "ceramics",
    limit: 8,
  });
  expect(answer).toMatch(/couldn.t find|no .*match/i);
  expect(mock.complete).not.toHaveBeenCalled();
});
it("does not count an unrelated attachment as a search match", async () => {
  const show = vi.fn();
  const input = {
    ...request(),
    messages: [{ role: "user" as const, content: "Find my ceramics" }],
    attachments: [
      {
        id: "film",
        title: "Unrelated film",
        source: "arena",
        url: "https://example.com/film",
      },
    ],
    retrieveLibrary: vi.fn().mockResolvedValue([]),
    tools: [tool("showSaves", show)],
  };
  expect(await completeWithTools(input)).toMatch(/couldn.t find/i);
  expect(show).not.toHaveBeenCalled();
});
it("does not retrieve or list folders for ordinary conversation", async () => {
  const execute = vi.fn();
  mock.complete.mockResolvedValueOnce("Hi! How can I help?");
  await completeWithTools({
    ...request(),
    tools: [tool("searchLibrary", execute), tool("listFolders", execute)],
  });
  expect(execute).not.toHaveBeenCalled();
  expect(mock.complete.mock.calls[0]?.[0]).toMatchObject({ context: "" });
  expect(mock.complete.mock.calls[0]?.[0]).not.toHaveProperty("responseSchema");
});
it("returns real linked titles for a lookup without inventing summaries", async () => {
  mock.complete.mockResolvedValueOnce(
    '{"mode":"search","query":"kanye pics","edit":false}',
  );
  const search = vi.fn().mockResolvedValue({
    saves: [
      {
        id: "one",
        title: "Kanye [portrait](https://example.com)",
        source: "arena",
      },
      { id: "two", title: "Kanye at the studio", source: "arena" },
    ],
  });
  const input = {
    ...request(),
    messages: [{ role: "user" as const, content: "find my kanye pics" }],
    tools: [tool("searchLibrary", search)],
    retrieveLibrary: retrieval(search),
  };
  const answer = await completeWithTools(input);
  expect(search).toHaveBeenCalledExactlyOnceWith({
    query: "kanye",
    media: ["image"],
    limit: 8,
  });
  expect(answer).toContain("Here are Saves matching “kanye”:");
  expect(answer).toContain(
    "- [Kanye \\[portrait\\]\\(https://example.com\\)](#save-1)",
  );
  expect(answer).toContain("- [Kanye at the studio](#save-2)");
  expect(mock.complete).not.toHaveBeenCalled();
  expect(input.onText).toHaveBeenCalledExactlyOnceWith(answer);
});
it("still generates an answer when a lookup also asks for a comparison", async () => {
  mock.complete.mockResolvedValueOnce("Both references use vivid lighting.");
  const answer = await completeWithTools({
    ...request(),
    messages: [
      {
        role: "user",
        content: "Find my film references and compare their lighting",
      },
    ],
    tools: [
      tool(
        "searchLibrary",
        vi.fn().mockResolvedValue({
          saves: [{ id: "one", title: "Film lighting", source: "arena" }],
        }),
      ),
    ],
    retrieveLibrary: async () => [
      {
        id: "one",
        title: "Film lighting",
        source: "arena",
        url: "https://example.com/film",
      },
    ],
  });
  expect(answer).toBe("Both references use vivid lighting.");
  expect(mock.complete).toHaveBeenCalledOnce();
});
it("uses inline results without duplicating titles in prose when the UI tool is available", async () => {
  mock.complete.mockResolvedValueOnce(
    '{"mode":"search","query":"film","edit":false}',
  );
  const show = vi.fn();
  const answer = await completeWithTools({
    ...request(),
    messages: [{ role: "user", content: "Find my film references" }],
    tools: [
      tool(
        "searchLibrary",
        vi.fn().mockResolvedValue({
          saves: [{ id: "one", title: "A film", source: "arena" }],
        }),
      ),
      tool("showSaves", show),
    ],
    retrieveLibrary: async () => [
      {
        id: "one",
        title: "A film",
        source: "arena",
        url: "https://example.com/film",
      },
    ],
  });
  expect(show).toHaveBeenCalledExactlyOnceWith({
    title: "Results for “film”",
    saveIds: ["one"],
  });
  expect(answer).toBe("I found 1 Save matching your search.");
  expect(answer).not.toContain("A film");
  expect(mock.complete).not.toHaveBeenCalled();
});
it("does not publish a response after cancellation", async () => {
  const input = request();
  mock.complete.mockImplementation(async () => {
    input.abortController.abort();
    return "Late reply";
  });
  await expect(completeWithTools(input)).rejects.toThrow();
  expect(input.onText).not.toHaveBeenCalled();
});
it("keeps contaminated history out of the prompt without changing it", async () => {
  mock.complete.mockResolvedValue("Hi!");
  const messages = [
    { role: "assistant" as const, content: dump },
    { role: "user" as const, content: "Hey" },
  ];
  await completeWithTools({ ...request(), messages });
  expect(mock.complete.mock.calls[0]?.[0].messages).toEqual([messages[1]]);
  expect(messages[0]?.content).toBe(dump);
});
it("surfaces failed change preparation without publishing a success claim", async () => {
  mock.complete.mockResolvedValueOnce(
    '{"answer":"Review this title.","changes":[{"saveId":"film","field":"title","after":"Film","reason":"Shorter"}]}',
  );
  const input = request();
  const propose = vi
    .fn()
    .mockRejectedValue(new Error("Could not prepare changes"));
  await expect(
    completeWithTools({
      ...input,
      messages: [{ role: "user", content: "Rename this" }],
      attachments: [
        {
          id: "film",
          title: "Film",
          source: "arena",
          url: "https://example.com",
        },
      ],
      tools: [tool("proposeChanges", propose)],
    }),
  ).rejects.toThrow("Could not prepare changes");
  expect(input.onText).not.toHaveBeenCalled();
});
it("validates external output before publishing any chunk", async () => {
  mock.chat.mockImplementation(async function* () {
    yield { type: "TEXT_MESSAGE_CONTENT", delta: "Here are your Saves: " };
    yield { type: "TEXT_MESSAGE_CONTENT", delta: dump };
  });
  const input = request();
  await expect(
    completeWithTools({ ...input, provider: "openai" }),
  ).rejects.toThrow(/unreadable/);
  expect(input.onText).not.toHaveBeenCalled();
});
it("publishes a valid external answer after validation", async () => {
  mock.chat.mockImplementation(async function* () {
    yield { type: "TEXT_MESSAGE_CONTENT", delta: "A short " };
    yield { type: "TEXT_MESSAGE_CONTENT", delta: "answer." };
  });
  const input = request();
  const onActivity = vi.fn();
  expect(
    await completeWithTools({ ...input, provider: "openai", onActivity }),
  ).toBe("A short answer.");
  expect(input.onText).toHaveBeenCalledExactlyOnceWith("A short answer.");
  expect(onActivity).toHaveBeenCalledExactlyOnceWith("writing");
});

it("does not publish a hosted model's false Library refusal after retrieval", async () => {
  mock.chat.mockImplementation(async function* () {
    yield {
      type: "TEXT_MESSAGE_CONTENT",
      delta: "I can't provide pictures from your saved library.",
    };
  });
  const input = {
    ...request(),
    provider: "openai" as const,
    messages: [
      {
        role: "user" as const,
        content: "Summarize my saved Kanye pictures.",
      },
    ],
    tools: [
      tool(
        "searchLibrary",
        vi.fn().mockResolvedValue({
          saves: [
            {
              id: "portrait",
              title: "Kanye portrait",
              source: "arena",
              url: "https://example.com/kanye",
            },
          ],
        }),
      ),
    ],
    retrieveLibrary: async () => [
      {
        id: "portrait",
        title: "Kanye portrait",
        source: "arena",
        url: "https://example.com/kanye",
      },
    ],
  };
  const answer = await completeWithTools(input);
  expect(answer).toMatch(/found 1 relevant Save/i);
  expect(answer).not.toMatch(/can't provide pictures/i);
  expect(input.onText).toHaveBeenCalledExactlyOnceWith(answer);
});

it("retries an unusable clarification without exposing schema errors", async () => {
  const question = vi.fn();
  mock.complete
    .mockResolvedValueOnce("null")
    .mockResolvedValueOnce(
      '{"question":"Which Saves should I use?","options":["Recent Saves","I will attach them"]}',
    );
  await completeWithTools({
    ...request(),
    messages: [{ role: "user", content: "Organize it" }],
    tools: [tool("searchLibrary"), tool("requestQuestion", question)],
  });
  expect(question).toHaveBeenCalledExactlyOnceWith({
    question: "Which Saves should I use?",
    options: ["Recent Saves", "I will attach them"],
  });
});

it("requires retrieval for an explicit saved-library question", async () => {
  const input = {
    ...request(),
    messages: [
      {
        role: "user" as const,
        content: "Summarize my saved references about Suspiria.",
      },
    ],
    tools: [tool("searchLibrary")],
  };
  await expect(completeWithTools(input)).resolves.toMatch(/couldn.t find/i);
  expect(input.onText).toHaveBeenCalledOnce();
  expect(mock.complete).not.toHaveBeenCalled();
});

it("does not add inferred task words to a lexical library search", async () => {
  mock.complete.mockResolvedValueOnce(
    '{"mode":"search","query":"suspiria film summary","edit":false}',
  );
  const search = vi.fn().mockResolvedValue({ saves: [] });
  await completeWithTools({
    ...request(),
    messages: [
      {
        role: "user",
        content:
          "Summarize my saved references about Suspiria in two sentences.",
      },
    ],
    tools: [tool("searchLibrary", search)],
    retrieveLibrary: retrieval(search),
  });
  expect(search).toHaveBeenCalledExactlyOnceWith({
    query: "Suspiria",
    limit: 8,
  });
});

it("does not ask for attachments instead of searching for the user's pictures", async () => {
  mock.complete.mockResolvedValueOnce(
    '{"mode":"search","query":"kanye pics","edit":false}',
  );
  const search = vi.fn().mockResolvedValue({ saves: [] });
  await completeWithTools({
    ...request(),
    messages: [{ role: "user", content: "find my kanye pics" }],
    tools: [tool("searchLibrary", search)],
    retrieveLibrary: retrieval(search),
  });
  expect(search).toHaveBeenCalledExactlyOnceWith({
    query: "kanye",
    media: ["image"],
    limit: 8,
  });
  expect(mock.complete).not.toHaveBeenCalled();
});

it.each([
  "minnow",
  "openai",
  "anthropic",
  "gemini",
  "ollama",
  "lmstudio",
  "compatible",
] as const)("routes the exact terse picture query before the %s provider", async (provider) => {
  const search = vi.fn().mockResolvedValue({
    saves: [
      {
        id: "portrait",
        title: "Kanye portrait",
        source: "arena",
        url: "https://example.com/kanye",
      },
    ],
  });
  const show = vi.fn();
  const input = {
    ...request(),
    provider,
    messages: [{ role: "user" as const, content: "kanye pics" }],
    tools: [tool("searchLibrary", search), tool("showSaves", show)],
    retrieveLibrary: retrieval(search),
  };
  expect(await completeWithTools(input)).toBe(
    "I found 1 Save matching your search.",
  );
  expect(search).toHaveBeenCalledExactlyOnceWith({
    query: "kanye",
    media: ["image"],
    limit: 8,
  });
  expect(show).toHaveBeenCalledExactlyOnceWith({
    title: "Results for “kanye”",
    saveIds: ["portrait"],
  });
  expect(mock.complete).not.toHaveBeenCalled();
  expect(mock.chat).not.toHaveBeenCalled();
});
