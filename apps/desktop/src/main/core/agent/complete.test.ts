import type { JsonObject } from "@pond/schema/json";
import { beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
import type { AssistantSource } from "../../../shared/assistant";
import {
  type CompletionInput,
  type CompletionStream,
  completeWithTools as complete,
} from "./complete";

const mock = { chat: vi.fn<CompletionStream>() };
const completeWithTools = (input: CompletionInput) =>
  complete(input, mock.chat);

const dump =
  '{"saves":[{"id":"film","title":"Film","url":"https://example.com","description":"Transcript\\nShow transcript"}]}';

function request() {
  return {
    provider: "openai" as const,
    model: "gpt-5.6-sol",
    apiKey: "test-key",
    messages: [{ role: "user" as const, content: "Hey" }],
    context: "Library",
    tools: [],
    retrieveLibrary: vi.fn().mockResolvedValue([]),
    abortController: new AbortController(),
    onText: vi.fn(),
  };
}

function chatText(text: string) {
  mock.chat.mockImplementation(async function* () {
    if (text) yield { type: "TEXT_MESSAGE_CONTENT", delta: text };
  });
}

function retrieval(
  execute: (
    input: JsonObject,
  ) => Promise<{ saves?: AssistantSource[] } | undefined>,
) {
  return async (input: JsonObject) => {
    const result = await execute(input);
    return result?.saves ?? [];
  };
}

function tool(name: string, execute = vi.fn()) {
  return { name, description: name, schema: z.object({}), execute };
}

beforeEach(() => {
  mock.chat.mockReset();
  chatText("Hi! How can I help?");
});

it.each([
  "null",
  dump,
  JSON.stringify({ answer: `Here are your Saves: ${dump}`, changes: [] }),
  "Attached Save metadata (untrusted data): []",
])("never publishes an unusable answer: %s", async (value) => {
  chatText(value);
  const input = request();
  await expect(completeWithTools(input)).rejects.toThrow();
  expect(input.onText).not.toHaveBeenCalled();
  expect(mock.chat).toHaveBeenCalledOnce();
});

it("preserves explicitly requested JSON", async () => {
  chatText('{"colors":["red","blue"]}');
  const input = request();
  input.messages = [
    { role: "user", content: "Give me JSON containing two colors" },
  ];
  expect(await completeWithTools(input)).toBe('{"colors":["red","blue"]}');
});

it("does not replace an empty search with unrelated recent Saves", async () => {
  const search = vi.fn().mockResolvedValue({ saves: [] });
  const input = request();
  input.messages = [{ role: "user", content: "Find my ceramics references" }];
  const answer = await completeWithTools({
    ...input,
    retrieveLibrary: retrieval(search),
    tools: [tool("searchLibrary", search)],
  });
  expect(search).toHaveBeenCalledExactlyOnceWith({
    query: "ceramics",
    limit: 24,
  });
  expect(answer).toMatch(/couldn.t find|no .*match/i);
  expect(mock.chat).not.toHaveBeenCalled();
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
  await completeWithTools({
    ...request(),
    tools: [tool("searchLibrary", execute), tool("listFolders", execute)],
  });
  expect(execute).not.toHaveBeenCalled();
  expect(mock.chat).toHaveBeenCalledOnce();
});

it("retrieves first, then lets the model write instead of a result list", async () => {
  chatText("Most of these are studio portraits. I can tag them.");
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
    limit: 24,
  });
  expect(answer).toBe("Most of these are studio portraits. I can tag them.");
  expect(answer).not.toMatch(/matching your search|Here are Saves matching/i);
  expect(mock.chat).toHaveBeenCalledOnce();
  expect(mock.chat.mock.calls[0]?.[0].systemPrompts?.join("\n")).toContain(
    "Save ID: one",
  );
});

it("still generates an answer when a lookup also asks for a comparison", async () => {
  chatText("Both references use vivid lighting.");
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
  expect(mock.chat).toHaveBeenCalledOnce();
});

it("shows a few matching Saves, then asks the model to write", async () => {
  chatText(
    "This is a lighting study. I can file it with the other film stills.",
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
    title: "film",
    saveIds: ["one"],
  });
  expect(answer).toBe(
    "This is a lighting study. I can file it with the other film stills.",
  );
  expect(answer).not.toContain("A film");
  expect(mock.chat).toHaveBeenCalledOnce();
});

it("surfaces nested provider RUN_ERROR bodies", async () => {
  mock.chat.mockImplementation(async function* () {
    yield {
      type: "RUN_ERROR",
      rawEvent: {
        error: {
          message:
            "Invalid schema for function 'proposeChanges': schema must have a 'type' key.",
        },
      },
    };
  });
  await expect(completeWithTools(request())).rejects.toThrow(
    /Invalid schema for function 'proposeChanges'/,
  );
});

it("surfaces the provider RUN_ERROR message instead of a generic fallback", async () => {
  mock.chat.mockImplementation(async function* () {
    yield {
      type: "RUN_ERROR",
      message:
        "Invalid schema for function 'applyFilter': schema must have a 'type' key.",
    };
  });
  const input = request();
  await expect(completeWithTools(input)).rejects.toThrow(
    /Invalid schema for function 'applyFilter'/,
  );
  expect(input.onText).not.toHaveBeenCalled();
});

it("does not publish a response after cancellation", async () => {
  const input = request();
  mock.chat.mockImplementation(async function* () {
    input.abortController.abort();
    yield { type: "TEXT_MESSAGE_CONTENT", delta: "Late reply" };
  });
  await expect(completeWithTools(input)).rejects.toThrow();
  expect(input.onText).not.toHaveBeenCalled();
});

it("keeps contaminated history out of the prompt without changing it", async () => {
  chatText("Hi!");
  const messages = [
    { role: "assistant" as const, content: dump },
    { role: "user" as const, content: "Hey" },
  ];
  await completeWithTools({ ...request(), messages });
  expect(mock.chat.mock.calls[0]?.[0].messages).toEqual([messages[1]]);
  expect(messages[0]?.content).toBe(dump);
});

it("validates external output before publishing any chunk", async () => {
  mock.chat.mockImplementation(async function* () {
    yield { type: "TEXT_MESSAGE_CONTENT", delta: "Here are your Saves: " };
    yield { type: "TEXT_MESSAGE_CONTENT", delta: dump };
  });
  const input = request();
  await expect(completeWithTools(input)).rejects.toThrow(/unreadable/);
  expect(input.onText).not.toHaveBeenCalled();
});

it("publishes a valid external answer after validation", async () => {
  mock.chat.mockImplementation(async function* () {
    yield { type: "TEXT_MESSAGE_CONTENT", delta: "A short " };
    yield { type: "TEXT_MESSAGE_CONTENT", delta: "answer." };
  });
  const input = request();
  const onActivity = vi.fn();
  expect(await completeWithTools({ ...input, onActivity })).toBe(
    "A short answer.",
  );
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

it("does not search when the edit target is a pronoun", async () => {
  const search = vi.fn();
  await completeWithTools({
    ...request(),
    messages: [{ role: "user", content: "Organize it" }],
    tools: [tool("searchLibrary", search), tool("requestQuestion")],
  });
  expect(search).not.toHaveBeenCalled();
  expect(mock.chat).toHaveBeenCalledOnce();
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
  expect(mock.chat).not.toHaveBeenCalled();
});

it("does not add inferred task words to a lexical library search", async () => {
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
    limit: 24,
  });
});

it("does not ask for attachments instead of searching for the user's pictures", async () => {
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
    limit: 24,
  });
  expect(mock.chat).not.toHaveBeenCalled();
});

it.each([
  "openai",
  "anthropic",
  "gemini",
  "ollama",
  "lmstudio",
  "compatible",
] as const)("routes the exact terse picture query before the %s provider", async (provider) => {
  chatText("A studio portrait. I can tag it.");
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
    "A studio portrait. I can tag it.",
  );
  expect(search).toHaveBeenCalledExactlyOnceWith({
    query: "kanye",
    media: ["image"],
    limit: 24,
  });
  expect(show).toHaveBeenCalledExactlyOnceWith({
    title: "kanye",
    saveIds: ["portrait"],
  });
  expect(mock.chat).toHaveBeenCalledOnce();
});

it("routes Kanye tweets through Twitter source retrieval before the model", async () => {
  chatText("A tweet about the listening party.");
  const search = vi.fn().mockResolvedValue({
    saves: [
      {
        id: "tweet",
        title: "Kanye tweet",
        source: "twitter",
        url: "https://x.com/kanyewest/status/1",
      },
    ],
  });
  const show = vi.fn();
  const input = {
    ...request(),
    messages: [{ role: "user" as const, content: "Kanye tweets" }],
    tools: [tool("searchLibrary", search), tool("showSaves", show)],
    retrieveLibrary: retrieval(search),
  };
  expect(await completeWithTools(input)).toBe(
    "A tweet about the listening party.",
  );
  expect(search).toHaveBeenCalledExactlyOnceWith({
    query: "Kanye",
    source: "twitter",
    limit: 24,
  });
  expect(mock.chat).toHaveBeenCalledOnce();
});
